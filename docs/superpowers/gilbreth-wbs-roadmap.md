# Gilbreth WBS — Roadmap

A tracker for the multi-sub-project initiative to build out the **Gilbreth WBS**: a coherent set of skills, agents, and commands that improve how user + agent collaborate on software work, organised around an inverted-flame Work Breakdown Structure.

**Initiative goal.** Take the existing scaffolding (the empty `gilbreth` plugin and the three loose phase skills in `~/.claude/skills/`) and grow it into an opinionated end-to-end workflow that walks a user from a fuzzy idea down to atomic, agent-executable tasks — with note-taking, conventions, and Tusk integration along the way.

This document is not a spec. Each sub-project below earns its own design spec and implementation plan — captured as WBS notes in Tusk — when it becomes the focus.

---

## Sub-projects

Numbered for reference, not strict execution order. Order is reviewed each time a sub-project completes. Sub-projects are grouped by status; a sub-project keeps its number as it moves between tables.

### Done

| # | Sub-project | Spec | Plan |
|---|---|---|---|
| 1 | **WBS spine** — the inverted-flame decomposition model, the skill set that walks a user from wide scope to narrow scope, and the data shape of a "node" at each level | — | — |
| 2 | **Phase skills relocation + polish** — move the three phase skills (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) from `~/.claude/skills/` into the `gilbreth` plugin, reshape for WBS context | — | — |
| 3 | **WBS reshape** — `/wbs-reshape` command + `wbs-reshape` skill that lets WBS authors change direction mid-flight via context-aware re-brainstorm; auto-invokes from `wbs-orientation` on contradiction gates | — | — |

### In progress

_None._

### Not started

| # | Sub-project | Spec | Plan |
|---|---|---|---|
| 4 | **Elephant** — a plugin that guides the agent to use [Tusk](https://github.com/germanamz/tusk) well: capture knowledge as interconnected graph nodes/edges so it stays discoverable through Tusk's indexation. Covers the Tusk conventions, syncing WBS nodes to Tusk, and windowed note-taking — capturing learnings so future agents pull narrow, relevant context without flooding the window | — | — |
| 5 | **Engineering conventions** — a skill (or guide) that codifies the user's standards for code quality and software architecture | — | — |
| 6 | **Researcher** — a plugin that guides the agent through staged research, using Elephant's skills to keep captured knowledge current as decisions and findings accrue, and keeping the user in the loop to drive each research iteration | — | — |

Sub-project #1 also ships a human-facing [user guide](wbs-user-guide.md) covering setup, the five levels, the daily decomposition flow, the slash commands, the Karpathy gate, and phasing.

---

## Working agreement

- Each sub-project goes through the full superpowers loop: `brainstorming` → spec doc → `writing-plans` → plan doc → implementation.
- This roadmap is updated at the end of each sub-project: mark the row complete, link the spec/plan, and re-evaluate ordering for what follows.
- Sub-project #1 (WBS spine) is the load-bearing one — most other sub-projects assume its decomposition model exists.

---

## Status legend

- **Not started** — no spec yet
- **In progress** — actively being brainstormed, planned, or implemented
- **Done** — implemented, verified, plan + spec linked above
