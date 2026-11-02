import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Error thrown by fetchJson — carries the HTTP status and parsed body (if any). */
export type FetchJsonError = Error & { status: number; data: unknown }

/**
 * Fetch + parse JSON robustly. Never surfaces the cryptic
 * "Unexpected end of JSON input": empty or non-JSON bodies (proxy 502 pages,
 * empty server 500s, offline) become readable errors like
 * "Server error (HTTP 502) — no JSON body".
 *
 * On non-2xx responses it throws a FetchJsonError whose `message` prefers the
 * server's own `error`/`message` field, and whose `data` holds the parsed body.
 */
export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    throw new Error('Network error — check your connection and try again.')
  }
  const text = await res.text()
  let data: unknown = null
  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null // non-JSON body (HTML error page, plain text, …)
    }
  }
  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; message?: string }
    const serverMsg = body.message ?? body.error
    const msg =
      serverMsg ??
      (data === null && !text.trim()
        ? `Server error (HTTP ${res.status}) — empty response`
        : `Server error (HTTP ${res.status})`)
    const err = new Error(msg) as FetchJsonError
    err.status = res.status
    err.data = data
    throw err
  }
  if (data === null) {
    throw new Error(`Empty response from server (HTTP ${res.status})`)
  }
  return data as T
}
