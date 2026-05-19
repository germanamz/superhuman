---
type: wbs-note
title: superhuman-wbs pack redesign — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration
---

# superhuman-wbs pack redesign — brainstorm

Captures the design conversation started on `feat/kanban-backed-wbs-pack` (the branch follows the original framing — "kanban-backed pack" — which this brainstorm shows is the wrong axis). Outcome of this note will either feed a new Story inserted before S2, or a `/wbs-reshape` of the existing plan, depending on which axes we choose to act on.

## Trigger

During the S1 session the user requested: extend or replace `superhuman-wbs` so it inherits Tusk's built-in kanban semantics (statuses, columns) — letting the existing superhuman skills get kanban-style tracking without rewriting them. The session deferred this until after S1 merged.

The handoff (`docs/superpowers/2026-05-17-tusk-v1-migration-s1-merged-handoff.md`) framed three open questions: (Q1) inheritance mechanism, (Q2) status renaming, (Q3) scope (one pack vs two).

## What we found by reading the source

### Pack composition (Tusk `internal/typepacks/pack.go`)

`tusk pack add` is a **one-way append**, not a composition primitive. It concatenates the pack's `[node-types]` / `[edge-types]` / `[behaviors]` sections onto the workspace `tusk.toml`. Collision detection runs at qualified section-name granularity (`node-types.X`, `edge-types.X`, `behaviors.<kind>.<instance>`) and rejects unless `--force`.

Consequence: **there is no `extends`, no inheritance, no shared schema base.** Composition only works *across distinct section names* — e.g. `dev.toml` is designed to install alongside `kanban` + `vault` + `tags` because their sections don't collide. A pack **cannot add properties to a node type declared by another pack** (would require redeclaring the `[node-types.X]` block, which collides).

### Kanban-specific behavior (`grep -rn kanban` across Tusk)

**There is no kanban-specific Go code.** Every `kanban` reference is one of:

- The pack TOML itself
- The alias map (`kanban` → GitHub raw URL)
- Tests for pack add / merge
- Docs

The engine treats `behaviors.workflow.kanban` like any other workflow instance — no board renderer, no special-cased columns, no shortcut commands beyond what packs themselves declare. The `kanban` name has no privileged status in the engine.

### Comparing kanban.toml vs current wbs.toml

The current `superhuman-wbs` is already using the **same workflow validator** as kanban — the difference is the state set:

| | kanban | superhuman-wbs |
|---|---|---|
| Node type | `ticket` (priority, due) | `wbs-node` (level, phase, archived) + `wbs-note` (kind, phase, archived) |
| Hierarchy edge | `parent` (on tickets, acyclic, ordered) | `wbs-parent` (on wbs-nodes, acyclic, ordered) |
| Dependency edge | `blocks` / `blocked-by` | *(none)* |
| Notes mechanism | *(none — vault pack handles that)* | `wbs-note` + `wbs-about` + `wbs-supersedes` (append-only history) |
| Workflow states | 3: `pending` → `active` → `completed` | 9: `drafted` → `brainstorming` → `spec-ready` → `planning` → `plan-ready` → `ready-to-decompose` → `in-progress` → `completed` / `archived` |
| Workflow transitions | 4 (forward + 2 reverse) | 20 (forward + per-state reverse + per-state archive) |

## Reframing

"Inherit kanban semantics" was the wrong framing. The mechanism doesn't exist, and even if it did, the engine treats kanban as just another workflow. The **actual goal** is:

> A polished, idiomatic, built-in-quality `superhuman-wbs` pack that improves on the current one. Eventually dogfooded into Tusk's own development workflow (Tusk on Tusk).

So this isn't a kanban port — it's a quality pass on the existing pack, informed by what kanban does well (compactness, dependency edge, plain `priority`/`due` properties) and by Tusk's own dogfood pack `dev.toml` (which composes with kanban/vault/tags and shows the idiomatic shape).

## Decision axes

Each is independent; we can pick from each row separately.

### Axis 1 — Node-type granularity

