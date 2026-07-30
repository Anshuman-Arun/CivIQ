import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Bookmark,
  Calendar,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Search,
} from 'lucide-react'
import { useGuestSession } from '../contexts/GuestSessionContext'
import { getEvents } from '../lib/api'

const DEFAULT_LOCATION = {
  lat: 39.5296,
  lng: -119.8138,
  displayName: 'Reno, NV',
}

const markerIcon = L.divIcon({
  className: 'civiq-event-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const locationIcon = L.divIcon({
  className: 'civiq-location-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const MapSnap = ({ location }) => {
  const map = useMap()

  useEffect(() => {
    map.setView([location.lat, location.lng], 11, { animate: true })
  }, [location, map])

  return null
}

const formatDate = (date) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable'
  return parsed.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const Events = () => {
  const {
    guest,
    savedEvents,
    signInGuest,
    toggleSavedEvent,
  } = useGuestSession()
  const [events, setEvents] = useState([])
  const [zipCode, setZipCode] = useState('89501')
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notices, setNotices] = useState([])
  const [selectedType, setSelectedType] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEvents = async (zip) => {
    if (!/^\d{5}$/.test(zip)) {
      setError('Enter a valid five-digit ZIP code.')
      return
    }

    setLoading(true)
    setError('')
    setNotices([])

    try {
      const result = await getEvents(zip)
      setEvents(result.events || [])
      setNotices(result.notices || [])
      if (result.location) setLocation(result.location)
    } catch (requestError) {
      setEvents([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents('89501')
  }, [])

  const eventTypes = useMemo(
    () => ['All', ...new Set(events.map((event) => event.type).filter(Boolean))],
    [events],
  )

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return events.filter((event) => {
      const matchesType = selectedType === 'All' || event.type === selectedType
      const searchable = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase()
      return matchesType && (!query || searchable.includes(query))
    })
  }, [events, searchQuery, selectedType])

  const mappedEvents = filteredEvents.filter(
    (event) => Number.isFinite(event.lat) && Number.isFinite(event.lng),
  )

  const saveEvent = (event) => {
    if (!guest) signInGuest()
    toggleSavedEvent(event)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-6 shadow-md backdrop-blur-md">
        <h1 className="text-2xl font-extrabold text-gray-100">
          Verified civic meetings
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-300">
          Search official state legislative feeds and configured municipal
          calendars. CivIQ does not generate or guess meeting records.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="flex gap-2 lg:col-span-4">
            <label className="sr-only" htmlFor="event-zip">
              ZIP code
            </label>
            <input
              className="input-field min-w-0 flex-1"
              id="event-zip"
              inputMode="numeric"
              maxLength={5}
              onChange={(event) => setZipCode(event.target.value.replace(/\D/g, ''))}
              onKeyDown={(event) => event.key === 'Enter' && fetchEvents(zipCode)}
              placeholder="ZIP code"
              value={zipCode}
            />
            <button
              className="btn-primary flex items-center gap-2"
              disabled={loading}
              onClick={() => fetchEvents(zipCode)}
              type="button"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>

          <div className="flex items-center gap-2 lg:col-span-3">
            <Layers className="h-4 w-4 shrink-0 text-gray-400" />
            <label className="sr-only" htmlFor="event-type">
              Meeting type
            </label>
            <select
              className="input-field"
              id="event-type"
              onChange={(event) => setSelectedType(event.target.value)}
              value={selectedType}
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All meeting types' : type}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5">
            <label className="sr-only" htmlFor="event-keyword">
              Filter meetings by keyword
            </label>
            <input
              className="input-field"
              id="event-keyword"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by topic, body, or location"
              value={searchQuery}
            />
          </div>
        </div>
      </section>

      {(error || notices.length > 0) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            error
              ? 'border-red-900/50 bg-red-950/20 text-red-200'
              : 'border-amber-900/50 bg-amber-950/20 text-amber-100'
          }`}
          role={error ? 'alert' : 'status'}
        >
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {error && <p>{error}</p>}
              {notices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-label="Civic meeting map"
          className="h-[420px] overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-md"
        >
          <MapContainer
            center={[location.lat, location.lng]}
            style={{ height: '100%', width: '100%' }}
            zoom={11}
          >
            <MapSnap location={location} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker icon={locationIcon} position={[location.lat, location.lng]}>
              <Popup>{location.displayName}</Popup>
            </Marker>
            {mappedEvents.map((event) => (
              <Marker
                icon={markerIcon}
                key={event.id}
                position={[event.lat, event.lng]}
              >
                <Popup>
                  <strong>{event.title}</strong>
                  <br />
                  {formatDate(event.startDate)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <section
          aria-busy={loading}
          aria-label="Civic meeting results"
          className="h-[420px] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/60 p-4 shadow-md"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Loading official meeting feeds…
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <Calendar className="mb-3 h-11 w-11 text-gray-600" />
              <h2 className="font-bold text-gray-200">No sourced meetings found</h2>
              <p className="mt-2 max-w-sm text-sm text-gray-400">
                This means no configured official feed returned a future meeting.
                CivIQ will not fill the gap with generated events.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const isSaved = savedEvents.some((saved) => saved.id === event.id)
                return (
                  <article
                    className="rounded-xl border border-gray-800 bg-gray-950/30 p-4"
                    key={event.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="rounded-full border border-civic-800/40 bg-civic-950/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-civic-300">
                          {event.type || 'Public meeting'}
                        </span>
                        <h2 className="mt-2 text-base font-bold text-gray-100">
                          {event.title}
                        </h2>
                      </div>
                      <button
                        aria-label={isSaved ? 'Remove saved event' : 'Save event for this session'}
                        className={`rounded-full border p-2 ${
                          isSaved
                            ? 'border-emerald-700 bg-emerald-950 text-emerald-300'
                            : 'border-gray-700 text-gray-400 hover:text-white'
                        }`}
                        onClick={() => saveEvent(event)}
                        type="button"
                      >
                        <Bookmark
                          className="h-4 w-4"
                          fill={isSaved ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>

                    {event.description && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-300">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-civic-400" />
                        {formatDate(event.startDate)}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-civic-400" />
                          {event.location}
                        </p>
                      )}
                      <p>Source: {event.sourceName}</p>
                    </div>
                    {event.sourceUrl && (
                      <a
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-civic-400 hover:text-civic-300"
                        href={event.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View official record
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Events
