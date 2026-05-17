---
name: wbs-orientation
description: Use when working in any WBS context — running /wbs-new or /wbs-status, working from a Tusk task at any taxonomy level, or describing decomposition work ("design this milestone", "break this initiative into stories", "plan this story's implementation"). Auto-invokes to detect Tusk context, load the level-appropriate template, wrap brainstorming and writing-plans so their output lands as Tusk notes, enforce the Karpathy decomposition gate, and drive decomposition transitions.
---

# WBS Orientation

This is the orchestrator skill for the Superhuman WBS spine. It is **rigid** — the order of operations below is enforced. Read `templates/wbs/conventions.md` (in the same plugin) before diverging from any step.

## When to invoke

Auto-invoke when ANY of the following is true:

- The user runs `/wbs-new` or `/wbs-status`.
- The user references a Tusk task at a WBS taxonomy level (milestone / initiative / story / task / spike) by short ID, title, or context.
- The user describes WBS-shaped work: "let's design milestone X", "break this initiative down", "plan the story for Y", "what's still open on this milestone", etc.

Do **not** invoke for tasks in projects with no WBS taxonomy, or for non-Tusk file-based design work.

## Operating procedure

### 1. Detect Tusk context

- **Pack-presence check (Tusk v1).** Before anything else, verify the `superhuman-wbs` pack is installed in the active workspace. Probe with `tusk_node_list type=wbs-node`: an error indicating the type is undeclared (or an explicit "unknown node type" response) means the pack isn't loaded. When that happens, surface this hint and abort the current operation — do not fall back, do not attempt repair:

  > The `superhuman-wbs` pack isn't installed in this workspace. Run `/wbs-bootstrap` to initialize Tusk and add the pack, then re-run what you were doing.

  This is the only intervention this skill does about workspace setup — `/wbs-bootstrap` owns the actual mutation. If `tusk_node_list type=wbs-node` succeeds (even with zero rows), the pack is present; continue.
- If the invoking command passed an explicit `project=<name>` argument, look it up via `tusk_project_list` and filter for the named project. Hard error if it isn't returned. Otherwise call `tusk_project_list` to identify the active project (filter by current context, or ask the user if multiple projects exist).
- Hard error if Tusk MCP is unreachable. Point at `templates/wbs/taxonomy.md` for setup.
- Hard error if the project has no taxonomy. Surface the recommended taxonomy from `templates/wbs/taxonomy.md` and offer to apply it (workspace-wide or per-project).

> The two bullets below this point still reference Tusk v0 concepts (`tusk_project_list`, per-project taxonomy). They are slated for rewrite in Story S3 (orientation-skill-rewrite) of the Tusk v1 migration. Until S3 lands, treat them as historical guidance — the only step 1 behavior that runs cleanly against Tusk v1 today is the pack-presence check above.

### 2. Identify the current node

- If the user provided a task short ID, use it.
- Otherwise, use the most recently inspected/modified/created task this session.
- Otherwise, ask the user which task they're working on, listing recent candidates via `tusk_task_list`.
- Call `tusk_task_get <short-id>` to fetch the full task: level, description, status, parent.

### 3. Load the right template

Based on the node's `level`, read the corresponding description template:

- `milestone` → `templates/wbs/desc-milestone.md`
- `initiative` → `templates/wbs/desc-initiative.md`
- `story` → `templates/wbs/desc-story.md`
- `task` → `templates/wbs/desc-task.md`
- `spike` → `templates/wbs/desc-spike.md`
- (Project-level descriptions — `templates/wbs/desc-project.md` — apply to the Tusk Project itself, not to a task.)

If the template file is missing, fall back to a minimal in-skill template (see "Fallback templates" at the bottom of this file) and log a warning that the plugin appears damaged.

### 4. Decide the operation

Four operations are common:

