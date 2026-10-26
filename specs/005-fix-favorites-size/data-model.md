# Data Model: Fixed Favorites Icon Size — 24px Revision

**Updated**: 2026-10-27

No entity, field, schema, storage migration, or API change is required.

## Existing image state

`ImageMetadata` in `src/types.ts` retains `id`, `name`, `mimeType`, `size`, `addedAt`,
`batchId`, `ordinal`, and boolean `favorite`. Each image has one saved favorite state
shared by Gallery, Random, and preview. Pending mutation membership is keyed by image
ID in the existing collection hook; errors use existing collection error handling.

## State transitions and invariants

| Starting state | Action/result | Saved state and presentation |
| --- | --- | --- |
| Inactive | Add requested, write pending | Inactive outlined heart; control disabled |
| Inactive | Add succeeds | Active filled heart; control enabled |
| Active | Remove requested, write pending | Active filled heart; control disabled |
| Active | Remove succeeds | Inactive outlined heart; control enabled if still visible |
| Either | Write fails | Prior saved state retained; existing error/retry behavior |
| Either | Reload | Persisted favorite state restored |

The icon display box is 24 × 24 CSS pixels for every visible state. The containing
target remains at least 44 × 44 pixels (the design retains the existing 46 × 46
button) and centers the full icon box horizontally and vertically. Size and alignment do not depend on favorite,
pending, error, theme or viewport width. Existing favorites-only filtering can remove
a card or replace a Random viewer after a successful removal; geometry comparisons
apply while the same image remains visible in the same context.

The decorative icon has no independent data or behavior. Native buttons retain the
existing accessible action name, pressed state, activation, and disabled state.
