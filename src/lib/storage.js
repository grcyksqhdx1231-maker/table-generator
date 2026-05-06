const STORAGE_KEYS = {
  drafts: "table-generator-drafts",
  profile: "table-generator-profile",
  favorites: "table-generator-favorites",
  cart: "table-generator-cart",
  galleryUploads: "table-generator-gallery-uploads",
  tradeInLeads: "table-generator-tradein-leads"
};

function loadJson(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function saveJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadDrafts() {
  const parsed = loadJson(STORAGE_KEYS.drafts, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveDrafts(drafts) {
  saveJson(STORAGE_KEYS.drafts, drafts);
}

export function loadProfile() {
  const parsed = loadJson(STORAGE_KEYS.profile, {
    name: "",
    account: ""
  });

  const {
    name = "",
    account = ""
  } = parsed || {};

  return { name, account };
}

export function saveProfile(profile) {
  const {
    name = "",
    account = ""
  } = profile || {};

  saveJson(STORAGE_KEYS.profile, { name, account });
}

export function loadFavorites() {
  const parsed = loadJson(STORAGE_KEYS.favorites, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveFavorites(favorites) {
  saveJson(STORAGE_KEYS.favorites, favorites);
}

export function loadCart() {
  const parsed = loadJson(STORAGE_KEYS.cart, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveCart(cart) {
  saveJson(STORAGE_KEYS.cart, cart);
}

export function loadGalleryUploads() {
  const parsed = loadJson(STORAGE_KEYS.galleryUploads, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveGalleryUploads(items) {
  saveJson(STORAGE_KEYS.galleryUploads, items);
}

export function loadTradeInLeads() {
  const parsed = loadJson(STORAGE_KEYS.tradeInLeads, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveTradeInLeads(leads) {
  saveJson(STORAGE_KEYS.tradeInLeads, leads);
}
