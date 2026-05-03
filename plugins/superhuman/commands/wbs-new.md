---
description: Create a Tusk task at a WBS level under the current parent, with the level-appropriate description template populated.
argument-hint: <free-form context describing the new node> [task=<parent-id>] [project=<id>]
---

# /wbs-new

Create a new WBS node — a Tusk task — under the current parent (or as a root in the active Tusk Project if no parent context). The command takes free-form text as context; it infers the WBS level, title, and any parent hints from that text. IDs are passed only via the keyword form `task=<id>` and `project=<id>`.

## Input

A single free-form text argument describing what to create. The skill extracts:

- **Level** — one of: `milestone`, `initiative`, `story`, `task`, `spike`. Inferred from phrasing ("create a milestone for…", "add a spike to…", "new story:") and validated against the project's taxonomy. If no clear cue, ask the user.
- **Title** — pulled from the description. Confirm with the user before creation when ambiguous.
- **Residual context** — anything else (motivation, acceptance hints, references) is preserved and seeded into the orchestrator skill's brainstorming.

## Keyword parameters

- `task=<id>` (optional) — explicit parent task short ID. Overrides parent inference. Use when the parent is not the most-recently-inspected task.
- `project=<id>` (optional) — Tusk project, by id or name. Overrides project context resolution. Use when working across projects or when the active project is ambiguous.

## Procedure

1. **Parse input.** Extract `task=<id>` and `project=<id>` keyword params. Treat the remainder as free-form context.

2. **Resolve the target Tusk Project.** If `project=<id>` was passed, look it up via `tusk_project_list` (matching id or name). Hard error if it isn't returned. Otherwise call `tusk_project_list` to determine the active project, and if multiple projects exist and none is implied by context, ask the user which one.

3. **Validate the project's taxonomy.** Fetch via project settings. If the project has no WBS taxonomy, surface a hard error pointing at `templates/wbs/taxonomy.md`.

4. **Infer the level** from the free-form context. If no clear cue, ask the user. Confirm the resolved level appears in the project's rank list.

5. **Resolve the parent.** In order of preference:
   - `task=<id>` keyword param.
   - The "current" Tusk task — the one most recently inspected, modified, or created in this session (the orchestrator skill maintains this context).
   - For root-rank levels (the top of the taxonomy), no parent — the task is created as a root in the project.
   - Otherwise, ask the user which parent task to use, listing recent candidate parents from `tusk_task_list`.

6. **Validate parent rank.** Tusk validates on create, but surface the error early: parent rank index must be strictly lower than the new task's rank.

7. **Infer the title** from the free-form context. If ambiguous (input is descriptive without a clear title phrase), ask the user. Confirm before creation when not obvious.

8. **Load the description template.** Read `plugins/superhuman/templates/wbs/desc-<level>.md` from the plugin. Replace `<*-title>` placeholders with the resolved title. Hand the residual free-form context to the orchestrator as the brainstorming seed.

9. **Create the Tusk task.** Call `tusk_task_create` with:
   - `title=<resolved-title>`
   - `level=<inferred-level>`
   - `parent=<parent-short-id>` (omit if root)
   - `description=<populated-template-content>`
   - `project=<project-name>`

10. **Hand off to the orchestrator skill.** Invoke `wbs-orientation` (the orchestrator skill) so it can begin walking the user through brainstorming the new node's content (seeded with the residual free-form context) and driving the Karpathy decomposition gate.

## Errors

- **Tusk MCP unavailable** — hard error with remediation pointer. Do not fall back to file-based design.
- **Specified `project=<id>` does not exist** — hard error. List available projects from `tusk_project_list` so the user can correct the typo.
- **No taxonomy on the project** — hard error pointing at `templates/wbs/taxonomy.md`.
- **Level cannot be inferred and the user can't disambiguate** — hard error.
- **Invalid level / rank parent mismatch** — surface Tusk's validation error verbatim.
- **Skipping ranks (e.g., a story directly under a Project)** — allow but flag with a warning. Tusk permits any-ancestor-to-any-descendant parenting.

## Examples

```
/wbs-new create a milestone for the authentication overhaul
/wbs-new add an initiative to replace session cookies with JWTs
/wbs-new new story: implement /api/auth/refresh endpoint
/wbs-new task: add JWTRefreshHandler to the auth router task=STORY-7
/wbs-new spike to compare HS256 vs RS256 for our deployment scale
/wbs-new milestone for the Q3 platform overhaul project=infra
```
