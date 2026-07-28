# Release Gates

A release is a separate product and operational decision. A merged feature PR is
not proof that production is safe to update.

## Pre-release gate

Before merging or promoting `develop` to `main`:

1. fetch current remote refs
2. verify `main` has no unreconciled commits absent from `develop`
3. verify the worktree is clean
4. verify the target version and newest changelog entry agree
5. verify no active work item is `blocked`, `implementing`, or `validating` for
   the release scope
6. run backend verification, frontend tests/build CI, AI governance, and any
   migration-specific checks
7. confirm backup readiness and rollback steps
8. obtain explicit product-owner approval

Use `scripts/ai/release-gate.mjs` for the repository-visible checks. It does not
query production secrets or replace remote CI.

When the release scope is explicitly known, pass every included work-item ID as
one comma-separated `--work-item` value. The gate then evaluates active stages
only for those existing manifests and reports how many other work items were
excluded. Invalid, duplicate or missing scoped IDs fail closed. Omitting the
argument preserves the conservative default and evaluates every work item.

```bash
node scripts/ai/release-gate.mjs \
  --main=origin/main \
  --develop=origin/develop \
  --work-item=release-8.0.0-reference-ui,task-release-gate-scope-v8 \
  --strict \
  --output=.ai-reports/release-gate.json
```

Explicit scoping does not waive CI, backup, rollback, migration evidence or
product-owner approval. A work item may be excluded only when its own recorded
scope and the intended release contents show that it is unrelated.

## Hard blockers

Do not release when:

- `main` contains commits not reconciled into `develop`
- required CI failed or is unknown
- a required migration lacks measured compatibility evidence
- a critical environment capability remains unknown
- backup or rollback requirements are not satisfied
- a release-scoped work item remains blocked or under validation
- the product owner has not approved the release

## Post-deploy evidence

After deployment, record only non-secret evidence:

- deployed commit SHA and version
- deployment workflow result
- API and WebSocket health checks
- process uniqueness/readiness result
- backup result and location category, not credentials
- migration result counts, not private records
- rollback execution if used

Update `PRODUCTION_CAPABILITIES.md` only when a durable capability fact has been
verified. Release-specific results belong in the GitHub release/PR or an
approved operations record.

## Branch reconciliation

After a release, ensure release commits and version metadata are present in the
development line before starting new feature branches. A release process that
leaves `main` ahead of `develop` creates an invalid base for subsequent AI work.
