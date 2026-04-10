const TRANSLATIONS = {
  de: {
    nameQuestion: "Wie ist dein Name?",
    namePlaceholder: "z.B. Sark",
    nameHint: "Dein Name wird auf dem Bestellbon gedruckt.",
    nameSubmit: "Weiter zur Speisekarte",
    nameEmpty: "Bitte gib deinen Namen ein.",
    nameShort: "Der Name muss mindestens 2 Zeichen lang sein.",
    dineQuestion: "Wo möchtest du essen?",
    dineHere: "Hier essen",
    dineTakeaway: "Mitnehmen"
  },
  en: {
    nameQuestion: "What is your name?",
    namePlaceholder: "e.g. Sark",
    nameHint: "Your name will be printed on the receipt.",
    nameSubmit: "Continue to menu",
    nameEmpty: "Please enter your name.",
    nameShort: "Name must be at least 2 characters.",
    dineQuestion: "Where would you like to eat?",
    dineHere: "Dine in",
    dineTakeaway: "Takeaway"
  },
  tr: {
    nameQuestion: "Adınız nedir?",
    namePlaceholder: "örn. Sark",
    nameHint: "Adınız sipariş fişine yazdırılacaktır.",
    nameSubmit: "Menüye devam et",
    nameEmpty: "Lütfen adınızı girin.",
    nameShort: "Ad en az 2 karakter olmalıdır.",
    dineQuestion: "Nerede yemek istersiniz?",
    dineHere: "Burada yemek",
    dineTakeaway: "Paket"
  }
};

const LANG_FLAGS = {
  de: `<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#ed2939"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.67" width="24" height="5.33" fill="#ed2939"/></svg>`,
  en: `<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="2.5"/><path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.5"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="4"/><path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="2.5"/></svg>`,
  tr: `<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" fill="#E30A17"/><circle cx="10" cy="8" r="4.5" fill="#fff"/><circle cx="11.2" cy="8" r="3.6" fill="#E30A17"/><polygon points="14,8 14.8,6.5 13.2,7.4 15,7.4 13.4,6.5" fill="#fff"/></svg>`
};

const LANG_LABELS = { de: "DE", en: "EN", tr: "TR" };

function getLang() {
  return localStorage.getItem("lang") || "de";
}

function t(key) {
  const lang = getLang();
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.de[key] || key;
}

function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang === "tr" ? "tr" : lang === "en" ? "en" : "de";

  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }

  // Update dropdown toggle display
  const flagEl = document.getElementById("langCurrentFlag");
  const labelEl = document.getElementById("langCurrentLabel");
  if (flagEl) flagEl.innerHTML = LANG_FLAGS[lang] || LANG_FLAGS.de;
  if (labelEl) labelEl.textContent = LANG_LABELS[lang] || "DE";
}

// --- Dropdown language selector ---
const langDropdown = document.getElementById("langDropdown");
const langToggle = document.getElementById("langToggle");
const langList = document.getElementById("langList");

if (langToggle) {
  langToggle.addEventListener("click", () => {
    const isOpen = !langList.classList.contains("hidden");
    langList.classList.toggle("hidden", isOpen);
    langDropdown.classList.toggle("is-open", !isOpen);
  });
}

for (const btn of document.querySelectorAll(".langDropdown__item")) {
  btn.addEventListener("click", () => {
    localStorage.setItem("lang", btn.dataset.lang);
    langList.classList.add("hidden");
    langDropdown.classList.remove("is-open");
    applyLang();
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (langDropdown && !langDropdown.contains(e.target)) {
    langList.classList.add("hidden");
    langDropdown.classList.remove("is-open");
  }
});

// --- Form logic ---
const form = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const errorBox = document.getElementById("errorBox");

function setError(message) {
  errorBox.textContent = message || "";
}

// Check if name already exists
const existingName = localStorage.getItem("customerName");
if (existingName) {
  window.location.replace("/index.html");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setError("");

  const name = nameInput.value.trim();
  if (!name) {
    setError(t("nameEmpty"));
    return;
  }
  if (name.length < 2) {
    setError(t("nameShort"));
    return;
  }

  localStorage.setItem("customerName", name);

  // Show dine screen
  document.querySelector(".accessFullscreen").classList.add("hidden");
  document.getElementById("dineScreenAccess").classList.remove("hidden");
});

// Dine option buttons
for (const btn of document.querySelectorAll("[data-dine]")) {
  btn.addEventListener("click", () => {
    localStorage.setItem("dineOption", btn.dataset.dine);
    window.location.replace("/index.html");
  });
}

// Apply language on load
applyLang();
