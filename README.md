# AI Career Mentor

AI Career Mentor is a hackathon-ready web app that helps students improve their **resume**, practice **mock interviews**, and follow a **career roadmap**.

## Features
- **Google OAuth login** (Passport + session cookies)
- **Resume analysis**
    - PDF upload with text fallback
    - ATS score (0–100) + section breakdown + quick wins + before/after example
    - Optional job description keyword-gap suggestions
    - Version history + side-by-side compare
- **Mock interviews (text-based)**
    - Choose type + difficulty
    - Instant feedback + model answer
    - End-interview summary
- **Roadmap**
    - Generated checklist with progress tracking
    - Simple dynamic update (auto-unlocks an “Advanced” phase)
- **Free-tier quotas** (monthly) for resume analyses + interviews

> Optional: If `ANTHROPIC_API_KEY` is set, resume/interview feedback uses Anthropic; otherwise it falls back to heuristic scoring.

## Tech Stack
- **Client:** React + Vite + Tailwind
- **Server:** Node.js + Express + Passport (Google OAuth) + `express-session`
- **DB:** PostgreSQL (recommended: Neon)

## Project Structure
- `client/` – frontend (Vite)
- `server/` – backend (Express)

## Quick Start (Windows PowerShell)

### 1) Install dependencies
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\server"
npm install
```

```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\client"
npm install
```

### 2) Configure environment variables
Create `server/.env` (copy from `server/.env.example`) and fill these:

- `DATABASE_URL` (Neon connection string)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (default: `http://localhost:5000/api/auth/google/callback`)
- `SESSION_SECRET`
- Optional: `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`

### 3) Initialize the database (no psql required)
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\server"
npm run db:init
```

### 4) Run dev servers
Server:
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\server"
npm run dev
```

Client:
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\client"
npm run dev
```

Open:
- Client: `http://localhost:5173`
- Server health: `http://localhost:5000/`

## Google OAuth Setup (required)
In Google Cloud Console:
1. Create OAuth Client ID (Web application)
2. Add Authorized redirect URI:
     - `http://localhost:5000/api/auth/google/callback`
3. Put the client ID/secret into `server/.env`

## Useful API Endpoints
- `GET /api/dashboard/summary`
- `POST /api/resume/upload`
- `POST /api/resume/analyze`
- `GET /api/resume/history`
- `POST /api/interview/start`
- `POST /api/interview/:id/turn`
- `GET /api/interview/:id/summary`
- `POST /api/roadmap/generate`
- `POST /api/roadmap/milestone`
- `GET /api/usage/status`
- `POST /api/demo/seed`

## Demo (Golden Path)
Option A (in-app):
- Log in
- Go to Dashboard → click **Seed demo data**

Option B (script):
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\server"
npm run demo:seed -- --email you@example.com
```

## Lint
```powershell
cd "d:\Project\Hackathon_Project\vibe_hack(2.0)\ai-career-mentor\client"
npm install
npm run lint
```

## Troubleshooting
- **Google error `redirect_uri_mismatch`:** your Google Console redirect URI must exactly match `GOOGLE_CALLBACK_URL`.
- **DB errors:** verify `DATABASE_URL` is correct, then run `npm run db:init` again.
- **Quota exceeded (429):** increase `FREE_RESUME_ANALYSES` / `FREE_INTERVIEWS` in `server/.env`.

## Hackathon Plan
See `masterplan.md` for scope, milestones, pitch plan, and cut list.
