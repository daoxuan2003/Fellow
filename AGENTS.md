# Fellow Agent Guide

This file is the compact entry point for every change. Read it before opening
feature files. Use `docs/PROJECT_CONTEXT.md` only when broader product or
architecture context is needed, and use `.agents/skills/fellow-dev/SKILL.md`
for the complete Git and release procedure.

## Repository

- The canonical working copy is `E:\Fellow`.
- `frontend_source/` is the Vue 3/Vite PWA source.
- `backend/` is the Express/Mongoose/WebSocket service.
- `frontend/dist/` is CI output. Never edit or commit it and do not build it
  locally.
- Production deploys automatically when `main` is pushed.

## Product Invariants

These rules are more important than local implementation convenience:

1. Derive the acting user from the verified JWT. Never trust a client-supplied
   `userId`, `partnerId`, `coupleId`, owner, or completion actor.
2. Couple-owned data must be queried through the authenticated user's current
   relationship. The canonical couple key is
   `[userId, partnerId].sort().join('_')`.
3. Personal records remain private unless the feature explicitly defines
   partner visibility. Creator-only edits and deletes must be enforced on the
   server, not only hidden in the UI.
4. Write database state successfully before emitting WebSocket or Web Push
   events. Shared writes should be atomic or idempotent where retries or two
   simultaneous users are possible.
5. Keep API responses free of passwords, tokens, pairing codes, storage
   credentials, and unrelated personal fields.
6. Date-only values represent the user's local calendar day. Do not derive
   them with UTC slicing when that can move the day in Asia/Shanghai.
7. Every user-facing mutation needs a loading state, a useful empty/error
   state, mobile-safe layout, and a real-time refresh path when the partner can
   affect the same data.

## Change Workflow

1. Start clean from `develop`, update it, and create one scoped branch using
   `feature/`, `fix/`, `docs/`, `refactor/`, or `style/`.
2. Inspect the route, model, view, and real-time event path for the feature.
   Avoid reading unrelated large views unless required.
3. Keep changes narrow. Do not mix feature work, broad refactors, release
   metadata, or generated output.
4. Run the relevant checks and review the complete diff before committing.
5. Use Conventional Commit subjects in Chinese, for example
   `fix: 修复情侣数据越权访问`.
6. Push only the topic branch for review. Do not push directly to `develop` or
   `main`.
7. Only when the user explicitly requests a release: update
   `frontend_source/public/version.json`, preserve all changelog history, merge
   `develop` into `main`, create the semantic version tag, and push both.

## Verification

Always run:

```powershell
git diff --check
git status --short
git diff --stat
git diff
```

For backend changes:

```powershell
Set-Location backend
npm run verify
```

For frontend changes, do not create `frontend/dist` locally. Push the topic
branch and require the GitHub `Test` workflow's clean Vite build to pass. UI
changes also require manual checks at narrow mobile width, safe-area edges,
loading, empty, error, and partner-update states.

For API/model changes, self-review authentication, couple scoping, ownership,
validation, concurrency, response shape, and WebSocket/Web Push side effects.

## Definition Of Done

- The requested behavior and failure behavior are both implemented.
- No private route relies on identity supplied by the request body or query.
- Existing couple data remains readable and migration compatibility is clear.
- Relevant local checks and remote CI pass.
- The diff contains no secrets, logs, temporary files, build output, or
  unrelated edits.
- The topic branch is committed and pushed. Production is changed only through
  the explicit release flow.
