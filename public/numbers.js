function fmtDateTime(ms) {
  const d = new Date(ms);
  return d.toLocaleString("de-DE");
}

function redirectToLogin() {
  window.location.replace("/admin-login.html");
}

function setCreateError(message) {
  document.getElementById("createError").textContent = message || "";
}

function setCreateInfo(message) {
  document.getElementById("createInfo").textContent = message || "";
}

function toGermanError(message, fallback = "Ein Fehler ist aufgetreten.") {
  const text = String(message || "").trim();
  if (!text) return fallback;

  const known = {
    Unauthorized: "Nicht angemeldet.",
    "No free access numbers available": "Aktuell sind keine freien Nummern verfügbar.",
    "Access number not found": "Nummer wurde nicht gefunden."
  };

  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return "Verbindungsfehler. Bitte erneut versuchen.";
  return text;
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

function escapeHtml(input) {
  return String(input).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function minsLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000));
}

async function fetchNumbers() {
  const res = await fetch("/api/admin/access-numbers", { credentials: "same-origin" });
  await ensureOk(res);
  const payload = await res.json();
  return payload?.accessNumbers || [];
}

function renderLastCreated(entry) {
  if (!entry) return;
  const box = document.getElementById("lastCreatedBox");
  box.classList.remove("hidden");
  document.getElementById("lastCreatedNumber").textContent = entry.number;
  document.getElementById("lastCreatedMeta").textContent = `Erstellt: ${fmtDateTime(entry.createdAt)} · gültig bis ${fmtDateTime(entry.expiresAt)}`;
}

async function revokeNumber(number) {
  const res = await fetch(`/api/admin/access-numbers/${encodeURIComponent(number)}`, {
    method: "DELETE",
    credentials: "same-origin"
  });
  await ensureOk(res);
}

function numberCard(entry) {
  const wrap = document.createElement("div");
  wrap.className = "numberCard";
  wrap.innerHTML = `
    <div class="numberCard__row">
      <div>
        <div class="numberCard__value">${escapeHtml(entry.number)}</div>
        <div class="numberCard__meta">
          Erstellt: ${fmtDateTime(entry.createdAt)} · Läuft ab in ~${minsLeft(entry.expiresAt)} min
        </div>
      </div>
      <div class="row row--wrap">
        <button class="btn" data-act="copy">Kopieren</button>
        <button class="btn" data-act="revoke" style="border-color:rgba(255,90,95,.35)">Sperren</button>
      </div>
    </div>
  `;

  wrap.querySelector('[data-act="copy"]').addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(entry.number);
      setCreateInfo(`Nummer ${entry.number} kopiert.`);
      setCreateError("");
    } catch {
      prompt("Nummer manuell kopieren:", entry.number);
    }
  });

  wrap.querySelector('[data-act="revoke"]').addEventListener("click", async () => {
    if (!confirm(`Nummer ${entry.number} wirklich sperren?`)) return;
    try {
      await revokeNumber(entry.number);
      await refresh();
    } catch (error) {
      if (error.message !== "Nicht angemeldet.") {
        setCreateError(toGermanError(error.message));
      }
    }
  });

  return wrap;
}

function renderNumbers(entries) {
  const list = document.getElementById("accessNumbersList");
  document.getElementById("activeCount").textContent = String(entries.length);
  list.innerHTML = "";

  if (entries.length === 0) {
    list.innerHTML = `<div class="muted">Keine aktiven Nummern.</div>`;
    return;
  }

  for (const entry of entries) {
    list.appendChild(numberCard(entry));
  }
}

async function createNumber() {
  setCreateError("");
  setCreateInfo("");
  const button = document.getElementById("createNumberBtn");
  button.disabled = true;
  button.textContent = "Erstelle...";

  try {
    const res = await fetch("/api/admin/access-numbers", {
      method: "POST",
      credentials: "same-origin"
    });
    await ensureOk(res);
    const payload = await res.json();
    const entry = payload?.accessNumber;
    renderLastCreated(entry);

    const print = payload?.print ?? {};
    if (print.ok) {
      const cutText = print.cut ? " mit Cut" : "";
      setCreateInfo(`Nummer ${entry?.number ?? ""} erstellt und gedruckt${cutText} (${print.printer}).`);
    } else if (print.skipped) {
      setCreateInfo(`Nummer ${entry?.number ?? ""} erstellt. Druck übersprungen.`);
    } else {
      setCreateError(`Nummer ${entry?.number ?? ""} erstellt, Druck fehlgeschlagen: ${toGermanError(print.error, "Unbekannter Fehler")}`);
    }
    await refresh();
  } catch (error) {
    if (error.message !== "Nicht angemeldet.") {
      setCreateError(toGermanError(error.message));
      setCreateInfo("");
    }
  } finally {
    button.disabled = false;
    button.textContent = "Nummer freigeben";
  }
}

async function refresh() {
  try {
    const entries = await fetchNumbers();
    renderNumbers(entries);
  } catch (error) {
    if (error.message !== "Nicht angemeldet.") {
      setCreateError(`Fehler beim Laden: ${toGermanError(error.message)}`);
      setCreateInfo("");
    }
  }
}

function wire() {
  document.getElementById("createNumberBtn").addEventListener("click", createNumber);
  document.getElementById("refreshBtn").addEventListener("click", refresh);

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin"
    });
    redirectToLogin();
  });

  setInterval(refresh, 5000);
}

wire();
refresh();
