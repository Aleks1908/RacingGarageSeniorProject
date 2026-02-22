const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ??
  "http://localhost:5164";

type ApiError = {
  status: number;
  message: string;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers);

  if (
    !headers.has("Content-Type") &&
    options.body &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Attach token by default unless auth: false
  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = localStorage.getItem("accessToken");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await readJsonSafe(res);

    const msg =
      typeof body === "string"
        ? body
        : body?.message ?? body?.title ?? JSON.stringify(body ?? {});

    const err: ApiError = {
      status: res.status,
      message: msg || "Request failed",
    };
    // Throw error
    throw Object.assign(new Error(err.message), err);
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json()) as T;
  return data;
}
