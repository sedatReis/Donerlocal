const CHICKEN_VEAL_CATEGORY_ID = "chicken_veal";
const CHICKEN_VEAL_CHOICES = ["Kalbfleisch", "Hühnerfleisch"];
const GUEST_META_REFRESH_MS = 15_000;
const NOTICE_TIMEOUT_MS = 3200;

const state = {
  products: null,
  options: [],
  selectedProduct: null,
  selectedCategory: null,
  selectedQty: 1,
  selectedMeatType: null,
  selectedOptions: new Set(),
  cart: loadCart(),
  guest: null,
  guestMetaTimer: null,
  noticeTimer: null
};

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

function redirectToAccess() {
  window.location.replace("/access.html");
}

function toGermanError(message, fallback = "Ein Fehler ist aufgetreten.") {
  const text = String(message || "").trim();
  if (!text) return fallback;

  const known = {
    Unauthorized: "Deine Sitzung ist abgelaufen. Bitte gib die Nummer erneut ein.",
    "username and password are required": "Bitte Benutzername und Passwort eingeben.",
    "Invalid credentials": "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.",
    "number is required": "Bitte eine Nummer eingeben.",
    "Invalid or expired number": "Die Nummer ist ungültig oder abgelaufen.",
    "tableNumber is required": "Bitte eine Tischnummer eingeben.",
    "items is required": "Bitte mindestens ein Produkt auswählen.",
    "No free access numbers available": "Aktuell sind keine freien Nummern verfügbar.",
    "Access number not found": "Nummer wurde nicht gefunden.",
    "Order not found": "Bestellung wurde nicht gefunden.",
    "Cannot read products.json": "Die Speisekarte konnte nicht geladen werden."
  };

  if (known[text]) return known[text];
  if (text.startsWith("HTTP ")) return "Es gab ein Verbindungsproblem. Bitte erneut versuchen.";
  return text;
}

function showAppNotice(message, type = "info") {
  const notice = document.getElementById("appNotice");
  if (!notice) return;

  clearTimeout(state.noticeTimer);
  notice.textContent = message;
  notice.classList.remove("hidden", "appNotice--info", "appNotice--success", "appNotice--error");
  notice.classList.add(`appNotice--${type}`);

  state.noticeTimer = setTimeout(() => {
    notice.classList.add("hidden");
  }, NOTICE_TIMEOUT_MS);
}

function saveCart() {
  localStorage.setItem("cart_v1", JSON.stringify(state.cart));
  updateCartBadge();
}

function loadCart() {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem("cart_v1") || "[]"));
  } catch {
    return [];
  }
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCart();
}

function updateCartBadge() {
  state.cart = sanitizeCart(state.cart);
  const count = state.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  document.getElementById("cartCount").textContent = String(count);
  syncCartAttention(count > 0);
}

function syncCartAttention(hasItems) {
  const cartButton = document.getElementById("openCartBtn");
  const badge = document.getElementById("cartCount");
  if (!cartButton || !badge) return;

  if (hasItems) {
    cartButton.classList.add("is-cart-attention");
    badge.classList.add("is-badge-attention");
  } else {
    cartButton.classList.remove("is-cart-attention");
    badge.classList.remove("is-badge-attention");
  }
}

function renderGuestMeta() {
  const target = document.getElementById("guestMeta");
  if (!target || !state.guest) {
    return;
  }

  const msLeft = (state.guest.expiresAt ?? 0) - Date.now();
  if (msLeft <= 0) {
    redirectToAccess();
    return;
  }
  const minsLeft = Math.max(1, Math.ceil(msLeft / 60_000));
  target.textContent = `Nummer ${state.guest.number} · gültig ${minsLeft} min`;
  target.classList.remove("hidden");
}

async function ensureGuestSession() {
  const res = await fetch("/api/guest/me", { credentials: "same-origin" });
  if (res.status === 401) {
    redirectToAccess();
    return false;
  }
  if (!res.ok) {
    throw new Error("Gast-Session konnte nicht geladen werden.");
  }

  const data = await res.json();
  state.guest = data?.guest ?? null;
  renderGuestMeta();
  if (state.guestMetaTimer) {
    clearInterval(state.guestMetaTimer);
  }
  state.guestMetaTimer = setInterval(renderGuestMeta, GUEST_META_REFRESH_MS);
  return true;
}

async function init() {
  try {
    const hasSession = await ensureGuestSession();
    if (!hasSession) return;

    const res = await fetch("/api/products", { credentials: "same-origin" });
    if (res.status === 401) {
      redirectToAccess();
      return;
    }
    if (!res.ok) {
      throw new Error("Speisekarte konnte nicht geladen werden.");
    }

    state.products = await res.json();
    state.options = state.products.defaultOptions || [];
    renderMenu();
    wireUI();
    updateCartBadge();
  } catch (error) {
    showAppNotice(toGermanError(error.message, "Fehler beim Laden."), "error");
  }
}

