const rateLimits = new Map()

export const json = (payload, status = 200, extraHeaders = {}) =>
  Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  })

export const getEnv = (name) =>
  process.env[name] || process.env[`VITE_${name}`] || ''

export const getClientId = (request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'local'

export const enforceRateLimit = (
  request,
  namespace,
  { limit = 30, windowMs = 60_000 } = {},
) => {
  const now = Date.now()
  const key = `${namespace}:${getClientId(request)}`
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    const error = new Error('Too many requests. Please wait before trying again.')
    error.status = 429
    error.headers = { 'Retry-After': String(retryAfter) }
    throw error
  }

  current.count += 1
}

export const readJson = async (request, maxBytes = 4_000_000) => {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > maxBytes) {
    const error = new Error('The request is too large.')
    error.status = 413
    throw error
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    const error = new Error('The request is too large.')
    error.status = 413
    throw error
  }

  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('The request body must be valid JSON.')
    error.status = 400
    throw error
  }
}

export const fetchJson = async (url, options = {}, timeoutMs = 15_000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ/2.0 (civic-data-demo)',
        ...options.headers,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = new Error(`Upstream service returned HTTP ${response.status}.`)
      error.status = response.status
      throw error
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export const handleError = (error) => {
  console.error(error)
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : error.name === 'AbortError'
        ? 504
        : 500

  return json(
    {
      error:
        status >= 500
          ? 'A civic data service could not complete the request.'
          : error.message,
    },
    status,
    error.headers,
  )
}
