---
type: wbs-note
title: Spec — Elephant plugin
archived: false
kind: spec
wbs-about: wbs/gilbreth-wbs/elephant
---

# Spec — Elephant plugin

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant` by a `wbs-about` edge)

## Goal

Make Tusk the agent's short-to-medium-term memory keeper. Elephant is a standalone, WBS-agnostic plugin whose skills fire on the work itself: they capture learnings broadly into a knowledge graph and recall them narrowly so a future session resumes with just-enough context. It generalizes the Tusk discipline currently encoded inline in the gilbreth WBS spine, and gilbreth is refactored to defer to it.

## Architecture

Three auto-invoking skills over a shared availability check, backed by a generic Tusk pack:

| Artifact | Type | Role |
|---|---|---|
| `skills/conventions/` | reference skill | Graph-hygiene rulebook: model knowledge as nodes/edges, create-vs-append-vs-supersede, naming, `[[wikilink]]` discoverability, archive semantics. WBS-agnostic sibling of gilbreth's `conventions.md`. Read by `capture` and `recall`. |
| `skills/capture/` | rigid skill | Auto-invokes on note-worthy work (learnings, decisions, open threads, boundary checkpoints). Writes small, well-linked notes. Broad capture. |
| `skills/recall/` | rigid skill | Auto-invokes at start-of-work / context switch. Query-first (structural + semantic) retrieval of the relevant slice only. Windowed. |
| `packs/knowledge.toml` | Tusk pack | Generic knowledge node/edge types, independent of WBS; composes with the `wbs` pack. The graph non-WBS workflows write into. |
| `commands/bootstrap.md` | command | One-time init: add the `knowledge` pack to a workspace's Tusk. Invoked by the offer-to-bootstrap-once path. |
| `templates/` | templates | Note templates per kind (learning / decision / checkpoint / open-thread). |

## Components

- **Shared availability check.** Both `capture` and `recall` probe for a Tusk graph + `knowledge` pack. Absent → offer `/bootstrap` once per session; declined → dormant for the session; present → operate silently. Mirrors wbs-orientation's pack-presence check and once-per-session degraded-mode hint discipline.
- **conventions** is the single source of modeling truth; capture/recall reference it rather than re-encoding rules. Flexible (principles adapted to context).
- **capture** decides node-vs-append, writes a small note, links it with `[[wikilinks]]`/edges so indexation makes it discoverable. Rigid procedure.
- **recall** runs structural + semantic queries, de-dupes, and surfaces a narrow set; semantic layer degrades gracefully without `[embeddings]`. Rigid procedure.
- **knowledge pack** declares the node/edge types (exact shape resolved in the knowledge-pack story); composes with `wbs` (shares the `references` wikilink edge, `wbs-`-prefix keeps WBS edges distinct).

## Data flow

1. Agent does work → hits a note-worthy moment → `capture` auto-invokes → availability check → write note + links into graph.
2. Agent starts work / switches context → `recall` auto-invokes → availability check → query graph (structural + semantic) → surface narrow relevant slice into the window.
3. No graph present → first such moment offers `/bootstrap`; thereafter dormant if declined.

## Error handling

- No Tusk graph / pack: offer-bootstrap-once, then dormant (no nagging).
- MCP unreachable: CLI fallback (same dual-path pattern as wbs-orientation).
- No `[embeddings]`: semantic recall skipped, structural recall still runs, one-time degraded hint.
- Write-lock contention (MCP server holds the lock): prefer MCP tools over CLI.

## Verification

- Plugin registered in marketplace + release-please (two PRs: `feat(elephant)` scaffold, `feat(marketplace)` register) per CONTRIBUTING.
- Manual: in a Tusk workspace, note-worthy work triggers capture; a fresh session's recall surfaces it. In a non-Tusk workspace, first note-worthy moment offers bootstrap once.
- gilbreth refactor: `conventions.md`/`wbs-orientation` reference `elephant:conventions`; WBS flows still pass their gates.

## Out of scope

- Researcher (#6), Engineering conventions (#5).
- WBS-specific concerns (levels, Karpathy gate, phasing) — stay in gilbreth.
- A human-facing query UI.

## Per-story design

Each of the five stories gets its own focused brainstorm → spec → plan → implement session. Open design questions (exact knowledge-pack node/edge model; whether capture/recall are also named entry points for subagents) are resolved at the relevant story's brainstorm, not here.
