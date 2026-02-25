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
const ACCESS_NUMBERS_FILE = path.join(DATA_DIR, "access-numbers.json");
const ADMIN_USER = process.env.DONER_ADMIN_USER || process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_SALT = process.env.DONER_ADMIN_PASSWORD_SALT
  || process.env.ADMIN_PASSWORD_SALT
  || "change-this-admin-salt";
const ADMIN_PASSWORD_HASH = resolveAdminPasswordHash();
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden
const ACCESS_NUMBER_TTL_MS = 10 * 60 * 1000; // 10 Minuten
const USING_DEFAULT_ADMIN_PASSWORD = !process.env.DONER_ADMIN_PASSWORD_HASH
  && !process.env.DONER_ADMIN_PASSWORD
  && !process.env.ADMIN_PASSWORD_HASH
  && !process.env.ADMIN_PASSWORD;

const ORDER_TTL_MS = 15 * 60 * 1000; // 15 Minuten (offene Bestellungen)
const DONE_ORDER_ADMIN_RETENTION_MS = 5 * 60 * 60 * 1000; // 5 Stunden (Admin-Anzeige)
const DONE_ORDER_PUBLIC_SCREEN_MS = 5 * 60 * 1000; // 5 Minuten (öffentlicher Erledigt-Bildschirm)
const PRINT_ACCESS_NUMBER_ENABLED = process.env.DONER_PRINT_ACCESS_NUMBER !== "0";
const PRINTER_CANDIDATES = resolvePrinterCandidates();
const MENU_QR_PATH = normalizeMenuQrPath(process.env.DONER_MENU_QR_PATH || "/index.html");
const STATIC_TOP_QR_TEXT = resolveStaticTopQrText();
const TICKET_LOGO_MAX_CONTRAST = process.env.DONER_TICKET_LOGO_MAX_CONTRAST !== "0";
const TICKET_LOGO_DARKNESS = clampNumber(process.env.DONER_TICKET_LOGO_DARKNESS, 1.35, 0.5, 3);
const TICKET_LOGO_THRESHOLD = clampNumber(process.env.DONER_TICKET_LOGO_THRESHOLD, 196, 80, 245);
const TICKET_FOOTER_LINES = [
  "Onkel Bekos",
  "Galuragasse 1, Feldkirch 600",
  "+43 660 2158183",
  "www.onkelbekos.at"
];
const TICKET_LOGO_PATHS = [
  path.join(PUBLIC_DIR, "img", "onkelbekoslogo.png"),
  path.join(PUBLIC_DIR, "img", "Onkelbekoslogo.png"),
  path.join(__dirname, "images", "onkelbekoslogo.png"),
  path.join(__dirname, "images", "Onkelbekoslogo.png")
];
let cachedFooterLogoRaster = null;
let footerLogoResolvedPath = "";
let triedLoadingFooterLogo = false;

const app = express();
app.use(express.json({ limit: "1mb" }));

// --- Simple file-backed store (no DB) ---
let productsCache = null;
let orders = []; // in-memory
let accessNumbers = []; // in-memory
const adminSessions = new Map();
const guestSessions = new Map();

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

