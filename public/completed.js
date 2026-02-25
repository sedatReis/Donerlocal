function toGermanError(message, fallback = "Ein Fehler ist aufgetreten.") {
  const text = String(message || "").trim();
  if (!text) return fallback;
  if (text.startsWith("HTTP ")) return "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
  return text;
}

async function ensureOk(res) {
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(toGermanError(payload?.error || `HTTP ${res.status}`));
  }
  return res;
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

async function fetchOrders() {
  const res = await fetch("/api/orders/completed-screen");
  await ensureOk(res);
  const data = await res.json();
  return data.orders || [];
}

function renderOrders(orders) {
  const done = [...orders].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const list = document.getElementById("doneList");
  const count = document.getElementById("doneCount");
  count.textContent = String(done.length);
  list.innerHTML = "";

  if (done.length === 0) {
    list.innerHTML = `<div class="muted">Keine erledigten Bestellungen in den letzten 5 Minuten.</div>`;
    return;
  }

  for (const order of done) {
    list.appendChild(orderCard(order));
  }
}

function orderCard(order) {
  const wrap = document.createElement("div");
  wrap.className = "completedCard";
  const number = String(order.accessNumber || "").trim() || "-";

  wrap.innerHTML = `
    <div class="completedCard__top" style="justify-content:center">
      <div class="completedCard__title" style="font-size:52px; line-height:1; letter-spacing:1px;">${escapeHtml(number)}</div>
    </div>
  `;
  return wrap;
}

async function refresh() {
  try {
    const orders = await fetchOrders();
    renderOrders(orders);
  } catch (error) {
    console.error(error);
    const list = document.getElementById("doneList");
    list.innerHTML = `<div class="err">Fehler beim Laden: ${escapeHtml(toGermanError(error.message))}</div>`;
  }
}

function wire() {
  document.getElementById("refreshBtn").addEventListener("click", refresh);
  setInterval(refresh, 3000);
}

wire();
refresh();
