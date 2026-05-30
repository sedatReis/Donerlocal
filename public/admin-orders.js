function euro(n) {
  return Number(n).toFixed(2).replace(".", ",") + " \u20ac";
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("de-DE");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

async function loadOrders() {
  const res = await fetch("/api/admin/order-log");
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new Error(p?.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.orders || [];
}

function summarizeItems(items) {
  return items.map(i => {
    let s = `${i.qty}x ${escapeHtml(i.name)}`;
    if (i.selectedSize) s += ` (${escapeHtml(i.selectedSize)})`;
    if (i.options?.length) s += ` – ${i.options.map(o => escapeHtml(o)).join(", ")}`;
    if (i.extras?.length) {
      const names = i.extras.map(e => typeof e === "string" ? e : e.name);
      s += ` + ${names.map(n => escapeHtml(n)).join(", ")}`;
    }
    return s;
  }).join("<br>");
}

function renderOrders(orders) {
  const list = document.getElementById("orderList");
  if (!orders.length) {
    list.innerHTML = '<p class="ao-empty">Keine Bestellungen vorhanden.</p>';
    return;
  }
  list.innerHTML = orders.map(o => {
    const num = o.randomNum ? `#${o.randomNum}` : "";
    const dineLabels = { hieressen: "Hier essen", mitnehmen: "Mitnehmen", imauto: "Im Auto" };
    const dine = dineLabels[o.dineOption] || o.dineOption || "";
    const pay = o.paymentMethod === "karte" ? "Karte" : "Bar";
    let meta = [dine, pay].filter(Boolean).join(" · ");
    if (o.dineOption === "imauto" && (o.carBrand || o.carColor)) {
      meta += ` (${escapeHtml([o.carBrand, o.carColor].filter(Boolean).join(" "))})`;
    }
    return `
      <div class="ao-card">
        <div class="ao-card__header">
          <span class="ao-card__name">${escapeHtml(o.customerName)}</span>
          ${num ? `<span class="ao-card__num">${num}</span>` : ""}
          <span class="ao-card__time">${fmtDateTime(o.timestamp)}</span>
        </div>
        <div class="ao-card__meta">${meta}</div>
        <div class="ao-card__items">${summarizeItems(o.items)}</div>
        <div class="ao-card__footer">
          <span class="ao-card__total">${euro(o.total)}</span>
          <div class="ao-card__actions">
            <button class="ap-btn ap-btn--print" onclick="reprint('${o.id}','customer',this)">Kundenbon</button>
            <button class="ap-btn ap-btn--print" onclick="reprint('${o.id}','kitchen',this)">Kuechenbon</button>
            <button class="ap-btn ap-btn--both" onclick="reprint('${o.id}','both',this)">Beide drucken</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

async function reprint(id, type, btn) {
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Druckt...";
  try {
    const res = await fetch(`/api/admin/reprint/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
    if (!res.ok) {
      const p = await res.json().catch(() => ({}));
      throw new Error(p?.error || `HTTP ${res.status}`);
    }
    btn.textContent = "Gedruckt!";
    toast("Bon wurde gedruckt");
    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000);
  } catch (e) {
    toast("Druckfehler: " + e.message);
    btn.textContent = origText;
    btn.disabled = false;
  }
}

async function init() {
  try {
    const orders = await loadOrders();
    renderOrders(orders);
  } catch (e) {
    document.getElementById("orderList").innerHTML =
      `<p class="ao-empty">Fehler: ${escapeHtml(e.message)}</p>`;
  }
}

document.getElementById("refreshBtn").addEventListener("click", init);
init();
