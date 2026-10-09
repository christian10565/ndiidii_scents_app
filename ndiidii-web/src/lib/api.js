const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

/** GET helper. Throws on network or HTTP errors so callers can show a fallback. */
export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const url = `${API}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json();
}
