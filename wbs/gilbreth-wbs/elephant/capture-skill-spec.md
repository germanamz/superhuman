---
type: wbs-note
title: Spec — capture skill
kind: spec
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/capture-skill
---

# Spec — capture skill

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant/capture-skill` by a `wbs-about` edge)

## Goal

Ship `elephant:capture` — the write side of Tusk-as-memory. It captures note-worthy work *broadly* (learnings, decisions, open-threads, boundary checkpoints) into the knowledge graph, autonomously and proactively (regardless of whether the user mentioned Tusk), so a future session can recall it. It applies the `conventions` rulebook for *how* to model each note and gates on the availability check.

## Architecture

A `plugins/elephant/skills/capture/SKILL.md`. It is **both** auto-invoking (fires on note-worthy moments) **and** an explicit named entry point (`elephant:capture` — the user or a dispatched subagent can invoke it directly to persist learnings). It is a rigid procedure (the write sequence is enforced) that reads the flexible `conventions` rulebook for modeling judgment.

### Behavior: autonomous + announced, boundary-batched

- Writes notes on its own — no per-note approval (that would defeat the proactive-memory goal).
- Transparent: emits a terse one-line acknowledgment per capture (e.g., `📝 captured learning: <title>`), so the user has visibility and can course-correct, without a blocking prompt.
- Batches multiple items at a natural boundary rather than interrupting mid-flow per item.

### Trigger

Auto-invokes at:
- (i) natural work boundaries — finishing an investigation, before a context switch, task/subtask completion; and
- (ii) the moment a clearly note-worthy item surfaces — a hard-won/non-obvious learning, a decision + its rationale, a discovered constraint, an open thread/loose end.

Also invocable explicitly by name. Both paths run the same procedure.

## Components

`skills/capture/SKILL.md` procedure:

1. **Gate.** Run the availability check (`references/availability-check.md`). Absent graph → offer `/bootstrap` once, else dormant; present → continue silently.
2. **Identify items.** From the work (or the explicit request), enumerate the note-worthy items and assign each a `kind` (`learning|decision|open-thread|checkpoint`) per `conventions`.
3. **Dedup check (lightweight).** For each item, check for an existing note on the same topic — by tag/title match, plus semantic ranking when embeddings are configured. This is a *targeted* existence check, NOT full retrieval (that is `recall`, story 4).
4. **Create / append / supersede** per `conventions`: new note for a distinct idea; append for the same idea; `archived=true` + a `supersedes` edge when replacing an outdated note.
5. **Model the note** per `conventions`: small + atomic, discoverable title/body, topic `tags`, `[[wikilinks]]` to related notes (→ `references`).
6. **Write** via MCP (`tusk_node_create` / `tusk_node_modify` + `tusk_edge_add`); MCP-preferred, CLI-fallback.
7. **Acknowledge** with a terse one-line-per-capture summary; batch at boundaries.

## Data flow

1. Agent hits a note-worthy moment / boundary (or is explicitly told to capture) → `capture` runs → gate → identify → dedup → write → acknowledge.
2. Notes land in the graph well-modeled and linked, so `recall` (story 4) can later surface them narrowly.

## Error handling

- No graph: offer-bootstrap-once then dormant (no nagging) — per the availability check.
- Embeddings absent: dedup falls back to structural (tag/title) match only; never blocks the write.
- MCP write-lock contention: prefer MCP tools (the server holds the lock).
- Ambiguous kind / not clearly note-worthy: prefer NOT writing trivia (capture broadly, but skip what's re-derivable from code/docs — `conventions` "windowed memory" judgment applies).

## Verification

- `skills/capture/SKILL.md` exists with valid frontmatter; `description` auto-invokes on note-worthy work AND it is invocable by name.
- Manual smoke (in a knowledge-pack workspace): a session that learns something non-obvious results in a well-formed `note` (right `kind`, tags, a `[[wikilink]]`), with a terse acknowledgment; re-capturing the same topic appends/supersedes rather than duplicating.
- Explicit invocation path writes a note on demand.
- Gating: in a non-Tusk workspace, the first note-worthy moment offers `/bootstrap` once, then goes quiet.

## Out of scope

- `recall` / full retrieval (story 4) — capture's dedup check is deliberately lightweight.
- gilbreth's defer-to-elephant refactor (story 5).
- The `conventions` rules themselves (story 2) — capture *applies* them, doesn't restate them.
- An `open → resolved` note workflow (knowledge-pack v2).

## Open questions

- None. Autonomy (autonomous + announced, boundary-batched), dedup approach (lightweight, conventions-driven), and the named-entry-point question (yes — both auto and explicit) are all resolved.