let writeAccessNumbersInFlight = Promise.resolve();
function queueWriteAccessNumbers() {
  writeAccessNumbersInFlight = writeAccessNumbersInFlight.then(async () => {
    const payload = { accessNumbers };
    await fs.writeFile(ACCESS_NUMBERS_FILE, JSON.stringify(payload, null, 2), "utf-8");
  }).catch((e) => {
    console.error("Failed writing access-numbers.json:", e);
  });
  return writeAccessNumbersInFlight;
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

async function loadAccessNumbers() {
  try {
    const raw = await fs.readFile(ACCESS_NUMBERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    accessNumbers = Array.isArray(parsed.accessNumbers) ? parsed.accessNumbers : [];
  } catch {
    accessNumbers = [];
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function resolveAdminPasswordHash() {
  // New DONER_* vars always win over legacy ADMIN_* vars.
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

function resolvePrinterCandidates() {
  const raw = String(
    process.env.DONER_RECEIPT_PRINTER
    || process.env.DONER_PRINTER_NAME
    || ""
  );

  const configured = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length) {
    return [...new Set(configured)];
  }

  // Fallback names for common Epson TM-m30III setups on macOS.
  return ["EPSON TM-m30III", "EPSON_TM_m30III"];
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

function isNumberActive(number, now = nowMs()) {
  return accessNumbers.some((entry) => entry.number === number && (entry.expiresAt ?? 0) > now);
}

function getGuestSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.guest_session;
  if (!token) return null;

  const session = guestSessions.get(token);
  if (!session) return null;

  const now = nowMs();
  if ((session.expiresAt ?? 0) <= now) {
    guestSessions.delete(token);
    return null;
  }
  if (!isNumberActive(session.number, now)) {
    guestSessions.delete(token);
    return null;
  }
  return session;
}

function isGuestAuthenticated(req) {
  return Boolean(getGuestSession(req));
}

function requireAdminApi(req, res, next) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

function requireGuestApi(req, res, next) {
  if (!isGuestAuthenticated(req)) {
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

function createGuestSession(number, expiresAt) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = nowMs();
  guestSessions.set(token, {
    number,
    createdAt,
    expiresAt
  });
  return token;
}

function setGuestSessionCookie(res, token, expiresAt) {
  const ttlSeconds = Math.max(1, Math.floor((expiresAt - nowMs()) / 1000));
  res.setHeader(
    "Set-Cookie",
    `guest_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${ttlSeconds}`
  );
}

function clearGuestSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "guest_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
  );
}

function invalidateGuestSessionsForNumber(number) {
  for (const [token, session] of guestSessions.entries()) {
    if (session.number === number) {
      guestSessions.delete(token);
    }
  }
}

function generateAccessNumber() {
  const activeNumbers = new Set(accessNumbers.map((entry) => entry.number));
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = String(crypto.randomInt(1000, 10000));
    if (!activeNumbers.has(candidate)) return candidate;
  }
  return null;
}

function normalizeMenuQrPath(rawPath) {
  const value = String(rawPath ?? "").trim();
  if (!value) return "/index.html";
  return value.startsWith("/") ? value : `/${value}`;
}

function escapeWifiQrValue(value) {
  return String(value ?? "").replace(/([\\;,":])/g, "\\$1");
}

function resolveStaticTopQrText() {
  const explicitQrText = String(
    process.env.DONER_TOP_QR_TEXT
    || process.env.DONER_WIFI_QR_TEXT
    || ""
  ).trim();
  if (explicitQrText) return explicitQrText;

  const ssid = String(process.env.DONER_WIFI_SSID || "").trim();
  if (!ssid) return "";

  const authRaw = String(process.env.DONER_WIFI_AUTH || "WPA").trim();
  const auth = authRaw.toUpperCase() === "WEP"
    ? "WEP"
    : authRaw.toLowerCase() === "nopass"
      ? "nopass"
      : "WPA";
  const password = String(process.env.DONER_WIFI_PASSWORD || "").trim();
  const hidden = String(process.env.DONER_WIFI_HIDDEN || "").trim() === "1";

  const parts = [
    `T:${auth}`,
    `S:${escapeWifiQrValue(ssid)}`
  ];
  if (auth !== "nopass") {
    parts.push(`P:${escapeWifiQrValue(password)}`);
  }
  if (hidden) {
    parts.push("H:true");
  }

  return `WIFI:${parts.join(";")};;`;
}

function resolveMenuQrHost() {
  const host = String(HOST || "").trim();
  if (host && host !== "0.0.0.0" && host !== "::" && host !== "[::]") {
    return host;
  }

  const lanAddresses = listLanIpv4Addresses();
  if (lanAddresses.length) {
    return lanAddresses[0];
  }

  return "localhost";
}

function toUrlHost(host) {
  const value = String(host ?? "").trim();
  if (!value) return "localhost";
  if (value.includes(":") && !value.startsWith("[")) {
    return `[${value}]`;
  }
  return value;
}

function buildMenuQrUrl() {
  const host = toUrlHost(resolveMenuQrHost());
  return `http://${host}:${PORT}${MENU_QR_PATH}`;
}

function clampNumber(rawValue, defaultValue, min, max) {
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, n));
}

function escPosTextSize(width = 1, height = 1) {
  const w = Math.max(1, Math.min(8, Number(width) || 1));
  const h = Math.max(1, Math.min(8, Number(height) || 1));
  const n = ((h - 1) << 4) | (w - 1);
  return Buffer.from([0x1d, 0x21, n]);
}

function escPosQrCode(text, moduleSize = 7, errorCorrection = 49) {
  const value = String(text ?? "").trim();
  if (!value) return Buffer.alloc(0);

  const size = Math.max(1, Math.min(16, Number(moduleSize) || 7));
  const ec = [48, 49, 50, 51].includes(errorCorrection) ? errorCorrection : 49;
  const data = Buffer.from(value, "utf-8");
  const storeLength = data.length + 3;
  const pL = storeLength & 0xff;
  const pH = (storeLength >> 8) & 0xff;

  return Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]), // model 2
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]), // module size
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ec]), // error correction
    Buffer.from([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]), // store data
    data,
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]), // print symbol
    Buffer.from("\n", "utf-8")
  ]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngToRgba(pngBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!pngBuffer.subarray(0, 8).equals(signature)) {
    throw new Error("Unsupported logo format: only PNG is supported.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatParts = [];

  while (offset + 8 <= pngBuffer.length) {
    const chunkLen = pngBuffer.readUInt32BE(offset);
    const chunkType = pngBuffer.toString("ascii", offset + 4, offset + 8);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLen;
    if (chunkEnd + 4 > pngBuffer.length) {
      throw new Error("Invalid PNG structure.");
    }

    const chunkData = pngBuffer.subarray(chunkStart, chunkEnd);

    if (chunkType === "IHDR") {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
      interlace = chunkData[12];
    } else if (chunkType === "IDAT") {
      idatParts.push(chunkData);
    } else if (chunkType === "IEND") {
      break;
    }

    offset = chunkEnd + 4;
  }

  if (!width || !height) {
    throw new Error("PNG width/height missing.");
  }
  if (interlace !== 0) {
    throw new Error("Interlaced PNG is not supported.");
  }
  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }

  const channelsByColorType = {
    0: 1, // grayscale
    2: 3, // rgb
    4: 2, // grayscale + alpha
    6: 4 // rgba
  };
  const channels = channelsByColorType[colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const rowLength = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatParts));
  const expected = (rowLength + 1) * height;
  if (inflated.length < expected) {
    throw new Error("PNG pixel payload is incomplete.");
  }

  const raw = Buffer.alloc(rowLength * height);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[src];
    src += 1;
    const rowOffset = y * rowLength;

    for (let x = 0; x < rowLength; x += 1) {
      const current = inflated[src + x];
      const left = x >= channels ? raw[rowOffset + x - channels] : 0;
      const up = y > 0 ? raw[rowOffset - rowLength + x] : 0;
      const upLeft = y > 0 && x >= channels ? raw[rowOffset - rowLength + x - channels] : 0;

      let out = current;
      if (filterType === 1) {
        out = (current + left) & 0xff;
      } else if (filterType === 2) {
        out = (current + up) & 0xff;
      } else if (filterType === 3) {
        out = (current + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        out = (current + paethPredictor(left, up, upLeft)) & 0xff;
      } else if (filterType !== 0) {
        throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }

      raw[rowOffset + x] = out;
    }
    src += rowLength;
  }

  const rgba = Buffer.alloc(width * height * 4);
  let srcPx = 0;
  let dstPx = 0;

  for (let i = 0; i < width * height; i += 1) {
    if (colorType === 0) {
      const v = raw[srcPx];
      rgba[dstPx] = v;
      rgba[dstPx + 1] = v;
      rgba[dstPx + 2] = v;
      rgba[dstPx + 3] = 255;
      srcPx += 1;
    } else if (colorType === 2) {
      rgba[dstPx] = raw[srcPx];
      rgba[dstPx + 1] = raw[srcPx + 1];
      rgba[dstPx + 2] = raw[srcPx + 2];
      rgba[dstPx + 3] = 255;
      srcPx += 3;
    } else if (colorType === 4) {
      const v = raw[srcPx];
      rgba[dstPx] = v;
      rgba[dstPx + 1] = v;
      rgba[dstPx + 2] = v;
      rgba[dstPx + 3] = raw[srcPx + 1];
      srcPx += 2;
    } else {
      rgba[dstPx] = raw[srcPx];
      rgba[dstPx + 1] = raw[srcPx + 1];
      rgba[dstPx + 2] = raw[srcPx + 2];
      rgba[dstPx + 3] = raw[srcPx + 3];
      srcPx += 4;
    }
    dstPx += 4;
  }

  return { width, height, rgba };
}

