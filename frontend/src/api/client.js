/**
 * Thin fetch wrapper. Auth is carried by an httpOnly session cookie set by the
 * server on login — the token is never stored in JS (so XSS can't read it), so
 * every request just needs `credentials: "include"` to send the cookie.
 */
export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };

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
  const headers = {};
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
