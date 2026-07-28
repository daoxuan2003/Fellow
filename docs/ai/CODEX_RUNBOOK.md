# Codex Runbook

This is the operational sequence for Codex or another AI engineering agent.

## 1. Recover context

From the repository root:

```bash
git status --short
git branch --show-current
git fetch --prune origin
node scripts/ai/project-context-check.mjs
```

Read, in order:

1. `AI_PROJECT_INDEX.md`
2. `AGENTS.md`
3. `docs/project/ACTIVE_WORK.md`
4. the Issue or explicit request
5. the relevant work-item manifest, contracts, ADRs, and source path

Do not begin implementation on `main` or `develop`.

## 2. Initialize the work item

```bash
node scripts/ai/work-item-init.mjs \
  --id=issue-123 \
  --title="修复示例问题" \
  --source-type=github_issue \
  --source-ref="#123" \
  --goal="用可验收的用户结果描述目标" \
  --base-branch=develop \
  --branch=fix/example
```

Edit `.ai/tasks/issue-123.json` to add:

- acceptance criteria
- explicit in-scope and out-of-scope work
- verified facts, unknowns, and assumptions
- impact classification and risk
- required validation checks
- dependencies and rollback behavior

Validate and move to `ready`:

```bash
node scripts/ai/work-item-check.mjs .ai/tasks/issue-123.json
node scripts/ai/work-item-transition.mjs \
  --file=.ai/tasks/issue-123.json \
  --to=ready \
  --actor=codex \
  --reason="上下文、范围和验证计划已明确"
```

## 3. Start implementation

Create or switch to the manifest branch, then transition:

```bash
node scripts/ai/work-item-transition.mjs \
  --file=.ai/tasks/issue-123.json \
  --to=implementing \
  --actor=codex \
  --reason="开始最小完整实现"
```

During implementation:

- update verified facts only from evidence
- keep unresolved facts in `unknowns`
- update `files.expected` and `files.touched`
- add checks before declaring validation complete
- enter `blocked` rather than inventing environment or data facts

## 4. Validate

Transition after implementation is complete enough to test:

```bash
node scripts/ai/work-item-transition.mjs \
  --file=.ai/tasks/issue-123.json \
  --to=validating \
  --actor=codex \
  --reason="实现完成，开始验证"
```

Run repository and task-specific checks. Record each check as `passed`, `failed`,
`not_run`, or `waived`. A waiver requires a reason and appropriate approval.

For visible UI work, attach the visual-evidence manifest path. For environment
or database-sensitive work, use only approved privacy-safe reports.

## 5. Prepare review

The `review_ready` gate requires:

- all acceptance criteria are `passed` or explicitly `waived`
- required checks have no `failed` or `not_run` result
- no active blocker
- changed files and head commit are recorded
- required visual evidence is complete
- rollback behavior is present for medium-or-higher risk

```bash
node scripts/ai/work-item-transition.mjs \
  --file=.ai/tasks/issue-123.json \
  --to=review_ready \
  --actor=codex \
  --reason="验收和验证证据已完整"

node scripts/ai/pr-body-generate.mjs \
  --file=.ai/tasks/issue-123.json \
  --output=.ai-reports/pr-body-issue-123.md
```

Create a Draft PR unless the product owner explicitly requests otherwise.

## 6. Handoff or interruption

```bash
node scripts/ai/handoff-report.mjs \
  --file=.ai/tasks/issue-123.json \
  --next="下一条可直接执行的动作" \
  --output=.ai-reports/handoff-issue-123.md
```

Update `docs/project/ACTIVE_WORK.md` with the compact durable summary. Do not
commit generated `.ai-reports/` output.

## 7. Release preparation

Before a release, fetch remote refs and run:

```bash
git fetch --prune origin
node scripts/ai/release-gate.mjs \
  --main=origin/main \
  --develop=origin/develop \
  --scope-file=auto \
  --strict \
  --output=.ai-reports/release-gate.json
node scripts/ai/report-safety-check.mjs .ai-reports/release-gate.json
```

A passing local report does not replace GitHub CI, backup checks, deployment
health checks, or product-owner authorization.

Before running the command, commit `.ai/releases/<version>.json` with every work
item included in that version. `--scope-file=auto` derives the file from
`version.json`; invalid, missing, mismatched, duplicate or unknown entries block
the gate. Direct `--work-item=<id>[,<id>...]` remains available for a local
explicit check. Omit both only for the conservative all-work-items audit. Never
exclude an item whose scope, migration, security or environment impact belongs
to the release.
