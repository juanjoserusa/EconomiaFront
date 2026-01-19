import { api } from "./client";

export function getCurrentWeek() {
  return api("/week/current");
}

export function closeWeek(weekId, payload) {
  return api(`/weeks/${weekId}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
