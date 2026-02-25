const form = document.getElementById("verifyForm");
const numberInput = document.getElementById("numberInput");
const verifyBtn = document.getElementById("verifyBtn");
const errorBox = document.getElementById("errorBox");

function setError(message) {
  errorBox.textContent = message || "";
}

function toGermanError(message, fallback = "Ein Fehler ist aufgetreten.") {
  const text = String(message || "").trim();
  if (!text) return fallback;

  const known = {
    Unauthorized: "Deine Sitzung ist abgelaufen. Bitte erneut anmelden.",
    "number is required": "Bitte eine Nummer eingeben.",
    "Invalid or expired number": "Die Nummer ist ungültig oder abgelaufen."
  };

  return known[text] || text;
}

async function checkExistingGuestSession() {
  const res = await fetch("/api/guest/me", { credentials: "same-origin" });
  if (res.ok) {
    window.location.replace("/index.html");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const number = numberInput.value.replace(/\D+/g, "");
  if (!number) {
    setError("Bitte eine gültige Nummer eingeben.");
    return;
  }
  numberInput.value = number;

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Prüfe...";

  try {
    const res = await fetch("/api/guest/verify-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ number })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(toGermanError(payload?.error, "Nummer ist ungültig oder abgelaufen."));
    }

    window.location.replace("/index.html");
  } catch (error) {
    setError(toGermanError(error.message));
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Mit Nummer zur Speisekarte";
  }
});

checkExistingGuestSession();
