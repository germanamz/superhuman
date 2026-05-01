# /wbs-reshape — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/wbs-reshape` — a command and matching skill that lets WBS authors change direction mid-flight by re-brainstorming a node with full context of its original reasoning, then archiving / reparenting / keeping descendants based on the new shape. Auto-invokes from `wbs-orientation` when end-of-brainstorm, planning-time, or decomposition-gate signals indicate contradiction with parent context.

**Architecture:** One new SKILL.md (`wbs-reshape`), one new command (`/wbs-reshape`), one new audit-note template (`note-reshape.md`), targeted edits to `wbs-orientation/SKILL.md` and `templates/wbs/conventions.md`, plus a small companion section in `wbs-user-guide.md`. No new code path — the skill orchestrates Tusk MCP calls (`tusk_task_get`, `tusk_task_modify`, `tusk_note_add`, `tusk_note_archive`) and wraps the existing `brainstorming` skill.

**Tech Stack:** Markdown with YAML frontmatter; the `superpowers:writing-skills` skill governs SKILL.md authoring; `jq` for marketplace-catalog validation; `head` / `grep` / `awk` for inline frontmatter checks; Tusk MCP for runtime workflow operations (no test runner — content artifacts plus manual end-to-end walkthrough).

**Spec:** [`docs/superpowers/specs/2026-05-01-wbs-reshape-design.md`](../specs/2026-05-01-wbs-reshape-design.md).

---

### Task 1: Author the `note-reshape.md` audit-note template

**Files:**
- Create: `plugins/superhuman/templates/wbs/note-reshape.md`

This template is the shape of the `meta.type=reshape` note posted on the focal node at skill step 8.5 (per spec Component 3). The skill references it by path; landing it first means later tasks can rely on it existing.

- [ ] **Step 1: Confirm the templates directory exists**

Run: `ls plugins/superhuman/templates/wbs/`

Expected: existing files include `conventions.md`, `taxonomy.md`, `desc-*.md`, `note-*.md` files. Confirm the directory.

- [ ] **Step 2: Write the template file**

Write to `plugins/superhuman/templates/wbs/note-reshape.md`:

```markdown
# Reshape — <focal-node-title> (<short-id>) — <YYYY-MM-DD>

<!--
Audit-note template for `meta.type=reshape` notes posted on the focal node by the wbs-reshape skill.

Tusk metadata to set when creating this note:
  meta.type=reshape
  meta.reshape-of-spec=<short-id of the spec note this reshape supersedes>
  meta.parent-reshape=<short-id of parent reshape note, if this is a nested reshape>

The Reasoning section is load-bearing — capture the user's explanation of what was learned, not a mechanical diff. A future reader sees the prior spec, the new spec, and this note bridges them with the learning.
-->

## Trigger
<One sentence: what surfaced the need to reshape. Captured verbatim from the skill's step-5 trigger question.>

## Reasoning
<Multi-paragraph free text. The user's full explanation of what was learned, why the original shape no longer holds, and what the new direction is. Load-bearing — do not abbreviate.>

## Invalidated Assumptions
<Bullet list of original assumptions (from the prior spec note's "Assumptions Made" section) that no longer hold, with one-line "why" for each.>

- **<assumption>** — <why it no longer holds>

## Original Shape (before reshape)
- Outcome: <one line from prior spec>
- Children:
  - <child short-id> "<title>" — <level>
  - …

## New Shape (after reshape)
- Outcome: <one line from new spec — link to new spec note ID>
- Children:
  - <child short-id> "<title>" — <level> — **kept unchanged**
  - <child short-id> "<title>" — <level> — **reparented to <new-parent-id>**
  - <child short-id> "<title>" — <level> — **archived**
  - <NEW> "<title>" — <level> — **created via /wbs-new**

## Deferred Reshapes
<Children reparented but not reshaped now. Their description's `## Open Questions` section was updated with a "Reshape under new parent context" entry. Listed here for traceability.>

- <child short-id> — reparented to <new-parent-id>; reshape deferred
- (none)

## Nested Reshapes
<Reshape notes posted on descendants during this flow's recursion. By note short-id.>

- <reshape-note-id> on <child short-id>
- (none)

## References
- Prior spec note: <short-id> (archived)
- New spec note: <short-id>
- Prior plan note (if any): <short-id> (archived)
- Parent reshape note (if nested): <short-id>
```

- [ ] **Step 3: Verify the file lands at the expected path**

Run: `ls -l plugins/superhuman/templates/wbs/note-reshape.md`

Expected: file exists, non-zero size.

- [ ] **Step 4: Verify the H2 headings match the spec's note structure**

Run: `grep -n "^## " plugins/superhuman/templates/wbs/note-reshape.md`

Expected output (line numbers may vary):
```
17:## Trigger
20:## Reasoning
23:## Invalidated Assumptions
28:## Original Shape (before reshape)
34:## New Shape (after reshape)
42:## Deferred Reshapes
48:## Nested Reshapes
54:## References
```

(Exact line numbers depend on whitespace; the heading set is what matters.)

- [ ] **Step 5: Commit**

```bash
git add plugins/superhuman/templates/wbs/note-reshape.md
git commit -m "Add WBS reshape audit-note template"
```

---

### Task 2: Author the `wbs-reshape` SKILL.md

**Files:**
- Create: `plugins/superhuman/skills/wbs-reshape/SKILL.md`

This is the orchestrator skill for the reshape workflow (per spec Component 1). It is **rigid** — step order is enforced. Wraps the `brainstorming` skill, runs the Karpathy gate, and posts the audit note from Task 1.

- [ ] **Step 1: Invoke `superpowers:writing-skills` for SKILL.md authoring discipline**

Skill tool call: `skill: superpowers:writing-skills, args: "Authoring plugins/superhuman/skills/wbs-reshape/SKILL.md per the design spec at docs/superpowers/specs/2026-05-01-wbs-reshape-design.md (Component 1)."`

Read the skill's guidance, then proceed to step 2.

- [ ] **Step 2: Create the directory**

Run: `mkdir -p plugins/superhuman/skills/wbs-reshape`

- [ ] **Step 3: Write the SKILL.md file**

Write to `plugins/superhuman/skills/wbs-reshape/SKILL.md`:

```markdown
---
name: wbs-reshape
description: Re-brainstorm a WBS node with full original context and apply the resulting structural change — archive, reparent, or keep descendants — when discovery during brainstorming, planning, or implementation contradicts an earlier shape. Auto-invoked by wbs-orientation on end-of-brainstorm, planning-time, or decomposition-gate-failure triggers; also invoked explicitly via `/wbs-reshape <task-id>`.
---

