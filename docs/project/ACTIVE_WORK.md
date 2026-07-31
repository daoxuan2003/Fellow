# Active Work

Last updated: 2026-07-31

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/main` and `origin/develop` both contain release commit
  `b22870064a2bc33921dc93b9d605804de74391a0` after reconciliation.
- **VERIFIED:** annotated tag `v8.0.0` and the published GitHub Release resolve
  to `b22870064a2bc33921dc93b9d605804de74391a0`.
- **VERIFIED:** PR #25, PR #26 and PR #28 merged into `develop`; release PR #27
  merged into `main`.
- **VERIFIED:** deployment run `30349740434` succeeded for the release SHA. Its
  completed steps include the clean frontend build, pre-deploy backup step,
  file deployment, restart, unique PM2 process and `DEPLOY_SHA` verification,
  WebSocket connection, and API health check.
- **VERIFIED:** the post-deploy auto-scoped strict release gate and generated
  report safety check passed.
- **VERIFIED:** application metadata and changelog identify version `8.0.0`.
- **VERIFIED:** the completed release candidate updates application metadata
  and the preserved changelog history to `8.1.0` for the authorized release.

## Current task

- Primary manifest: `.ai/tasks/task-couple-modules-redesign.json`; stage:
  `implementing`.
- Branch: `feature/couple-modules-redesign`, created from current
  `origin/develop` at `f1093793e7407574f54e40df0b01c2e912958998`.
- Goal: strictly extend the 8.0.0 home brand language to the nine detail
  modules while replacing their visible information architecture with the
  user's explicitly listed, compact couple workflows.
- **VERIFIED:** the request includes mood interaction and calendar history;
  memory-first album categories; daily subject study progress; checklist
  plans with sub-plans and completion time; concise gender-aware body metrics,
  trends and menstrual entry; shared parcels grouped by pickup location with
  archive;
  photo-led cosmetics expiry; visible partner accounts and real bookkeeping;
  and wish archiving.
- **VERIFIED:** most underlying models already contain useful compatible data,
  while mood interaction and explicit parcel/wish archive state require new
  server-side contracts.
- **VERIFIED:** the permission audit confirms couple-scoped reads and
  post-write WebSocket broadcasts for mood, parcels, wishes and accounts;
  destructive account/parcel/wish mutations retain their current owner checks.
- **VERIFIED:** both partners already read the same active account collection,
  while account and transaction mutations remain restricted to the JWT
  actor's own accounts.
- **VERIFIED:** on 2026-07-29 the product owner confirmed the compact
  information architecture and the minimal mood interaction shape: partner
  response plus one short message.
- **VERIFIED:** the `impeccable` Shape, palette and north-star gates are
  complete. The product owner approved north-star v1 on 2026-07-29.
- **VERIFIED:** the product owner delegated visual-detail decisions. The locked
  lane uses the 8.0.0 home as the sole reference, large blue/mint/yellow fields,
  warm-white task surfaces, pink key states, and a youthful/intimate/crisp
  atmosphere. Palette v1 was approved on 2026-07-29.
- **VERIFIED:** north-star v1 demonstrates the shared system through three
  distinct representative compositions: paired mood interaction and calendar,
  photo-led memory chronology, and compact body metrics with one trend
  instrument. Code will carry its palette, outlines, hard shadows, density and
  page topology, but not its illustrative data, photographs or mock navigation.
- **VERIFIED:** the health audit confirms generic records are couple-readable
  but self-writable, and menstrual writes already enforce female-self or
  male-to-female-partner targeting. Every stored body metric has a trend path;
  BMI is the one missing derived metric and must be added in this task.
- **VERIFIED:** menstrual prediction currently returns long insight/care-plan
  text; the redesigned Health UI will intentionally omit it and show only
  recording, dates and necessary cycle state.
- **VERIFIED:** the current postgraduate read path already derives today's
  subjects, task targets and completion rate from the schedule. Its check-in
  write uses separate `$pull` and `$push` operations and stores no actor, so
  concurrent partner submissions and actor-specific history remain unsafe to
  infer from legacy data.
- **VERIFIED:** Habit and CheckIn already provide structured workout subtasks,
  per-user/day uniqueness, completion timestamps, forged-subtask filtering,
  creator-only plan mutation and post-write sync.
- **VERIFIED:** mood partner response, requester-owned parcel archive, shared
  completed-wish archive and derived BMI trend contracts are implemented with
  authenticated couple scoping and post-write realtime broadcasts.
- **VERIFIED:** the nine detail views now use one hard-outline home-brand shell
  while opening directly into their lists, photos, tasks, records or filters;
  the product owner explicitly rejected the earlier repeated top-dashboard
  pattern and the visible command/hero panels were removed or reduced to a
  compact list header.
- **VERIFIED:** the follow-up audit removed the remaining hidden legacy client
  surfaces: Plans no longer contains stats, achievements, weekly reports,
  coach/receipt copy, leave actions or their requests; Postgraduate no longer
  contains archive or partner-notification controls; Album no longer retains
  hidden view-mode, metrics, lane, masonry or grid branches.
- **VERIFIED:** plan check-ins no longer fabricate `happy` as a default mood or
  trigger unrelated achievement checks. Existing explicit mood values and the
  old server read routes remain compatible; the migration decision is recorded
  in `docs/data/DATABASE_CONTRACT.md`.
- **VERIFIED:** Health trend cards now keep only factual latest/change/coverage
  text and the line charts. Budget progress animation uses transforms and the
  old gradient-number styling is removed.
- **VERIFIED:** on 2026-07-31 the product owner clarified that the home must
  keep both partners' avatars and that mood should be placed more naturally.
  The home relationship card now leads with two real `avatarUrl`/`avatar`
  portraits (honest initial fallback), places each mood in a compact secondary
  button below its portrait, and demotes relationship days from a 35px KPI to
  an 18px supporting label. The former relationship indicator bar and entrance
  count capsule are removed.
- **VERIFIED:** the focused home/module contracts pass `10/10`, the full
  frontend suite passes `133/133`, all nine redesigned SFCs parse and compile,
  the design contract and strict UI-diff report pass, and the post-change
  Impeccable layout detector returns no findings. New relationship spacing uses
  existing semantic tokens and all related controls are at least 44px.
- **VERIFIED:** GitHub Test run `30610745365` and AI Governance run
  `30610745368` passed for home relationship commit `13f1c67` on 2026-07-31.
- **VERIFIED:** monitor-console cleanup commit `99b6752` is pushed; GitHub Test
  run `30612823377` and AI Governance run `30612823399` both passed for that
  exact commit on 2026-07-31.
- **VERIFIED:** source-level distill commit `1537609` removes 4,923 lines while
  adding 310 focused lines: unreachable dashboard-era CSS is gone from the
  nine views and both global theme layers, orphan dashboard-only helpers were
  deleted, and a regression contract prevents those surfaces returning.
  GitHub Test run `30614962809` and AI Governance run `30614962826` passed for
  that exact commit on 2026-07-31.
- **VERIFIED:** frontend tests pass `133/133`; backend verification passes
  `266/266` tests plus syntax checking for 109 JavaScript files. No local Vite
  build was run and `frontend/dist` was not generated.
- **VERIFIED:** browser evidence at 320, 375 and 430 CSS pixels reports no
  horizontal overflow on any of the nine routes. Loading and honest
  empty/error states were rendered without inventing user, partner, health,
  ledger or photo data.
- **VERIFIED:** independent layout and typography mechanical/visual audits are
  complete. Their visible findings were addressed: the shared English eyebrow
  was removed, all primary touch targets are at least 44px, mobile form text is
  at least 16px, loading skeletons mirror real content, and irrelevant counters
  or actor tabs no longer appear before their data is known.
- **VERIFIED:** the final visual manifest uses the required 320x568, 375x812
  and 430x932 viewports for all nine routes. Each captured state is labeled as
  loading, error, empty or unpaired rather than using one ambiguous fallback
  label; report safety and manifest validation pass.
- **VERIFIED:** commit `72f295a` is pushed to
  `feature/couple-modules-redesign`; GitHub Test run `30421228566` and AI
  Governance run `30421228599` both passed.
- **VERIFIED:** local MongoDB now runs as a single-node replica set; the safe
  runtime probe reports sessions and transactions supported, and a no-write
  transaction commit succeeded. The backend was restarted against that
  topology, so relationship writes remain atomic instead of falling back to
  unsafe sequential updates.
- **VERIFIED:** a real authenticated bound-couple session is now open locally
  and shows both actual profiles. The latest implementation adds one global
  four-item bottom navigation, keeps both avatars on Home, replaces the old egg
  mood art with the shared flat mood character, and gives Profile the same
  hard-outline visual language as Home.
- **VERIFIED:** Express now uses pending/picked/archived status tabs plus shared
  pickup-location filters. Locations can be created, renamed and deleted by
  their authenticated creator, selected in the centered parcel form, and
  refreshed for the partner after successful database writes. Pasted pickup
  notifications fill recognized codes and match saved locations.
- **VERIFIED:** the final authenticated route matrix covered 11 routes at
  320x568, 375x812 and 430x932 with zero horizontal overflow; focused mood,
  album, Express, location, Wish and Cosmetics flows were inspected with no
  browser console errors. Frontend tests pass `137/137`, backend verification
  passes `266/266`, and strict design, governance, visual-evidence and report
  safety checks pass.
- **VERIFIED:** GitHub Test run `30620710907` and AI Governance run
  `30620710874` passed for release-candidate commit `f6423a3`.
- **UNKNOWN:** production MongoDB topology and transaction capability are not
  inferred from the now-working local replica set; they require the approved
  privacy-safe runtime report during the release gate.
- **VERIFIED:** the product owner explicitly authorized a new release on
  2026-07-31. The strict scoped release gate passed clean-worktree,
  main/develop reconciliation, version/changelog and report-safety checks, but
  correctly blocked production because this visual work item is not
  release-ready without the authenticated bound-couple evidence.
- **UNKNOWN:** postgraduate legacy/production actor coverage and whether study
  plans should become per-person cannot be established without the independent
  `issue-4` production-data audit. This task preserves the existing shared-plan
  meaning and will not invent actor-specific history.
- `issue-4` remains an independent blocked production-data audit and is not in
  this task's scope.

## Durable release outcome

- **VERIFIED:** the deployed `couple-together` site was used as the sole visual
  contract for the home, login/profile treatment, shared navigation and all
  nine feature-detail surfaces; the old home style was not blended into it.
- **VERIFIED:** mood, album, postgraduate study, plans, health, express pickup,
  cosmetics expiry, accounting and wishes remain connected to Fellow's real
  authenticated routes, API state, mutations and WebSocket refresh paths.
- **VERIFIED:** no target-site demo data, visual authentication bypass or local
  `frontend/dist` output was committed.
- **VERIFIED:** frontend tests passed `144/144`; backend verification passed
  `258/258` tests and syntax checking for 109 JavaScript files; the release PR's
  Test, AI Governance and Release Readiness workflows all passed.

## Material uncertainty

- **UNKNOWN:** a public production URL or public version endpoint is not stored
  in the repository. Production verification therefore uses the successful
  deployment workflow on the exact release SHA plus its server-side API and
  WebSocket health checks, rather than claiming a separate browser visit.
- **VERIFIED:** dependency audit remains below the repository's high-severity
  failure threshold, with the existing `1 low` and `1 moderate` advisories.

## Exact next action

Commit and push the completed `8.1.0` implementation, wait for GitHub Test and
AI Governance on the exact topic-branch SHA, then execute the explicitly
authorized develop-to-main release flow and verify deployment health.
