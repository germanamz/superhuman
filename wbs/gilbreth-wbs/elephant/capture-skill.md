---
type: wbs-node
title: capture skill
level: story
status: plan-ready
order: 2
---

# capture skill

## Outcome

`elephant:capture` — the write side of Tusk-as-memory. Captures note-worthy work broadly (learnings, decisions, open-threads, boundary checkpoints) into the knowledge graph, autonomously and proactively (regardless of whether the user mentioned Tusk), applying the `conventions` rulebook and gating on the availability check. Both auto-invoking and an explicit named entry point.

## Success Criteria

- `plugins/elephant/skills/capture/SKILL.md` auto-invokes on note-worthy moments/boundaries AND is invocable by name.
- Behavior is autonomous + announced (terse one-line acknowledgment per capture), boundary-batched.
- Notes are small/atomic, correctly `kind`-ed, tagged, and `[[wikilink]]`-linked; a lightweight dedup check appends/supersedes instead of duplicating.
- Gates on the availability check (offer-bootstrap-once / dormant / silent).

## Assumptions Made

- conventions skill (story 2) is shipped and defines the modeling rules capture applies.
- The knowledge pack (story 1) and `references/availability-check.md` exist.

## Open Questions

none — autonomy (autonomous + announced, boundary-batched), dedup (lightweight, conventions-driven), and named entry point (yes, both auto + explicit) are resolved.

## Tradeoffs Considered

- Autonomous+announced (chosen) vs. silent vs. propose-then-confirm: chose announced autonomy — proactive memory without per-note ceremony, but transparent.
- Lightweight dedup check (chosen) vs. full retrieval before write: full retrieval is `recall` (story 4); capture stays targeted.
- Auto + explicit entry point (chosen) vs. auto-only: explicit lets a subagent persist learnings before reporting back.

## Out of Scope

- recall / full retrieval (story 4); gilbreth defer-to-elephant (story 5); the conventions rules themselves (story 2).

## Spec note

[[wbs/gilbreth-wbs/elephant/capture-skill-spec]]

## Plan note

[[wbs/gilbreth-wbs/elephant/capture-skill-plan]]

## Phasing

No phases needed.

## Tasks

To be decomposed after planning.
