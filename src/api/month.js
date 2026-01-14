import { api } from "./client";

export function getCurrentMonth() {
  return api("/month/current");
}

export function getMonths() {
  return api("/months");
}

export function startMonth(payload) {
  return api("/month/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMonth(monthId, payload) {
  return api(`/month/${monthId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function closeMonth(monthId) {
  return api("/month/close", {
    method: "POST",
    body: JSON.stringify({ monthId }),
  });
}

export function deleteMonth(monthId) {
  return api(`/month/${monthId}`, { method: "DELETE" });
}
