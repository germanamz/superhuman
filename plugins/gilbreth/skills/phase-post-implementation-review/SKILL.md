---
name: phase-post-implementation-review
description: Per-phase verification gate and final sequence review for a WBS-Tusk-backed Story. Run per-phase between implementer cohorts; run final sequence checks once after all phases ship.
---

## Post-Implementation Review and Verification

This review is performed by the planning agent — the same agent that drafted the phase-plan notes and ran the continuity review. It is the only agent that understands the reasoning behind the phase split and has visibility across the full plan.

Tusk surface: MCP-preferred (`tusk_node_get`, `tusk_node_modify`, `tusk_edge_list`, `tusk_query`) with `tusk` CLI fallback. Node IDs are workspace-relative paths.

Each task node is dispatched to a separate implementer subagent. While implementer subagents can read the parent Story's `spec`, `plan`, and the relevant phase-plan note, they cannot coordinate with each other or flag cross-phase issues during execution. That makes this review the only point where plan-level intent is compared against actual code across the full sequence.

### Per-Phase Verification

Perform these checks after each phase's task nodes reach `status=completed`, before dispatching the next phase's tasks to their implementer subagents. This is the planning agent's gate between phases — if a check fails, fix the issue before proceeding. Errors that pass this gate compound, and no downstream implementer subagent can detect or correct them.

1. **Compilation and type-checking.**
   The codebase must compile and pass all type checks with zero errors and zero new warnings. Run the full build, not just the files the implementer touched. If the project has a strict/pedantic compiler mode, use it. A compile failure here means the next implementer subagent inherits a broken starting point.
   _Verifies: planning rule 4 (compilation safety)._

2. **Task completion is literal.**
   Walk the phase-plan note task-by-task. For each task: identify the exact code change AND confirm the corresponding task node has `status=completed`. If a task in the note cannot be mapped to a concrete code change, or a task node is still open while the note treats it as done (or vice versa), flag the failure. Skipped tasks usually mean the phase-plan note was ambiguous — fix the note for future reference even if you fix the code now.
   _Verifies: planning rule 2 (task body as primary directive)._

3. **Shippability gate.**
   The system must be deployable and functional at this point. Run the application. Verify it starts, serves traffic (or performs its core function), and does not crash. If the project has a staging environment or deploy script, execute it. "It compiles" is not the same as "it ships."
   _Verifies: planning rule 3 (independently shippable)._

4. **Behavioral regression.**
   Execute the user-visible behaviors listed in the phase-plan note (planning rule 9). Every behavior from prior phases that was not explicitly deprecated must still work. If the project has automated tests, run the full suite — not just tests related to the current phase. If it does not, manually verify each listed behavior. The implementer subagents treated this list as acceptance criteria; the planning agent now validates that the criteria were actually met.
   _Verifies: planning rule 9 (preserve user-visible behavior)._

5. **Boundary contract fulfillment.**
   Compare what was actually changed against the phase-plan note's "Changes Introduced" section (planning rule 7). Check for:
   - Changes listed in the note that were not implemented.
   - Changes made in code that are not listed in the note.
   - Interface signatures, environment variables, or schemas that differ from what the note specified.
   If the next phase's "Inherits From" section no longer matches reality, update the next phase's note before dispatching its tasks. Never dispatch a task whose phase's "Inherits From" is stale.
   _Verifies: planning rule 7 (document the phase boundary)._

6. **Bridge code audit.**
   Verify all bridge code introduced in this phase is tagged with a removal target (planning rule 8). Verify all bridge code scheduled for removal in this phase has actually been removed. Check that no untagged stubs, no-ops, or feature flags were introduced outside of the plan. Implementer subagents sometimes create their own workarounds when they encounter something unexpected — these unplanned shims must be caught here.
   _Verifies: planning rules 4, 8 (compilation safety and bridge code tagging)._

7. **No scope creep, no deferred shortcuts.**
   The implementation must match the phase scope — nothing more, nothing less. Flag any of the following:
   - Work done that belongs to a later phase (pulled forward).
   - Work skipped with a TODO/FIXME/HACK pointing at a later phase (pushed back).
   - Unplanned refactors, dependency upgrades, or "while I'm here" changes.
   Implementer subagents, even with access to the broader plan via Tusk, are prone to making locally reasonable decisions that contaminate the phase boundary. Any scope deviation invalidates the continuity review's assumptions about downstream phases — if found, re-evaluate affected phase-plan notes before continuing.
   _Verifies: planning rules 5, 6, 7 (task cap, prerequisites, boundary contracts)._

### Final Sequence Verification

Run these checks once after all phases are implemented. This is the planning agent's final pass — the only review that sees the codebase as a whole through the lens of the original plan.

1. **Bridge code is fully resolved.**
   The bridge code ledger from the continuity review should now be empty. Search the codebase for any remaining stubs, no-ops, or feature flags that were introduced as bridge code. Include unplanned shims discovered during per-phase bridge code audits. If any survive, the implementation is incomplete.

2. **Full behavioral sweep.**
   Collect every user-visible behavior listed across all phase-plan notes. Verify each one works in the final state of the codebase. This catches regressions that may have been introduced in the final phase, where no subsequent per-phase review would have caught them.

3. **Plan-to-code reconciliation.**
   Walk every task across every phase-plan note. Confirm each maps to committed code. Confirm no committed code exists that is not accounted for in any phase-plan note. The plan and the codebase should be a 1:1 match at completion. Deviations found during per-phase reviews (check 7) should already have been resolved — this is the final confirmation.

4. **Clean build from scratch.**
   Clone the repository fresh. Install dependencies. Build. Run. Verify the system works end-to-end with no reliance on local state, caches, or manual steps accumulated during the multi-agent implementation process.

5. **Cross-phase coherence.**
   Review the codebase for stylistic and architectural consistency. Multiple implementer subagents will produce code with different patterns, naming conventions, and structural preferences. Identify inconsistencies that affect maintainability and flag them for a final normalization pass if needed. This is expected — it is a natural consequence of the multi-agent model, not a failure of any individual implementer subagent.

6. **Completion seal and phase-plan archive.**
   Replaces the file-based "Plan doc cleanup" step. Two operations:
   - **Completion seal:** Create a timestamped completion-seal note on the Story (a `note`, e.g. `kind=brainstorm` or a dedicated marker, linked by an `about` edge) summarizing implementation outcome — date, phases shipped, bridges resolved, normalization follow-ups (if any), and `[[wikilinks]]` to the spec/plan notes. This is the durable marker future agents see when first reading the Story.
   - **Phase-plan archive:** For each `kind=phase-plan` note on the Story, set `tusk_node_modify <note-path> --prop archived=true` (the `kind=spec` and `kind=plan` notes stay non-archived as canonical references). Archived notes remain queryable but are hidden from default `archived:false` views — they document how the Story was implemented without cluttering future context.
   If either operation fails for some notes, surface clearly: completion is incomplete, and a future agent reading the Story will see phase-plan notes in the default view. Manual remediation: re-run the failed operation.
