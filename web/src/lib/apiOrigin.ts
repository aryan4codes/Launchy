/**
 * Backend API base for REST, WebSockets, and /artifacts paths.
 *
 * Leave empty (`""`) in dev → same-origin URLs so the Vite dev server proxy can reach localhost:8000.
 * Production builds use `VITE_API_ORIGIN` (e.g. Render): `https://lauchy.onrender.com` with no trailing slash.
 */
export function normalizeApiOrigin(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/\/+$/, '')
}

export const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_ORIGIN)

/** Absolute or same-origin paths for fetch() `url` argument. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_ORIGIN ? `${API_ORIGIN}${p}` : p
}
