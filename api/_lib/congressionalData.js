import { load } from 'cheerio'
import { fetchJson } from './http.js'

const OFFICIAL_XML_HOSTS = new Set(['clerk.house.gov', 'www.senate.gov'])
const MAX_XML_BYTES = 2_000_000
const VOTE_FETCH_LIMIT = 8

const cleanText = (value) =>
  typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim()
    : null

const congressHeaders = (apiKey) => ({ 'X-Api-Key': apiKey })

const fetchOfficialXml = async (value, timeoutMs = 12_000) => {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !OFFICIAL_XML_HOSTS.has(url.hostname)) {
    throw new Error('Vote source is not an approved congressional host.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1',
        'User-Agent': 'CivIQ/2.1 (civic-data-demo)',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Congressional vote source returned HTTP ${response.status}.`)
    }
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_XML_BYTES) {
      throw new Error('Congressional vote data exceeded the size limit.')
    }
    const text = await response.text()
    if (Buffer.byteLength(text, 'utf8') > MAX_XML_BYTES) {
      throw new Error('Congressional vote data exceeded the size limit.')
    }
    return text
  } finally {
    clearTimeout(timeout)
  }
}

export const normalizeVotePosition = (value) => {
  const normalized = cleanText(value)?.toLowerCase()
  if (normalized === 'yea' || normalized === 'aye' || normalized === 'yes') {
    return 'Yea'
  }
  if (normalized === 'nay' || normalized === 'no') return 'Nay'
  return null
}

export const summarizeIssueAreas = (legislation, congressNumber) => {
  const counts = new Map()
  for (const item of legislation || []) {
    const name = cleanText(item.policyArea?.name)
    if (!name || Number(item.congress) !== Number(congressNumber)) continue
    const current = counts.get(name) || {
      count: 0,
      latestDate: '',
      name,
    }
    current.count += 1
    if (String(item.introducedDate || '') > current.latestDate) {
      current.latestDate = String(item.introducedDate || '')
    }
    counts.set(name, current)
  }

  return [...counts.values()]
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.latestDate.localeCompare(left.latestDate) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 3)
    .map(({ name, count }) => ({ name, sponsoredBillCount: count }))
}

const getIssueAreas = async (bioguideId, congressNumber, apiKey) => {
  const url = new URL(
    `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`,
  )
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '250')
  url.searchParams.set('sort', 'introducedDate desc')
  url.searchParams.set('api_key', apiKey)
  const data = await fetchJson(url)
  return summarizeIssueAreas(data.sponsoredLegislation, congressNumber)
}

export const parseHouseVoteXml = (xml, bioguideId) => {
  const $ = load(xml, { xmlMode: true })
  let position = null
  $('recorded-vote').each((_, element) => {
    const legislator = $(element).find('legislator')
    if (legislator.attr('name-id') === bioguideId) {
      position = normalizeVotePosition($(element).find('vote').text())
    }
  })

  if (!position) return null
  return {
    billName:
      cleanText($('vote-metadata vote-desc').first().text()) ||
      cleanText($('vote-metadata vote-question').first().text()),
    position,
  }
}

const getHouseVoteList = async (congressNumber, sessionNumber, apiKey) => {
  const firstUrl = new URL(
    `https://api.congress.gov/v3/house-vote/${congressNumber}/${sessionNumber}`,
  )
  firstUrl.searchParams.set('format', 'json')
  firstUrl.searchParams.set('limit', '250')
  firstUrl.searchParams.set('api_key', apiKey)
  const first = await fetchJson(firstUrl)
  const votes = [...(first.houseRollCallVotes || [])]

  if (Number(first.pagination?.count || 0) > votes.length) {
    const secondUrl = new URL(firstUrl)
    secondUrl.searchParams.set('offset', String(votes.length))
    const second = await fetchJson(secondUrl)
    votes.push(...(second.houseRollCallVotes || []))
  }

  return votes
    .sort((left, right) => new Date(right.startDate) - new Date(left.startDate))
    .slice(0, VOTE_FETCH_LIMIT)
}

const getHouseVotes = async (members, context, apiKey) => {
  const byMember = new Map(members.map((member) => [member.bioguideId, []]))
  if (members.length === 0) return byMember

  const voteList = await getHouseVoteList(
    context.congressNumber,
    context.sessionNumber,
    apiKey,
  )
  const records = await Promise.allSettled(
    voteList.map(async (vote) => ({
      vote,
      xml: await fetchOfficialXml(vote.sourceDataURL),
    })),
  )

  for (const record of records) {
    if (record.status !== 'fulfilled') continue
    const { vote, xml } = record.value
    for (const member of members) {
      const selected = byMember.get(member.bioguideId)
      if (selected.length >= 3) continue
      const parsed = parseHouseVoteXml(xml, member.bioguideId)
      if (!parsed?.billName || !vote.legislationUrl) continue
      selected.push({
        id: `house-${context.congressNumber}-${context.sessionNumber}-${vote.rollCallNumber}`,
        billName: parsed.billName,
        billUrl: vote.legislationUrl,
        date: vote.startDate,
        position: parsed.position,
        rollCallUrl: vote.sourceDataURL,
        sourceName: 'Office of the Clerk, U.S. House',
      })
    }
  }

  return byMember
}

const BILL_TYPE_PATHS = {
  HCONRES: 'house-concurrent-resolution',
  HJRES: 'house-joint-resolution',
  HR: 'house-bill',
  HRES: 'house-resolution',
  S: 'senate-bill',
  SCONRES: 'senate-concurrent-resolution',
  SJRES: 'senate-joint-resolution',
  SRES: 'senate-resolution',
}

