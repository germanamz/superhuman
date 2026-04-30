---
description: Create a Tusk task at a WBS level under the current parent, with the level-appropriate description template populated.
argument-hint: <level> [title] [project=<name>]
---

# /wbs-new

Create a new WBS node — a Tusk task — at the given level under the current parent (or as a root in the active Tusk Project if no parent context).

## Arguments

- `<level>` (required) — one of: `milestone`, `initiative`, `story`, `task`, `spike`. Must match the active project's taxonomy.
- `[title]` (optional) — the task title. If omitted, prompt the user for it before creating.
- `[project=<name>]` (optional) — explicit Tusk project to file the node under. Overrides context resolution. Use when working across projects or when the active project is ambiguous.

## Procedure

1. **Resolve the target Tusk Project.** If `project=<name>` was passed, use that — confirm it exists via `tusk_project_get`, hard error if not. Otherwise, fall back to context: call `tusk_project_list` / `tusk_project_get` to determine the active project, and if multiple projects exist and none is implied by context, ask the user which one.

2. **Validate the level against the project's taxonomy.** Call `tusk_project_settings_get` (or equivalent) to fetch the taxonomy. Confirm `<level>` appears in the rank list. If the project has no WBS taxonomy, surface a hard error pointing at `templates/wbs/taxonomy.md`.

3. **Resolve the parent.** In order of preference:
   - An explicit `parent=<short-id>` flag in the user's message.
   - The "current" Tusk task — the one most recently inspected, modified, or created in this session (the orchestrator skill maintains this context).
   - For root-rank levels (the top of the taxonomy), no parent — the task is created as a root in the project.
   - Otherwise, ask the user which parent task to use, listing recent candidate parents from `tusk_task_list`.

4. **Validate parent rank.** Tusk validates on create, but surface the error early: parent rank index must be strictly lower than the new task's rank.

5. **Load the description template.** Read `plugins/superhuman/templates/wbs/desc-<level>.md` from the plugin. Replace `<*-title>` placeholders with the resolved title.

6. **Create the Tusk task.** Call `tusk_task_create` with:
   - `title=<resolved-title>`
   - `level=<level>`
   - `parent=<parent-short-id>` (omit if root)
   - `description=<populated-template-content>`
   - `project=<project-name>`

7. **Hand off to the orchestrator skill.** Invoke `wbs-orientation` (the orchestrator skill) so it can begin walking the user through brainstorming the new node's content and driving the Karpathy decomposition gate.

## Errors

- **Tusk MCP unavailable** — hard error with remediation pointer. Do not fall back to file-based design.
- **Specified `project=<name>` does not exist** — hard error. List available projects from `tusk_project_list` so the user can correct the typo.
- **No taxonomy on the project** — hard error pointing at `templates/wbs/taxonomy.md`.
- **Invalid level / rank parent mismatch** — surface Tusk's validation error verbatim.
- **Skipping ranks (e.g., `/wbs-new story` directly under a Project)** — allow but flag with a warning. Tusk permits any-ancestor-to-any-descendant parenting.

## Examples

```
/wbs-new milestone "Authentication overhaul"
/wbs-new initiative "Replace session cookies with JWTs"
/wbs-new story "Implement /api/auth/refresh endpoint"
/wbs-new task "Add JWTRefreshHandler to auth router"
/wbs-new spike "Compare HS256 vs RS256 for our deployment scale"
/wbs-new milestone "Q3 platform overhaul" project=infra
```
