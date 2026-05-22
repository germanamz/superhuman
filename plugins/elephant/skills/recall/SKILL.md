---
name: recall
description: Use whenever you need context or background to proceed — regardless of whether the user asked — to pull the relevant slice of prior knowledge from the Tusk knowledge graph into the window. Fires when starting a substantive piece of work, switching to a new topic, or hitting a question prior sessions may have answered. Pulls a narrow, windowed slice (not the whole graph). Also invocable by name ("what do we know about X?").
---

# Recall

Recall is the read side of Tusk-as-memory and the windowed mirror of [`capture`](../capture/SKILL.md). It applies the [`conventions`](../conventions/SKILL.md) rulebook for how the graph is modeled and gates on [`references/availability-check.md`](../../references/availability-check.md) before touching the graph. It is both auto-invoking (fires when you need context to proceed, without being asked) and an explicit named entry point — both paths run the same procedure.

## When to recall

Recall when you need context to proceed: starting a substantive piece of work, switching to a new topic the graph might know about, or hitting a question whose answer a prior session may have captured. The trigger is your information need — not the user's request.

Recall is NOT a per-turn reflex. Firing on every message floods the context window and defeats windowed memory. Apply the **once-per-slice guard**: if you have already recalled this slice in the current session, skip — don't re-pull.

## Procedure

1. **Gate.** Run the availability check ([`references/availability-check.md`](../../references/availability-check.md)). If no graph is present, offer `/bootstrap` once then go dormant for the session. If the graph is present, continue.

2. **Frame the need.** Derive the topic or query from what you are about to do (or from the explicit request). Be specific — a precise topic narrows the slice.

3. **Once-per-slice guard.** If you have already recalled this slice this session, skip the remaining steps and proceed with what you have.

4. **Structural query** via MCP (`tusk_query` / `tusk query`). Query by `tagged:<topic>`, recent `checkpoint`s, and notes linked via `references` to what is in play. Exclude `archived` notes.

5. **Semantic query** when `[embeddings]` is configured: `tusk_query … --semantic '<need>'` (MCP) or `tusk query … --semantic '<need>'` (CLI). If embeddings are not configured, emit the one-time degraded hint (see below) and skip this step. Never block on the absence of the semantic layer.

6. **Merge + window.** Union the structural and semantic results. De-duplicate, exclude `archived`, and cap at a small N — a slice, not the graph.

7. **Surface + use.** Announce a terse summary (e.g., `🧠 recalled 3 notes on <topic>: …`) so the user can see the basis, then proceed using the recalled notes as context. If nothing matched, say so briefly and proceed — never fabricate.

## Degraded mode

Without `[embeddings]` configured, structural recall (steps 4 and 6) still runs in full; the semantic step is skipped with a one-time hint, mirroring the once-per-session degraded-mode discipline from the availability check.
