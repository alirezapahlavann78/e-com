export function adminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_access_token");
}

export function setAdminTokens(access: string, refresh?: string) {
  localStorage.setItem("admin_access_token", access);
  if (refresh) localStorage.setItem("admin_refresh_token", refresh);
}

export function clearAdminTokens() {
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
}

/** Error thrown by `adminApi`; keeps the HTTP status and the parsed API body. */
export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown> | null;
  constructor(message: string, status: number, payload: Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const response = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken() ? { Authorization: `Bearer ${adminToken()}` } : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    let payload: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text);
      payload = parsed;
      message = Array.isArray(parsed.message) ? parsed.message.join(" · ") : (parsed.message ?? text);
    } catch {
      /* keep raw */
    }
    // A 401 on an authenticated screen means the session died: go back to /login.
    // On the login page itself the credentials were simply wrong — let the form
    // show the message instead of reloading the page.
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/login")) {
      clearAdminTokens();
      window.location.href = "/login";
    }
    throw new ApiError(message || response.statusText, response.status, payload);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export const faNum = (value: number | string | null | undefined) =>
  value == null ? "—" : Number(value).toLocaleString("fa-IR");

export const faMoney = (value: number | string | null | undefined) =>
  value == null ? "—" : `${Math.round(Number(value)).toLocaleString("fa-IR")} تومان`;

export const faDate = (value: string | Date | null | undefined) =>
  !value ? "—" : new Date(value).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });

export const faDateTime = (value: string | Date | null | undefined) =>
  !value
    ? "—"
    : new Date(value).toLocaleString("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Base URL of the storefront as seen from the user's browser.
 * In hosted previews the apps live on sibling hosts (3000-<id>.host / 3001-<id>.host),
 * so the port is swapped locally instead of hard-coding localhost.
 */
export function storefrontBase(): string {
  const configured = process.env.NEXT_PUBLIC_STOREFRONT_URL;
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return "http://127.0.0.1:3000";
  const { protocol, host } = window.location;
  const swapped = host.replace(/^\d+-/, "3000-");
  if (swapped !== host) return `${protocol}//${swapped}`;
  return `${protocol}//${window.location.hostname}:3000`;
}
