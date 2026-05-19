---
type: wbs-note
title: S2 — /wbs-status read-only port — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/wbs-status-readonly-port
---

# S2 — /wbs-status read-only port — brainstorm

Captures the design conversation for porting `/wbs-status` from Tusk v0's MCP surface (`tusk_task_tree`, `tusk_task_summary`, `tusk_project_list`) to v1's surface (`tusk_node_list`, `tusk_edge_list`, `tusk_query`).

S2 is read-only by intent: it has the lowest blast radius among the migration's seven Stories and validates the v1 schema against a real workload before any of the create-side Stories (S3, S4) ship.

## Edge persistence model (Tusk v1.3.0)

Tusk v1.3.0 (2026-05-19) shipped frontmatter-backed edges ([#409](https://github.com/germanamz/tusk/pull/409)): `tusk edge add` and `tusk edge remove` (CLI and MCP) now write the edge into the source node's frontmatter, then reindex the source file. Edges are durable in git-tracked markdown; the DB is a regenerable derivation. The prior "edges-DB-only" framing is retired.

Two corollaries for S2:

- **Pack must be updated for v1.3.0 compatibility.** `ordered = true` on `wbs-parent` now requires a sortable `order` property on `wbs-node`; without it, every `tusk edge add` fails with a manifest validation error. The pack also benefits from declaring `hierarchy = "wbs"` on `wbs-parent` so the qualified `tree:wbs=<id>` shortcut works in S2's recursive walk (from [#407](https://github.com/germanamz/tusk/pull/407), the fix for [#405](https://github.com/germanamz/tusk/issues/405)). This pack update is tracked separately from S2; see `edge-materialization-brainstorm.md`.
- **The orphan-wbs-nodes warning's framing changes for the third time** (this is the final form): an orphan now means *the source node's frontmatter has no parent declared*. The fix is `tusk edge add --type wbs-parent --source <id> --target <parent>` — which, in v1.3.0, writes to frontmatter and is durable. No more "this is a pack-design gap" caveat; no more "/wbs-bootstrap will rematerialize."

S1.5's priority-via-ordinality decision is preserved by v1.3.0's `--ordinal` flag and unchanged behavior of `ordered = true` on standalone edges. No reversal needed.

## Inheritance from the migration spec

The migration spec (`wbs/superhuman-tusk-v1-migration/spec.md`) already pins the MCP mapping table for the read-side tools. Reproduced here for convenience, expanded with the S2-specific call sites in the existing `/wbs-status` command (`plugins/superhuman/commands/wbs-status.md`):

| v0 call (current `/wbs-status` step) | v1 surface |
|---|---|
| Step 2: `tusk_project_list` (resolve `project=<id>`) | `tusk_node_list 'type:wbs-node AND level:project'` — a *project* is now a wbs-node like any other |
| Step 2: orchestrator's current-task context resolution | Unchanged in shape; the ID is now a workspace-relative path, not a short ID |
| Step 4: `tusk_task_tree <root>` | `tusk_edge_list --to=<root> --type=wbs-parent`, recurse — or `tusk_query 'wbs-parent->*=<root>'` |
| Step 4: `tusk_task_summary <id>` (%done rollup) | `tusk_node_get` + traverse `wbs-parent` edges + count children by status in the skill |
| Step 4: `tusk task tree --rollup` (shell) | No direct replacement; depth-N traversal is a feature request in the migration spec (#4) |

## What changes for S2 beyond the spec table

Three issues surfaced while reading the v1 surface that the migration spec didn't address.

### 1. The `tree=` traversal shortcut requires the edge to be literally named `parent`

Probed via `tusk query 'tree=wbs/superhuman-tusk-v1-migration'`:

> `filter validate: traversal shortcut requires the workspace to declare a 'parent' edge type — add [edge-types.parent] to tusk.toml or use explicit '<edge>->' form`

So `tree=`, `parent=`, `root=` are unavailable to us — our pack uses `wbs-parent` (the prefix decision from S1.5). The fallback is the explicit form (`wbs-parent->`). Verified:

```
$ tusk query 'wbs-parent->*=wbs/superhuman-tusk-v1-migration'
wbs/superhuman-tusk-v1-migration/wbs-pack-polish  wbs-node  S1.5 — wbs-pack polish
```

This works for single-hop. For multi-hop / full-subtree traversal, the query language's edge-traversal expressiveness needs verification — see open question Q1 below.

**Upstream issue filed:** [germanamz/tusk#405](https://github.com/germanamz/tusk/issues/405) — parameterize the shortcut or add a `tusk.toml` default-hierarchy-edge knob. S2 ships against current behavior (explicit `wbs-parent->` form); if #405 lands later, S2 can switch to the shortcut as a small follow-up.

### 2. The migration spec's feature request #4 (depth-N descendants) is still open

> "The binary already mentions `descendants_%d`; expose it via `tusk_query --descendants-of=<id> --depth=N` so `/wbs-status` is one call instead of a recursive walk."

If this feature lands in Tusk before S2 implementation, S2 should use it. If not, S2 implements the recursive walk in the skill — one `tusk edge list --to=<id> --type=wbs-parent` per level. The walk is bounded (WBS trees are at most 6 levels deep: project / milestone / initiative / story / task / spike) so latency is bearable, just verbose. **Tentative recommendation:** implement recursive walk; not block on the feature request.

### 3. New surfacing opportunities post-S1.5

Two new things are renderable that the v0 `/wbs-status` couldn't express:

- **`wbs-blocks` edges.** S1.5 added the edge type. `/wbs-status` could render a `BLOCKS` / `BLOCKED-BY` marker per node, listing the blocking/blocked nodes. The S1.5→S2 edge (which I added during S1.5 smoke-test) would render as: "S2 ← blocked by S1.5" — useful signal for "what can I work on now."
- **Workflow violations from `tusk doctor`.** The migration project, S1, and S1.5 currently show `[workflow-violation]` warnings (the `drafted → completed` direct jump isn't a declared transition; same for `plan-ready` historically). `/wbs-status` could surface these inline per-node as `⚠ workflow-drift`, alongside the existing Karpathy-empty warning.

**Tentative recommendation:** add both. Both are read-only surfaces of state Tusk already tracks. Cost: a `tusk edge list --type wbs-blocks` and a `tusk doctor` parse per render. Render legend grows by 2 symbols.

## Decisions — resolved

User decisions on 2026-05-17:

### Q1 — Tool surface: MCP-preferred with CLI fallback

S2 ships against the MCP surface (`tusk_query` / `tusk_node_get` / `tusk_edge_list`) as the primary code path. When MCP isn't available, fall back to the CLI shim. The brainstorm note's original recommendation (CLI-only) was wrong — MCP is the long-term target and the migration spec assumes it; designing the skill against MCP from day one avoids a rewrite at S3.

The fallback path keeps S2 usable in workspaces without MCP configured (this very session, for example), so it's not academic.

### Q2 — Free-form hint parsing: keep, model-interpreted

The free-form hint syntax stays. The skill is responsible for interpreting common phrasings ("only show in-progress", "depth 2", "phase-1 children") via the model, then **confirming the inferred filter back to the user** before rendering — so the user can correct a misread without re-issuing the command. Unrecognized hints emit a soft warning.

This is more capability than the v0 implementation had: v0 expected the skill to parse hints; v1 lets the model do the parsing and gives the user a confirmation step.

### Q3 — Path-based IDs everywhere

Confirmed. The `/wbs-status` command docs need an editing pass: replace `task=<short-id>` examples with `task=<path>` (e.g. `task=wbs/superhuman-tusk-v1-migration/wbs-pack-polish`).

### Q4 — Warnings surface: 6 kinds confirmed

Six warning kinds in scope for S2:

| # | Kind | Source |
|---|---|---|
| 1 | Empty Karpathy fields at design levels | Carried from v0 |
| 2 | Phase-tag / phase-plan-note mismatch | Carried from v0 |
| 3 | Reparented node with stale `meta.phase` | Carried from v0 |
| 4 | `wbs-blocks` edges rendered per node (with `BLOCKS:` / `BLOCKED-BY:` markers) | New post-S1.5 |
| 5 | `tusk doctor` workflow violations surfaced inline | New |
| 6 | Orphan wbs-nodes (no `wbs-parent` edge; exclude the project root) | New — would have caught the missing-edge issue we're cleaning up pre-S2 |

## S2 scope — finalized

1. **Rewrite `plugins/superhuman/commands/wbs-status.md`** to drop v0 MCP tool names and reference v1's `tusk_query` / `tusk_node_get` / `tusk_edge_list` (MCP-primary surface, per Q1). Document the CLI-fallback at the bottom.
2. **Keep procedure inline in the command file** (matching wbs-bootstrap convention; Q3 reversed). The command file owns:
   - The recursive `wbs-parent` walk. **Update:** v1.3.0 (#407) added per-edge hierarchy alias, and the pack now declares `hierarchy = "wbs"`, so the qualified shortcut `tree:wbs=<id>` works — preferred over the explicit `wbs-parent->` form.
   - The %done rollup computation from descendants' statuses.
   - The free-form hint interpretation with user-facing confirmation (per Q2).
   - The render pipeline.
3. **Render `wbs-blocks` edges** as `BLOCKS:` / `BLOCKED-BY:` markers per node.
4. **Surface `tusk doctor` workflow violations** inline as per-node `⚠ workflow-drift` warnings.
5. **Surface orphan wbs-nodes** (no `wbs-parent` edge, excluding the project root) as `⚠ orphan` markers. Per the post-tusk#406 framing above, the warning text should hint at the pack-design reality: "orphan — wbs-parent is a standalone edge so it must be added via `tusk edge add --type wbs-parent --source <id> --target <parent>`; this is a known pack-design gap, tracked separately."
6. **Free-form hint parsing — kept** (per Q2). Skill interprets the hint via the model and confirms the inferred filter back before rendering.
7. **Update `task=<path>` examples** in the command docs.
8. **MCP-preferred with CLI fallback** (per Q1). Skill probes for MCP tool availability; uses MCP when present, shells to `tusk` CLI when not.

## Phasing

No phases needed. S2 is a single coherent change: one command rewrite + one new skill + render additions. Estimated <500 LOC.

## Implications for the plan

S2 stays sequenced before S3 (orientation skill rewrite), per the migration plan. The "drop free-form parser" decision (Q2 → C) needs to land before S3 since the orientation skill currently dispatches to `/wbs-status` and would otherwise pass through user-provided hints.

This brainstorm doesn't change the seven-Story shape. No reshape needed.

## Open questions — resolved

All five resolved by the user on 2026-05-17:

1. **Q1 — Tool surface:** MCP-preferred with CLI fallback.
2. **Q2 — Free-form hint parsing:** kept, model-interpreted with confirmation.
3. **Q3 — Implementation shape:** ~~new dedicated `wbs-status` skill~~ **reversed during S2 implementation kickoff:** procedure stays inline in `plugins/superhuman/commands/wbs-status.md`, matching the `wbs-bootstrap` convention. The original Q3 framing was based on the wrong premise that the command file was a thin spec; it's actually the full procedure. `wbs-orientation` already auto-invokes on `/wbs-status` runs to provide WBS context, so the auto-invocation slot is filled — a separate `wbs-status` skill would duplicate. One source of truth.
4. **Q4 — Warning scope:** all six warning kinds (3 carried + 3 new) confirmed.
5. **Q5 — Pre-S2 cleanup:** repopulate the missing wbs-parent edges now via a small one-off, so S2 development has a meaningful subtree to render against.

## References

- Migration spec: `wbs/superhuman-tusk-v1-migration/spec.md`
- Migration plan: `wbs/superhuman-tusk-v1-migration/plan.md`
- S1.5 brainstorm: `wbs/superhuman-tusk-v1-migration/pack-redesign-brainstorm.md`
- Current command spec: `plugins/superhuman/commands/wbs-status.md`
- Tusk query reference: `tusk query --help` (the workspace binary at `~/.local/bin/tusk`)
