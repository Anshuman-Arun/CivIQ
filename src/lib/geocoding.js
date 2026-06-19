// Simple geocoding utility using OpenStreetMap Nominatim API
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    )
    
    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }
    
    const data = await response.json()
    
    if (data.length === 0) {
      throw new Error('Address not found')
    }
    
    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      address: result.display_name
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    throw new Error('Unable to find address. Please try a different format.')
  }
}

// Validate zip code format (US)
export const validateZipCode = (zipCode) => {
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zipCode)
}

// Get location from zip code using a simple service
export const getLocationFromZipCode = async (zipCode) => {
  try {
    // Using a simple zip code to coordinates service
    const response = await fetch(
      `https://api.zippopotam.us/us/${zipCode}`
    )
    
    if (!response.ok) {
      throw new Error('Zip code not found')
    }
    
    const data = await response.json()
    
    if (data.places && data.places.length > 0) {
      const place = data.places[0]
      const city = `${place['place name']}, ${place['state abbreviation']}`
      
      // Return coordinates directly from zippopotam.us data
      return {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
        displayName: city,
        address: city
      }
    }
    
    throw new Error('Location not found for zip code')
  } catch (error) {
    console.error('Zip code lookup error:', error)
    throw new Error('Unable to find location for zip code')
  }
}
