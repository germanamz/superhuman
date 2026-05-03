# Reshape — <focal-node-title> (<short-id>) — <YYYY-MM-DD>

<!--
Audit-note template for `meta.type=reshape` notes posted on the focal node by the wbs-reshape-flow skill.

Tusk metadata to set when creating this note:
  meta.type=reshape
  meta.reshape-of-spec=<short-id of the spec note this reshape supersedes>
  meta.parent-reshape=<short-id of parent reshape note, if this is a nested reshape>

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
  - <child short-id> "<title>" — <level>
  - …

## New Shape (after reshape)
- Outcome: <one line from new spec — link to new spec note ID>
- Children:
  - <child short-id> "<title>" — <level> — **kept unchanged**
  - <child short-id> "<title>" — <level> — **reparented to <new-parent-id>**
  - <child short-id> "<title>" — <level> — **archived**
  - <NEW> "<title>" — <level> — **created via /wbs-new**

## Deferred Reshapes
<Children reparented but not reshaped now. Their description's `## Open Questions` section was updated with a "Reshape under new parent context" entry. Listed here for traceability.>

- <child short-id> — reparented to <new-parent-id>; reshape deferred
- (none)

## Nested Reshapes
<Reshape notes posted on descendants during this flow's recursion. By note short-id.>

- <reshape-note-id> on <child short-id>
- (none)

## References
- Prior spec note: <short-id> (archived)
- New spec note: <short-id>
- Prior plan note (if any): <short-id> (archived)
- Parent reshape note (if nested): <short-id>
