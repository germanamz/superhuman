---
name: phase-continuity-review
description: Cross-phase consistency review for a WBS-Tusk-backed Story. Run after all phase-plan notes on a Story are drafted, before dispatching the first task to an implementer subagent.
---

## Phase Continuity Review

Run this review after all phase-plan notes for a Story are drafted, before dispatching the first task to an implementer subagent. This is the planning agent's responsibility — it is the only agent with visibility across all phases and knowledge of the reasoning behind the phase split.

Iterate via `tusk_note_list task=<story-id> meta.type=phase-plan`, sorted by `meta.phase`. Walk every adjacent phase pair end-to-end and verify each check below. If any check fails, revise the relevant phase-plan notes before dispatching tasks. Implementer subagents cannot recover from plan-level errors — they execute their task description literally, with no ability to course-correct across phase boundaries.

These checks verify compliance with `phase-planning-rules`. They introduce no new requirements — if a check references something, the planning rules already mandate it.

1. **No orphaned dependencies.**
   Every type, interface, function, or module that a phase consumes must be introduced in a prior phase or already exist in the codebase. If phase N references something, you must be able to point to the exact phase (≤ N) where it was created. An orphaned dependency surfaces as a compile error the implementer subagent must troubleshoot without understanding the cross-phase intent behind it.
   _Verifies: rules 3, 4 (compilation safety and shippability)._

2. **Prerequisite graph is valid.**
   Confirm every phase-plan note declares its prerequisites (rule 6). Verify no circular dependencies. Confirm any phases declared as parallelizable share no actual data or interface dependencies. The planning agent uses this graph to determine task dispatch order — errors here mean an implementer subagent receives a codebase that doesn't match its phase's "Inherits From" expectations.
   _Verifies: rule 6 (declare prerequisites explicitly)._

3. **Boundary contracts match.**
   For each adjacent phase pair (N → N+1): confirm phase N's "Changes Introduced" section exists and that phase N+1's "Inherits From" section acknowledges it. If the output of phase N does not match the input expectations of phase N+1, the implementer subagent for the first task of phase N+1 will be working from a false description of the codebase.
   _Verifies: rule 7 (document the phase boundary)._

4. **Bridge code ledger is complete.**
   Collect all bridge code entries across every phase-plan note. Verify every entry has a removal-target phase (rule 8) and that the target phase's note includes an explicit removal task corresponding to a Tusk task in that phase. If any bridge code survives the final phase with no removal, the plan is incomplete. Untracked bridge code is unlikely to be cleaned up — implementer subagents follow their task descriptions, not hunt for unmarked technical debt.
   _Verifies: rules 4, 8 (compilation safety and bridge code tagging)._

5. **No silent behavior changes.**
   At each phase boundary, verify the user-visible behaviors listed in the prior phase-plan note still hold. If a phase deprecates a behavior, confirm it is explicitly marked as deprecated in that phase's note — not silently dropped. Implementer subagents use the behavior list as acceptance criteria (rule 9); an incomplete list means a regression will not be caught.
   _Verifies: rule 9 (preserve user-visible behavior)._

6. **Task count bounds.**
   Confirm every phase-plan note has 4–6 tasks listed. Cross-check against the Tusk tree: `tusk_task_list parent=<story-id> +phase-N` should return the same count. Mismatches mean the note and reality disagree — fix before dispatch (either add the missing Tusk tasks, remove extras, or update the note). Flag any phase outside 4–6 and verify it either needs splitting (>6) or has a documented reason to be narrow (<4).
   _Verifies: rule 5 (cap each phase at 4–6 tasks)._

7. **Self-containment check.**
   Read each phase-plan note on its own. For every task in the note, confirm the corresponding Tusk task description provides enough information to execute without depending on context buried in *other* phases' phase-plan notes. (Pulling the parent Story's `spec` and `plan` notes, and the task's own phase `phase-plan` note, is fine — that's the spec-defined reading shape.) Pulling other phases' phase-plan notes is a smell — it means the task description is underspecified or the phase split is wrong.
   _Verifies: rule 2 (Tusk task description as primary directive)._
