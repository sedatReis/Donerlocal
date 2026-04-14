const NOTICE_TIMEOUT_MS = 3200;

/* ── Translations ── */
const TRANSLATIONS = {
  de: {
    changeName: "Name ändern",
    order: "Bestellung",
    yourSelection: "Deine Auswahl",
    orderSummary: "Bestellübersicht",
    total: "Summe",
    submitOrder: "Bestellung absenden",
    clearCart: "Warenkorb leeren",
    cart: "Warenkorb",
    orderNow: "Bestellen",
    quantity: "Menge",
    continue: "Weiter",
    addExtras: "Extras hinzufügen?",
    skip: "Überspringen",
    addWithExtras: "Mit Extras hinzufügen",
    dineQuestion: "Wo möchtest du essen?",
    dineHere: "Hier essen",
    dineTakeaway: "Mitnehmen",
    paymentQuestion: "Wie möchtest du bezahlen?",
    payCash: "Bar",
    payCard: "Karte",
    thankYou: "Danke für deine Bestellung!",
    receiptPrinting: "Dein Bon wird gedruckt...",
    totalLabel: "Gesamt:",
    categories: "Kategorien",
    products: "Produkte",
    inCart: "Im Warenkorb",
    subtotal: "Zwischensumme",
    category: "Kategorie",
    noProducts: "Keine Produkte verfügbar.",
    emptyCart: "Warenkorb ist leer.",
    emptyTitle: "Noch nichts ausgewählt",
    emptyText: "Tippe auf ein Produkt, um deine Bestellung zu starten.",
    remove: "Entfernen",
    select: "Auswählen",
    add: "Hinzufügen",
    withAll: "Mit allem",
    deselectAll: "Alles abwählen",
    chooseIngredients: "Zutaten auswählen:",
    optionalIngredients: "Optional dazu:",
    riceOrFries: "Mit Reis oder Pommes?",
    rice: "Reis",
    fries: "Pommes",
    freeIngredient: "2 Zutaten gratis wählen:",
    extraIngredientFee: "Ab 3. Zutat: +1,50 €",
    added: "hinzugefügt!",
    cartEmpty: "Warenkorb ist leer.",
    loadError: "Speisekarte konnte nicht geladen werden.",
    loadFallback: "Fehler beim Laden.",
    orderError: "Bestellung konnte nicht gesendet werden.",
    errorPrefix: "Fehler:",
    unknownError: "Unbekannter Fehler",
    connectionError: "Es gab ein Verbindungsproblem. Bitte erneut versuchen.",
    errNameRequired: "Bitte gib deinen Namen ein.",
    errNameShort: "Der Name muss mindestens 2 Zeichen lang sein.",
    errItemsRequired: "Bitte mindestens ein Produkt auswählen.",
    errOrderNotFound: "Bestellung wurde nicht gefunden.",
    errCannotReadProducts: "Die Speisekarte konnte nicht geladen werden.",
    greeting: "Hallo {name}! Tippe auf ein Produkt, um zu bestellen.",
    cancelOrder: "Bestellung abbrechen",
    cancelConfirm: "Möchtest du die Bestellung wirklich abbrechen?",
    yes: "Ja",
    no: "Nein",
    tryAgain: "Erneut versuchen",
    extras: "Extras",
    breadQuestion: "Brot erwünscht?",
    withBread: "Mit Brot",
    withoutBread: "Ohne Brot",
    note: "Bemerkung",
    notePlaceholder: "z.B. extra scharf (max 7 Wörter)",
    noteMaxWords: "Maximal 7 Wörter erlaubt.",
    mitAllemOhne: "Mit allem ohne",
    edit: "Bearbeiten",
    save: "Speichern",
    dineInCar: "Ich warte im Auto",
    carBrand: "Automarke",
    carColor: "Farbe",
    carBrandPlaceholder: "z.B. BMW",
    carColorPlaceholder: "z.B. Schwarz",
    carFieldsRequired: "Bitte Automarke und Farbe eingeben.",
    sauces: "Saucen",
    without: "Ohne",
    back: "Zurück",
    sauceQuestion: "Sauce erwünscht?",
    withSauce: "Mit Sauce",
    withoutSauce: "Ohne Sauce",
    currySauceQuestion: "Currysauce erwünscht?",
    withCurrySauce: "Mit Currysauce",
    withoutCurrySauce: "Ohne Currysauce"
  },
  en: {
    changeName: "Change name",
    order: "Order",
    yourSelection: "Your selection",
    orderSummary: "Order summary",
    total: "Total",
    submitOrder: "Submit order",
    clearCart: "Clear cart",
    cart: "Cart",
    orderNow: "Order now",
    quantity: "Quantity",
    continue: "Continue",
    addExtras: "Add extras?",
    skip: "Skip",
    addWithExtras: "Add with extras",
    dineQuestion: "Where would you like to eat?",
    dineHere: "Dine in",
    dineTakeaway: "Takeaway",
    paymentQuestion: "How would you like to pay?",
    payCash: "Cash",
    payCard: "Card",
    thankYou: "Thank you for your order!",
    receiptPrinting: "Your receipt is being printed...",
    totalLabel: "Total:",
    categories: "Categories",
    products: "Products",
    inCart: "In cart",
    subtotal: "Subtotal",
    category: "Category",
    noProducts: "No products available.",
    emptyCart: "Cart is empty.",
    emptyTitle: "Nothing selected yet",
    emptyText: "Tap a product to start your order.",
    remove: "Remove",
    select: "Select",
    add: "Add",
    withAll: "With everything",
    deselectAll: "Deselect all",
    chooseIngredients: "Choose ingredients:",
    optionalIngredients: "Optional extras:",
    riceOrFries: "With rice or fries?",
    rice: "Rice",
    fries: "Fries",
    freeIngredient: "Choose 2 free ingredients:",
    extraIngredientFee: "From 3rd ingredient: +1.50 €",
    added: "added!",
    cartEmpty: "Cart is empty.",
    loadError: "Could not load the menu.",
    loadFallback: "Error loading.",
    orderError: "Order could not be sent.",
    errorPrefix: "Error:",
    unknownError: "Unknown error",
    connectionError: "Connection problem. Please try again.",
    errNameRequired: "Please enter your name.",
    errNameShort: "Name must be at least 2 characters.",
    errItemsRequired: "Please select at least one product.",
    errOrderNotFound: "Order not found.",
    errCannotReadProducts: "Could not load the menu.",
    greeting: "Hello {name}! Tap a product to order.",
    cancelOrder: "Cancel order",
    cancelConfirm: "Do you really want to cancel the order?",
    yes: "Yes",
    no: "No",
    tryAgain: "Try again",
    extras: "Extras",
    breadQuestion: "Bread wanted?",
    withBread: "With bread",
    withoutBread: "Without bread",
    note: "Note",
    notePlaceholder: "e.g. extra spicy (max 7 words)",
    noteMaxWords: "Maximum 7 words allowed.",
    mitAllemOhne: "With everything except",
    edit: "Edit",
    save: "Save",
    dineInCar: "I'm waiting in the car",
    carBrand: "Car brand",
    carColor: "Color",
    carBrandPlaceholder: "e.g. BMW",
    carColorPlaceholder: "e.g. Black",
    carFieldsRequired: "Please enter car brand and color.",
    sauces: "Sauces",
    without: "Without",
    back: "Back",
    sauceQuestion: "Sauce wanted?",
    withSauce: "With sauce",
    withoutSauce: "Without sauce",
    currySauceQuestion: "Curry sauce wanted?",
    withCurrySauce: "With curry sauce",
    withoutCurrySauce: "Without curry sauce"
  },
  tr: {
    changeName: "İsim değiştir",
    order: "Sipariş",
    yourSelection: "Seçiminiz",
    orderSummary: "Sipariş özeti",
    total: "Toplam",
    submitOrder: "Sipariş gönder",
    clearCart: "Sepeti temizle",
    cart: "Sepet",
    orderNow: "Sipariş ver",
    quantity: "Miktar",
    continue: "Devam",
    addExtras: "Ekstra eklemek ister misiniz?",
    skip: "Atla",
    addWithExtras: "Ekstralarla ekle",
    dineQuestion: "Nerede yemek istersiniz?",
    dineHere: "Burada yemek",
    dineTakeaway: "Paket",
    paymentQuestion: "Nasıl ödeme yapmak istersiniz?",
    payCash: "Nakit",
    payCard: "Kart",
    thankYou: "Siparişiniz için teşekkürler!",
    receiptPrinting: "Fişiniz yazdırılıyor...",
    totalLabel: "Toplam:",
    categories: "Kategoriler",
    products: "Ürünler",
    inCart: "Sepette",
    subtotal: "Ara toplam",
    category: "Kategori",
    noProducts: "Ürün bulunmamaktadır.",
    emptyCart: "Sepet boş.",
    emptyTitle: "Henüz seçim yapılmadı",
    emptyText: "Sipariş vermek için bir ürüne dokunun.",
    remove: "Kaldır",
    select: "Seç",
    add: "Ekle",
    withAll: "Her şeyle",
    deselectAll: "Tümünü kaldır",
    chooseIngredients: "Malzeme seçin:",
    optionalIngredients: "İsteğe bağlı:",
    riceOrFries: "Pilav mı patates mi?",
    rice: "Pilav",
    fries: "Patates",
    freeIngredient: "2 ücretsiz malzeme seçin:",
    extraIngredientFee: "3. malzemeden itibaren: +1,50 €",
    added: "eklendi!",
    cartEmpty: "Sepet boş.",
    loadError: "Menü yüklenemedi.",
    loadFallback: "Yükleme hatası.",
    orderError: "Sipariş gönderilemedi.",
    errorPrefix: "Hata:",
    unknownError: "Bilinmeyen hata",
    connectionError: "Bağlantı sorunu. Lütfen tekrar deneyin.",
    errNameRequired: "Lütfen adınızı girin.",
    errNameShort: "Ad en az 2 karakter olmalıdır.",
    errItemsRequired: "Lütfen en az bir ürün seçin.",
    errOrderNotFound: "Sipariş bulunamadı.",
    errCannotReadProducts: "Menü yüklenemedi.",
    greeting: "Merhaba {name}! Sipariş vermek için bir ürüne dokunun.",
    cancelOrder: "Sipariş iptal",
    cancelConfirm: "Siparişi gerçekten iptal etmek istiyor musunuz?",
    yes: "Evet",
    no: "Hayır",
    tryAgain: "Tekrar dene",
    extras: "Ekstralar",
    breadQuestion: "Ekmek ister misiniz?",
    withBread: "Ekmek ile",
    withoutBread: "Ekmeksiz",
    note: "Not",
    notePlaceholder: "örn. ekstra acı (maks 7 kelime)",
    noteMaxWords: "Maksimum 7 kelime.",
    mitAllemOhne: "Her şeyle, hariç",
    edit: "Düzenle",
    save: "Kaydet",
    dineInCar: "Arabada bekliyorum",
    carBrand: "Araba markası",
    carColor: "Renk",
    carBrandPlaceholder: "örn. BMW",
    carColorPlaceholder: "örn. Siyah",
    carFieldsRequired: "Lütfen araba markası ve renk girin.",
    sauces: "Soslar",
    without: "Olmadan",
    back: "Geri",
    sauceQuestion: "Sos ister misiniz?",
    withSauce: "Soslu",
    withoutSauce: "Sossuz",
    currySauceQuestion: "Köri sosu ister misiniz?",
    withCurrySauce: "Köri soslu",
    withoutCurrySauce: "Köri sossuz"
  }
};

