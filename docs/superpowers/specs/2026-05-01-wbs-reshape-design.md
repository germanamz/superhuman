# /wbs-reshape — context-aware re-brainstorm and structural change for WBS nodes

**Status:** Design (ready for implementation planning)
**Date:** 2026-05-01
**Owner:** German Meza
**Related:** [`wbs-orientation`](../../plugins/superhuman/skills/wbs-orientation/SKILL.md), [`templates/wbs/conventions.md`](../../plugins/superhuman/templates/wbs/conventions.md), phase skills

## Problem

The Superhuman WBS spine builds top-down: brainstorm a node → decompose → brainstorm children → decompose. This works while initial framing holds. It breaks when discovery during brainstorming, planning, or implementation surfaces that an earlier shape was wrong:

- Brainstorming a Story reveals the parent Initiative's scope was wrongly drawn.
- Planning a Story produces a structure the parent Initiative's `## Phasing` rules out.
- Spike work invalidates an assumption codified in the Milestone's Karpathy fields.
- External priorities shift; a branch is no longer relevant.

Currently the orchestrator has no structured response to these. Users can mutate descriptions directly via `tusk_task_modify`, but this loses the *reasoning* behind the change. Future agents reading the new shape have no audit trail bridging the prior reasoning to the new direction. Karpathy-style "what we learned and why we changed direction" disappears.

## Goal

Add a `/wbs-reshape` slash command and matching `wbs-reshape` skill that:

1. Loads the focal node's full original reasoning (spec note, plan note, descendant outline, prior reshape notes).
2. Captures the *learning* that triggered the reshape, in the user's voice.
3. Wraps the existing `brainstorming` skill with that context to produce a fresh spec.
4. Walks per-child disposition decisions: keep / reparent / archive.
5. Optionally recurses into reparented children whose own subtrees need reshaping.
6. Posts a `meta.type=reshape` audit note on the focal node — reasoning-first, not a mechanical diff.
7. Re-runs the Karpathy decomposition gate on the focal node's new description.

The skill is auto-invoked by `wbs-orientation` when end-of-brainstorm, planning-time, or decomposition-gate signals indicate contradiction with parent context. The user can also invoke it explicitly via the slash command.

## Non-goals

- **Mechanical subtree editing** (drag-this-branch-here-then-fix-up-everything). Reshape is *context-aware re-brainstorm*. Mechanical reparenting of existing subtrees as part of a complex restructure is explicitly not the primary mode.
- **Hard delete.** Archive preserves history; reshape never calls `tusk_task_delete`.
- **Auto-fix of phase tags on reparented descendants.** Inherits `wbs-orientation`'s existing rule: flag `meta.phase` as a manual concern.
- **Reshape graveyard project.** Archived tasks remain in their original project, marked by tag.
- **Cross-project reshape.** Focal node and reshape effects stay within one Tusk project. Cross-project structural changes are out of scope.

## Design summary

| Component | Where it lives | Purpose |
|---|---|---|
| `wbs-reshape` skill | `plugins/superhuman/skills/wbs-reshape/SKILL.md` | The workflow: load reasoning, capture trigger, wrap brainstorming, walk dispositions, mutate, audit, gate. |
| `/wbs-reshape` command | `plugins/superhuman/commands/wbs-reshape.md` | Thin entry point — resolves project + task-id, invokes the skill via the Skill tool. |
| Audit-note template | `plugins/superhuman/templates/wbs/note-reshape.md` | Shape of the `meta.type=reshape` note posted on the focal node. |
| `wbs-orientation` delta | `plugins/superhuman/skills/wbs-orientation/SKILL.md` | Hard gates (end-of-brainstorm, planning-time, decomposition-gate failure) plus a soft-mode phrase hint. Delegates to `wbs-reshape` via Skill tool. |
| Conventions delta | `plugins/superhuman/templates/wbs/conventions.md` | Documents reshape semantics, archive convention, deferred-reshape pattern, metadata reservations. |

## Component 1 — `wbs-reshape` skill workflow

`SKILL.md` is **rigid** (matching `wbs-orientation`). Step order is enforced; deviations require updating the conventions doc.

