# Handoff — Superhuman Tusk v1 migration, after S1 merge

**Date:** 2026-05-17
**Author:** German Meza (`iam@germanamz.com`)
**For:** the session picking up after S1 (`/wbs-bootstrap` + pack-presence orientation) is on `main`.

This is an addendum to `docs/superpowers/2026-05-17-tusk-v1-migration-handoff.md`. Read that one first — it's the design substrate. This doc only records what changed since S1 landed and points at the next branch.

## What's merged since the original handoff

| PR | Title | Component | Squash SHA |
|---|---|---|---|
| #23 | feat(superhuman): bootstrap Tusk v1 workspace for migration WBS | superhuman | `f64fca9` |
| #24 | feat(superhuman): add /wbs-bootstrap and orient skill to pack-presence | superhuman | `3a4b955` |

release-please will roll both into a single `superhuman` minor bump (0.3.0 → 0.4.0) on its next pass.

## Updates to the original handoff

Two observations in the original handoff are now stale:

1. **No `[undeclared-property] status` warning on Tusk v1.2.0.** The handoff predicted `tusk doctor` would surface `[undeclared-property] … status` from the workflow validator. It does not on v1.2.0. `/wbs-bootstrap` still treats it as known-tolerable in its step-5 commentary so the doc composes if it returns on older Tusk versions.
2. **`/wbs-bootstrap` exists.** `wbs-orientation/SKILL.md` step 1 now probes `tusk_node_list type=wbs-node` and points users at `/wbs-bootstrap` when the pack is missing. The other bullets in that step still reference Tusk v0 concepts (`tusk_project_list`, per-project taxonomy); they're explicitly marked for rewrite in Story S3 (`orientation-skill-rewrite`).

Rough edge #5 from the original handoff (permanent `[undeclared-property] status` warning) is now obsolete on current Tusk. The other four still apply.

## New scope inserted before S2 — the kanban-backed pack

During the S1 session the user requested a follow-up: extend or replace the `superhuman-wbs` pack so it inherits Tusk's built-in kanban semantics (statuses, columns) — letting the existing superhuman skills get kanban-style tracking without rewriting them. The session deferred this to land after S1 was on `main`.

**This is the work for the next branch.** It is inserted before S2 (`/wbs-status` read-only port) because S2's render surface depends on whatever status model the pack settles on. If the redesign changes states or transitions, S2 needs to know before its PR is drafted.

The redesign hasn't been spec'd yet. The session left these as open questions:

1. **Inheritance mechanism.** Does Tusk's pack TOML support composition / `extends`, or does the `superhuman-wbs` pack need to duplicate kanban's state/transition definitions verbatim? Read Tusk's kanban pack source (search the `tusk` install for `kanban.toml`) and inspect `tusk pack add` semantics to find out.
2. **Status renaming.** The current `wbs-workflow` uses states `drafted / brainstorming / spec-ready / planning / plan-ready / ready-to-decompose / in-progress / completed / archived`. Kanban's defaults are `todo / in-progress / done` (or similar). Either map cleanly between the two, or commit to one vocabulary and migrate every existing node in `wbs/superhuman-tusk-v1-migration/**`.
3. **Scope.** Is this a redesign of `superhuman-wbs` (one pack, kanban-shaped) or a layering pattern (two packs, kanban for tracking + superhuman-wbs for decomposition)? The user's preference in the S1 session was the former — one pack with kanban semantics — but that was before we read kanban's source.

## Where to start on this branch

You are on `feat/kanban-backed-wbs-pack`, branched off `main` at `3a4b955`. This handoff is the only uncommitted file on it. Suggested first moves:

1. Locate Tusk's kanban pack source. `tusk pack list` doesn't print sources; the built-in is likely shipped inside the binary or in `<tusk-install>/packs/kanban.toml`. Check `~/.local/share/tusk/` and the Tusk repo (`github.com/germanamz/tusk`).
2. Read it end-to-end. Note state names, transitions, the workflow's `applies-to` target, and any property declarations.
3. Compare against `plugins/superhuman/packs/wbs.toml`'s `[behaviors.workflow.wbs-workflow]`. Decide which redesign option fits (full alignment, partial mapping, dual-pack layering).
4. Brainstorm in a Tusk note on the migration project (`task=superhuman-tusk-v1-migration`, `meta.type=brainstorm`) — that's the convention this migration follows. Resist the temptation to put the design in `docs/superpowers/specs/`; the migration project is the single source.
5. If the chosen direction changes the shape of the existing Stories (S2 in particular), invoke `/wbs-reshape "kanban-backed pack inserted before S2" task=superhuman-tusk-v1-migration` so the structural change goes through the formal reshape flow rather than ad-hoc edits.
6. Once the redesign ships, return to S2 (`/wbs-status` read-only port) — still next per the original plan.

## Workspace state

`tusk status` from repo root, immediately after the #24 merge and `tusk reindex`:

```
TYPE      COUNT
wbs-node  8        ← 1 project + 7 stories
wbs-note  2        ← spec + plan
edges     9        ← 7 wbs-parent + 2 wbs-about
```

Hierarchy unchanged from the original handoff. None of S1–S7's status transitioned during the S1 PRs — those tracked the design, not implementation state. **Bump S1's status to `completed` before starting the kanban-backed pack work,** so `/wbs-status` accurately reflects what's shipped.

## Open questions still applicable from the original handoff

1. **Notes type modeling** (separate `wbs-note` vs alternative) — unchanged.
2. **Hierarchical paths** (`wbs/<project>/<child>.md`) — unchanged; revisit if the kanban-backed redesign churns paths.
3. **Embeddings dependency** — still not configured. `/wbs-bootstrap` surfaces the hint. Not a blocker until S6.

## Definition of "this migration is done"

Unchanged from the original handoff:

1. `grep -rE 'tusk_(project|task|note)_[a-z]+' plugins/superhuman/` returns zero matches.
2. `tusk doctor` clean in a workspace bootstrapped from this plugin.
3. The user flow `/wbs-bootstrap` → `/wbs-new` → brainstorm → decompose → `/wbs-status` works end-to-end without surfacing any removed MCP tool.

The kanban-backed redesign does not alter the definition — it only changes the underlying state model the WBS skills compose against.
