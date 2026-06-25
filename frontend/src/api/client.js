// CSRF double-submit: the server sets a readable `mrm_csrf` cookie at login; we
// echo its value back in a header on every state-changing request so the server
// can confirm the call came from our own app (a cross-site page can ride the
// session cookie but cannot read this one to forge the header).
const CSRF_COOKIE = "mrm_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name) {
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[1]) : "";
}

// The current CSRF token + its header name, for callers that build their own
// requests (multipart uploads via fetch/XHR that don't go through `api`).
export const CSRF_HEADER_NAME = CSRF_HEADER;
export function csrfToken() {
  return readCookie(CSRF_COOKIE);
}

function withCsrf(headers, method) {
  if (!SAFE_METHODS.has(method.toUpperCase())) {
    const token = readCookie(CSRF_COOKIE);
    if (token) headers[CSRF_HEADER] = token;
  }
  return headers;
}

/**
 * Thin fetch wrapper. Auth is carried by an httpOnly session cookie set by the
 * server on login — the token is never stored in JS (so XSS can't read it), so
 * every request just needs `credentials: "include"` to send the cookie. State-
 * changing requests additionally carry the CSRF header.
 */
export async function api(path, { method = "GET", body } = {}) {
  const headers = withCsrf({ "Content-Type": "application/json" }, method);

  const res = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Authenticated file download. Fetches the path as a blob (the session cookie is
 * sent automatically) and triggers a browser "save as" using the server-supplied
 * filename.
 */
export async function download(
  path,
  fallbackName = "download.xlsx",
  { method = "GET", body } = {}
) {
  const headers = withCsrf({}, method);
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const name = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
