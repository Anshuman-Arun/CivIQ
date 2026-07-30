import {
  enforceRateLimit,
  fetchJson,
  getEnv,
  handleError,
  json,
} from './_lib/http.js'
import { crawlMunicipalEvents } from './_lib/eventCrawler.js'
import { normalizeOpenStatesEvent } from './_lib/normalizers.js'

const ZIP_PATTERN = /^\d{5}$/

const getLocation = async (zip) => {
  const data = await fetchJson(`https://api.zippopotam.us/us/${zip}`)
  const place = data.places?.[0]
  if (!place) {
    const error = new Error('No U.S. location was found for that ZIP code.')
    error.status = 404
    throw error
  }

  return {
    city: place['place name'],
    state: place['state abbreviation'],
    stateName: place.state,
    lat: Number(place.latitude),
    lng: Number(place.longitude),
    displayName: `${place['place name']}, ${place['state abbreviation']}`,
  }
}

const getOpenStatesEvents = async (location, notices) => {
  const apiKey = getEnv('OPENSTATES_API_KEY')
  if (!apiKey) {
    notices.push(
      'State legislative events are unavailable until OPENSTATES_API_KEY is configured.',
    )
    return []
  }

  const jurisdiction = `ocd-jurisdiction/country:us/state:${location.state.toLowerCase()}/government`
  const url = new URL('https://v3.openstates.org/events')
  url.searchParams.set('jurisdiction', jurisdiction)

  try {
    const data = await fetchJson(url, {
      headers: { 'X-API-KEY': apiKey },
    })
    return (data.results || [])
      .map(normalizeOpenStatesEvent)
      .filter((event) => new Date(event.startDate).getTime() >= Date.now() - 86_400_000)
  } catch {
    notices.push('OpenStates did not return a usable event feed for this state.')
    return []
  }
}

const deduplicateEvents = (events) => {
  const seen = new Set()
  return events
    .filter((event) => {
      const key = `${event.sourceName}:${event.title}:${event.startDate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => new Date(left.startDate) - new Date(right.startDate))
    .slice(0, 75)
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' })
    }

    try {
      enforceRateLimit(request, 'events', { limit: 30, windowMs: 60_000 })
      const zip = new URL(request.url).searchParams.get('zip') || ''
      if (!ZIP_PATTERN.test(zip)) {
        return json({ error: 'A valid five-digit ZIP code is required.' }, 400)
      }

      const location = await getLocation(zip)
      const notices = []
      const [stateEvents, localEvents] = await Promise.all([
        getOpenStatesEvents(location, notices),
        crawlMunicipalEvents(location, notices),
      ])

      return json(
        {
          location,
          events: deduplicateEvents([...stateEvents, ...localEvents]),
          notices,
        },
        200,
        { 'Cache-Control': 'public, max-age=300, s-maxage=900' },
      )
    } catch (error) {
      return handleError(error)
    }
  },
}
