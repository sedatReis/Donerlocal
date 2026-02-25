const NEW_ORDER_WINDOW_MS = 2 * 60 * 1000;
const URGENT_ORDER_WINDOW_MS = 5 * 60 * 1000;
let knownPendingOrderIds = new Set();
let pendingSnapshotInitialized = false;
let adminAudioCtx = null;

function fmtDateTime(ms) {
  return new Date(ms).toLocaleString("de-DE");
}

function euro(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function toGermanError(message, fallback = "Ein Fehler ist aufgetreten.") {
  const text = String(message || "").trim();
  if (!text) return fallback;

  const known = {
    Unauthorized: "Nicht angemeldet.",
    "Order not found": "Bestellung wurde nicht gefunden.",
    "No free access numbers available": "Aktuell sind keine freien Nummern verfügbar.",
    "Access number not found": "Nummer wurde nicht gefunden."
  };

  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
  return text;
}

function redirectToLogin() {
  window.location.replace("/admin-login.html");
}

async function ensureOk(res) {
  if (res.status === 401) {
    redirectToLogin();
    throw new Error("Nicht angemeldet.");
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(toGermanError(payload?.error || `HTTP ${res.status}`));
  }
  return res;
}

async function fetchOrders() {
  const res = await fetch("/api/orders", { credentials: "same-origin" });
  await ensureOk(res);
  const data = await res.json();
  return data.orders || [];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function getOrderTiming(order) {
  const now = Date.now();
  const totalMs = Math.max(1, (order.expiresAt ?? now) - (order.createdAt ?? now));
  const remainingMs = Math.max(0, (order.expiresAt ?? now) - now);
  const remainingMin = Math.max(0, Math.ceil(remainingMs / 60_000));
  const progressPercent = Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100)));
  return {
    remainingMs,
    remainingMin,
    progressPercent,
    isUrgent: remainingMs <= URGENT_ORDER_WINDOW_MS,
    isNew: now - (order.createdAt ?? now) <= NEW_ORDER_WINDOW_MS
  };
}

function composeItemDetailsHtml(item) {
  const rows = [];

  if (item.meatType) {
    rows.push(`
      <div class="orderDetailRow">
        <span class="orderDetailLabel">Fleisch</span>
        <span class="orderDetailValue">${escapeHtml(item.meatType)}</span>
      </div>
    `);
  }

  const extras = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
  if (extras.length) {
    const chips = extras
      .map((extra) => `<span class="orderOptionChip">${escapeHtml(extra)}</span>`)
      .join("");
    rows.push(`
      <div class="orderDetailRow">
        <span class="orderDetailLabel">Extras</span>
        <div class="orderOptionChips">${chips}</div>
      </div>
    `);
  }

  if (rows.length === 0) {
    return `<div class="orderDetailMuted">Keine Zusatzangaben</div>`;
  }

  return `<div class="orderMetaStack">${rows.join("")}</div>`;
}

function renderOrders(orders) {
  const pending = orders
    .filter((order) => order.status === "PENDING")
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const done = orders
    .filter((order) => order.status === "DONE")
    .sort((a, b) => (b.completedAt ?? b.createdAt ?? 0) - (a.completedAt ?? a.createdAt ?? 0));

  document.getElementById("pendingCount").textContent = String(pending.length);
  document.getElementById("doneCount").textContent = String(done.length);

  const pendingList = document.getElementById("pendingList");
  const doneList = document.getElementById("doneList");
  pendingList.innerHTML = "";
  doneList.innerHTML = "";

  if (pending.length === 0) {
    pendingList.innerHTML = `<div class="muted">Keine offenen Bestellungen.</div>`;
  }
  if (done.length === 0) {
    doneList.innerHTML = `<div class="muted">Keine erledigten Bestellungen.</div>`;
  }

  for (const order of pending) {
    pendingList.appendChild(orderCard(order, true));
  }
  for (const order of done) {
    doneList.appendChild(orderCard(order, false));
  }
}

function ensureAdminAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!adminAudioCtx) {
    adminAudioCtx = new AudioCtx();
  }
  return adminAudioCtx;
}

async function unlockAdminAudio() {
  const ctx = ensureAdminAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore browser autoplay restrictions until next interaction
    }
  }
}

function playNewOrderSound(repetitions = 1) {
  const ctx = ensureAdminAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const repeatCount = Math.max(1, Math.min(3, repetitions));

  for (let i = 0; i < repeatCount; i += 1) {
    const baseStart = i * 0.52;
    const tones = [
      { freq: 880, start: baseStart + 0.00, dur: 0.13, type: "square", gainPeak: 0.2 },
      { freq: 1320, start: baseStart + 0.16, dur: 0.14, type: "square", gainPeak: 0.22 },
      { freq: 1760, start: baseStart + 0.34, dur: 0.12, type: "triangle", gainPeak: 0.18 }
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tone.type;
      osc.frequency.value = tone.freq;

      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(tone.gainPeak, now + tone.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.04);
    }
  }
}

