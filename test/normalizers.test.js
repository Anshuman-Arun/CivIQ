import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isCurrentCongressMember,
  normalizeCongressMember,
  normalizeOpenStatesEvent,
  normalizeOpenStatesPerson,
  sanitizeAnalysis,
} from '../api/_lib/normalizers.js'

test('normalizes OpenStates events without inventing missing fields', () => {
  const normalized = normalizeOpenStatesEvent({
    id: 'event-1',
    name: 'Budget hearing',
    description: '',
    classification: ['committee-meeting'],
    start_date: '2026-08-01T17:00:00Z',
    location: { name: 'Room 100', url: 'https://example.gov/agenda' },
    jurisdiction: { name: 'Nevada' },
  })

  assert.equal(normalized.title, 'Budget hearing')
  assert.equal(normalized.description, null)
  assert.equal(normalized.location, 'Room 100')
  assert.equal(normalized.lat, null)
  assert.equal(normalized.sourceName, 'OpenStates · Nevada')
})

test('does not turn an OpenStates contact form URL into an email address', () => {
  const normalized = normalizeOpenStatesPerson({
    id: 'person-1',
    name: 'Representative Example',
    email: 'https://example.gov/contact',
    current_role: { title: 'Assembly Member', district: '12' },
    jurisdiction: { name: 'Nevada', classification: 'state' },
    links: [{ url: 'https://example.gov' }],
  })

  assert.equal(normalized.email, null)
  assert.equal(normalized.website, 'https://example.gov')
})

test('classifies Congress members using the district field', () => {
  const senator = normalizeCongressMember({
    bioguideId: 'S001',
    name: 'Senator Example',
    state: 'NV',
    partyName: 'Independent',
  })
  const representative = normalizeCongressMember({
    bioguideId: 'R001',
    name: 'Representative Example',
    state: 'NV',
    district: 2,
    partyName: 'Independent',
  })

  assert.equal(senator.office, 'U.S. Senator')
  assert.equal(representative.office, 'U.S. Representative')
  assert.equal(representative.district, 'NV District 2')
})

test('turns Congress directory names into a readable display order', () => {
  const member = normalizeCongressMember({
    bioguideId: 'A000',
    name: 'Cortez Masto, Catherine',
    state: 'NV',
    partyName: 'Democratic',
  })

  assert.equal(member.name, 'Catherine Cortez Masto')
})

test('filters historical Congress members using their latest term', () => {
  assert.equal(
    isCurrentCongressMember(
      { terms: { item: [{ startYear: 2011 }] } },
      2026,
    ),
    true,
  )
  assert.equal(
    isCurrentCongressMember(
      { terms: { item: [{ startYear: 2011, endYear: 2017 }] } },
      2026,
    ),
    false,
  )
})

test('sanitizes model output and always includes a verification warning', () => {
  const analysis = sanitizeAnalysis({
    overview: 'A sourced overview.',
    keyPoints: ['One'],
    terms: [{ term: 'Quorum', definition: 'Minimum members required.' }],
  })

  assert.deepEqual(analysis.keyPoints, ['One'])
  assert.equal(analysis.terms[0].term, 'Quorum')
  assert.match(analysis.limitations.at(-1), /verify/i)
})
