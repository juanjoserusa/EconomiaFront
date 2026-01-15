const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

// Timeout por defecto para evitar “se queda pensando”
const DEFAULT_TIMEOUT_MS = 15000;

function buildUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

// Intenta parsear JSON, si no puede devuelve texto
async function safeParseResponse(res) {
  const text = await res.text();

  // Si viene vacío (204 o similar)
  if (!text) return null;

  // Intento JSON
  try {
    return JSON.parse(text);
  } catch {
    // Si te llega HTML (p.ej. error proxy), devolvemos texto
    return text;
  }
}

function extractErrorMessage(data, res) {
  // Si backend manda { error: "..." }
  if (data && typeof data === "object" && data.error) return String(data.error);

  // Si backend manda texto
  if (typeof data === "string" && data.trim()) return data.slice(0, 300);

  // Fallback
  return `HTTP ${res.status}`;
}

export async function api(path, options = {}) {
  const url = buildUrl(path);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        // Ojo: si vas a subir FormData, no fuerces content-type
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });

    const data = await safeParseResponse(res);

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, res));
    }

    return data;
  } catch (e) {
    // AbortError -> timeout
    if (e?.name === "AbortError") {
      throw new Error("Timeout conectando con el servidor. Prueba Refresh.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
