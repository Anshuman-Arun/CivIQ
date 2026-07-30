import React, { useEffect, useState } from 'react'
import {
  Building,
  ExternalLink,
  Flag,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
} from 'lucide-react'
import { getOfficials } from '../lib/api'

const DEFAULT_ADDRESS = '1 E First St, Reno, NV 89501'

const partyBadgeClass = (party = '') => {
  if (/democrat/i.test(party)) {
    return 'border-sky-300/40 bg-sky-400/15 text-sky-100'
  }
  if (/republican/i.test(party)) {
    return 'border-red-300/40 bg-red-400/15 text-red-100'
  }
  return 'border-gray-700 bg-gray-950/50 text-gray-300'
}

const voteBadgeClass = (position = '') =>
  position === 'Yea'
    ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
    : 'border-rose-300/40 bg-rose-400/15 text-rose-100'

const formatVoteDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString()
}

const OfficialCard = ({ official }) => (
  <article className="flex flex-col rounded-2xl border border-gray-800/80 bg-gray-900/40 p-5 shadow-md">
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-100">{official.name}</h3>
          <p className="mt-1 text-xs font-semibold text-civic-400">
            {official.office}
          </p>
        </div>
        {official.party && (
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${partyBadgeClass(
              official.party,
            )}`}
          >
            {official.party}
          </span>
        )}
      </div>

      {official.district && (
        <p className="mt-3 text-xs text-gray-400">{official.district}</p>
      )}
    </div>

    {official.issueAreas?.length > 0 && (
      <section className="mt-5 border-t border-gray-800 pt-4">
        <h4 className="text-xs font-bold text-gray-200">
          Top sponsored-legislation issue areas
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {official.issueAreas.map((area) => (
            <span
              className="rounded-full border border-civic-400/30 bg-civic-400/10 px-2 py-1 text-[10px] font-semibold text-civic-200"
              key={area.name}
            >
              {area.name}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          Based on bills this member sponsored in the current Congress.
        </p>
      </section>
    )}

    {official.recentVotes?.length > 0 && (
      <section className="mt-5 border-t border-gray-800 pt-4">
        <h4 className="text-xs font-bold text-gray-200">
          Most recent legislative votes
        </h4>
        <div className="mt-3 space-y-3">
          {official.recentVotes.map((vote) => (
            <div
              className="rounded-xl border border-gray-800 bg-gray-950/30 p-3"
              key={vote.id || `${vote.billUrl}:${vote.date}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold leading-relaxed text-gray-200">
                  {vote.billName}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${voteBadgeClass(
                    vote.position,
                  )}`}
                >
                  {vote.position}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
                {formatVoteDate(vote.date) && (
                  <time dateTime={vote.date}>
                    {formatVoteDate(vote.date)}
                  </time>
                )}
                {vote.billUrl && (
                  <a
                    className="inline-flex items-center gap-1 text-civic-300 hover:text-white"
                    href={vote.billUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View bill
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    <div className="mt-auto space-y-2 border-t border-gray-800 pt-4 text-xs text-gray-400">
      {official.email && (
        <a
          className="flex items-center gap-2 hover:text-white"
          href={`mailto:${official.email}`}
        >
          <Mail className="h-3.5 w-3.5 text-civic-400" />
          <span className="truncate">{official.email}</span>
        </a>
      )}
      {official.phone && (
        <a
          className="flex items-center gap-2 hover:text-white"
          href={`tel:${official.phone}`}
        >
          <Phone className="h-3.5 w-3.5 text-civic-400" />
          {official.phone}
        </a>
      )}
      {official.website && (
        <a
          className="flex items-center gap-2 hover:text-white"
          href={official.website}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3.5 w-3.5 text-civic-400" />
          Official profile
        </a>
      )}
      <p className="pt-1 text-[10px] leading-relaxed text-gray-500">
        Source: {official.sourceName}
      </p>
    </div>
  </article>
)

const OfficialSection = ({ icon: Icon, title, officials }) => (
  <section className="rounded-2xl border border-gray-800/60 bg-gray-900/20 p-6">
    <div className="mb-5 flex items-center gap-2 border-b border-gray-800 pb-3">
      <Icon className="h-5 w-5 text-civic-400" />
      <h2 className="text-lg font-bold text-gray-100">{title}</h2>
    </div>
    {officials.length === 0 ? (
      <p className="text-sm text-gray-400">
        No verified records were returned for this level of government.
      </p>
    ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {officials.map((official) => (
          <OfficialCard key={official.id} official={official} />
        ))}
      </div>
    )}
  </section>
)

const Officials = () => {
  const [address, setAddress] = useState(DEFAULT_ADDRESS)
  const [result, setResult] = useState({
    federalOfficials: [],
    stateOfficials: [],
    localOfficials: [],
    notices: [],
    location: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async (searchAddress) => {
    if (searchAddress.trim().length < 8) {
      setError('Enter a complete U.S. street address so districts can be matched accurately.')
      return
    }

    setLoading(true)
    setError('')
    try {
      setResult(await getOfficials(searchAddress.trim()))
    } catch (requestError) {
      setResult((current) => ({ ...current, federalOfficials: [], stateOfficials: [] }))
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    search(DEFAULT_ADDRESS)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-100">
          Find your elected representatives
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-300">
          Use a full street address because ZIP codes can cross congressional
          and state legislative districts. Federal issue areas are derived from
          Congress.gov sponsored legislation; votes come from official House
          Clerk and Senate roll-call records. Missing data stays blank.
        </p>

        <div className="mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="official-address">
            U.S. street address
          </label>
          <input
            autoComplete="street-address"
            className="input-field flex-1"
            id="official-address"
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && search(address)}
            placeholder="Street address, city, state, ZIP"
            value={address}
          />
          <button
            className="btn-primary flex items-center justify-center gap-2"
            disabled={loading}
            onClick={() => search(address)}
            type="button"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Looking up…' : 'Find officials'}
          </button>
        </div>
      </section>

      {result.location && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="h-4 w-4 text-civic-400" />
          Matched address: {result.location.matchedAddress}
        </div>
      )}

      {(error || result.notices?.length > 0) && (
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
              {result.notices?.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400" role="status">
          Matching the address to current districts…
        </div>
      ) : (
        <div className="space-y-6">
          <OfficialSection
            icon={Flag}
            officials={result.federalOfficials || []}
            title="Federal representatives"
          />
          <OfficialSection
            icon={Building}
            officials={result.stateOfficials || []}
            title="State legislators"
          />
          {(result.localOfficials || []).length > 0 && (
            <OfficialSection
              icon={Users}
              officials={result.localOfficials}
              title="Local officials"
            />
          )}
        </div>
      )}
    </div>
  )
}

export default Officials
