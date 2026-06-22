# Fellow Project Context

Last audited against `v5.9.0` (`cd4f9af`) on 2026-06-22.

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

## First Audit Findings

- `GET /api/user/:userId` is public and returns account, pair code, relationship
  and profile fields. Replace it with authenticated, purpose-specific minimal
  responses before broader public use.
- HTTP CORS currently accepts every origin, and auth/register routes have no
  visible rate limiting or request-schema validation.
- JWT code falls back to a known development secret. Production should fail
  startup when `JWT_SECRET` is absent or weak.
- WebSocket storage keeps only one connection per user even though the product
  can run on multiple devices. Couple broadcast membership is inferred with a
  string `includes` check instead of verified membership metadata.
- Pairing and unpairing update two user records with sequential saves, so a
  partial failure can leave an asymmetric relationship.
- CI previously checked only `backend/server.js`; `npm run check` now covers all
  backend JavaScript. There is still no behavioral test coverage.
- The deploy health check previously printed failure without failing the job;
  it now exits nonzero when the API is unhealthy.

## Working Strategy

Prefer vertical, reviewable increments. For a feature, update the smallest
complete path (model/route/view/real-time event), add or extend tests, verify the
diff, and push the topic branch. Do security and data-integrity foundations
before another large feature wave; polish cannot compensate for privacy or
shared-state failures in a couple product.