const LANG_FLAGS = {
  de: `<svg width="20" height="13" viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#ed2939"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.67" width="24" height="5.33" fill="#ed2939"/></svg>`,
  en: `<svg width="20" height="13" viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="2.5"/><path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.5"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="4"/><path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="2.5"/></svg>`,
  tr: `<svg width="20" height="13" viewBox="0 0 24 16"><rect width="24" height="16" fill="#E30A17"/><circle cx="10" cy="8" r="4.5" fill="#fff"/><circle cx="11.2" cy="8" r="3.6" fill="#E30A17"/><polygon points="14,8 14.8,6.5 13.2,7.4 15,7.4 13.4,6.5" fill="#fff"/></svg>`
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
  const flagEl = document.getElementById("langCurrentFlagTopbar");
  const labelEl = document.getElementById("langCurrentLabelTopbar");
  if (flagEl) flagEl.innerHTML = LANG_FLAGS[lang] || LANG_FLAGS.de;
  if (labelEl) labelEl.textContent = LANG_LABELS[lang] || "DE";
}

/* ── Product translation helpers ── */
function itemName(item) {
  const lang = getLang();
  if (lang === "en" && item.name_en) return item.name_en;
  if (lang === "tr" && item.name_tr) return item.name_tr;
  return item.name;
}

function itemDesc(item) {
  const lang = getLang();
  if (lang === "en" && item.desc_en) return item.desc_en;
  if (lang === "tr" && item.desc_tr) return item.desc_tr;
  return item.desc || "";
}

function catTitle(cat) {
  const lang = getLang();
  if (lang === "en" && cat.title_en) return cat.title_en;
  if (lang === "tr" && cat.title_tr) return cat.title_tr;
  return cat.title;
}

function extraName(extra) {
  const lang = getLang();
  if (lang === "en" && extra.name_en) return extra.name_en;
  if (lang === "tr" && extra.name_tr) return extra.name_tr;
  return extra.name;
}

function getTranslatedOptions() {
  if (!state.products) return state.options;
  const lang = getLang();
  if (lang === "en" && state.products.defaultOptions_en) return state.products.defaultOptions_en;
  if (lang === "tr" && state.products.defaultOptions_tr) return state.products.defaultOptions_tr;
  return state.options;
}

/* ── Ingredient & Extra Icons ── */
const INGREDIENT_ICONS = {
  "Sauce": `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M14 2h-4a1 1 0 00-1 1v3l-2 1v1h10v-1l-2-1V3a1 1 0 00-1-1z" fill="#e8e0d0" stroke="#b0a090" stroke-width=".7"/><path d="M7 8l1 14h8l1-14z" fill="#f5f0e0" stroke="#b0a090" stroke-width=".7"/><path d="M8.5 12c1.5 2 5.5 2 7 0" stroke="#e8a030" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M9 16c1 1.2 5 1.2 6 0" stroke="#e8a030" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="9.5" r="1" fill="#e8a030"/></svg>`,
  "Zwiebel": `<svg viewBox="0 0 24 24" width="22" height="22"><ellipse cx="12" cy="14" rx="8" ry="7" fill="#d4a0d0" stroke="#9b5e97" stroke-width=".8"/><path d="M12 3c-2 2-5 5-5 8" stroke="#9b5e97" stroke-width=".8" fill="none"/><path d="M12 3c2 2 5 5 5 8" stroke="#9b5e97" stroke-width=".8" fill="none"/><path d="M10 7c1 1 3 1 4 0" stroke="#6d3f6a" stroke-width=".6" fill="none"/></svg>`,
  "Salat": `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 14c0-5 3-9 8-11 5 2 8 6 8 11 0 4-3 7-8 8-5-1-8-4-8-8z" fill="#5cb85c" stroke="#3a8a3a" stroke-width=".8"/><path d="M12 5v14M8 9c2 1 6 1 8 0M7 14c3 1 7 1 10 0" stroke="#3a8a3a" stroke-width=".7" fill="none"/></svg>`,
  "Tomate": `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="13" r="8" fill="#e74c3c" stroke="#b33a2e" stroke-width=".8"/><path d="M8 5c2 1 6 1 8 0" stroke="#4a9e4a" stroke-width="1.2" fill="none"/><path d="M12 5V3" stroke="#4a9e4a" stroke-width="1" fill="none"/></svg>`,
  "Blaukraut": `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="13" r="8" fill="#7b5ea7" stroke="#5c3d82" stroke-width=".8"/><path d="M7 12c2-2 4-2 5 0s3 2 5 0" stroke="#e0d0f0" stroke-width=".8" fill="none"/><path d="M8 16c2-1 3-1 4 0s3 1 4 0" stroke="#e0d0f0" stroke-width=".7" fill="none"/></svg>`,
  "Gurke": `<svg viewBox="0 0 24 24" width="22" height="22"><ellipse cx="12" cy="12" rx="5" ry="9" fill="#6abf69" stroke="#3d8c3c" stroke-width=".8"/><circle cx="12" cy="8" r="1" fill="#4a9e4a"/><circle cx="10" cy="12" r=".8" fill="#4a9e4a"/><circle cx="14" cy="12" r=".8" fill="#4a9e4a"/><circle cx="12" cy="16" r="1" fill="#4a9e4a"/></svg>`,
  "Mais": `<svg viewBox="0 0 24 24" width="22" height="22"><ellipse cx="12" cy="12" rx="5" ry="9" fill="#f0c040" stroke="#c89e20" stroke-width=".8"/><path d="M9 7v10M12 5v14M15 7v10" stroke="#d4a820" stroke-width=".8" fill="none"/><path d="M7 9h10M7 12h10M7 15h10" stroke="#c89e20" stroke-width=".5" fill="none"/></svg>`,
  "Jalapeño": `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 4c-1 1-1 2 0 3l2 3c2 4 1 8-1 11 3-1 6-5 6-10 0-3-1-5-3-6l-2-1z" fill="#4caf50" stroke="#2e7d32" stroke-width=".8"/><path d="M10 4c1-1 3-1 4 0" stroke="#2e7d32" stroke-width=".8" fill="none"/></svg>`,
  "Chili Sauce": `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 3h6l1 2H8zM8 5h8l-1 17H9z" fill="#d32f2f" stroke="#b71c1c" stroke-width=".7"/><path d="M10 8h4M10 12h4M10 16h4" stroke="#ffcdd2" stroke-width=".6" fill="none"/></svg>`,
  "Scharf": `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2c-2 3-3 5-2 8 1 4 0 7-2 10h2c3-2 5-6 4-10-.5-3 0-5 2-8z" fill="#ff5722" stroke="#d84315" stroke-width=".8"/><path d="M14 4c1 2 1 4 0 7-1 3-1 6 1 9" stroke="#ff8a65" stroke-width=".7" fill="none"/></svg>`
};

