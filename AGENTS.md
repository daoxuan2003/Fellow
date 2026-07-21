# Fellow Agent Guide

`AI_PROJECT_INDEX.md` is the canonical context map. Read it first on every new
task, then read this file, `docs/project/ACTIVE_WORK.md`, and only the
source/contracts relevant to the task. Never use a previous chat session as the
only project memory.

Use `docs/PROJECT_CONTEXT.md` for broader product and architecture context,
`docs/ai/AI_TASK_PROTOCOL.md` and `docs/ai/AI_ORCHESTRATION.md` for the task
lifecycle, `docs/ai/CODEX_RUNBOOK.md` for executable commands, and
`.agents/skills/fellow-dev/SKILL.md` for the complete Git and release procedure.

## Repository

- The canonical working copy is `E:\Fellow`.
- `frontend_source/` is the Vue 3/Vite PWA source.
- `backend/` is the Express/Mongoose/WebSocket service.
- `frontend/dist/` is CI output. Never edit or commit it and do not build it
  locally.
- Production deploys automatically when `main` is pushed.
- Production `.env`, MongoDB contents, server topology, object storage, and
  GitHub Secrets are not implied by repository examples.

## Evidence And Uncertainty

Use these exact labels in plans and handoffs:

- `VERIFIED`: confirmed from source, a command, CI, or a privacy-safe runtime
  report.
- `INFERRED`: a reasoned conclusion based on verified facts.
- `UNKNOWN`: material information not visible or not checked.
- `ASSUMED_FOR_TASK`: a temporary, visible assumption used to make limited
  progress.

Never present an example configuration as production fact. Never print, request,
commit, or paste secret values. For environment and database uncertainty, use
`docs/operations/ENVIRONMENT_CONTRACT.md` and
`docs/data/DATABASE_CONTRACT.md`. Use
`docs/operations/RUNTIME_OBSERVABILITY.md` for approved read-only evidence
commands. Generated reports belong in `.ai-reports/` and must not be committed.

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
8. Never fabricate user or partner state for visual completeness. Empty state
   is preferable to false data.

## Work Item Orchestration

Every meaningful change must have one machine-readable manifest under
`.ai/tasks/`. The GitHub Issue or explicit request defines the product outcome;
the work item defines AI execution state, scope, uncertainty, risk, checks, and
blockers. Use one work item per topic branch and primary PR.

Before implementation:

```bash
node scripts/ai/work-item-check.mjs .ai/tasks/<id>.json
node scripts/ai/work-item-transition.mjs --file=.ai/tasks/<id>.json --to=ready --actor=codex --reason="..."
```

Do not implement on `main` or `develop`. Do not enter `review_ready` while a
required check is failed/not run, an acceptance criterion is pending/failed, a
material blocker exists, or required visual evidence is absent. Generate
handoff and PR text from the manifest rather than reconstructing it from chat.
See `docs/project/WORK_ITEM_LIFECYCLE.md`.

## Change Workflow

1. Re-check branch state before starting. Normally start clean from `develop`;
   if `main` contains unreconciled release commits, resolve that drift explicitly
   before branching.
2. Create one scoped branch using `feature/`, `fix/`, `docs/`, `refactor/`, or
   `style/`.
3. Inspect the smallest complete route/model/view/realtime path for the task.
4. Record verified facts, unknowns, assumptions, planned scope, and validation
   before implementation as required by the AI task protocol.
5. Keep changes narrow. Do not mix feature work, broad refactors, release
   metadata, generated output, or unrelated cleanup.
6. Do not remove compatibility logic without measured evidence, an explicit
   migration, and a recorded removal condition.
7. Run relevant checks and review the complete diff before committing. When a
   task depends on production configuration or historical data, run the least
   invasive approved report or keep the fact explicitly `UNKNOWN`.
8. Use Conventional Commit subjects in Chinese, for example
   `fix: 修复情侣数据越权访问`.
9. Push only the topic branch for review. Do not push directly to `develop` or
   `main`.
10. Only when the user explicitly requests a release: update
    `frontend_source/public/version.json`, preserve all changelog history, merge
    `develop` into `main`, create the semantic version tag, and push both.

## Design Changes

Read `docs/design/DESIGN_SYSTEM.md`, `docs/design/DESIGN_TOKENS.md`, and
`docs/design/UI_ACCEPTANCE_PROTOCOL.md`. Reuse semantic `--fellow-*` tokens and
existing components before adding local visual language. UI changes require a
classified evidence scope and rendered evidence for applicable narrow mobile,
loading, empty, error, long-content, keyboard, safe-area, and partner-update
states. Run the design contract and added-line audit. Do not claim visual
consistency without inspecting the rendered result.

## Verification

Always run:

```powershell
git diff --check
git status --short
git diff --stat
git diff
node scripts/ai/project-context-check.mjs
node scripts/ai/design-contract-check.mjs
node scripts/ai/work-item-check.mjs --all --allow-none
```

For environment-sensitive work, use only the approved commands in
`docs/operations/RUNTIME_OBSERVABILITY.md`. Run
`report-safety-check.mjs` before sharing any generated report.

For backend changes:

```powershell
Set-Location backend
npm run verify
```

For frontend changes, do not create `frontend/dist` locally. Run focused
frontend tests when available, push the topic branch, and require the GitHub
`Test` workflow's clean Vite build to pass.

Report validation as `Passed`, `Failed`, and `Not run`. A check that was not
executed must never be described as passing.

For API/model changes, self-review authentication, couple scoping, ownership,
validation, concurrency, response shape, indexes, legacy compatibility, and
WebSocket/Web Push side effects.

## Handoff And Definition Of Done

Update the work-item manifest and `docs/project/ACTIVE_WORK.md` whenever work
remains unfinished. Generate a handoff report before agent replacement or
context loss.

A task is done only when:

- requested and failure behavior are implemented
- no private route relies on client-supplied identity
- existing couple data remains readable and migration compatibility is clear
- applicable environment and deployment assumptions are explicit
- relevant local checks and remote CI pass, with unrun checks disclosed
- UI evidence covers applicable states
- the diff contains no secrets, logs, temporary files, build output, or
  unrelated edits
- the topic branch is committed and pushed
- production changes occur only through the explicit release flow
