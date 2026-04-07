const API_URL = '/api'
let refreshRequest: Promise<boolean> | null = null

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  const body = init?.body
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

async function refreshSession() {
  if (refreshRequest) return refreshRequest

  refreshRequest = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

async function clearSessionSilently() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    })
  } catch {
    // Ignore logout cleanup failures when the session is already invalid.
  }
}

export async function api<T>(path: string, init?: RequestInit, withAuth = false): Promise<T> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: buildHeaders(init),
      cache: 'no-store',
      credentials: 'same-origin',
    })

  let response = await send()
  let data = await response.json().catch(() => ({}))

  if (withAuth && response.status === 401) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await send()
      data = await response.json().catch(() => ({}))
    }
  }

  if (!response.ok) {
    if (withAuth && response.status === 401) {
      await clearSessionSilently()
    }
    throw new Error(data.message || 'Ошибка запроса')
  }

  return data as T
}
