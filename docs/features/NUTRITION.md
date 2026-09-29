# Nutrition V1

## Product contract

The fitness and Home entries open `/health/fitness/nutrition`, with Today,
Food, Trends and My Plan tabs. Scope follows section 43 of the supplied
2026-09-28 brief: all 15 V1 capabilities. AI/photo/barcode recognition,
canteen/takeout mode, generated meal plans, food substitution and circumference
analysis remain V2. There are no simulated entry points for those features.

Each participant explicitly confirms their own profile. Existing own health
values and birthday are offered first; missing height/weight use editable
suggested values, never fabricated historical measurements. Missing age and
waist require entry. A goal, protein/fiber references and individual sharing
settings are independent of the partner. Daily morning weight lives only in
the new nutrition collection, not the existing partner-visible HealthRecord.

Four meals accept foods and measured amounts. Per-100g/100ml values and raw,
cooked or ready-to-eat weight are explicit. Calories/macros are computed on the
server from immutable food snapshots, not client totals. Unknown source fiber
stays unknown and is displayed as a lower bound, never silently presented as
a complete zero. Favorites, recent/custom foods, saved whole meals and selected
previous-day meals support reuse. Copying a shared meal copies only one's own
portion. Templates remain readable after a custom food is removed.

Shared meals require the recipient's opt-in. One document stores the creator's
and current partner's independent portions atomically, without MongoDB
multi-document transactions. Only the creator can edit/delete it; the UI says
both records change. Revoking consent prevents subsequent shared creation and
editing. A creator may still retract a meal they created. A shared meal's
creator can see both amounts they entered; this does not expose unrelated
private partner foods, targets or measurements.

## Calibration and suggestions

- Start at seven days; extending to fourteen is recommended. No fixed initial
  energy target is invented. Full-day confirmation includes snacks, drinks and
  cooking oil; any later add/edit/delete invalidates it using the entry content
  fingerprint. Missing days never count as zero intake.
- Seven days require seven confirmed intake days and at least five weights;
  fourteen days require twelve confirmed days and ten weights. Both first and
  last three-day windows need two weights. The endpoint mean change must be at
  most 0.5% of the initial endpoint mean. These are conservative product data
  quality heuristics, not validated diagnostic thresholds.
- Stable recorded mean intake is a maintenance *reference estimate*, not a
  measured metabolism. An unstable or insufficient window asks for extension
  or restart. Historical calibration can still be read outside the 90-day
  daily query window. No 7700-kcal formula imputes missing intake.
- Only explicit adoption applies a target: maintenance minus 500 kcal for fat
  loss, maintenance for maintain/recomp, plus 100 for gain. The first weight
  milestone for fat loss is 5% below the confirmed starting weight, without a
  deadline. Protein defaults are editable 115g/140g female/male references;
  fiber defaults to 25g. These are not a medical prescription.
- Under-18 profiles and profiles indicating pregnancy/lactation, glucose-
  lowering medication or clinical diet needs retain all logging but receive
  no automated energy target. Automatic targets outside 1400–4500 kcal for
  female profiles or 1600–4500 for male profiles are blocked. These are
  platform automation guardrails, **not claims of universally safe minima**.
- Later suggestions use three completed seven-day windows after the last
  target adoption, each with five complete intake days and five weights. At
  least 80% of complete days must be within 15% of the current target. Two
  consecutive mean changes under 0.2kg can suggest a 125-kcal reduction for
  fat loss; keeping intake and adding ordinary activity remains an option.
- Recomp/gain can suggest +125 kcal only when both weekly weight changes are
  below -0.2kg, at least five actual poor-recovery reports exist, and repeated
  same-exercise/same-set-count weight/repetition comparisons show no increase.
  Unknown strength/recovery never implies stalled strength/poor recovery.
  No suggestion changes a target until the owner chooses it. A new adoption
  starts another three-week observation period.

Seven-day moving means show the number of measured days; gaps are not zeros.
The weekly report covers the last seven *finished calendar days*, labels its
date range and sample sizes, and averages intake only over confirmed full days.
Daily calorie/protein graphs show recorded intake, with completeness in the
detail table. Single-day excess gets neutral language; no fasting or punitive
exercise prompts. Training status comes from actual A–E logs/explicit rest,
never from a weekday assignment. Optional postmeal walks require server-time
elapsed ten minutes and explicit completion; they are not auto-counted.

## API and data boundary

All `/api/nutrition` endpoints require JWT and a reciprocal current couple.
Body/query identities do not control actors or scope. Server-local date-only
values follow the shared Asia/Shanghai helper. Record dates must be valid and
within the past year. GET returns one selected day, 28-day trends, a weekly
report, profile, calibration, suggestions, own library/templates and a strictly
projected partner view. New food/meal/measurement writes use loading/error
states, preserve failed drafts and invalidate both clients after persistence.
Events contain only `nutritionSync`; private values are never broadcast.

Partner visibility is per field: completion/calorie totals default on during
explicit profile confirmation; food details/weight/waist/thigh default off.
Enabled flags apply to existing dates too. Profile and meal revisions reject
stale competing writes. Entry request keys plus payload hashes handle lost
responses and simultaneous retries. Soft deletion preserves idempotency and
invalidates whole-day confirmation. A confirmation carries the exact content
fingerprint seen by the client and cannot certify an unseen concurrent edit.

No production record inspection or migration is needed. All five collections
are additive and couple scoped. Re-pairing with a different person cannot read
the former couple's data; re-pairing the same two people restores their prior
canonical scope. Reverting the application leaves these collections intact.
No private nutrition record is copied into legacy fitness meal fields.

## Sources and acceptance

The 30-food catalog is curated from the public-domain [USDA FoodData Central
SR Legacy April 2018 JSON](https://fdc.nal.usda.gov/download-datasets/). Each
food retains its FDC identifier, original description and direct source URL.
Energy/protein/carbohydrate/fat/fiber use nutrient IDs 1008/1003/1005/1004/1079.
Liquid foods in this source retain the source's gram unit. Packaged products
should use their own label; cooking oils and sauces are separate records.

Automation boundaries were reviewed against [NIDDK Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner)
and [NICE NG246 diet guidance](https://www.nice.org.uk/guidance/ng246/chapter/Physical-activity-and-diet).
The product does not claim that these sources validate its heuristic algorithm.

UI change class: new-flow plus local-style. Closest existing surface is Fitness;
its paper/ink/mint/yellow tokens, FeatureHeader and mobile widths are retained.
No global tokens/shared components are changed and no new visual baseline is
claimed approved. Required evidence: 320/375/430 widths, onboarding, loading,
empty/error, short keyboard viewport/safe edges, shared portions, failed-save
retention, partner websocket updates while drafting, food library and trends.
Tests cover data-quality gaps, target guards, privacy, JWT/couple isolation,
snapshot math, consent, idempotency, concurrent edits, confirmation invalidation
and elapsed-time walking. Local evidence is synthetic only.
