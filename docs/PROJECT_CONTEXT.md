# Fellow Project Context

Last audited against `v5.9.2` (`3396132`) on 2026-06-24.

## Product Shape

Fellow (共赴) is a private two-person PWA. Its core promise is not merely a
collection of utilities: both partners should see one trustworthy shared state,
receive timely feedback, and retain clear ownership and privacy boundaries.

Current product areas include authentication and pairing, home dashboard,
pickup deliveries, plans and check-ins, wishes, shared album/food/travel,
moods, health and menstrual records, cosmetics, budget/accounts, shopping,
postgraduate progress, achievements, notifications, and an AI plan assistant.

## Runtime Map

```text
Vue view/component
  -> /api request with Bearer JWT
  -> Express route + authMiddleware
  -> Mongoose model in MongoDB
  -> WebSocket/Web Push side effect after the write
  -> partner view reload or local state update

Vue PWA -> Vite/Workbox service worker -> frontend/dist (CI only)
main push -> GitHub Actions -> backup -> SCP -> PM2 reload -> health check
```

Key entry points:

| Concern | Location |
| --- | --- |
| Frontend bootstrap/update flow | `frontend_source/src/main.js` |
| Routes and auth guard | `frontend_source/src/router/index.js` |
| User/partner state | `frontend_source/src/stores/user.js` |
| Real-time client | `frontend_source/src/composables/useWebSocket.js` |
| API service entry | `backend/server.js` |
| Route registry | `backend/routes/index.js` |
| Authentication | `backend/middleware/auth.js` |
| Models | `backend/models/` |
| Real-time server | `backend/websocket/index.js` |
| PWA configuration | `frontend_source/vite.config.js` |
| Deploy pipeline | `.github/workflows/deploy.yml` |
| Version/changelog | `frontend_source/public/version.json` |

## Scale And Hotspots

The audited source contains about 46,000 lines across 105 JavaScript/Vue files
and 131 API route handlers. There is currently no automated unit or integration
test suite. The largest views are `Plans.vue` (~4,400 lines), `Health.vue`
(~3,100), `Home.vue` (~2,900), `Budget.vue` (~2,200), and `Shopping.vue`
(~2,100). Treat edits in these files as high regression risk and extract only
when a change produces a clear, testable boundary.

## Quality Baseline

Priority order for reaching a mature couple-app standard:

1. **Security and privacy**: production-secret validation, authenticated and
   minimal user lookup, strict CORS, auth rate limiting, request validation, and
   systematic couple/owner authorization.
2. **Data integrity**: central couple-context helper, transactions for pairing,
   unpairing and transfers, idempotent shared mutations, and explicit indexes.
3. **Regression protection**: API integration tests for auth/isolation first,
   then composable/store tests and a small mobile end-to-end happy path.
4. **Operational confidence**: hard-failing deploy health checks, structured
   request/error logs, process readiness, backup restore drills, and dependency
   update policy.
5. **Product coherence**: shared design tokens and primitives, consistent
   loading/empty/error states, accessibility, performance budgets, and a
   deliberate relationship journey rather than isolated feature accumulation.

## Security Baseline

The authentication hardening after `v5.9.1` made limited user profiles private
and relationship-scoped, added strict production JWT configuration, explicit
CORS origins, login/register/pairing rate limits, request validation,
cryptographic pair codes, consent-only binding, route tests, and a high-severity
dependency audit gate.

Recent improvements:

- WebSocket connection tracking now keeps multiple devices per user and
  broadcasts to exact canonical couple members instead of using substring
  checks.

Remaining findings:

- Pairing and unpairing update two user records with sequential saves, so a
  partial failure can leave an asymmetric relationship.
- Two moderate dependency advisories remain behind the `node-cron` 4.x breaking
  upgrade and need a separate scheduler compatibility change.
- Behavioral coverage currently protects authentication boundaries only; core
  couple-owned feature routes still need integration tests.

## Working Strategy

Prefer vertical, reviewable increments. For a feature, update the smallest
complete path (model/route/view/real-time event), add or extend tests, verify the
diff, and push the topic branch. Do security and data-integrity foundations
before another large feature wave; polish cannot compensate for privacy or
shared-state failures in a couple product.
