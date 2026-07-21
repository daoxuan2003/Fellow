# Legacy Style Debt Ledger

This ledger records observed design-system fragmentation. It is not permission
for broad cleanup. Each item should be resolved through a scoped Issue with
rendered evidence.

## DS-001 — Global and scoped bottom navigation styles

**VERIFIED:** `frontend_source/src/style.css` defines global `.bottom-nav` and
`.nav-item` rules, while `frontend_source/src/components/BottomNav.vue` defines
another scoped implementation.

Observed differences include maximum width, background, blur, border, active
state, spacing, and raw accent fallbacks.

**Risk:** a change may appear correct on one route while another rule or
specificity path produces inconsistent behavior.

**Removal condition:** one component owns the rendered navigation contract and
the unused global rules are removed after all four canonical routes are
captured.

## DS-002 — Runtime-injected dialog styles

**VERIFIED:** update and changelog dialogs in `frontend_source/src/main.js`
inject large style strings with repeated raw colors, radii, shadows, transitions,
and layer values.

**Risk:** these dialogs can drift from shared tokens and are difficult to test
as normal Vue components.

**Removal condition:** dialogs are extracted into reviewed components or a
shared overlay primitive without weakening PWA update behavior.

## DS-003 — Large page-local visual systems

**VERIFIED:** Home, Plans, Health, Budget, and Shopping are documented as large,
high-regression views and contain substantial local presentation logic.

**Risk:** AI changes can unintentionally introduce a second design language or
break narrow states that are far from the edited section.

**Removal condition:** extract only proven shared boundaries while feature work
provides tests and visual evidence.

## DS-004 — Baseline library not yet approved

**VERIFIED:** the registry is initially `pending-capture`.

**Risk:** AI can compare code but cannot prove visual continuity after context
compression.

**Removal condition:** synthetic, reproducible captures for the canonical
routes are approved and recorded in `visual-baselines.json`.
