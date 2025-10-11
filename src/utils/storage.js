// src/utils/storage.js
export function saveProductsToSession(key = 'rn_products', data) {
  try {
    const json = JSON.stringify(data);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    sessionStorage.setItem(key, b64);
    return true;
  } catch (e) {
    console.error('[storage] save error', e);
    return false;
  }
}

export function loadProductsFromSession(key = 'rn_products') {
  try {
    const b64 = sessionStorage.getItem(key);
    if (!b64) return null;
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (e) {
    console.warn('[storage] load error', e);
    return null;
  }
}

// optional cookie helpers (short-lived)
export function setCookie(name, value, days = 1) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  } catch (e) {
    /* ignore */
  }
}
export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
