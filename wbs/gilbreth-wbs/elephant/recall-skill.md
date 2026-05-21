---
type: wbs-node
title: recall skill
level: story
status: drafted
order: 3
wbs-parent: wbs/gilbreth-wbs/elephant
---

# recall skill

## Outcome

The `elephant:recall` skill: auto-invokes at start-of-work / context switch and pulls only the relevant slice of the knowledge graph (structural + semantic query) into the window — the windowed-recall counterpart to broad capture. Semantic layer degrades gracefully without `[embeddings]`.

## Success Criteria

- `skills/recall/SKILL.md` auto-invokes at work start / context switch.
- Surfaces a narrow, de-duplicated, relevant set — not the whole graph.
- Structural recall always runs; semantic recall runs when embeddings are available, with a one-time degraded hint otherwise.

## Assumptions Made

- conventions skill (story 2) and knowledge pack (story 1) define what's queryable.

## Open Questions

- Trigger precision for "start of work / context switch" without over-firing — resolved at this story's brainstorm.

## Tradeoffs Considered

- Resolved at this story's brainstorm.

## Out of Scope

- Capture (story 3).

## Spec note

Populated by this story's wrapped brainstorming.

## Plan note

Populated by this story's wrapped writing-plans.

## Phasing

No phases needed.

## Tasks

To be decomposed after this story is brainstormed and planned.