function resizeRgbaNearest(image, targetMaxWidth = 320) {
  const maxWidth = Math.max(8, Math.floor(targetMaxWidth));
  if (image.width <= maxWidth) {
    return image;
  }

  const scale = maxWidth / image.width;
  const width = maxWidth;
  const height = Math.max(1, Math.round(image.height * scale));
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const srcY = Math.min(image.height - 1, Math.floor((y * image.height) / height));
    for (let x = 0; x < width; x += 1) {
      const srcX = Math.min(image.width - 1, Math.floor((x * image.width) / width));
      const srcIdx = (srcY * image.width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      rgba[dstIdx] = image.rgba[srcIdx];
      rgba[dstIdx + 1] = image.rgba[srcIdx + 1];
      rgba[dstIdx + 2] = image.rgba[srcIdx + 2];
      rgba[dstIdx + 3] = image.rgba[srcIdx + 3];
    }
  }

  return { width, height, rgba };
}

function escPosRasterImageFromRgba(image, threshold = TICKET_LOGO_THRESHOLD) {
  const widthBytes = Math.ceil(image.width / 8);
  const raster = Buffer.alloc(widthBytes * image.height, 0x00);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const idx = (y * image.width + x) * 4;
      const r = image.rgba[idx];
      const g = image.rgba[idx + 1];
      const b = image.rgba[idx + 2];
      const a = image.rgba[idx + 3];
      if (a < 12) continue;

      if (TICKET_LOGO_MAX_CONTRAST) {
        // Force darkest print: everything except nearly-white/transparent becomes black.
        if (r > 248 && g > 248 && b > 248) continue;
      } else {
        const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
        const darkenedLuminance = luminance / TICKET_LOGO_DARKNESS;
        if (darkenedLuminance >= threshold) continue;
      }

      const byteIndex = (y * widthBytes) + (x >> 3);
      raster[byteIndex] |= 0x80 >> (x & 7);
    }
  }

  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = image.height & 0xff;
  const yH = (image.height >> 8) & 0xff;

  return Buffer.concat([
    Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    raster,
    Buffer.from("\n", "utf-8")
  ]);
}