function renderMenu() {
  const root = document.getElementById("menu");
  root.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "menuGrid";

  for (const category of state.products.categories) {
    const card = document.createElement("section");
    card.className = "menuCard";

    const header = document.createElement("div");
    header.className = "menuCard__header";
    header.innerHTML = `<div class="menuCard__title">${category.title}</div>`;
    card.appendChild(header);

    const list = document.createElement("div");
    list.className = "menuList";

    for (const item of category.items) {
      const row = document.createElement("div");
      row.className = "menuItem";
      row.innerHTML = `
        <div class="thumb"><img alt="" src="/${item.image || ""}" onerror="this.remove();" /></div>
        <div>
          <div class="itemName">${item.name}</div>
          <div class="itemMeta">${item.optionsEnabled ? "mit Auswahl" : "ohne Auswahl"}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="price">${euro(item.price)}</div>
          <button class="btn btn--primary">+</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", () => openProduct(item, category));
      row.addEventListener("click", (event) => {
        if (event.target.tagName.toLowerCase() !== "button") {
          openProduct(item, category);
        }
      });
      list.appendChild(row);
    }

    card.appendChild(list);
    grid.appendChild(card);
  }

  root.appendChild(grid);
}

function wireUI() {
  bindClick("openCartBtn", openCart);
  bindClick("closeCartBtn", closeCart);
  bindClick("clearCartBtn", clearCart);
  bindClick("switchNumberBtn", switchNumber);

  bindClick("closeOptionsBtn", closeOptions);
  bindClick("qtyMinus", () => setQty(state.selectedQty - 1));
  bindClick("qtyPlus", () => setQty(state.selectedQty + 1));
  bindClick("addToCartBtn", addToCart);

  bindClick("checkoutBtn", openTableModal);
  bindClick("closeTableBtn", closeTableModal);
  bindClick("sendOrderBtn", sendOrder);

  bindClick("modalBackdrop", () => {
    closeOptions();
    closeTableModal();
  });

  renderCart();
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Element fehlt: #${id}`);
    return;
  }
  el.addEventListener("click", handler);
}

function openBackdrop() {
  document.getElementById("modalBackdrop").classList.remove("hidden");
}

function closeBackdrop() {
  document.getElementById("modalBackdrop").classList.add("hidden");
}

function needsChickenVealChoice(category) {
  return category?.id === CHICKEN_VEAL_CATEGORY_ID;
}

function composeItemMeta(item) {
  const parts = [];
  if (item.categoryTitle) parts.push(`Kategorie: ${item.categoryTitle}`);
  if (item.meatType) parts.push(`Fleisch: ${item.meatType}`);
  if (item.options?.length) parts.push(...item.options);
  return parts.length ? parts.join(", ") : "—";
}

function openProduct(product, category) {
  state.selectedProduct = product;
  state.selectedCategory = category ?? null;
  state.selectedQty = 1;
  state.selectedMeatType = null;
  state.selectedOptions = new Set();

  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalPrice").textContent = euro(product.price);
  document.getElementById("qtyValue").textContent = "1";

  const area = document.getElementById("optionsArea");
  area.innerHTML = "";
  const requiresMeatChoice = needsChickenVealChoice(state.selectedCategory);
  let optionsContainer = null;

  if (requiresMeatChoice) {
    const title = document.createElement("div");
    title.className = "muted small";
    title.style.marginBottom = "8px";
    title.textContent = "Fleischwahl (Pflicht): Kalbfleisch oder Hühnerfleisch";
    area.appendChild(title);

    const meatGrid = document.createElement("div");
    meatGrid.className = "checkboxGrid";
    meatGrid.style.marginBottom = "12px";

    for (const meatType of CHICKEN_VEAL_CHOICES) {
      const label = document.createElement("label");
      label.className = "chk";
      label.innerHTML = `<input type="radio" name="meatTypeChoice" /> <span>${meatType}</span>`;
      const radio = label.querySelector("input");
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        state.selectedMeatType = meatType;

        const waitingHint = document.getElementById("optionsWaitHint");
        if (waitingHint) {
          waitingHint.remove();
        }
        if (optionsContainer) {
          optionsContainer.classList.remove("hidden");
        }
      });
      meatGrid.appendChild(label);
    }

    area.appendChild(meatGrid);
  }

  if (product.optionsEnabled) {
    optionsContainer = document.createElement("div");
    if (requiresMeatChoice) {
      optionsContainer.classList.add("hidden");

      const waitingHint = document.createElement("div");
      waitingHint.id = "optionsWaitHint";
      waitingHint.className = "muted small";
      waitingHint.style.marginBottom = "8px";
      waitingHint.textContent = "Bitte zuerst Kalbfleisch oder Hühnerfleisch auswählen. Danach erscheinen die weiteren Optionen.";
      area.appendChild(waitingHint);
    }

    const grid = document.createElement("div");
    grid.className = "checkboxGrid";
    for (const option of state.options) {
      const label = document.createElement("label");
      label.className = "chk";
      label.innerHTML = `<input type="checkbox" /> <span>${option}</span>`;
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedOptions.add(option);
        else state.selectedOptions.delete(option);
      });
      grid.appendChild(label);
    }
    optionsContainer.appendChild(grid);
    area.appendChild(optionsContainer);
  } else if (!requiresMeatChoice) {
    area.innerHTML = `<div class="muted">Für dieses Produkt gibt es keine Auswahl.</div>`;
  }

  openBackdrop();
  document.getElementById("optionsModal").classList.remove("hidden");
}

