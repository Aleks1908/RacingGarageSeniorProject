const viteBase = (() => {
  try {
    return new Function(
      "return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL.toString().replace(/\\\\\\/$/, '') : undefined;"
    )();
  } catch {
    return undefined;
  }
})();

type GlobalWithEnv = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const envBase = (() => {
  const g: GlobalWithEnv | undefined =
    typeof globalThis !== "undefined"
      ? (globalThis as GlobalWithEnv)
      : undefined;
  return g?.process?.env?.VITE_API_BASE_URL;
})();

const API_BASE = viteBase ?? envBase ?? "http://localhost:5164";

type ApiError = {
  status: number;
  message: string;
};

type ErrorBody =
  | string
  | null
  | {
      message?: unknown;
      title?: unknown;
      errors?: unknown;
      detail?: unknown;
      [k: string]: unknown;
    };

function toMessage(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function stringifyErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;

  const rec = errors as Record<string, unknown>;
  const parts: string[] = [];

  for (const [key, val] of Object.entries(rec)) {
    if (Array.isArray(val)) {
      const msgs = val.map(toMessage).filter((x): x is string => !!x);
      if (msgs.length) parts.push(`${key}: ${msgs.join(", ")}`);
    } else {
      const msg = toMessage(val);
      if (msg) parts.push(`${key}: ${msg}`);
    }
  }

  return parts.length ? parts.join(" • ") : null;
}

async function readJsonSafe(res: Response): Promise<ErrorBody> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return text;
  }
}

function extractErrorMessage(body: ErrorBody): string {
  if (typeof body === "string") return body;

  if (body && typeof body === "object") {
    const msg =
      toMessage(body.message) ??
      toMessage(body.title) ??
      toMessage(body.detail) ??
      stringifyErrors(body.errors);

    if (msg) return msg;

    try {
      return JSON.stringify(body);
    } catch {
      return "Request failed";
    }
  }

  return "Request failed";
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

  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = localStorage.getItem("accessToken");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await readJsonSafe(res);
    const err: ApiError = {
      status: res.status,
      message: extractErrorMessage(body),
    };
    throw Object.assign(new Error(err.message), err);
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!text) return undefined as T;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Invalid JSON response");
    }
  }

  return text as unknown as T;
}
