# Gilbreth WBS — Roadmap

A tracker for the multi-sub-project initiative to build out the **Gilbreth WBS**: a coherent set of skills, agents, and commands that improve how user + agent collaborate on software work, organised around an inverted-flame Work Breakdown Structure.

**Initiative goal.** Take the existing scaffolding (the empty `gilbreth` plugin and the three loose phase skills in `~/.claude/skills/`) and grow it into an opinionated end-to-end workflow that walks a user from a fuzzy idea down to atomic, agent-executable tasks — with note-taking, conventions, and Tusk integration along the way.

This document is not a spec. Each sub-project below earns its own design spec and implementation plan — captured as WBS notes in Tusk — when it becomes the focus.

---

## Sub-projects

Numbered for reference, not strict execution order. Order is reviewed each time a sub-project completes.

| # | Sub-project | Status | Spec | Plan |
|---|---|---|---|---|
| 1 | **WBS spine** — the inverted-flame decomposition model, the skill set that walks a user from wide scope to narrow scope, and the data shape of a "node" at each level | Done | — | — |
| 2 | **Phase skills relocation + polish** — move the three phase skills (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) from `~/.claude/skills/` into the `gilbreth` plugin, reshape for WBS context | Done | — | — |
| 3 | **Tusk integration** — commands, agents, and conventions for syncing WBS nodes to [Tusk](https://github.com/germanamz/tusk) for task management | Not started | — | — |
| 4 | **Implementation pipelines** — agent-orchestrated and human-orchestrated execution patterns per task, building on the existing phase implementer model | Not started | — | — |
| 5 | **Windowed note-taking** — capture learnings into Tusk so future agents can pull narrow, relevant context without flooding the window | Not started | — | — |
| 6 | **Code quality conventions** — a skill (or guide) that codifies the user's standards for code quality | Not started | — | — |
| 7 | **Software architecture conventions** — a skill (or guide) that codifies the user's standards for architecture | Not started | — | — |
| 8 | **WBS reshape** — `/wbs-reshape` command + `wbs-reshape` skill that lets WBS authors change direction mid-flight via context-aware re-brainstorm; auto-invokes from `wbs-orientation` on contradiction gates | Done | — | — |

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