async function loadTicketFooterLogoRaster() {
  if (triedLoadingFooterLogo) {
    return cachedFooterLogoRaster;
  }
  triedLoadingFooterLogo = true;

  for (const logoPath of TICKET_LOGO_PATHS) {
    try {
      const pngBuffer = await fs.readFile(logoPath);
      const rgba = decodePngToRgba(pngBuffer);
      const resized = resizeRgbaNearest(rgba, 320);
      cachedFooterLogoRaster = escPosRasterImageFromRgba(resized);
      footerLogoResolvedPath = logoPath;
      return cachedFooterLogoRaster;
    } catch {
      // Try next candidate path.
    }
  }

  console.warn("Logo for ticket footer could not be loaded. Checked:", TICKET_LOGO_PATHS.join(", "));
  cachedFooterLogoRaster = null;
  return null;
}

function buildAccessNumberTicketPayload(entry, options = {}) {
  const topQrText = String(options.topQrText ?? "").trim();
  const menuQrUrl = String(options.menuQrUrl ?? "").trim();
  const hasTopQr = Boolean(topQrText);
  const logoRaster = options.footerLogoRaster instanceof Buffer ? options.footerLogoRaster : null;
  const footerLines = Array.isArray(options.footerLines) ? options.footerLines : [];

  const chunks = [
    Buffer.from([0x1b, 0x40]), // ESC @ reset
    Buffer.from([0x1b, 0x61, 0x01]) // center align
  ];

  if (logoRaster) {
    chunks.push(logoRaster, Buffer.from("\n", "utf-8"));
  }

  chunks.push(
    Buffer.from([0x1b, 0x45, 0x01]), // bold on
    escPosTextSize(2, 2),
    Buffer.from("Ihre Bestellnummer:\n", "utf-8"),
    escPosTextSize(8, 8),
    Buffer.from(`${entry.number}\n`, "utf-8"),
    Buffer.from([0x1b, 0x45, 0x00]), // bold off
    escPosTextSize(1, 1),
    Buffer.from("\n", "utf-8"),
    Buffer.from([0x1b, 0x45, 0x01]),
    Buffer.from("1. Mit WLAN verbinden\n", "utf-8"),
    Buffer.from([0x1b, 0x45, 0x00])
  );

  if (hasTopQr) {
    chunks.push(escPosQrCode(topQrText, 7));
  } else {
    chunks.push(Buffer.from("WLAN-QR nicht konfiguriert.\n", "utf-8"));
  }

  chunks.push(
    Buffer.from("\n", "utf-8"),
    Buffer.from([0x1b, 0x45, 0x01]),
    Buffer.from("2. Speisekarte oeffnen\n", "utf-8"),
    Buffer.from([0x1b, 0x45, 0x00]),
    escPosQrCode(menuQrUrl, 7)
  );

  if (footerLines.length) {
    chunks.push(Buffer.from("\n", "utf-8"));
  }
  if (footerLines.length) {
    chunks.push(Buffer.from([0x1b, 0x45, 0x01]));
    chunks.push(Buffer.from(`${footerLines[0]}\n`, "utf-8"));
    chunks.push(Buffer.from([0x1b, 0x45, 0x00]));
    for (const line of footerLines.slice(1)) {
      chunks.push(Buffer.from(`${line}\n`, "utf-8"));
    }
  }

  chunks.push(
    Buffer.from("\n\n\n", "utf-8"),
    Buffer.from([0x1d, 0x56, 0x00]) // full cut
  );

  return Buffer.concat(chunks);
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
    DONER_WIN_PRINT_TITLE: title || "Doner Ticket"
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
      resolve(result);
    };

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