1. **Detect Tusk context** — same shim as `wbs-orientation`. Hard error if MCP unreachable or project has no taxonomy.

2. **Identify the focal node.** Sources, in priority order: explicit task ID from `/wbs-reshape <id>`, the auto-invoke parent passed by `wbs-orientation`, the most recently inspected/modified Tusk task this session, or ask the user.

3. **Load original reasoning.** Pull all of:
   - The focal node's task object (description, level, parent, status, version).
   - The newest non-archived `meta.type=spec` note.
   - The newest non-archived `meta.type=plan` note (if any).
   - The newest non-archived `meta.type=reshape` note (prior reshape on this node, if any).
   - Direct children: titles, levels, statuses, one-line summaries.
   - Any descendants currently in `in_progress` or `in_review` (concurrency surface — used in step 7).

4. **Synthesize "what we wanted vs. what's here."** Produce a written summary the user reads before answering: "Original outcome was X. Reasoning was Y. Current shape is Z. Tradeoffs were A, B."

5. **Capture the trigger.** Ask the user, one question at a time:
   - "What did you learn that triggered this reshape?" (free text → audit note `## Reasoning`)
   - "Which pieces of the original reasoning no longer hold?" (free text → audit note `## Invalidated Assumptions`)
   - "What outcome do you now want?" (seed for the wrapped brainstorm)

6. **Wrapped brainstorming.** Invoke the `brainstorming` skill via the Skill tool with a context shim containing: synthesis from step 4, trigger from step 5, the level-appropriate description template (`templates/wbs/desc-<level>.md`). Direct brainstorming to land its output as a *new* `meta.type=spec` note (not as `docs/superpowers/specs/<file>.md`). Brainstorming runs its own loop; when it would write the design doc, the orchestrator captures the content for step 8.

7. **Disposition decisions per direct child.** For each direct child of the focal node, ask one of:
   - **Keep unchanged** — leave alone.
   - **Reparent** — to a different existing parent or a newly-created one. Apply via `tusk_task_modify`. Then offer: *"Reshape this child now under its new parent?"* If yes → recurse into step 1 with this child as new focal node; if no → record deferred reshape as an `## Open Questions` entry on the child's description.
   - **Archive** — apply archive semantics (Component 4). Children of the archived node are archived recursively unless explicitly reparented out first.

   Children currently in `in_progress` or `in_review` get a hard-confirm prompt before archive or reparent: *"Task #N is in flight — archiving/reparenting will disrupt that work. Confirm? (y/N)"* — default N, soft-mode skip not allowed.

8. **Apply mutations.** Ordering:
   1. Archive the previous spec/plan notes on the focal node (`tusk_note_archive`).
   2. Post the new `meta.type=spec` note from step 6.
   3. Update the focal node's description via `tusk_task_modify` (Karpathy fields refreshed from the new spec, children list rebuilt from step 7 dispositions).
   4. Apply each child disposition (`tusk_task_modify` parent, or archive flow).
   5. Post the `meta.type=reshape` audit note on the focal node.
   6. For any nested reshape that ran in step 7, the audit note links the child's reshape note by ID.

9. **Re-run the Karpathy decomposition gate** on the focal node's new description. If it fails (e.g., `## Out of Scope` left empty after the reshape), name the gap and refuse to mark the reshape complete until filled.

10. **Return control.** If auto-invoked from `wbs-orientation`, return a structured summary: focal node ID, new spec note ID, audit note ID, disposition list. The caller decides whether to resume the original flow or hand control back to the user.

### Failure modes

| Failure | Behavior |
|---|---|
| Tusk version conflict on `tusk_task_modify` | Catch optimistic-lock error. Re-fetch. Ask user: retry / merge / abort. Never auto-merge. |
| User abandons mid-flow before step 8 | No partial mutations applied yet. Clean abort. |
| User abandons mid-flow during step 8 | Surface the partial state with the IDs of what was applied — user resolves manually or re-invokes reshape to recover. |
| Brainstorm in step 6 doesn't converge | Reshape can be aborted at any point before step 8. No audit note is posted. |
| Concurrency block (step 7 in-flight warning) | User confirms or aborts; no soft-mode skip. |
| Project workflow has no terminal cancelled status | Hard error. Reshape refuses to proceed. User fixes the workflow first. |

