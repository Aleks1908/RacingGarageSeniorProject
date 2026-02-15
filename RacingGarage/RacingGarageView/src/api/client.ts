const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export type ApiError = { status: number; message: string };

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw {
      status: res.status,
      message: text || res.statusText,
    } satisfies ApiError;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
