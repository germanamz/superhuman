---
type: wbs-node
title: Build out the Gilbreth WBS
level: project
status: completed
order: 0
---

# Build out the Gilbreth WBS

## Outcome

Grow the `gilbreth` plugin from scaffolding into an opinionated, end-to-end workflow that walks a user from a fuzzy idea down to atomic, agent-executable tasks — with graph-backed note-taking, conventions, and Tusk integration throughout. The durable change: user + agent collaborate on software work through an inverted-flame Work Breakdown Structure where every node carries Karpathy forcing-functions and every learning is captured for narrow, windowed recall by future sessions.

## Success Criteria

- The WBS spine (levels, decomposition gate, phasing, reshape) ships and is dogfood-usable. (Done — sub-projects #1–3.)
- Knowledge capture/recall works as a cross-session memory layer (Elephant).
- Engineering conventions and a staged-research workflow (Researcher) build on top.
- Each sub-project ships its own spec + plan + implementation through the superpowers loop.

## Assumptions Made

- Tusk v1.3.0+ is the backing store; nodes/notes are git-tracked markdown.
- The full design rationale and live ordering live in the roadmap doc, `docs/superpowers/gilbreth-wbs-roadmap.md` — this node is the WBS container for it.

## Open Questions

none, because the roadmap doc is the living plan and re-evaluates ordering each time a sub-project completes.

## Tradeoffs Considered

- Tracking this initiative in Tusk vs. the markdown roadmap alone: we track active sub-projects as WBS nodes (dogfooding + windowed recall) while keeping the roadmap as the human-facing index. Completed sub-projects (#1–3) are not seeded as nodes — they'd be noise.

## Out of Scope

- Re-tracking already-completed sub-projects (#1–3) as WBS nodes.
- Building Researcher (#6) or Engineering conventions (#5) right now.

## Phasing

No phases needed. Sub-projects are sequenced via the roadmap, not WBS phases.

## Milestones

Sub-projects are tracked directly as initiatives under this project (the `milestone` rank is intentionally skipped — the roadmap groups sub-projects without an intermediate tier).

- **Elephant** (initiative) — Tusk as the agent's short-to-medium-term memory keeper.
