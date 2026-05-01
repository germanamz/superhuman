---
description: Reshape a WBS node — re-brainstorm its outcome with full original context, then archive/reparent/keep descendants based on the new shape. Use when discovery during brainstorming, planning, or implementation contradicts an earlier shape.
argument-hint: [task-id] [project=<name>]
---

# /wbs-reshape

Reshape a WBS node by re-brainstorming its outcome with full context of the original reasoning, then walking per-child disposition decisions (keep / reparent / archive). Posts a `meta.type=reshape` audit note on the focal node capturing the trigger, reasoning, invalidated assumptions, and structural changes.

This is the explicit entry point. The same skill is also auto-invoked by `wbs-orientation` when an end-of-brainstorm, planning-time, or decomposition-gate signal indicates contradiction with parent context — see `plugins/superhuman/skills/wbs-orientation/SKILL.md` steps 5.7, 6.6, and 7.

## Arguments

- `[task-id]` (optional) — focal node short ID. If omitted, the skill falls back to the most-recently-inspected Tusk task in this session, then asks the user.
- `[project=<name>]` (optional) — explicit Tusk project to scope the reshape. Overrides context resolution. Use when working across projects or when the active project is ambiguous.

## Procedure

1. **Resolve the target Tusk Project.** If `project=<name>` was passed, look it up via `tusk_project_list` and filter for the named project. Hard error if it isn't returned. Otherwise call `tusk_project_list` to determine the active project. If multiple projects exist and none is implied by context, ask the user which one.

2. **Resolve the focal node.** If `[task-id]` was passed, use it directly. Otherwise pass through to the skill — its step 2 handles fall-back resolution (most-recently-inspected task, then user prompt).

3. **Hand off to the `wbs-reshape` skill.** Invoke `superhuman:wbs-reshape` via the Skill tool with the resolved project and (optional) focal node ID as initial context. The skill drives the full workflow — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note, Karpathy gate.

## Errors

- **Tusk MCP unavailable** — hard error. Remediation pointer to `templates/wbs/taxonomy.md`.
- **Specified `project=<name>` does not exist** — hard error. List available projects from `tusk_project_list` so the user can correct the typo.
- **Project has no taxonomy** — hard error. Pointer at `templates/wbs/taxonomy.md`.
- **Project workflow has no terminal cancelled status** — hard error from the skill's step 1. Reshape archive semantics require it.

## Examples

```
/wbs-reshape                    # use most-recently-inspected task this session
/wbs-reshape STORY-42           # reshape Story 42
/wbs-reshape INIT-7 project=infra
```

## Why the command stays thin

The `wbs-reshape` skill is also invoked by `wbs-orientation` for auto-invoke triggers. If this command had real workflow logic embedded, the orchestrator would have to duplicate it. Keeping the command as a thin entry point means there's one source of truth for reshape behavior — the skill at `plugins/superhuman/skills/wbs-reshape/SKILL.md`.
