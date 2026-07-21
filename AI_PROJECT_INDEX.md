# Fellow AI Project Index

This is the canonical context map for AI programmers working on Fellow. It is
not a replacement for source inspection. It tells an agent which facts must be
loaded before editing and where uncertainty must be recorded.

## Required reading order

Every new task starts with:

1. `AI_PROJECT_INDEX.md`
2. `AGENTS.md`
3. `docs/project/ACTIVE_WORK.md`
4. the task's GitHub Issue or explicit user request
5. the corresponding `.ai/tasks/<work-item-id>.json` manifest
6. only the task-relevant documents and source files listed below

Do not rely on a previous chat session as project memory.

## Context map

| Concern | Canonical source |
| --- | --- |
| Product and architecture overview | `docs/PROJECT_CONTEXT.md` |
| Non-negotiable engineering rules | `AGENTS.md` |
| AI task lifecycle and handoff | `docs/ai/AI_TASK_PROTOCOL.md` |
| AI role and work orchestration | `docs/ai/AI_ORCHESTRATION.md` |
| Codex executable runbook | `docs/ai/CODEX_RUNBOOK.md` |
| Work-item state machine | `docs/project/WORK_ITEM_LIFECYCLE.md` |
| Machine-readable task manifests | `.ai/tasks/` |
| Current work, branch drift, blockers | `docs/project/ACTIVE_WORK.md` |
| Release gates | `docs/project/RELEASE_GATES.md` |
| Environment capabilities without secrets | `docs/operations/ENVIRONMENT_CONTRACT.md` |
| Last attested production capabilities | `docs/operations/PRODUCTION_CAPABILITIES.md` |
| Runtime and database report commands | `docs/operations/RUNTIME_OBSERVABILITY.md` |
| Database inspection boundaries | `docs/data/DATABASE_INSPECTION.md` |
| Data ownership, compatibility, migrations | `docs/data/DATABASE_CONTRACT.md` |
| Design entry point | `docs/design/DESIGN_SYSTEM.md` |
| Semantic tokens | `docs/design/DESIGN_TOKENS.md` and `frontend_source/src/styles/fellow-semantic-tokens.css` |
| Component/state rules | `docs/design/COMPONENT_RULES.md` |
| Visual baseline registry | `docs/design/VISUAL_BASELINES.md` and `docs/design/visual-baselines.json` |
| UI acceptance and evidence | `docs/design/UI_ACCEPTANCE_PROTOCOL.md` |
| Known design debt | `docs/design/LEGACY_STYLE_DEBT.md` |
| Durable architecture decisions | `docs/decisions/` |
| Complete Git and release procedure | `.agents/skills/fellow-dev/SKILL.md` |
| Application version and changelog | `frontend_source/public/version.json` |

## Task-specific reading

### Backend/API/model change

Read the route, middleware, model, service, WebSocket event path, related tests,
`docs/data/DATABASE_CONTRACT.md`, and environment entries used by the feature.

### Frontend/UI change

Read the route, view, shared components, composables/store, related tests, and
`docs/design/DESIGN_SYSTEM.md`, semantic tokens, component rules, and the UI
acceptance protocol. Verify loading, empty, error, narrow mobile, keyboard,
safe-area, long-content, and partner-update states. Visible changes require
rendered evidence; a successful build alone is insufficient.

### Deployment/configuration change

Read the workflows, runtime configuration modules, `.env.example`,
`docs/operations/ENVIRONMENT_CONTRACT.md`, and release procedure. Never infer a
production value from an example value.

### Data migration or compatibility change

Read the model, every reader and writer of the affected field, tests,
`docs/data/DATABASE_CONTRACT.md`, and existing migration notes. Never delete
legacy handling without measured evidence or an explicit migration.

## Epistemic labels

Use these labels in plans, Issue notes, PRs, and handoffs:

- **VERIFIED** — confirmed from source, an executed command, CI, or a
  privacy-safe production report.
- **INFERRED** — a conclusion supported by verified facts, with the reasoning
  stated.
- **UNKNOWN** — material information that is not visible or has not been
  checked.
- **ASSUMED_FOR_TASK** — a temporary assumption explicitly approved or made to
  allow limited progress; it must not silently become project truth.

Important environment, data, security, or migration uncertainty must never be
presented as verified fact.

## Source-of-truth priority

When sources conflict, use this priority and record the conflict:

1. observed production-safe report or database inspection
2. current executable code and automated tests
3. current deployment workflow and runtime configuration
4. maintained contracts and ADRs
5. README, comments, historical PR text, and old chat context

A lower-priority source may describe intent, but it cannot override observed
runtime behavior without an intentional change.

## Secrets boundary

AI agents must not request, print, commit, or paste secret values. They may use
boolean/categorical reports such as `configured: true`, `storageMode: s3`, or
`transactionsSupported: true`. See the environment contract for the approved
reporting shape.


## Runtime evidence commands

When environment or production data state is material, do not infer it from code.
Use the least invasive applicable command from
`docs/operations/RUNTIME_OBSERVABILITY.md` and share only output that passes
`report-safety-check.mjs`. Generated reports belong in `.ai-reports/` and must
not be committed.

## Work-item commands

```bash
node scripts/ai/work-item-init.mjs --help
node scripts/ai/work-item-check.mjs --all --allow-none
node scripts/ai/work-item-transition.mjs --file=.ai/tasks/<id>.json --to=<stage> --reason="..."
node scripts/ai/handoff-report.mjs --file=.ai/tasks/<id>.json --next="..."
node scripts/ai/pr-body-generate.mjs --file=.ai/tasks/<id>.json
```

The manifest stage ends at `review_ready`; GitHub remains authoritative for
approval and merge, and the release process remains authoritative for production.