## Component 2 — `/wbs-reshape` command shape

`plugins/superhuman/commands/wbs-reshape.md`.

```yaml
---
description: Reshape a WBS node — re-brainstorm its outcome with full original context, then archive/reparent/keep descendants based on the new shape.
argument-hint: [task-id] [project=<name>]
---
```

**Arguments:**

- `[task-id]` (optional) — focal node short ID. If omitted, the skill's step 2 falls back to the most-recently-inspected task in this session, then asks the user.
- `[project=<name>]` (optional) — explicit Tusk project. Same semantics as `/wbs-new` and `/wbs-status`.

**Procedure:** thin. The command resolves project + task-id arguments and hands off to the `superhuman:wbs-reshape` skill. All workflow logic lives in the skill.

**Examples:**

```
/wbs-reshape                    # use most-recently-inspected task this session
/wbs-reshape STORY-42           # reshape Story 42
/wbs-reshape INIT-7 project=infra
```

The command stays thin because the skill is also invoked by `wbs-orientation` for auto-invoke. One source of truth.

## Component 3 — Audit-note template

`plugins/superhuman/templates/wbs/note-reshape.md`.

**Tusk metadata on the note:**

```
meta.type=reshape
meta.reshape-of-spec=<short-id of the spec note this reshape supersedes>
meta.parent-reshape=<short-id of parent reshape note, if this is a nested reshape>
```

The `meta.reshape-of-spec` pointer lets later readers reconstruct the chain: spec → reshape → new spec. The `meta.parent-reshape` pointer threads nested reshapes (from step 7 recursion) into a tree.

**Note body:**

```markdown
# Reshape — <focal-node-title> (<short-id>) — <YYYY-MM-DD>

## Trigger
<One sentence: what surfaced the need to reshape. Captured verbatim from skill step 5.>

## Reasoning
<Multi-paragraph free text. The user's full explanation of what was learned, why the original shape no longer holds, and what the new direction is. Load-bearing — do not abbreviate.>

## Invalidated Assumptions
<Bullet list of original assumptions that no longer hold, with one-line "why" for each.>

- **<assumption>** — <why it no longer holds>

## Original Shape (before reshape)
- Outcome: <one line from prior spec>
- Children:
  - <child short-id> "<title>" — <level>
  - …

## New Shape (after reshape)
- Outcome: <one line from new spec — links to new spec note ID>
- Children:
  - <child short-id> "<title>" — <level> — **kept unchanged**
  - <child short-id> "<title>" — <level> — **reparented to <new-parent-id>**
  - <child short-id> "<title>" — <level> — **archived**
  - <NEW> "<title>" — <level> — **created via /wbs-new**

## Deferred Reshapes
<Children reparented but not reshaped now. Their description's ## Open Questions section was updated. Listed here for traceability.>

- <child short-id> — reparented to <new-parent-id>; reshape deferred
- (none)

## Nested Reshapes
<Reshape notes posted on descendants during this flow's recursion.>

- <reshape-note-id> on <child short-id>
- (none)

## References
- Prior spec note: <short-id> (archived)
- New spec note: <short-id>
- Prior plan note (if any): <short-id> (archived)
- Parent reshape note (if nested): <short-id>
```

**Why these sections:**

- **Trigger / Reasoning / Invalidated Assumptions** — the *why*, in the user's voice. The bridge between the old and new spec. A future reader sees the prior spec, the new spec, and this note explains the transition.
- **Original Shape** — survives if the prior spec note is hard to find. Cheap insurance.
- **New Shape** — diff in human-readable form. Each child's disposition named.
- **Deferred Reshapes** — forcing function. `/wbs-status` can surface unresolved scope drift.
- **Nested Reshapes** — lets a single user gesture's tree of reshapes be reconstructed from the root.

**Sizing:** Reasoning and Invalidated Assumptions are unbounded. Other sections are mechanical and short.

