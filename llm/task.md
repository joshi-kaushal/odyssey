# Odyssey: WhatsApp Gateway — Task List

## M1: Scaffolding ✅
- [x] `package.json` with dependencies
- [x] `Dockerfile` & `docker-compose.yml`
- [x] `.env.example` & `config.json`

## M2: TypeScript Migration ✅
- [x] `package.json` — TS, Zod, Swagger deps; LangGraph removed; scripts updated
- [x] `tsconfig.json` — strict mode, commonjs, outDir: dist
- [x] `src/types/config.ts` — `AppConfig`, `OdysseyConfig` + Zod schemas
- [x] `src/types/session.ts` — `UserSession` + Zod schema
- [x] `src/types/payload.ts` — `WebhookPayload` + Zod schema
- [x] `src/types/ai.ts` — `ClassificationResult` + Zod schema
- [x] `src/types/env.ts` — `Env` + Zod schema (all env vars)
- [x] `src/config/env.ts` — validates env at startup, exports typed `env`
- [x] `src/config/index.ts` — loads & validates `config.json`, cached singleton

## M3: Baileys Core ✅
- [x] `src/index.ts` — Baileys init, QR, reconnect, message listener

## M4: Inbound Whitelist ✅
- [x] `ALLOWED_NUMBERS` parsed in `src/index.ts`, non-whitelisted messages silently dropped

## M5: Explicit Command Router ✅
- [x] `src/router/index.ts` — Tier 1: case-insensitive prefix matching

## M6: Session Store ✅
- [x] `src/session/index.ts` — in-memory Map, 5min TTL, `getSession` / `setSession`

## M7: AI Classifier ✅
- [x] `src/ai/index.ts` — LangChain + Gemini Flash, Zod-validated JSON output
- [x] Low-confidence fallback: try direct Gemini answer before giving up

## M8: Webhook Forwarder ✅
- [x] `forwardToApp()` in router — configurable timeout, non-2xx logged not thrown

## M9: Egress API ✅
- [x] `POST /send` in `src/api/routes.ts` — API key auth, plain phone numbers

## M10: Health Check ✅
- [x] `GET /health` — returns `{ status, whatsapp }` for Railway monitoring

## M11: Swagger Docs ✅
- [x] `GET /docs` — swagger-jsdoc + swagger-ui-express, annotations in routes.ts

## M12: README 🔲
- [ ] Setup (local + Railway), architecture, env vars, config.json schema, how to add new app

## M13: Railway Deploy ✅
- [x] Multi-stage `Dockerfile` (builder + runtime)
- [x] Updated `.env.example` with all new vars
- [x] Volume mount path: `/app/auth_info_baileys`
- [x] `config.json` updated to new schema (`{ webhook_url, description }` per app)
- [x] Old `index.js` removed

## M14: Live in a Week Integration ✅
- [x] **Odyssey** — `AppConfig` type + Zod schema: added optional `webhook_secret` field
- [x] **Odyssey** — `router/index.ts`: `forwardToApp()` sends `x-gateway-secret` header when secret is set
- [x] **Odyssey** — `config.json`: `live_in_a_week` app entry has `webhook_secret` placeholder
- [x] **Odyssey** — `.env.example`: documented `LIAW_WEBHOOK_SECRET` per-app secret pattern
- [x] **LIAW** — `app/api/webhook.py` renamed to `whatsapp-metacloudapi.py` (archived, not imported)
- [x] **LIAW** — `app/api/webhook.py` (new): accepts `OdysseyWebhookPayload`, validates `x-gateway-secret`, calls existing bot handler
- [x] **LIAW** — `app/services/whatsapp_service.py`: `send_text_message()` now calls Odyssey `/send`; Meta functions commented out
- [x] **LIAW** — `app/config.py`: added `ODYSSEY_URL`, `ODYSSEY_API_KEY`, `ODYSSEY_WEBHOOK_SECRET`; Meta fields commented out
- [x] **LIAW** — `.env.example`: replaced Meta vars with Odyssey vars (Meta kept as comments)

---

## Notes
- **Pause for review after each milestone**
- TypeScript strict mode, no `any`, Zod for all external data
- WHY comments only, no unnecessary comments
- Session switching is implicit (explicit commands + high-confidence AI override session)
- `config.json` now uses `{ webhook_url, description }` per app (breaking change from v1)