async function printAccessNumberTicket(entry) {
  if (!PRINT_ACCESS_NUMBER_ENABLED) {
    return {
      ok: false,
      skipped: true,
      reason: "Printing disabled via DONER_PRINT_ACCESS_NUMBER=0"
    };
  }

  const menuQrUrl = buildMenuQrUrl();
  const footerLogoRaster = await loadTicketFooterLogoRaster();
  const ticketPayload = buildAccessNumberTicketPayload(entry, {
    topQrText: STATIC_TOP_QR_TEXT,
    menuQrUrl,
    footerLogoRaster,
    footerLines: TICKET_FOOTER_LINES
  });
  const errors = [];

  for (const printer of PRINTER_CANDIDATES) {
    const result = await runPrintJob(ticketPayload, printer, `Nummer ${entry.number}`, { raw: true });
    if (result.ok) {
      return {
        ok: true,
        printer: printer,
        cut: true,
        menuQrUrl,
        topQrIncluded: Boolean(STATIC_TOP_QR_TEXT),
        footerLogoIncluded: Boolean(footerLogoRaster),
        footerLogoPath: footerLogoResolvedPath,
        output: result.output ?? ""
      };
    }
    errors.push({
      printer,
      error: result.error || "Unknown error"
    });
  }

  return {
    ok: false,
    attemptedPrinters: PRINTER_CANDIDATES,
    menuQrUrl,
    topQrIncluded: Boolean(STATIC_TOP_QR_TEXT),
    footerLogoIncluded: Boolean(footerLogoRaster),
    footerLogoPath: footerLogoResolvedPath,
    error: errors.map((item) => `${item.printer}: ${item.error}`).join(" | ")
  };
}

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