# WBS Reshape

This is the reshape orchestrator skill for the Superhuman WBS spine. It is **rigid** — the order of operations below is enforced. Read `templates/wbs/conventions.md` (in the same plugin) before diverging from any step.

The skill's purpose is *context-aware re-brainstorm*, not mechanical subtree editing. When a node's prior spec/plan no longer fits, this skill loads the original reasoning, captures what was learned, wraps the `brainstorming` skill with that context, and walks per-child disposition decisions (keep / reparent / archive). Reparented children whose own subtrees need reshaping recurse through this same workflow at the user's election.

## When to invoke

Invoke when ANY of the following is true:

- The user runs `/wbs-reshape <task-id>` (or `/wbs-reshape` with focal node from session context).
- The `wbs-orientation` skill delegates to this skill on an end-of-brainstorm contradiction gate (parent's Karpathy fields contradict the proposed child spec), a planning-time contradiction gate (plan can't fit parent's stated decomposition), or a decomposition-gate failure caused by a parent constraint.
- The user describes mid-flight learning that invalidates a node's prior shape ("we need to split this story", "the parent initiative was wrongly scoped", "external priorities changed and this branch should be retired").

Do **not** invoke for routine description edits, typo fixes, or phrasing changes — those go through `tusk_task_modify` directly. Reshape is for scope changes that invalidate prior assumptions and require an audit trail.

## Operating procedure

### 1. Detect Tusk context

- If invoked with an explicit `project=<name>` argument, look it up via `tusk_project_list` and filter for the named project. Hard error if it isn't returned. Otherwise call `tusk_project_list` to identify the active project (filter by current context, or ask the user if multiple projects exist).
- Hard error if Tusk MCP is unreachable. Point at `templates/wbs/taxonomy.md` for setup.
- Hard error if the project has no taxonomy. Surface the recommended taxonomy from `templates/wbs/taxonomy.md` and offer to apply it.
- Hard error if the project's workflow has no terminal cancelled / won't-do status. Reshape archive semantics require it; surface the requirement and refuse to proceed until the workflow is updated.

### 2. Identify the focal node

In priority order:

1. Explicit task ID from `/wbs-reshape <id>`.
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
- **Reparent.** The child belongs under a different parent in the new shape. Ask which parent — an existing Tusk task or a new one. If new, run `/wbs-new <level> "<title>"` first to create it. Apply the move via `tusk_task_modify parent=<new-parent-id>` (the child's subtree comes along automatically — Tusk reparents the whole subtree). Then ask: *"Reshape this child now under its new parent?"*
  - If **yes**: recurse into step 1 of this skill with the reparented child as the new focal node. The recursive run posts its own `meta.type=reshape` note; the parent reshape's audit note (this run's) lists the nested reshape note ID in its `## Nested Reshapes` section. If recursion depth from the top-level invocation exceeds 3, pause and confirm with the user that continued descent is intended — deeply-nested reshapes usually mean the wrong focal node was chosen at the top.
  - If **no**: capture the deferral. Step 8.6 patches the child's `## Open Questions` section once the audit note's short-id is known. Do not edit the child's description in step 7. The patch format applied at step 8.6 is: `Reshape under new parent <new-parent-id> context — deferred from reshape <audit-note-short-id> on <YYYY-MM-DD>.`
- **Archive.** The child no longer fits the new shape. Apply archive semantics (see "Archive semantics" below). Children of the archived child are archived recursively unless they have already been explicitly reparented out earlier in this loop.

For children currently in `in_progress` or `in_review` (from step 3's concurrency-watch list), issue a hard-confirm prompt before archive or reparent:

> *"Task #N (<title>) is in <in-flight-status>. Archiving / reparenting it will disrupt that work. Confirm? (y/N)"*

Default is **N**. Soft-mode skipping is not allowed. If the user declines, the child must be **kept unchanged** for this reshape — they can revisit after the in-flight work completes.

The user can also elect to **create new children** that didn't exist before. For each new child, run `/wbs-new <level> "<title>"` to scaffold it under the focal node. New children are listed in the audit note's `## New Shape` section as `**created via /wbs-new**`.

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
```

- [ ] **Step 4: Verify frontmatter**

Run: `head -4 plugins/superhuman/skills/wbs-reshape/SKILL.md`

Expected: file starts with `---`, then `name: wbs-reshape`, then the description line (one long line), then `---`.

- [ ] **Step 5: Verify name matches directory**

Run: `test "$(grep '^name:' plugins/superhuman/skills/wbs-reshape/SKILL.md | head -1 | awk '{print $2}')" = "wbs-reshape" && echo OK`

Expected: `OK`

- [ ] **Step 6: Verify the operating-procedure step structure**

Run: `grep -n "^### [0-9]\+\." plugins/superhuman/skills/wbs-reshape/SKILL.md`

Expected: ten `### N. <heading>` lines numbered 1 through 10.

- [ ] **Step 7: Commit**

```bash
git add plugins/superhuman/skills/wbs-reshape/SKILL.md
git commit -m "Add wbs-reshape skill to superhuman plugin"
```

---

### Task 3: Author the `/wbs-reshape` command

**Files:**
- Create: `plugins/superhuman/commands/wbs-reshape.md`

The command is thin — it resolves project + task-id arguments and hands off to the `wbs-reshape` skill via the Skill tool. All workflow logic lives in the skill (per spec Component 2).

- [ ] **Step 1: Read the existing `/wbs-new` command for style reference**

Run: `cat plugins/superhuman/commands/wbs-new.md | head -25`

Expected: confirms the frontmatter shape (`description:`, `argument-hint:`) and procedure-list style. The new command follows the same pattern.

- [ ] **Step 2: Write the command file**

Write to `plugins/superhuman/commands/wbs-reshape.md`:

```markdown
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
```

- [ ] **Step 3: Verify the file exists and has the expected frontmatter**

Run: `head -4 plugins/superhuman/commands/wbs-reshape.md`

Expected:
```
---
description: Reshape a WBS node — re-brainstorm its outcome with full original context, then archive/reparent/keep descendants based on the new shape. Use when discovery during brainstorming, planning, or implementation contradicts an earlier shape.
argument-hint: [task-id] [project=<name>]
---
```

- [ ] **Step 4: Verify the command references the skill by plugin-namespaced name**

Run: `grep -c "superhuman:wbs-reshape" plugins/superhuman/commands/wbs-reshape.md`

Expected: a number ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add plugins/superhuman/commands/wbs-reshape.md
git commit -m "Add /wbs-reshape slash command"
```

---

### Task 4: Update `templates/wbs/conventions.md`

**Files:**
- Modify: `plugins/superhuman/templates/wbs/conventions.md`

Add three new sections (Reshaping, Archive semantics, Deferred reshapes), update the "Tag and metadata naming" section, and append a paragraph to "Bypass consequences" (per spec Component 5).

- [ ] **Step 1: Read the current conventions doc to confirm anchor points**

Run: `grep -n "^## " plugins/superhuman/templates/wbs/conventions.md`

Expected output (current state):
```
1:# WBS Conventions
5:## Right-sized descriptions
13:## Lean tickets, rich notes
17:## Karpathy forcing functions
29:## When to phase
41:## Tag and metadata naming
49:## Decomposition gate
59:## Bypass consequences
```

The new sections "Reshaping", "Archive semantics", and "Deferred reshapes" go after "Decomposition gate" (line 49 region) and before "Bypass consequences". The "Tag and metadata naming" edit (line 41 region) gets new bullets. The "Bypass consequences" section (line 59 region) gets an appended paragraph.

- [ ] **Step 2: Append the three new sections after "Decomposition gate"**

Find the existing "Decomposition gate" section's last paragraph (the one ending "...The user (or agent) must populate them deliberately."). Insert the following three sections immediately after, before the existing "## Bypass consequences" heading:

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

## Archive semantics

When a task is archived by reshape:

- It transitions to the workflow's terminal cancelled status. If the project workflow has no cancelled status, reshape refuses to proceed.
- It gets a `+reshape-archived` tag, distinguishing reshape-archive from user-driven cancellation.
- Its description is prepended with a one-line stamp pointing at the reshape note: `> **Archived by reshape on <YYYY-MM-DD>.** See reshape note <short-id> on <focal-node-id>.` — original content preserved below.
- All non-archived notes on the task are archived via `tusk_note_archive`.
- Descendants that weren't explicitly reparented out are archived recursively.
- Tasks in `in_progress` or `in_review` require user confirmation before archive — no soft skip.

Archive is reversible by deliberate user action (reparent back into the live tree, transition out of cancelled, remove the tag). Hard delete is never used.

## Deferred reshapes

When a child is reparented during a reshape but the user declines to reshape it now under its new parent, the child gets an explicit `## Open Questions` entry: "Reshape under new parent <new-parent-id> context — deferred from reshape <short-id> on <YYYY-MM-DD>." The next time the Karpathy gate runs on that child (e.g., before its decomposition or before it's brainstormed again), the open question forces resolution. Deferred reshapes are also listed in the focal node's reshape audit note.
```

- [ ] **Step 3: Update the "Tag and metadata naming" section**

Replace the current bullet list (currently four bullets) with this expanded list — preserve the existing four entries and add three new entries:

```markdown
- Phase identification: tag children `+phase-1`, `+phase-2`, etc.
- Note types: `meta.type=brainstorm | spec | plan | phase-plan | reshape`
- Phase association on notes: `meta.phase=phase-1`, `meta.phase=phase-2`
- Reshape lineage on reshape notes: `meta.reshape-of-spec=<spec-note-id>`, `meta.parent-reshape=<reshape-note-id>` (when nested)
- Archive marker on tasks: tag `+reshape-archived`
- WBS-specific reserved namespace: any tag or metadata key prefixed with `wbs-`
```

The two changes vs. the existing list: the `meta.type=` line now includes `reshape`; two new bullets ("Reshape lineage..." and "Archive marker on tasks...") are added before the existing `wbs-` namespace bullet.

- [ ] **Step 4: Append a paragraph to "Bypass consequences"**

After the existing final paragraph of the "Bypass consequences" section (which currently ends "...copy it manually into a note via `tusk_note_add` and archive or delete the file."), append:

```markdown

If you mutate a node's description directly via `tusk_task_modify` to change its scope (instead of running `/wbs-reshape`), the prior reasoning is lost — there's no audit note bridging the old and new shape. The orchestrator does not detect this after the fact. Convention: scope changes that invalidate prior assumptions go through `/wbs-reshape`; trivial typo-fixes and phrasing edits do not.
```

- [ ] **Step 5: Verify the new section headings landed in the right order**

Run: `grep -n "^## " plugins/superhuman/templates/wbs/conventions.md`

Expected order (line numbers will shift):
```
## Right-sized descriptions
## Lean tickets, rich notes
## Karpathy forcing functions
## When to phase
## Tag and metadata naming
## Decomposition gate
## Reshaping
## Archive semantics
## Deferred reshapes
## Bypass consequences
```

- [ ] **Step 6: Verify the metadata bullet list contains the new entries**

Run: `grep -E "(meta.type=.*reshape|reshape-of-spec|reshape-archived)" plugins/superhuman/templates/wbs/conventions.md | wc -l`

Expected: a number ≥ 3 (one bullet for `meta.type=...reshape`, one for `meta.reshape-of-spec`/`meta.parent-reshape`, one for `+reshape-archived`).

- [ ] **Step 7: Verify the bypass-consequences paragraph landed**

Run: `grep "scope changes that invalidate prior assumptions" plugins/superhuman/templates/wbs/conventions.md`

Expected: one matching line.

- [ ] **Step 8: Commit**

```bash
git add plugins/superhuman/templates/wbs/conventions.md
git commit -m "Document reshape, archive, and deferred-reshape conventions"
```

---

### Task 5: Update `wbs-orientation/SKILL.md` with reshape integration

**Files:**
- Modify: `plugins/superhuman/skills/wbs-orientation/SKILL.md`

Six edits per spec Component 6: add reshape as a fourth common operation in step 4; add the end-of-brainstorm contradiction gate as substep 5.7; add the planning-time gate as substep 6.6; add the reshape escape-hatch paragraph to step 7; insert the new "Step 5a — Soft-mode reshape hints" subsection between steps 5 and 6; add a new step 11 "Wrapped reshape" at the end of the operating procedure.

- [ ] **Step 1: Read the current SKILL.md to confirm line anchors**

Run: `grep -n "^### " plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected output (current state):
```
22:### 1. Detect Tusk context
28:### 2. Identify the current node
35:### 3. Load the right template
47:### 4. Decide the operation
57:### 5. Wrapped brainstorming
75:### 6. Wrapped writing-plans
87:### 7. Enforce the Karpathy decomposition gate
100:### 8. Decomposition transition
108:### 9. Right-sized description warnings
117:### 10. Surface References
```

- [ ] **Step 2: Edit step 4 — add reshape as the fourth common operation**

In `plugins/superhuman/skills/wbs-orientation/SKILL.md`, find the current step-4 body that begins:

```
Three operations are common:

- **Brainstorm a node's design.** Use when the node's description has empty Karpathy fields. Go to "Wrapped brainstorming."
- **Plan a Story's implementation.** Use when a Story has its spec note populated and is ready for implementation planning. Go to "Wrapped writing-plans."
- **Decompose a node into children.** Use when the description's Karpathy fields are populated and the user wants to create the next-rank-down children. Go to "Decomposition transition."

If unclear, ask the user which operation they want.
```

Replace with:

```
Four operations are common:

- **Brainstorm a node's design.** Use when the node's description has empty Karpathy fields. Go to "Wrapped brainstorming."
- **Plan a Story's implementation.** Use when a Story has its spec note populated and is ready for implementation planning. Go to "Wrapped writing-plans."
- **Decompose a node into children.** Use when the description's Karpathy fields are populated and the user wants to create the next-rank-down children. Go to "Decomposition transition."
- **Reshape a node.** Use when the node's prior spec/plan no longer fits — context shifted, parent scope was wrong, learning during brainstorming/planning surfaced contradiction. Go to "Wrapped reshape."

If unclear, ask the user which operation they want.
```

- [ ] **Step 3: Edit step 5 — add the end-of-brainstorm contradiction gate as substep 7**

In the existing step-5 body, the substeps end with:

```
6. When brainstorming's terminal step would invoke `writing-plans`, wrap that the same way (see step 6).
```

Append a new substep 7 immediately after substep 6, before the section ends (i.e., before the `### 6. Wrapped writing-plans` heading or any blank line that precedes it):

```
7. **End-of-brainstorm contradiction gate.** Before brainstorming posts the new `meta.type=spec` note via `tusk_note_add`, compare the proposed spec against the parent node's Karpathy fields (`Out of Scope`, `Success Criteria`). If the proposed spec contradicts the parent — for example, the new design needs a capability the parent's "Out of Scope" rules out — surface the contradiction with three choices:

   - **(1) Reshape the parent now (pause-and-resume).** Invoke `superhuman:wbs-reshape` via the Skill tool with the parent as focal node. After it completes (or aborts), re-load the now-refreshed parent context and re-evaluate whether the in-flight spec for this child still makes sense.
   - **(2) Accept the deviation.** Post the spec as-is. Add an entry to the spec note's `## Open Questions` section: "Diverges from parent <parent-id> Out of Scope: <field>. Accepted on <YYYY-MM-DD> pending parent reshape." This becomes a forcing function for whoever later reshapes the parent.
   - **(3) Abandon this brainstorm.** Discard the in-flight spec content. Reshape the parent first (offer to invoke `superhuman:wbs-reshape` on the parent now), then start the child brainstorm fresh under refreshed context.

   Default to none — the user must pick. Do not auto-decide.
```

- [ ] **Step 4: Insert the "Step 5a — Soft-mode reshape hints" subsection between steps 5 and 6**

After the new substep 7 (end of step 5's body), insert a new top-level subsection labeled `### 5a. Soft-mode reshape hints` *before* the existing `### 6. Wrapped writing-plans` heading:

```markdown
### 5a. Soft-mode reshape hints

While running wrapped brainstorming (step 5) or wrapped writing-plans (step 6), if user phrasing strongly suggests structural drift — phrases like "this contradicts X," "this is actually two stories," "we should split this," "this doesn't fit under <parent>" — emit a one-line hint, *not* a blocking prompt:

> *"Sounds like the shape might need to change. If so, you can run `/wbs-reshape <task-id>` to drive that explicitly, or keep going and the end-of-brainstorm gate will check for contradictions automatically."*

Emit at most once per brainstorm/plan invocation. Do not interrupt the flow. The hard gates in steps 5.7, 6.6, and 7 are the authoritative triggers.
```

- [ ] **Step 5: Edit step 6 — add the planning-time contradiction gate as substep 6**

In the existing step-6 body, the substeps end with:

```
5. Each task in the plan becomes a child Tusk task at `level=task` parented to the Story, tagged `+phase-N` if the plan is phased. Use `/wbs-new task` for each — do not bypass the command.
```

Append a new substep 6 immediately after substep 5, before the `### 7. Enforce the Karpathy decomposition gate` heading:

```
6. **Planning-time contradiction gate.** Before posting the plan note, check whether the produced plan can fit the parent Initiative's stated decomposition. Specifically: does the plan require a phase, dependency, or scope element that contradicts the parent's `## Phasing`, `## Out of Scope`, or `## Tradeoffs Considered`? If so, surface the same three-choice prompt described in step 5.7, scoped to the parent of this Story's Initiative (or the nearest ancestor whose Karpathy fields are contradicted). Same defaults: user picks; never auto-decide.
```

- [ ] **Step 6: Edit step 7 — append the reshape escape hatch paragraph**

The current step 7 body ends with:

```
If any check fails: name the missing or weak field(s), refuse to proceed with decomposition, and offer to walk the user through filling them. **Never auto-fill.** Empty fields must be deliberate.
```

Append a new paragraph immediately after, before the `### 8. Decomposition transition` heading:

```
**Reshape escape hatch.** If the gate fails specifically because the node's design conflicts with a parent constraint (for example, the user can't write `## Success Criteria` without violating the parent's `## Out of Scope`), the right answer is reshape, not field-massaging. Surface the three-choice prompt from step 5.7, scoped to the parent. The user picks: reshape the parent, accept the deviation as a recorded divergence, or abandon and restart.
```

- [ ] **Step 7: Add a new step 11 — "Wrapped reshape"**

After the existing `### 10. Surface References` section's body, before the `## Error handling` heading, insert:

```markdown
### 11. Wrapped reshape

When reshaping a node — explicit `/wbs-reshape` invocation, or one of the gate-driven offers from steps 5.7 / 6.6 / 7:

1. Invoke the `superhuman:wbs-reshape` skill via the Skill tool, passing the focal node's short ID and (if the trigger surfaced one) the contradicting parent context.
2. The reshape skill drives its own loop — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note. See `plugins/superhuman/skills/wbs-reshape/SKILL.md`.
3. When reshape completes, it returns a structured summary (focal node ID, new spec note ID, audit note ID, disposition list, gate-pass flag).
4. **If reshape was invoked from step 5.7 or 6.6 (pause-and-resume)**: reload the now-refreshed parent context. Re-display the in-flight child spec or plan. Ask the user: "Parent context has been reshaped. Does the in-flight content for this child still make sense, or do you want to revise?" Revise → restart the child's wrapped brainstorming/writing-plans flow with refreshed context. Keep → proceed to commit.
5. **If reshape was invoked from step 7 (gate failure)**: re-run the Karpathy gate on the original child node. If it now passes, proceed with decomposition transition. If it still fails for an unrelated reason, surface that.
6. **If reshape was invoked explicitly via `/wbs-reshape`**: control returns to the user. No automatic resume.
```

- [ ] **Step 8: Verify the new step structure**

Run: `grep -n "^### " plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected output (the new step 5a appears between 5 and 6; the new step 11 appears at the end of the operating procedure):

```
### 1. Detect Tusk context
### 2. Identify the current node
### 3. Load the right template
### 4. Decide the operation
### 5. Wrapped brainstorming
### 5a. Soft-mode reshape hints
### 6. Wrapped writing-plans
### 7. Enforce the Karpathy decomposition gate
### 8. Decomposition transition
### 9. Right-sized description warnings
### 10. Surface References
### 11. Wrapped reshape
```

(Line numbers omitted — heading order is what matters.)

- [ ] **Step 9: Verify reshape cross-references**

Run: `grep -n "superhuman:wbs-reshape\|wbs-reshape\|Wrapped reshape\|Reshape escape hatch\|Soft-mode reshape" plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected: at least 8 matching lines covering step 4 mention, step 5.7 (×2 references), step 5a, step 6.6, step 7 escape hatch, step 11 heading, step 11 body.

- [ ] **Step 10: Verify step 5 has 7 substeps and step 6 has 6 substeps**

Run: `awk '/^### 5\. Wrapped brainstorming/,/^### 5a/' plugins/superhuman/skills/wbs-orientation/SKILL.md | grep -cE '^[0-9]+\. \*\*'`

Expected: `7`

Run: `awk '/^### 6\. Wrapped writing-plans/,/^### 7\./' plugins/superhuman/skills/wbs-orientation/SKILL.md | grep -cE '^[0-9]+\. \*\*'`

Expected: `6`

(These counts confirm the new substeps 5.7 and 6.6 landed in the right places without disturbing existing substeps.)

- [ ] **Step 11: Commit**

```bash
git add plugins/superhuman/skills/wbs-orientation/SKILL.md
git commit -m "Wire reshape into wbs-orientation operating procedure

Adds:
- Step 4: reshape as fourth common operation
- Step 5.7: end-of-brainstorm contradiction gate
- Step 5a: soft-mode reshape hints
- Step 6.6: planning-time contradiction gate
- Step 7: reshape escape hatch on Karpathy gate failure
- Step 11: wrapped reshape orchestration"
```

---

### Task 6: Add a "Changing direction mid-flight" section to `wbs-user-guide.md`

**Files:**
- Modify: `docs/superpowers/wbs-user-guide.md`

The companion edit named in spec Component 5 — give human readers a short pointer to `/wbs-reshape` from the user guide.

- [ ] **Step 1: Confirm the user guide exists and find the right insertion point**

Run: `grep -n "^## " docs/superpowers/wbs-user-guide.md`

Expected: a list of H2 sections. Identify the section near the end that covers "what happens when things go wrong" or a similar topic — the new section goes after the daily-workflow content and before any closing sections.

- [ ] **Step 2: Append a new "Changing direction mid-flight" section**

Append the following section to `docs/superpowers/wbs-user-guide.md` at an appropriate spot (typically near the end, after the phasing and decomposition discussion). If the guide has a closing "Troubleshooting" or "FAQ" section, this goes immediately before it; otherwise, append at the end:

```markdown
## Changing direction mid-flight

The WBS is built top-down, but you'll often discover that an earlier shape was wrong only when working a child:

- Brainstorming a Story reveals the parent Initiative ruled out something the new design needs.
- Implementation surfaces that a Story should be split into two.
- Priorities shift and a whole branch should be retired.

When this happens, run `/wbs-reshape <task-id>` on the node whose shape needs to change. The reshape skill will:

1. Load the original spec, plan, and child outline so you can see *why* the current shape was drawn.
2. Ask what you learned that triggered the reshape (free text — capture this thoroughly; the reasoning is what makes the audit note valuable).
3. Run the brainstorming skill with that context to develop the new shape.
4. For each direct child of the focal node, ask: keep unchanged, reparent (subtree comes along — Tusk handles it), or archive.
5. Post a `meta.type=reshape` note on the focal node capturing the trigger, reasoning, invalidated assumptions, original shape, and new shape. This is the audit trail.
6. Re-run the Karpathy gate on the new description.

Reshape is reversible by deliberate action — archived tasks remain queryable, and you can reparent them back into the live tree if you change your mind. Hard delete is never used.

You don't always have to invoke `/wbs-reshape` explicitly. While brainstorming or planning, the orchestrator watches for contradictions with parent scope. If it detects one, it will surface a three-choice prompt:

- **Reshape the parent now** (pause your current brainstorm/plan, fix the parent, then resume).
- **Accept the deviation** (record the divergence as an `## Open Questions` entry on your child spec — becomes a forcing function for whoever reshapes the parent later).
- **Abandon this brainstorm** (drop the in-flight content, reshape the parent first, restart fresh).

Use `/wbs-reshape` for scope changes that invalidate prior assumptions. Trivial typo-fixes and phrasing edits don't need it — those go through `tusk_task_modify` directly.
```

- [ ] **Step 3: Verify the section landed**

Run: `grep -n "Changing direction mid-flight" docs/superpowers/wbs-user-guide.md`

Expected: exactly one matching H2 heading line.

- [ ] **Step 4: Verify the section references `/wbs-reshape`**

Run: `grep -c "/wbs-reshape" docs/superpowers/wbs-user-guide.md`

Expected: a number ≥ 2.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/wbs-user-guide.md
git commit -m "Document /wbs-reshape in the WBS user guide"
```

---

### Task 7: Static verification of all artifacts

**Files:**
- Verify (no changes): `plugins/superhuman/templates/wbs/note-reshape.md`, `plugins/superhuman/skills/wbs-reshape/SKILL.md`, `plugins/superhuman/commands/wbs-reshape.md`, `plugins/superhuman/templates/wbs/conventions.md`, `plugins/superhuman/skills/wbs-orientation/SKILL.md`, `docs/superpowers/wbs-user-guide.md`, `.claude-plugin/marketplace.json`.

- [ ] **Step 1: Confirm all new files exist**

Run:
```bash
ls plugins/superhuman/templates/wbs/note-reshape.md \
   plugins/superhuman/skills/wbs-reshape/SKILL.md \
   plugins/superhuman/commands/wbs-reshape.md
```

Expected: all three paths print, no "No such file" errors.

- [ ] **Step 2: Confirm `wbs-reshape` SKILL.md frontmatter is valid YAML**

Run:
```bash
python3 -c "
import yaml
content = open('plugins/superhuman/skills/wbs-reshape/SKILL.md').read()
parts = content.split('---', 2)
assert len(parts) >= 3, 'no frontmatter delimiters'
fm = yaml.safe_load(parts[1])
assert 'name' in fm and 'description' in fm, 'missing name or description'
assert fm['name'] == 'wbs-reshape', f\"name mismatch: {fm['name']}\"
print('wbs-reshape SKILL.md OK')
"
```

Expected: `wbs-reshape SKILL.md OK`

- [ ] **Step 3: Confirm `/wbs-reshape` command frontmatter parses**

Run:
```bash
python3 -c "
import yaml
content = open('plugins/superhuman/commands/wbs-reshape.md').read()
parts = content.split('---', 2)
assert len(parts) >= 3, 'no frontmatter delimiters'
fm = yaml.safe_load(parts[1])
assert 'description' in fm and 'argument-hint' in fm, 'missing description or argument-hint'
print('/wbs-reshape command OK')
"
```

Expected: `/wbs-reshape command OK`

- [ ] **Step 4: Confirm wbs-orientation references the new skill**

Run: `grep -c "superhuman:wbs-reshape\|/wbs-reshape" plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected: a number ≥ 5 (covering step 4, 5.7, 6.6, 7 escape hatch, 11, plus the soft-mode hint at 5a).

- [ ] **Step 5: Confirm conventions doc references the new metadata**

Run: `grep -E "(meta.type=.*reshape|reshape-of-spec|reshape-archived|## Reshaping|## Archive semantics|## Deferred reshapes)" plugins/superhuman/templates/wbs/conventions.md | wc -l`

Expected: a number ≥ 6 (one per section heading, plus the metadata bullets).

- [ ] **Step 6: Confirm marketplace catalog still validates**

Run: `jq . .claude-plugin/marketplace.json > /dev/null && echo OK`

Expected: `OK`

- [ ] **Step 7: No commit needed**

Read-only verification. If any check fails, return to the relevant task and fix.

---

### Task 8: Plugin install verification (manual)

**Files:** None modified — manual verification only.

This task verifies the plugin loads cleanly and the new skill + command register correctly. Performed by the user, not the implementer subagent.

- [ ] **Step 1: Reinstall (or refresh) the superhuman plugin in Claude Code**

In a Claude Code session, run:

```
/plugin marketplace remove superhuman
/plugin marketplace add /Users/germanamz/projects/superhuman
/plugin install superhuman@superhuman
```

Expected: no parse errors, plugin installs cleanly.

- [ ] **Step 2: Verify the new skill appears in the skill registry**

In a Claude Code session, ask: "What `superhuman:` skills are available?"

Expected: response includes `superhuman:wbs-reshape` along with the existing `superhuman:wbs-orientation`, `superhuman:phase-planning-rules`, `superhuman:phase-continuity-review`, and `superhuman:phase-post-implementation-review`. The frontmatter description for `superhuman:wbs-reshape` should match what was authored in Task 2.

- [ ] **Step 3: Verify the `/wbs-reshape` command is invokable**

In a Claude Code session, type `/wbs-reshape` (no arguments).

Expected: command surface shows the description and argument-hint from the frontmatter. The command should not error on registration.

- [ ] **Step 4: Confirm wbs-orientation auto-invoke triggers point at the right skill**

In a Claude Code session, ask: "If a brainstorm contradicts the parent's Out of Scope, what does wbs-orientation do?"

Expected: response references step 5.7 (end-of-brainstorm contradiction gate) and the three-choice prompt, naming `superhuman:wbs-reshape` as the skill invoked for the "reshape the parent now" choice.

- [ ] **Step 5: No commit needed**

Manual verification.

---

### Task 9: Behavioral verification walkthrough (manual)

**Files:** None modified — manual end-to-end behavior check.

This task drives one full reshape end-to-end, exercising the explicit-invocation path, an auto-invoke trigger, and at least one disposition of each kind (keep / reparent / archive). Performed by the user (or a separate session), not the implementer subagent. Requires a Tusk MCP server with the WBS taxonomy applied.

- [ ] **Step 1: Set up a fresh test branch in a Tusk Project with WBS taxonomy**

Per `plugins/superhuman/templates/wbs/taxonomy.md`. Confirm `tusk_project_list` returns a project with `[[milestone], [initiative], [story], [task, spike]]` ranks. Confirm the project's workflow includes a terminal cancelled / won't-do status (reshape requires this).

- [ ] **Step 2: Build a small WBS subtree to reshape**

Create at least:
- One Initiative with a populated `meta.type=spec` note and Karpathy fields filled in.
- Two Stories under the Initiative, each with a `meta.type=spec` note.
- One Task under one of the Stories (`level=task`).

This is the test subtree. Use `/wbs-new initiative`, `/wbs-new story`, `/wbs-new task` and brainstorm each through `wbs-orientation`'s wrapped flow.

- [ ] **Step 3: Run explicit `/wbs-reshape` on the Initiative**

Run: `/wbs-reshape <initiative-short-id>` in a Claude Code session.

Expected:

- The skill loads the original spec/plan/children context (step 3).
- The skill produces a synthesis "Original outcome / Original reasoning / Current shape / Tradeoffs at design time" (step 4).
- The skill asks the three trigger questions one at a time (step 5).
- The skill invokes the `brainstorming` skill with the trigger context (step 6).
- The skill walks the two Stories one at a time, asking keep / reparent / archive (step 7).

- [ ] **Step 4: Exercise each disposition during step 7**

For the two Stories under the Initiative:

- Mark one as **kept unchanged**.
- Mark one as **archived**. Confirm the hard-confirm prompt fires if it has any in-flight tasks beneath it; default N; explicitly answer y to confirm.

This exercises keep + archive in one run. Reparent is exercised in step 6 (next).

- [ ] **Step 5: Confirm mutations applied in the right order**

After the reshape completes, query Tusk:

- The prior `meta.type=spec` note on the Initiative should be archived (`tusk_note_list task=<initiative-id> meta.type=spec` returns nothing in the default view; with `archived=true` returns the prior note).
- A new `meta.type=spec` note exists on the Initiative.
- A `meta.type=reshape` note exists on the Initiative with `meta.reshape-of-spec=<prior-spec-id>` set.
- The Initiative's description has been updated with new Karpathy fields.
- The kept Story is unchanged in shape.
- The archived Story has the `+reshape-archived` tag, is in the cancelled status, has the description stamp, and its notes are all archived.

- [ ] **Step 6: Run a second reshape that exercises reparent + recursion**

Run: `/wbs-reshape <kept-story-short-id>` and during step 7 reparent its Task to a *different* Initiative (create a new Initiative if needed via `/wbs-new`).

When the skill asks *"Reshape this child now under its new parent?"*, answer **yes**. Confirm the reshape recurses into the Task — capture trigger, brainstorm a new spec, post a nested `meta.type=reshape` note with `meta.parent-reshape=<parent-reshape-id>` set.

Verify after completion:

- The Task has a new parent (`tusk_task_get <task-id>` shows the new Initiative).
- The original Story's reshape note's `## Nested Reshapes` section lists the Task's reshape note short-id.
- The Task has a new `meta.type=spec` note and a `meta.type=reshape` note of its own.

- [ ] **Step 7: Auto-invoke trigger — end-of-brainstorm contradiction gate**

Brainstorm a new Story under one of the Initiatives, intentionally drafting a spec that contradicts the parent's `## Out of Scope`. Confirm `wbs-orientation` step 5.7 fires the three-choice prompt.

Test all three choices in separate runs:

- **(1) Reshape the parent now**: confirm `wbs-reshape` is invoked on the parent Initiative; confirm pause-and-resume returns to the in-flight child brainstorm with a "does this still make sense?" prompt after the parent reshape completes.
- **(2) Accept the deviation**: confirm the new spec is posted with the `## Open Questions` entry "Diverges from parent..." appended.
- **(3) Abandon this brainstorm**: confirm the in-flight content is discarded; confirm the offer to reshape the parent fires.

- [ ] **Step 8: Auto-invoke trigger — Karpathy gate failure escape hatch**

On any Story, attempt to decompose without filling `## Success Criteria` (so the gate fails). Frame the missing field as deriving from a parent constraint (e.g., the parent's `## Out of Scope` would forbid any non-trivial Success Criteria). Confirm the orchestrator surfaces the same three-choice prompt from step 5.7.

- [ ] **Step 9: Soft-mode hint**

During a fresh wrapped brainstorming session, type a phrase like "this contradicts the parent" or "this is actually two stories." Confirm the orchestrator emits the soft-mode hint *once*, without interrupting the flow. Continue the brainstorm — confirm the hint does not fire a second time on similar phrasing.

- [ ] **Step 10: Bypass tolerance**

Mutate a node's description directly via `tusk_task_modify` (no `/wbs-reshape` invocation) to change its `## Out of Scope`. Confirm:

- No reshape note is posted.
- The change goes through (this is the documented bypass — the orchestrator does not detect post-hoc).
- The `wbs-user-guide.md` "Changing direction mid-flight" section's recommendation about when to use `/wbs-reshape` vs. direct modify is consistent with this behavior.

- [ ] **Step 11: No commit needed**

Manual verification. If any step fails, return to the relevant authoring task and fix; rerun static verification (Task 7) before continuing.

---

### Task 10: Update the roadmap entry

**Files:**
- Modify: `docs/superpowers/superhuman-wbs-roadmap.md`

Add a new sub-project row for WBS reshape and link the spec and plan.

- [ ] **Step 1: Read the current roadmap to confirm the row format**

Run: `grep -nE "^\| [0-9]" docs/superpowers/superhuman-wbs-roadmap.md`

Expected: lines 1, 2, 3, 4, 5, 6, 7 of the sub-projects table.

- [ ] **Step 2: Add a new sub-project row**

Insert a new row at the end of the sub-projects table (currently ending at sub-project 7 — "Software architecture conventions"). The new row is sub-project 8:

```markdown
| 8 | **WBS reshape** — `/wbs-reshape` command + `wbs-reshape` skill that lets WBS authors change direction mid-flight via context-aware re-brainstorm; auto-invokes from `wbs-orientation` on contradiction gates | Done | [2026-05-01 spec](specs/2026-05-01-wbs-reshape-design.md) | [2026-05-01 plan](plans/2026-05-01-wbs-reshape.md) |
```

- [ ] **Step 3: Verify the row landed**

Run: `grep "WBS reshape" docs/superpowers/superhuman-wbs-roadmap.md`

Expected: the new row prints, with status `Done` and links to both spec and plan.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/superhuman-wbs-roadmap.md
git commit -m "Mark WBS reshape sub-project as Done in roadmap"
```

---

## Implementation Notes

- **Tasks 1–6 are sequential by dependency.** Task 1 (template) is referenced by Task 2 (skill); Task 2 is referenced by Task 3 (command) and Task 5 (orchestrator delta); Task 4 (conventions) and Task 5 (orchestrator) reference the skill name and metadata; Task 6 (user guide) is companion polish. Order: 1 → 2 → 3 → 4 → 5 → 6.
- **Tasks 1–3 could be dispatched to separate subagents in parallel** if the dispatcher accepts the dependency: subagent 1 produces the template, subagent 2 produces the skill (does not actually need to read the template at author-time — it only references the path), subagent 3 produces the command. The static verification in Task 7 then catches any drift. For lowest risk, run sequentially.
- **Tasks 7 is automated, runnable by the implementer subagent.** Tasks 8–9 are manual — they require human action in Claude Code (Task 8) and a Tusk MCP environment driving an end-to-end reshape (Task 9).
- **Task 10** is the bookkeeping step; run after Tasks 8 and 9 confirm the implementation works end-to-end.
- **Tusk MCP verb names** (`tusk_task_get`, `tusk_task_modify`, `tusk_note_add`, `tusk_note_archive`, `tusk_note_list`, `tusk_workflow_list`, etc.) are referenced by intent throughout. If the live Tusk MCP exposes different exact names at implementation time, substitute accordingly — the skill prose names operations conceptually.
- **Workflow status assumption.** The skill assumes the project workflow has a terminal cancelled / won't-do status. If a project the user wants to reshape lacks one, the skill errors early in step 1 and the user must update the workflow first via `tusk_workflow_modify`. This is a deliberate hard-block, not a soft fallback.
- **No backwards-compatibility hacks.** This is a new feature; there is nothing to migrate. If the reshape skill is invoked against a project that has no spec notes (older nodes built before the spine), the audit note's `## Original Shape` section is sparse and the skill warns about it but proceeds.