## Component 4 — Archive semantics

When a task is archived by reshape, the skill applies all of:

1. **Workflow transition.** Move the task to the project workflow's terminal cancelled / won't-do status. If the workflow has no such status, the skill issues a hard error and refuses to proceed (user fixes the workflow first).

2. **Tag stamp.** Add a `+reshape-archived` tag — distinguishes archive-by-reshape from user-driven cancellation.

3. **Description stamp.** Prepend a one-line marker to the task's description, preserving the original content underneath:

   ```markdown
   > **Archived by reshape on <YYYY-MM-DD>.** See reshape note <short-id> on <focal-node-id>.

   <original description preserved below>
   ```

4. **Note archival.** For every non-archived note on the task, call `tusk_note_archive`. Includes spec, plan, prior reshape notes, brainstorm notes — everything.

**Cascade onto descendants.** Children that weren't explicitly reparented out are archived recursively, applying steps 1–4 to each. The cascade stops at the first descendant that has been explicitly reparented out — that subtree has a new parent and stays alive. Indirect descendants are not surfaced for per-node disposition; the user reparents anything they want to keep alive *before* the archive cascade reaches it.

**Reversal.** Archive is reversible by deliberate user action: reparent the archived task back into the live tree, transition out of cancelled, remove the tag. Hard delete is never used.

**Concurrency guard.** Tasks in `in_progress` or `in_review` require user confirmation before archive. Default N. No soft skip.

## Component 5 — Conventions update

Edits to `plugins/superhuman/templates/wbs/conventions.md`.

### Append a new "Reshaping" section after "Decomposition gate"

```markdown
## Reshaping

The WBS is built top-down, but discovery is iterative. Brainstorming a child can surface that a parent's scope was wrong; implementation can reveal a story should be split; priorities can shift. **Reshape** is the structured response: re-brainstorm a node with full context of its original reasoning, then archive or reparent descendants based on the new shape. Mechanical subtree editing (drag-this-branch-here-then-fix-up-everything) is explicitly *not* the goal — context-aware re-brainstorm is.

A reshape always:

1. Records the **reasoning that triggered it** in a `meta.type=reshape` note on the focal node — the user's voice, not a mechanical diff. Load-bearing: a future reader sees the prior spec, the new spec, and the reshape note bridges them with the learning.
2. Archives the prior `meta.type=spec` and `meta.type=plan` notes on the focal node.
3. Posts a new `meta.type=spec` note via wrapped brainstorming.
4. Updates each direct child to one of three states: kept unchanged, reparented (subtree comes along), or archived.
5. Re-runs the Karpathy decomposition gate on the focal node's new description.

Use `/wbs-reshape <task-id>` to invoke explicitly, or let `wbs-orientation` auto-offer when an end-of-brainstorm, planning-time, or decomposition-gate signal indicates contradiction with parent context.
```

### Append "Archive semantics" subsection

```markdown
## Archive semantics

When a task is archived by reshape:

- It transitions to the workflow's terminal cancelled status. If the project workflow has no cancelled status, reshape refuses to proceed.
- It gets a `+reshape-archived` tag, distinguishing reshape-archive from user-driven cancellation.
- Its description is prepended with a one-line stamp pointing at the reshape note: `> **Archived by reshape on <YYYY-MM-DD>.** See reshape note <short-id> on <focal-node-id>.` — original content preserved below.
- All non-archived notes on the task are archived via `tusk_note_archive`.
- Descendants that weren't explicitly reparented out are archived recursively.
- Tasks in `in_progress` or `in_review` require user confirmation before archive — no soft skip.

Archive is reversible by deliberate user action (reparent back into the live tree, transition out of cancelled, remove the tag). Hard delete is never used.
```

### Append "Deferred reshapes" subsection

