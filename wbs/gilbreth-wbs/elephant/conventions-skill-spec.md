---
type: wbs-note
title: Spec — conventions skill
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/conventions-skill
kind: spec
---

# Spec — conventions skill

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant/conventions-skill` by a `wbs-about` edge)

## Goal

Ship `elephant:conventions` — an auto-invoking skill that is the WBS-agnostic graph-hygiene rulebook for the `knowledge` pack. It makes Tusk's (unfamiliar-to-the-model) knowledge-modeling discipline explicit whenever the agent touches a knowledge graph, so notes are captured well and stay discoverable for windowed recall. It generalizes the Tusk-usage parts of gilbreth's `conventions.md` without any WBS vocabulary, and is the single source of modeling truth that `capture`, `recall` (later stories), and gilbreth (story #5) build on.

## Architecture

A single, skimmable `skills/conventions/SKILL.md` (a reference/flexible skill — principles adapted to context, not a rigid procedure). It auto-invokes via its `description` and points at the existing `references/availability-check.md` rather than restating it.

### Trigger

Auto-invokes whenever the agent is about to **model or query a Tusk knowledge graph** — read or write: creating/editing `note`s, choosing edges, tagging, archiving, or running queries. Rationale: Tusk is not a tool the base model knows, so explicit, proactively-surfaced rules prevent wrong assumptions. Because the trigger covers graph interaction generally (not just capture/recall flows), the rules surface even when the agent hand-models the graph directly.

### Relationship to other skills

- `capture` and `recall` (later stories) auto-fire for *their* moments (note-worthy work / start-of-work) and build on / may invoke `conventions` by name for the *how*.
- gilbreth's `conventions.md` defers to this skill for generic Tusk discipline (story #5), keeping only WBS-specific rules.
- Overlapping triggers (conventions + capture both firing on a write) are acceptable and intended — conventions supplies modeling rules; capture supplies the "write this now" action.

## Components

`skills/conventions/SKILL.md` sections (WBS-agnostic, grounded in the shipped `knowledge` pack — `note` type, `kind` enum, `references`/`supersedes` edges, `tags` pack):

1. **Windowed memory principle** — the why: capture broadly, keep each note small and atomic, recall narrowly; the graph + indexation is what keeps recall windowed.
2. **Note granularity & `kind`** — one idea per note; how to choose `learning | decision | open-thread | checkpoint`.
3. **Create vs. append vs. supersede** — when to write a new `note`, extend an existing one, or `archived=true` + a `supersedes` edge (append-only history).
4. **Discoverability** — write titles/bodies the indexer and semantic search can find; link related notes with `[[wikilinks]]` (→ `references`); tag topics via the `tags` pack so "everything about X" is queryable.
5. **Archive semantics** — `archived=true` is the soft-delete/supersede marker; never hard-delete.
6. **Tool discipline** — MCP-preferred / CLI-fallback; the write-lock note; pointer to `references/availability-check.md`.

## Data flow

1. Agent is about to read/write a Tusk knowledge graph → `conventions` auto-invokes → the agent has the modeling rules in context.
2. `capture`/`recall` (later) and gilbreth (story #5) reference these rules instead of re-encoding them.

## Error handling

- No knowledge graph present: the rules still apply once a graph exists; the availability-check / bootstrap-offer behavior lives in `references/availability-check.md` (and capture/recall), not here. `conventions` is guidance, not a graph mutation, so it has no failure modes of its own.

## Verification

- `skills/conventions/SKILL.md` exists with valid skill frontmatter (`name`, `description`); the `description` triggers on Tusk knowledge-graph interaction.
- Content covers all six sections above, uses only the `knowledge`-pack vocabulary (no `wbs-node`/levels/Karpathy), and references `availability-check.md` rather than duplicating it.
- Plugin still loads (`elephant` appears in the catalog; skill is discoverable).
- Manual smoke: in a workspace with the knowledge pack, a graph-modeling prompt surfaces the skill and its rules.

## Out of scope

- `capture` / `recall` skill logic (stories 3–4).
- gilbreth's refactor to defer to this skill (story #5).
- Re-stating the availability-check procedure (lives in `references/availability-check.md`).
- Any WBS-specific modeling rules.

## Open questions

- None. The rulebook content follows from the shipped knowledge pack and gilbreth's existing conventions; the trigger scope (read+write graph interaction) is settled.