function notifyOnNewPendingOrders(orders) {
  const pendingIds = new Set(
    orders
      .filter((order) => order.status === "PENDING")
      .map((order) => String(order.id))
  );

  if (!pendingSnapshotInitialized) {
    knownPendingOrderIds = pendingIds;
    pendingSnapshotInitialized = true;
    return;
  }

  let newPendingCount = 0;
  for (const id of pendingIds) {
    if (!knownPendingOrderIds.has(id)) {
      newPendingCount += 1;
    }
  }

  knownPendingOrderIds = pendingIds;
  if (newPendingCount > 0) {
    playNewOrderSound(newPendingCount);
  }
}

function orderCard(order, canComplete) {
  const wrap = document.createElement("div");
  const timing = getOrderTiming(order);
  const total = (order.items || []).reduce((sum, item) => sum + (item.price * item.qty), 0);
  const positionCount = (order.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);

  const classes = ["orderCard"];
  if (canComplete) classes.push("orderCard--pending");
  else classes.push("orderCard--done");
  if (canComplete && timing.isUrgent) classes.push("orderCard--urgent");
  if (canComplete && timing.isNew) classes.push("orderCard--new");
  wrap.className = classes.join(" ");

  const statusLabel = canComplete ? "Offen" : "Erledigt";
  const accessLabel = order.accessNumber ? `Zugang ${escapeHtml(order.accessNumber)}` : "Zugang -";
  const newBadge = canComplete && timing.isNew ? `<span class="orderChip orderChip--new">Neu</span>` : "";
  const urgencyClass = timing.isUrgent && canComplete ? "orderChip--warn" : "";

  wrap.innerHTML = `
    <div class="orderHeader">
      <div>
        <div class="orderTitle">Tisch ${escapeHtml(order.tableNumber)}</div>
        <div class="orderMeta">Erstellt: ${fmtDateTime(order.createdAt)}</div>
      </div>
      <div class="orderHeadRight">
        <span class="pill ${canComplete ? "pill--pending" : "pill--done"}">${statusLabel}</span>
        <strong class="orderTotal">${euro(total)}</strong>
      </div>
    </div>

    <div class="orderMetaRow">
      <span class="orderChip">${accessLabel}</span>
      <span class="orderChip">Positionen ${positionCount}</span>
      <span class="orderChip ${urgencyClass}">Rest ${timing.remainingMin} min</span>
      ${newBadge}
    </div>

    <div class="timeBar">
      <span style="width:${timing.progressPercent}%"></span>
    </div>

    <div class="orderItems"></div>

    <div class="row row--wrap" style="margin-top:12px">
      ${canComplete ? `<button class="btn btn--primary" data-act="done">Als erledigt markieren</button>` : ``}
      <button class="btn" data-act="delete" style="border-color:rgba(255,90,95,.35)">Bestellung löschen</button>
    </div>
  `;

  const list = wrap.querySelector(".orderItems");
  for (const item of (order.items || [])) {
    const line = document.createElement("div");
    line.className = "orderItemLine";
    line.innerHTML = `
      <div class="orderItemMain">
        <div class="orderItemName">${item.qty}x <strong>${escapeHtml(item.name)}</strong></div>
        <div class="orderItemMeta">${composeItemDetailsHtml(item)}</div>
      </div>
      <div class="orderItemPrice">${euro(item.price * item.qty)}</div>
    `;
    list.appendChild(line);
  }

  if (canComplete) {
    wrap.querySelector('[data-act="done"]').addEventListener("click", async () => {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/complete`, {
        method: "POST",
        credentials: "same-origin"
      });
      await ensureOk(res);
      await refresh();
    });
  }

  wrap.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    if (!confirm("Bestellung wirklich löschen?")) return;
    const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    await ensureOk(res);
    await refresh();
  });

  return wrap;
}

async function refresh() {
  try {
    const orders = await fetchOrders();
    notifyOnNewPendingOrders(orders);
    renderOrders(orders);
  } catch (error) {
    if (error.message !== "Nicht angemeldet.") {
      alert("Fehler beim Laden: " + toGermanError(error.message));
    }
  }
}

function wire() {
  document.addEventListener("pointerdown", unlockAdminAudio, { passive: true });
  document.addEventListener("keydown", unlockAdminAudio);
  document.getElementById("refreshBtn").addEventListener("click", refresh);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin"
      });
      redirectToLogin();
    });
  }

  const customerViewLink = document.getElementById("customerViewLink");
  if (customerViewLink) {
    customerViewLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign("/access.html");
    });
  }

  setInterval(refresh, 5000);
}

wire();
refresh();
