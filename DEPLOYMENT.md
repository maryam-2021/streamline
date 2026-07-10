# StreamLine — $0/month Deployment Guide

| Layer    | Service                    | Free tier                          |
|----------|----------------------------|------------------------------------|
| Frontend | Cloudflare Pages (GitHub)  | Unlimited static hosting + CDN     |
| Backend  | Render (render.yaml)       | Free web service (sleeps when idle, ~30s cold start) |
| Database | MongoDB Atlas M0           | 512 MB, free forever               |
| Repo/CI  | GitHub                     | Free                               |

## 1. Push to GitHub
Use the "Save to GitHub" feature in Emergent (or `git push`) to get this repo on GitHub.

## 2. MongoDB Atlas (M0)
1. https://cloud.mongodb.com → Create free M0 cluster
2. Database Access → add a user (username + password)
3. Network Access → allow `0.0.0.0/0` (Render's IPs rotate)
4. Copy the connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net`

## 3. Backend → Render
1. https://render.com → New → Blueprint → connect your GitHub repo (uses `render.yaml` in repo root)
   — or New → Web Service manually:
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
2. Environment variables:
   - `MONGO_URL` = Atlas connection string
   - `DB_NAME` = `streamline`
   - `JWT_SECRET` = long random hex (`python -c "import secrets;print(secrets.token_hex(32))"`)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` = your admin credentials
   - `CORS_ORIGINS` = your Cloudflare Pages URL (e.g. `https://streamline.pages.dev`)
   - Optional: `RESEND_API_KEY`, `SENDER_EMAIL`, `NOTIFY_EMAIL` for lead emails
3. Note your backend URL, e.g. `https://streamline-api.onrender.com`

## 4. Frontend → Cloudflare Pages
1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → connect GitHub repo
2. Build settings:
   - Root directory: `frontend`
   - Build command: `yarn build`
   - Output directory: `build`
3. Environment variable:
   - `REACT_APP_BACKEND_URL` = your Render backend URL (no trailing slash)
4. SPA routing is handled by `frontend/public/_redirects` (already in repo).

## 5. Final wiring
- Update `CORS_ORIGINS` on Render to the final Pages URL.
- Google login (Emergent Auth) works from any domain — it redirects back to `window.location.origin`.
- PWA: visit the Pages URL on your phone → "Add to Home Screen".

## Gotchas
- Render free tier sleeps after ~15 min idle; first request takes ~30s (acceptable early stage).
- Never commit real secrets — use each platform's env var settings. `.env` files in this repo are for local dev only.
