import express from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import os from "os";
import zlib from "zlib";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (error) {
  if (error?.code !== "ENOENT") {
    console.warn("Could not load .env:", error.message);
  }
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.DONER_HOST || process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const ADMIN_USER = process.env.DONER_ADMIN_USER || process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_SALT = process.env.DONER_ADMIN_PASSWORD_SALT
  || process.env.ADMIN_PASSWORD_SALT
  || "change-this-admin-salt";
const ADMIN_PASSWORD_HASH = resolveAdminPasswordHash();
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden
const USING_DEFAULT_ADMIN_PASSWORD = !process.env.DONER_ADMIN_PASSWORD_HASH
  && !process.env.DONER_ADMIN_PASSWORD
  && !process.env.ADMIN_PASSWORD_HASH
  && !process.env.ADMIN_PASSWORD;

const ORDER_TTL_MS = 15 * 60 * 1000; // 15 Minuten (offene Bestellungen)
const DONE_ORDER_ADMIN_RETENTION_MS = 5 * 60 * 60 * 1000; // 5 Stunden (Admin-Anzeige)
const DONE_ORDER_PUBLIC_SCREEN_MS = 5 * 60 * 1000; // 5 Minuten (öffentlicher Erledigt-Bildschirm)

// Zwei Drucker: einer beim Kunden (SB), einer beim Mitarbeiter
const PRINTER_CUSTOMER = (process.env.DONER_PRINTER_CUSTOMER || "").trim();
const PRINTER_STAFF = (process.env.DONER_PRINTER_STAFF || "").trim();
const PRINT_ORDER_ENABLED = process.env.DONER_PRINT_ORDER !== "0";

const TICKET_FOOTER_LINES = [
  "Sark Kebab",
];

const app = express();
app.use(express.json({ limit: "10mb" }));

// --- Simple file-backed store (no DB) ---
let productsCache = null;
let orders = []; // in-memory
const adminSessions = new Map();

let writeOrdersInFlight = Promise.resolve();
function queueWriteOrders() {
  // serialize writes to avoid race conditions
  writeOrdersInFlight = writeOrdersInFlight.then(async () => {
    const payload = { orders };
    await fs.writeFile(ORDERS_FILE, JSON.stringify(payload, null, 2), "utf-8");
  }).catch((e) => {
    console.error("Failed writing orders.json:", e);
  });
  return writeOrdersInFlight;
}

async function loadProducts() {
  const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
  productsCache = JSON.parse(raw);
}

async function loadOrders() {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    orders = Array.isArray(parsed.orders) ? parsed.orders : [];
  } catch {
    orders = [];
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function resolveAdminPasswordHash() {
  if (process.env.DONER_ADMIN_PASSWORD_HASH) return process.env.DONER_ADMIN_PASSWORD_HASH;
  if (process.env.DONER_ADMIN_PASSWORD) {
    return hashPassword(process.env.DONER_ADMIN_PASSWORD, ADMIN_PASSWORD_SALT);
  }
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  return hashPassword(process.env.ADMIN_PASSWORD || "admin123", ADMIN_PASSWORD_SALT);
}

function listLanIpv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const infos of Object.values(interfaces)) {
    for (const info of infos || []) {
      const family = String(info.family);
      if (info.internal) continue;
      if (family !== "IPv4" && family !== "4") continue;
      addresses.push(info.address);
    }
  }

  return [...new Set(addresses)];
}

function safeEqualHex(a, b) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length === 0 || bBuf.length === 0 || aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function safeEqualText(a, b) {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyAdminCredentials(username, password) {
  if (!safeEqualText(username, ADMIN_USER)) return false;
  const passwordHash = hashPassword(password, ADMIN_PASSWORD_SALT);
  return safeEqualHex(passwordHash, ADMIN_PASSWORD_HASH);
}

function nowMs() {
  return Date.now();
}

function parseCookies(header = "") {
  const pairs = header.split(";").map(s => s.trim()).filter(Boolean);
  const out = {};
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function getAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.admin_session;
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= nowMs()) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

function isAdminAuthenticated(req) {
  return Boolean(getAdminSession(req));
}

function requireAdminApi(req, res, next) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

function createAdminSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = nowMs();
  adminSessions.set(token, {
    username,
    createdAt,
    expiresAt: createdAt + ADMIN_SESSION_TTL_MS
  });
  return token;
}

