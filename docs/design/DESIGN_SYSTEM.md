# Fellow Design System Contract

This is the canonical design contract for AI programmers. It defines product
character, truthful state behavior, token ownership, component decisions, and
the evidence needed before a visible change is accepted.

## Product character

Fellow should feel private, intimate, warm, restrained, personal without being
childish, calm enough for daily use, and truthful about real partner state.
Decorative richness must not reduce legibility, privacy, or task completion.

## Non-negotiable principles

1. **Real state over decorative state.** Never fabricate a mood, completion,
   partner action, health value, relationship status, message, or count.
2. **Equal partners.** Warm/cool styling may distinguish two people but must not
   silently imply owner/guest hierarchy.
3. **Mobile first.** Validate narrow viewport, keyboard, safe-area, touch target,
   scroll containment, and long Chinese content.
4. **State completeness.** Data surfaces need loading, empty, error, success,
   and partner-update behavior where applicable.
5. **Consistency before novelty.** Reuse semantic tokens and existing component
   contracts before creating a local visual language.
6. **Accessible meaning.** Important state cannot depend only on color. Preserve
   native semantics, focus visibility, contrast, and reduced-motion behavior.
7. **Evidence before confidence.** A successful build is not visual validation.

## Canonical design sources

| Concern | Source |
| --- | --- |
| Semantic CSS API | `frontend_source/src/styles/fellow-semantic-tokens.css` |
| Token meaning and change policy | `docs/design/DESIGN_TOKENS.md` |
| Component creation and state rules | `docs/design/COMPONENT_RULES.md` |
| Reference routes and capture matrix | `docs/design/VISUAL_BASELINES.md` |
| Machine-readable baseline registry | `docs/design/visual-baselines.json` |
| UI evidence workflow | `docs/design/UI_ACCEPTANCE_PROTOCOL.md` |
| Known fragmentation and removal conditions | `docs/design/LEGACY_STYLE_DEBT.md` |
| Machine-enforced contract | `scripts/ai/design-contract.json` |

## Current reference surfaces

- Home: relationship composition, real data, and couple balance
- Mood flow: character language, emotional expression, and truthful empty state
- Login/pairing: identity, consent, validation, and first-use clarity
- Bottom navigation: cross-module navigation and safe-area behavior

The initial visual baseline registry is `pending-capture`. Current code provides
verified implementation context, but no baseline is called approved until the
human product owner reviews non-sensitive rendered evidence.

## AI design-change protocol

Before editing:

1. classify the change using `UI_ACCEPTANCE_PROTOCOL.md`
2. identify the closest reference route and existing components
3. state the visual problem, preserved behavior, and out-of-scope redesigns
4. list applicable states and viewports
5. identify any token, component, or illustration exception

After editing:

1. run the design contract and UI diff checks
2. render applicable states at required viewports
3. compare with approved baselines when available
4. report intentional deviations and unresolved evidence
5. never claim visual consistency without inspecting the rendered result

## Exceptions

A bounded illustration may use local coordinates and colors with a
`design-exception` comment. An exception must not be reused as a new button,
card, surface, typography, or navigation standard.

Global token changes, new component families, or a new visual direction require
explicit owner approval and broad reference-route evidence.
