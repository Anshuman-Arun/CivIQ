import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isRobotsAllowed,
  isSafePublicUrl,
  parseIcsEvents,
  parseJsonLdEvents,
  parseRevizeEvents,
  parseRobots,
} from '../api/_lib/eventCrawler.js'

test('allows the most specific robots rule for the CivIQ crawler', () => {
  const robots = `
    User-agent: *
    Disallow: /private
    Allow: /private/calendar
  `

  assert.equal(parseRobots(robots).length, 1)
  assert.equal(
    isRobotsAllowed(robots, 'https://city.gov/private/calendar'),
    true,
  )
  assert.equal(isRobotsAllowed(robots, 'https://city.gov/private/files'), false)
})

test('rejects local, private, credentialed, and non-HTTPS crawler URLs', () => {
  assert.equal(isSafePublicUrl('https://city.gov/calendar'), true)
  assert.equal(isSafePublicUrl('http://city.gov/calendar'), false)
  assert.equal(isSafePublicUrl('https://localhost/calendar'), false)
  assert.equal(isSafePublicUrl('https://192.168.1.10/calendar'), false)
  assert.equal(isSafePublicUrl('https://user:secret@city.gov/calendar'), false)
})

test('parses only future civic JSON-LD events', () => {
  const html = `
    <script type="application/ld+json">
      [
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "City Council Meeting",
          "startDate": "2099-08-01T17:00:00-07:00",
          "url": "/meetings/1"
        },
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Summer Music Festival",
          "startDate": "2099-08-02T17:00:00-07:00"
        }
      ]
    </script>
  `

  const events = parseJsonLdEvents(
    html,
    'https://city.gov/calendar',
    'Example City',
  )
  assert.equal(events.length, 1)
  assert.equal(events[0].title, 'City Council Meeting')
  assert.equal(events[0].sourceUrl, 'https://city.gov/meetings/1')
})

test('parses civic ICS records without fabricating missing fields', () => {
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Planning Commission Meeting
DTSTART:20990803T170000Z
LOCATION:Council Chambers
URL:https://city.gov/meetings/3
END:VEVENT
END:VCALENDAR`

  const [event] = parseIcsEvents(
    ics,
    'https://city.gov/calendar.ics',
    'Example City',
  )
  assert.equal(event.title, 'Planning Commission Meeting')
  assert.equal(event.location, 'Council Chambers')
  assert.equal(event.description, null)
})

test('parses official Revize calendar records and preserves their links', () => {
  const records = [
    {
      id: '42',
      title: 'Neighborhood Advisory Board Meeting',
      start: '2099-08-04T17:30:00-07:00',
      desc: '%3Ca%20href%3D%22https%3A%2F%2Fagenda.example.gov%2FPortal%2FMeeting%3Fid%3D42%22%3EView%20the%20agenda%3C%2Fa%3E',
      calendar_displays: [3],
    },
  ]
  const [event] = parseRevizeEvents(
    records,
    'https://city.gov/calendar',
    'Example City',
    new Map([['3', 'Meetings']]),
  )

  assert.equal(event.type, 'Meetings')
  assert.equal(event.description, 'View the agenda')
  assert.equal(
    event.sourceUrl,
    'https://agenda.example.gov/Portal/Meeting?id=42',
  )
})
