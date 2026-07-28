# Fellow Design Tokens

This document defines the stable visual API that AI programmers may use when
adding or changing UI. The implementation lives in
`frontend_source/src/styles/fellow-semantic-tokens.css`.

## Why a semantic layer exists

`frontend_source/src/style.css` already contains useful legacy variables. They
are retained to avoid visual regression. The `--fellow-*` layer maps those
values into names that express product meaning rather than a page-specific
implementation.

New shared UI should prefer `--fellow-*` tokens. Do not perform a repository-wide
replacement solely to make old code use the new names. Migrate values only when
a reviewed feature touches that surface and the rendered result is verified.

## Token families

### Typography

- `--fellow-font-display`: restrained editorial or relationship headings
- `--fellow-font-ui`: controls, navigation, forms, and system UI
- `--fellow-font-body`: normal reading text
- `--fellow-font-number`: dates, streaks, money, and quantitative values

### Color and surfaces

- `--fellow-color-brand-primary`: primary relationship accent
- `--fellow-color-partner-warm`: warm partner/relationship expression
- `--fellow-color-partner-cool`: complementary partner expression
- `--fellow-color-danger`, `--fellow-color-warning`, `--fellow-color-success`
- `--fellow-surface-page`, `--fellow-surface-card`, `--fellow-surface-input`
- `--fellow-text-primary`, `--fellow-text-secondary`, `--fellow-text-muted`
- `--fellow-border-default`, `--fellow-border-focus`

Partner colors communicate distinction, not hierarchy. Ownership and permission
must be stated in text or semantics rather than inferred from warm/cool color.

### Spacing and sizing

The shared spacing scale is `4, 8, 12, 16, 20, 24, 32, 40` pixels. Use semantic
aliases such as page, section, card, and control spacing before inventing a new
local value.

- `--fellow-touch-target-min`: minimum intended interactive target, 44px
- `--fellow-content-max-width`: canonical phone-stage width, 430px
- `--fellow-bottom-nav-height`: bottom navigation contract

An illustration may use one-off coordinates. Controls and layout grids should
not use illustration exceptions.

### Radius, shadow, and motion

- controls use `--fellow-radius-control`
- cards use `--fellow-radius-card`
- sheets/dialogs use `--fellow-radius-sheet`
- pills use `--fellow-radius-pill`
- raised content uses `--fellow-shadow-raised`
- modal content uses `--fellow-shadow-overlay`

Use `--fellow-motion-fast`, `--fellow-motion-standard`, and
`--fellow-motion-slow`. Do not add `transition: all`; state exactly which
properties animate. Respect `prefers-reduced-motion`.

### Layers

Use the named z-index layers. Do not create a value above
`--fellow-z-critical` without an ADR because it can break PWA updates, modal
focus, navigation, and toast visibility.

## Adding or changing a token

A token change is a design-system change, not local styling. The PR must:

1. state the visual problem and affected surfaces
2. update the semantic token file and this contract
3. list intentional visual changes
4. capture all reference routes affected by the token
5. include a rollback path

Raw colors remain acceptable for bounded illustrations or data visualizations
when their meaning is local and documented with a `design-exception` comment.
They are not acceptable for a new button, card, surface, text role, or global
navigation treatment.
