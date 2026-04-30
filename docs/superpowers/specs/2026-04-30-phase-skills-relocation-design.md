# Phase Skills Relocation + Polish — Design Spec

**Date:** 2026-04-30
**Author:** German Meza (`iam@germanamz.com`)
**Status:** Approved — ready for implementation plan
**Roadmap entry:** [Sub-project #2 in `docs/superpowers/superhuman-wbs-roadmap.md`](../superhuman-wbs-roadmap.md)
**Builds on:** [WBS spine spec](2026-04-29-superhuman-wbs-spine-design.md)

## Goal

Land Tusk-native versions of the three phase skills (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) inside `plugins/superhuman/skills/`, aligned with the WBS spine's storage model and per-task implementer dispatch grain. Retire the file-based originals from `~/.claude/skills/` once the plugin versions are verified.

The reshape is not a port — the skills' content shifts to assume the WBS spine is in place: phase plans live as `meta.type=phase-plan, meta.phase=phase-N` Tusk notes on the parent Story, phase children are Tusk tasks tagged `+phase-N`, implementer subagents are dispatched per task (not per phase), and the final cleanup step becomes a completion-seal annotation plus phase-plan-note archive instead of file deletion.

## Why this exists

The WBS spine ([sub-project #1](2026-04-29-superhuman-wbs-spine-design.md)) committed to Tusk as the system of record and to a five-level decomposition with phasing as an orthogonal design technique. The existing phase skills predate that commitment — they assume the planning agent writes per-phase markdown files into `docs/superpowers/plans/`, hands those files to implementer agents, then deletes them after final verification.

That model collides with the WBS spine in three places:

1. **Storage.** The spine specifies that heavy phase plans land as Tusk notes (per `templates/wbs/note-phase-plan-heavy.md`). File-based phase docs are no longer the destination.
2. **Dispatch grain.** The spine's Flow 4 dispatches implementer subagents per Tusk task at `level=task`, not per phase doc. The original skills' execution-model preamble assumes per-phase implementer agents.
3. **Cleanup semantics.** "Plan doc cleanup" was a file-deletion step. Tusk notes are append-only and the WBS treats them as durable memory; the equivalent terminal action is a completion-seal annotation on the Story plus an archive of the phase-plan notes (queryable, hidden from default views).

This sub-project reshapes the three skills to fit the spine, in one coherent rewrite. Until it ships, the WBS spine has a gap: heavy phasing has a destination template (`note-phase-plan-heavy.md`) but no rules-and-reviews machinery bound to Tusk.

## Architecture

### Three skills, one workflow point each

The reshape preserves the existing three-skill split — each fires at a distinct moment in the phased-implementation workflow:

| Skill | When it fires | What it does |
|---|---|---|
| `phase-planning-rules` | Planner is drafting per-phase plans for a WBS-Tusk-backed Story | Constraints checklist applied while drafting each phase-plan note |
| `phase-continuity-review` | All phase-plan notes drafted, before first implementer task is dispatched | Cross-phase consistency check, queries Tusk MCP |
| `phase-post-implementation-review` | After each phase ships (per-phase gate); once after all phases ship (final sequence) | Per-phase verification + final sequence verification + completion seal |

Three separate skills, three distinct frontmatter triggers. Auto-invoke fires on the matching workflow moment.

### Tusk-only execution model

All three skills assume the WBS spine is loaded. There is no file-based fallback. Frontmatter `description` fields name the WBS-Tusk-backed Story context explicitly; auto-invoke does not fire for non-WBS work.

The execution model encoded in the rules:

- **Phases are coordination groups.** They group 4–6 Tusk tasks at `level=task` under a Story, all tagged `+phase-N`. Each phase has a `meta.type=phase-plan, meta.phase=phase-N` note on the Story carrying the directive.
- **Implementer subagents dispatch per task.** A subagent receives only the Tusk task short ID. It pulls the task description (the primary directive), then pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand via Tusk MCP. It cannot communicate with the planning agent or other implementer subagents.
- **Right-sized descriptions per the spine.** The Tusk task description (per `templates/wbs/desc-task.md`) carries execution-ready content. The phase-plan note carries phase-level context (Inherits From, Changes Introduced, User-visible Behaviors, Bridge Code).
- **Append-only memory.** Phase-plan notes persist after implementation. The post-impl review's terminal step archives them (still queryable via Tusk's archive flag; hidden from default views) and posts a completion-seal annotation on the Story.

### Existing artifact alignment

The spine already defined the destination shape via `templates/wbs/note-phase-plan-heavy.md`. The reshape ensures the rule outputs and the template stay in lockstep — section names (Inherits From, Phase Outcome, Tasks, Bridge Code, Compilation Safety, Changes Introduced, User-visible Behaviors) match exactly. Drift between rules and template = implementer confusion.

`wbs-orientation/SKILL.md` step 6 (wrapped writing-plans → heavy phasing) gets a small cross-reference edit to point at `superhuman:phase-planning-rules` by name.

## Components

The reshape ships as additions to `plugins/superhuman/skills/` plus a manual deletion step outside the repo:

```
plugins/superhuman/
  skills/
    wbs-orientation/SKILL.md            # already shipped; cross-ref edits
    phase-planning-rules/SKILL.md       # NEW
    phase-continuity-review/SKILL.md    # NEW
    phase-post-implementation-review/SKILL.md  # NEW
  templates/wbs/
    note-phase-plan-heavy.md            # already shipped; one diff pass for header alignment
```

Manual deletions, performed by the user after plugin verification:

```
~/.claude/skills/phase-planning-rules/             # DELETE
~/.claude/skills/phase-continuity-review/          # DELETE
~/.claude/skills/phase-post-implementation-review/ # DELETE
```

No new directories. No `references/` subdirectories. No new agents. No new templates.

### 1. `phase-planning-rules/SKILL.md`

**Frontmatter description:** *"Rules for drafting phased implementation plans for a WBS-Tusk-backed Story. Use when splitting a Story's implementation into phases — each phase becomes a `meta.type=phase-plan` Tusk note on the Story, and each task within is dispatched per-task to a separate implementer subagent."*

**Execution model preamble:** Names the per-task dispatch grain, the Tusk task description as the implementer's primary directive, the read-only Tusk + codebase context the subagent has, the inability of subagents to communicate with each other or the planner, and the completion-seal-plus-archive terminal step.

**Rules (9, all retained, prose Tusk-bound):**

1. **One phase-plan note per phase.** `meta.type=phase-plan, meta.phase=phase-N` on the Story task. Never combine phases.
2. **Tusk task description is the primary directive.** Implementer subagent receives only the task short ID; pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand. Right-sized-description discipline from `templates/wbs/desc-task.md` governs description shape. No "see phase 2 for details."
3. **Each phase independently shippable.**
4. **Every phase compilation-safe.** Bridge code introduced in the same phase, listed as explicit tasks.
5. **Cap each phase at 4–6 tasks.** Each task is a child Tusk task tagged `+phase-N`. The cap is a planning sanity bound — phases that don't decompose into 4–6 tasks need rethinking. (No longer a per-implementer context bound, since dispatch is per task.)
6. **Declare prerequisites explicitly.** Phase-plan note names prior phases or "no prerequisites" or "parallel with phase-X." Used to sequence task dispatch.
7. **Document the phase boundary.** Every phase-plan note ends with "Changes Introduced." Every phase-plan note after phase 1 begins with "Inherits From." Section names match `note-phase-plan-heavy.md`.
8. **Bridge code tagged with a removal target.** Removal task appears in the target phase's note and corresponds to a Tusk task in that phase.
9. **Preserve user-visible behavior.** Listed in each phase-plan note's "User-visible Behaviors" section. Per-task implementer subagents inherit these as acceptance criteria.

### 2. `phase-continuity-review/SKILL.md`

**Frontmatter description:** *"Cross-phase consistency review for a WBS-Tusk-backed Story. Run after all phase-plan notes on a Story are drafted, before dispatching the first task to an implementer subagent."*

**Operating model:** Iterate via `tusk_note_list task=<story-id> meta.type=phase-plan`, sorted by `meta.phase`. Walk every adjacent pair end-to-end. Any check failure blocks task dispatch.

**Checks (7, all retained):**

1. **No orphaned dependencies.** Every type/interface/function referenced in phase N is introduced in some phase ≤ N or already exists.
2. **Prerequisite graph valid.** No circular deps. Parallelizable phases share no real interface or data deps.
3. **Boundary contracts match.** Phase N "Changes Introduced" matches phase N+1 "Inherits From."
4. **Bridge code ledger complete.** Every bridge has a removal target. Every removal-target phase has an explicit removal task corresponding to a Tusk task.
5. **No silent behavior changes.** Deprecated behaviors are explicitly marked, not dropped.
6. **Task count bounds.** Each phase has 4–6 tasks. The count of `+phase-N` Tusk tasks under the Story matches the phase-plan note's Tasks section. Mismatch = note and reality disagree; fix before dispatch.
7. **Self-containment.** Each Tusk task description has enough to execute without pulling other phases' phase-plan notes. (Pulling the Story's `spec`/`plan` and the task's own phase `phase-plan` is fine.)

### 3. `phase-post-implementation-review/SKILL.md`

**Frontmatter description:** *"Per-phase verification gate and final sequence review for a WBS-Tusk-backed Story. Run per-phase between implementer cohorts; run final sequence checks once after all phases ship."*

**Per-phase checks (7):**

1. **Compilation and type-checking.** Full build, strict mode if available.
2. **Task completion is literal.** Walk the phase-plan note task-by-task. For each task: identify the concrete code change AND confirm the corresponding Tusk task is workflow-completed. Mismatch (note done, Tusk task open, or vice versa) is a failure.
3. **Shippability gate.** System deployable, runs, doesn't crash.
4. **Behavioral regression.** Execute the phase-plan note's user-visible behaviors; full test suite if available.
5. **Boundary contract fulfillment.** Compare actual changes against "Changes Introduced." Update the next phase-plan note's "Inherits From" if reality drifted. Never dispatch into a phase whose "Inherits From" is stale.
6. **Bridge code audit.** Bridges introduced this phase tagged with removal targets. Bridges scheduled for removal in this phase actually removed. No unplanned shims.
7. **No scope creep, no deferred shortcuts.** Flag pulled-forward / pushed-back work and unplanned refactors. Re-evaluate affected phase-plan notes if found.

**Final sequence checks (6):**

1. **Bridge code fully resolved.** Codebase-wide search for residual stubs, no-ops, feature flags introduced as bridge.
2. **Full behavioral sweep.** Every behavior across every phase-plan note still works.
3. **Plan-to-code reconciliation.** Every task in every phase-plan note maps to committed code; no orphan code unaccounted for.
4. **Clean build from scratch.** Fresh clone, install, build, run.
5. **Cross-phase coherence.** Flag stylistic / architectural drift across implementer subagent outputs for normalization pass if needed.
6. **Completion seal + phase-plan archive.** *(Replaces "Plan doc cleanup.")* Post a completion-seal annotation on the Story summarizing implementation outcome (date, phases shipped, bridges resolved, normalization follow-ups). Archive each `meta.type=phase-plan` note via Tusk's archive mechanism. The Story's `meta.type=spec` and `meta.type=plan` notes stay non-archived as canonical references.

### 4. `wbs-orientation/SKILL.md` cross-reference edits

Two small edits, no structural change:

- Step 6 (wrapped writing-plans, heavy phasing): add *"During heavy phasing, `superhuman:phase-planning-rules` auto-invokes; let it drive the per-phase note shape and the 4–6 task split."*
- Add a sentence in or near step 6: *"After each phase ships and after all phases ship, `superhuman:phase-post-implementation-review` auto-invokes for the per-phase gate and final sequence verification."*

### 5. `templates/wbs/note-phase-plan-heavy.md` alignment pass

A diff pass to confirm section names match the new rule outputs. Per current read of the file, headings (Inherits From, Phase Outcome, Tasks, Bridge Code, Compilation Safety, Changes Introduced, User-visible Behaviors) are already aligned. The implementation plan includes a one-diff verification step.

## Data flow

### Lifecycle of a phased Story implementation

1. **Story design.** Wrapped brainstorming produces `meta.type=spec` on the Story; wrapped writing-plans produces `meta.type=plan`. (Spine flows; not changed by this sub-project.)
2. **Heavy phasing decision.** The plan declares heavy phasing (multiple implementer subagents, sequential bridge-code dependencies, etc.). `wbs-orientation` step 6 routes into the heavy-phasing flow.
3. **Phase-plan note drafting.** `phase-planning-rules` auto-invokes. Planner drafts each phase-plan note as `meta.type=phase-plan, meta.phase=phase-N` on the Story, following `note-phase-plan-heavy.md`. Per-phase Tusk tasks at `level=task` are created via `/wbs-new task`, tagged `+phase-N`.
4. **Continuity review.** All phase-plan notes drafted. `phase-continuity-review` auto-invokes. Planner walks the 7 checks via Tusk MCP queries. Failures block task dispatch.
5. **Per-phase implementation.** For each phase in dependency order:
   - Planner dispatches each `+phase-N` task to a separate implementer subagent — passing only the task short ID.
   - Implementer subagent pulls `tusk_task_get <task-id>` for the description, then pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand.
   - Implementer subagent executes, runs tests, marks Tusk task complete via the workflow.
   - When all `+phase-N` tasks for the phase are complete, `phase-post-implementation-review` auto-invokes the per-phase checks.
   - On pass: proceed to phase N+1. On fail: planner fixes, re-dispatches affected tasks, re-runs the gate.
6. **Final sequence verification.** All phases shipped. `phase-post-implementation-review` auto-invokes the final sequence checks.
7. **Terminal step.** Step 6 of the final sequence posts the completion-seal annotation on the Story and archives the phase-plan notes via Tusk's archive flag. The Story's spec and plan notes remain canonical and non-archived.

### What the implementer subagent sees

Per the WBS spine's right-sized-description discipline, the implementer subagent's reading is:

- **Always:** the Tusk task description (`tusk_task_get <task-id>`).
- **On demand:** the parent Story's `meta.type=spec` and `meta.type=plan` notes (referenced by note ID in the task description).
- **On demand:** the task's own phase `meta.type=phase-plan, meta.phase=phase-<N>` note (referenced by note ID in the task description).
- **Cohort context (if needed):** sibling tasks in the same phase via `tusk_task_list parent=<story-id> +phase-<N>`.

Pulling other phases' phase-plan notes is a smell — `phase-continuity-review` check 7 (self-containment) catches this in advance.

## Error handling

### 1. Task description and phase-plan note disagree on task count

`phase-continuity-review` check 6 catches this. Either the note is stale (phase-plan lists 5 tasks, only 4 child Tusk tasks exist) or extra tasks slipped in. Planner reconciles before dispatch — both directions are possible (add a missing task, remove an extra one, or update the note).

### 2. Implementer subagent introduces an unplanned shim

`phase-post-implementation-review` per-phase check 6 (bridge code audit) catches this. Planner either tags the shim with a removal target (and adds a removal task to a future phase's note + Tusk tasks) or has it removed before continuing.

### 3. Phase-plan note "Inherits From" stale after phase ships

`phase-post-implementation-review` per-phase check 5 catches this. Planner updates the next phase-plan note's "Inherits From" to match reality before dispatching the next phase's tasks. The dispatch gate refuses if the next phase's "Inherits From" is stale.

### 4. Tusk archive call fails on completion seal

The post-impl review final sequence step 6 needs both the completion-seal annotation and the phase-plan-note archive to succeed. If the archive call fails for some notes, surface clearly — completion seal is incomplete, and a future agent reading the Story will see phase-plan notes in the default view as if implementation were still in progress. Manual remediation: re-run the archive for the failed notes; re-post the seal if needed.

### 5. User invokes phase-planning outside a WBS context

Tightened frontmatter means the new skills do not auto-invoke. The planning agent gets no phase-discipline scaffolding for non-WBS work. **This is intentional.** The file-based mode is dropped — the reshape is Tusk-only by design. If the user wants phase discipline outside WBS, they must explicitly invoke the relevant skill, and accept that its output language assumes Tusk.

### 6. Both plugin and `~/.claude/skills/` versions present during transition

Until the user runs the manual deletion step, both versions coexist. Auto-invoke disambiguation relies on the plugin version's tightened frontmatter (`WBS-Tusk-backed Story`) being more specific. Verification step (see below) confirms the plugin version triggers correctly before the originals are deleted.

## Verification

### Static checks (automated; run after implementation)

- All three new SKILL.md files exist at `plugins/superhuman/skills/<name>/SKILL.md`.
- Each has valid YAML frontmatter with `name` and `description` keys.
- Each `name` field exactly matches its directory name.
- `wbs-orientation/SKILL.md` references both `superhuman:phase-planning-rules` and `superhuman:phase-post-implementation-review` by name.
- Section headings in each rule's outputs match `templates/wbs/note-phase-plan-heavy.md` exactly (one diff comparison).
- Marketplace catalog still validates with `jq`.

### Plugin install verification (manual; one-shot)

- After `/plugin install superhuman@superhuman`, the three skills appear in the skill registry under their `superhuman:` prefix.
- Their frontmatter descriptions render correctly.
- No name collision warnings between plugin-level and `~/.claude/skills/` versions. (This step happens **before** the originals are deleted, to confirm the plugin versions take precedence in auto-invoke.)

### Behavioral verification (manual; one full Story-with-phases walkthrough)

In a fresh Tusk Project with the WBS taxonomy:

1. Create a Story. Populate Karpathy fields. Post a `meta.type=spec` note via wrapped brainstorming.
2. Drive wrapped writing-plans into heavy phasing. Confirm `superhuman:phase-planning-rules` auto-invokes when the planner starts decomposing into phases.
3. Confirm phase-plan notes land as `meta.type=phase-plan, meta.phase=phase-N` per `note-phase-plan-heavy.md`.
4. Confirm 4–6 child Tusk tasks per phase tagged `+phase-N`, parented to the Story.
5. After all phase-plan notes are drafted, confirm `superhuman:phase-continuity-review` auto-invokes before any task is dispatched.
6. Dispatch one task to a subagent (manual or via mock). Confirm subagent receives only the task short ID and pulls notes via Tusk MCP.
7. After phase 1's tasks are workflow-completed, confirm `superhuman:phase-post-implementation-review` auto-invokes the per-phase checks.
8. After all phases ship, confirm the final sequence checks run, the completion-seal annotation appears on the Story, and the phase-plan notes are archived (queryable via archive flag, hidden from default views).

### Bypass tolerance (manual)

1. In a non-WBS context (file-based work, no active Tusk Story), draft a phase plan inline. Confirm none of the three new skills auto-invoke.
2. Confirm there is no fallback file-based phase-planning behavior. (Documented in the design: this is intentional.)

### Original-skill removal (manual; post-verification)

After the above verification passes, the user runs:

```
rm -rf ~/.claude/skills/phase-planning-rules
rm -rf ~/.claude/skills/phase-continuity-review
rm -rf ~/.claude/skills/phase-post-implementation-review
```

Spelled out as a numbered manual step in the implementation plan. Performed only after plugin verification passes.

## Implementation notes

- When the SKILL.md files are authored or revised, the implementer must invoke `superpowers:writing-skills` first. The skill carries the discipline for SKILL.md frontmatter, "when to use" clarity, brevity, and verification. The implementation plan calls this out as an explicit step before each SKILL.md is written.
- The exact Tusk MCP verb names for note creation, modification, archiving, and annotation creation are resolved against the live MCP at implementation time. The rules reference the operation by intent (create, modify, archive, annotate) and the implementation plan binds intent to the actual MCP call signatures.

## Out of scope

- **An implementer subagent.** Lives in [sub-project #4 — implementation pipelines](../superhuman-wbs-roadmap.md). The dispatch grain (per task, with task short ID only) is encoded in the rules, but the actual subagent definition under `plugins/superhuman/agents/` is sub-project #4's work.
- **Changes to the WBS spine artifacts beyond cross-reference fixes.** No edits to `conventions.md`, `taxonomy.md`, `desc-*.md`, `note-brainstorm.md`, `note-spec.md`, `note-plan.md`, `note-phase-plan-light.md`, or any other already-shipped spine file. Only `wbs-orientation/SKILL.md` (cross-ref edits) and `note-phase-plan-heavy.md` (alignment diff pass) are touched.
- **Tusk MCP feature work.** Tagging, archiving, search semantics — Tusk evolves to fit; this sub-project consumes what's there at implementation time.
- **New review checklists or rule additions.** The reshape preserves the existing 9+7+7+6 structure. New checks belong in their own sub-project.
- **A medium-agnostic phase-discipline core.** The reshape is Tusk-only by design. A user without WBS gets no phase scaffolding from these skills. Restoring file-based phasing or factoring out a medium-agnostic rules core is a future sub-project, not this one.

## References

- [WBS spine spec](2026-04-29-superhuman-wbs-spine-design.md) — defines the storage model, the right-sized-description discipline, the per-task dispatch grain (Flow 4), and the destination template (`note-phase-plan-heavy.md`).
- [Roadmap entry for sub-project #2](../superhuman-wbs-roadmap.md) — the parent initiative.
- Existing phase skills in `~/.claude/skills/` — `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`. The reshape preserves their rule structure and shifts their prose to Tusk-bound execution.
- [Tusk repository and design](https://github.com/germanamz/tusk) — the storage backend; archive flag on notes, annotations on tasks, append-only memory, per-task short IDs, parent-child task tree, tag-based phase membership.
- `superpowers:writing-skills` — the discipline used when each SKILL.md is authored.
