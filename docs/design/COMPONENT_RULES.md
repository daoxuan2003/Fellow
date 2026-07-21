# Fellow Component Rules

These rules help AI programmers choose whether to reuse, extend, extract, or
create a component.

## Decision order

For a visible change, use this order:

1. reuse an existing shared component without changing its contract
2. extend an existing component through a narrow, documented prop or slot
3. extract duplicated behavior from at least two real surfaces
4. create a new local component when the behavior is genuinely page-specific
5. create a new component family only through an explicit design-system task

Do not create a second button, card, dialog, toast, empty-state, avatar, or
navigation language because the existing one is inconvenient to find.

## Component contract

A shared component must define:

- semantic purpose
- props and defaults
- emitted events
- loading, disabled, empty, error, and long-content behavior where applicable
- keyboard and focus behavior
- touch target and safe-area behavior
- partner-specific semantics, if any
- reduced-motion behavior, if animated

## State rules

### Loading

Preserve layout where practical. Do not show stale partner data as current
while a mutation is pending. Disable duplicate submissions and expose a useful
busy state.

### Empty

Describe what is absent and offer the next valid action. Never invent a mood,
message, photo, streak, amount, health value, or partner action to make a card
look populated.

### Error

Keep the user's input when safe, state what failed, and provide a retry path.
Do not replace operational errors with an empty state.

### Realtime partner update

For couple-owned data, define whether the component reloads, patches local
state, shows a conflict, or preserves an in-progress draft. A WebSocket event
without an explicit UI response is incomplete.

## Interaction rules

- use native `button`, `a`, `input`, `textarea`, and `select` semantics first
- do not put click behavior on a non-interactive element without keyboard and
  accessibility behavior
- intended touch targets should be at least 44px in either the element or its
  non-overlapping hit area
- destructive actions require clear wording and an appropriate confirmation or
  undo strategy
- do not rely only on color to indicate selected, failed, overdue, or owned
  state
- focus indication must remain visible

## Layout rules

- validate 320px, 375px, and 430px widths
- account for top and bottom safe-area insets
- test the on-screen keyboard for forms and composers
- test Chinese long text, long nicknames, four-digit counts, and large money
  values
- avoid fixed heights for user-generated text unless truncation is deliberate
  and the full value remains accessible

## Existing exception zones

The following areas contain legacy local styling and must not be copied as a
new standard:

- update and changelog dialog styles injected from `frontend_source/src/main.js`
- duplicate global/scoped bottom-navigation styling
- large page-local style blocks in `Home.vue`, `Plans.vue`, `Health.vue`,
  `Budget.vue`, and `Shopping.vue`

When touching an exception zone, make the smallest safe change and record any
remaining debt. Do not combine a feature fix with a full visual rewrite.
