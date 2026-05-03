---
name: wbs-reshape
description: Re-brainstorm a WBS node with full original context and apply the resulting structural change — archive, reparent, or keep descendants — when discovery during brainstorming, planning, or implementation contradicts an earlier shape. Auto-invoked by wbs-orientation on end-of-brainstorm, planning-time, or decomposition-gate-failure triggers; also invoked explicitly via `/wbs-reshape <free-form trigger context> task=<task-id>`.
---

# WBS Reshape

This is the reshape orchestrator skill for the Superhuman WBS spine. It is **rigid** — the order of operations below is enforced. Read `templates/wbs/conventions.md` (in the same plugin) before diverging from any step.

The skill's purpose is *context-aware re-brainstorm*, not mechanical subtree editing. When a node's prior spec/plan no longer fits, this skill loads the original reasoning, captures what was learned, wraps the `brainstorming` skill with that context, and walks per-child disposition decisions (keep / reparent / archive). Reparented children whose own subtrees need reshaping recurse through this same workflow at the user's election.

## When to invoke

Invoke when ANY of the following is true:

- The user runs `/wbs-reshape <free-form trigger context> task=<task-id>` (or `/wbs-reshape <context>` with focal node from session context).
- The `wbs-orientation` skill delegates to this skill on an end-of-brainstorm contradiction gate (parent's Karpathy fields contradict the proposed child spec), a planning-time contradiction gate (plan can't fit parent's stated decomposition), or a decomposition-gate failure caused by a parent constraint.
- The user describes mid-flight learning that invalidates a node's prior shape ("we need to split this story", "the parent initiative was wrongly scoped", "external priorities changed and this branch should be retired").

Do **not** invoke for routine description edits, typo fixes, or phrasing changes — those go through `tusk_task_modify` directly. Reshape is for scope changes that invalidate prior assumptions and require an audit trail.

## Operating procedure

### 1. Detect Tusk context

- If invoked with an explicit `project=<id>` argument (id or name), look it up via `tusk_project_list`. Hard error if it isn't returned. Otherwise call `tusk_project_list` to identify the active project (filter by current context, or ask the user if multiple projects exist).
- Hard error if Tusk MCP is unreachable. Point at `templates/wbs/taxonomy.md` for setup.
- Hard error if the project has no taxonomy. Surface the recommended taxonomy from `templates/wbs/taxonomy.md` and offer to apply it.
- Hard error if the project's workflow has no terminal cancelled / won't-do status. Reshape archive semantics require it; surface the requirement and refuse to proceed until the workflow is updated.

### 2. Identify the focal node

In priority order:

1. Explicit `task=<id>` from `/wbs-reshape`.
2. Auto-invoke focal node passed by `wbs-orientation` (when delegated from an end-of-brainstorm, planning-time, or decomposition-gate trigger).
3. The most recently inspected, modified, or created Tusk task this session.
4. Ask the user, listing recent candidates via `tusk_task_list`.

Call `tusk_task_get <short-id>` to fetch the full task: level, description, status, parent, version.

### 3. Load original reasoning

Pull all of the following from Tusk MCP:

- The focal node's task object (already fetched in step 2).
- The newest non-archived `meta.type=spec` note on the focal node (`tusk_note_list task=<id> meta.type=spec`).
- The newest non-archived `meta.type=plan` note (`meta.type=plan`), if any.
- The newest non-archived `meta.type=reshape` note (a prior reshape on this node, if any) — surfaces lineage when this is the second or later reshape.
- Direct children: `tusk_task_list parent=<focal-id>`. For each, capture title, level, status, and the first 1–2 sentences of the description (one-line summary).
- Any descendants currently in `in_progress` or `in_review` status. Walk the subtree via repeated `tusk_task_list parent=<id>` calls, collecting these into a concurrency-watch list used in step 7.

If the focal node has no spec note, surface a warning: "This node has no `meta.type=spec` note — there's no original reasoning to load. Reshape will proceed but the audit note's `## Original Shape` section will be sparse." Allow the user to continue or abort.

### 4. Synthesize "what we wanted vs. what's here"

Before asking the user any reshape questions, produce a written summary the user reads. Format:

> **Original outcome:** <one line from the spec's outcome section>
>
> **Original reasoning:** <key Karpathy fields from the spec — Success Criteria, Tradeoffs Considered, Out of Scope — paraphrased into 2–3 sentences>
>
> **Current shape:** <focal node's current child list with levels and statuses; phasing summary if the node is phased>
>
> **Tradeoffs at design time:** <bullet list pulled from the spec's `## Tradeoffs Considered`>

This synthesis lands as a regular assistant message — not a Tusk note — and is the shared reference frame for the rest of the flow.

### 5. Capture the trigger

Ask the user, one question at a time. Do not batch.

1. *"What did you learn that triggered this reshape?"* — free text. Becomes the **Trigger** sentence and seeds the **Reasoning** section of the audit note.
2. *"Which pieces of the original reasoning no longer hold?"* — free text. Becomes the **Invalidated Assumptions** section. Cross-reference each item against the spec's `## Assumptions Made` field where possible.
3. *"What outcome do you now want?"* — free text. Becomes the seed brief for the wrapped brainstorming run in step 6.

These three answers are the load-bearing inputs to the reshape. Do not auto-fill any of them. If the user gives a one-word answer to the first question, prompt for elaboration — the audit note's value comes from the depth of the reasoning capture.

### 6. Wrapped brainstorming

Invoke the `brainstorming` skill via the Skill tool with a context shim describing:

- The synthesis from step 4.
- The trigger and invalidated assumptions from step 5.
- The level-appropriate description template (loaded from `templates/wbs/desc-<level>.md` based on the focal node's level — same loading rules as `wbs-orientation` step 3).
- The directive that brainstorming's terminal "Write design doc" output must land as a *new* `meta.type=spec` Tusk note on the focal node, **not** as `docs/superpowers/specs/<file>.md`.

Use the same wrapping mechanism documented in `wbs-orientation/SKILL.md` step 5 ("Subagent capture" preferred — invoke brainstorming as a subagent with instructions to return the final spec content as text rather than write it to disk; this orchestrator then posts it via `tusk_note_add` in step 8.2).

Brainstorming runs its normal loop (one question at a time, propose 2–3 approaches, present design sections). The synthesis from step 4 is the input context, not a constraint — the user is free to move scope in any direction, including dramatic departures from the original.

If brainstorming's spec content does not converge (user gives up, asks too many open questions, etc.), reshape can be aborted at this point with no mutations applied. No audit note is posted on abort.

### 7. Disposition decisions per direct child

For each direct child of the focal node (loaded in step 3), present the user with the new spec content from step 6 and ask one of:

- **Keep unchanged.** Leave the child alone. The new spec's children list still names this child.
- **Reparent.** The child belongs under a different parent in the new shape. Ask which parent — an existing Tusk task or a new one. If new, run `/wbs-new <free-form context including level cue and title> task=<grandparent-id>` first to create it. Apply the move via `tusk_task_modify parent=<new-parent-id>` (the child's subtree comes along automatically — Tusk reparents the whole subtree). Then ask: *"Reshape this child now under its new parent?"*
  - If **yes**: recurse into step 1 of this skill with the reparented child as the new focal node. The recursive run posts its own `meta.type=reshape` note; the parent reshape's audit note (this run's) lists the nested reshape note ID in its `## Nested Reshapes` section. If recursion depth from the top-level invocation exceeds 3, pause and confirm with the user that continued descent is intended — deeply-nested reshapes usually mean the wrong focal node was chosen at the top.
  - If **no**: capture the deferral. Step 8.6 patches the child's `## Open Questions` section once the audit note's short-id is known. Do not edit the child's description in step 7. The patch format applied at step 8.6 is: `Reshape under new parent <new-parent-id> context — deferred from reshape <audit-note-short-id> on <YYYY-MM-DD>.`
- **Archive.** The child no longer fits the new shape. Apply archive semantics (see "Archive semantics" below). Children of the archived child are archived recursively unless they have already been explicitly reparented out earlier in this loop.

For children currently in `in_progress` or `in_review` (from step 3's concurrency-watch list), issue a hard-confirm prompt before archive or reparent:

> *"Task #N (<title>) is in <in-flight-status>. Archiving / reparenting it will disrupt that work. Confirm? (y/N)"*

Default is **N**. Soft-mode skipping is not allowed. If the user declines, the child must be **kept unchanged** for this reshape — they can revisit after the in-flight work completes.

The user can also elect to **create new children** that didn't exist before. For each new child, run `/wbs-new <free-form context including level cue and title> task=<focal-id>` to scaffold it under the focal node. New children are listed in the audit note's `## New Shape` section as `**created via /wbs-new**`.

### 8. Apply mutations

Apply in this exact order. Each step is a single Tusk MCP call (or a small bounded loop of them). If any step fails (version conflict, MCP error), surface the partial state with the IDs of what was applied so the user can recover manually — do not roll back automatically.

1. **Archive prior notes on the focal node.** For each non-archived `meta.type=spec | plan | brainstorm` note on the focal node, call `tusk_note_archive <note-short-id>`.
2. **Post the new `meta.type=spec` note** on the focal node, using the brainstorming output from step 6. Set `task=<focal-id>, meta.type=spec, body=<new-spec-content>`. Capture the returned note short-id for use in the audit note's references.
3. **Update the focal node's description** via `tusk_task_modify task=<focal-id> description=<new-description> version=<current-version>`. The new description has Karpathy fields populated from the new spec (paraphrased — the spec is the authoritative version, the description is the lean-ticket reference per `templates/wbs/conventions.md`). The `## <Children>` section is rebuilt from step 7's dispositions.
4. **Apply each child disposition.** For each direct child, in the order surfaced in step 7:
   - **Keep unchanged**: no-op.
   - **Reparent (with recursion)**: `tusk_task_modify task=<child-id> parent=<new-parent-id> version=<child-version>`. The recursive `wbs-reshape` invocation runs immediately after the modify call returns, before processing the next child. Its mutations land in this run's step 8 ordering and its own audit note posts as part of the recursive run; the parent-reshape note (this run's) is created in substep 5 and lists the recursive run's audit-note ID in its `## Nested Reshapes` section.
   - **Reparent (without recursion)**: `tusk_task_modify task=<child-id> parent=<new-parent-id> version=<child-version>`. Do not modify the child's description here — the deferred-reshape entry on `## Open Questions` is patched in substep 6, once the audit note's short-id is known.
   - **Archive**: see "Archive semantics" below for the four-step procedure.
5. **Post the `meta.type=reshape` audit note** on the focal node, using `templates/wbs/note-reshape.md` as the body shape. Set:
   - `task=<focal-id>`
   - `meta.type=reshape`
   - `meta.reshape-of-spec=<prior-spec-short-id>` (from step 3's loaded prior spec)
   - `meta.parent-reshape=<parent-reshape-short-id>` if this is a recursive run (the parent reshape's note ID is passed in via the recursion call)
   - `body=<populated-template>` — fill every section. Reasoning and Invalidated Assumptions must be the verbatim user input from step 5; do not paraphrase.

   Capture the returned audit-note short-id for substep 6.
6. **Patch deferred-reshape entries.** For each child marked "reparent without recursion" in substep 4, append a deferred-reshape entry to the child's `## Open Questions` section using the audit-note short-id from substep 5. Format: `Reshape under new parent <new-parent-id> context — deferred from reshape <audit-note-short-id> on <YYYY-MM-DD>.` Apply via `tusk_task_modify task=<child-id> description=<updated-description> version=<child-version>`. If no children are marked "reparent without recursion," substep 6 is a no-op.

If a `tusk_task_modify` call returns an optimistic-lock (version conflict) error, catch it. Re-fetch the affected task. Ask the user how to proceed: retry, manually merge, or abort the reshape. Never auto-merge.

### 9. Re-run the Karpathy decomposition gate

On the focal node's new description, verify all of the following — same checks as `wbs-orientation` step 7:

- `## Success Criteria` is non-empty and not just placeholder text.
- `## Assumptions Made` is non-empty (must read "none" if there genuinely are none).
- `## Open Questions` is non-empty (must read "none, because …" if genuinely none). Note: this section may now contain deferred-reshape pointers from step 7 — those satisfy non-emptiness but should not be the *only* content.
- `## Tradeoffs Considered` is non-empty.
- `## Out of Scope` is non-empty.
- The level-appropriate children section lists at least one child by title — or the node is intentionally a leaf.

If any check fails: name the missing or weak field(s), refuse to mark the reshape complete, and offer to walk the user through filling them. The reshape audit note has already been posted; the gate failure means follow-up work on the description is required before the node is ready for downstream use.

### 10. Return control

If invoked from `wbs-orientation` (auto-invoke from steps 5.7, 6.6, or 7), return a structured summary to the caller:

- Focal node short-id.
- New spec note short-id.
- Reshape audit note short-id.
- Disposition list per direct child (kept / reparented-to-X / archived / new).
- Whether the Karpathy gate passed (true/false; if false, list the failing fields).
- Whether any deferred reshapes were recorded.

The caller (`wbs-orientation`) decides whether to resume the original flow (pause-and-resume from step 5.7 or 6.6) or hand control back to the user.

If invoked explicitly via `/wbs-reshape`, control returns to the user. Print the same structured summary as a final message.

## Archive semantics

When a task is archived as part of this reshape, apply all of the following — in this order — for each archived task:

1. **Workflow transition.** Move the task to the project workflow's terminal cancelled / won't-do status. The status name is project-specific; query the workflow definition via `tusk_workflow_list` (or equivalent) and pick the terminal status. If no such status exists, error early in step 1 of the operating procedure (already covered).
2. **Tag stamp.** Add a `+reshape-archived` tag via `tusk_task_modify`.
3. **Description stamp.** Prepend a one-line marker to the task's description, preserving original content:

   ```markdown
   > **Archived by reshape on <YYYY-MM-DD>.** See reshape note <reshape-note-short-id> on <focal-node-short-id>.

   <original description preserved below>
   ```

4. **Note archival.** For every non-archived note on the task, call `tusk_note_archive <note-short-id>`.

**Cascade.** Children of the archived task that weren't explicitly reparented out in step 7 are archived recursively. Walk via `tusk_task_list parent=<archived-id>`, applying steps 1–4 to each. The cascade stops at any descendant that has been explicitly reparented out earlier in step 7 — that subtree has a new parent and stays alive.

**Concurrency guard.** Before archiving any task in `in_progress` or `in_review`, the hard-confirm prompt from step 7 applies. Default N. No soft skip.

**Reversal.** Archive is reversible by deliberate user action: reparent the archived task back into the live tree, transition out of the cancelled status, remove the `+reshape-archived` tag. This skill does not automate reversal — that's a separate user gesture.

## Error handling

| Failure | Behavior |
|---|---|
| Tusk MCP unavailable | Hard error in step 1. Pointer to `templates/wbs/taxonomy.md`. |
| Project has no taxonomy | Hard error in step 1. Offer to apply recommended taxonomy. |
| Project workflow has no terminal cancelled status | Hard error in step 1. Refuse to proceed. User fixes workflow first. |
| Focal node has no spec note | Warn in step 3. Allow user to abort or proceed with sparse audit note. |
| Brainstorm in step 6 doesn't converge | Allow abort. No mutations applied. No audit note posted. |
| User abandons after step 8 begins | Surface partial-state IDs of what was applied. Manual remediation by the user; reshape can be re-invoked to recover. |
| Concurrency block on `in_progress` / `in_review` task | Hard-confirm prompt. Default N. No soft skip. |
| Tusk version conflict on `tusk_task_modify` | Catch optimistic-lock error. Re-fetch the task. Ask user: retry / merge / abort. Never auto-merge. |
| Karpathy gate fails after reshape (step 9) | Audit note already posted. Refuse to mark reshape complete. Walk user through filling the failing fields. Do not roll back the audit note. |
| Recursive reshape on reparented child fails | The parent reshape's audit note still posts. The failed nested reshape is listed in `## Nested Reshapes` with a "(failed)" suffix and the partial-state IDs. |

## Design references

- Spec: `docs/superpowers/specs/2026-05-01-wbs-reshape-design.md`
- Conventions: `templates/wbs/conventions.md` (sections "Reshaping", "Archive semantics", "Deferred reshapes")
- Audit-note template: `templates/wbs/note-reshape.md`
- Wrapped brainstorming pattern: `wbs-orientation/SKILL.md` step 5
- Auto-invoke triggers in `wbs-orientation`: steps 5.7 (end-of-brainstorm), 6.6 (planning-time), 7 (decomposition-gate failure escape hatch)
