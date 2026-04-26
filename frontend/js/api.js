import { getApiBaseUrl } from "./config.js";

function friendlyFieldName(field) {
  if (field === "adSoyad") return "Ad Soyad";
  if (field === "izinTuru") return "İzin Türü";
  if (field === "baslangicTarihi") return "Başlangıç Tarihi";
  if (field === "bitisTarihi") return "Bitiş Tarihi";
  if (field === "aciklama") return "Açıklama";
  return field;
}

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return "Eksik veya hatalı alanlar var.";
  const messages = errors.slice(0, 3).map((e) => {
    const loc = Array.isArray(e.loc) ? e.loc : [];
    const field = loc[loc.length - 1];
    const fieldLabel = field ? friendlyFieldName(String(field)) : null;
    const msg = e.msg ? String(e.msg) : "Geçersiz değer";
    return fieldLabel ? `${fieldLabel}: ${msg}` : msg;
  });
  return messages.join(" • ");
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = (() => {
      if (data && typeof data === "object") {
        if (Array.isArray(data.errors)) return formatValidationErrors(data.errors);
        if ("detail" in data && data.detail) return String(data.detail);
      }
      return `İstek başarısız: ${response.status} ${response.statusText}`;
    })();
    const error = new Error(String(message));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function listIzinler({ durum } = {}) {
  const qs = durum ? `?durum=${encodeURIComponent(durum)}` : "";
  return request(`/izinler${qs}`, { method: "GET" });
}

export async function createIzinTalep(payload) {
  return request("/izin-talep", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIzinDurum(izinId, durum) {
  return request(`/izin-durum/${encodeURIComponent(izinId)}`, {
    method: "PUT",
    body: JSON.stringify({ durum }),
  });
}

export async function deleteIzin(izinId) {
  return request(`/izinler/${encodeURIComponent(izinId)}`, {
    method: "DELETE",
  });
}

export async function getIstatistikler() {
  return request("/istatistikler", { method: "GET" });
}
