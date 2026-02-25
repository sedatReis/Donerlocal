function fmtDateTime(ms) {
  return new Date(ms).toLocaleString("de-DE");
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
    "No free access numbers available": "Aktuell sind keine freien Nummern verfügbar.",
    "Access number not found": "Nummer wurde nicht gefunden."
  };

  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return "Verbindungsfehler. Bitte erneut versuchen.";
  return text;
}

async function ensureOk(res) {
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(toGermanError(payload?.error || `HTTP ${res.status}`));
  }
  return res;
}

function renderLastCreated(entry) {
  if (!entry) return;
  const box = document.getElementById("lastCreatedBox");
  box.classList.remove("hidden");
  document.getElementById("lastCreatedNumber").textContent = entry.number || "----";
  document.getElementById("lastCreatedMeta").textContent =
    `Erstellt: ${fmtDateTime(entry.createdAt)} · gültig bis ${fmtDateTime(entry.expiresAt)}`;
}

async function createNumber() {
  const button = document.getElementById("createNumberBtn");
  setCreateError("");
  setCreateInfo("");

  button.disabled = true;
  button.textContent = "ERSTELLE...";

  try {
    const res = await fetch("/api/kiosk/access-numbers", {
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
      setCreateInfo(`Nummer ${entry?.number ?? ""} erstellt und gedruckt${cutText}.`);
    } else if (print.skipped) {
      setCreateInfo(`Nummer ${entry?.number ?? ""} erstellt. Druck übersprungen.`);
    } else {
      setCreateError(
        `Nummer ${entry?.number ?? ""} erstellt, Druck fehlgeschlagen: ${toGermanError(print.error, "Unbekannter Fehler")}`
      );
    }
  } catch (error) {
    setCreateError(toGermanError(error?.message));
    setCreateInfo("");
  } finally {
    button.disabled = false;
    button.textContent = "NUMMER ZIEHEN";
  }
}

function wire() {
  document.getElementById("createNumberBtn").addEventListener("click", createNumber);
}

wire();
