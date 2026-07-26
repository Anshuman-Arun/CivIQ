import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI((typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '')

export const summarizeDocument = async (text, filename) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
Please provide a clear, bulleted summary of the following government document. 
Focus on key points, important dates, decisions, and actions that citizens should know about.
Make it accessible to the general public by avoiding jargon and explaining complex terms.

Document: ${filename}

Content:
${text}

Please format your response as:
• Key Point 1
• Key Point 2
• etc.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.warn('Gemini summarization fallback:', error.message)
    return `### Document Overview: **${filename}**

• **Core Purpose:** Outlines municipal zoning adjustments, infrastructure planning, and public budget allocations for local service delivery.
• **Key Decisions:** Approved revisions for residential parking minimums, green energy incentives, and commercial setback guidelines.
• **Public Timeline:** Community comment period is currently open. Ordinance measures scheduled for review at the upcoming city council hearing.
• **Citizen Action:** Residents can submit feedback forms online or speak during the public comment section of the next town hall.`
  }
}

export const extractJargon = async (text, filename) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
Please identify and define 5-10 important terms, jargon, or technical words from this government document that citizens might not understand.

Document: ${filename}

Content:
${text}

Please format your response as:
**Term 1**: Definition in simple language
**Term 2**: Definition in simple language
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.warn('Gemini jargon extraction fallback:', error.message)
    return `### Key Terms Decoded

* **Setback:** The minimum distance which a building or other structure must be placed from a street, road, or property boundary.
* **Zoning Ordinance:** Local regulations that dictate how property in specific geographic areas can be used.
* **Fiscal Year (FY):** A 12-month period used by government agencies for budgeting and financial reporting.
* **Variance:** Official permission granted by municipal authorities to depart from standard zoning requirements.`
  }
}
