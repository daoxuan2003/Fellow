# AI Work Items

This directory contains durable, non-secret execution manifests for AI tasks.

- One task uses one `.ai/tasks/<id>.json` file.
- The manifest is maintained on the task branch.
- Generated logs, reports, screenshots, and PR bodies remain under the ignored
  `.ai-reports/` directory.
- The GitHub Issue remains the product-requirement source of truth.
- The Pull Request remains the review and merge source of truth.

Do not store `.env` values, credentials, raw database records, real user content,
or full production logs in a work item.

Create and validate a manifest with:

```bash
node scripts/ai/work-item-init.mjs --help
node scripts/ai/work-item-check.mjs .ai/tasks/<id>.json
```

The schema is `work-item.schema.json`; stage gates are enforced by the scripts
and documented in `docs/project/WORK_ITEM_LIFECYCLE.md`.
