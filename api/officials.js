import {
  enforceRateLimit,
  fetchJson,
  getEnv,
  handleError,
  json,
} from './_lib/http.js'
import {
  isCurrentCongressMember,
  normalizeCongressMember,
  normalizeOpenStatesPerson,
} from './_lib/normalizers.js'
import { enrichCongressMembers } from './_lib/congressionalData.js'

const findGeographyLayer = (geographies, fragment) => {
  const key = Object.keys(geographies).find((name) => name.includes(fragment))
  return key ? geographies[key]?.[0] : null
}

const geocodeAddress = async (address) => {
  const url = new URL(
    'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress',
  )
  url.searchParams.set('address', address)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('vintage', 'Current_Current')
  url.searchParams.set('format', 'json')

  const data = await fetchJson(url)
  const match = data.result?.addressMatches?.[0]
  if (!match) {
    const error = new Error(
      'The Census Geocoder could not match that address. Include street, city, state, and ZIP.',
    )
    error.status = 404
    throw error
  }

  const state = match.geographies?.States?.[0]
  const congressional = findGeographyLayer(
    match.geographies || {},
    'Congressional Districts',
  )

  return {
    matchedAddress: match.matchedAddress,
    lat: Number(match.coordinates.y),
    lng: Number(match.coordinates.x),
    state: state?.STUSAB,
    congressionalDistrict:
      congressional?.CD119 || congressional?.BASENAME || congressional?.NAME,
  }
}

const getCongressOfficials = async (location, notices) => {
  const apiKey = getEnv('CONGRESS_API_KEY')
  if (!apiKey) {
    notices.push(
      'Federal representatives are unavailable until CONGRESS_API_KEY is configured.',
    )
    return []
  }

  const url = new URL(`https://api.congress.gov/v3/member/${location.state}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '50')
  url.searchParams.set('api_key', apiKey)
  const data = await fetchJson(url)
  const targetDistrict = String(Number(location.congressionalDistrict))
  const members = (data.members || [])
    .filter((member) => isCurrentCongressMember(member))
    .filter((member) => {
      if (member.district === undefined || member.district === null) return true
      return String(Number(member.district)) === targetDistrict
    })

  const [details, enrichments] = await Promise.all([
    Promise.all(
      members.map(async (member) => {
        try {
          const detailUrl = new URL(
            `https://api.congress.gov/v3/member/${member.bioguideId}`,
          )
          detailUrl.searchParams.set('format', 'json')
          detailUrl.searchParams.set('api_key', apiKey)
          return await fetchJson(detailUrl)
        } catch {
          return {}
        }
      }),
    ),
    enrichCongressMembers(members, apiKey, location.state).catch(() =>
      members.map(() => ({ issueAreas: [], recentVotes: [] })),
    ),
  ])

  return members.map((member, index) => ({
    ...normalizeCongressMember(member, details[index]),
    ...enrichments[index],
  }))
}

const getStateOfficials = async (location, notices) => {
  const apiKey = getEnv('OPENSTATES_API_KEY')
  if (!apiKey) {
    notices.push(
      'State legislators are unavailable until OPENSTATES_API_KEY is configured.',
    )
    return []
  }

  const url = new URL('https://v3.openstates.org/people.geo')
  url.searchParams.set('lat', String(location.lat))
  url.searchParams.set('lng', String(location.lng))
  const data = await fetchJson(url, {
    headers: { 'X-API-KEY': apiKey },
  })

  return (data.results || [])
    .filter(
      (person) =>
        person.jurisdiction?.classification === 'state' ||
        person.jurisdiction?.id?.includes('/state:'),
    )
    .map(normalizeOpenStatesPerson)
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET' })
    }

    try {
      enforceRateLimit(request, 'officials', { limit: 20, windowMs: 60_000 })
      const address = new URL(request.url).searchParams.get('address')?.trim() || ''
      if (address.length < 8 || address.length > 240) {
        return json({ error: 'A complete U.S. street address is required.' }, 400)
      }

      const location = await geocodeAddress(address)
      if (!location.state || !location.congressionalDistrict) {
        return json(
          { error: 'The address matched, but its current districts were unavailable.' },
          404,
        )
      }

      const notices = []
      const [federal, state] = await Promise.allSettled([
        getCongressOfficials(location, notices),
        getStateOfficials(location, notices),
      ])

      if (federal.status === 'rejected') {
        notices.push('Congress.gov did not return federal member details.')
      }
      if (state.status === 'rejected') {
        notices.push('OpenStates did not return state legislator details.')
      }

      return json(
        {
          location,
          federalOfficials:
            federal.status === 'fulfilled' ? federal.value : [],
          stateOfficials: state.status === 'fulfilled' ? state.value : [],
          localOfficials: [],
          notices,
        },
        200,
        { 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
      )
    } catch (error) {
      return handleError(error)
    }
  },
}
