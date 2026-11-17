// VITE_API_BASE_URL is "/" in the production Docker build (same-origin via the
// gateway). Naively concatenating "/" + "/api/..." produces "//api/...", which
// browsers treat as a protocol-relative URL pointing at the host "api" — so the
// cited PDF never loaded. Always strip trailing slashes before joining.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, "");

// Matches AuthContext.tsx / services/api.ts exactly: token lives in
// sessionStorage under "audito_token" — not localStorage.
export function getAuthToken() {
  return window.sessionStorage.getItem("audito_token");
}

export function getDocumentFileUrl(fileId) {
  return `${API_BASE_URL}/api/documents/${encodeURIComponent(fileId)}/file`;
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
