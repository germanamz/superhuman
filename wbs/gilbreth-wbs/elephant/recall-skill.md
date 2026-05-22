---
type: wbs-node
title: recall skill
order: 3
level: story
status: completed
---

# recall skill

## Outcome

`elephant:recall` — the read side of Tusk-as-memory and the windowed counterpart to broad capture. Whenever the agent needs context to proceed (regardless of whether the user asked), it pulls only the relevant slice of the knowledge graph into the window — never the whole graph. Both auto-invoking (agent-decided, need-driven) and an explicit named entry point.

## Success Criteria

- `plugins/elephant/skills/recall/SKILL.md` auto-invokes when the agent needs context AND is invocable by name.
- Surfaces a narrow, de-duplicated, archived-excluded, capped slice — not the whole graph; announced with a terse summary.
- Structural recall always runs; semantic runs when `[embeddings]` is configured, with a one-time degraded hint otherwise.
- A once-per-slice guard prevents re-pulling the same slice in a session.
- Gates on availability check; reads `conventions`; links (not restates) both.

## Assumptions Made

- conventions (story 2) and the knowledge pack (story 1) are shipped and define what's queryable.

## Open Questions

none — trigger (need-driven, agent-decided, once-per-slice guard, + named entry), windowing (structural + optional semantic, capped, archived-excluded), and surfacing (announced + terse) are resolved.

## Tradeoffs Considered

- Need-driven trigger (chosen) vs. per-turn vs. explicit-only: per-turn floods context; explicit-only loses proactive cross-session memory. Need-driven (agent recognizes an information need) with a once-per-slice guard balances both.
- Structural-first windowing with optional semantic + small cap (chosen) — enforces "slice, not graph."

## Out of Scope

- capture (story 3); gilbreth defer-to-elephant (story 5); the conventions rules + availability-check procedure (link them); `[embeddings]` configuration.

## Spec note

[[wbs/gilbreth-wbs/elephant/recall-skill-spec]]

## Plan note

[[wbs/gilbreth-wbs/elephant/recall-skill-plan]]

## Phasing

No phases needed.

## Tasks

To be decomposed after planning.