| Option | Trade |
|---|---|
| **A. Keep single `wbs-node` with `level` enum** *(current)* | Skills can stay level-agnostic; one query type. Properties are union-typed across all levels (e.g. a task-level `phase` makes no sense on a Project). |
| **B. Split per level — `wbs-project`, `wbs-milestone`, …, `wbs-task`, `wbs-spike`** | Properties get level-specific (e.g. `wbs-task.estimate`, `wbs-story.acceptance-criteria`). More idiomatic Tusk (cf. `dev.toml`'s `spec` / `plan` / `handoff` / `package` split). Forces skill rewrites — every node-list query becomes a multi-type union, every template lookup picks a different type. |

**Tentative recommendation:** A. The skill spine is built on `level` as a property; the rewrite cost outweighs the per-level property cleanliness. Could revisit if a future Tusk version supports node-type inheritance.

### Axis 2 — Edge name prefix

| Option | Trade |
|---|---|
| **A. Keep `wbs-` prefix** *(current — `wbs-parent`, `wbs-about`, `wbs-supersedes`)* | Composes cleanly with kanban (`parent` doesn't collide). Names read verbosely. |
| **B. Drop prefix → `parent`, `about`, `supersedes`** | Cleaner names. Mutually exclusive with `kanban` pack (both declare `parent`). Mutually exclusive with `vault` if it later adds an `about` edge. |

**Tentative recommendation:** A. The defensive prefix has near-zero cost and preserves composability with the broader pack ecosystem (which the user explicitly wants — dogfood + future composition). The dogfood scenario in Tusk itself may want both `superhuman-wbs` and `kanban` installed.

### Axis 3 — Workflow state set

| Option | Trade |
|---|---|
| **A. Keep 9 states** *(current)* | Each state encodes a meaningful decomposition gate (Karpathy phase boundary). `/wbs-status`, `wbs-orientation`, `phase-planning-rules`, etc. all key off these states. |
| **B. Collapse to ~5: `drafted` → `designing` → `ready` → `in-progress` → `completed` (+ `archived`)** | Fewer states; consolidates `brainstorming` + `spec-ready` + `planning` + `plan-ready` into `designing`, and `ready-to-decompose` becomes `ready`. Skills need to track phase progress via a separate property since the state no longer encodes it. |
| **C. Collapse to kanban's 3: `pending` → `active` → `completed`** | Maximal simplification. The decomposition-phase information has to move to a `phase` property or similar. Skill rewrite cost is highest here. |

**Tentative recommendation:** A. The state set *is* the spine of the orchestrator skill. Collapsing forces complexity elsewhere (a separate `design-phase` property tracked by the skill manually) without engine support. The 9 states encode real gates.

*Open:* the 9 states aren't all symmetric — e.g. `spec-ready` and `plan-ready` are stories-only states. Worth tightening transitions per `level` if Tusk's workflow engine ever supports level-conditional transitions. (It doesn't today.)

### Axis 4 — Properties to add from kanban

Kanban has `priority` and `due` on `ticket`. WBS pack has neither.

**Resolved (user, 2026-05-17):** **do not add `priority` as a property.** The `wbs-parent` edge is already `ordered = true`, so the order of children under a parent *is* the priority signal — reordering siblings is the priority operation, with no new schema surface. This is more elegant: matches kanban-board reordering UX and means `/wbs-status` naturally renders children in priority order without an explicit sort. `due` is also deferred (speculative; no concrete Milestone use case asking for it yet).

Implementation note: the user-facing operation "raise priority" maps to repositioning the parent edge. Whether Tusk's CLI exposes a clean primitive for that (e.g. `tusk edge reorder` or `tusk edge move`) is an engine question worth confirming, but does not affect this pack's schema.

### Axis 5 — Dependency edge

Kanban has `blocks` / `blocked-by` (many-to-many, acyclic). WBS pack has no such edge. Today, cross-Story dependencies live in prose in plan notes (the "bridge code removed in phase N+1" pattern).

| Option | Trade |
|---|---|
| **A. Add `wbs-blocks` / `wbs-blocked-by` edge** | Lets `/wbs-status` surface "Story S2 is blocked by uncompleted S1" automatically. Lets `phase-continuity-review` walk dependency edges rather than re-parsing plan-note text. |
| **B. Don't add — keep dependencies in plan-note prose** | Less schema surface; current convention works. |

**Tentative recommendation:** A. Adds real capability that current skills could exploit. Low cost (one edge type), composes with the existing tooling.

### Axis 6 — `phase` property typing

`phase` is a free-form string today (`"phase-1"`, `"phase-2"`, etc.). Could be an enum or pattern-validated.

**Tentative recommendation:** leave as string. Each Story decides how many phases it has; enum constrains too early. Could add a validation regex if Tusk supports property regex (not today).

### Axis 7 — Composition with other packs

The pack today is standalone — doesn't require `kanban`, `vault`, or `tags`. The dogfood scenario may want it composable with `tags` (so WBS nodes can be tagged) and possibly `vault` (so WBS work can cross-reference design notes).

**Tentative recommendation:** explicitly document the supported composition matrix at the top of `wbs.toml`. Confirm `superhuman-wbs` + `tags` works cleanly today (no section collisions expected — `tags` adds `[node-types.tag]` and a `tagged` edge). No code change required for that.

## Summary of recommended changes

Stripped down, the redesign comes out to a **small, targeted polish pass** (post-user-review on 2026-05-17):

1. Add `wbs-blocks` / `wbs-blocked-by` edge between `wbs-node`s.
2. Document the supported composition matrix (`superhuman-wbs` + `tags`, + `vault`, + `kanban` if both prefixed-edge sets coexist).
3. **Reject** the larger redesigns (node-type split, edge-prefix drop, state-set collapse) on cost/value grounds.
4. **Reject** a separate `priority` property — `wbs-parent` is already `ordered = true`, so sibling order *is* priority.

Net new schema surface: **one edge type**. Skills don't have to change — `/wbs-status` can opportunistically surface `wbs-blocks` when present, and continues to render children in parent-edge order (which now carries the priority signal).

## Implications for the WBS plan

**Resolved (user, 2026-05-17): land as a new Story S1.5 inserted before S2, going through the full WBS ceremony (brainstorm → spec → plan → decompose).**

- S1.5 scope: the `+wbs-blocks` edge type, composition-matrix documentation in `wbs.toml` header comments.
- S2 (`/wbs-status` read-only port) remains next after S1.5 ships. The new edge is an optional surface S2 can pick up without redesign.
- The existing seven-Story shape is unchanged in *what* the Stories cover — only the sequence grows by one. No `/wbs-reshape` is strictly needed; this is an insertion, not a reshape. (Confirm via the orientation skill's gate when we get there.)
- The branch name `feat/kanban-backed-wbs-pack` is now misleading. Rename to `feat/wbs-pack-polish` (or similar) when the implementation branch is cut.

## Open questions for the user — resolved

All four open questions resolved by the user on 2026-05-17. Outcomes:

1. **Reframing confirmed.** "Kanban-backed" is the wrong axis. Goal: polished standalone `superhuman-wbs` pack.
2. **Recommendations confirmed with one revision.** Keep single `wbs-node`, keep `wbs-` edge prefix, keep 9 states, add `wbs-blocks`. **Drop `priority` as a property** — use the parent-edge ordinality (`ordered = true` on `wbs-parent`) as the priority signal instead.
3. **Story placement: new S1.5 before S2.** Full WBS ceremony.
4. **Dogfood vector: install `superhuman-wbs` in the Tusk repo's workspace.** No upstream into Tusk's `packs/`, no rename. The `superhuman-` prefix and plugin scoping stays.

## Next moves (post-brainstorm)

1. Run the orientation skill's end-of-brainstorm gate (§5.7) to check whether the proposed S1.5 contradicts the parent project's spec / Out of Scope. (Quick read: it doesn't — the spec itself opens the door with rough edge #4 about `wbs-`-prefixed edges and pack drift; adding a `wbs-blocks` edge is in that same spirit.)
2. Create the S1.5 node via `/wbs-new` at level=story, parent=`wbs/superhuman-tusk-v1-migration`. Title: something like "S1.5 — wbs-pack polish (blocks edge + composition doc)".
3. This brainstorm note becomes the design substrate for S1.5's own spec note. (Or the brainstorm can be archived once S1.5's spec is written, per the append-only convention.)
4. Rename the branch from `feat/kanban-backed-wbs-pack` to `feat/wbs-pack-polish` (or similar) when implementation starts.

## References

- Original handoff: `docs/superpowers/2026-05-17-tusk-v1-migration-handoff.md`
- S1-merged handoff: `docs/superpowers/2026-05-17-tusk-v1-migration-s1-merged-handoff.md`
- Migration spec: `wbs/superhuman-tusk-v1-migration/spec.md`
- Current pack: `plugins/superhuman/packs/wbs.toml`
- Tusk kanban pack: `~/projects/tusk/packs/kanban.toml`
- Tusk dogfood pack: `~/projects/tusk/packs/dev.toml`
- Pack composition logic: `~/projects/tusk/internal/typepacks/pack.go`