function closeOptions() {
  document.getElementById("optionsModal").classList.add("hidden");
  if (document.getElementById("tableModal").classList.contains("hidden")) {
    closeBackdrop();
  }
}

function setQty(qty) {
  state.selectedQty = Math.max(1, Math.min(20, qty));
  document.getElementById("qtyValue").textContent = String(state.selectedQty);
}

function addToCart() {
  const product = state.selectedProduct;
  if (!product) return;
  state.cart = sanitizeCart(state.cart);

  if (needsChickenVealChoice(state.selectedCategory) && !state.selectedMeatType) {
    showAppNotice("Bitte zuerst Kalbfleisch oder Hühnerfleisch auswählen.", "info");
    return;
  }

  const options = [...state.selectedOptions].sort();
  const key = [
    product.id,
    state.selectedCategory?.id || "",
    state.selectedMeatType || "",
    options.join("|")
  ].join("::");

  const existing = state.cart.find((item) => item.key === key);
  if (existing) {
    existing.qty += state.selectedQty;
  } else {
    state.cart.push({
      key,
      productId: product.id,
      name: product.name,
      price: product.price,
      categoryId: state.selectedCategory?.id ?? null,
      categoryTitle: state.selectedCategory?.title ?? null,
      meatType: state.selectedMeatType || null,
      options,
      qty: state.selectedQty
    });
  }

  saveCart();
  renderCart();
  closeOptions();
}

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

  if (state.cart.length === 0) {
    root.innerHTML = `<div class="muted">Warenkorb ist leer.</div>`;
    document.getElementById("cartTotal").textContent = euro(0);
    return;
  }

  let total = 0;
  for (const item of state.cart) {
    total += item.price * item.qty;

    const card = document.createElement("div");
    card.className = "cartItem";
    const optionsText = composeItemMeta(item);

    card.innerHTML = `
      <div class="cartItem__top">
        <div>
          <div class="cartItem__name">${item.name}</div>
          <div class="cartItem__opts">${optionsText}</div>
        </div>
        <div><strong>${euro(item.price * item.qty)}</strong></div>
      </div>
      <div class="cartItem__actions">
        <button class="btn" data-act="minus">−</button>
        <div class="cartItem__qty">${item.qty}</div>
        <button class="btn" data-act="plus">+</button>
        <button class="btn" data-act="remove" style="margin-left:auto;border-color:rgba(255,90,95,.35)">Entfernen</button>
      </div>
    `;

    card.querySelector('[data-act="minus"]').addEventListener("click", () => {
      item.qty = Math.max(1, item.qty - 1);
      saveCart();
      renderCart();
    });
    card.querySelector('[data-act="plus"]').addEventListener("click", () => {
      item.qty = Math.min(50, item.qty + 1);
      saveCart();
      renderCart();
    });
    card.querySelector('[data-act="remove"]').addEventListener("click", () => {
      state.cart = state.cart.filter((entry) => entry.key !== item.key);
      saveCart();
      renderCart();
    });

    root.appendChild(card);
  }

  document.getElementById("cartTotal").textContent = euro(total);
}

async function switchNumber() {
  await fetch("/api/guest/logout", {
    method: "POST",
    credentials: "same-origin"
  }).catch(() => {});
  clearCart();
  redirectToAccess();
}

function openTableModal() {
  if (state.cart.length === 0) {
    showAppNotice("Warenkorb ist leer.", "info");
    return;
  }
  // Close drawer first so the table-number dialog is clearly in front.
  closeCart();
  document.getElementById("tableNumberInput").value = "";
  openBackdrop();
  document.getElementById("tableModal").classList.remove("hidden");
  document.getElementById("tableNumberInput").focus();
}

function closeTableModal() {
  document.getElementById("tableModal").classList.add("hidden");
  if (document.getElementById("optionsModal").classList.contains("hidden")) {
    closeBackdrop();
  }
}

async function sendOrder() {
  const tableNumber = document.getElementById("tableNumberInput").value.trim();
  if (!tableNumber) {
    showAppNotice("Bitte Tischnummer eingeben.", "error");
    document.getElementById("tableNumberInput").focus();
    return;
  }

  const payload = {
    tableNumber,
    items: state.cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      categoryId: item.categoryId ?? null,
      categoryTitle: item.categoryTitle ?? null,
      meatType: item.meatType ?? null,
      options: item.options
    }))
  };

  const button = document.getElementById("sendOrderBtn");
  button.disabled = true;
  button.textContent = "Wird gesendet...";

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      redirectToAccess();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(toGermanError(data?.error, "Bestellung konnte nicht gesendet werden."));

    showAppNotice("Bestellung wurde erfolgreich gesendet.", "success");
    clearCart();
    closeTableModal();
    closeCart();
  } catch (error) {
    showAppNotice(`Bestellung konnte nicht gesendet werden: ${toGermanError(error.message, "Unbekannter Fehler")}`, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Bestellung senden";
  }
}

init();
