# AI nutrition: continuous meal editing

## Contract and calculation

`NutritionAssistant` adds a structured editor to the existing nutrition page.
Create or continue a breakfast/lunch/dinner/snack; explicitly create another
entry for a separate meal. Existing personal manual entries can be converted
in place using AI 补充. Two-person shared meals retain the original amount
editor to avoid silently changing either participant's portion.

Text, meal/packaging images and before/after comparison use the same entry.
Model operations add, update or set consumption to zero on stable food IDs.
Served edible amount remains distinct from consumed amount. Quick ratios are
absolute fractions of served amounts, not repeated multiplication of the last
consumption. They never call the model. The server recalculates both the entry
and daily totals from the same atomically updated document.

The model may reference only catalog IDs. Nutrient values come from the
structured library (49 sourced USDA SR Legacy entries plus personal foods),
not model totals. Original snapshots remain available when custom foods are
removed. Unmatched foods preserve names/candidates and independent food/portion
confidence, but do not silently use a guessed nutritional match. Their consumed
amounts are visibly excluded; complete-day confirmation is blocked until they
are resolved or marked uneaten. Nutrient omissions such as fiber remain unknown.

Packaging labels can be extracted only with an image (or continued from a
previously stored label). The UI requires user verification before inclusion.
The deterministic conversion is `per100 = labelValue * 100 / basisAmount`;
energy in kJ is divided by 4.184. Protein/fat/carbs use grams, sodium mg.
Package net quantity and serving quantity never imply that all was eaten.
An incomplete label remains unresolved. User-entered label values are treated
as transcribed evidence, not a validated manufacturer database.

The model is instructed to account for bones/shells/cores, check whole-meal
weight against the container, and retain uncertainty in hidden oil/sauces.
The UI displays estimated ranges and method. These are estimates, not measured
weights or statistically calibrated confidence intervals. The displayed calorie
range propagates portion ranges for resolved foods; unmatched foods are excluded.
Questions are limited server-side to one per result and two per meal; estimated
impact below 50 kcal is suppressed. Prompt prioritizes the highest impact.
Qualitative oil choices remain estimates, explicitly labeled in the result.

QUESTION and HYPOTHETICAL responses never change portions/revisions or emit
nutritionSync. SWITCH_PERSON or a different interpreted target never writes;
the UI offers a target switch. The editor is bounded to the current meal, not
an open-ended chat history. Prompt compliance and visual accuracy require live
model evaluation; deterministic validation cannot guarantee recognition quality.

## Ownership, concurrency and images

JWT -> reciprocal current relationship -> canonical couple ID scopes every
read/write. The server derives self/partner IDs. `allowPartnerAiMeals` is a
separate explicit profile opt-in; shared-meal permission does not imply it.
Only the creator can edit AI state. Partner reads use existing nutrient/privacy
projections and never receive the creator's photo or assistant state. Consent
and relationship are rechecked after the potentially slow provider call.

`NutritionEntry.ai` holds validated food state, question count, owner and last
20 operation request hashes. `aiBeforeImage` is a private, select:false field.
Ordinary APIs and AI views never return it. Draft entries have no portions;
once interpreted, a single owned portion is updated in the same CAS write.
The existing revision/content fingerprint invalidates complete-day confirmation.
Old entries remain readable without migration. Soft deletion clears the image.

Browser re-encodes to JPEG (max dimension 1600, max 2MB), stripping metadata.
Server accepts one bounded multipart image and validates magic bytes. Only
JPEG/PNG/WebP bytes are sent inline to the fixed Ark API endpoint; no arbitrary
external image URL fetch is allowed. Before photo is retained for comparison;
after/packaging images are request-only. Model/provider errors and image data
are not logged. Response projections exclude model credentials and actor IDs.

Model requests are capped at 12/minute per authenticated user/process, one
active call per user/process, with a 55-second upstream timeout. Replayed
mutation requests use stored hashes before revision checks. Concurrent edits
use CAS; stale results never overwrite newer meals. Retrying an old request
outside the 20-request retention window fails on its stale revision. The client
retains text/photo after errors, surfaces conflicts and preserves drafts on WS
refresh. In a future multi-process deployment, rate/concurrency limits need a
shared store; CAS and persistent mutation idempotency already span processes.

## Provider configuration and activation

2026-09-30 official references:

- [Model release announcements](https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh)
- [Model parameter support](https://docs.volcengine.com/docs/ark/model-parameter-support?lang=zh)
- [Chat API](https://docs.volcengine.com/docs/ark/chat-api?lang=en)
- [OpenAI-compatible request format](https://docs.volcengine.com/docs/ark/compatible-with-openai-sdk?lang=en)

Default fixed model: `doubao-seed-2-1-pro-260915`. Every call explicitly sends
`thinking: {type: 'disabled'}`, JSON response format and a bounded output.
The fixed version makes recognition behavior reviewable; a later model change
requires evaluation rather than silently following a moving alias.

The owner confirmed having a Key and will configure it securely later.
Set `ARK_API_KEY` in the backend server environment, optionally override
`ARK_NUTRITION_MODEL` with an enabled model/endpoint ID. Never use a VITE_
variable, commit the key, put it in chat, or print `.env`. After secure setup,
restart the canonical `couple-app-backend` process with its updated environment.
The backend must be able to reach `ark.cn-beijing.volces.com` over HTTPS.

Missing configuration is a deliberate disabled state, not a fabricated result.
`configured` means key presence only, not successful authorization, billing,
model availability or visual accuracy. Invalid credentials/model access return
a useful error and leave records unchanged. Manual nutrition remains usable.

Activation check after configuration: use synthetic text and a non-private food
or nutrition-label image; verify identification, a follow-up half-portion,
label units and a hypothetical question. Do not report live AI acceptance
until this has actually run. Automated and browser fixtures substitute only
the provider, using the actual application route and calculation logic.

Rollback: remove/disable the AI key to stop interpretation, or revert the
feature. Calculated snapshots remain readable by the old nutrition UI. Retain
additive AI state until an explicitly approved retention/migration change.
