import test from 'node:test'
import assert from 'node:assert/strict'
import {
  congressBillUrlFromIssue,
  normalizeVotePosition,
  parseHouseVoteXml,
  parseSenateVoteXml,
  summarizeIssueAreas,
} from '../api/_lib/congressionalData.js'

test('summarizes current-Congress sponsored legislation policy areas', () => {
  const areas = summarizeIssueAreas(
    [
      {
        congress: 119,
        introducedDate: '2026-07-01',
        policyArea: { name: 'Health' },
      },
      {
        congress: 119,
        introducedDate: '2026-06-01',
        policyArea: { name: 'Health' },
      },
      {
        congress: 119,
        introducedDate: '2026-07-02',
        policyArea: { name: 'Armed Forces and National Security' },
      },
      {
        congress: 118,
        introducedDate: '2024-01-01',
        policyArea: { name: 'Education' },
      },
    ],
    119,
  )

  assert.deepEqual(areas, [
    { name: 'Health', sponsoredBillCount: 2 },
    { name: 'Armed Forces and National Security', sponsoredBillCount: 1 },
  ])
})

test('normalizes only affirmative and negative recorded positions', () => {
  assert.equal(normalizeVotePosition('Aye'), 'Yea')
  assert.equal(normalizeVotePosition('No'), 'Nay')
  assert.equal(normalizeVotePosition('Not Voting'), null)
})

test('reads a House member vote from the official Clerk XML shape', () => {
  const xml = `
    <rollcall-vote>
      <vote-metadata>
        <vote-desc>Example Public Lands Act</vote-desc>
      </vote-metadata>
      <vote-data>
        <recorded-vote>
          <legislator name-id="A000369">Amodei</legislator>
          <vote>Yea</vote>
        </recorded-vote>
      </vote-data>
    </rollcall-vote>
  `

  assert.deepEqual(parseHouseVoteXml(xml, 'A000369'), {
    billName: 'Example Public Lands Act',
    position: 'Yea',
  })
  assert.equal(parseHouseVoteXml(xml, 'X000000'), null)
})

test('maps Senate bill citations to official Congress.gov bill pages', () => {
  assert.equal(
    congressBillUrlFromIssue('S.J.Res. 181', 119),
    'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/181',
  )
  assert.equal(congressBillUrlFromIssue('Nomination', 119), null)
})

test('matches a senator by state and last name in official Senate XML', () => {
  const xml = `
    <roll_call_vote>
      <vote_date>July 30, 2026</vote_date>
      <members>
        <member>
          <last_name>Rosen</last_name>
          <state>NV</state>
          <vote_cast>Nay</vote_cast>
        </member>
      </members>
    </roll_call_vote>
  `

  assert.deepEqual(
    parseSenateVoteXml(xml, { lastName: 'Rosen', state: 'NV' }),
    { date: '2026-07-30', position: 'Nay' },
  )
})

test('matches a multiword Senate surname from a full member name', () => {
  const xml = `
    <roll_call_vote>
      <vote_date>July 30, 2026</vote_date>
      <members>
        <member>
          <last_name>Cortez Masto</last_name>
          <state>NV</state>
          <vote_cast>Yea</vote_cast>
        </member>
      </members>
    </roll_call_vote>
  `

  assert.deepEqual(
    parseSenateVoteXml(xml, {
      fullName: 'Catherine Cortez Masto',
      lastName: 'Masto',
      state: 'NV',
    }),
    { date: '2026-07-30', position: 'Yea' },
  )
})
