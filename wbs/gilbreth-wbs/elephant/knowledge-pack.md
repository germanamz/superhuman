---
type: wbs-node
title: Knowledge pack + /bootstrap + availability check
wbs-parent: wbs/gilbreth-wbs/elephant
level: story
status: drafted
order: 0
---

# Knowledge pack + /bootstrap + availability check

## Outcome

The foundation the other stories build on: a generic `knowledge` Tusk type pack (node/edge types for free-standing knowledge capture, composing with the `wbs` pack), a `/bootstrap` command that adds the pack to a workspace's Tusk, and the shared availability-check routine ("is there a graph + knowledge pack?") that `capture` and `recall` gate on.

## Success Criteria

- `packs/knowledge.toml` declares the knowledge node/edge types and composes cleanly with `wbs.toml` (no collisions beyond the shared `references` edge).
- `/bootstrap` initializes Tusk (if needed) and adds the knowledge pack idempotently.
- An availability check the skills can call returns present / absent and drives the offer-once-then-dormant behavior.

## Assumptions Made

- Tusk v1.3.0+; MCP-preferred / CLI-fallback access.

## Open Questions

- Exact node kinds and edge set for the knowledge pack — resolved at this story's brainstorm.

## Tradeoffs Considered

- Resolved at this story's brainstorm (e.g. one generic `note` type vs. several knowledge kinds).

## Out of Scope

- The capture/recall/conventions skill logic (later stories).

## Spec note

Populated by this story's wrapped brainstorming.

## Plan note

Populated by this story's wrapped writing-plans.

## Phasing

No phases needed.

## Tasks

To be decomposed after this story is brainstormed and planned.
