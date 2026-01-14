import { api } from "./client";

export function getTransactions(monthId) {
  return api(`/transactions?monthId=${encodeURIComponent(monthId)}`);
}

export function createTransaction(payload) {
  return api("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTransaction(id) {
  return api(`/transactions/${id}`);
}

export function updateTransaction(id, payload) {
  return api(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTransaction(id) {
  return api(`/transactions/${id}`, { method: "DELETE" });
}
