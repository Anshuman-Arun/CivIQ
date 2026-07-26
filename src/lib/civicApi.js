// Realistic Local Civic Events Generator for any US City/State
export const getMockCivicEvents = (city = 'Local Area', state = '', lat = 39.5296, lng = -119.8138) => {
  const cityName = city && city !== 'Your Location' ? city : 'City';
  const stateStr = state ? `, ${state}` : '';

  const eventTemplates = [
    {
      id: `ev-${cityName.toLowerCase().replace(/\s+/g, '-')}-1`,
      title: `${cityName} City Council Public Hearing: Downtown Infrastructure & Transit Plan`,
      description: `Official public session of the ${cityName} City Council reviewing proposed municipal transit expansion, downtown parking minimum adjustments, and commercial setback ordinances. Citizen public comment period open.`,
      type: 'City Council',
      location: `${cityName} City Hall — Main Council Chambers, 100 Civic Center Way${stateStr}`,
      offsetLat: 0.003,
      offsetLng: 0.004,
      offsetDays: 3,
      hour: 18 // 6:00 PM
    },
    {
      id: `ev-${cityName.toLowerCase().replace(/\s+/g, '-')}-2`,
      title: `${cityName} Planning Commission: Residential Zoning & Environmental Review`,
      description: `Public hearing regarding multi-family housing development permits, environmental impact assessments, and neighborhood traffic mitigation strategies in high-density sectors of ${cityName}.`,
      type: 'Planning Commission',
      location: `${cityName} Municipal Building — Room 201, 250 Government Center Dr${stateStr}`,
      offsetLat: -0.006,
      offsetLng: 0.007,
      offsetDays: 6,
      hour: 17 // 5:00 PM
    },
    {
      id: `ev-${cityName.toLowerCase().replace(/\s+/g, '-')}-3`,
      title: `${cityName} School Board Meeting: Facilities Upgrade & STEM Funding`,
      description: `Regular meeting of the ${cityName} School Board of Trustees reviewing the 2026-2027 academic budget allocations, classroom technology integration, and campus safety modernization.`,
      type: 'School Board',
      location: `${cityName} School District HQ — Board Auditorium, 500 Education Blvd${stateStr}`,
      offsetLat: 0.008,
      offsetLng: -0.005,
      offsetDays: 9,
      hour: 19 // 7:00 PM
    },
    {
      id: `ev-${cityName.toLowerCase().replace(/\s+/g, '-')}-4`,
      title: `${cityName} County Board of Supervisors: Public Safety & Health Services`,
      description: `County commissioner public meeting on emergency services staffing, community health program grants, and regional park conservation funding across ${cityName} county districts.`,
      type: 'Community',
      location: `${cityName} County Administration Building — Room 105${stateStr}`,
      offsetLat: -0.004,
      offsetLng: -0.008,
      offsetDays: 12,
      hour: 16 // 4:00 PM
    },
    {
      id: `ev-${cityName.toLowerCase().replace(/\s+/g, '-')}-5`,
      title: `${cityName} Climate & Sustainability Committee Open Workshop`,
      description: `Public advisory workshop gathering resident feedback on municipal solar energy targets, EV charging infrastructure expansion, and green space preservation goals for ${cityName}.`,
      type: 'Community',
      location: `${cityName} Public Library — Main Community Auditorium${stateStr}`,
      offsetLat: 0.005,
      offsetLng: -0.002,
      offsetDays: 14,
      hour: 18 // 6:00 PM
    }
  ];

  return eventTemplates.map((t) => {
    const start = new Date();
    start.setDate(start.getDate() + t.offsetDays);
    start.setHours(t.hour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(t.hour + 2, 0, 0, 0);

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      date: start.toISOString(),
      endDate: end.toISOString(),
      location: t.location,
      lat: lat + t.offsetLat,
      lng: lng + t.offsetLng,
      type: t.type
    };
  });
};

/**
 * Fetch Civic Events using Gemini AI or Local Detailed Generator
 */
export const getCivicEvents = async (city, state, lat, lng) => {
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  if (!apiKey) {
    return getMockCivicEvents(city, state, lat, lng);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `
Generate a list of 5 realistic upcoming local government meetings and civic hearings for ${city}, ${state}.
Format strictly as JSON array of objects with keys: id, title, description, date (ISO string), endDate (ISO string), location, lat (near ${lat}), lng (near ${lng}), type (one of "City Council", "Planning Commission", "School Board", "Community").
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
    if (Array.isArray(events) && events.length > 0) {
      return events;
    }
    throw new Error('Invalid events response');
  } catch (err) {
    console.warn('Gemini events generation fallback to local generator:', err.message);
    return getMockCivicEvents(city, state, lat, lng);
  }
};
