import { api } from "./client";

function normalizeAmount(amount) {
  if (amount === null || amount === undefined) return amount;

  // Si viene como number, lo convertimos a string
  let s = typeof amount === "number" ? String(amount) : String(amount);

  // Trim + normaliza coma/punto (dejamos coma o punto, backend lo soporta)
  s = s.trim();

  return s;
}

export function getTransactions(monthId) {
  return api(`/transactions?monthId=${encodeURIComponent(monthId)}`);
}

export function createTransaction(payload) {
  const safePayload = {
    ...payload,
    // fuerza amount a string (para no perder decimales)
    amount: normalizeAmount(payload?.amount),
  };

  return api("/transactions", {
    method: "POST",
    body: JSON.stringify(safePayload),
  });
}

export function getTransaction(id) {
  return api(`/transactions/${id}`);
}

export function updateTransaction(id, payload) {
  const safePayload = {
    ...payload,
    amount: normalizeAmount(payload?.amount),
  };

  return api(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(safePayload),
  });
}

export function deleteTransaction(id) {
  return api(`/transactions/${id}`, { method: "DELETE" });
}