- **Brainstorm a node's design.** Use when the node's description has empty Karpathy fields. Go to "Wrapped brainstorming."
- **Plan a Story's implementation.** Use when a Story has its spec note populated and is ready for implementation planning. Go to "Wrapped writing-plans."
- **Decompose a node into children.** Use when the description's Karpathy fields are populated and the user wants to create the next-rank-down children. Go to "Decomposition transition."
- **Reshape a node.** Use when the node's prior spec/plan no longer fits — context shifted, parent scope was wrong, learning during brainstorming/planning surfaced contradiction. Go to "Wrapped reshape."

If unclear, ask the user which operation they want.

### 5. Wrapped brainstorming

When brainstorming a node:

1. Invoke the `brainstorming` skill via the Skill tool, with a context shim describing:
   - The current node's level, title, and parent context.
   - The level-appropriate description template (loaded in step 3).
   - The directive that the brainstorm output must land as a Tusk note (`meta.type=brainstorm` or `meta.type=spec`), not as `docs/superpowers/specs/<file>.md`.
2. Let brainstorming run its normal loop (one question at a time, propose 2–3 approaches, present design sections).
3. At brainstorming's "Write design doc" terminal step, capture the spec content. Choose the wrapping mechanism:
   - **Subagent capture (preferred):** invoke brainstorming as a subagent with instructions to return the final spec content as text rather than write it to disk; the orchestrator then posts it via `tusk_note_add`.
   - **Context-shim:** instruct the brainstorming skill in its initial context that the "Write design doc" step must call `tusk_note_add` with the right meta — viable if brainstorming is flexible enough to honor the override.
   - **Post-write hoist:** let brainstorming write the file, then read it, post via `tusk_note_add`, and delete the file. Last resort.
4. Update the node's description: populate the Karpathy fields with summaries from the spec, leaving deep rationale in the note. Use `tusk_task_modify` with `description=<populated-template>` and a fresh `version`.
5. The brainstorming skill's spec self-review and user-review gates still run, reading from the Tusk note.
6. When brainstorming's terminal step would invoke `writing-plans`, wrap that the same way (see step 6).
7. **End-of-brainstorm contradiction gate.** Before brainstorming posts the new `meta.type=spec` note via `tusk_note_add`, compare the proposed spec against the parent node's Karpathy fields (`Out of Scope`, `Success Criteria`). If the proposed spec contradicts the parent — for example, the new design needs a capability the parent's "Out of Scope" rules out — surface the contradiction with three choices:

   - **(1) Reshape the parent now (pause-and-resume).** Invoke `superhuman:wbs-reshape-flow` via the Skill tool with the parent as focal node. After it completes (or aborts), re-load the now-refreshed parent context and re-evaluate whether the in-flight spec for this child still makes sense.
   - **(2) Accept the deviation.** Post the spec as-is. Add an entry to the spec note's `## Open Questions` section: "Diverges from parent <parent-id> Out of Scope: <field>. Accepted on <YYYY-MM-DD> pending parent reshape." This becomes a forcing function for whoever later reshapes the parent.
   - **(3) Abandon this brainstorm.** Discard the in-flight spec content. Reshape the parent first (offer to invoke `superhuman:wbs-reshape-flow` on the parent now), then start the child brainstorm fresh under refreshed context.

   Default to none — the user must pick. Do not auto-decide.

### 5a. Soft-mode reshape hints

While running wrapped brainstorming (step 5) or wrapped writing-plans (step 6), if user phrasing strongly suggests structural drift — phrases like "this contradicts X," "this is actually two stories," "we should split this," "this doesn't fit under <parent>" — emit a one-line hint, *not* a blocking prompt:

> *"Sounds like the shape might need to change. If so, you can run `/wbs-reshape <free-form trigger context> task=<task-id>` to drive that explicitly, or keep going and the end-of-brainstorm gate will check for contradictions automatically."*

