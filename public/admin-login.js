const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const errorBox = document.getElementById("errorBox");

function setError(message){
  errorBox.textContent = message || "";
}

function toGermanError(message, fallback = "Anmeldung fehlgeschlagen.") {
  const text = String(message || "").trim();
  if (!text) return fallback;

  const known = {
    "username and password are required": "Bitte Benutzername und Passwort eingeben.",
    "Invalid credentials": "Benutzername oder Passwort ist falsch.",
    Unauthorized: "Nicht angemeldet."
  };

  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return "Verbindungsfehler. Bitte erneut versuchen.";
  return text;
}

async function checkExistingSession(){
  const res = await fetch("/api/admin/me", { credentials: "same-origin" });
  if(res.ok){
    window.location.replace("/admin");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){
    setError("Bitte Benutzername und Passwort eingeben.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Prüfe...";

  try{
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password })
    });

    if(!res.ok){
      const payload = await res.json().catch(() => ({}));
      throw new Error(toGermanError(payload?.error, "Anmeldung fehlgeschlagen."));
    }

    window.location.replace("/admin");
  }catch(e){
    setError(toGermanError(e.message));
  }finally{
    loginBtn.disabled = false;
    loginBtn.textContent = "Einloggen";
  }
});

checkExistingSession();
