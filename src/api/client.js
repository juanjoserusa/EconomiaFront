export const API_URL = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error || `API error ${res.status}`;
    throw new Error(message);
  }

  return data;
}