```markdown
## Deferred reshapes

When a child is reparented during a reshape but the user declines to reshape it now under its new parent, the child gets an explicit `## Open Questions` entry: "Reshape under new parent <new-parent-id> context — deferred from reshape <short-id> on <YYYY-MM-DD>." The next time the Karpathy gate runs on that child, the open question forces resolution. Deferred reshapes are also listed in the focal node's reshape audit note.
```

### Edit "Tag and metadata naming" to include reshape entries

```markdown
- Phase identification: tag children `+phase-1`, `+phase-2`, etc.
- Note types: `meta.type=brainstorm | spec | plan | phase-plan | reshape`
- Phase association on notes: `meta.phase=phase-1`, `meta.phase=phase-2`
- Reshape lineage on reshape notes: `meta.reshape-of-spec=<spec-note-id>`, `meta.parent-reshape=<reshape-note-id>` (when nested)
- Archive marker on tasks: tag `+reshape-archived`
- WBS-specific reserved namespace: any tag or metadata key prefixed with `wbs-`
```

### Edit "Bypass consequences" to mention direct mutation

```markdown
If you mutate a node's description directly via `tusk_task_modify` to change its scope (instead of running `/wbs-reshape`), the prior reasoning is lost — there's no audit note bridging the old and new shape. The orchestrator does not detect this after the fact. Convention: scope changes that invalidate prior assumptions go through `/wbs-reshape`; trivial typo-fixes and phrasing edits do not.
```

### Companion edit (smaller)

The human-facing WBS user guide added in commit `e371b6d` needs a "Changing direction mid-flight" section pointing users at `/wbs-reshape`. Drafted as part of implementation, not in this spec.

## Component 6 — `wbs-orientation` delta

Six targeted edits to `plugins/superhuman/skills/wbs-orientation/SKILL.md`. The existing skill stays in shape; reshape integration is layered on.

### Change 1 — Step 4: add reshape as a fourth common operation

```markdown
Four operations are common:

- **Brainstorm a node's design.** ...
- **Plan a Story's implementation.** ...
- **Decompose a node into children.** ...
- **Reshape a node.** Use when the node's prior spec/plan no longer fits — context shifted, parent scope was wrong, learning during brainstorming/planning surfaced contradiction. Go to "Wrapped reshape."
```

### Change 2 — Step 5 ("Wrapped brainstorming"): add the end-of-brainstorm contradiction gate

After the existing step 5.5 ("spec self-review and user-review gates still run"), add:

```markdown
6. **End-of-brainstorm contradiction gate.** Before brainstorming posts the new `meta.type=spec` note via `tusk_note_create`, compare the proposed spec against the parent node's Karpathy fields (`Out of Scope`, `Success Criteria`). If the proposed spec contradicts the parent — for example, the new design needs a capability the parent's "Out of Scope" rules out — surface the contradiction with three choices:

   - **(1) Reshape the parent now (pause-and-resume).** Invoke `wbs-reshape` via the Skill tool with the parent as focal node. After it completes (or aborts), re-load the now-refreshed parent context and re-evaluate whether the in-flight spec for this child still makes sense.
   - **(2) Accept the deviation.** Post the spec as-is. Add an entry to the spec note's `## Open Questions` section: "Diverges from parent <parent-id> Out of Scope: <field>. Accepted on <YYYY-MM-DD> pending parent reshape." This becomes a forcing function for whoever later reshapes the parent.
   - **(3) Abandon this brainstorm.** Discard the in-flight spec content. Reshape the parent first (offer to invoke `wbs-reshape` on the parent now), then start the child brainstorm fresh under refreshed context.

   Default to none — the user must pick. Do not auto-decide.
```

### Change 3 — Step 6 ("Wrapped writing-plans"): add the planning-time gate

After step 6.4 (phase-planning-rules description), add:

```markdown
6. **Planning-time contradiction gate.** Before posting the plan note, check whether the produced plan can fit the parent Initiative's stated decomposition. Specifically: does the plan require a phase, dependency, or scope element that contradicts the parent's `## Phasing`, `## Out of Scope`, or `## Tradeoffs Considered`? If so, surface the same three-choice prompt described in step 5.6, scoped to the parent of this Story's Initiative (or the nearest ancestor whose Karpathy fields are contradicted). Same defaults: user picks; never auto-decide.
```

### Change 4 — Step 7 ("Karpathy decomposition gate"): add the gate-failure delegation

Append to existing step 7:

```markdown
**Reshape escape hatch.** If the gate fails specifically because the node's design conflicts with a parent constraint (for example, the user can't write `## Success Criteria` without violating the parent's `## Out of Scope`), the right answer is reshape, not field-massaging. Surface the three-choice prompt from step 5.6, scoped to the parent. The user picks: reshape the parent, accept the deviation as a recorded divergence, or abandon and restart.
```

### Change 5 — New step 5a: soft-mode reshape hints

Inserted before step 5 wraps up.

```markdown
### 5a. Soft-mode reshape hints

