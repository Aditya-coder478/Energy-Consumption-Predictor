// One place for all backend calls.
// Set VITE_API_URL in a .env file (for example VITE_API_URL=http://localhost:8000) to change the address.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// The backend sends errors as { detail: "text" } or { detail: [ { loc, msg }, ... ] }.
function formatDetail(detail) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : ''
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .join('; ')
  }
  return 'Request failed.'
}

async function request(path, options = {}) {
  const token = sessionStorage.getItem('accessToken')
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(formatDetail(data?.detail), response.status)
  }
  return response.json()
}

export const apiGet = (path) => request(path)

export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
