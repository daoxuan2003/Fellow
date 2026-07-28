# Release Scope Manifests

Each production version may declare its exact work-item scope in
`.ai/releases/<version>.json`. `release-gate.mjs --scope-file=auto` reads the
application version from `frontend_source/public/version.json`, resolves that
single manifest and fails closed when it is missing or invalid.

The manifest has exactly four fields:

- `schemaVersion`: `1`
- `releaseVersion`: the exact application version
- `containsSecrets`: `false`
- `workItemIds`: a non-empty list of unique existing work-item IDs

Every work item whose implementation, migration, security, environment or
release-support change is included in the release must be listed. The manifest
does not waive CI, backup, rollback or product-owner approval.