const EXTRA_ICONS = {
  "extra_59": `<svg viewBox="0 0 28 28" width="26" height="26"><circle cx="8" cy="18" r="4" fill="#e74c3c"/><circle cx="14" cy="12" r="3.5" fill="#f0b321"/><circle cx="20" cy="18" r="4" fill="#4caf50"/><path d="M8 14v-3M14 8v-3M20 14v-3" stroke="#6d8c3a" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  "extra_60": `<svg viewBox="0 0 28 28" width="26" height="26"><rect x="6" y="14" width="16" height="10" rx="2" fill="#d32f2f"/><rect x="9" y="5" width="2.8" height="13" rx="1" fill="#fdd835" stroke="#c8a415" stroke-width=".4"/><rect x="13" y="4" width="2.8" height="14" rx="1" fill="#fdd835" stroke="#c8a415" stroke-width=".4"/><rect x="17" y="6" width="2.8" height="12" rx="1" fill="#fdd835" stroke="#c8a415" stroke-width=".4"/></svg>`,
  "extra_61": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M6 6h5l1 2H5z" fill="#c62828"/><path d="M5 8h7l-.8 14H5.8z" fill="#c62828"/><path d="M11 6h5l1 2h-6z" fill="#fef9e7" stroke="#d4c57a" stroke-width=".5"/><path d="M11 8h6l-.8 14h-5.4z" fill="#fef9e7" stroke="#d4c57a" stroke-width=".5"/><path d="M17 6h5l1 2h-6z" fill="#ff9800"/><path d="M17 8h6l-.8 14h-5.4z" fill="#ff9800" stroke="#e67c00" stroke-width=".5"/></svg>`,
  "extra_61_ketchup": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M10 4h8l1 3H9z" fill="#c62828"/><path d="M9 7h10l-1 17H10z" fill="#c62828"/><path d="M12 11h4M12 15h4" stroke="#ffcdd2" stroke-width=".6" fill="none"/></svg>`,
  "extra_61_mayo": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M10 4h8l1 3H9z" fill="#fef9e7" stroke="#d4c57a" stroke-width=".5"/><path d="M9 7h10l-1 17H10z" fill="#fef9e7" stroke="#d4c57a" stroke-width=".5"/><path d="M12 11h4M12 15h4" stroke="#d4c57a" stroke-width=".6" fill="none"/></svg>`,
  "extra_61_curry": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M10 4h8l1 3H9z" fill="#ff9800"/><path d="M9 7h10l-1 17H10z" fill="#ff9800" stroke="#e67c00" stroke-width=".5"/><path d="M12 11h4M12 15h4" stroke="#fff3e0" stroke-width=".6" fill="none"/></svg>`,
  "extra_62": `<svg viewBox="0 0 28 28" width="26" height="26"><ellipse cx="14" cy="14" rx="11" ry="9" fill="#d4a060" stroke="#a07840" stroke-width=".8"/><ellipse cx="14" cy="12" rx="8" ry="5" fill="#e8c890" stroke="#c8a060" stroke-width=".6"/><path d="M8 15c3 2 9 2 12 0" stroke="#a07840" stroke-width=".6" fill="none"/></svg>`,
  "extra_63": `<svg viewBox="0 0 28 28" width="26" height="26"><ellipse cx="14" cy="14" rx="9" ry="7" fill="#d4a060" stroke="#a07840" stroke-width=".8"/><ellipse cx="14" cy="12.5" rx="6" ry="4" fill="#e8c890" stroke="#c8a060" stroke-width=".6"/><path d="M9.5 15c2.5 1.5 6.5 1.5 9 0" stroke="#a07840" stroke-width=".6" fill="none"/></svg>`,
  "extra_64": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M5 8h18l-1 16H6z" fill="#fdd835" stroke="#c8a415" stroke-width=".8"/><path d="M7 12h14" stroke="#e8c020" stroke-width=".6"/><path d="M7 16h14" stroke="#e8c020" stroke-width=".6"/><path d="M7 20h14" stroke="#e8c020" stroke-width=".6"/><circle cx="18" cy="10" r="3" fill="#fff" stroke="#ddd" stroke-width=".5"/></svg>`,
  "extra_65": `<svg viewBox="0 0 28 28" width="26" height="26"><path d="M16 3h-4a1 1 0 00-1 1v3l-2 1v1h10v-1l-2-1V4a1 1 0 00-1-1z" fill="#e8e0d0" stroke="#b0a090" stroke-width=".6"/><path d="M9 9l1 15h8l1-15z" fill="#f5f0e0" stroke="#b0a090" stroke-width=".6"/><path d="M10.5 13c1.5 2 5.5 2 7 0" stroke="#e8a030" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M11 17c1 1 5 1 6 0" stroke="#e8a030" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`
};

/* ── Teller IDs (for bread question) ── */
const TELLER_IDS = new Set([
  "doner_08", "doner_09", "kofte_27", "kofte_28", "curry_32",
  "chicken_38", "chicken_39", "iskender_44", "grill_45",
  "veg_52", "veg_54"
]);

const CURRY_IDS = new Set([
  "curry_29", "curry_30", "curry_31", "curry_32"
]);

/* ── Category SVG Icons ── */
const CATEGORY_ICONS = {};

/* ── Kids portion IDs ── */
const KIDS_PORTION_IDS = new Set([
  "doner_03",      // Kleiner Döner
  "donerbox_19",   // Döner Box klein
  "donerbox_21",   // Salat Box klein
  "chicken_34",    // Chicken Box Klein mit Pommes
  "chicken_36",    // Chicken Box Klein mit Reis
  "salat_41",      // Kleiner Salat
  "nuggets_55"     // Pommes Frites Klein
]);

/* ── State ── */
const state = {
  products: null,
  options: [],
  selectedProduct: null,
  selectedCategory: null,
  activeCategoryId: null,
  selectedQty: 1,
  selectedOptions: new Set(),
  allOptionsSelected: false,
  extras: [],
  selectedExtras: [],
  donerboxBase: null, // "reis" or "pommes" for Dönerbox
  donerboxExtraFee: 0, // 1.50€ if more than 1 ingredient selected
  breadWanted: null, // true/false for Tellergerichte
  productNote: "", // per-product note (max 7 words)
  editingCartIndex: -1, // -1 = not editing, >= 0 = index in cart
  cart: loadCart(),
  customerName: localStorage.getItem("customerName") || "",
  checkoutDine: localStorage.getItem("dineOption") || null,
  checkoutPayment: null,
  carBrand: "",
  carColor: "",
  noticeTimer: null
};

/* ── Utilities ── */
function sanitizeCart(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (typeof item.key !== "string" || !item.key) return false;
    if (typeof item.name !== "string") return false;
    if (typeof item.price !== "number" || Number.isNaN(item.price)) return false;
    if (typeof item.qty !== "number" || Number.isNaN(item.qty)) return false;
    return true;
  });
}

