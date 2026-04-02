import express from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import os from "os";
import zlib from "zlib";
import { nanoid } from "nanoid";

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
app.use(express.json({ limit: "1mb" }));

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

function buildOrderReceiptPayload(order) {
  const ESC = 0x1b;
  const GS = 0x1d;

  const chunks = [
    Buffer.from([ESC, 0x40]), // reset
    Buffer.from([ESC, 0x61, 0x01]), // center align
  ];

  // Header: Restaurant name
  chunks.push(
    Buffer.from([ESC, 0x45, 0x01]), // bold on
    escPosTextSize(2, 2),
    Buffer.from("SARK KEBAB\n", "utf-8"),
    Buffer.from([ESC, 0x45, 0x00]), // bold off
    escPosTextSize(1, 1),
    Buffer.from("\n", "utf-8")
  );

  // Customer name (large)
  chunks.push(
    Buffer.from([ESC, 0x45, 0x01]), // bold on
    escPosTextSize(2, 2),
    Buffer.from(`${order.customerName}\n`, "utf-8"),
    Buffer.from([ESC, 0x45, 0x00]), // bold off
    escPosTextSize(1, 1),
    Buffer.from("\n", "utf-8")
  );

  // Dine option (extra large, very prominent)
  const dineLabel = order.dineOption === "mitnehmen" ? "*** MITNEHMEN ***" : "HIER ESSEN";
  chunks.push(
    Buffer.from("================================\n", "utf-8"),
    Buffer.from([ESC, 0x45, 0x01]), // bold on
    escPosTextSize(3, 3),
    Buffer.from(`${dineLabel}\n`, "utf-8"),
    escPosTextSize(2, 2),
    Buffer.from(`Zahlung: ${order.paymentMethod === "karte" ? "KARTE" : "BAR"}\n`, "utf-8"),
    Buffer.from([ESC, 0x45, 0x00]), // bold off
    escPosTextSize(1, 1),
    Buffer.from("================================\n", "utf-8"),
    Buffer.from("\n", "utf-8")
  );

  // Order ID and date
  chunks.push(
    Buffer.from(`Bestellung #${order.id}\n`, "utf-8"),
    Buffer.from(`${formatDateTime(order.createdAt)}\n`, "utf-8"),
    Buffer.from("--------------------------------\n", "utf-8")
  );

  // Switch to left alignment for items
  chunks.push(Buffer.from([ESC, 0x61, 0x00])); // left align

  let total = 0;

  for (const item of order.items) {
    const qty = item.qty || 1;
    const lineTotal = qty * item.price;
    total += lineTotal;

    // Item line: "2x Döner          9,00 EUR"
    chunks.push(
      Buffer.from([ESC, 0x45, 0x01]), // bold on
      escPosTextSize(1, 2), // slightly taller for readability
      Buffer.from(`${qty}x ${item.name}\n`, "utf-8"),
      Buffer.from([ESC, 0x45, 0x00]), // bold off
      escPosTextSize(1, 1)
    );

    // Price on right
    chunks.push(
      Buffer.from(`   ${formatPrice(lineTotal)}\n`, "utf-8")
    );

    // Options/ingredients
    if (item.allOptions) {
      chunks.push(
        Buffer.from([ESC, 0x45, 0x01]), // bold on
        Buffer.from(`   >> MIT ALLEM\n`, "utf-8"),
        Buffer.from([ESC, 0x45, 0x00]) // bold off
      );
    } else if (Array.isArray(item.options) && item.options.length > 0) {
      for (const opt of item.options) {
        chunks.push(
          Buffer.from(`   - ${opt}\n`, "utf-8")
        );
      }
    }

    // Extras
    if (Array.isArray(item.extras) && item.extras.length > 0) {
      for (const extra of item.extras) {
        chunks.push(
          Buffer.from(`   + ${extra.name} (${formatPrice(extra.price)})\n`, "utf-8")
        );
      }
    }

    chunks.push(Buffer.from("\n", "utf-8"));
  }

  // Divider and total
  chunks.push(
    Buffer.from([ESC, 0x61, 0x00]), // left align
    Buffer.from("--------------------------------\n", "utf-8"),
    Buffer.from([ESC, 0x45, 0x01]), // bold on
    escPosTextSize(2, 2),
    Buffer.from([ESC, 0x61, 0x02]), // right align
    Buffer.from(`GESAMT: ${formatPrice(total)}\n`, "utf-8"),
    Buffer.from([ESC, 0x45, 0x00]), // bold off
    escPosTextSize(1, 1)
  );

  // Footer
  chunks.push(
    Buffer.from([ESC, 0x61, 0x01]), // center align
    Buffer.from("\n", "utf-8"),
    Buffer.from("Guten Appetit!\n", "utf-8")
  );

  for (const line of TICKET_FOOTER_LINES) {
    chunks.push(Buffer.from(`${line}\n`, "utf-8"));
  }

  // Feed and cut
  chunks.push(
    Buffer.from("\n\n\n", "utf-8"),
    Buffer.from([GS, 0x56, 0x00]) // full cut
  );

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

  const ticketPayload = buildOrderReceiptPayload(order);
  const results = [];
  const printers = [];

  if (PRINTER_CUSTOMER) printers.push({ name: PRINTER_CUSTOMER, label: "Kunden-Drucker" });
  if (PRINTER_STAFF) printers.push({ name: PRINTER_STAFF, label: "Mitarbeiter-Drucker" });

  if (printers.length === 0) {
    console.warn("Keine Drucker konfiguriert. Setze DONER_PRINTER_CUSTOMER und/oder DONER_PRINTER_STAFF.");
    return {
      ok: false,
      error: "Keine Drucker konfiguriert"
    };
  }

  for (const printer of printers) {
    const result = await runPrintJob(ticketPayload, printer.name, `Bestellung ${order.customerName}`, { raw: true });
    results.push({
      printer: printer.name,
      label: printer.label,
      ok: result.ok,
      error: result.error || null,
      output: result.output || null
    });
    if (!result.ok) {
      console.error(`Druckfehler (${printer.label}/${printer.name}): ${result.error}`);
    }
  }

  const allOk = results.every(r => r.ok);
  return {
    ok: allOk,
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

  const createdAt = nowMs();
  const order = {
    id: nanoid(10),
    customerName,
    paymentMethod,
    dineOption,
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

app.delete("/api/orders/:id", requireAdminApi, async (req, res) => {
  cleanupExpiredOrders();
  const { id } = req.params;
  const before = orders.length;
  orders = orders.filter(x => x.id !== id);
  if (orders.length === before) return res.status(404).json({ error: "Order not found" });

  await queueWriteOrders();
  res.json({ ok: true });
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