function cleanupExpiredAccessNumbers() {
  const now = nowMs();
  const before = accessNumbers.length;
  const active = [];
  const removedNumbers = [];

  for (const entry of accessNumbers) {
    if ((entry.expiresAt ?? 0) > now) {
      active.push(entry);
    } else {
      removedNumbers.push(entry.number);
    }
  }

  accessNumbers = active;
  if (before !== accessNumbers.length) {
    for (const number of removedNumbers) {
      invalidateGuestSessionsForNumber(number);
    }
    queueWriteAccessNumbers();
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

function cleanupExpiredGuestSessions() {
  const now = nowMs();
  for (const [token, session] of guestSessions.entries()) {
    if ((session.expiresAt ?? 0) <= now || !isNumberActive(session.number, now)) {
      guestSessions.delete(token);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(() => {
  cleanupExpiredOrders();
  cleanupExpiredAccessNumbers();
  cleanupExpiredAdminSessions();
  cleanupExpiredGuestSessions();
}, 30_000);

// --- API ---
app.get("/api/products", requireGuestApi, async (req, res) => {
  try {
    if (!productsCache) await loadProducts();
    res.json(productsCache);
  } catch (e) {
    res.status(500).json({ error: "Cannot read products.json" });
  }
});

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

async function createAndPrintAccessNumber(createdBy) {
  cleanupExpiredAccessNumbers();
  cleanupExpiredGuestSessions();

  const number = generateAccessNumber();
  if (!number) {
    return { ok: false, status: 503, error: "No free access numbers available" };
  }

  const createdAt = nowMs();
  const entry = {
    id: nanoid(10),
    number,
    createdAt,
    expiresAt: createdAt + ACCESS_NUMBER_TTL_MS,
    createdBy: createdBy || ADMIN_USER
  };

  accessNumbers.push(entry);
  await queueWriteAccessNumbers();

  const print = await printAccessNumberTicket(entry);
  if (!print.ok && !print.skipped) {
    console.error(`Failed to print access number ${entry.number}: ${print.error}`);
  }

  return { ok: true, entry, print };
}

app.post("/api/admin/access-numbers", requireAdminApi, async (req, res) => {
  const session = getAdminSession(req);
  const result = await createAndPrintAccessNumber(session?.username ?? ADMIN_USER);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error || "Cannot create access number" });
  }
  return res.json({ ok: true, accessNumber: result.entry, print: result.print });
});

app.get("/api/admin/access-numbers", requireAdminApi, (req, res) => {
  cleanupExpiredAccessNumbers();
  cleanupExpiredGuestSessions();
  const sorted = [...accessNumbers].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return res.json({ accessNumbers: sorted });
});

app.delete("/api/admin/access-numbers/:number", requireAdminApi, async (req, res) => {
  cleanupExpiredAccessNumbers();
  const { number } = req.params;
  const before = accessNumbers.length;
  accessNumbers = accessNumbers.filter((entry) => entry.number !== number);
  if (before === accessNumbers.length) {
    return res.status(404).json({ error: "Access number not found" });
  }

  invalidateGuestSessionsForNumber(number);
  await queueWriteAccessNumbers();
  return res.json({ ok: true });
});

app.post("/api/kiosk/access-numbers", async (req, res) => {
  const result = await createAndPrintAccessNumber("KIOSK");
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error || "Cannot create access number" });
  }
  return res.json({ ok: true, accessNumber: result.entry, print: result.print });
});

app.post("/api/guest/verify-number", (req, res) => {
  cleanupExpiredAccessNumbers();
  cleanupExpiredGuestSessions();

  const body = req.body ?? {};
  const number = String(body.number ?? "").replace(/\s+/g, "");
  if (!number) {
    return res.status(400).json({ error: "number is required" });
  }

  const entry = accessNumbers.find((item) => item.number === number);
  if (!entry || (entry.expiresAt ?? 0) <= nowMs()) {
    return res.status(401).json({ error: "Invalid or expired number" });
  }

  const token = createGuestSession(entry.number, entry.expiresAt);
  setGuestSessionCookie(res, token, entry.expiresAt);
  return res.json({
    ok: true,
    guest: {
      number: entry.number,
      expiresAt: entry.expiresAt
    }
  });
});

