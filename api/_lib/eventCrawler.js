import { load } from 'cheerio'
import { lookup } from 'node:dns/promises'
import { fetchJson } from './http.js'

const CRAWLER_USER_AGENT =
  'CivIQCrawler/2.1 (+https://civiq-cac.vercel.app)'
const MAX_PAGE_BYTES = 2_000_000
const MAX_PAGES = 6
const MEETING_PATTERN =
  /\b(meeting|council|commission|committee|board|hearing|workshop|town hall|advisory|legislative|agenda)\b/i
const DISCOVERY_PATTERN =
  /\b(meeting|calendar|events?|agenda|council|commission|hearing)\b/i

const cleanText = (value) => {
  if (typeof value !== 'string') return null
  const text = load(`<div>${value}</div>`)('div').text().replace(/\s+/g, ' ').trim()
  return text || null
}

const normalizeHost = (hostname) => hostname.toLowerCase().replace(/^www\./, '')

const isPrivateIpv4 = (hostname) => {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}

const isPrivateIpAddress = (address) => {
  const normalized = String(address).toLowerCase()
  return (
    isPrivateIpv4(normalized) ||
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  )
}

export const isSafePublicUrl = (value) => {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      hostname !== 'localhost' &&
      !hostname.endsWith('.local') &&
      !hostname.endsWith('.internal') &&
      !hostname.includes(':') &&
      !isPrivateIpv4(hostname)
    )
  } catch {
    return false
  }
}

const isSameOfficialSite = (candidate, officialUrl) => {
  try {
    return (
      isSafePublicUrl(candidate) &&
      normalizeHost(new URL(candidate).hostname) ===
        normalizeHost(new URL(officialUrl).hostname)
    )
  } catch {
    return false
  }
}

const assertPublicDns = async (url) => {
  const addresses = await lookup(new URL(url).hostname, {
    all: true,
    verbatim: true,
  })
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIpAddress(address))
  ) {
    throw new Error('Official site resolved to a non-public address.')
  }
}

