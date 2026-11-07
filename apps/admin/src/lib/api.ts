export function adminToken() { if (typeof window === "undefined") return null; return localStorage.getItem("admin_access_token"); }
export function setAdminTokens(access: string, refresh: string) { localStorage.setItem("admin_access_token", access); localStorage.setItem("admin_refresh_token", refresh); }
export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const res = await fetch(`${base}${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(adminToken() ? { Authorization: `Bearer ${adminToken()}` } : {}), ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
