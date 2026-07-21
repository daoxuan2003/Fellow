# Fellow Visual Baselines

Visual baselines are evidence of intended behavior, not decorative inspiration.
The machine-readable registry is `docs/design/visual-baselines.json`.

## Baseline status

The initial registry is deliberately marked `pending-capture`. No screenshot is
considered approved merely because a route exists or the code looks plausible.
A human product owner must approve the first non-sensitive capture set.

## Canonical reference routes

### `/home` — relationship and daily-life composition

Required states:

- loading
- bound couple with representative populated data
- no hero photo
- no mood record for either partner
- long home messages and long nicknames
- bottom safe-area interaction

### `/mood` and mood composer flow — emotional expression

Required states:

- no mood recorded
- my mood only
- both partners recorded
- timeline with long note
- composer with on-screen keyboard
- partner update received while open

### `/` — login, registration, invitation, and consent

Required states:

- signed out
- validation error
- invitation pending
- explicit pairing consent
- small viewport with keyboard

### Shared bottom navigation

Capture on at least Home, Album, Mood, and Profile. Confirm selected state,
labels, safe-area spacing, and that page content is not hidden underneath it.

## Capture matrix

Default viewport matrix:

| ID | CSS viewport | Purpose |
| --- | --- | --- |
| compact | 320 × 568 | extreme supported narrow layout |
| standard | 375 × 812 | common phone layout |
| wide | 430 × 932 | canonical maximum stage |

For keyboard-sensitive flows, include one capture with the virtual keyboard or
an equivalent reduced visual viewport.

## Evidence rules

- use synthetic accounts and non-sensitive test content
- do not commit real avatars, health data, messages, photos, financial records,
  pairing codes, tokens, domains, or server details
- record route, viewport, state fixture, commit SHA, and capture time
- screenshots may be attached to a PR; the repository stores only the approved
  registry and non-sensitive reference assets explicitly accepted by the owner
- compare behavior and hierarchy, not pixel identity across operating systems

## Promotion to approved baseline

A baseline becomes `approved` only when:

1. the route and fixture are reproducible
2. the owner reviews the captures
3. the registry records the approving PR or decision
4. no sensitive data is present
5. the route's required states are represented

Token or shared-component changes must identify every approved baseline they may
alter.
