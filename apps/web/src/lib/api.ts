const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const INTERNAL_API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api";

/** Absolute URL for server-side fetching; relative for the browser. */
function baseUrl(): string {
  if (PUBLIC_API.startsWith("http")) return PUBLIC_API;
  return typeof window === "undefined" ? INTERNAL_API : PUBLIC_API;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}
