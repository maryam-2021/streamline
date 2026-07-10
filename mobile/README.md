# StreamLine Mobile (Expo + React Native + TypeScript)

Companion mobile app sharing the StreamLine teal design system. Talks to the same FastAPI backend via Bearer JWT.

## Run locally
```bash
cd mobile
npm install -g expo-cli   # or use npx
yarn install
# Set your backend URL:
#   edit src/api.ts EXPO_PUBLIC_API_URL fallback, or
#   EXPO_PUBLIC_API_URL=https://your-backend.com npx expo start
npx expo start
```
Scan the QR with Expo Go (iOS/Android).

## Auth
Uses `POST /api/auth/login` which returns a `token` (JWT) — stored in AsyncStorage and sent as `Authorization: Bearer <token>` (backend supports Bearer JWT alongside cookies).

## Structure
- `src/theme.ts` — shared design tokens (teal #0d9488 / fuchsia #c026d3, light+dark)
- `src/api.ts` — fetch client with token handling
- `src/screens/` — Login, Overview, Clients, Workflows
- `App.tsx` — auth gate + bottom tab navigation (state-based, zero nav deps)
