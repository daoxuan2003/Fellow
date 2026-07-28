# UI Acceptance Protocol

This protocol is required for user-visible changes. It separates code
correctness, rendered evidence, and product judgment.

## 1. Classify the change

Choose all applicable classes:

- `behavior-only`: visible behavior changes without intended visual redesign
- `local-style`: one surface changes within existing design language
- `shared-component`: multiple surfaces may change
- `token-change`: global visual semantics may change
- `new-flow`: new route, sheet, composer, or multi-step interaction

The classification determines the evidence scope. A token change cannot be
reviewed with one cropped screenshot.

## 2. Pre-change record

Before editing, record:

- user problem
- closest approved reference surface
- preserved behaviors
- intended visual differences
- applicable states and viewports
- whether a new token/component/illustration exception is required

## 3. Automated checks

Run:

```bash
node scripts/ai/design-contract-check.mjs
node scripts/ai/ui-diff-report.mjs --base=<base-sha> --strict \
  --output=.ai-reports/ui-diff.json
```

The diff report examines newly added lines. Existing legacy values do not become
approved merely because they are not reported.

## 4. Manual rendered evidence

Capture applicable combinations from `VISUAL_BASELINES.md`:

- compact, standard, and wide phone widths
- normal populated state
- loading
- empty
- error/retry
- long text or large numeric value
- keyboard and safe area
- partner realtime update or conflict
- reduced motion when animations changed

Create a local evidence manifest:

```bash
node scripts/ai/visual-evidence-template.mjs \
  --routes=/home,/mood \
  --output=.ai-reports/visual-evidence.json
```

Fill the manifest with non-sensitive evidence locations and run:

```bash
node scripts/ai/visual-evidence-check.mjs \
  .ai-reports/visual-evidence.json
```

## 5. Review questions

The AI self-review and human review should answer:

- Is the real data state truthful?
- Are both partners represented without accidental hierarchy?
- Is the primary action obvious?
- Can long Chinese content break or obscure another action?
- Are loading, empty, and error states distinguishable?
- Does the keyboard or bottom navigation hide content?
- Is important meaning available without color?
- Is focus visible and motion reducible?
- Does the result still feel like the same product?

## 6. Acceptance ownership

Automated checks can reject structural violations. The AI can provide rendered
evidence and compare it with approved baselines. Only the human product owner
approves a new visual direction or promotes a new visual baseline.

A PR must not say “design verified” when it only built successfully or when no
rendered evidence was inspected.
