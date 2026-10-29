# Personalizēts balss aģents

A demo web platform for Veselības forums (Pauls Jansons challenge). A person comes
to the site themselves, talks through their hesitation about a preventive
**screening**, by voice or text, understands the next step, and finds a sample
appointment time that fits their schedule.

> **Everything shown is a prototype with fictional sample data.** The AI screening
> assistant is **not a doctor**, gives no diagnosis or medical advice, and makes no
> outbound phone calls. Centers, times and prices are made up. Not certified, not
> doctor-approved, not a medical record, not a GDPR-compliance claim.

The working name **Personalizēts balss aģents** and the demo city **Riga** are configurable (see env).

## What's implemented

- **Landing page**: "Your next step, at your pace", How-it-works, honest disclaimer, no sign-up.
- **Cabinet** (`/demo`) with tabs: Conversation, Options, My plan, Demo calendar; "Demo · Sample data" marker; **Reset demo**.
- **Text chat** against a server route that uses OpenAI with **tool-calling** when `OPENAI_API_KEY` is set, and a clearly-labeled **scripted fallback** when it isn't.
- **Real voice** via the **OpenAI Realtime API over WebRTC**: the persistent key stays server-side; the browser gets a short-lived client secret from `/api/realtime/session`. Male voice id is configurable. States: Microphone off / Connecting / Listening / Speaking / Connection lost / Voice unavailable. Ending a call closes the connection, stops all mic tracks, and caps session length. Voice turns appear in the chat history (transcripts are approximate).
- **Deterministic slot matching** (`lib/slots.ts`): no overlap with busy time, travel-time buffer, preferred weekday + part of day, Europe/Riga dates, UI weekday always matches the date. The AI never invents slots or prices. It only calls server tools over fixed fixtures, and all tool arguments are validated with zod.
- **My plan**: save / view / remove, "I have booked" is only set on explicit confirmation (never from opening a link), explicitly-fake booking hand-off that sends no data and creates no record.
- **Demo calendar**: sample week with busy blocks and free windows; change availability (Morning / Afternoon / After work / Any time) and options update.
- **Google Calendar availability**: optional OAuth connection inside the cabinet. The app requests only the `calendar.freebusy` scope, imports busy intervals without event titles, and never creates or changes events.
- **Browser-local demo mode**: state lives in this browser only (localStorage), clearly not a connected database.
- **Guardrails**: input validation, message-size and count limits, chat + voice rate limiting, session-length cap, origin checks on API routes, server-side tool validation, no secrets in client code, emergency-signal handoff.
- **Tests**: unit tests for interval matching and tool-argument handling (`__tests__/`).

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: fill in keys for real AI + voice
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest (17 tests)
npm run build       # production build
```

## Environment variables

Set in `.env.local` (never commit; never use `NEXT_PUBLIC_` for secrets):

| Variable | Needed for | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Text AI + real voice | Server-only. Without it: scripted chat + "Voice unavailable". |
| `OPENAI_TEXT_MODEL` | Text chat | Default `gpt-4o-mini`. |
| `OPENAI_REALTIME_MODEL` | Voice | Default `gpt-4o-realtime-preview`. Verify against current OpenAI docs. |
| `OPENAI_REALTIME_VOICE` | Voice | Default `ash` (male-leaning). Verify availability. |
| `DATABASE_URL` | Neon (optional) | Not yet wired. See below. |
| `GOOGLE_CLIENT_ID` | Google Calendar OAuth | Server-only OAuth web client id. |
| `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth | Server-only OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | Google Calendar OAuth | Exact registered callback, for example `http://localhost:3000/api/google-calendar/callback`. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Google Calendar OAuth | Long random server-only value used to encrypt the HttpOnly token cookie. |
| `NEXT_PUBLIC_DEMO_CITY` | Config | Default `Riga`. |
| `NEXT_PUBLIC_PRODUCT_NAME` | Config | Default `Personalizēts balss aģents`. |

## What's connected vs. not

- **Text chat:** works now (scripted without a key, real AI with one).
- **Real voice:** code is complete; needs `OPENAI_API_KEY` and a Realtime-enabled account. Verify the model/voice names are still current before the demo.
- **Neon:** schema and ownership model are in [`db/schema.sql`](db/schema.sql) but **intentionally not wired in**. Without real authentication we don't store medical profiles in a shared DB, so the app runs in browser-local demo mode. Wiring requires: auth/owner key, server-only parameterized queries, and per-owner checks.
- **Google Calendar:** the OAuth/free-busy integration is wired. To enable it, create a Google OAuth 2.0 Web application, enable Calendar API, register `/api/google-calendar/callback`, and set the four Google environment variables. Only encrypted session tokens are stored; production should move tokens to owner-scoped server storage when user authentication is added.
- **Deployment:** targets Vercel. Not yet deployed from here (no Vercel credentials in this environment).

## Deploy to Vercel

1. Push this repo to Git.
2. Import into Vercel (Next.js auto-detected).
3. Add the env vars above as Vercel project secrets (not `NEXT_PUBLIC_` for keys).
4. Deploy. Add `DATABASE_URL` only once DB persistence is wired with auth.

## Layout

```
app/            landing, /demo cabinet, api/chat, api/realtime/session
components/     Chat, VoicePanel, VoiceOrb, OptionCard, PlanView, CalendarView, BookingDialog, ui/
lib/            config, types, date (tz-safe), fixtures, slots (matching), tools (zod + exec),
               agent (system prompt), reference-content (sourced, dated), scripted fallback,
               rate-limit, store (browser-local)
db/schema.sql  optional Neon schema (not wired)
__tests__/     slot matching + tool argument tests
```
