---
description: Render the WBS subtree from a node with status rollup, blocks/blocked-by markers, and orchestrator-surfaced warnings.
argument-hint: [free-form hint] [task=<path-id>]
---

# /wbs-status

Render the WBS subtree from the given node (or from the project root if no node is specified). Each line shows the node's level, title, status, %done rollup, and phase tag. Warnings surface inline per node: empty Karpathy fields at design levels, `wbs-blocks` relationships, `tusk doctor` workflow drift, orphan nodes, and phase-tag mismatches.

Read-only: this command never mutates state. Free to re-run at any time.

## Input

Optional free-form text. The model interprets hints in natural language ("only show in-progress", "depth 2", "phase-1 children only") and **confirms the inferred filter back to the user before rendering** — so a misread hint can be corrected without re-issuing the command. Unrecognized hints emit a soft warning so the user knows they were ignored.

## Keyword parameters

- `task=<path-id>` (optional) — Tusk node path (e.g., `wbs/superhuman-tusk-v1-migration/wbs-pack-polish`). Defaults to the current node context maintained by `wbs-orientation`, or the project root if no context exists.

`project=<id>` is **no longer supported** — under Tusk v1 a project is a `wbs-node` like any other, addressable by path through `task=<path-id>`.

## Tool surface

**MCP-preferred with CLI fallback.** The procedure below names MCP tools (`tusk_query`, `tusk_node_get`, `tusk_edge_list`, `tusk_doctor`). When the MCP server is reachable, use them — they return structured JSON and avoid shell escaping. When the MCP tools are unavailable, fall back to the CLI equivalents (`tusk query`, `tusk node get`, `tusk edge list`, `tusk doctor`) and parse their tab-aligned output. Either path produces the same render.

## Procedure

### 1. Parse input

Extract `task=<path-id>`. Treat the remainder as a free-form hint.

If the input is empty or whitespace-only, skip the hint-interpretation step (step 3).

### 2. Resolve the target node

In order of preference:

1. `task=<path-id>` keyword parameter, verbatim.
2. The current node context maintained by the `wbs-orientation` skill (the node most recently inspected, created, or referenced this session).
3. The project root — discovered via `tusk_query 'type:wbs-node AND level:project' --take 1`. If multiple projects exist and none is implied by context, ask the user which to render.

Confirm with `tusk_node_get <id>` and surface any error (missing node, wrong type) verbatim.

### 3. Interpret the free-form hint

If a hint is present, parse it via model interpretation into one or more of the recognized filters:

- **Status filter** — e.g. "only in-progress", "ready or planning", "everything except archived".
- **Depth limit** — e.g. "depth 2", "two levels deep", "just the immediate children".
- **Phase filter** — e.g. "phase-1 children", "phase 2 only".

Surface the inferred filter back to the user in plain language ("Showing only `in-progress` nodes, depth 2.") and ask for confirmation or correction before rendering. If any portion of the hint can't be mapped to a recognized filter, name what was ignored.

### 4. Fetch the subtree

Tusk's `tree:wbs=<id>` qualified shortcut walks **outbound** from `<id>` via `wbs-parent` — which means ancestors of `<id>`, not descendants. Since `wbs-parent` is directed child→parent, that's the wrong direction for a subtree render. Use the inverse pattern instead.

**Direct children** of a node — `parent:wbs=<id>` (or `tusk_edge_list --to=<id> --type=wbs-parent`):

```
tusk_query 'parent:wbs=<root-id>' --sort '+order'
```

Returns the immediate children of `<root-id>`. The `--sort '+order'` clause renders siblings by their `order` property (the priority signal — see `pack-redesign-brainstorm.md`).

