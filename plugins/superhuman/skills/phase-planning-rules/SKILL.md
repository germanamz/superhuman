---
name: phase-planning-rules
description: Rules for drafting phased implementation plans for a WBS-Tusk-backed Story. Use when splitting a Story's implementation into phases — each phase becomes a `meta.type=phase-plan` Tusk note on the Story, and each task within is dispatched per-task to a separate implementer subagent.
---

## Phase Planning Rules

### Execution Model

Each phase is a coordination group of 4–6 Tusk tasks at `level=task`, all parented to the Story and tagged `+phase-N`. The phase's directive lives as a Tusk note on the Story with `meta.type=phase-plan, meta.phase=phase-N`, following `templates/wbs/note-phase-plan-heavy.md`.

**Implementer subagents are dispatched per task, not per phase.** Each subagent receives only the Tusk task short ID. It pulls the task description (the primary directive) via `tusk_task_get`, then pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand via Tusk MCP. It cannot communicate with the planning agent or other implementer subagents during execution.

The planning agent drafts all phase-plan notes, runs the continuity review, dispatches tasks per phase, runs per-phase post-implementation review between cohorts, and runs the final sequence verification after all phases ship. Only the planning agent has visibility across the full sequence.

After post-implementation verification, the planning agent posts a completion-seal annotation on the Story summarizing the implementation outcome, and archives each phase-plan note via Tusk's archive flag. Archived notes remain queryable but are hidden from default views — they record how the Story was implemented without cluttering future context.

### Rules

Apply these constraints when drafting each individual phase-plan note.

1. **One phase-plan note per phase.**
   Each phase gets its own `meta.type=phase-plan, meta.phase=phase-N` Tusk note on the Story. Never combine multiple phases into a single note. Each note is the per-phase reference for the implementer subagents executing that phase's tasks.

2. **The Tusk task description is the implementer's primary directive.**
   The implementer subagent receives only the task short ID. The task description (per `templates/wbs/desc-task.md`) carries execution-ready content: target files with line ranges if applicable, the change to make, the verification command, expected output, and references to the parent's `meta.type=spec`, `meta.type=plan`, and own phase's `meta.type=phase-plan` notes by note ID. The implementer pulls referenced notes on demand. No "see phase 2 for details" — every task description must be self-contained for the per-task dispatch.

3. **Each phase must be independently shippable.**
   At the end of every phase, the system must be deployable and functional. No phase should leave the product in a broken or half-migrated state. Even though future phase-plan notes are visible in Tusk, "the next phase will fix this" is never acceptable — each phase must stand on its own.

4. **Every phase must be compilation-safe.**
   The code must compile and pass type-checking after each phase ships in isolation. If a later phase depends on interfaces not yet implemented, introduce bridge code (stubs, feature flags, adapter layers, no-op implementations) within the current phase to maintain compilation. Bridge code must appear as explicit tasks in the phase-plan note (and as corresponding Tusk tasks tagged `+phase-N`) — the implementer subagent will not infer the need.

5. **Cap each phase at 4–6 tasks.**
   If a phase exceeds 6 tasks, split it. If it has fewer than 4, consider merging with an adjacent phase — unless intentionally narrow (cleanup or migration phase). The cap is a planning sanity bound: phases that don't decompose into 4–6 tasks signal an unclear shape that should be re-examined. Each task is a child Tusk task at `level=task`, parented to the Story, tagged `+phase-N`.

6. **Declare prerequisites explicitly.**
   Each phase-plan note lists which prior phases must complete first. Never rely on phase numbering alone. State "no prerequisites beyond the base codebase" or "parallel with phase-K" explicitly. The planning agent uses this to sequence task dispatch correctly.

7. **Document the phase boundary.**
   Every phase-plan note ends with a **"Changes Introduced"** section listing: new files, modified interfaces, new environment variables, schema migrations, added dependencies, and any bridge code introduced with its removal-target phase. Every phase-plan note after phase 1 begins with an **"Inherits From"** section describing the codebase state the implementer subagent should expect — what prior phases changed and what can be relied on. Section names match `templates/wbs/note-phase-plan-heavy.md` exactly. Treat phase boundaries like API contracts between implementer subagent cohorts.

8. **Tag all bridge code with a removal target.**
   Whenever a phase introduces bridge code, tag it in the phase-plan note's Bridge Code table with the specific phase number where it will be replaced. The removal must appear as an explicit task in the target phase's note and as a Tusk task in that phase. If you cannot name a removal phase, the plan is incomplete.

9. **Preserve user-visible behavior.**
   If a phase swaps an implementation behind an interface, the prior phase's behavioral guarantees carry forward unless explicitly deprecated in the current phase-plan note. List the user-visible behaviors that must still work in the **"User-visible Behaviors"** section. Per-task implementer subagents inherit these as acceptance criteria; the post-implementation review uses them for regression checking.