export const congressBillUrlFromIssue = (issue, congressNumber) => {
  const compact = String(issue || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
  const match = compact.match(
    /^(HCONRES|SCONRES|HJRES|SJRES|HRES|SRES|HR|S)(\d+)$/,
  )
  if (!match) return null
  const [, type, number] = match
  return `https://www.congress.gov/bill/${congressNumber}th-congress/${BILL_TYPE_PATHS[type]}/${number}`
}

const senateVoteUrls = (context, voteNumber) => {
  const compact = `${context.congressNumber}${context.sessionNumber}`
  const padded = String(Number(voteNumber)).padStart(5, '0')
  const stem = `vote_${context.congressNumber}_${context.sessionNumber}_${padded}`
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${compact}`
  return {
    html: `${base}/${stem}.htm`,
    xml: `${base}/${stem}.xml`,
  }
}

export const parseSenateVoteXml = (xml, member) => {
  const $ = load(xml, { xmlMode: true })
  let position = null
  $('members > member').each((_, element) => {
    const candidateState = cleanText($(element).find('state').text())
    const candidateLastName = cleanText($(element).find('last_name').text())
    const exactLastName =
      candidateLastName?.localeCompare(member.lastName, undefined, {
        sensitivity: 'base',
      }) === 0
    const fullNameMatch = Boolean(
      candidateLastName &&
        member.fullName?.toLowerCase().endsWith(candidateLastName.toLowerCase()),
    )
    if (
      candidateState === member.state &&
      (exactLastName || fullNameMatch)
    ) {
      position = normalizeVotePosition($(element).find('vote_cast').text())
    }
  })

  if (!position) return null
  const date = new Date(cleanText($('vote_date').first().text()))
  return {
    date: Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10),
    position,
  }
}

const getSenateVotes = async (members, context) => {
  const byMember = new Map(members.map((member) => [member.bioguideId, []]))
  if (members.length === 0) return byMember

  const compact = `${context.congressNumber}_${context.sessionNumber}`
  const menuUrl =
    `https://www.senate.gov/legislative/LIS/roll_call_lists/` +
    `vote_menu_${compact}.xml`
  const menuXml = await fetchOfficialXml(menuUrl)
  const $ = load(menuXml, { xmlMode: true })
  const menuVotes = []
  $('votes > vote').each((_, element) => {
    const issue = cleanText($(element).find('issue').text())
    const billUrl = congressBillUrlFromIssue(issue, context.congressNumber)
    if (!billUrl) return
    menuVotes.push({
      billName: cleanText($(element).find('title').text()),
      billUrl,
      number: cleanText($(element).find('vote_number').text()),
    })
  })

  const records = await Promise.allSettled(
    menuVotes.slice(0, VOTE_FETCH_LIMIT).map(async (vote) => {
      const urls = senateVoteUrls(context, vote.number)
      return {
        urls,
        vote,
        xml: await fetchOfficialXml(urls.xml),
      }
    }),
  )

  for (const record of records) {
    if (record.status !== 'fulfilled') continue
    const { urls, vote, xml } = record.value
    for (const member of members) {
      const selected = byMember.get(member.bioguideId)
      if (selected.length >= 3) continue
      const parsed = parseSenateVoteXml(xml, member)
      if (!parsed || !vote.billName) continue
      selected.push({
        id: `senate-${context.congressNumber}-${context.sessionNumber}-${vote.number}`,
        billName: vote.billName,
        billUrl: vote.billUrl,
        date: parsed.date,
        position: parsed.position,
        rollCallUrl: urls.html,
        sourceName: 'U.S. Senate roll call',
      })
    }
  }

  return byMember
}

const currentCongressContext = async (apiKey) => {
  const url = new URL('https://api.congress.gov/v3/congress/current')
  url.searchParams.set('format', 'json')
  url.searchParams.set('api_key', apiKey)
  const data = await fetchJson(url)
  const congressNumber = Number(data.congress?.number)
  const sessionNumber = Math.max(
    ...(data.congress?.sessions || []).map((session) => Number(session.number)),
  )
  if (!congressNumber || !sessionNumber) {
    throw new Error('Congress.gov did not return the current session.')
  }
  return { congressNumber, sessionNumber }
}

export const enrichCongressMembers = async (members, apiKey, stateCode) => {
  const context = await currentCongressContext(apiKey)
  const representatives = members.filter(
    (member) => member.district !== undefined && member.district !== null,
  )
  const senators = members
    .filter((member) => member.district === undefined || member.district === null)
    .map((member) => {
      const name = cleanText(member.name)
      const [familyName, givenName] = name?.split(',').map((part) => part.trim()) || []
      return {
        ...member,
        fullName: givenName ? `${givenName} ${familyName}` : name,
        lastName: givenName ? familyName : name?.split(/\s+/).at(-1),
        state: stateCode || member.state,
      }
    })

  const [issueAreaResults, houseResult, senateResult] = await Promise.all([
    Promise.allSettled(
      members.map((member) =>
        getIssueAreas(member.bioguideId, context.congressNumber, apiKey),
      ),
    ),
    getHouseVotes(representatives, context, apiKey).catch(
      () => new Map(representatives.map((member) => [member.bioguideId, []])),
    ),
    getSenateVotes(senators, context).catch(
      () => new Map(senators.map((member) => [member.bioguideId, []])),
    ),
  ])

  return members.map((member, index) => ({
    issueAreas:
      issueAreaResults[index].status === 'fulfilled'
        ? issueAreaResults[index].value
        : [],
    recentVotes:
      (member.district === undefined || member.district === null
        ? senateResult
        : houseResult
      ).get(member.bioguideId) || [],
  }))
}