function euro(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function getCategoryAnchorId(categoryId) {
  return `cat-${String(categoryId || "menu").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function setActiveKioskCategory(categoryId) {
  for (const button of document.querySelectorAll(".kioskCategoryBtn")) {
    button.classList.toggle("is-active", button.dataset.categoryId === categoryId);
  }
}

function showKioskCategory(categoryId) {
  state.activeCategoryId = categoryId;
  setActiveKioskCategory(categoryId);
  for (const panel of document.querySelectorAll(".kioskSectionPanel")) {
    const isActive = panel.dataset.categoryId === categoryId;
    panel.classList.toggle("hidden", !isActive);
    panel.classList.toggle("is-active", isActive);
  }
}

function renderKioskQuickMeta() {
  const root = document.getElementById("kioskQuickMeta");
  if (!root) return;
  const categories = Array.isArray(state.products?.categories) ? state.products.categories : [];
  const itemsCount = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  const cartCount = sanitizeCart(state.cart).reduce((sum, i) => sum + (i.qty || 0), 0);
  const cartTotal = sanitizeCart(state.cart).reduce((sum, i) => sum + (i.price * i.qty), 0);
  root.innerHTML = `
    <div class="kioskMetaPill"><span class="kioskMetaPill__label">${t("categories")}</span><strong>${categories.length}</strong></div>
    <div class="kioskMetaPill"><span class="kioskMetaPill__label">${t("products")}</span><strong>${itemsCount}</strong></div>
    <div class="kioskMetaPill"><span class="kioskMetaPill__label">${t("inCart")}</span><strong>${cartCount}</strong></div>
    <div class="kioskMetaPill"><span class="kioskMetaPill__label">${t("subtotal")}</span><strong>${euro(cartTotal)}</strong></div>
  `;
}

function redirectToAccess() {
  window.location.replace("/access.html");
}

function translateError(message, fallback) {
  const text = String(message || "").trim();
  if (!text) return fallback || t("unknownError");
  const known = {
    "customerName is required": t("errNameRequired"),
    "customerName must be at least 2 characters": t("errNameShort"),
    "items is required": t("errItemsRequired"),
    "Order not found": t("errOrderNotFound"),
    "Cannot read products.json": t("errCannotReadProducts")
  };
  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return t("connectionError");
  return text;
}

function showAppNotice(message, type = "info") {
  const notice = document.getElementById("appNotice");
  if (!notice) return;
  clearTimeout(state.noticeTimer);
  notice.textContent = message;
  notice.classList.remove("hidden", "appNotice--info", "appNotice--success", "appNotice--error");
  notice.classList.add(`appNotice--${type}`);
  state.noticeTimer = setTimeout(() => { notice.classList.add("hidden"); }, NOTICE_TIMEOUT_MS);
}

function saveCart() {
  localStorage.setItem("cart_v1", JSON.stringify(state.cart));
  updateCartBadge();
}

function loadCart() {
  try { return sanitizeCart(JSON.parse(localStorage.getItem("cart_v1") || "[]")); }
  catch { return []; }
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCart();
}

function updateCartBadge() {
  state.cart = sanitizeCart(state.cart);
  const count = state.cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  document.getElementById("cartCount").textContent = String(count);
  const mc = document.getElementById("kioskMobileCount");
  if (mc) mc.textContent = String(count);
  syncCartAttention(count > 0);
  renderKioskQuickMeta();
}

function syncCartAttention(hasItems) {
  const btn = document.getElementById("openCartBtn");
  const badge = document.getElementById("cartCount");
  if (!btn || !badge) return;
  btn.classList.toggle("is-cart-attention", hasItems);
  badge.classList.toggle("is-badge-attention", hasItems);
}

function renderCustomerName() {
  const badge = document.getElementById("customerNameBadge");
  if (badge) badge.textContent = state.customerName;
}

/* ── Language dropdown in topbar ── */
function setupLangDropdown() {
  const dropdown = document.getElementById("langDropdownTopbar");
  const toggle = document.getElementById("langToggleTopbar");
  const list = document.getElementById("langListTopbar");
  if (!toggle || !list) return;

  toggle.addEventListener("click", () => {
    const isOpen = !list.classList.contains("hidden");
    list.classList.toggle("hidden", isOpen);
    dropdown.classList.toggle("is-open", !isOpen);
  });

  for (const btn of list.querySelectorAll(".langDropdown__item")) {
    btn.addEventListener("click", () => {
      localStorage.setItem("lang", btn.dataset.lang);
      list.classList.add("hidden");
      dropdown.classList.remove("is-open");
      applyLang();
      if (state.products) {
        renderMenu();
        renderCart();
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      list.classList.add("hidden");
      dropdown.classList.remove("is-open");
    }
  });
}

/* ── Init ── */
async function init() {
  if (!state.customerName) {
    redirectToAccess();
    return;
  }

  applyLang();
  setupLangDropdown();
  renderCustomerName();

  // Load car details from localStorage (set during access flow)
  state.carBrand = localStorage.getItem("carBrand") || "";
  state.carColor = localStorage.getItem("carColor") || "";

  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error(t("loadError"));
    state.products = await res.json();
    state.options = state.products.defaultOptions || [];
    state.extras = Array.isArray(state.products.extras) ? state.products.extras : [];
    renderMenu();
    wireUI();
    updateCartBadge();
  } catch (error) {
    showAppNotice(translateError(error.message, t("loadFallback")), "error");
  }
}

/* ── Render Menu ── */
function renderMenu() {
  const root = document.getElementById("menu");
  root.innerHTML = "";
  renderKioskQuickMeta();

  const categories = Array.isArray(state.products?.categories) ? state.products.categories : [];
  if (!categories.length) {
    root.innerHTML = `<div class="muted">${t("noProducts")}</div>`;
    return;
  }

  const menuShell = document.createElement("div");
  menuShell.className = "kioskMenuShell";

  const sidebar = document.createElement("aside");
  sidebar.className = "kioskCategorySidebar";
  sidebar.setAttribute("aria-label", t("categories"));

  const railWrap = document.createElement("div");
  railWrap.className = "kioskCategoryRailWrap";
  const rail = document.createElement("div");
  rail.className = "kioskCategoryRail";
  railWrap.appendChild(rail);
  sidebar.appendChild(railWrap);

  const stage = document.createElement("div");
  stage.className = "kioskCategoryStage";

  let firstCategoryId = null;

  for (const category of categories) {
    if (!firstCategoryId) firstCategoryId = category.id;

    const categoryBtn = document.createElement("button");
    categoryBtn.type = "button";
    categoryBtn.className = "kioskCategoryBtn";
    categoryBtn.dataset.categoryId = String(category.id);
    const catSvg = CATEGORY_ICONS[category.id];
    const iconHtml = catSvg ? `<span class="kioskCategoryBtn__icon">${catSvg}</span>` : (category.icon ? `<img class="kioskCategoryBtn__icon" src="/${category.icon}" alt="" />` : "");
    const translatedCatTitle = catTitle(category);
    categoryBtn.innerHTML = `${iconHtml}<span class="kioskCategoryBtn__title">${translatedCatTitle}</span><span class="kioskCategoryBtn__meta">${category.items.length} ${t("products")}</span>`;
    categoryBtn.addEventListener("click", () => showKioskCategory(String(category.id)));
    rail.appendChild(categoryBtn);

    const section = document.createElement("section");
    section.className = "kioskSection kioskSectionPanel";
    section.id = getCategoryAnchorId(category.id);
    section.dataset.categoryId = String(category.id);
    const sectionIconHtml = category.icon ? `<img class="kioskSection__icon" src="/${category.icon}" alt="" />` : "";
    section.innerHTML = `
      <div class="kioskSection__header">
        <div class="kioskSection__headerLeft">
          ${sectionIconHtml}
          <div>
            <div class="kioskSection__eyebrow">${t("category")}</div>
            <h2 class="kioskSection__title">${translatedCatTitle}</h2>
          </div>
        </div>
        <div class="kioskSection__count">${category.items.length} ${t("products")}</div>
      </div>
    `;

    const grid = document.createElement("div");
    grid.className = "kioskProductGrid";

    for (const item of category.items) {
      const tile = document.createElement("article");
      tile.className = "kioskTile";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", `${item.name} ${t("select").toLowerCase()}`);

      const hasNumber = typeof item.number === "number";
      const tileImgSrc = item.image || category.icon || "";
      const translatedName = itemName(item);
      const translatedDesc = itemDesc(item);
      tile.innerHTML = `
        <div class="kioskTile__media">
          ${tileImgSrc ? `<img alt="" src="/${tileImgSrc}" onerror="this.remove();" />` : ""}
          ${hasNumber ? `<span class="kioskTile__number">#${item.number}</span>` : ""}
        </div>
        <div class="kioskTile__body">
          <div class="kioskTile__name">${translatedName}</div>
          ${translatedDesc ? `<div class="kioskTile__desc">${translatedDesc}</div>` : ""}
        </div>
        <div class="kioskTile__footer">
          <div class="kioskTile__price">${euro(item.price)}</div>
          <button type="button" class="btn btn--primary kioskTile__cta">${item.optionsEnabled ? t("select") : t("add")}</button>
        </div>
      `;

      const openFn = () => openProduct(item, category);
      tile.querySelector(".kioskTile__cta").addEventListener("click", (e) => { e.stopPropagation(); openFn(); });
      tile.addEventListener("click", (e) => { if (e.target instanceof Element && e.target.closest("button")) return; openFn(); });
      tile.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFn(); } });
      grid.appendChild(tile);
    }

    section.appendChild(grid);
    stage.appendChild(section);
  }

  menuShell.appendChild(sidebar);
  menuShell.appendChild(stage);
  root.appendChild(menuShell);

  const categoryIds = categories.map(c => String(c.id));
  const initialId = categoryIds.includes(String(state.activeCategoryId)) ? String(state.activeCategoryId) : String(firstCategoryId);
  if (initialId) showKioskCategory(initialId);
}

/* ── Wire UI ── */
function wireUI() {
  bindClick("openCartBtn", openCart);
  bindClick("closeCartBtn", closeCart);
  bindClick("clearCartBtn", clearCart);
  bindClick("drawerClearCartBtn", clearCart);
  bindClick("cancelOrderBtn", cancelOrder);
  bindClick("changeNameBtn", changeName);
  bindClick("kioskOpenCartBtn", openCart);
  bindClick("kioskCheckoutBtn", startCheckout);
  bindClick("kioskMobileCartBtn", openCart);
  bindClick("kioskMobileCheckoutBtn", startCheckout);
  bindClick("closeOptionsBtn", closeOptions);
  bindClick("qtyMinus", () => setQty(state.selectedQty - 1));
  bindClick("qtyPlus", () => setQty(state.selectedQty + 1));
  bindClick("addToCartBtn", proceedToExtras);
  bindClick("checkoutBtn", startCheckout);
  bindClick("closeExtrasBtn", () => { closeExtrasModal(); closeOptions(); });
  bindClick("skipExtrasBtn", () => { state.selectedExtras = []; finalizeAddToCart(); });
  bindClick("addExtrasBtn", finalizeAddToCart);
  bindClick("modalBackdrop", () => { closeOptions(); closeExtrasModal(); });
  setupCheckoutListeners();
  renderCart();
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function openBackdrop() { document.getElementById("modalBackdrop").classList.remove("hidden"); }
function closeBackdrop() { document.getElementById("modalBackdrop").classList.add("hidden"); }

function composeItemMeta(item) {
  const parts = [];
  if (item.allOptionsExcept && item.allOptionsExcept.length > 0) {
    parts.push(`${t("mitAllemOhne")} ${item.allOptionsExcept.join(", ")}`);
  } else if (item.allOptions) {
    parts.push(t("withAll"));
  } else if (item.options?.length) {
    parts.push(...item.options);
  }
  if (item.optionalIngredients && item.optionalIngredients.length > 0) {
    parts.push(...item.optionalIngredients);
  }
  if (item.donerboxExtraFee > 0) {
    parts.push(`+${euro(item.donerboxExtraFee)} Zutaten`);
  }
  if (item.breadWanted === true) parts.push(t("withBread"));
  else if (item.breadWanted === false) parts.push(t("withoutBread"));
  if (item.sauceWanted === true) parts.push(t("withSauce"));
  else if (item.sauceWanted === false) parts.push(t("withoutSauce"));
  if (item.currySauceWanted === true) parts.push(t("withCurrySauce"));
  else if (item.currySauceWanted === false) parts.push(t("withoutCurrySauce"));
  if (Array.isArray(item.extras) && item.extras.length) {
    parts.push(...item.extras.map(e => `+${e.name} (${euro(e.price)})`));
  }
  if (item.note) parts.push(`"${item.note}"`);
  return parts.length ? parts.join(", ") : "";
}

/* ── Product Modal ── */
function openProduct(product, category, editIndex) {
  state.selectedProduct = product;
  state.selectedCategory = category ?? null;
  state.selectedQty = 1;
  state.selectedOptions = new Set();
  state.allOptionsSelected = false;
  state.selectedExtras = [];
  state.donerboxBase = null;
  state.donerboxExtraFee = 0;
  state.breadWanted = null;
  state.sauceWanted = null;
  state.currySauceWanted = null;
  state.productNote = "";
  state.editingCartIndex = typeof editIndex === "number" ? editIndex : -1;

  // If editing, pre-fill from cart item
  const editItem = state.editingCartIndex >= 0 ? state.cart[state.editingCartIndex] : null;
  if (editItem) {
    state.selectedQty = editItem.qty || 1;
    if (editItem.allOptions) {
      state.allOptionsSelected = true;
      // Select all standard options
      const STANDARD_COUNT = 6;
      for (let i = 0; i < Math.min(STANDARD_COUNT, state.options.length); i++) {
        state.selectedOptions.add(state.options[i]);
      }
    } else if (editItem.allOptionsExcept) {
      state.allOptionsSelected = false;
      const STANDARD_COUNT = 6;
      for (let i = 0; i < Math.min(STANDARD_COUNT, state.options.length); i++) {
        if (!editItem.allOptionsExcept.includes(state.options[i])) {
          state.selectedOptions.add(state.options[i]);
        }
      }
    }
    if (editItem.options) {
      for (const opt of editItem.options) {
        // Map translated back to original
        const idx = state.options.indexOf(opt);
        if (idx >= 0) state.selectedOptions.add(opt);
        else state.selectedOptions.add(opt); // keep as-is
      }
    }
    if (editItem.donerboxBase) state.donerboxBase = editItem.donerboxBase;
    state.donerboxExtraFee = editItem.donerboxExtraFee || 0;
    if (editItem.breadWanted != null) state.breadWanted = editItem.breadWanted;
    if (editItem.sauceWanted != null) state.sauceWanted = editItem.sauceWanted;
    if (editItem.currySauceWanted != null) state.currySauceWanted = editItem.currySauceWanted;
    state.productNote = editItem.note || "";
    if (editItem.extras) state.selectedExtras = editItem.extras.map(e => ({ ...e }));
  }

  // Drinks: skip all modals, add directly to cart
  if (product.isDrink && state.editingCartIndex < 0) {
    const translatedProductName = itemName(product);
    const key = [product.id, category?.id || "", "", "", "", "", ""].join("::");
    const newItem = {
      key, productId: product.id, name: product.name, displayName: translatedProductName,
      price: product.price, basePrice: product.price,
      categoryId: category?.id ?? null, categoryTitle: category?.title ?? null,
      allOptions: false, allOptionsExcept: null,
      options: [], extras: [], qty: 1,
      donerboxBase: null, donerboxExtraFee: 0,
      breadWanted: null, note: null, isDrink: true
    };
    const existing = state.cart.find(i => i.key === key);
    if (existing) { existing.qty += 1; } else { state.cart.push(newItem); }
    saveCart();
    renderCart();
    showAppNotice(`${translatedProductName} ${t("added")}`, "success");
    return;
  }

  document.getElementById("modalTitle").textContent = itemName(product);
  document.getElementById("modalPrice").textContent = euro(product.price);
  document.getElementById("qtyValue").textContent = String(state.selectedQty);

  // Update button text for edit mode
  const addBtn = document.getElementById("addToCartBtn");
  if (addBtn) addBtn.textContent = state.editingCartIndex >= 0 ? t("save") : t("continue");

  const area = document.getElementById("optionsArea");
  area.innerHTML = "";

  const isTeller = TELLER_IDS.has(product.id);
  const isCurry = CURRY_IDS.has(product.id);
  const isDonerbox = category?.id === "donerbox" && (product.id === "donerbox_19" || product.id === "donerbox_20");

  // Bread question for Tellergerichte
  if (isTeller) {
    const breadSection = document.createElement("div");
    breadSection.style.cssText = "margin-bottom:18px;padding:12px 16px;border-radius:14px;background:rgba(92,184,92,.08);border:2px solid rgba(92,184,92,.2);";
    breadSection.innerHTML = `
      <div style="font-weight:700;font-size:16px;color:#2b170b;margin-bottom:10px">${t("breadQuestion")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button type="button" class="breadBtn" data-bread="yes" style="padding:12px;border-radius:12px;border:2px solid rgba(112,77,45,.15);background:${state.breadWanted === true ? 'rgba(92,184,92,.15)' : 'rgba(255,255,255,.7)'};border-color:${state.breadWanted === true ? '#5cb85c' : 'rgba(112,77,45,.15)'};cursor:pointer;font-weight:700;font-size:15px">✓ ${t("withBread")}</button>
        <button type="button" class="breadBtn" data-bread="no" style="padding:12px;border-radius:12px;border:2px solid rgba(112,77,45,.15);background:${state.breadWanted === false ? 'rgba(214,40,31,.08)' : 'rgba(255,255,255,.7)'};border-color:${state.breadWanted === false ? '#d6281f' : 'rgba(112,77,45,.15)'};cursor:pointer;font-weight:700;font-size:15px">✗ ${t("withoutBread")}</button>
      </div>
    `;
    for (const btn of breadSection.querySelectorAll(".breadBtn")) {
      btn.addEventListener("click", () => {
        state.breadWanted = btn.dataset.bread === "yes";
        for (const b of breadSection.querySelectorAll(".breadBtn")) {
          const isYes = b.dataset.bread === "yes";
          const isActive = (isYes && state.breadWanted) || (!isYes && !state.breadWanted);
          b.style.borderColor = isActive ? (isYes ? "#5cb85c" : "#d6281f") : "rgba(112,77,45,.15)";
          b.style.background = isActive ? (isYes ? "rgba(92,184,92,.15)" : "rgba(214,40,31,.08)") : "rgba(255,255,255,.7)";
        }
      });
    }
    area.appendChild(breadSection);
  }

  if (isDonerbox) {
    // Step 1: Reis oder Pommes selection
    const riceOrFriesTitle = document.createElement("div");
    riceOrFriesTitle.className = "muted small";
    riceOrFriesTitle.style.marginBottom = "12px";
    riceOrFriesTitle.style.fontSize = "16px";
    riceOrFriesTitle.style.fontWeight = "700";
    riceOrFriesTitle.style.color = "#2b170b";
    riceOrFriesTitle.textContent = t("riceOrFries");
    area.appendChild(riceOrFriesTitle);

    const baseGrid = document.createElement("div");
    baseGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;";

    const riceIcon = `<svg viewBox="0 0 48 48" width="44" height="44"><ellipse cx="24" cy="30" rx="18" ry="12" fill="#f5f0e0" stroke="#c8a060" stroke-width="1.2"/><ellipse cx="24" cy="28" rx="14" ry="8" fill="#fff" stroke="#e0d4b8" stroke-width=".8"/><ellipse cx="20" cy="27" rx="2" ry="1.2" fill="#f0e8d0"/><ellipse cx="26" cy="26" rx="2.2" ry="1.3" fill="#f0e8d0"/><ellipse cx="23" cy="30" rx="2" ry="1" fill="#f0e8d0"/></svg>`;
    const friesIcon = `<svg viewBox="0 0 48 48" width="44" height="44"><rect x="10" y="28" width="28" height="14" rx="3" fill="#d32f2f"/><rect x="15" y="10" width="4" height="22" rx="1.5" fill="#fdd835" stroke="#c8a415" stroke-width=".5"/><rect x="22" y="8" width="4" height="24" rx="1.5" fill="#fdd835" stroke="#c8a415" stroke-width=".5"/><rect x="29" y="11" width="4" height="21" rx="1.5" fill="#fdd835" stroke="#c8a415" stroke-width=".5"/></svg>`;
    const noneIcon = `<svg viewBox="0 0 48 48" width="44" height="44"><circle cx="24" cy="24" r="18" fill="none" stroke="#b0a090" stroke-width="2"/><line x1="12" y1="12" x2="36" y2="36" stroke="#b4232b" stroke-width="2.5" stroke-linecap="round"/></svg>`;

    for (const base of [{ key: "pommes", label: t("fries"), icon: friesIcon }, { key: "reis", label: t("rice"), icon: riceIcon }, { key: "ohne", label: t("without"), icon: noneIcon }]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "donerboxBaseBtn";
      btn.dataset.base = base.key;
      const isActive = state.donerboxBase === base.key;
      btn.innerHTML = `<div>${base.icon}</div><div style="font-weight:700;font-size:15px;margin-top:4px">${base.label}</div>`;
      btn.style.cssText = `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 10px;border-radius:16px;border:2px solid ${isActive ? '#d6281f' : 'rgba(112,77,45,.15)'};background:${isActive ? 'rgba(214,40,31,.08)' : 'rgba(255,255,255,.7)'};cursor:pointer;transition:all .2s;`;
      btn.addEventListener("click", () => {
        state.donerboxBase = base.key;
        for (const b of baseGrid.querySelectorAll(".donerboxBaseBtn")) {
          b.style.borderColor = b.dataset.base === base.key ? "#d6281f" : "rgba(112,77,45,.15)";
          b.style.background = b.dataset.base === base.key ? "rgba(214,40,31,.08)" : "rgba(255,255,255,.7)";
        }
      });
      baseGrid.appendChild(btn);
    }
    area.appendChild(baseGrid);

    // Step 2: Sauce question (Ja/Nein)
    const sauceSection = document.createElement("div");
    sauceSection.style.cssText = "margin-bottom:18px;padding:12px 16px;border-radius:14px;background:rgba(214,40,31,.05);border:2px solid rgba(214,40,31,.15);";
    sauceSection.innerHTML = `
      <div style="font-weight:700;font-size:16px;color:#2b170b;margin-bottom:10px">${t("sauceQuestion")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button type="button" class="sauceBtn" data-sauce="yes" style="padding:12px;border-radius:12px;border:2px solid ${state.sauceWanted === true ? '#5cb85c' : 'rgba(112,77,45,.15)'};background:${state.sauceWanted === true ? 'rgba(92,184,92,.15)' : 'rgba(255,255,255,.7)'};cursor:pointer;font-weight:700;font-size:15px">✓ ${t("withSauce")}</button>
        <button type="button" class="sauceBtn" data-sauce="no" style="padding:12px;border-radius:12px;border:2px solid ${state.sauceWanted === false ? '#d6281f' : 'rgba(112,77,45,.15)'};background:${state.sauceWanted === false ? 'rgba(214,40,31,.08)' : 'rgba(255,255,255,.7)'};cursor:pointer;font-weight:700;font-size:15px">✗ ${t("withoutSauce")}</button>
      </div>
    `;
    for (const btn of sauceSection.querySelectorAll(".sauceBtn")) {
      btn.addEventListener("click", () => {
        state.sauceWanted = btn.dataset.sauce === "yes";
        for (const b of sauceSection.querySelectorAll(".sauceBtn")) {
          const isYes = b.dataset.sauce === "yes";
          const isActive = (isYes && state.sauceWanted) || (!isYes && !state.sauceWanted);
          b.style.borderColor = isActive ? (isYes ? "#5cb85c" : "#d6281f") : "rgba(112,77,45,.15)";
          b.style.background = isActive ? (isYes ? "rgba(92,184,92,.15)" : "rgba(214,40,31,.08)") : "rgba(255,255,255,.7)";
        }
      });
    }
    area.appendChild(sauceSection);

    // Step 3: Ingredient selection (2 free, from 3rd +1.50€) — exclude "Sauce" (index 0)
    const ingTitle = document.createElement("div");
    ingTitle.className = "muted small";
    ingTitle.style.marginBottom = "4px";
    ingTitle.textContent = t("freeIngredient");
    area.appendChild(ingTitle);

    const feeHint = document.createElement("div");
    feeHint.className = "muted small";
    feeHint.style.marginBottom = "10px";
    feeHint.style.fontSize = "12px";
    feeHint.style.color = "#8b7a65";
    feeHint.textContent = t("extraIngredientFee");
    area.appendChild(feeHint);

    const grid = document.createElement("div");
    grid.className = "checkboxGrid";
    const translatedOpts = getTranslatedOptions();

    for (let i = 0; i < state.options.length; i++) {
      const option = state.options[i];
      // Skip "Sauce" — handled by sauce question above
      if (option === "Sauce") continue;
      const optionLabel = translatedOpts[i] || option;
      const label = document.createElement("label");
      label.className = "chk";
      const iconSvg = INGREDIENT_ICONS[option] || "";
      const isChecked = state.selectedOptions.has(option);
      label.innerHTML = `<input type="checkbox" data-option="${option}" ${isChecked ? 'checked' : ''} /> ${iconSvg} <span>${optionLabel}</span>`;
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedOptions.add(option);
        else state.selectedOptions.delete(option);
        const count = state.selectedOptions.size;
        state.donerboxExtraFee = count > 2 ? 1.50 : 0;
        feeHint.textContent = count > 2
          ? `${t("extraIngredientFee")} (${euro(1.50)})`
          : t("extraIngredientFee");
        feeHint.style.color = count > 2 ? "#b4232b" : "#8b7a65";
        updateModalSubtotal();
      });
      grid.appendChild(label);
    }
    area.appendChild(grid);

  } else if (isCurry) {
    // Currysauce question
    const currySection = document.createElement("div");
    currySection.style.cssText = "margin-bottom:18px;padding:12px 16px;border-radius:14px;background:rgba(255,160,0,.08);border:2px solid rgba(255,160,0,.2);";
    currySection.innerHTML = `
      <div style="font-weight:700;font-size:16px;color:#2b170b;margin-bottom:10px">${t("currySauceQuestion")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button type="button" class="currySauceBtn" data-curry="yes" style="padding:12px;border-radius:12px;border:2px solid ${state.currySauceWanted === true ? '#5cb85c' : 'rgba(112,77,45,.15)'};background:${state.currySauceWanted === true ? 'rgba(92,184,92,.15)' : 'rgba(255,255,255,.7)'};cursor:pointer;font-weight:700;font-size:15px">✓ ${t("withCurrySauce")}</button>
        <button type="button" class="currySauceBtn" data-curry="no" style="padding:12px;border-radius:12px;border:2px solid ${state.currySauceWanted === false ? '#d6281f' : 'rgba(112,77,45,.15)'};background:${state.currySauceWanted === false ? 'rgba(214,40,31,.08)' : 'rgba(255,255,255,.7)'};cursor:pointer;font-weight:700;font-size:15px">✗ ${t("withoutCurrySauce")}</button>
      </div>
    `;
    for (const btn of currySection.querySelectorAll(".currySauceBtn")) {
      btn.addEventListener("click", () => {
        state.currySauceWanted = btn.dataset.curry === "yes";
        for (const b of currySection.querySelectorAll(".currySauceBtn")) {
          const isYes = b.dataset.curry === "yes";
          const isActive = (isYes && state.currySauceWanted) || (!isYes && !state.currySauceWanted);
          b.style.borderColor = isActive ? (isYes ? "#5cb85c" : "#d6281f") : "rgba(112,77,45,.15)";
          b.style.background = isActive ? (isYes ? "rgba(92,184,92,.15)" : "rgba(214,40,31,.08)") : "rgba(255,255,255,.7)";
        }
      });
    }
    area.appendChild(currySection);

    // Extras inline for curry products
    if (state.extras.length > 0) {
      renderExtrasInModal(area);
    }

  } else if (product.optionsEnabled) {
    const STANDARD_COUNT = 6;
    const standardCheckboxes = [];
    const allCheckboxes = [];

    const mitAllemBtn = document.createElement("button");
    mitAllemBtn.type = "button";
    mitAllemBtn.className = "btn btn--primary btn--full";
    mitAllemBtn.style.marginBottom = "12px";
    const allStdSelected = state.allOptionsSelected || (() => {
      let c = 0;
      for (let i = 0; i < Math.min(STANDARD_COUNT, state.options.length); i++) {
        if (state.selectedOptions.has(state.options[i])) c++;
      }
      return c === Math.min(STANDARD_COUNT, state.options.length) && c > 0;
    })();
    mitAllemBtn.textContent = allStdSelected ? t("deselectAll") : t("withAll");

    mitAllemBtn.addEventListener("click", () => {
      const allStandardChecked = standardCheckboxes.every(cb => cb.checked);
      for (const cb of standardCheckboxes) {
        cb.checked = !allStandardChecked;
        if (cb.checked) state.selectedOptions.add(cb.dataset.option);
        else state.selectedOptions.delete(cb.dataset.option);
      }
      state.allOptionsSelected = !allStandardChecked;
      mitAllemBtn.textContent = !allStandardChecked ? t("deselectAll") : t("withAll");
    });

    area.appendChild(mitAllemBtn);

    // Standard ingredients
    const title = document.createElement("div");
    title.className = "muted small";
    title.style.marginBottom = "8px";
    title.textContent = t("chooseIngredients");
    area.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "checkboxGrid";
    const translatedOpts = getTranslatedOptions();

    let nurFleischCheckbox = null;

    // Helper: when "Nur Fleisch" is checked, disable all other checkboxes
    function updateNurFleischState() {
      const isNurFleisch = nurFleischCheckbox && nurFleischCheckbox.checked;
      for (const cb of allCheckboxes) {
        if (cb === nurFleischCheckbox) continue;
        if (isNurFleisch) {
          cb.checked = false;
          cb.disabled = true;
          state.selectedOptions.delete(cb.dataset.option);
          cb.closest("label").style.opacity = "0.4";
        } else {
          cb.disabled = false;
          cb.closest("label").style.opacity = "1";
        }
      }
      if (isNurFleisch) {
        state.allOptionsSelected = false;
        mitAllemBtn.textContent = t("withAll");
        mitAllemBtn.disabled = true;
        mitAllemBtn.style.opacity = "0.4";
      } else {
        mitAllemBtn.disabled = false;
        mitAllemBtn.style.opacity = "1";
      }
    }

    for (let i = 0; i < Math.min(STANDARD_COUNT, state.options.length); i++) {
      const option = state.options[i];
      const optionLabel = translatedOpts[i] || option;
      const label = document.createElement("label");
      label.className = "chk";
      const iconSvg = INGREDIENT_ICONS[option] || "";
      const isChecked = state.selectedOptions.has(option);
      label.innerHTML = `<input type="checkbox" data-option="${option}" ${isChecked ? 'checked' : ''} /> ${iconSvg} <span>${optionLabel}</span>`;
      const checkbox = label.querySelector("input");
      standardCheckboxes.push(checkbox);
      allCheckboxes.push(checkbox);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedOptions.add(option);
        else state.selectedOptions.delete(option);
        state.allOptionsSelected = standardCheckboxes.every(cb => cb.checked);
        mitAllemBtn.textContent = state.allOptionsSelected ? t("deselectAll") : t("withAll");
      });
      grid.appendChild(label);
    }
    area.appendChild(grid);

    // Optional ingredients
    if (state.options.length > STANDARD_COUNT) {
      const optTitle = document.createElement("div");
      optTitle.className = "muted small";
      optTitle.style.marginBottom = "8px";
      optTitle.style.marginTop = "16px";
      optTitle.textContent = t("optionalIngredients");
      area.appendChild(optTitle);

      const optGrid = document.createElement("div");
      optGrid.className = "checkboxGrid";
      for (let i = STANDARD_COUNT; i < state.options.length; i++) {
        const option = state.options[i];
        const optionLabel = translatedOpts[i] || option;
        const label = document.createElement("label");
        label.className = "chk";
        const iconSvg = INGREDIENT_ICONS[option] || "";
        const isChecked = state.selectedOptions.has(option);
        label.innerHTML = `<input type="checkbox" data-option="${option}" ${isChecked ? 'checked' : ''} /> ${iconSvg} <span>${optionLabel}</span>`;
        const checkbox = label.querySelector("input");
        allCheckboxes.push(checkbox);
        if (option === "Nur Fleisch") nurFleischCheckbox = checkbox;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) state.selectedOptions.add(option);
          else state.selectedOptions.delete(option);
          if (option === "Nur Fleisch") updateNurFleischState();
        });
        optGrid.appendChild(label);
      }
      area.appendChild(optGrid);

      // Apply initial state if "Nur Fleisch" was pre-selected (edit mode)
      if (nurFleischCheckbox && nurFleischCheckbox.checked) updateNurFleischState();
    }

    // Extras section integrated into options modal
    if (state.extras.length > 0) {
      renderExtrasInModal(area);
    }
  }

  // Note field
  const noteSection = document.createElement("div");
  noteSection.style.cssText = "margin-top:16px;";
  noteSection.innerHTML = `
    <div style="margin-bottom:6px;font-weight:700;font-size:15px;color:#2b170b">${t("note")}</div>
    <input type="text" id="productNoteInput" class="accessFullscreen__input" style="font-size:17px;font-weight:600;padding:12px 16px;text-align:left;border-radius:12px" placeholder="${t("notePlaceholder")}" value="${state.productNote}" maxlength="100" />
    <div id="noteError" style="color:#b4232b;font-size:12px;margin-top:4px;min-height:16px"></div>
  `;
  area.appendChild(noteSection);
  const noteInput = noteSection.querySelector("#productNoteInput");
  noteInput.addEventListener("input", () => {
    const words = noteInput.value.trim().split(/\s+/).filter(Boolean);
    const errEl = noteSection.querySelector("#noteError");
    if (words.length > 7) {
      errEl.textContent = t("noteMaxWords");
    } else {
      errEl.textContent = "";
      state.productNote = noteInput.value.trim();
    }
  });

  openBackdrop();
  document.getElementById("optionsModal").classList.remove("hidden");
  updateModalSubtotal();
}

function renderExtrasInModal(area) {
  const extrasTitle = document.createElement("div");
  extrasTitle.className = "muted small";
  extrasTitle.style.marginBottom = "8px";
  extrasTitle.style.marginTop = "18px";
  extrasTitle.style.fontWeight = "700";
  extrasTitle.textContent = t("extras");
  area.appendChild(extrasTitle);

  const grid = document.createElement("div");
  grid.className = "extrasGrid";

  for (const extra of state.extras) {
    const card = document.createElement("label");
    card.className = "extraCard";
    const isSelected = state.selectedExtras.some(e => e.id === extra.id);
    if (isSelected) card.classList.add("extraCard--selected");
    const iconSvg = EXTRA_ICONS[extra.id] || "";
    const translatedExtraName = extraName(extra);
    card.innerHTML = `
      <input type="checkbox" data-extra-id="${extra.id}" ${isSelected ? 'checked' : ''} />
      <div class="extraCard__icon">${iconSvg}</div>
      <div class="extraCard__info">
        <div class="extraCard__name">${translatedExtraName}</div>
        <div class="extraCard__price">+${euro(extra.price)}</div>
      </div>
    `;
    const cb = card.querySelector("input");
    cb.addEventListener("change", () => {
      card.classList.toggle("extraCard--selected", cb.checked);
      if (cb.checked) state.selectedExtras.push({ id: extra.id, name: translatedExtraName, price: extra.price });
      else state.selectedExtras = state.selectedExtras.filter(e => e.id !== extra.id);
      updateModalSubtotal();
    });
    grid.appendChild(card);
  }
  area.appendChild(grid);
}

function closeOptions() {
  document.getElementById("optionsModal").classList.add("hidden");
  const em = document.getElementById("extrasModal");
  if (!em || em.classList.contains("hidden")) closeBackdrop();
}

function setQty(qty) {
  state.selectedQty = Math.max(1, Math.min(20, qty));
  document.getElementById("qtyValue").textContent = String(state.selectedQty);
  updateModalSubtotal();
}

function updateModalSubtotal() {
  const el = document.getElementById("modalSubtotal");
  if (!el || !state.selectedProduct) return;
  const extrasTotal = state.selectedExtras.reduce((s, e) => s + e.price, 0);
  const subtotal = (state.selectedProduct.price + state.donerboxExtraFee + extrasTotal) * state.selectedQty;
  el.textContent = `${t("subtotal")}: ${euro(subtotal)}`;
}

/* ── Extras ── */
function proceedToExtras() {
  // Validate note
  const noteWords = state.productNote.trim().split(/\s+/).filter(Boolean);
  if (noteWords.length > 7) {
    showAppNotice(t("noteMaxWords"), "error");
    return;
  }

  // Validate Dönerbox base selection
  const isDonerbox = state.selectedCategory?.id === "donerbox" && (state.selectedProduct?.id === "donerbox_19" || state.selectedProduct?.id === "donerbox_20");
  if (isDonerbox && !state.donerboxBase) {
    showAppNotice(t("riceOrFries"), "error");
    return;
  }

  // If product has optionsEnabled or is curry, extras are already in the modal → go straight to finalize
  if (state.selectedProduct?.optionsEnabled || CURRY_IDS.has(state.selectedProduct?.id)) {
    document.getElementById("optionsModal").classList.add("hidden");
    finalizeAddToCart();
    return;
  }

  // For products WITHOUT optionsEnabled: show extras modal
  document.getElementById("optionsModal").classList.add("hidden");
  if (state.extras.length === 0) { finalizeAddToCart(); return; }

  state.selectedExtras = [];
  const nameEl = document.getElementById("extrasProductName");
  if (nameEl) nameEl.textContent = itemName(state.selectedProduct) || "";

  const area = document.getElementById("extrasArea");
  area.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "extrasGrid";

  for (const extra of state.extras) {
    const card = document.createElement("label");
    card.className = "extraCard";
    const iconSvg = EXTRA_ICONS[extra.id] || "";
    const translatedExtraName = extraName(extra);
    card.innerHTML = `
      <input type="checkbox" data-extra-id="${extra.id}" />
      <div class="extraCard__icon">${iconSvg}</div>
      <div class="extraCard__info">
        <div class="extraCard__name">${translatedExtraName}</div>
        <div class="extraCard__price">+${euro(extra.price)}</div>
      </div>
    `;
    const cb = card.querySelector("input");
    cb.addEventListener("change", () => {
      card.classList.toggle("extraCard--selected", cb.checked);
      if (cb.checked) state.selectedExtras.push({ id: extra.id, name: translatedExtraName, price: extra.price });
      else state.selectedExtras = state.selectedExtras.filter(e => e.id !== extra.id);
    });
    grid.appendChild(card);
  }
  area.appendChild(grid);
  document.getElementById("extrasModal").classList.remove("hidden");
}

function closeExtrasModal() {
  document.getElementById("extrasModal").classList.add("hidden");
  closeBackdrop();
}

function finalizeAddToCart() {
  const product = state.selectedProduct;
  if (!product) return;
  state.cart = sanitizeCart(state.cart);

  const STANDARD_COUNT = 6;
  const options = [...state.selectedOptions].sort((a, b) => {
    // "Sauce" always first
    if (a === "Sauce") return -1;
    if (b === "Sauce") return 1;
    return a.localeCompare(b);
  });
  const extras = state.selectedExtras.map(e => ({ id: e.id, name: e.name, price: e.price }));
  const extrasKey = extras.map(e => e.id).sort().join(",");
  const donerboxBaseKey = state.donerboxBase || "";
  const note = state.productNote.trim();

  // "Mit allem ohne" logic: if >=4 of first 6 standard ingredients are selected
  let allOptions = false;
  let allOptionsExcept = null;
  const standardOptions = state.options.slice(0, STANDARD_COUNT);
  const selectedStandard = standardOptions.filter(o => state.selectedOptions.has(o));
  const unselectedStandard = standardOptions.filter(o => !state.selectedOptions.has(o));

  // Separate optional ingredients (index >= STANDARD_COUNT) that were selected
  const optionalSelected = state.options.slice(STANDARD_COUNT).filter(o => state.selectedOptions.has(o));

  if (product.optionsEnabled && selectedStandard.length >= 4 && unselectedStandard.length > 0 && unselectedStandard.length <= 2) {
    allOptions = false;
    allOptionsExcept = unselectedStandard;
  } else if (state.allOptionsSelected || selectedStandard.length === standardOptions.length) {
    allOptions = true;
  }

  const keyParts = allOptionsExcept ? `OHNE_${allOptionsExcept.join("|")}` : (allOptions ? "MIT_ALLEM" : options.join("|"));
  const breadKey = state.breadWanted != null ? (state.breadWanted ? "BROT" : "KEIN_BROT") : "";
  const sauceKey = state.sauceWanted != null ? (state.sauceWanted ? "SAUCE" : "KEINE_SAUCE") : "";
  const curryKey = state.currySauceWanted != null ? (state.currySauceWanted ? "CURRY" : "KEINE_CURRY") : "";
  const key = [product.id, state.selectedCategory?.id || "", keyParts, extrasKey, donerboxBaseKey, breadKey, sauceKey, curryKey, note].join("::");
  const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
  const donerboxFee = state.donerboxExtraFee || 0;

  const translatedProductName = itemName(product);

  // Build options list - add Dönerbox base (Reis/Pommes/Ohne) as first option
  let finalOptions = options;
  if (state.donerboxBase === "reis") {
    finalOptions = [t("rice"), ...options];
  } else if (state.donerboxBase === "pommes") {
    finalOptions = [t("fries"), ...options];
  } else if (state.donerboxBase === "ohne") {
    finalOptions = [`${t("without")} Reis & Pommes`, ...options];
  }

  const newItem = {
    key, productId: product.id, name: product.name, displayName: translatedProductName,
    price: product.price + extrasTotal + donerboxFee, basePrice: product.price,
    categoryId: state.selectedCategory?.id ?? null,
    categoryTitle: state.selectedCategory?.title ?? null,
    allOptions, allOptionsExcept: allOptionsExcept || null,
    optionalIngredients: optionalSelected.length > 0 ? optionalSelected : null,
    options: finalOptions, extras, qty: state.selectedQty,
    donerboxBase: state.donerboxBase || null,
    donerboxExtraFee: donerboxFee,
    breadWanted: state.breadWanted,
    sauceWanted: state.sauceWanted,
    currySauceWanted: state.currySauceWanted,
    note: note || null,
    isDrink: product.isDrink || false
  };

  if (state.editingCartIndex >= 0) {
    // Replace existing cart item
    state.cart[state.editingCartIndex] = newItem;
    state.editingCartIndex = -1;
  } else {
    const existing = state.cart.find(i => i.key === key);
    if (existing) {
      existing.qty += state.selectedQty;
    } else {
      state.cart.push(newItem);
    }
  }

  saveCart();
  renderCart();
  closeExtrasModal();
  closeOptions();
  showAppNotice(`${translatedProductName} ${t("added")}`, "success");
}

/* ── Cart ── */
function openCart() {
  document.getElementById("cartDrawer").classList.remove("hidden");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.getElementById("cartDrawer").classList.add("hidden");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
}

function renderCart() {
  state.cart = sanitizeCart(state.cart);
  const root = document.getElementById("cartItems");
  root.innerHTML = "";
  const sidebarRoot = document.getElementById("kioskSidebarItems");
  const sidebarTotal = document.getElementById("kioskSidebarTotal");
  const mobileTotal = document.getElementById("kioskMobileTotal");
  const mobileDock = document.querySelector(".kioskMobileDock");
  const checkoutBtns = [document.getElementById("checkoutBtn"), document.getElementById("kioskCheckoutBtn"), document.getElementById("kioskMobileCheckoutBtn")].filter(Boolean);
  const clearBtns = [document.getElementById("clearCartBtn"), document.getElementById("drawerClearCartBtn")].filter(Boolean);

  if (sidebarRoot) sidebarRoot.innerHTML = "";

  if (state.cart.length === 0) {
    root.innerHTML = `<div class="muted">${t("emptyCart")}</div>`;
    document.getElementById("cartTotal").textContent = euro(0);
    if (sidebarRoot) {
      sidebarRoot.innerHTML = `
        <div class="kioskSummaryEmpty">
          <div class="kioskSummaryEmpty__icon">+</div>
          <div class="kioskSummaryEmpty__title">${t("emptyTitle")}</div>
          <div class="kioskSummaryEmpty__text">${t("emptyText")}</div>
        </div>
      `;
    }
    if (sidebarTotal) sidebarTotal.textContent = euro(0);
    if (mobileTotal) mobileTotal.textContent = euro(0);
    for (const b of checkoutBtns) b.disabled = true;
    for (const b of clearBtns) b.disabled = true;
    if (mobileDock) mobileDock.classList.add("is-empty");
    renderKioskQuickMeta();
    return;
  }

  let total = 0;
  for (const item of state.cart) {
    total += item.price * item.qty;
    const card = document.createElement("div");
    card.className = "cartItem";
    const meta = composeItemMeta(item);
    const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;
    const extrasSubtotal = hasExtras ? item.extras.reduce((s, e) => s + e.price, 0) : 0;
    card.innerHTML = `
      <div class="cartItem__top">
        <div>
          <div class="cartItem__name">${item.name}</div>
          ${meta ? `<div class="cartItem__opts">${meta}</div>` : ""}
          ${hasExtras ? `<div class="cartItem__priceBreakdown">${euro(item.basePrice || item.price)} + ${euro(extrasSubtotal)} Extras</div>` : ""}
        </div>
        <div><strong>${euro(item.price * item.qty)}</strong></div>
      </div>
      ${item.note ? `<div class="cartItem__note">"${item.note}"</div>` : ""}
      <div class="cartItem__actions">
        <button class="btn" data-act="minus">−</button>
        <div class="cartItem__qty">${item.qty}</div>
        <button class="btn" data-act="plus">+</button>
        <button class="btn" data-act="edit" style="margin-left:auto;border-color:rgba(79,140,255,.35)">${t("edit")}</button>
        <button class="btn" data-act="remove" style="border-color:rgba(255,90,95,.35)">${t("remove")}</button>
      </div>
    `;
    card.querySelector('[data-act="minus"]').addEventListener("click", () => { item.qty = Math.max(1, item.qty - 1); saveCart(); renderCart(); });
    card.querySelector('[data-act="plus"]').addEventListener("click", () => { item.qty = Math.min(50, item.qty + 1); saveCart(); renderCart(); });
    card.querySelector('[data-act="remove"]').addEventListener("click", () => { state.cart = state.cart.filter(e => e.key !== item.key); saveCart(); renderCart(); });
    const editBtn = card.querySelector('[data-act="edit"]');
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const idx = state.cart.indexOf(item);
        if (idx < 0) return;
        // Find product in products data
        let foundProduct = null;
        let foundCategory = null;
        for (const cat of (state.products?.categories || [])) {
          const prod = cat.items.find(p => p.id === item.productId);
          if (prod) { foundProduct = prod; foundCategory = cat; break; }
        }
        if (!foundProduct) return;
        closeCart();
        openProduct(foundProduct, foundCategory, idx);
      });
    }
    root.appendChild(card);

    if (sidebarRoot) {
      const row = document.createElement("div");
      row.className = "kioskSummaryItem";
      row.innerHTML = `
        <div class="kioskSummaryItem__head">
          <div class="kioskSummaryItem__qty">${item.qty}x</div>
          <div class="kioskSummaryItem__name">${item.name}</div>
          <div class="kioskSummaryItem__price">${euro(item.price * item.qty)}</div>
        </div>
        ${meta ? `<div class="kioskSummaryItem__meta">${meta}</div>` : ""}
      `;
      sidebarRoot.appendChild(row);
    }
  }

  document.getElementById("cartTotal").textContent = euro(total);
  if (sidebarTotal) sidebarTotal.textContent = euro(total);
  if (mobileTotal) mobileTotal.textContent = euro(total);
  for (const b of checkoutBtns) b.disabled = false;
  for (const b of clearBtns) b.disabled = false;
  if (mobileDock) mobileDock.classList.remove("is-empty");
  renderKioskQuickMeta();
}

function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById("confirmBackdrop");
    const dialog = document.getElementById("confirmDialog");
    const msgEl = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");
    msgEl.textContent = message;
    backdrop.classList.remove("hidden");
    dialog.classList.remove("hidden");

    function cleanup(result) {
      backdrop.classList.add("hidden");
      dialog.classList.add("hidden");
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", onNo);
      backdrop.removeEventListener("click", onNo);
      resolve(result);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }
    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
    backdrop.addEventListener("click", onNo);
  });
}

async function cancelOrder() {
  const confirmed = await showConfirmDialog(t("cancelConfirm"));
  if (!confirmed) return;
  localStorage.removeItem("customerName");
  localStorage.removeItem("dineOption");
  clearCart();
  redirectToAccess();
}

function changeName() {
  localStorage.removeItem("customerName");
  localStorage.removeItem("dineOption");
  clearCart();
  redirectToAccess();
}

/* ── Checkout Flow ── */
function startCheckout() {
  if (state.cart.length === 0) { showAppNotice(t("cartEmpty"), "info"); return; }
  closeCart();
  closeBackdrop();
  if (state.checkoutDine) {
    document.getElementById("paymentScreen").classList.remove("hidden");
  } else {
    document.getElementById("dineScreen").classList.remove("hidden");
  }
}

function setupCheckoutListeners() {
  for (const btn of document.querySelectorAll("[data-dine]")) {
    btn.addEventListener("click", () => {
      state.checkoutDine = btn.dataset.dine;
      if (btn.dataset.dine === "imauto") {
        // Show car fields modal
        document.getElementById("dineScreen").classList.add("hidden");
        document.getElementById("carScreen").classList.remove("hidden");
        return;
      }
      document.getElementById("dineScreen").classList.add("hidden");
      document.getElementById("paymentScreen").classList.remove("hidden");
    });
  }
  // Car screen submit
  const carSubmitBtn = document.getElementById("carSubmitBtn");
  if (carSubmitBtn) {
    carSubmitBtn.addEventListener("click", () => {
      const brand = document.getElementById("carBrandInput")?.value.trim();
      const color = document.getElementById("carColorInput")?.value.trim();
      if (!brand || !color) {
        showAppNotice(t("carFieldsRequired"), "error");
        return;
      }
      state.carBrand = brand;
      state.carColor = color;
      document.getElementById("carScreen").classList.add("hidden");
      document.getElementById("paymentScreen").classList.remove("hidden");
    });
  }
  // Car screen "Zurück" button → back to dine options
  const carBackBtn = document.getElementById("carBackBtn");
  if (carBackBtn) {
    carBackBtn.addEventListener("click", () => {
      document.getElementById("carScreen").classList.add("hidden");
      document.getElementById("dineScreen").classList.remove("hidden");
    });
  }
  for (const btn of document.querySelectorAll("[data-payment]")) {
    btn.addEventListener("click", async () => {
      state.checkoutPayment = btn.dataset.payment;
      document.getElementById("paymentScreen").classList.add("hidden");
      await sendOrder();
    });
  }
  // Payment screen "Zurück" button
  const paymentBackBtn = document.getElementById("paymentBackBtn");
  if (paymentBackBtn) {
    paymentBackBtn.addEventListener("click", () => {
      document.getElementById("paymentScreen").classList.add("hidden");
    });
  }
}

async function sendOrder() {
  const payload = {
    customerName: state.customerName,
    paymentMethod: state.checkoutPayment || "bar",
    dineOption: state.checkoutDine || "hieressen",
    carBrand: state.carBrand || null,
    carColor: state.carColor || null,
    items: state.cart.map(item => ({
      productId: item.productId, name: item.name, price: item.price, qty: item.qty,
      categoryId: item.categoryId ?? null, categoryTitle: item.categoryTitle ?? null,
      allOptions: item.allOptions || false, allOptionsExcept: item.allOptionsExcept || null, optionalIngredients: item.optionalIngredients || null,
      options: item.options, extras: item.extras || [],
      breadWanted: item.breadWanted ?? null,
      sauceWanted: item.sauceWanted ?? null,
      currySauceWanted: item.currySauceWanted ?? null,
      note: item.note || null,
      isDrink: item.isDrink || false
    }))
  };

  try {
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(translateError(data?.error, t("orderError")));
    showThankYouScreen();
  } catch (error) {
    // Show error as fullscreen overlay so it's always visible
    showErrorOverlay(`${t("errorPrefix")} ${translateError(error.message, t("unknownError"))}`);
  }
}

function showErrorOverlay(message) {
  // Hide any open overlays
  for (const el of document.querySelectorAll(".fullscreenOverlay")) el.classList.add("hidden");
  // Show error in a temporary fullscreen overlay
  const overlay = document.createElement("div");
  overlay.className = "fullscreenOverlay";
  overlay.innerHTML = `
    <div class="fullscreenOverlay__content">
      <div style="font-size:60px;margin-bottom:16px">⚠</div>
      <div class="fullscreenOverlay__title" style="color:#b4232b">${message}</div>
      <button class="btn btn--primary" style="margin-top:24px;padding:16px 40px;font-size:18px;font-weight:800;border-radius:16px" data-i18n="tryAgain">${t("tryAgain")}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("button").addEventListener("click", () => {
    overlay.remove();
  });
}

function showThankYouScreen() {
  document.getElementById("thankYouName").textContent = state.customerName;
  const itemsEl = document.getElementById("thankYouItems");
  itemsEl.innerHTML = "";
  let total = 0;

  for (const item of state.cart) {
    total += item.price * item.qty;
    const div = document.createElement("div");
    div.className = "fullscreenOverlay__summaryItem";
    const meta = composeItemMeta(item);
    div.innerHTML = `
      <div>
        <strong>${item.qty}x ${item.name}</strong>
        ${meta ? `<div style="font-size:12px;color:#8b7a65;margin-top:2px">${meta}</div>` : ""}
      </div>
      <span>${euro(item.price * item.qty)}</span>
    `;
    itemsEl.appendChild(div);
  }

  document.getElementById("thankYouTotal").textContent = `${t("totalLabel")} ${euro(total)}`;
  document.getElementById("thankYouScreen").classList.remove("hidden");
  clearCart();

  setTimeout(() => {
    localStorage.removeItem("customerName");
    localStorage.removeItem("cart_v1");
    localStorage.removeItem("dineOption");
    localStorage.removeItem("carBrand");
    localStorage.removeItem("carColor");
    redirectToAccess();
  }, 5000);
}

init();