const fetchResource = async (value, timeoutMs = 10_000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const originalUrl = new URL(value)
    let requestUrl = originalUrl
    let response

    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      if (
        !isSafePublicUrl(requestUrl) ||
        !isSameOfficialSite(requestUrl, originalUrl)
      ) {
        throw new Error('Official site redirected outside its public domain.')
      }
      await assertPublicDns(requestUrl)
      response = await fetch(requestUrl, {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/json,text/calendar,application/xml,text/xml;q=0.9,*/*;q=0.1',
          'User-Agent': CRAWLER_USER_AGENT,
        },
        redirect: 'manual',
        signal: controller.signal,
      })

      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const location = response.headers.get('location')
      if (!location || redirectCount === 3) {
        throw new Error('Official site returned too many redirects.')
      }
      requestUrl = new URL(location, requestUrl)
    }

    if (!response.ok) {
      const error = new Error(`Official site returned HTTP ${response.status}.`)
      error.status = response.status
      throw error
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_PAGE_BYTES) {
      throw new Error('Official calendar response exceeded the crawler size limit.')
    }

    const text = await response.text()
    if (Buffer.byteLength(text, 'utf8') > MAX_PAGE_BYTES) {
      throw new Error('Official calendar response exceeded the crawler size limit.')
    }

    return {
      contentType: response.headers.get('content-type') || '',
      text,
      url: response.url,
    }
  } finally {
    clearTimeout(timeout)
  }
}

const patternToRegex = (pattern) => {
  const endAnchored = pattern.endsWith('$')
  const value = endAnchored ? pattern.slice(0, -1) : pattern
  const escaped = value
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
  return new RegExp(`^${escaped}${endAnchored ? '$' : ''}`)
}

export const parseRobots = (text) => {
  const groups = []
  let current = null

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if (
      current &&
      (field === 'allow' || field === 'disallow') &&
      value
    ) {
      current.rules.push({ allow: field === 'allow', pattern: value })
    }
  }

  return groups
}

export const isRobotsAllowed = (robotsText, targetUrl) => {
  const groups = parseRobots(robotsText)
  const named = groups.filter((group) =>
    group.agents.some((agent) => 'civiqcrawler'.startsWith(agent)),
  )
  const applicable =
    named.length > 0
      ? named
      : groups.filter((group) => group.agents.includes('*'))
  const path = `${new URL(targetUrl).pathname}${new URL(targetUrl).search}`
  const matching = applicable
    .flatMap((group) => group.rules)
    .filter((rule) => patternToRegex(rule.pattern).test(path))
    .sort(
      (left, right) =>
        right.pattern.length - left.pattern.length ||
        Number(right.allow) - Number(left.allow),
    )
  return matching[0]?.allow ?? true
}

const getRobotsText = async (officialUrl) => {
  const robotsUrl = new URL('/robots.txt', officialUrl)
  try {
    return (await fetchResource(robotsUrl, 5_000)).text
  } catch (error) {
    if (error.status === 404) return ''
    throw error
  }
}

const entityWebsite = (entity) =>
  (entity?.claims?.P856 || [])
    .map((claim) => claim?.mainsnak?.datavalue?.value)
    .find(isSafePublicUrl)

export const discoverOfficialWebsite = async (location) => {
  const searchUrl = new URL('https://www.wikidata.org/w/api.php')
  searchUrl.searchParams.set('action', 'wbsearchentities')
  searchUrl.searchParams.set('search', location.city)
  searchUrl.searchParams.set('language', 'en')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('limit', '10')
  searchUrl.searchParams.set('origin', '*')
  const search = await fetchJson(searchUrl)

  const stateName = location.stateName.toLowerCase()
  const candidates = (search.search || [])
    .filter((item) => {
      const description = String(item.description || '').toLowerCase()
      return (
        item.label?.toLowerCase() === location.city.toLowerCase() &&
        description.includes('united states') &&
        (description.includes(stateName) ||
          description.includes(`, ${location.state.toLowerCase()}`)) &&
        /\b(city|town|village|municipality|county seat)\b/.test(description)
      )
    })
    .slice(0, 5)

  if (candidates.length === 0) return null

  const entityUrl = new URL('https://www.wikidata.org/w/api.php')
  entityUrl.searchParams.set('action', 'wbgetentities')
  entityUrl.searchParams.set('ids', candidates.map((item) => item.id).join('|'))
  entityUrl.searchParams.set('props', 'claims')
  entityUrl.searchParams.set('format', 'json')
  entityUrl.searchParams.set('origin', '*')
  const entities = await fetchJson(entityUrl)

  const resolved = candidates
    .map((candidate) => ({
      description: candidate.description,
      label: candidate.label,
      url: entityWebsite(entities.entities?.[candidate.id]),
    }))
    .filter((candidate) => candidate.url)
    .sort(
      (left, right) =>
        Number(new URL(right.url).hostname.endsWith('.gov')) -
        Number(new URL(left.url).hostname.endsWith('.gov')),
    )

  return resolved[0] || null
}

const eventId = (prefix, sourceUrl, title, startDate) =>
  `${prefix}:${encodeURIComponent(
    `${new URL(sourceUrl).hostname}:${title}:${startDate}`,
  )}`

const normalizeLocation = (location) => {
  if (typeof location === 'string') return cleanText(location)
  if (!location || typeof location !== 'object') return null
  const address = location.address
  if (typeof address === 'string') return cleanText(address)
  return cleanText(
    [
      location.name,
      address?.streetAddress,
      address?.addressLocality,
      address?.addressRegion,
      address?.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
  )
}

const isFutureMeeting = (event, now = Date.now()) => {
  const date = new Date(event.startDate).getTime()
  const meaningfulType =
    event.type && event.type !== 'Public meeting' ? event.type : ''
  const searchable = `${event.title || ''} ${event.description || ''} ${meaningfulType}`
  return (
    Number.isFinite(date) &&
    date >= now - 86_400_000 &&
    MEETING_PATTERN.test(searchable)
  )
}

const flattenJsonLd = (value) => {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd)
  if (!value || typeof value !== 'object') return []
  return [value, ...flattenJsonLd(value['@graph'] || [])]
}

export const parseJsonLdEvents = (html, pageUrl, sourceLabel) => {
  const $ = load(html)
  const events = []

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const data = JSON.parse($(element).text())
      for (const item of flattenJsonLd(data)) {
        const types = Array.isArray(item['@type'])
          ? item['@type']
          : [item['@type']]
        if (!types.some((type) => String(type).toLowerCase().endsWith('event'))) {
          continue
        }

        const title = cleanText(item.name)
        const startDate = item.startDate
        if (!title || !startDate) continue
        let sourceUrl = pageUrl
        try {
          const candidate = new URL(item.url || pageUrl, pageUrl).href
          if (isSameOfficialSite(candidate, pageUrl)) sourceUrl = candidate
        } catch {
          // Keep the page URL.
        }

        const event = {
          id: eventId('crawl-jsonld', sourceUrl, title, startDate),
          title,
          description: cleanText(item.description),
          type: 'Public meeting',
          startDate,
          endDate: item.endDate || null,
          location: normalizeLocation(item.location),
          lat: null,
          lng: null,
          sourceName: `${sourceLabel} · Official website`,
          sourceUrl,
          retrievedAt: new Date().toISOString(),
        }
        if (isFutureMeeting(event)) events.push(event)
      }
    } catch {
      // Ignore malformed structured data on an otherwise usable official page.
    }
  })

  return events
}

const parseIcsDate = (value) => {
  const match = String(value || '').match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/,
  )
  if (!match) return null
  const [, year, month, day, hour = '00', minute = '00', second = '00', z] =
    match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${z || ''}`
}

const unescapeIcs = (value) =>
  cleanText(
    String(value || '')
      .replace(/\\n/gi, '\n')
      .replace(/\\([,;\\])/g, '$1'),
  )

export const parseIcsEvents = (ics, feedUrl, sourceLabel) => {
  const unfolded = String(ics || '').replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []

  return blocks
    .map((block) => {
      const fields = {}
      for (const line of block.split(/\r?\n/)) {
        const separator = line.indexOf(':')
        if (separator < 0) continue
        const key = line.slice(0, separator).split(';')[0].toUpperCase()
        fields[key] ??= line.slice(separator + 1)
      }
      const title = unescapeIcs(fields.SUMMARY)
      const startDate = parseIcsDate(fields.DTSTART)
      if (!title || !startDate) return null
      let sourceUrl = feedUrl
      if (fields.URL) {
        try {
          const candidate = new URL(fields.URL, feedUrl).href
          if (isSameOfficialSite(candidate, feedUrl)) sourceUrl = candidate
        } catch {
          // Keep the calendar feed URL.
        }
      }
      return {
        id: eventId('crawl-ics', sourceUrl, title, startDate),
        title,
        description: unescapeIcs(fields.DESCRIPTION),
        type: 'Public meeting',
        startDate,
        endDate: parseIcsDate(fields.DTEND),
        location: unescapeIcs(fields.LOCATION),
        lat: null,
        lng: null,
        sourceName: `${sourceLabel} · Official calendar`,
        sourceUrl,
        retrievedAt: new Date().toISOString(),
      }
    })
    .filter((event) => event && isFutureMeeting(event))
}

const revizeCalendarNames = (html) => {
  const names = new Map()
  const pattern =
    /['"](\d+)['"]\s*:\s*\{[^}]*['"]name['"]\s*:\s*['"]([^'"]+)['"]/gi
  for (const match of html.matchAll(pattern)) names.set(match[1], cleanText(match[2]))
  return names
}

export const parseRevizeEvents = (
  records,
  pageUrl,
  sourceLabel,
  calendarNames = new Map(),
) =>
  (Array.isArray(records) ? records : [])
    .map((record) => {
      const calendars = (record.calendar_displays || [])
        .map(String)
        .map((id) => calendarNames.get(id))
        .filter(Boolean)
      const type =
        calendars.find((name) => MEETING_PATTERN.test(name)) ||
        calendars[0] ||
        cleanText(record.primary_calendar_name) ||
        'Public meeting'
      const title = cleanText(record.title)
      const startDate = record.start
      if (!title || !startDate) return null
      let sourceUrl = pageUrl
      if (record.url) {
        try {
          const candidate = new URL(record.url, pageUrl).href
          if (isSameOfficialSite(candidate, pageUrl)) sourceUrl = candidate
        } catch {
          // Keep the calendar page URL.
        }
      }
      return {
        id: eventId(
          `crawl-revize-${record.id || record.rid || 'event'}`,
          sourceUrl,
          title,
          startDate,
        ),
        title,
        description: cleanText(record.desc),
        type,
        startDate,
        endDate: record.end || null,
        location: cleanText(record.location),
        lat: null,
        lng: null,
        sourceName: `${sourceLabel} · Official calendar`,
        sourceUrl,
        retrievedAt: new Date().toISOString(),
      }
    })
    .filter((event) => event && isFutureMeeting(event))

const revizeFeedFromPage = (html, pageUrl) => {
  if (!/revize_calendar\/index\.v2\.js/i.test(html)) return null
  const webspace = html.match(/RZ\.webspace\s*=\s*['"]([^'"]+)/i)?.[1]
  if (!webspace) return null
  const relativeRevizeUrl =
    html.match(
      /RZ\.protocolRelativeRevizeBaseUrl\s*=\s*['"]([^'"]+)/i,
    )?.[1] || ''
  const url = new URL(
    '/_assets_/plugins/revizeCalendar/calendar_data_handler.php',
    pageUrl,
  )
  url.searchParams.set('webspace', webspace)
  url.searchParams.set('relative_revize_url', relativeRevizeUrl)
  url.searchParams.set('protocol', new URL(pageUrl).protocol)
  return url
}

const discoverLinks = (html, pageUrl, officialUrl) => {
  const $ = load(html)
  const baseUrl = $('base[href]').attr('href')
    ? new URL($('base[href]').attr('href'), pageUrl).href
    : pageUrl
  const links = []

  $('a[href], link[href]').each((_, element) => {
    const href = $(element).attr('href')
    const text = `${$(element).text()} ${href || ''}`
    if (!href || !DISCOVERY_PATTERN.test(text)) return
    try {
      const url = new URL(href, baseUrl)
      url.hash = ''
      if (
        isSameOfficialSite(url, officialUrl) &&
        !/\.(?:pdf|docx?|xlsx?|jpg|jpeg|png|gif|zip)$/i.test(url.pathname) &&
        !/\b(login|admin|staff)\b/i.test(url.pathname)
      ) {
        links.push(url.href)
      }
    } catch {
      // Ignore malformed links.
    }
  })

  return [...new Set(links)].sort(
    (left, right) =>
      Number(/\bcalendar\b/i.test(right)) - Number(/\bcalendar\b/i.test(left)),
  )
}

const discoverCalendarFeeds = (html, pageUrl, officialUrl) => {
  const $ = load(html)
  const feeds = []
  $('a[href], link[href]').each((_, element) => {
    const href = $(element).attr('href')
    const type = $(element).attr('type') || ''
    if (!href || (!/\.ics(?:$|\?)/i.test(href) && !/text\/calendar/i.test(type))) {
      return
    }
    try {
      const url = new URL(href, pageUrl).href
      if (isSameOfficialSite(url, officialUrl)) feeds.push(url)
    } catch {
      // Ignore malformed calendar links.
    }
  })
  return [...new Set(feeds)].slice(0, 3)
}

export const crawlMunicipalEvents = async (location, notices) => {
  const official = await discoverOfficialWebsite(location)
  if (!official) {
    notices.push(
      `The crawler could not identify an official municipal website for ${location.displayName}.`,
    )
    return []
  }

  let robotsText
  try {
    robotsText = await getRobotsText(official.url)
  } catch {
    notices.push(
      `${official.label}'s website could not be crawled because its robots policy was unavailable.`,
    )
    return []
  }

  const queue = [official.url]
  const visited = new Set()
  const events = []
  const feedUrls = new Set()

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const nextUrl = queue.shift()
    if (
      visited.has(nextUrl) ||
      !isSameOfficialSite(nextUrl, official.url) ||
      !isRobotsAllowed(robotsText, nextUrl)
    ) {
      continue
    }
    visited.add(nextUrl)

    let page
    try {
      page = await fetchResource(nextUrl)
    } catch {
      continue
    }
    if (!isSameOfficialSite(page.url, official.url)) continue

    events.push(...parseJsonLdEvents(page.text, page.url, official.label))
    discoverCalendarFeeds(page.text, page.url, official.url).forEach((url) =>
      feedUrls.add(url),
    )

    const revizeUrl = revizeFeedFromPage(page.text, page.url)
    if (
      revizeUrl &&
      isSameOfficialSite(revizeUrl, official.url) &&
      isRobotsAllowed(robotsText, revizeUrl)
    ) {
      try {
        const feed = await fetchResource(revizeUrl, 15_000)
        const records = JSON.parse(feed.text)
        events.push(
          ...parseRevizeEvents(
            records,
            page.url,
            official.label,
            revizeCalendarNames(page.text),
          ),
        )
      } catch {
        // Continue with other official calendar formats.
      }
    }

    for (const link of discoverLinks(page.text, page.url, official.url)) {
      if (!visited.has(link) && queue.length < MAX_PAGES * 3) queue.push(link)
    }
  }

  for (const feedUrl of [...feedUrls].slice(0, 3)) {
    if (!isRobotsAllowed(robotsText, feedUrl)) continue
    try {
      const feed = await fetchResource(feedUrl)
      events.push(...parseIcsEvents(feed.text, feedUrl, official.label))
    } catch {
      // Continue with other official sources.
    }
  }

  if (events.length === 0) {
    notices.push(
      `The crawler checked ${official.label}'s official website but found no parseable future public meetings.`,
    )
  }

  return events
}