app.get("/api/guest/me", requireGuestApi, (req, res) => {
  const session = getGuestSession(req);
  return res.json({
    ok: true,
    guest: {
      number: session?.number ?? "",
      expiresAt: session?.expiresAt ?? 0
    }
  });
});

app.post("/api/guest/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.guest_session;
  if (token) {
    guestSessions.delete(token);
  }
  clearGuestSessionCookie(res);
  return res.json({ ok: true });
});

// Admin: list orders (pending + completed within retention)
app.get("/api/orders", requireAdminApi, (req, res) => {
  cleanupExpiredOrders();
  const sorted = [...orders].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  res.json({ orders: sorted });
});

// Public screen: completed orders (only recent numbers, no item details)
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
      accessNumber: order.accessNumber ?? "",
      completedAt: order.completedAt ?? order.createdAt ?? 0
    }));

  res.json({ orders: completed });
});

app.post("/api/orders", requireGuestApi, async (req, res) => {
  cleanupExpiredOrders();
  const body = req.body ?? {};
  const tableNumber = String(body.tableNumber ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  const guest = getGuestSession(req);
  const accessNumber = String(guest?.number ?? "").trim();

  if (!tableNumber) return res.status(400).json({ error: "tableNumber is required" });
  if (!accessNumber) return res.status(401).json({ error: "Unauthorized" });
  if (items.length === 0) return res.status(400).json({ error: "items is required" });

  const createdAt = nowMs();
  const order = {
    id: nanoid(10),
    tableNumber,
    accessNumber,
    items,
    status: "PENDING",
    createdAt,
    completedAt: null,
    expiresAt: createdAt + ORDER_TTL_MS
  };

  orders.push(order);
  await queueWriteOrders();

  res.json({ ok: true, order });
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

// Explicit page routes
app.get(["/", "/access", "/access.html"], (req, res) => {
  if (isGuestAuthenticated(req)) {
    return res.redirect("/index.html");
  }
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "access.html"));
});
app.get(["/index", "/index.html"], (req, res) => {
  if (!isGuestAuthenticated(req)) {
    return res.redirect("/access.html");
  }
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
app.get(["/numbers", "/numbers/", "/numbers.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "numbers.html"));
});
app.get(["/completed", "/completed/", "/completed.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(path.join(PUBLIC_DIR, "completed.html"));
});

// Static assets (css/js/img)
app.use(express.static(PUBLIC_DIR, { maxAge: 0 }));

await loadProducts();
await loadOrders();
await loadAccessNumbers();
cleanupExpiredOrders();
cleanupExpiredAccessNumbers();
cleanupExpiredGuestSessions();

app.listen(PORT, HOST, () => {
  if (USING_DEFAULT_ADMIN_PASSWORD) {
    console.warn("⚠️ Default-Admin aktiv: Benutzer admin, Passwort admin123. Bitte ENV setzen.");
  }
  const lanAddresses = listLanIpv4Addresses();
  const bindUrl = `http://${HOST}:${PORT}`;

  console.log(`✅ Server läuft (Bind): ${bindUrl}`);
  console.log(`🏠 Lokal:            http://localhost:${PORT}`);
  for (const address of lanAddresses) {
    console.log(`🌐 WLAN:             http://${address}:${PORT}`);
  }
  console.log(`🔢 Nummernzugang:    /access.html`);
  console.log(`🧾 Speisekarte:      /index.html`);
  console.log(`🔐 Admin Login:      /admin-login.html`);
  console.log(`🛠️ Admin Panel:      /admin`);
  console.log(`🎫 Nummern-Panel:    /numbers`);
  if (PRINT_ACCESS_NUMBER_ENABLED) {
    console.log(`🖨️ Bon-Druck:     aktiv (${PRINTER_CANDIDATES.join(", ")})`);
  } else {
    console.log("🖨️ Bon-Druck:     deaktiviert (DONER_PRINT_ACCESS_NUMBER=0)");
  }
});
