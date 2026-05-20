---
description: Reshape a WBS node — re-brainstorm its outcome with full original context, then archive/reparent/keep descendants based on the new shape. Use when discovery during brainstorming, planning, or implementation contradicts an earlier shape.
argument-hint: <free-form context describing the trigger> [task=<focal-path>]
---

# /wbs-reshape

Reshape a WBS node by re-brainstorming its outcome with full context of the original reasoning, then walking per-child disposition decisions (keep / reparent / archive). Posts a `kind=reshape-audit` note on the focal node capturing the trigger, reasoning, invalidated assumptions, and structural changes.

This is the explicit entry point. The same `wbs-reshape-flow` skill is also auto-invoked by `wbs-orientation` when an end-of-brainstorm, planning-time, or decomposition-gate signal indicates contradiction with parent context — see `plugins/gilbreth/skills/wbs-orientation/SKILL.md` steps 5.7, 6.6, and 7.

## Input

Free-form text describing why the reshape is being triggered — the contradiction surfaced, the invalidated assumption, the new shape under consideration. This text is forwarded into the skill's trigger-capture step and seeded into the wrapped brainstorming.

## Keyword parameters

- `task=<focal-path>` (optional) — focal node path. If omitted, the skill falls back to the most-recently-inspected node in this session, then asks the user.

## Procedure

1. **Parse input.** Extract `task=<focal-path>`. Treat the remainder as free-form trigger context.

2. **Resolve the active project.** A project is a `wbs-node level=project` (`tusk_query 'type:wbs-node AND level:project'`). If `task=<focal-path>` was passed, derive the project from that node's ancestry. If exactly one project exists, use it; if more than one and none is implied, ask the user which.

3. **Resolve the focal node.** If `task=<focal-path>` was passed, use it directly. Otherwise pass through to the skill — its step 2 handles fall-back resolution (most-recently-inspected node, then user prompt).

4. **Hand off to the `wbs-reshape-flow` skill.** Invoke `gilbreth:wbs-reshape-flow` via the Skill tool with the resolved project, focal node path (if known), and free-form trigger context as initial inputs. The skill drives the full workflow — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note, Karpathy gate.

## Errors

- **Tusk unavailable (both MCP and CLI)** — hard error. Remediation pointer to `/wbs-bootstrap`.
- **`gilbreth-wbs` pack not installed** — hard error pointing at `/wbs-bootstrap`.
- **Project workflow has no terminal `archived` status** — hard error from the skill's step 1. Reshape archive semantics require it. (The `gilbreth-wbs` pack declares it.)

## Examples

```
/wbs-reshape                                                                   # use most-recently-inspected node
/wbs-reshape the auth flow no longer matches reality task=wbs/auth-overhaul/refresh-endpoint
/wbs-reshape task=wbs/infra/caching Q3 priorities shifted; this initiative is now scoped to caching only
```

## Why the command stays thin

The `wbs-reshape-flow` skill is also invoked by `wbs-orientation` for auto-invoke triggers. If this command had real workflow logic embedded, the orchestrator would have to duplicate it. Keeping the command as a thin entry point means there's one source of truth for reshape behavior — the skill at `plugins/gilbreth/skills/wbs-reshape-flow/SKILL.md`.
