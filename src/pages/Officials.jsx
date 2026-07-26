import React, { useState, useEffect } from 'react'
import { getOfficialsByZip } from '../lib/openstates'
import { validateZipCode } from '../lib/geocoding'
import {
  Mail,
  Phone,
  ExternalLink,
  Calendar,
  Building,
  Search,
  Loader,
  Flag,
  MapPin
} from 'lucide-react'

const Officials = () => {
  const [federalOfficials, setFederalOfficials] = useState([])
  const [stateOfficials, setStateOfficials] = useState([])
  const [localOfficials, setLocalOfficials] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [zipCode, setZipCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)

  const getPartyColor = (party) => {
    switch (party?.toLowerCase()) {
      case 'democratic':
      case 'democratic party':
        return 'bg-blue-950/60 text-blue-300 border border-blue-800/30'
      case 'republican':
      case 'republican party':
        return 'bg-red-950/60 text-red-300 border border-red-800/30'
      case 'independent':
        return 'bg-purple-950/60 text-purple-300 border border-purple-800/30'
      default:
        return 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/30'
    }
  }

  const fetchOfficials = async (zip) => {
    setLoading(true)
    setLocationError(null)

    try {
      const result = await getOfficialsByZip(zip)
      setFederalOfficials(result.federalOfficials || [])
      setStateOfficials(result.stateOfficials || [])
      setLocalOfficials(result.localOfficials || [])
      if (result.location) {
        setCurrentLocation(result.location.displayName || `${result.location.city}, ${result.location.state}`)
      }
    } catch (error) {
      console.error('Error fetching officials:', error)
      setLocationError('Unable to load representatives for this ZIP code.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOfficials('89509')
  }, [])

  const handleZipCodeSearch = async () => {
    if (!validateZipCode(zipCode)) {
      setLocationError('Please enter a valid 5-digit ZIP code.')
      return
    }
    setIsSearching(true)
    await fetchOfficials(zipCode)
    setIsSearching(false)
  }

  const renderOfficialCard = (o) => (
    <div key={o.id} className="bg-gray-900/40 p-6 rounded-2xl shadow-md border border-gray-800/80 backdrop-blur-md hover:border-gray-700/80 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Name & Party */}
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-base font-bold text-gray-100">{o.name}</h3>
          <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${getPartyColor(o.party)}`}>
            {o.party?.replace(' Party', '') || 'Nonpartisan'}
          </span>
        </div>
        <p className="text-xs text-civic-400 font-semibold mb-4">{o.office}</p>

        {/* Voting Profile */}
        {o.stanceTrend && o.stanceTrend.totalVotes > 0 && (
          <div className="mb-4 bg-gray-950/40 border border-gray-800/40 p-3 rounded-xl">
            <div className="flex justify-between text-[9px] text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
              <span>Voting Profile ({o.stanceTrend.totalVotes} records)</span>
              <span className="text-green-400">{o.stanceTrend.yeaPercentage}% Alignment</span>
            </div>
            <div className="w-full h-1.5 bg-red-950/40 rounded-full overflow-hidden flex border border-red-900/10">
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-full" style={{ width: `${o.stanceTrend.yeaPercentage}%` }}></div>
              <div className="bg-gradient-to-r from-red-500 to-rose-600 h-full flex-1"></div>
            </div>
          </div>
        )}

        {/* Key Issues */}
        {o.keyIssues?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {o.keyIssues.map((issue, i) => (
              <span
                key={i}
                className="bg-civic-950/40 border border-civic-900/20 text-civic-300 text-[9px] px-2 py-0.5 rounded-full font-semibold"
              >
                {issue}
              </span>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        {o.recentVotes?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-civic-400" />
              Recent Activity
            </h4>
            <div className="space-y-1.5">
              {o.recentVotes.slice(0, 3).map((v, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-gray-950/20 p-2 rounded-lg border border-gray-900">
                  <span className="truncate max-w-[170px] text-gray-300 text-xs">{v.bill}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      v.vote === 'Yea' || v.vote === 'Approved'
                        ? 'bg-green-950 text-green-300 border border-green-800/20'
                        : v.vote === 'Nay'
                        ? 'bg-red-950 text-red-300 border border-red-800/20'
                        : 'bg-blue-950 text-blue-300 border border-blue-800/20'
                    }`}
                  >
                    {v.vote}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="mt-4 pt-4 border-t border-gray-800/60 space-y-1.5 text-xs text-gray-400">
        {o.contact?.email && (
          <div className="flex items-center">
            <Mail className="h-3.5 w-3.5 mr-2 text-civic-400 flex-shrink-0" />
            <a className="underline hover:text-white truncate" href={`mailto:${o.contact.email}`} title={o.contact.email}>
              {o.contact.email}
            </a>
          </div>
        )}
        {o.contact?.phone && (
          <div className="flex items-center">
            <Phone className="h-3.5 w-3.5 mr-2 text-civic-400 flex-shrink-0" />
            <span>{o.contact.phone}</span>
          </div>
        )}
        {o.contact?.website && (
          <div className="flex items-center">
            <ExternalLink className="h-3.5 w-3.5 mr-2 text-civic-400 flex-shrink-0" />
            <a className="underline hover:text-white truncate" href={o.contact.website} target="_blank" rel="noreferrer">
              Official Website
            </a>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-gray-900/40 rounded-2xl shadow-md p-6 border border-gray-800/80 backdrop-blur-md text-left">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          Your Elected Representatives
        </h1>
        <p className="text-gray-300 mb-6 text-sm">
          Enter your 5-digit ZIP code to discover your local, state, and federal representatives, check their focus areas, and view their legislative activity.
        </p>

        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="Enter ZIP code (e.g., 90210, 89509, 10001)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700/80 text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-civic-500 placeholder-gray-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleZipCodeSearch()}
          />
          <button
            onClick={handleZipCodeSearch}
            disabled={isSearching}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-all"
          >
            {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
        {locationError && <p className="text-red-400 mt-2 text-xs font-semibold">{locationError}</p>}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader className="animate-spin h-8 w-8 text-civic-400 mx-auto" />
          <p className="text-gray-400 text-sm mt-3">Fetching local, state, and federal representatives...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Local Officials */}
          {localOfficials.length > 0 && (
            <div className="bg-gray-900/20 p-6 rounded-2xl border border-gray-800/50 backdrop-blur-md text-left">
              <div className="flex items-center mb-5 pb-3 border-b border-gray-850">
                <MapPin className="h-5 w-5 text-emerald-400 mr-2.5" />
                <h2 className="text-lg font-bold text-gray-100">Local & Municipal Officials</h2>
                {currentLocation && <span className="ml-3 text-xs text-gray-400">({currentLocation})</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localOfficials.map(renderOfficialCard)}
              </div>
            </div>
          )}

          {/* Federal Representatives */}
          <div className="bg-gray-900/20 p-6 rounded-2xl border border-gray-800/50 backdrop-blur-md text-left">
            <div className="flex items-center mb-5 pb-3 border-b border-gray-850">
              <Flag className="h-5 w-5 text-blue-400 mr-2.5" />
              <h2 className="text-lg font-bold text-gray-100">Federal Representatives</h2>
              {currentLocation && <span className="ml-3 text-xs text-gray-400">({currentLocation})</span>}
            </div>

            {federalOfficials.length === 0 ? (
              <p className="text-gray-400 text-sm">No federal representatives loaded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {federalOfficials.map(renderOfficialCard)}
              </div>
            )}
          </div>

          {/* State Representatives */}
          <div className="bg-gray-900/20 p-6 rounded-2xl border border-gray-800/50 backdrop-blur-md text-left">
            <div className="flex items-center mb-5 pb-3 border-b border-gray-850">
              <Building className="h-5 w-5 text-purple-400 mr-2.5" />
              <h2 className="text-lg font-bold text-gray-100">State Representatives</h2>
              {currentLocation && <span className="ml-3 text-xs text-gray-400">({currentLocation})</span>}
            </div>

            {stateOfficials.length === 0 ? (
              <p className="text-gray-400 text-sm">No state representatives loaded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stateOfficials.map(renderOfficialCard)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Officials
