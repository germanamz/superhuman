---
description: Render the WBS subtree from a node with status rollup, phase tags, and orchestrator-surfaced warnings.
argument-hint: [free-form context / filters] [task=<id>] [project=<id>]
---

# /wbs-status

Render the WBS subtree from the given node (or from the project root if none) with status rollup, phase tags, and any warnings from the orchestrator skill.

## Input

Optional free-form text — usually empty, but useful for specifying filters or render hints in natural language ("only show in-progress", "depth 2", "only phase-1 children"). The skill best-effort interprets these hints; unrecognized text is ignored with a soft warning.

## Keyword parameters

- `task=<id>` (optional) — Tusk task short ID. Defaults to the current task context, or to the project root if no context exists.
- `project=<id>` (optional) — Tusk project, by id or name. Overrides context resolution. Use when inspecting a project other than the active one.

## Procedure

1. **Parse input.** Extract `task=<id>` and `project=<id>` keyword params. Treat the remainder as free-form filter / render hints.

2. **Resolve the target project and node.** If `project=<id>` was passed, look it up via `tusk_project_list` (matching id or name). Hard error if it isn't returned. Otherwise fall back to context resolution. Then resolve the node from `task=<id>`, or the orchestrator's current-task context, or the project root.

3. **Apply free-form hints.** Best-effort parse for known filters (depth limit, status filter, phase-tag filter). Surface unrecognized hints as a soft warning so the user knows they were ignored.

4. **Fetch the subtree.** Call Tusk MCP — `tusk_task_tree` for the structure and `tusk_task_summary` (or `tusk task tree --rollup` via shell) for `%done` rollup from descendants.

5. **Render the tree** with one task per line, indented by depth:
   - Level (e.g., `[milestone]`, `[story]`, `[task]`).
   - Title.
   - Status (from the workflow).
   - `%done` from descendants (when applicable).
   - Phase tags if any (`+phase-1`, `+phase-2`, …).

6. **Surface warnings:**
   - Tasks with empty Karpathy fields (Success Criteria, Assumptions, Open Questions, Tradeoffs Considered, Out of Scope) at design levels.
   - Phase-tag / phase-plan-note mismatches: a child tagged `+phase-N` whose parent has no `meta.type=phase-plan, meta.phase=phase-N` note (or a phase-plan note with no tagged children).
   - Reparented nodes whose phase-plan note metadata may need refreshing (heuristic: parent changed and `meta.phase` exists).

7. **Print the legend** at the bottom showing the symbols used for warnings.

## Errors

- **Tusk MCP unavailable** — hard error with remediation pointer.
- **Specified `project=<id>` does not exist** — hard error. List available projects from `tusk_project_list`.
- **Task ID not found** — surface Tusk's error verbatim and suggest `/wbs-status` with no argument to view the project root.

## Examples

```
/wbs-status                                            # the active project, from root
/wbs-status task=a3f8b2c1                              # subtree rooted at task a3f8b2c1
/wbs-status task=a3f8b2c1 depth 2                      # limit subtree depth via free-form hint
/wbs-status project=infra                              # root tree of the infra project
/wbs-status task=STORY-7 only show in-progress phase-1 children
```
