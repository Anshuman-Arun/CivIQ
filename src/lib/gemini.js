import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export const summarizeDocument = async (text, filename) => {
  try {
    // Using gemini-2.5-flash for reliable speed and quota
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
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

Keep it concise but comprehensive, focusing on the most important information for citizens.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error summarizing document:', error)
    throw new Error('Failed to summarize document')
  }
}

export const extractJargon = async (text, filename) => {
  try {
    // Using gemini-2.5-flash for reliable speed and quota
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const prompt = `
Please identify and define 5-10 important terms, jargon, or technical words from this government document that citizens might not understand.

Document: ${filename}

Content:
${text}

Please format your response as:
**Term 1**: Definition in simple language
**Term 2**: Definition in simple language
etc.

Focus on terms that are:
- Technical or legal jargon
- Government-specific terminology
- Important for understanding the document's meaning
- Not commonly known to the general public

Keep definitions concise and in plain language that a regular citizen can understand.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error extracting jargon:', error)
    throw new Error('Failed to extract jargon')
  }
}