function setAdminSessionCookie(res, token) {
  const maxAge = Math.floor(ADMIN_SESSION_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}`
  );
}

function clearAdminSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
  );
}

function clampNumber(rawValue, defaultValue, min, max) {
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, n));
}

// --- ESC/POS Helpers ---

// Convert a Unicode string to a Code Page 858 Buffer (CP850 + €)
function cp858Buffer(str) {
  const CP858_MAP = {
    0x00C7: 0x80, // Ç
    0x00FC: 0x81, // ü
    0x00E9: 0x82, // é
    0x00E2: 0x83, // â
    0x00E4: 0x84, // ä
    0x00E0: 0x85, // à
    0x00E5: 0x86, // å
    0x00E7: 0x87, // ç
    0x00EA: 0x88, // ê
    0x00EB: 0x89, // ë
    0x00E8: 0x8A, // è
    0x00EF: 0x8B, // ï
    0x00EE: 0x8C, // î
    0x00EC: 0x8D, // ì
    0x00C4: 0x8E, // Ä
    0x00C5: 0x8F, // Å
    0x00C9: 0x90, // É
    0x00E6: 0x91, // æ
    0x00C6: 0x92, // Æ
    0x00F4: 0x93, // ô
    0x00F6: 0x94, // ö
    0x00F2: 0x95, // ò
    0x00FB: 0x96, // û
    0x00F9: 0x97, // ù
    0x00FF: 0x98, // ÿ
    0x00D6: 0x99, // Ö
    0x00DC: 0x9A, // Ü
    0x00F8: 0x9B, // ø
    0x00A3: 0x9C, // £
    0x00D8: 0x9D, // Ø
    0x00D7: 0x9E, // ×
    0x00C1: 0xA0, // Á
    0x00ED: 0xA1, // í
    0x00F3: 0xA2, // ó
    0x00FA: 0xA3, // ú
    0x00F1: 0xA4, // ñ
    0x00D1: 0xA5, // Ñ
    0x00AA: 0xA6, // ª
    0x00BA: 0xA7, // º
    0x00BF: 0xA8, // ¿
    0x00AE: 0xA9, // ®
    0x00AC: 0xAA, // ¬
    0x00BD: 0xAB, // ½
    0x00BC: 0xAC, // ¼
    0x00A1: 0xAD, // ¡
    0x00AB: 0xAE, // «
    0x00BB: 0xAF, // »
    0x00C3: 0xC6, // Ã
    0x00E3: 0xC7, // ã
    0x00A4: 0xCF, // ¤
    0x00F0: 0xD1, // ð
    0x00D0: 0xD2, // Ð
    0x00CA: 0xD4, // Ê
    0x20AC: 0xD5, // €
    0x00CB: 0xD3, // Ë
    0x00C8: 0xD6, // È
    0x00CD: 0xD7, // Í
    0x00CE: 0xD8, // Î
    0x00CF: 0xD9, // Ï
    0x00CC: 0xDE, // Ì
    0x00D3: 0xE0, // Ó
    0x00DF: 0xE1, // ß
    0x00D4: 0xE2, // Ô
    0x00D2: 0xE3, // Ò
    0x00F5: 0xE4, // õ
    0x00D5: 0xE5, // Õ
    0x00B5: 0xE6, // µ
    0x00FE: 0xE7, // þ
    0x00DE: 0xE8, // Þ
    0x00DA: 0xE9, // Ú
    0x00DB: 0xEA, // Û
    0x00D9: 0xEB, // Ù
    0x00FD: 0xEC, // ý
    0x00DD: 0xED, // Ý
    0x00B4: 0xEF, // ´
    0x00AD: 0xF0, // soft hyphen
    0x00B1: 0xF1, // ±
    0x00BE: 0xF3, // ¾
    0x00B6: 0xF4, // ¶
    0x00A7: 0xF5, // §
    0x00F7: 0xF6, // ÷
    0x00B8: 0xF7, // ¸
    0x00B0: 0xF8, // °
    0x00A8: 0xF9, // ¨
    0x00B7: 0xFA, // ·
    0x00B9: 0xFB, // ¹
    0x00B3: 0xFC, // ³
    0x00B2: 0xFD, // ²
    0x00A0: 0xFF, // non-breaking space
  };
  const buf = Buffer.alloc(str.length);
  let pos = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      buf[pos++] = code; // ASCII unchanged
    } else if (CP858_MAP[code] !== undefined) {
      buf[pos++] = CP858_MAP[code];
    } else {
      buf[pos++] = 0x3F; // '?' for unmappable characters
    }
  }
  return buf.subarray(0, pos);
}

function escPosTextSize(width = 1, height = 1) {
  const w = Math.max(1, Math.min(8, Number(width) || 1));
  const h = Math.max(1, Math.min(8, Number(height) || 1));
  const n = ((h - 1) << 4) | (w - 1);
  return Buffer.from([0x1d, 0x21, n]);
}

function runPrintJob(ticketPayload, printerName, title, options = {}) {
  if (process.platform === "win32") {
    return runPrintJobWindows(ticketPayload, printerName, title, options);
  }

  return runPrintJobUnix(ticketPayload, printerName, title, options);
}

function runPrintJobUnix(ticketPayload, printerName, title, options = {}) {
  const { raw = false } = options;
  const args = [];
  if (printerName) {
    args.push("-d", printerName);
  }
  if (title) {
    args.push("-t", title);
  }
  if (raw) {
    args.push("-o", "raw");
  }

  return spawnPrintJobProcess({
    command: "lp",
    args,
    ticketPayload,
    printerName,
    exitLabel: "lp"
  });
}

function runPrintJobWindows(ticketPayload, printerName, title) {
  const env = buildWindowsPrintEnv(process.env, printerName, title);

  const powershellScript = [
    "$ErrorActionPreference = 'Stop'",
    "if ([string]::IsNullOrWhiteSpace($env:SystemRoot) -and (Test-Path 'C:\\Windows')) { $env:SystemRoot = 'C:\\Windows' }",
    "if ([string]::IsNullOrWhiteSpace($env:windir) -and -not [string]::IsNullOrWhiteSpace($env:SystemRoot)) { $env:windir = $env:SystemRoot }",
    "if ([string]::IsNullOrWhiteSpace($env:TEMP) -and -not [string]::IsNullOrWhiteSpace($env:TMP)) { $env:TEMP = $env:TMP }",
    "if ([string]::IsNullOrWhiteSpace($env:TMP) -and -not [string]::IsNullOrWhiteSpace($env:TEMP)) { $env:TMP = $env:TEMP }",
    "if ([string]::IsNullOrWhiteSpace($env:TEMP)) {",
    "  try { $env:TEMP = [System.IO.Path]::GetTempPath() } catch {}",
    "}",
    "if ([string]::IsNullOrWhiteSpace($env:TMP) -and -not [string]::IsNullOrWhiteSpace($env:TEMP)) { $env:TMP = $env:TEMP }",
    "Add-Type -TypeDefinition @\"",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class DonerRawPrinter {",
    "  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]",
    "  public class DOCINFO {",
    "    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;",
    "    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;",
    "    [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype;",
    "  }",
    "  [DllImport(\"winspool.Drv\", EntryPoint = \"OpenPrinterW\", SetLastError = true, CharSet = CharSet.Unicode)]",
    "  public static extern bool OpenPrinter(string name, out IntPtr printerHandle, IntPtr defaultsPtr);",
    "  [DllImport(\"winspool.Drv\", SetLastError = true)]",
    "  public static extern bool ClosePrinter(IntPtr printerHandle);",
    "  [DllImport(\"winspool.Drv\", EntryPoint = \"StartDocPrinterW\", SetLastError = true, CharSet = CharSet.Unicode)]",
    "  public static extern int StartDocPrinter(IntPtr printerHandle, int level, DOCINFO docInfo);",
    "  [DllImport(\"winspool.Drv\", SetLastError = true)]",
    "  public static extern bool EndDocPrinter(IntPtr printerHandle);",
    "  [DllImport(\"winspool.Drv\", SetLastError = true)]",
    "  public static extern bool StartPagePrinter(IntPtr printerHandle);",
    "  [DllImport(\"winspool.Drv\", SetLastError = true)]",
    "  public static extern bool EndPagePrinter(IntPtr printerHandle);",
    "  [DllImport(\"winspool.Drv\", SetLastError = true)]",
    "  public static extern bool WritePrinter(IntPtr printerHandle, byte[] bytes, int count, out int written);",
    "}",
    "\"@ | Out-Null",
    "",
    "function FailWithLastError([string]$Message) {",
    "  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()",
    "  $detail = (New-Object System.ComponentModel.Win32Exception($code)).Message",
    "  if ($code -eq 203) {",
    "    $envDiag = 'SystemRoot=' + $env:SystemRoot + ', windir=' + $env:windir + ', TEMP=' + $env:TEMP + ', TMP=' + $env:TMP + ', USERPROFILE=' + $env:USERPROFILE + ', APPDATA=' + $env:APPDATA + ', LOCALAPPDATA=' + $env:LOCALAPPDATA",
    "    throw ($Message + ' (Win32 ' + $code + ': ' + $detail + ') | Env: ' + $envDiag)",
    "  }",
    "  throw ($Message + ' (Win32 ' + $code + ': ' + $detail + ')')",
    "}",
    "",
    "$printerName = [Environment]::GetEnvironmentVariable('DONER_WIN_PRINTER_NAME')",
    "if ([string]::IsNullOrWhiteSpace($printerName)) {",
    "  try {",
    "    $printerName = Get-CimInstance Win32_Printer | Where-Object { $_.Default } | Select-Object -First 1 -ExpandProperty Name",
    "  } catch {",
    "    $printerName = $null",
    "  }",
    "}",
    "if ([string]::IsNullOrWhiteSpace($printerName)) {",
    "  throw 'Kein Druckername gesetzt und kein Standarddrucker gefunden.'",
    "}",
    "",
    "$title = [Environment]::GetEnvironmentVariable('DONER_WIN_PRINT_TITLE')",
    "if ([string]::IsNullOrWhiteSpace($title)) { $title = 'Doner Ticket' }",
    "",
    "$stdin = [Console]::OpenStandardInput()",
    "$ms = New-Object System.IO.MemoryStream",
    "$buf = New-Object byte[] 4096",
    "while (($n = $stdin.Read($buf, 0, $buf.Length)) -gt 0) {",
    "  $ms.Write($buf, 0, $n)",
    "}",
    "$payload = $ms.ToArray()",
    "if ($payload.Length -eq 0) {",
    "  throw 'Leerer Druckpayload empfangen.'",
    "}",
    "",
    "$handle = [IntPtr]::Zero",
    "$docStarted = $false",
    "$pageStarted = $false",
    "try {",
    "  if (-not [DonerRawPrinter]::OpenPrinter($printerName, [ref]$handle, [IntPtr]::Zero)) {",
    "    FailWithLastError('OpenPrinter fehlgeschlagen')",
    "  }",
    "  $docInfo = New-Object DonerRawPrinter+DOCINFO",
    "  $docInfo.pDocName = $title",
    "  $docInfo.pDatatype = 'RAW'",
    "  if ([DonerRawPrinter]::StartDocPrinter($handle, 1, $docInfo) -le 0) {",
    "    FailWithLastError('StartDocPrinter fehlgeschlagen')",
    "  }",
    "  $docStarted = $true",
    "  if (-not [DonerRawPrinter]::StartPagePrinter($handle)) {",
    "    FailWithLastError('StartPagePrinter fehlgeschlagen')",
    "  }",
    "  $pageStarted = $true",
    "  $written = 0",
    "  if (-not [DonerRawPrinter]::WritePrinter($handle, $payload, $payload.Length, [ref]$written)) {",
    "    FailWithLastError('WritePrinter fehlgeschlagen')",
    "  }",
    "  if ($written -ne $payload.Length) {",
    "    throw ('WritePrinter unvollstaendig: ' + $written + '/' + $payload.Length + ' Bytes')",
    "  }",
    "  if (-not [DonerRawPrinter]::EndPagePrinter($handle)) {",
    "    FailWithLastError('EndPagePrinter fehlgeschlagen')",
    "  }",
    "  $pageStarted = $false",
    "  if (-not [DonerRawPrinter]::EndDocPrinter($handle)) {",
    "    FailWithLastError('EndDocPrinter fehlgeschlagen')",
    "  }",
    "  $docStarted = $false",
    "  [Console]::Out.WriteLine('Printed ' + $written + ' bytes to ' + $printerName)",
    "} finally {",
    "  if ($pageStarted -and $handle -ne [IntPtr]::Zero) { [void][DonerRawPrinter]::EndPagePrinter($handle) }",
    "  if ($docStarted -and $handle -ne [IntPtr]::Zero) { [void][DonerRawPrinter]::EndDocPrinter($handle) }",
    "  if ($handle -ne [IntPtr]::Zero) { [void][DonerRawPrinter]::ClosePrinter($handle) }",
    "}"
  ].join("\n");

  return spawnPrintJobProcess({
    command: "powershell.exe",
    args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", powershellScript],
    ticketPayload,
    printerName,
    exitLabel: "powershell.exe",
    spawnOptions: { env }
  });
}

function buildWindowsPrintEnv(baseEnv, printerName, title) {
  const env = {
    ...baseEnv,
    DONER_WIN_PRINTER_NAME: printerName || "",
    DONER_WIN_PRINT_TITLE: title || "Sark Kebab Bon"
  };

  const systemRoot = env.SystemRoot || env.SYSTEMROOT || env.windir || env.WINDIR || "C:\\Windows";
  env.SystemRoot = systemRoot;
  env.SYSTEMROOT = env.SYSTEMROOT || systemRoot;
  env.windir = env.windir || env.WINDIR || systemRoot;
  env.WINDIR = env.WINDIR || env.windir;

  const tmpPath = env.TEMP || env.TMP || os.tmpdir();
  env.TEMP = env.TEMP || tmpPath;
  env.TMP = env.TMP || tmpPath;

  const userProfile = env.USERPROFILE || (env.HOMEDRIVE && env.HOMEPATH ? `${env.HOMEDRIVE}${env.HOMEPATH}` : "");
  if (userProfile) {
    env.USERPROFILE = userProfile;
    env.APPDATA = env.APPDATA || `${userProfile}\\AppData\\Roaming`;
    env.LOCALAPPDATA = env.LOCALAPPDATA || `${userProfile}\\AppData\\Local`;
  }
  env.ProgramData = env.ProgramData || "C:\\ProgramData";
  env.PUBLIC = env.PUBLIC || "C:\\Users\\Public";

  if (!env.ComSpec && systemRoot) {
    env.ComSpec = `${systemRoot}\\System32\\cmd.exe`;
  }

  return env;
}

function spawnPrintJobProcess({ command, args, ticketPayload, printerName, exitLabel, spawnOptions = {} }) {
  const PRINT_TIMEOUT_MS = 10_000;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      ...spawnOptions
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (!settled) {
        try { child.kill("SIGKILL"); } catch {}
        finish({
          ok: false,
          printer: printerName,
          error: `Print timeout after ${PRINT_TIMEOUT_MS / 1000}s`
        });
      }
    }, PRINT_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.stdin.on("error", (error) => {
      if (error?.code === "EPIPE" || error?.code === "ERR_STREAM_DESTROYED") {
        return;
      }
      finish({
        ok: false,
        printer: printerName,
        error: error.message
      });
    });
    child.on("error", (error) => {
      finish({
        ok: false,
        printer: printerName,
        error: error.message
      });
    });
    child.on("close", (code) => {
      if (settled) return;
      if (code === 0) {
        finish({
          ok: true,
          printer: printerName,
          output: stdout.trim()
        });
        return;
      }
      finish({
        ok: false,
        printer: printerName,
        error: stderr.trim() || stdout.trim() || `${exitLabel} exited with code ${code}`
      });
    });

    child.stdin.end(ticketPayload);
  });
}

// --- PLU-Mapping & QR-Code Payload ---

const PLU_MAP = {
  products: {
    suppe_01: "1", suppe_01a: "3", suppe_02: "2",
    salat_41: "6", salat_42: "7",
    doner_03: "11", doner_04: "12", doner_05: "13", doner_06: "14",
    doner_07: "18", doner_08: "15", doner_09: "15",
    durum_10: "51", durum_11: "52", durum_12: "53", durum_13: "54",
    donerbox_19: "31", donerbox_20: "32", donerbox_21: "41", donerbox_22: "42",
    pommes_55: "151", pommes_56: "152",
    lahmacun_14: "110", lahmacun_15: "111", lahmacun_16: "112",
    lahmacun_17: "114", lahmacun_18: "113",
    kofte_25: "81", kofte_26: "82", kofte_27: "83", kofte_28: "83",
    kofte_28a: "84", kofte_28c: "84", kofte_28b: "85",
    curry_29: "102", curry_30: "105", curry_31: "103", curry_32: "104",
    chicken_33: "93", chicken_34: "92", chicken_35: "91",
    chicken_36: "92", chicken_37: "91", chicken_38: "94", chicken_39: "94",
    nuggets_57: "98", nuggets_58: "97",
    iskender_43: "61", iskender_44: "62",
    grill_45: "71", fitness_40: "65",
    veg_47: "131", veg_48a: "132", veg_48b: "141", veg_49: "142",
    veg_50: "143", veg_51: "143", veg_51b: "143", veg_52: "144",
    veg_53: "126", veg_54: "128",
    sonst_76: "203", sonst_77: "157", sonst_78: "176", sonst_79: "175",
    sonst_80: "183", sonst_81: "380", sonst_82: "172",
    sonstiges_PRD3Id: "192",
    drink_66: "212", drink_68: "211", drink_69: "231", drink_70: "241",
    drink_71: "251", drink_72: "211", drink_73: "212", drink_74: "211", drink_75: "221"
  },
  extras: {
    extra_59: "181", extra_60: "182",
    extra_61_ketchup: "161", extra_61_mayo: "162", extra_61_curry: "163",
    extra_62: "165", extra_63: "166", extra_64: "171", extra_65: "172",
    donerbox_extra_salat: "50",
    teller_extra_pommes: "180", teller_extra_reis: "185",
    extra_kofte: "184", extra_falafel: "186"
  }
};

function findProductPlu(productId) {
  // Check products.json plu field first, then fallback to hardcoded PLU_MAP
  if (productsCache) {
    for (const cat of productsCache.categories) {
      const item = cat.items.find(i => i.id === productId);
      if (item?.plu) return item.plu;
    }
  }
  return PLU_MAP.products[productId] || null;
}

function buildQrPayload(items) {
  const entries = [];
  function addOrIncrement(plu, amount) {
    const p = String(plu);
    const existing = entries.find(e => e.plu === p);
    if (existing) { existing.amount = String(Number(existing.amount) + amount); }
    else { entries.push({ plu: p, amount: String(amount) }); }
  }
  for (const item of items) {
    // Use size-specific PLU if available (e.g. sauce 100ml=172, 300ml=173)
    const sizePlu = item.selectedSize?.plu;
    const productPlu = sizePlu || findProductPlu(item.productId);
    if (productPlu) addOrIncrement(productPlu, item.qty || 1);
    for (const extra of (item.extras || [])) {
      const extraPlu = PLU_MAP.extras[extra.id];
      if (extraPlu) addOrIncrement(extraPlu, item.qty || 1);
    }
    if (item.donerboxExtraFee > 0) addOrIncrement("50", item.qty || 1);
    if (item.extraPieces > 0 && item.extraPiecesLabel) {
      const piecePlu = item.extraPiecesLabel.includes("Köfte") ? "184" : "186";
      addOrIncrement(piecePlu, (item.extraPieces || 0) * (item.qty || 1));
    }
  }
  return JSON.stringify(entries);
}

async function buildQrEscPos(data) {
  const png = await QRCode.toBuffer(data, { width: 200, margin: 1, errorCorrectionLevel: "M" });
  // Parse PNG to get raw pixel data
  // Use ESC/POS native QR command instead (GS ( k)
  const GS = 0x1d;
  const dataBytes = Buffer.from(data, "utf8");
  const chunks = [];

  // Center align
  chunks.push(Buffer.from([0x1b, 0x61, 0x01]));

  // GS ( k — QR Code: set model (Model 2)
  chunks.push(Buffer.from([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));

  // GS ( k — QR Code: set size (module size = 4 dots)
  chunks.push(Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04]));

  // GS ( k — QR Code: set error correction (M = 49)
  chunks.push(Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]));

  // GS ( k — QR Code: store data
  const storeLen = dataBytes.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;
  chunks.push(Buffer.from([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]));
  chunks.push(dataBytes);

  // GS ( k — QR Code: print
  chunks.push(Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));

  // Reset to left align
  chunks.push(Buffer.from([0x1b, 0x61, 0x00]));

  return Buffer.concat(chunks);
}

// --- Ingredient abbreviation for receipts ---
const INGREDIENT_ABBREVS = {
  "BLAUKRAUT": "BL.KRAUT",
  "GRÜNER SALAT": "GR.SALAT",
  "GRUENER SALAT": "GR.SALAT",
  "KRAUTSALAT": "KR.SALAT",
  "WEISSKRAUT": "W.KRAUT",
  "GRANATAPFELDRESSING": "GRAN.DR.",
  "OLIVENÖLDRESSING": "OLIV.DR.",
  "CHILI SAUCE": "CHILI S.",
  "CURRYSAUCE": "CURRY S.",
  "NUR FLEISCH": "NUR FL.",
  "JALAPEÑO": "JALAP.",
  "JALAPENO": "JALAP.",
  "ZWIEBEL": "ZWIEB.",
  "PEPERONI": "PEPERO.",
};

function abbreviateIngredient(name, maxLen) {
  if (name.length <= maxLen) return name;
  if (INGREDIENT_ABBREVS[name]) return INGREDIENT_ABBREVS[name];
  // Generic: truncate and add dot
  return name.slice(0, maxLen - 1) + ".";
}

// --- Order Receipt (Bon) Builder ---

function formatPrice(price) {
  return Number(price).toFixed(2).replace(".", ",") + " EUR";
}

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Word-wrap helper: wraps text at maxChars, keeping whole words together
function wordWrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) { line = word; }
    else if (line.length + 1 + word.length <= maxChars) { line += " " + word; }
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

// Shared: render header (name, dine option, car, payment, batch)
function buildReceiptHeader(order, randomNum, { skipRestaurantName = false, smallFont = false } = {}) {
  const ESC = 0x1b;
  const chunks = [];

  chunks.push(
    Buffer.from([ESC, 0x40]), // reset
    Buffer.from([ESC, 0x74, 0x13]), // Code Page 858
    Buffer.from([ESC, 0x61, 0x01]) // center
  );

  // Restaurant name (skip for kitchen bon)
  if (!skipRestaurantName) {
    chunks.push(
      Buffer.from([ESC, 0x45, 0x01]),
      escPosTextSize(smallFont ? 1 : 2, smallFont ? 1 : 2),
      cp858Buffer("SARK KEBAB\n"),
      Buffer.from([ESC, 0x45, 0x00]),
      escPosTextSize(1, 1),
      cp858Buffer("\n")
    );
  }

  // Customer name with random number (always big — same size on customer & kitchen bon)
  const customerDisplay = `${order.customerName.toUpperCase()} #${randomNum}`;
  chunks.push(
    Buffer.from([ESC, 0x45, 0x01]),
    escPosTextSize(2, 2),
    cp858Buffer(`${customerDisplay}\n`),
    Buffer.from([ESC, 0x45, 0x00]),
    escPosTextSize(1, 1),
    cp858Buffer("\n")
  );

  // Dine option
  let dineLabel = "HIER ESSEN";
  if (order.dineOption === "mitnehmen") dineLabel = "*** MITNEHMEN ***";
  else if (order.dineOption === "imauto") dineLabel = "*** IM AUTO ***";

  chunks.push(
    cp858Buffer("================================\n"),
    Buffer.from([ESC, 0x45, 0x01]),
    escPosTextSize(smallFont ? 2 : 3, smallFont ? 2 : 3),
    cp858Buffer(`${dineLabel}\n`)
  );

  // Car details
  if (order.dineOption === "imauto" && (order.carBrand || order.carColor)) {
    chunks.push(
      escPosTextSize(smallFont ? 1 : 2, smallFont ? 1 : 2),
      cp858Buffer(`${(order.carBrand || "").toUpperCase()} ${(order.carColor || "").toUpperCase()}\n`)
    );
  }

  chunks.push(
    escPosTextSize(smallFont ? 1 : 2, smallFont ? 1 : 2),
    cp858Buffer(`Zahlung: ${order.paymentMethod === "karte" ? "KARTE" : "BAR"}\n`),
    Buffer.from([ESC, 0x45, 0x00]),
    escPosTextSize(1, 1),
    cp858Buffer("================================\n")
  );

  // Batch Nr for "hier essen"
  if (order.dineOption === "hieressen") {
    chunks.push(
      Buffer.from([ESC, 0x45, 0x01]),
      escPosTextSize(smallFont ? 1 : 2, smallFont ? 1 : 2),
      cp858Buffer("Batch Nr: ___\n"),
      Buffer.from([ESC, 0x45, 0x00]),
      escPosTextSize(1, 1)
    );
  }

  chunks.push(cp858Buffer("\n"));

  // Order ID and date
  chunks.push(
    cp858Buffer(`Bestellung #${order.id}\n`),
    cp858Buffer(`${formatDateTime(order.createdAt)}\n`),
    cp858Buffer("--------------------------------\n")
  );

  return chunks;
}

