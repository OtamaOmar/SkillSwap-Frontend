# SkillSwap Frontend (Vite + React)

React SPA for SkillSwap. Authenticates with the backend via JWT, uses axios interceptors for token refresh, and ships with Tailwind-ready styles. Live at http://skillswap-app.duckdns.org/ (frontend served from a container running on our Azure server).

## Stack
- Vite + React 19 + React Router
- Axios with auth interceptors
- Tailwind-ready PostCSS pipeline

## Getting started (local)
1) Install deps
```bash
npm install
```
2) Set env (optional) in `.env`
```
VITE_API_BASE_URL=http://localhost:4000
```
If omitted, the app uses relative `/api` paths (useful when served behind the same origin/nginx).
3) Run dev server
```bash
npm run dev
# http://localhost:5173
```
4) Production build/preview
```bash
npm run build
npm run preview
```

## API base URL rules
- With `VITE_API_BASE_URL`: requests go to `${VITE_API_BASE_URL}/api`.
- Without it: requests hit `/api` so an nginx or dev proxy should forward to the backend.

## Docker
- Build and run the SPA image
```bash
docker build -t skillswap-frontend:latest .
docker run --rm -p 8000:80 skillswap-frontend:latest
```
- Full stack: from repo root run `docker compose up --build` to start frontend (8000), backend (4000), and Postgres (5432). Inside the network the frontend reaches the API at `http://backend:4000`.

## CI/CD
- CI: `.github/workflows/frontend-ci.yml` installs, lints, and builds on pushes/PRs.
- CD: `.github/workflows/frontend-cd.yml` builds and deploys to Railway; set `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_FRONTEND_SERVICE`, and `VITE_API_BASE_URL` secrets.

## Project layout
```
SkillSwap-Frontend/
├─ src/
│  ├─ pages/           # Chat, feed, auth, profile
│  ├─ components/      # Loading spinner, ProtectedRoute
│  ├─ services/api.js  # Axios instance + API helpers
│  ├─ App.jsx          # Routes
│  └─ main.jsx         # React entry
├─ public/
├─ Dockerfile
└─ vite.config.js
```

## Common issues
- Blank API responses: ensure the backend is reachable at `VITE_API_BASE_URL` or configure a dev proxy.
- Auth loops: clear `localStorage` tokens if refresh fails.
- CORS: set backend `FRONTEND_URL` to the origin serving this app.
