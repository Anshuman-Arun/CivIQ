import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { MapPin, Calendar, Navigation, Search, Bookmark, Layers } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, TABLES } from "../lib/supabase";
import { getCoordinatesFromZip } from "../lib/openstates";
import { getCivicEvents } from "../lib/civicApi";
import L from "leaflet";

// Custom pulsing icons for Leaflet Map
const getMarkerColor = (type) => {
  switch (type) {
    case 'City Council':
      return '#8b5cf6'; // Violet
    case 'Planning Commission':
      return '#f59e0b'; // Amber
    case 'School Board':
      return '#10b981'; // Emerald
    default:
      return '#0ea5e9'; // Cyan
  }
};

const createPulsingIcon = (type) => {
  const color = getMarkerColor(type);
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
             <div style="position: absolute; width: 18px; height: 18px; border-radius: 9999px; background-color: ${color}; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
             <div style="position: relative; width: 10px; height: 10px; border-radius: 9999px; background-color: ${color}; border: 1.5px solid #ffffff; box-shadow: 0 0 6px ${color};"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
           <div style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background-color: #ef4444; opacity: 0.4; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
           <div style="position: relative; width: 12px; height: 12px; border-radius: 9999px; background-color: #ef4444; border: 2px solid #ffffff; box-shadow: 0 0 8px #ef4444;"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Leaflet hook to programmatically move map
function MapSnap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 13, { animate: true });
  }, [coords]);
  return null;
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [zipCode, setZipCode] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedEvents, setSavedEvents] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const mapCenterRef = useRef({ lat: 39.5296, lng: -119.8138 }); // Default Reno

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Load default Reno events on mount
  useEffect(() => {
    fetchEventsForZip("89509");
  }, []);

  const fetchEventsForZip = async (zip) => {
    try {
      setLoading(true);
      const coords = await getCoordinatesFromZip(zip);
      setUserLocation(coords);
      mapCenterRef.current = coords;
      
      const fetched = await getCivicEvents(coords.city, coords.state, coords.lat, coords.lng);
      setEvents(fetched || []);
    } catch (err) {
      console.error("Error loading events for zip:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!zipCode.trim()) return;
    await fetchEventsForZip(zipCode);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: "Your Location",
          state: "",
          displayName: "Your Location",
        };
        setUserLocation(coords);
        mapCenterRef.current = coords;
        
        // Use generic coords with placeholder details
        const fetched = await getCivicEvents("Local Area", "", coords.lat, coords.lng);
        setEvents(fetched || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  // Load saved events
  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) {
        setSavedEvents([]);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.SAVED_EVENTS)
        .select("event_data");
      if (!error && data) {
        setSavedEvents(data.map((d) => d.event_data.id));
      }
    };
    fetchSaved();
  }, [user]);

  // Save/Unsave event
  const toggleSave = async (event) => {
    if (!user) {
      alert("Please sign in to save events.");
      return;
    }

    const isSaved = savedEvents.includes(event.id);
    if (isSaved) {
      const { error } = await supabase
        .from(TABLES.SAVED_EVENTS)
        .delete()
        .eq("user_id", user.id)
        .filter("event_data->>id", "eq", event.id);

      if (!error)
        setSavedEvents((prev) => prev.filter((id) => id !== event.id));
    } else {
      const { error } = await supabase.from(TABLES.SAVED_EVENTS).insert([
        {
          user_id: user.id,
          event_data: {
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            description: event.description || "",
          },
        },
      ]);
      if (!error) setSavedEvents((prev) => [...prev, event.id]);
    }
  };

  // Filter and search events
  const filteredEvents = events.filter((ev) => {
    const matchesType = selectedType === "All" || ev.type === selectedType;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const mapHeightClass = "h-[350px] sm:h-[450px] lg:h-[calc(100vh-320px)]";

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          CivIQ Local Government & Civic Meetings
        </h1>
        <p className="text-gray-300 mb-6">
          Search by ZIP code or use your current location to discover public meetings, city council sessions, and planning committees near you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* ZIP Code & Search */}
          <div className="flex gap-2 min-w-0 md:col-span-5">
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="ZIP code (e.g. 89509)"
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-civic-500 min-w-0"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Search className="h-4 w-4" /> Search
            </button>
            <button
              onClick={handleUseCurrentLocation}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium px-3 py-2 rounded flex items-center gap-2 transition-colors shrink-0"
              title="Use current GPS location"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2 md:col-span-3">
            <Layers className="h-5 w-5 text-gray-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-civic-500"
            >
              <option value="All">All Meeting Types</option>
              <option value="City Council">City Council</option>
              <option value="Planning Commission">Planning Commission</option>
              <option value="School Board">School Board</option>
              <option value="Community">Community / Other</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div className="flex items-center gap-2 md:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword (e.g., budget)"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-civic-500"
            />
          </div>
        </div>
      </div>

      {/* Map + Event list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden relative shadow-md">
          <div className={mapHeightClass}>
            <MapContainer
              center={[mapCenterRef.current.lat, mapCenterRef.current.lng]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
            >
              <MapSnap coords={userLocation} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                  <Popup>
                    <div className="font-semibold text-gray-100">{userLocation.displayName}</div>
                  </Popup>
                </Marker>
              )}
              {filteredEvents.map((ev) => (
                <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={createPulsingIcon(ev.type)}>
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      <h3 className="font-semibold text-gray-100 mb-1 text-sm">{ev.title}</h3>
                      <p className="text-xs text-gray-300 mb-1">
                        {formatDate(ev.date)}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{ev.location}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Events list */}
        <div
          className={`bg-gray-900 rounded-lg overflow-y-auto border border-gray-700 shadow-md ${mapHeightClass}`}
        >
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center mt-24 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civic-400"></div>
                <p className="text-gray-400">Loading civic events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center text-gray-400 mt-24">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No upcoming events matching your criteria.</p>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const isSaved = savedEvents.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-500 cursor-pointer transition-all duration-200"
                    onClick={() => {
                      setUserLocation({
                        lat: ev.lat,
                        lng: ev.lng,
                        displayName: ev.title,
                      });
                    }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="bg-civic-900 text-civic-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {ev.type}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-100 mt-2 mb-2">
                          {ev.title}
                        </h3>
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {ev.description}
                        </p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-2 text-civic-400" />
                            {formatDate(ev.date)}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-2 text-civic-400" />
                            {ev.location}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid map snapping on click
                          toggleSave(ev);
                        }}
                        className={`p-2 rounded-full border transition-all ${
                          isSaved
                            ? "bg-green-950 border-green-600 text-green-300 hover:bg-green-900"
                            : user
                            ? "border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white"
                            : "border-gray-700 text-gray-600 cursor-not-allowed"
                        }`}
                        title={isSaved ? "Saved" : user ? "Save event" : "Sign in to save events"}
                        disabled={!user}
                      >
                        <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
