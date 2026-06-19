# CivIQ 🏛️
> **Submission for the Congressional App Challenge 2025**

## 🌐 Live Website: [civiq-cac.vercel.app](https://civiq-cac.vercel.app)

CivIQ is a modern civic engagement platform designed to make local government transparent, accessible, and easy to understand. Local government decisions, public hearings, and legislative bills affect our daily lives, but finding and parsing this information can feel like a chore. 

CivIQ changes that by combining interactive mapping, live legislative lookups, and AI-powered document summarization into a single, user-friendly dashboard.

---

## 🌟 Key Features

*   **📍 Interactive Civic Events Map**
    Discover local city council meetings, town halls, and public forums near you. Using interactive Leaflet maps, you can search by ZIP code, adjust your search radius, and save events directly to your personal dashboard.
*   **📄 AI-Powered Document Summarizer**
    Municipal PDFs, town proposals, and legislative bills are often dozens of pages of legal jargon. Simply upload them to CivIQ to receive a concise, bulleted summary generated in seconds by Google Gemini.
*   **👥 Local Representatives Directory**
    Find out who represents you at both state and federal levels. Look up their roles, contact information, committee assignments, and check their recent legislative stances and sponsored bills.
*   **🔒 Secure User Dashboards**
    Sign in securely with Google to customize your experience. Track saved public meetings, keep copies of uploaded documents, and access your AI summaries from anywhere.

---

## 🛠️ The Tech Stack

*   **Frontend**: React (Vite) & Tailwind CSS
*   **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth, Storage)
*   **AI Integration**: Google Gemini API (via Google Generative AI SDK)
*   **Maps**: Leaflet.js & React-Leaflet
*   **Routing**: React Router DOM (with rewrites for Vercel SPA routing)

---

## 🚀 Setting Up the Project

### 1. Prerequisites
*   Node.js 18+ installed on your computer.
*   A free account on [Supabase](https://supabase.com).
*   A free API key from [Google AI Studio (Gemini)](https://aistudio.google.com).

### 2. Install Locally
Clone this repository, enter the directory, and install dependencies:
```bash
npm install
```

---

## 🚀 Running Locally

To run the application locally on your machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/Anshuman-Arun/CivIQ.git
   cd CivIQ
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` variables (refer to `env.example`)
4. Start the development server:
   ```bash
   npm run dev
   ```