// Render a single item on receipt (full version with prices)
function renderItemFull(chunks, item) {
  const ESC = 0x1b;
  const qty = item.qty || 1;
  const lineTotal = qty * item.price;

  // Customer bon: half size (1,1) instead of kitchen (2,2)
  // Item name (bold) — Dönerbox: size + base on same line
  let displayName = item.name.toUpperCase();
  if (item.donerboxBase) {
    const baseLabel = item.donerboxBase === "reis" ? "M. REIS" : item.donerboxBase === "pommes" ? "M. POMMES" : "OHNE BEIL.";
    displayName += ` ${baseLabel}`;
  }
  if (item.tellerSide && !item.name.toLowerCase().includes("pommes") && !item.name.toLowerCase().includes("reis")) {
    const sideLabel = item.tellerSide === "pommes" ? "M. POMMES" : item.tellerSide === "reis" ? "M. REIS" : "OHNE POMMES & REIS";
    displayName += ` ${sideLabel}`;
  }
  const nameText = `${qty}x ${displayName}`;
  const nameLines = wordWrap(nameText, 32);
  chunks.push(Buffer.from([ESC, 0x45, 0x01]), escPosTextSize(1, 1));
  for (const line of nameLines) chunks.push(cp858Buffer(`${line}\n`));
  chunks.push(Buffer.from([ESC, 0x45, 0x00]));

  // Price
  chunks.push(escPosTextSize(1, 1), cp858Buffer(`   ${formatPrice(lineTotal)}\n`));

  // Size choice (e.g. 100ml / 300ml)
  if (item.selectedSize && item.selectedSize.label) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> ${item.selectedSize.label.toUpperCase()}\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Sauce option
  if (item.sauceWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT SAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.sauceWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE SAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Bread option
  if (item.breadWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT BROT\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.breadWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE BROT\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Curry sauce option
  if (item.currySauceWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT CURRYSAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.currySauceWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE CURRYSAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Options/ingredients (skip Dönerbox base options already in name)
  const fullDonerboxBaseOpts = ["Reis", "Pommes", "Ohne Reis & Pommes"];
  if (item.allOptionsExcept && item.allOptionsExcept.length > 0) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]));
    for (const ohne of item.allOptionsExcept) {
      const abbr = abbreviateIngredient(ohne.toUpperCase(), 24); // 32 - "   OHNE " prefix
      chunks.push(cp858Buffer(`   OHNE ${abbr}\n`));
    }
    chunks.push(Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.allOptions) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT ALLEM\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (Array.isArray(item.options) && item.options.length > 0) {
    for (const opt of item.options) {
      if (item.donerboxBase && fullDonerboxBaseOpts.includes(opt)) continue;
      const optLines = wordWrap(`   + ${opt.toUpperCase()}`, 32);
      for (const line of optLines) chunks.push(cp858Buffer(`${line}\n`));
    }
  }

  // Optional ingredients (Scharf, Jalapeño, etc.)
  if (Array.isArray(item.optionalIngredients) && item.optionalIngredients.length > 0) {
    for (const opt of item.optionalIngredients) {
      chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   + ${opt.toUpperCase()}\n`), Buffer.from([ESC, 0x45, 0x00]));
    }
  }

  // Extras
  if (Array.isArray(item.extras) && item.extras.length > 0) {
    for (const extra of item.extras) {
      chunks.push(cp858Buffer(`   + ${extra.name.toUpperCase()} (${formatPrice(extra.price)})\n`));
    }
  }

  // Extra pieces (Stück Köfte / Stück Falafel)
  if (item.extraPieces > 0 && item.extraPiecesLabel) {
    const piecesTotal = item.extraPieces * (item.extraPiecesPrice || 0);
    chunks.push(
      Buffer.from([ESC, 0x45, 0x01]),
      cp858Buffer(`   + ${item.extraPieces}x ${item.extraPiecesLabel.toUpperCase()} (${formatPrice(piecesTotal)})\n`),
      Buffer.from([ESC, 0x45, 0x00])
    );
  }

  // Note
  if (item.note) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   * ${item.note}\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  chunks.push(cp858Buffer("\n"));
  return lineTotal;
}

// Render a single item on receipt (kitchen version - no prices)
function renderItemKitchen(chunks, item, itemNum) {
  const ESC = 0x1b;
  const qty = item.qty || 1;

  // Number right-aligned, small font
  chunks.push(
    Buffer.from([ESC, 0x61, 0x02]), // right align
    escPosTextSize(1, 1),
    cp858Buffer(`${itemNum}.)\n`),
    Buffer.from([ESC, 0x61, 0x00])  // back to left align
  );

  // Item name — Dönerbox: size + base on same line
  let kitchenDisplayName = item.name.toUpperCase();
  if (item.donerboxBase) {
    const baseLabel = item.donerboxBase === "reis" ? "M. REIS" : item.donerboxBase === "pommes" ? "M. POMMES" : "OHNE BEIL.";
    kitchenDisplayName += ` ${baseLabel}`;
  }
  if (item.tellerSide && !item.name.toLowerCase().includes("pommes") && !item.name.toLowerCase().includes("reis")) {
    const sideLabel = item.tellerSide === "pommes" ? "M. POMMES" : item.tellerSide === "reis" ? "M. REIS" : "OHNE POMMES & REIS";
    kitchenDisplayName += ` ${sideLabel}`;
  }
  const nameText = `${qty}x ${kitchenDisplayName}`;
  const nameLines = wordWrap(nameText, 16);
  chunks.push(Buffer.from([ESC, 0x45, 0x01]), escPosTextSize(2, 2));
  for (const line of nameLines) chunks.push(cp858Buffer(`${line}\n`));
  chunks.push(Buffer.from([ESC, 0x45, 0x00]));

  // Size choice
  if (item.selectedSize && item.selectedSize.label) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> ${item.selectedSize.label.toUpperCase()}\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Sauce option
  if (item.sauceWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT SAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.sauceWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE SAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Bread option
  if (item.breadWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT BROT\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.breadWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE BROT\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Curry sauce option
  if (item.currySauceWanted === true) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT CURRYSAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.currySauceWanted === false) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> OHNE CURRYSAUCE\n`), Buffer.from([ESC, 0x45, 0x00]));
  }

  // Options/ingredients (skip base options like Reis/Pommes/Ohne that are already in the name)
  const donerboxBaseOptions = ["Reis", "Pommes", "Ohne Reis & Pommes"];
  if (item.allOptionsExcept && item.allOptionsExcept.length > 0) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]));
    for (const ohne of item.allOptionsExcept) {
      const abbr = abbreviateIngredient(ohne.toUpperCase(), 8); // 16 - "   OHNE " prefix (double-size text)
      chunks.push(cp858Buffer(`   OHNE ${abbr}\n`));
    }
    chunks.push(Buffer.from([ESC, 0x45, 0x00]));
  } else if (item.allOptions) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   >> MIT ALLEM\n`), Buffer.from([ESC, 0x45, 0x00]));
  } else if (Array.isArray(item.options) && item.options.length > 0) {
    for (const opt of item.options) {
      // Skip Dönerbox base options from the ingredient list (already in name)
      if (item.donerboxBase && donerboxBaseOptions.includes(opt)) continue;
      const optLines = wordWrap(`   + ${opt.toUpperCase()}`, 16);
      for (const line of optLines) chunks.push(cp858Buffer(`${line}\n`));
    }
  }

  // Optional ingredients
  if (Array.isArray(item.optionalIngredients) && item.optionalIngredients.length > 0) {
    for (const opt of item.optionalIngredients) {
      chunks.push(Buffer.from([ESC, 0x45, 0x01]), cp858Buffer(`   + ${opt.toUpperCase()}\n`), Buffer.from([ESC, 0x45, 0x00]));
    }
  }

  // Extras (no prices)
  if (Array.isArray(item.extras) && item.extras.length > 0) {
    for (const extra of item.extras) {
      chunks.push(escPosTextSize(2, 2), cp858Buffer(`   + ${extra.name.toUpperCase()}\n`));
    }
  }

  // Extra pieces (Stück Köfte / Stück Falafel) — no prices on kitchen bon
  if (item.extraPieces > 0 && item.extraPiecesLabel) {
    chunks.push(
      Buffer.from([0x1b, 0x45, 0x01]),
      escPosTextSize(2, 2),
      cp858Buffer(`   + ${item.extraPieces}x ${item.extraPiecesLabel.toUpperCase()}\n`),
      Buffer.from([0x1b, 0x45, 0x00])
    );
  }

  // Note
  if (item.note) {
    chunks.push(Buffer.from([0x1b, 0x45, 0x01]), escPosTextSize(1, 2), cp858Buffer(`   * ${item.note}\n`), Buffer.from([0x1b, 0x45, 0x00]), escPosTextSize(2, 2));
  }

  chunks.push(escPosTextSize(1, 1), cp858Buffer("- - - - - - - - - - - - - -\n\n"));
}

// BON 1: Full customer receipt (everything + "Bitte Bon nicht wegschmeißen")
async function buildCustomerReceipt(order, randomNum) {
  const ESC = 0x1b;
  const GS = 0x1d;
  const chunks = buildReceiptHeader(order, randomNum, { smallFont: true });

  // "Bitte Bon nicht wegschmeißen" notice
  chunks.push(
    Buffer.from([ESC, 0x61, 0x01]), // center
    Buffer.from([ESC, 0x45, 0x01]),
    escPosTextSize(1, 1),
    cp858Buffer("** BITTE BON NICHT WEGSCHMEISSEN **\n"),
    Buffer.from([ESC, 0x45, 0x00]),
    cp858Buffer("\n")
  );

  // Left align for items
  chunks.push(Buffer.from([ESC, 0x61, 0x00]));

  let total = 0;
  const foodItems = order.items.filter(i => !i.isDrink);
  const drinkItems = order.items.filter(i => i.isDrink);

  if (foodItems.length > 0) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), escPosTextSize(1, 1), cp858Buffer("--- ESSEN ---\n"), Buffer.from([ESC, 0x45, 0x00]));
    for (const item of foodItems) total += renderItemFull(chunks, item);
  }

  if (drinkItems.length > 0) {
    chunks.push(Buffer.from([ESC, 0x45, 0x01]), escPosTextSize(1, 1), cp858Buffer("--- GETRANKE ---\n"), Buffer.from([ESC, 0x45, 0x00]));
    for (const item of drinkItems) total += renderItemFull(chunks, item);
  }

  if (foodItems.length === 0 && drinkItems.length === 0) {
    for (const item of order.items) total += renderItemFull(chunks, item);
  }

  // Total (small font for customer bon)
  chunks.push(
    Buffer.from([ESC, 0x61, 0x00]), cp858Buffer("--------------------------------\n"),
    Buffer.from([ESC, 0x45, 0x01]), escPosTextSize(1, 1),
    Buffer.from([ESC, 0x61, 0x02]),
    cp858Buffer(`GESAMT: ${formatPrice(total)}\n`),
    Buffer.from([ESC, 0x45, 0x00]), escPosTextSize(1, 1)
  );

  // QR-Code for Kasse
  const qrPayload = buildQrPayload(order.items);
  if (qrPayload !== "[]") {
    chunks.push(cp858Buffer("\n"));
    const qrBuf = await buildQrEscPos(qrPayload);
    chunks.push(qrBuf);
    chunks.push(cp858Buffer("\n"));
  }

  // Footer
  chunks.push(Buffer.from([ESC, 0x61, 0x01]), cp858Buffer("\n"), cp858Buffer("GUTEN APPETIT!\n"));
  for (const line of TICKET_FOOTER_LINES) chunks.push(cp858Buffer(`${line}\n`));

  // Feed and cut
  chunks.push(cp858Buffer("\n\n\n"), Buffer.from([GS, 0x56, 0x00]));

  return Buffer.concat(chunks);
}

// BON 2: Kitchen receipt (name + info + only food, NO prices, NO drinks)
// Splits into multiple bons if more than 4 food items
const KITCHEN_BON_MAX_ITEMS = 4;

function buildKitchenReceipt(order, randomNum) {
  const ESC = 0x1b;
  const GS = 0x1d;
  const foodItems = order.items.filter(i => !i.isDrink);

  // If <= 4 items, single bon
  if (foodItems.length <= KITCHEN_BON_MAX_ITEMS) {
    return buildSingleKitchenBon(order, randomNum, foodItems, 1, 1);
  }

  // Split into chunks of 4
  const bonChunks = [];
  const totalBons = Math.ceil(foodItems.length / KITCHEN_BON_MAX_ITEMS);
  for (let i = 0; i < totalBons; i++) {
    const slice = foodItems.slice(i * KITCHEN_BON_MAX_ITEMS, (i + 1) * KITCHEN_BON_MAX_ITEMS);
    bonChunks.push(buildSingleKitchenBon(order, randomNum, slice, i + 1, totalBons, i * KITCHEN_BON_MAX_ITEMS));
  }
  return Buffer.concat(bonChunks);
}

function buildSingleKitchenBon(order, randomNum, items, bonNum, totalBons, startIdx = 0) {
  const ESC = 0x1b;
  const GS = 0x1d;
  const chunks = buildReceiptHeader(order, randomNum, { skipRestaurantName: true });

  // Show bon part number if split
  if (totalBons > 1) {
    chunks.push(
      Buffer.from([ESC, 0x61, 0x01]),
      Buffer.from([ESC, 0x45, 0x01]),
      escPosTextSize(2, 2),
      cp858Buffer(`TEIL ${bonNum}/${totalBons}\n`),
      Buffer.from([ESC, 0x45, 0x00]),
      escPosTextSize(1, 1),
      cp858Buffer("\n")
    );
  }

  // Left align for items
  chunks.push(Buffer.from([ESC, 0x61, 0x00]));

  if (items.length > 0) {
    let itemNum = startIdx + 1;
    for (const item of items) {
      renderItemKitchen(chunks, item, itemNum);
      itemNum++;
    }
  }

  // Footer
  chunks.push(
    Buffer.from([ESC, 0x61, 0x01]),
    cp858Buffer("\n"),
    cp858Buffer(`--- KUECHENBON${totalBons > 1 ? ` ${bonNum}/${totalBons}` : ""} ---\n`)
  );

  // Feed and cut
  chunks.push(cp858Buffer("\n\n\n"), Buffer.from([GS, 0x56, 0x00]));

  return Buffer.concat(chunks);
}

async function printOrderReceipt(order) {
  if (!PRINT_ORDER_ENABLED) {
    return {
      ok: false,
      skipped: true,
      reason: "Printing disabled via DONER_PRINT_ORDER=0"
    };
  }

  // Generate same random number for both receipts
  const randomNum = Math.floor(Math.random() * 50) + 1;
  const customerPayload = await buildCustomerReceipt(order, randomNum);
  const kitchenPayload = buildKitchenReceipt(order, randomNum);

  // Both receipts from the same printer (combined into one print job)
  const combinedPayload = Buffer.concat([customerPayload, kitchenPayload]);

  const results = [];
  const printerName = PRINTER_CUSTOMER || PRINTER_STAFF;

  if (!printerName) {
    console.warn("Keine Drucker konfiguriert. Setze DONER_PRINTER_CUSTOMER und/oder DONER_PRINTER_STAFF.");
    return {
      ok: false,
      error: "Keine Drucker konfiguriert"
    };
  }

  {
    const result = await runPrintJob(combinedPayload, printerName, `Bestellung ${order.customerName}`, { raw: true });
    results.push({
      printer: printerName,
      label: "Drucker",
      ok: result.ok,
      error: result.error || null,
      output: result.output || null
    });
    if (!result.ok) {
      console.error(`Druckfehler (${printerName}): ${result.error}`);
    }
  }

  return {
    ok: results.every(r => r.ok),
    results
  };
}

// --- Cleanup ---

function cleanupExpiredOrders() {
  const now = nowMs();
  const before = orders.length;
  orders = orders.filter((o) => {
    if (o?.status === "DONE") {
      const completedAt = o.completedAt ?? o.createdAt ?? 0;
      return (completedAt + DONE_ORDER_ADMIN_RETENTION_MS) > now;
    }
    return (o.expiresAt ?? 0) > now;
  });
  const after = orders.length;
  if (after !== before) {
    queueWriteOrders();
  }
}

function cleanupExpiredAdminSessions() {
  const now = nowMs();
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) {
      adminSessions.delete(token);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(() => {
  cleanupExpiredOrders();
  cleanupExpiredAdminSessions();
}, 30_000);

// --- API ---

// Products: public (no auth needed for SB tablets)
app.get("/api/products", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    res.json(productsCache);
  } catch (e) {
    res.status(500).json({ error: "Cannot read products.json" });
  }
});

// Admin login
app.post("/api/admin/login", (req, res) => {
  const body = req.body ?? {};
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (!verifyAdminCredentials(username, password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createAdminSession(username);
  setAdminSessionCookie(res, token);
  return res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  const session = getAdminSession(req);
  if (session) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.admin_session;
    if (token) adminSessions.delete(token);
  }
  clearAdminSessionCookie(res);
  return res.json({ ok: true });
});

app.get("/api/admin/me", requireAdminApi, (req, res) => {
  const session = getAdminSession(req);
  return res.json({ ok: true, username: session?.username ?? ADMIN_USER });
});

// Admin: list orders (pending + completed within retention)
app.get("/api/orders", requireAdminApi, (req, res) => {
  cleanupExpiredOrders();
  const sorted = [...orders].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  res.json({ orders: sorted });
});

// Public screen: completed orders (only recent names, no item details)
app.get("/api/orders/completed-screen", (req, res) => {
  cleanupExpiredOrders();
  const now = nowMs();
  const completed = orders
    .filter((order) => {
      if (order?.status !== "DONE") return false;
      const completedAt = order.completedAt ?? order.createdAt ?? 0;
      return (now - completedAt) <= DONE_ORDER_PUBLIC_SCREEN_MS;
    })
    .sort((a, b) => (b.completedAt ?? b.createdAt ?? 0) - (a.completedAt ?? a.createdAt ?? 0))
    .map((order) => ({
      id: order.id,
      customerName: order.customerName ?? "",
      completedAt: order.completedAt ?? order.createdAt ?? 0
    }));

  res.json({ orders: completed });
});

// Customer: create order (no auth - SB tablet)
app.post("/api/orders", async (req, res) => {
  cleanupExpiredOrders();
  const body = req.body ?? {};
  const customerName = String(body.customerName ?? "").trim();
  const paymentMethod = String(body.paymentMethod ?? "bar").trim();
  const dineOption = String(body.dineOption ?? "hieressen").trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName) return res.status(400).json({ error: "customerName is required" });
  if (customerName.length < 2) return res.status(400).json({ error: "customerName must be at least 2 characters" });
  if (items.length === 0) return res.status(400).json({ error: "items is required" });

  const carBrand = String(body.carBrand ?? "").trim();
  const carColor = String(body.carColor ?? "").trim();

  const createdAt = nowMs();
  const order = {
    id: nanoid(10),
    customerName,
    paymentMethod,
    dineOption,
    carBrand: carBrand || null,
    carColor: carColor || null,
    items,
    status: "PENDING",
    createdAt,
    completedAt: null,
    expiresAt: createdAt + ORDER_TTL_MS
  };

  orders.push(order);
  await queueWriteOrders();

  // Print 2 receipts (customer + staff)
  const printResult = await printOrderReceipt(order);
  if (!printResult.ok && !printResult.skipped) {
    console.error(`Druckfehler für Bestellung ${order.id}:`, printResult);
  }

  res.json({ ok: true, order, print: printResult });
});

app.post("/api/orders/:id/complete", requireAdminApi, async (req, res) => {
  cleanupExpiredOrders();
  const { id } = req.params;
  const o = orders.find(x => x.id === id);
  if (!o) return res.status(404).json({ error: "Order not found" });

  o.status = "DONE";
  o.completedAt = nowMs();
  await queueWriteOrders();

  res.json({ ok: true, order: o });
});

// Update product prices
app.put("/api/products/prices", async (req, res) => {
  try {
    const prices = req.body?.prices;
    if (!prices || typeof prices !== "object") {
      return res.status(400).json({ error: "prices object is required" });
    }

    if (!productsCache) await loadProducts();
    const data = JSON.parse(JSON.stringify(productsCache));

    // Update category item prices
    for (const cat of data.categories || []) {
      for (const item of cat.items || []) {
        if (prices[item.id] !== undefined) {
          const p = Number(prices[item.id]);
          if (Number.isFinite(p) && p >= 0) item.price = p;
        }
      }
    }

    // Update extra prices
    for (const extra of data.extras || []) {
      if (prices[extra.id] !== undefined) {
        const p = Number(prices[extra.id]);
        if (Number.isFinite(p) && p >= 0) extra.price = p;
      }
    }

    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(data, null, 2), "utf-8");
    productsCache = data;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/orders/:id", requireAdminApi, async (req, res) => {
  cleanupExpiredOrders();
  const { id } = req.params;
  const before = orders.length;
  orders = orders.filter(x => x.id !== id);
  if (orders.length === before) return res.status(404).json({ error: "Order not found" });

  await queueWriteOrders();
  res.json({ ok: true });
});

// --- Admin Product Management API ---

// Update a single product (name, price, desc, etc.)
app.put("/api/admin/products/:categoryId/:productId", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId, productId } = req.params;
    const updates = req.body;
    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const item = cat.items.find(i => i.id === productId);
    if (!item) return res.status(404).json({ error: "Product not found" });

    if (updates.name !== undefined) item.name = String(updates.name);
    if (updates.name_en !== undefined) item.name_en = String(updates.name_en);
    if (updates.name_tr !== undefined) item.name_tr = String(updates.name_tr);
    if (updates.price !== undefined) item.price = Number(updates.price);
    if (updates.desc !== undefined) item.desc = String(updates.desc);
    if (updates.desc_en !== undefined) item.desc_en = String(updates.desc_en);
    if (updates.desc_tr !== undefined) item.desc_tr = String(updates.desc_tr);
    if (updates.plu !== undefined) {
      if (updates.plu) item.plu = String(updates.plu);
      else delete item.plu;
    }

    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload product image
app.put("/api/admin/products/:categoryId/:productId/image", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId, productId } = req.params;
    const { filename, data } = req.body; // data = base64
    if (!filename || !data) return res.status(400).json({ error: "filename and data required" });

    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const item = cat.items.find(i => i.id === productId);
    if (!item) return res.status(404).json({ error: "Product not found" });

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destDir = path.join(PUBLIC_DIR, "imagesforsark");
    await fs.mkdir(destDir, { recursive: true });
    const destPath = path.join(destDir, safeName);
    await fs.writeFile(destPath, Buffer.from(data, "base64"));

    item.image = `imagesforsark/${safeName}`;
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true, image: item.image });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload category image
app.put("/api/admin/categories/:categoryId/image", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId } = req.params;
    const { filename, data } = req.body;
    if (!filename || !data) return res.status(400).json({ error: "filename and data required" });

    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destDir = path.join(PUBLIC_DIR, "imagesforsark");
    await fs.mkdir(destDir, { recursive: true });
    await fs.writeFile(path.join(destDir, safeName), Buffer.from(data, "base64"));

    cat.icon = `imagesforsark/${safeName}`;
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true, icon: cat.icon });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update category (title, etc.)
app.put("/api/admin/categories/:categoryId", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId } = req.params;
    const updates = req.body;
    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    if (updates.title !== undefined) cat.title = String(updates.title);
    if (updates.title_en !== undefined) cat.title_en = String(updates.title_en);
    if (updates.title_tr !== undefined) cat.title_tr = String(updates.title_tr);

    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true, category: cat });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add new product to category
app.post("/api/admin/products/:categoryId", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId } = req.params;
    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const body = req.body;
    const newItem = {
      id: body.id || `${categoryId}_${nanoid(6)}`,
      number: body.number || (cat.items.length > 0 ? Math.max(...cat.items.map(i => i.number || 0)) + 1 : 1),
      name: body.name || "Neues Produkt",
      name_en: body.name_en || body.name || "New Product",
      name_tr: body.name_tr || body.name || "Yeni Ürün",
      desc: body.desc || "",
      desc_en: body.desc_en || "",
      desc_tr: body.desc_tr || "",
      price: Number(body.price) || 0,
      image: body.image || "img/placeholder.png",
      optionsEnabled: body.optionsEnabled ?? true
    };
    if (body.isDrink) newItem.isDrink = true;
    if (body.plu) newItem.plu = String(body.plu);

    cat.items.push(newItem);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true, item: newItem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete product
app.delete("/api/admin/products/:categoryId/:productId", async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    const { categoryId, productId } = req.params;
    const cat = productsCache.categories.find(c => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const idx = cat.items.findIndex(i => i.id === productId);
    if (idx === -1) return res.status(404).json({ error: "Product not found" });

    cat.items.splice(idx, 1);
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(productsCache, null, 2), "utf-8");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- QR-Code API ---
app.get("/api/qr", async (req, res) => {
  const data = req.query.data;
  if (!data) return res.status(400).send("Missing data parameter");
  try {
    const png = await QRCode.toBuffer(data, { width: 300, margin: 2 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    res.status(500).send("QR generation failed: " + err.message);
  }
});

// --- Page Routes ---

app.get(["/", "/access", "/access.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "access.html"));
});
app.get(["/index", "/index.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});
app.get(["/admin-login", "/admin-login.html"], (req, res) => {
  if (isAdminAuthenticated(req)) {
    return res.redirect("/admin");
  }
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "admin-login.html"));
});
app.get(["/admin", "/admin/", "/admin.html"], (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.redirect("/admin-login.html");
  }
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});
app.get(["/preise", "/admin-prices", "/admin-prices.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "admin-prices.html"));
});
app.get(["/admin-products", "/admin-products.html", "/produkte"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "admin-products.html"));
});
app.get(["/completed", "/completed/", "/completed.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "completed.html"));
});

// Static assets (css/js/img)
app.use(express.static(PUBLIC_DIR, { maxAge: 0 }));

await loadProducts();
await loadOrders();
cleanupExpiredOrders();

app.listen(PORT, HOST, () => {
  if (USING_DEFAULT_ADMIN_PASSWORD) {
    console.warn("Default-Admin aktiv: Benutzer admin, Passwort admin123. Bitte ENV setzen.");
  }
  const lanAddresses = listLanIpv4Addresses();
  const bindUrl = `http://${HOST}:${PORT}`;

  console.log(`Server laeuft (Bind): ${bindUrl}`);
  console.log(`Lokal:            http://localhost:${PORT}`);
  for (const address of lanAddresses) {
    console.log(`WLAN:             http://${address}:${PORT}`);
  }
  console.log(`Namenseingabe:    /access.html`);
  console.log(`Speisekarte:      /index.html`);
  console.log(`Admin Login:      /admin-login.html`);
  console.log(`Admin Panel:      /admin`);
  if (PRINT_ORDER_ENABLED) {
    const printerInfo = [PRINTER_CUSTOMER, PRINTER_STAFF].filter(Boolean).join(", ") || "nicht konfiguriert";
    console.log(`Bon-Druck:        aktiv (${printerInfo})`);
  } else {
    console.log("Bon-Druck:        deaktiviert (DONER_PRINT_ORDER=0)");
  }
});
