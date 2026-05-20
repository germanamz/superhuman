# Reshape — <focal-node-title> — <YYYY-MM-DD>

<!--
Audit-note template for `kind=reshape-audit` wbs-notes created on the focal node by the wbs-reshape-flow skill.

Frontmatter to set when creating this note:
  kind=reshape-audit

Edges (created via tusk_edge_add, materialized into frontmatter):
  wbs-about     → the focal node
  wbs-supersedes → the prior spec note this reshape supersedes

Node references in the body use [[wikilinks]] (each materializes a `references` edge), so the graph captures the lineage and disposition links.

The Reasoning section is load-bearing — capture the user's explanation of what was learned, not a mechanical diff. A future reader sees the prior spec, the new spec, and this note bridges them with the learning.
-->

## Trigger
<One sentence: what surfaced the need to reshape. Captured verbatim from the skill's step-5 trigger question.>

## Reasoning
<Multi-paragraph free text. The user's full explanation of what was learned, why the original shape no longer holds, and what the new direction is. Load-bearing — do not abbreviate.>

## Invalidated Assumptions
<Bullet list of original assumptions (from the prior spec note's "Assumptions Made" section) that no longer hold, with one-line "why" for each.>

- **<assumption>** — <why it no longer holds>

## Original Shape (before reshape)
- Outcome: <one line from prior spec>
- Children:
  - `[[wbs/<project>/<child>]]` "<title>" — <level>
  - …

## New Shape (after reshape)
- Outcome: <one line from new spec — `[[wbs/<project>/<focal>-spec]]`>
- Children:
  - `[[wbs/<project>/<child>]]` "<title>" — <level> — **kept unchanged**
  - `[[wbs/<project>/<child>]]` "<title>" — <level> — **reparented to `[[wbs/<project>/<new-parent>]]`**
  - `[[wbs/<project>/<child>]]` "<title>" — <level> — **archived**
  - <NEW> "<title>" — <level> — **created via /wbs-new**

## Deferred Reshapes
<Children reparented but not reshaped now. Their body's `## Open Questions` section was updated with a "Reshape under new parent context" entry. Listed here for traceability.>

- `[[wbs/<project>/<child>]]` — reparented to `[[wbs/<project>/<new-parent>]]`; reshape deferred
- (none)

## Nested Reshapes
<Reshape audit notes created on descendants during this flow's recursion.>

- `[[wbs/<project>/<child>-reshape]]` on `[[wbs/<project>/<child>]]`
- (none)

## References
- Prior spec note: `[[wbs/<project>/<focal>-spec-prior]]` (archived; also linked via `wbs-supersedes`)
- New spec note: `[[wbs/<project>/<focal>-spec]]`
- Prior plan note (if any): `[[wbs/<project>/<focal>-plan-prior]]` (archived)
- Parent reshape note (if nested): `[[wbs/<project>/<parent>-reshape]]`