While running wrapped brainstorming or writing-plans, if user phrasing strongly suggests structural drift — phrases like "this contradicts X," "this is actually two stories," "we should split this," "this doesn't fit under <parent>" — emit a one-line hint, *not* a blocking prompt:

> *"Sounds like the shape might need to change. If so, you can run `/wbs-reshape <task-id>` to drive that explicitly, or keep going and the end-of-brainstorm gate will check for contradictions automatically."*

Emit at most once per brainstorm/plan invocation. Do not interrupt the flow. The hard gates in steps 5.6, 6.6, and 7 are the authoritative triggers.
```

### Change 6 — New step 11: Wrapped reshape

```markdown
### 11. Wrapped reshape

When reshaping a node — explicit `/wbs-reshape` invocation, or one of the gate-driven offers from steps 5.6 / 6.6 / 7:

1. Invoke the `superhuman:wbs-reshape` skill via the Skill tool, passing the focal node's short ID and (if the trigger surfaced one) the contradicting parent context.
2. The reshape skill drives its own loop — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note. See `plugins/superhuman/skills/wbs-reshape/SKILL.md`.
3. When reshape completes, it returns a structured summary (focal node ID, new spec note ID, audit note ID, disposition list).
4. **If reshape was invoked from step 5.6 or 6.6 (pause-and-resume)**: reload the now-refreshed parent context. Re-display the in-flight child spec or plan. Ask the user: "Parent context has been reshaped. Does the in-flight content for this child still make sense, or do you want to revise?" Revise → restart the child's wrapped brainstorming/writing-plans flow with refreshed context. Keep → proceed to commit.
5. **If reshape was invoked from step 7 (gate failure)**: re-run the Karpathy gate on the original child node. If it now passes, proceed with decomposition transition. If it still fails for an unrelated reason, surface that.
6. **If reshape was invoked explicitly via `/wbs-reshape`**: control returns to the user. No automatic resume.
```

## Open questions

None for the design. Implementation may surface details in:

- The exact mechanism for brainstorming output capture (the three options listed in `wbs-orientation` step 5.3 — subagent capture, context shim, post-write hoist — apply equally here; pick one consistently).
- The exact name of the workflow's terminal cancelled status across projects (Tusk default workflow is one thing; user-defined workflows may differ — the skill has to inspect, not assume a name).

## Acceptance

The reshape feature is complete when:

1. `/wbs-reshape <task-id>` runs the full workflow on a node and posts a `meta.type=reshape` audit note.
2. `wbs-orientation` end-of-brainstorm, planning-time, and decomposition-gate-failure triggers each surface the three-choice prompt and correctly delegate to `wbs-reshape`.
3. Pause-and-resume from auto-invoke correctly reloads parent context and asks the user whether to revise the in-flight child spec/plan.
4. Per-child disposition (keep / reparent / archive) is applied correctly, with the in-flight concurrency guard hard-confirming on `in_progress`/`in_review` tasks.
5. Reparented children whose subtrees need reshaping recurse through the same workflow at the user's election; deferred reshapes are recorded as `## Open Questions` on the moved child.
6. Archive applies workflow transition + `+reshape-archived` tag + description stamp + recursive note archival.
7. The Karpathy gate re-runs on the focal node post-reshape and refuses completion until passing.
8. Conventions doc reflects all of the above; metadata reservations include `meta.type=reshape`, `meta.reshape-of-spec`, `meta.parent-reshape`, and `+reshape-archived`.