**Full subtree** — recurse: start with the root, fetch its direct children via the above, then for each child fetch its children, etc. Bound the recursion by the depth filter inferred in step 3 (default unbounded; in practice the WBS taxonomy caps at 6 levels: project / milestone / initiative / story / task / spike). Track visited IDs to short-circuit any accidental cycles (the workflow's `acyclic = true` should prevent them but the render is defensive).

When MCP is unavailable, equivalent CLI: `tusk query 'parent:wbs=<id>' --sort '+order'` per level.

### 5. Compute %done rollup

For each non-leaf node, count its descendants by status. `%done` = (count where `status=completed`) / (total descendants). Compute in-skill; Tusk does not roll up itself.

Leaves report their own status; rollup applies only to design levels (project / milestone / initiative / story).

### 6. Detect inline warnings

Per node, surface these markers in the render:

| Warning | Detection | Marker |
|---|---|---|
| Empty Karpathy fields (design levels) | Body lacks non-empty `## Success Criteria`, `## Assumptions Made`, `## Open Questions`, `## Tradeoffs Considered`, or `## Out of Scope` | `⚠ karpathy:<field>` (one per missing field) |
| Phase-tag / phase-plan-note mismatch | Node tagged `+phase-N` whose parent has no `wbs-note` with `kind=phase-plan, phase=phase-N` (or vice versa: phase-plan note without any tagged children) | `⚠ phase-mismatch` |
| Reparented stale `phase` | Node's `wbs-parent` source differs from where the `phase` property was originally written (heuristic; surface as informational) | `⚠ phase-stale` |
| `wbs-blocks` relationships | Outgoing `wbs-blocks` and incoming `wbs-blocked-by` edges | `BLOCKS: <ids>` / `BLOCKED-BY: <ids>` lines under the node |
| Workflow drift | Node appears in `tusk_doctor`'s `workflow-violation` list | `⚠ workflow-drift: <observed-status>` |
| Orphan wbs-node | Non-project node with no outgoing `wbs-parent` edge | `⚠ orphan` (with hint: "missing `wbs-parent: <target>` in frontmatter") |

`tusk_doctor` and `tusk_edge_list --type=wbs-blocks` can each be called once at the start of the render; both produce maps the renderer joins per node.

### 7. Render the tree

One node per line, indented by depth from the root:

```
[story]    wbs/superhuman-tusk-v1-migration/wbs-pack-polish  S1.5 — wbs-pack polish    [completed]   100% done
[story]    wbs/superhuman-tusk-v1-migration/wbs-status-readonly-port  S2 — wbs-status read-only port  [in-progress]  40% done  ⚠ karpathy:Success Criteria  BLOCKED-BY: wbs/superhuman-tusk-v1-migration/wbs-pack-polish
```

Columns: level in brackets, path id, title, status in brackets, %done (when applicable), inline warning markers, then `BLOCKS:` / `BLOCKED-BY:` lines on continuation rows.

### 8. Print the legend

After the tree, print a legend showing the warning symbols and their meanings, plus the `BLOCKS:` / `BLOCKED-BY:` conventions. Skip warnings that didn't fire in this render to keep the legend compact.

## Errors

- **Tusk unavailable (both MCP and CLI)** — hard error with remediation: install Tusk, ensure the binary is on `PATH` or the MCP server is configured.
- **Node specified by `task=<path-id>` not found** — surface the underlying error verbatim and suggest `/wbs-status` with no argument to render from the project root.
- **No project node exists in the workspace** — hard error: "No `wbs-node level=project` found. Run `/wbs-bootstrap` and `/wbs-new create a project for <…>` first."
- **Hint interpretation ambiguous** — re-prompt the user with the inferred filter and ask for explicit confirmation rather than guessing.

## Examples

```
/wbs-status
# Renders the active project from the root.

/wbs-status task=wbs/superhuman-tusk-v1-migration
# Renders the migration project's subtree.

/wbs-status task=wbs/superhuman-tusk-v1-migration depth 2
# Free-form depth hint; the renderer infers --depth=2 and confirms before rendering.

/wbs-status only show in-progress
# Status filter; inferred from the hint and confirmed before rendering.

/wbs-status task=wbs/superhuman-tusk-v1-migration/wbs-status-readonly-port phase-1 children only
# Combined task scope + phase filter.
```

## Why this command is read-only

`/wbs-status` is the diagnostic surface for the WBS spine. It is intentionally read-only so it's always safe to re-run (no race conditions with edits, no risk of partial mutation), and so its output is honest about workspace state — including warnings about stale or orphaned data the user might want to fix via separate commands (`/wbs-new`, `/wbs-reshape`, direct frontmatter edits). Mutation belongs to the create-side commands.