Emit at most once per brainstorm/plan invocation. Do not interrupt the flow. The hard gates in steps 5.7, 6.6, and 7 are the authoritative triggers.

### 6. Wrapped writing-plans

When planning a Story's implementation:

1. Invoke the `writing-plans` skill via the Skill tool, with a context shim describing:
   - The current Story's spec note (pulled via `tusk_note_list task=<story-id> meta.type=spec`, take the newest non-archived).
   - The directive that the plan output must land as a Tusk note (`meta.type=plan`), not as `docs/superpowers/plans/<file>.md`.
2. Let writing-plans produce the plan content.
3. Post the plan via `tusk_note_add` with `task=<story-id>, meta.type=plan, body=<plan-content>`.
4. If the plan has phases (heavy phasing — multiple implementer subagents per Tusk task, sequential bridge-code dependencies, etc.), `superhuman:phase-planning-rules` auto-invokes; let it drive the per-phase note shape and the 4–6 task split. Per-phase notes land as `meta.type=phase-plan, meta.phase=phase-N` on the Story, following `templates/wbs/note-phase-plan-heavy.md`. After all phase-plan notes are drafted, `superhuman:phase-continuity-review` auto-invokes before any task is dispatched. After each phase's tasks are workflow-completed and after all phases ship, `superhuman:phase-post-implementation-review` auto-invokes for the per-phase gate and final sequence verification.
5. Each task in the plan becomes a child Tusk task at `level=task` parented to the Story, tagged `+phase-N` if the plan is phased. Use `/wbs-new <free-form context describing the task> task=<story-id>` for each — do not bypass the command.
6. **Planning-time contradiction gate.** Before posting the plan note, check whether the produced plan can fit the parent Initiative's stated decomposition. Specifically: does the plan require a phase, dependency, or scope element that contradicts the parent's `## Phasing`, `## Out of Scope`, or `## Tradeoffs Considered`? If so, surface the same three-choice prompt described in step 5.7, scoped to the parent of this Story's Initiative (or the nearest ancestor whose Karpathy fields are contradicted). Same defaults: user picks; never auto-decide.

### 7. Enforce the Karpathy decomposition gate

Before allowing a node to transition to a "ready to decompose" status (or before scaffolding child nodes), verify all of the following on the node's description:

- `## Success Criteria` is non-empty and not just placeholder text.
- `## Assumptions Made` is non-empty (must read "none" if there genuinely are none).
- `## Open Questions` is non-empty (must read "none, because …" if genuinely none).
- `## Tradeoffs Considered` is non-empty.
- `## Out of Scope` is non-empty.
- The level-appropriate children section (`## Milestones`, `## Initiatives`, `## Stories`, or `## Tasks`) lists at least one child by title — or the node is intentionally a leaf.

If any check fails: name the missing or weak field(s), refuse to proceed with decomposition, and offer to walk the user through filling them. **Never auto-fill.** Empty fields must be deliberate.

**Reshape escape hatch.** If the gate fails specifically because the node's design conflicts with a parent constraint (for example, the user can't write `## Success Criteria` without violating the parent's `## Out of Scope`), the right answer is reshape, not field-massaging. Surface the three-choice prompt from step 5.7, scoped to the parent. The user picks: reshape the parent, accept the deviation as a recorded divergence, or abandon and restart.

### 8. Decomposition transition

When the gate passes and the user is ready to create children:

