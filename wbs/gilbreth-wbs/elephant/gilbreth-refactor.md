---
type: wbs-node
title: gilbreth refactor to defer to elephant
order: 4
level: story
status: drafted
wbs-parent: wbs/gilbreth-wbs/elephant
---

# gilbreth refactor to defer to elephant

## Outcome

gilbreth's generic Tusk discipline is refactored to defer to Elephant: `conventions.md` and `wbs-orientation` reference `elephant:conventions` for graph hygiene, keeping only WBS-specific rules (levels, Karpathy gate, phasing, reshape). Removes the duplication created by extracting Elephant.

## Success Criteria

- gilbreth's `conventions.md` no longer re-states generic Tusk modeling rules; it points at `elephant:conventions`.
- `wbs-orientation` still drives WBS flows and gates correctly after the refactor.
- No behavioral regression in WBS flows.

## Assumptions Made

- Elephant's conventions/capture/recall skills (stories 1–4) are shipped first.
- Claude Code resolves `elephant:conventions` cross-plugin references at runtime.

## Open Questions

- Whether gilbreth should declare a formal dependency on elephant or just reference it by name — resolved at this story's brainstorm.

## Tradeoffs Considered

- Resolved at this story's brainstorm.

## Out of Scope

- Building Elephant's skills (stories 1–4).

## Spec note

Populated by this story's wrapped brainstorming.

## Plan note

Populated by this story's wrapped writing-plans.

## Phasing

No phases needed.

## Tasks

To be decomposed after this story is brainstormed and planned.
