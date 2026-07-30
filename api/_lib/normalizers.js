const cleanText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const isEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const isHttpUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const displayCongressName = (name) => {
  const cleaned = cleanText(name)
  if (!cleaned || !cleaned.includes(',')) return cleaned
  const [lastName, ...givenNames] = cleaned.split(',').map((part) => part.trim())
  return `${givenNames.join(' ')} ${lastName}`.trim()
}

export const normalizeOpenStatesEvent = (event) => ({
  id: `openstates:${event.id}`,
  title: cleanText(event.name) || 'Public meeting',
  description: cleanText(event.description),
  type: Array.isArray(event.classification)
    ? event.classification.join(', ')
    : cleanText(event.classification) || 'State legislative meeting',
  startDate: event.start_date,
  endDate: event.end_date || null,
  location: cleanText(event.location?.name),
  lat: null,
  lng: null,
  sourceName: `OpenStates${event.jurisdiction?.name ? ` · ${event.jurisdiction.name}` : ''}`,
  sourceUrl: isHttpUrl(event.location?.url) ? event.location.url : null,
  retrievedAt: new Date().toISOString(),
})

export const normalizeLegistarEvent = (event, client) => ({
  id: `legistar:${client}:${event.EventId}`,
  title:
    cleanText(event.EventBodyName) ||
    cleanText(event.EventComment) ||
    'Public meeting',
  description: cleanText(event.EventAgendaStatusName),
  type: cleanText(event.EventBodyName) || 'Local government meeting',
  startDate: event.EventDate,
  endDate: null,
  location:
    cleanText(event.EventLocation) ||
    cleanText(event.EventAddress) ||
    'See official record',
  lat: null,
  lng: null,
  sourceName: `Legistar · ${client}`,
  sourceUrl: [event.EventInSiteURL, event.EventAgendaFile, event.EventMinutesFile].find(
    isHttpUrl,
  ) || null,
  retrievedAt: new Date().toISOString(),
})

export const normalizeCongressMember = (member, details = {}) => {
  const detail = details.member || details
  const district =
    member.district === undefined || member.district === null
      ? null
      : String(member.district)

  return {
    id: `congress:${member.bioguideId}`,
    name: displayCongressName(member.name),
    party: member.partyName || detail.partyHistory?.[0]?.partyName || null,
    office: district === null ? 'U.S. Senator' : 'U.S. Representative',
    district: district === null ? member.state : `${member.state} District ${district}`,
    email: null,
    phone: cleanText(detail.addressInformation?.phoneNumber),
    website: isHttpUrl(detail.officialWebsiteUrl)
      ? detail.officialWebsiteUrl
      : `https://www.congress.gov/member/${member.bioguideId}`,
    sourceName: 'Congress.gov',
  }
}

export const isCurrentCongressMember = (
  member,
  currentYear = new Date().getUTCFullYear(),
) => {
  const terms = Array.isArray(member.terms?.item) ? member.terms.item : []
  const latestTerm = terms.at(-1)
  if (!latestTerm) return false
  return !latestTerm.endYear || Number(latestTerm.endYear) >= currentYear
}

export const normalizeOpenStatesPerson = (person) => {
  const office = Array.isArray(person.offices)
    ? person.offices.find((item) => item.classification === 'capitol') ||
      person.offices[0]
    : null
  const links = Array.isArray(person.links) ? person.links : []

  return {
    id: `openstates:${person.id}`,
    name: person.name,
    party: cleanText(person.party),
    office:
      cleanText(person.current_role?.title) ||
      cleanText(person.current_role?.org_classification) ||
      'State legislator',
    district: cleanText(person.current_role?.district),
    email: isEmail(person.email)
      ? person.email
      : isEmail(office?.email)
        ? office.email
        : null,
    phone: cleanText(person.voice) || cleanText(office?.voice),
    website:
      links.map((link) => link.url).find(isHttpUrl) ||
      (isHttpUrl(person.openstates_url) ? person.openstates_url : null),
    sourceName: `OpenStates${person.jurisdiction?.name ? ` · ${person.jurisdiction.name}` : ''}`,
  }
}

export const sanitizeAnalysis = (analysis) => {
  const strings = (value, max = 12) =>
    Array.isArray(value)
      ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, max)
      : []

  const terms = Array.isArray(analysis?.terms)
    ? analysis.terms
        .filter(
          (item) =>
            typeof item?.term === 'string' &&
            item.term.trim() &&
            typeof item?.definition === 'string' &&
            item.definition.trim(),
        )
        .slice(0, 10)
        .map((item) => ({
          term: item.term.trim(),
          definition: item.definition.trim(),
        }))
    : []

  return {
    overview:
      cleanText(analysis?.overview) ||
      'The model did not return a usable overview.',
    keyPoints: strings(analysis?.keyPoints),
    importantDates: strings(analysis?.importantDates),
    citizenActions: strings(analysis?.citizenActions),
    terms,
    limitations: [
      ...strings(analysis?.limitations, 8),
      'AI-generated analysis can be incomplete or incorrect; verify it against the original document.',
    ].filter((item, index, all) => all.indexOf(item) === index),
  }
}
