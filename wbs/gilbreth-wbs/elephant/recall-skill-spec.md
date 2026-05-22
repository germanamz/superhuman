---
type: wbs-note
title: Spec — recall skill
archived: false
kind: spec
wbs-about: wbs/gilbreth-wbs/elephant/recall-skill
---

# Spec — recall skill

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant/recall-skill` by a `wbs-about` edge)

## Goal

Ship `elephant:recall` — the read side of Tusk-as-memory and the windowed counterpart to broad `capture`. Whenever the agent needs context to proceed, recall pulls only the *relevant slice* of the knowledge graph into the window (never the whole graph), so prior-session knowledge transfers seamlessly without flooding the context.

## Architecture

A `plugins/elephant/skills/recall/SKILL.md`. **Both** auto-invoking (the agent recognizes an information need and recalls) **and** an explicit named entry point (`elephant:recall` — "what do we know about X?"). A rigid retrieval procedure that reads the flexible `conventions` rulebook and gates on the availability check.

### Trigger: need-driven

Auto-invokes whenever the agent **needs to gather context/information to proceed — regardless of whether the user asked for it.** The agent recognizes its own information need and decides to recall. Common cases: starting a substantive piece of work, a context switch to a new topic the graph might know about, or hitting a question whose answer prior sessions may have captured.

It is NOT a per-turn reflex — firing every message would flood context and defeat windowed memory. A **once-per-slice guard** prevents re-pulling the same slice within a session.

### Windowing: how "narrow" is enforced

- **Structural (always):** notes `tagged` with the topic; recent `checkpoint`s; notes linked via `references` to what's in play.
- **Semantic (when `[embeddings]` is configured):** top-K by similarity to the topic/need.
- De-duplicate the union, exclude `archived`, and cap at a small N — a slice, not the graph.
- **Degraded mode:** no `[embeddings]` → structural-only + a one-time degraded hint (the established wbs-orientation pattern). Never block on the absence of the semantic layer.

### Surfacing: announced + terse

Surface a brief summary of what was pulled (e.g. `🧠 recalled 3 notes on <topic>: …`) so the user sees the basis, then proceed using them. Consistent with `capture`'s announced behavior.

## Components

`skills/recall/SKILL.md` procedure:

1. **Gate.** Availability check (`references/availability-check.md`): absent graph → offer `/bootstrap` once then dormant; present → continue.
2. **Frame the need.** Derive the topic/query from what the agent is about to do (or the explicit request).
3. **Once-per-slice guard.** If this slice was already recalled this session, skip (don't re-pull).
4. **Structural query** via MCP (`tusk_query` by `tagged:<topic>`, recent `checkpoint`s, `references`-linked notes); exclude `archived`.
5. **Semantic query** when embeddings available (`tusk_query … --semantic '<need>'`); else emit the one-time degraded hint and skip.
6. **Merge + window.** Union, de-dupe, exclude archived, cap at small N.
7. **Surface** the terse summary; use the recalled notes as context.

## Data flow

1. Agent needs context (auto) or is asked to recall (explicit) → gate → frame need → guard → structural + (semantic) query → window → surface → proceed.
2. Pairs with `capture`: capture writes well-modeled notes; recall reads them back narrowly. Capture's lightweight dedup check and recall share the same query shape but recall is the full retrieval.

## Error handling

- No graph: offer-bootstrap-once then dormant.
- No `[embeddings]`: structural-only + one-time hint; never block.
- MCP write-lock contention / unreachable: prefer MCP, CLI-fallback.
- Empty result: say so briefly (nothing recalled) and proceed; don't fabricate.

## Verification

- `skills/recall/SKILL.md` exists with valid frontmatter; `description` triggers on a need-for-context (auto) AND it is invocable by name.
- Manual smoke (knowledge-pack workspace with notes): starting work on a known topic surfaces the relevant slice (tagged/linked/semantic), de-duped and capped, with a terse summary; re-triggering the same slice in-session does not re-pull.
- Degraded mode: with no `[embeddings]`, structural recall still runs and the one-time hint fires once.
- Links to `conventions` and `availability-check` rather than restating them; no WBS vocabulary.

## Out of scope

- `capture` (story 3) — recall is read-only; it does not write notes.
- gilbreth's defer-to-elephant refactor (story 5).
- The `conventions` rules and the availability-check procedure (link them).
- Configuring `[embeddings]` (knowledge-pack/bootstrap concern); recall only degrades gracefully.

## Open questions

- None. Trigger (need-driven, agent-decided, once-per-slice guard, + named entry), windowing (structural + optional semantic, capped, archived-excluded), and surfacing (announced + terse) are resolved.
