# CivIQ

CivIQ is a lightweight civic-information demo that:

- lists sourced state and local government meetings;
- resolves a street address to current federal and state representatives; and
- produces temporary, plain-language document analyses.

It is designed to live in GitHub and deploy directly to Vercel. There is no
user database: **Sign In as Guest** starts a tab-scoped session, and saved
events, uploaded files, and summaries are cleared when the session ends or the
page reloads.

## Data integrity

CivIQ never generates meetings, officials, votes, political positions, or
contact details. If an official source is unavailable, the interface says so.
Every civic record includes its source.

Current sources:

- U.S. Census Geocoder for address-to-district matching;
- Congress.gov for current federal members and sponsored-legislation policy
  areas;
- official House Clerk and U.S. Senate roll-call records for recent federal
  votes;
- OpenStates for state legislators and state legislative events; and
- official municipal websites and calendar feeds discovered by a bounded,
  robots-aware crawler for local meetings.

AI document analysis is explicitly labeled and should be verified against the
original document.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
copy .env.example .env
npm run dev
```

The Vite development server also serves the `/api` functions locally, so one
command runs the full app.

The existing code accepts legacy `VITE_*` key names on the server for local
migration, but new deployments should use the unprefixed names below.

## Environment variables

| Variable | Required for | Where to obtain it |
| --- | --- | --- |
| `GEMINI_API_KEY` | Document analysis | Google AI Studio |
| `GEMINI_MODEL` | Optional model override | Defaults to `gemini-3.6-flash` |
| `OPENSTATES_API_KEY` | State officials and events | OpenStates |
| `CONGRESS_API_KEY` | Federal representatives | api.data.gov / Congress.gov |

Keys are read only by files under `/api`; they are not included in the browser
bundle. If a key is omitted, the affected feature shows a configuration notice
while the rest of CivIQ remains usable.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Add the desired environment variables in **Project Settings → Environment
   Variables**.
4. Deploy. Vercel detects the Vite frontend and the functions in `/api`.

No Supabase project, OAuth provider, storage bucket, migration, or persistent
database is required.

GitHub Pages can host the frontend shell, but it cannot run the `/api`
functions. Deploy the same repository to Vercel for live civic data and
document analysis.

## Quality checks

```bash
npm run check
```

This runs ESLint, Node API-normalizer tests, and a production Vite build. The
same command runs in GitHub Actions for pushes and pull requests.

## Privacy

- Guest identity exists only in `sessionStorage`.
- Saved events and document results exist only in React memory.
- Original documents are not stored by CivIQ.
- Documents are transmitted to Google Gemini only when the user explicitly
  selects a file for analysis.
- Ending the session revokes local object URLs and clears all session data.
