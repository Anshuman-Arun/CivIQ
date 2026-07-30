const DEFAULT_TIMEOUT_MS = 20_000

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const apiUnavailableMessage = () => {
  if (window.location.hostname.endsWith('github.io')) {
    return 'This GitHub Pages build is frontend-only. Deploy the repository on Vercel to enable live civic data and document analysis.'
  }
  return 'The CivIQ API is unavailable. Start the Vite development server or deploy the repository on Vercel.'
}

export const requestJson = async (path, options = {}) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new ApiError(apiUnavailableMessage(), response.status || 503)
    }

    const payload = await response.json()
    if (!response.ok) {
      throw new ApiError(
        payload.error || 'The request could not be completed.',
        response.status,
        payload.details,
      )
    }

    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 504)
    }
    if (error instanceof ApiError) throw error
    throw new ApiError(apiUnavailableMessage(), 503)
  } finally {
    window.clearTimeout(timeout)
  }
}

export const getEvents = (zip) =>
  requestJson(`/api/events?zip=${encodeURIComponent(zip)}`)

export const getOfficials = (address) =>
  requestJson(`/api/officials?address=${encodeURIComponent(address)}`)

export const summarizeDocument = (document) =>
  requestJson('/api/summarize', {
    method: 'POST',
    body: JSON.stringify(document),
    timeoutMs: 60_000,
  })
