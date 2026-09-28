// What this device remembers. Storage can be unavailable (private mode, blocked site data);
// then nothing is remembered and the defaults apply.

export function load(name, fallback = "") {
  try {
    return localStorage.getItem(name) ?? fallback;
  } catch {
    return fallback;
  }
}

export function save(name, value) {
  try {
    if (value) localStorage.setItem(name, value);
    else localStorage.removeItem(name);
  } catch {}
}
