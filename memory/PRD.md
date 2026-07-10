# StreamLine — PRD

## Original Problem Statement
Teal-themed workflow automation product: marketing site (landing, pricing, contact) + dashboard, shared design system (teal #0d9488, fuchsia #c026d3, DM Serif Display + DM Sans), light/dark theme, MongoDB persistence. Later: full web app with dashboard, clients CRM, workflow automation.

## Architecture
- Frontend: React (CRA + craco), Tailwind + shadcn, framer-motion, sonner
- Backend: FastAPI + Motor (MongoDB), JWT (PyJWT + bcrypt) + Emergent Google Auth sessions
- DB: MongoDB (collections: users, user_sessions, login_attempts, contacts, clients, workflows, runs)

## User Personas
- Admin: sees all data + Leads inbox (contact form submissions)
- Client: registered users managing their own clients & workflows

## Implemented (Jul 2026)
### Phase 1 — Marketing site (done, tested iteration_1: 100%)
- Landing (hero, bento features), pricing (Starter/Pro/Enterprise, Pro highlighted), contact form → MongoDB, sticky glass navbar, dark-mode toggle (localStorage 'streamline-theme'), multi-column footer

### Phase 2 — Auth + Dashboard (done, tested iteration_2: backend 17/17, UI 9/9)
- Dual auth: JWT email/password (httpOnly cookies, brute-force lockout via X-Forwarded-For+email keying, admin seeding) + Emergent Google login (/api/auth/session)
- Dashboard: stats overview (clients/workflows/runs/leads + recent runs), Clients CRM (CRUD, dialog forms), Workflow builder (trigger + steps, active/pause toggle, simulated Run with history), Leads inbox (admin-only)
- Role scoping: owner_filter (admin sees all, clients see own)

### Phase 3 — Lead email notifications (Jul 2026)
- Resend integration wired: contact form submission triggers background email to NOTIFY_EMAIL/ADMIN_EMAIL with teal-branded HTML template
- MOCKED until user adds RESEND_API_KEY to backend/.env (currently logs notification instead of sending)

### Phase 4 — Real workflow engine + PWA + Mobile scaffold (Jul 2026, tested iteration_3: 29/29 backend, UI 100%)
- Real execution: webhook steps do actual HTTP POST (10s timeout, per-step results stored in runs.steps_results); action steps are logged no-ops
- Event-driven triggers: contact form submission auto-runs matching active workflows (global), new client auto-runs owner's matching workflows; paused workflows never auto-run; runs tagged triggered_by manual/auto
- PWA: manifest.json (teal theme), service worker (offline shell), icons, installable; dashboard mobile bottom tab bar
- Mobile scaffold: /app/mobile Expo + React Native + TypeScript app (shared teal tokens, Bearer JWT auth via token field in login response) — runnable locally with `npx expo start`, NOT runnable in this environment

## MOCKED
- Workflow runs are SIMULATED (random duration, ~90% success) — no real external actions

## Credentials
See /app/memory/test_credentials.md (admin@streamline.app / StreamAdmin#2026; client@test.com / Client#123)

## Backlog (prioritized)
- P0: none outstanding
- P1: Real workflow execution (webhooks/integrations), email notifications on contact submissions (Resend/SendGrid), password reset flow UI
- P2: Mobile companion app (Phase 4 of original plan), deploy to Cloudflare Pages + Render + Atlas (Phase 5), pagination for lists, contact form rate limiting, split server.py into modules

## Next Tasks
- Mobile app port (shared design tokens)
- Deployment wiring ($0/month stack) — use Emergent deploy or user's Cloudflare/Render plan
