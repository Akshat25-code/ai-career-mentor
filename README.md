# AI Career Mentor

## Project Structure

- **client/**: React + Vite frontend
- **server/**: Node.js + Express backend

## Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL installed (optional for initial start, but needed for DB features)

### Setup

1.  **Install Dependencies**
    Open two terminals.

    In Terminal 1 (Server):
    ```bash
    cd server
    npm install
    ```

    In Terminal 2 (Client):
    ```bash
    cd client
    npm install
    ```

2.  **Environment Variables**
    - Go to `server/` and rename `.env.example` to `.env`.
    - Fill in your API keys when you have them.

3.  **Run the App**

    In Terminal 1 (Server):
    ```bash
    npm run dev
    ```
    (Server runs on http://localhost:5000)

    In Terminal 2 (Client):
    ```bash
    npm run dev
    ```
    (Client runs on http://localhost:5173)

## Hackathon Roadmap

Refer to `masterplan.md` for the daily schedule and feature breakdown.
