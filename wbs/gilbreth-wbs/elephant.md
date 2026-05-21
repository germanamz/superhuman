---
type: wbs-node
title: Elephant — Tusk as agent memory
order: 0
level: initiative
status: ready-to-decompose
---

# Elephant — Tusk as agent memory

## Outcome

A standalone `elephant` plugin that makes Tusk the agent's short-to-medium-term memory keeper, so knowledge transfer across sessions is seamless. Elephant ships WBS-agnostic Tusk-usage skills that fire on the work itself (not on the user mentioning Tusk): it captures learnings broadly into a knowledge graph and recalls them narrowly (windowed), so a future session resumes with just-enough relevant context instead of a flooded window. gilbreth's generic Tusk discipline is refactored to defer to Elephant.

## Success Criteria

- A new `elephant` plugin is registered in the marketplace with three skills (`conventions`, `capture`, `recall`), a generic `knowledge` Tusk pack, a `/bootstrap` command, and note templates.
- `capture` auto-invokes on note-worthy work (hard-won learnings, decisions, open threads, boundary checkpoints — all of them) and writes small, well-linked notes to the graph.
- `recall` auto-invokes at start-of-work / context switch and pulls only the relevant slice via structural + semantic query.
- When no Tusk graph exists, Elephant offers to bootstrap once per session; if declined, it goes dormant; if a graph exists, it operates silently.
- gilbreth's `conventions.md` and `wbs-orientation` defer to `elephant:conventions` for generic Tusk discipline, keeping only WBS-specific rules.

## Assumptions Made

- Tusk v1.3.0+ with git-tracked markdown nodes; the same MCP-preferred / CLI-fallback access pattern wbs-orientation uses.
- Semantic recall is additive and degrades gracefully when `[embeddings]` is unconfigured (mirrors the WBS semantic-gate availability pattern).
- Claude Code resolves cross-plugin skill references by `plugin:skill` name (as gilbreth already does for its own skills), so gilbreth can invoke `elephant:conventions`.

## Open Questions

- Exact node/edge model of the `knowledge` pack (node kinds, edges, composition with the `wbs` pack) — resolved at the knowledge-pack story's brainstorm.
- Whether `capture`/`recall` should themselves be invokable as named entry points by subagents, or purely auto-invoke — resolved per-story.

## Tradeoffs Considered

- **Generalize-and-extract** (chosen) vs. net-new-no-refactor vs. fold-into-gilbreth vs. sync-only. Chose extraction so the Tusk discipline has one home and Researcher (#6) can build on it; accepts a gilbreth refactor as the cost.
- **Focused skill trio** (chosen) vs. a single orchestrator skill vs. thin-conventions-plus-one-skill. Capture and recall have genuinely different triggers and failure modes, so separate skills keep each one's context tight.
- **Capture broadly / recall narrowly** vs. a single tunable threshold. The point is cross-session memory, so capture spans learnings + decisions + open threads + boundary checkpoints; the graph + indexation is what keeps recall windowed despite broad capture.
- Prefix-free skill names (`capture`/`recall`/`conventions`) rely on the `elephant:` plugin namespace for disambiguation.

## Out of Scope

- Researcher (#6) and Engineering conventions (#5).
- Re-implementing WBS-specific concerns (levels, Karpathy gate, phasing) — those stay in gilbreth.
- A human-facing query UI; Elephant is agent-facing guidance plus a pack/command.

## Contracts

- **Depends on:** the gilbreth-wbs spine's Tusk conventions (the material being generalized).
- **Depended on by:** gilbreth (post-refactor) and the future Researcher initiative (#6), which will write into Elephant's knowledge graph.

## Phasing

No phases needed at the initiative level. Sequencing is expressed through story order (see Stories).

## Stories

Built in order; each is a focused implement-by-parts session.

1. **knowledge pack + /bootstrap + availability check** — the generic Tusk types, the one-time init command, and the shared "is there a graph?" probe the skills depend on.
2. **conventions skill** — the WBS-agnostic graph-hygiene rulebook the other two skills read.
3. **capture skill** — broad, auto-invoking note capture.
4. **recall skill** — windowed, auto-invoking retrieval.
5. **gilbreth refactor** — make gilbreth's conventions/orientation defer to `elephant:conventions`.
