// Local mock events generator
export const getMockCivicEvents = (city, state, lat, lng) => {
  const types = [
    {
      title: 'City Council Meeting',
      description: `Regular meeting of the ${city} City Council to discuss local ordinances, budget proposals, and public feedback.`,
      type: 'City Council',
      location: `${city} City Hall, Council Chambers`,
      offsetLat: 0.005,
      offsetLng: 0.005,
      offsetDays: 3,
      hour: 18 // 6:00 PM
    },
    {
      title: 'Planning Commission Hearing',
      description: `Public hearing regarding new residential and commercial development applications and zoning adjustments in ${city}.`,
      type: 'Planning Commission',
      location: `${city} Municipal Office Building, Room 201`,
      offsetLat: -0.01,
      offsetLng: 0.008,
      offsetDays: 7,
      hour: 17 // 5:00 PM
    },
    {
      title: 'School Board Meeting',
      description: `Monthly Board of Trustees meeting reviewing curriculum updates, school safety policies, and budget allocations for the local school district.`,
      type: 'School Board',
      location: `${city} School District Headquarters`,
      offsetLat: 0.012,
      offsetLng: -0.006,
      offsetDays: 5,
      hour: 19 // 7:00 PM
    },
    {
      title: 'Parks & Recreation Board Meeting',
      description: `Public discussion on public park improvements, summer youth sports leagues, and maintenance scheduling.`,
      type: 'Community',
      location: `${city} Community Center, Main Hall`,
      offsetLat: -0.005,
      offsetLng: -0.01,
      offsetDays: 10,
      hour: 16 // 4:00 PM
    }
  ]
  
  return types.map((t, idx) => {
    const start = new Date()
    start.setDate(start.getDate() + t.offsetDays)
    start.setHours(t.hour, 0, 0, 0)
    
    const end = new Date(start)
    end.setHours(t.hour + 2, 0, 0, 0) // 2 hour duration
    
    return {
      id: `dynamic-event-${idx + 1}`,
      title: t.title,
      description: t.description,
      date: start.toISOString(),
      endDate: end.toISOString(),
      location: t.location,
      lat: lat + t.offsetLat,
      lng: lng + t.offsetLng,
      type: t.type
    }
  })
}

// OpenStates/Gemini integration for dynamic location events
export const getCivicEvents = async (city, state, lat, lng) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.log('Gemini API key missing, using local generator')
    return getMockCivicEvents(city, state, lat, lng)
  }
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = `
Generate a list of 4-6 realistic upcoming local government meetings, public hearings, or civic events for the city of ${city}, ${state}.
For each event, provide:
- id: a unique string ID (e.g. "meeting-1")
- title: the meeting title (e.g. "${city} City Council Meeting", "Planning Commission Hearing", "District School Board Meeting")
- description: a brief description of the meeting focus and agenda
- date: a ISO string date occurring in the next 15 days
- endDate: a ISO string date 2 hours after the start date
- location: realistic address in ${city}, ${state}
- lat: latitude coordinate near ${lat} (perturb slightly by +/- 0.015)
- lng: longitude coordinate near ${lng} (perturb slightly by +/- 0.015)
- type: type of meeting (must be one of: "City Council", "Planning Commission", "School Board", "Community")

Format the response strictly as a JSON array of objects, with no markdown formatting around it (no backticks, no \`\`\`json, etc.).
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini status ${response.status}`);
    }
    
    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');
    
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const events = JSON.parse(cleanedText);
    if (Array.isArray(events)) {
      return events;
    }
    throw new Error('Response is not a JSON array');
  } catch (err) {
    console.error('Gemini events generation failed, using local mock fallback:', err);
    return getMockCivicEvents(city, state, lat, lng);
  }
}
