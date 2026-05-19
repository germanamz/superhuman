---
description: Create a WBS node at a given level under a parent, with the level-appropriate description template populated.
argument-hint: <free-form context describing the new node> [task=<parent-path>]
---

# /wbs-new

Create a new WBS node under a parent (or as a `level=project` root if no parent context). The command takes free-form text as context; it infers the WBS level, title, and any parent hints from that text. The parent is passed via the keyword form `task=<parent-path>`.

## Tool surface

**MCP-preferred with CLI fallback.** The procedure names Tusk MCP tools (`tusk_query`, `tusk_node_create`, `tusk_edge_add`). When the MCP server is unreachable, shell out to the `tusk` CLI equivalents (`tusk query`, `tusk node create`, `tusk edge add`). Node IDs are workspace-relative paths, not opaque short IDs.

## Input

A single free-form text argument describing what to create. The command extracts:

- **Level** — one of: `milestone`, `initiative`, `story`, `task`, `spike`. Inferred from phrasing ("create a milestone for…", "add a spike to…", "new story:") and validated against the pack's level enum. If no clear cue, ask the user.
- **Title** — pulled from the description. Confirm with the user before creation when ambiguous.
- **Residual context** — anything else (motivation, acceptance hints, references) is preserved and seeded into the orchestrator skill's brainstorming.

## Keyword parameters

- `task=<parent-path>` (optional) — explicit parent node path. Overrides parent inference. Use when the parent is not the most-recently-inspected node.

## Procedure

1. **Parse input.** Extract `task=<parent-path>`. Treat the remainder as free-form context.

2. **Resolve the active project.** A project is a `wbs-node level=project` — query `tusk_query 'type:wbs-node AND level:project'`. If `task=<parent-path>` was passed, derive the project from that node's ancestry. If exactly one project exists, use it. If more than one exists and none is implied, ask the user which to work in. If no project exists, hard error pointing at `/wbs-bootstrap`.

3. **Confirm the pack is present.** `tusk_node_list type=wbs-node` must succeed (the level enum and `wbs-parent` edge come from the `superhuman-wbs` pack). If it errors with an unknown-type response, hard error pointing at `/wbs-bootstrap`.

4. **Infer the level** from the free-form context. If no clear cue, ask the user. Confirm the level is one of the pack's declared values (`project / milestone / initiative / story / task / spike`).

5. **Resolve the parent.** In order of preference:
   - `task=<parent-path>` keyword param.
   - The "current" node — the one most recently inspected, modified, or created in this session (the orchestrator skill maintains this context).
   - For `level=project`, no parent — the node is created as a root.
   - Otherwise, ask the user which parent to use, listing recent candidates via `tusk_query 'type:wbs-node' --sort '-modified' --take 10`.

6. **Validate parent rank.** The parent's level must rank above the new node's level. Surface any mismatch early. (Skipping ranks is allowed but warned — see Errors.)

7. **Infer the title** from the free-form context. If ambiguous (input is descriptive without a clear title phrase), ask the user. Confirm before creation when not obvious.

8. **Load the description template.** Read `plugins/superhuman/templates/wbs/desc-<level>.md` from the plugin. Replace `<*-title>` placeholders with the resolved title. Hand the residual free-form context to the orchestrator as the brainstorming seed.

9. **Create the node (composite).** Two steps, in order:
   - `tusk_node_create --type wbs-node --path wbs/<project>/<slug>.md --prop level=<inferred-level>` with the populated template content as the body, and `--title <resolved-title>`.
   - Unless the new node is a `level=project` root: `tusk_edge_add --type wbs-parent --source <new-node-path> --target <parent-path>`. Under Tusk v1.3.0 this writes `wbs-parent: <parent-path>` into the new node's frontmatter and reindexes it.

10. **Hand off to the orchestrator skill.** Invoke `wbs-orientation` so it can begin walking the user through brainstorming the new node's content (seeded with the residual free-form context) and driving the Karpathy decomposition gate.

## Errors

- **Tusk unavailable (both MCP and CLI)** — hard error with remediation pointer (`/wbs-bootstrap`). Do not fall back to file-based design.
- **`superhuman-wbs` pack not installed** — hard error pointing at `/wbs-bootstrap`.
- **No project node exists** — hard error: run `/wbs-bootstrap` then `/wbs-new create a project for <…>`.
- **Level cannot be inferred and the user can't disambiguate** — hard error.
- **Invalid level / rank-parent mismatch** — surface Tusk's validation error verbatim.
- **Skipping ranks (e.g., a story directly under a project)** — allow but flag with a warning. Tusk permits any-ancestor-to-any-descendant parenting via the `wbs-parent` edge.

## Examples

```
/wbs-new create a milestone for the authentication overhaul
/wbs-new add an initiative to replace session cookies with JWTs
/wbs-new new story: implement /api/auth/refresh endpoint
/wbs-new task: add JWTRefreshHandler to the auth router task=wbs/auth-overhaul/refresh-endpoint
/wbs-new spike to compare HS256 vs RS256 for our deployment scale
/wbs-new milestone for the Q3 platform overhaul task=wbs/infra
```
