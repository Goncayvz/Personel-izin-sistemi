const STORAGE_KEY = "pis_api_base_url";

export function normalizeBaseUrl(value) {
  const url = String(value ?? "").trim().replace(/\/+$/, "");
  return url;
}

export function getApiBaseUrl() {
  const saved = normalizeBaseUrl(localStorage.getItem(STORAGE_KEY));
  if (saved) return saved;
  return "http://localhost:5000";
}

export function setApiBaseUrl(value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    localStorage.removeItem(STORAGE_KEY);
    return getApiBaseUrl();
  }
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
}

