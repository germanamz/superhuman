# superhuman

The flagship plugin of the [superhuman](../../README.md) marketplace. It packages the WBS (work-breakdown-structure) workflow that drives decomposition, planning, and phase review on Tusk-backed projects.

## What ships

### Commands

- `/wbs-new` — create a Tusk task at a WBS level under the current parent, populated from the level-appropriate description template.
- `/wbs-status` — render the WBS subtree from a node with status rollup, phase tags, and orchestrator-surfaced warnings.
- `/wbs-reshape` — re-brainstorm a node's outcome with full original context, then archive, reparent, or keep descendants based on the new shape.

### Skills

- `wbs-orientation` — auto-invokes inside any WBS context to detect Tusk state, load the level-appropriate template, wrap brainstorming and plan-writing as Tusk notes, and enforce the decomposition gate.
- `wbs-reshape-flow` — re-brainstorms a WBS node and applies the resulting structural change. Backs the `/wbs-reshape` command and is auto-invoked by `wbs-orientation` on contradiction gates.
- `phase-planning-rules` — rules for splitting a Story's implementation into phased plans, each landing as a `meta.type=phase-plan` Tusk note.
- `phase-continuity-review` — cross-phase consistency review run after all phase plans are drafted, before the first implementer dispatch.
- `phase-post-implementation-review` — per-phase verification gate plus final sequence review once all phases ship.

### Templates

- `templates/wbs/` — level-keyed description templates (Initiative, Milestone, Epic, Story, Task) and the audit-note template used by `/wbs-reshape`.

## Layout

- `skills/` — auto-invoked or user-invoked skills (each in its own subdirectory with a `SKILL.md`)
- `commands/` — slash commands (one Markdown file per command)
- `agents/` — subagent definitions (one Markdown file per agent)
- `hooks/` — event hooks (`hooks.json` plus any scripts they call)
- `templates/` — reusable Markdown templates referenced by skills and commands

## Manifest

See `.claude-plugin/plugin.json` for plugin metadata.