1. Read the children list from the description (Milestones / Initiatives / Stories / Tasks section).
2. For each child, run `/wbs-new <free-form context including level cue and title>` (add `task=<parent-id>` if the parent isn't the current task in session context) — this creates the Tusk task and re-invokes this orchestrator skill on the new node.
3. Optionally suggest brainstorming each child immediately, or let the user defer.

### 9. Right-sized description warnings

While editing a node's description:

- At Project / Milestone / Initiative / Story levels, warn when description length exceeds 250 words: "This description is getting long; consider moving rationale into a `meta.type=brainstorm` or `meta.type=spec` note."
- At Task / Spike levels, warn when description **lacks** required execution-ready content: missing `## Target Files`, `## Verification`, or `## References` sections, or no concrete file paths in `## Target Files`.

These warnings inform; they do not block. Stop nagging once acknowledged.

### 10. Surface References

At Task / Spike level, when the user is populating the `## References` section, query Tusk MCP for likely candidates:

- Parent's spec note (`tusk_note_list task=<parent-id> meta.type=spec`).
- Parent's plan note (`meta.type=plan`).
- Phase plan note for this task's phase tag (`meta.type=phase-plan meta.phase=<phase>`).
- Sibling tasks in the same phase (`tusk_task_list parent=<parent-id> +phase-N`).

Suggest these as the user fills the References section. The user picks; do not auto-populate.

### 11. Wrapped reshape

When reshaping a node — explicit `/wbs-reshape` invocation, or one of the gate-driven offers from steps 5.7 / 6.6 / 7:

1. Invoke the `superhuman:wbs-reshape-flow` skill via the Skill tool, passing the focal node's short ID and (if the trigger surfaced one) the contradicting parent context.
2. The reshape skill drives its own loop — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note. See `plugins/superhuman/skills/wbs-reshape-flow/SKILL.md`.
3. When reshape completes, it returns a structured summary (focal node ID, new spec note ID, audit note ID, disposition list, gate-pass flag).
4. **If reshape was invoked from step 5.7 or 6.6 (pause-and-resume)**: reload the now-refreshed parent context. Re-display the in-flight child spec or plan. Ask the user: "Parent context has been reshaped. Does the in-flight content for this child still make sense, or do you want to revise?" Revise → restart the child's wrapped brainstorming/writing-plans flow with refreshed context. Keep → proceed to commit.
5. **If reshape was invoked from step 7 (gate failure)**: re-run the Karpathy gate on the original child node. If it now passes, proceed with decomposition transition. If it still fails for an unrelated reason, surface that.
6. **If reshape was invoked explicitly via `/wbs-reshape`**: control returns to the user. No automatic resume.

## Error handling

| Failure | Behavior |
|---|---|
| Tusk MCP unavailable | Hard error. Pointer to `templates/wbs/taxonomy.md`. No file-based fallback. |
| Project has no taxonomy | Hard error. Offer to apply the recommended taxonomy. |
| Skipping ranks (Story directly under Project) | Allow but warn. |
| Reparenting | Allow. Notes move with the task; flag `meta.phase` metadata as a manual concern. |
| Karpathy gate fails | Refuse to decompose. Name missing fields. Offer to walk through filling them. Never auto-fill. |
| User runs `/brainstorm` directly (bypass) | Don't intercept. The output is a file in the repo, not a Tusk note. Convention doc explains the consequence. |
| Tusk version conflict on a `tusk_task_modify` | Catch the optimistic-lock error. Re-fetch the task. Ask the user how to proceed: retry / merge / abort. Never auto-merge. |
| Phase tag / phase-plan-note mismatch | Surface as a warning in `/wbs-status`. Do not auto-fix. |
| Missing template file | Fall back to in-skill minimal template. Log a warning. |
| Stale spec note | Tusk notes are append-only — convention is to archive the old note and post a new one. Surface only the newest non-archived note when loading context. |

## Fallback templates

If `templates/wbs/desc-<level>.md` is missing or unreadable, use this minimal in-skill stub for the level (filling in only the level name; everything else is empty Karpathy fields):

```markdown
# <title>

## Outcome
<TBD — populate via brainstorming.>

## Success Criteria
<empty>

## Assumptions Made
<empty>

## Open Questions
<empty>

## Tradeoffs Considered
<empty>

## Out of Scope
<empty>

## Phasing
No phases needed.

## Children
<empty>
```

This is a degraded mode — the user should be informed that the plugin appears damaged.
