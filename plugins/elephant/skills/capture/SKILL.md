---
name: capture
description: Use proactively to capture note-worthy work into the Tusk knowledge graph so future sessions can recall it — at natural work boundaries (finishing an investigation, before a context switch, task completion) and the moment a hard-won learning, a decision + rationale, a discovered constraint, or an open thread surfaces. Fires regardless of whether the user mentioned Tusk. Also invocable by name to persist learnings on demand (e.g. a subagent before reporting back).
---

# Capture

Capture is the write side of Tusk-as-memory. It applies the [`conventions`](../conventions/SKILL.md) rulebook for how to model each note and gates on [`references/availability-check.md`](../../references/availability-check.md) before touching the graph. It is both auto-invoking (fires at note-worthy moments without being asked) and an explicit named entry point — both paths run the same procedure.

## Behavior

**Autonomous + announced, boundary-batched.**

Capture writes notes without per-note approval — asking each time defeats the proactive-memory goal. It is transparent: it emits a terse one-line acknowledgment per note captured (e.g., `📝 captured learning: <title>`), so the user has visibility and can course-correct without a blocking prompt. When multiple note-worthy items surface at once, batch them at the natural boundary rather than interrupting mid-flow per item.

## Procedure

1. **Gate.** Run the availability check ([`references/availability-check.md`](../../references/availability-check.md)). If no graph is present, offer `/bootstrap` once then go dormant for the session — do not re-offer, do not re-probe on every note-worthy moment. If the graph is present, continue silently.

2. **Identify items.** Enumerate the note-worthy items from the work (or from the explicit request). Assign each a `kind` — `learning | decision | open-thread | checkpoint` — per `conventions`. Skip anything trivial or re-derivable from code or docs.

3. **Dedup check (lightweight).** For each item, look for an existing note on the same topic. Query by tag and title match (`tusk_query 'tagged:<topic>'`, title keywords); add `--semantic` / `semantic` ranking when embeddings are configured. This is a targeted existence check — NOT full retrieval (that is `recall`).

4. **Create / append / supersede** per `conventions`: new note for a distinct idea; append when adding detail to the same idea; `archived=true` + a `supersedes` edge from the replacement note when an existing note is wrong or outdated.

5. **Model the note** per `conventions`: small and atomic, discoverable title and body, topic `tags` via `tusk_edge_add`, `[[wikilinks]]` to related notes.

6. **Write** via MCP (`tusk_node_create` / `tusk_node_modify`, `tusk_edge_add`). MCP-preferred; fall back to the equivalent `tusk` CLI verbs (`tusk node create`, `tusk node modify`, `tusk edge add`) when the MCP server is unreachable.

7. **Acknowledge** with the terse one-line-per-capture summary. Batch acknowledgments at boundaries rather than surfacing them one at a time mid-flow.

## When NOT to capture

- Trivia or anything re-derivable from the codebase or public docs.
- Secrets, credentials, or sensitive values.
- If no graph is present and the user already declined `/bootstrap` this session — stay dormant, do not re-offer.
