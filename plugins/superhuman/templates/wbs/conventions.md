# WBS Conventions

This document codifies the discipline the WBS orchestrator skill enforces. Read this before working on any WBS node.

## Right-sized descriptions

A task description must be sized to its level:

- **Project / Milestone / Initiative / Story** — outcome-focused. Roughly 100–300 words. Deep design rationale lives in attached notes.
- **Task / Spike** — execution-ready. Length is whatever it takes to be actionable: target files (with line ranges), exact change to make, verification command, expected output, references to the parent's spec / plan / phase-plan notes by note ID.

The orchestrator warns when descriptions exceed budget at upper levels (>250 words triggers "move detail into a note"), and warns when Task descriptions lack file/line references.

## Lean tickets, rich notes

The ticket description is the implementer's "what's the desired outcome" reference. Implementation reasoning, spec content, and plan content live in **notes** — agents pull them via Tusk MCP only when needed. This is the windowed-access pattern: agents shouldn't have entire spec docs in their context unless they need them.

## Karpathy forcing functions

Every design-level template (Project / Milestone / Initiative / Story) requires these fields. The orchestrator's decomposition gate refuses to proceed until they're populated.

- **Success Criteria** — measurable / observable conditions. The "loop target" agents need to know when work is done.
- **Assumptions Made** — explicit list. Empty must read "none." Surfaces silent assumptions.
- **Open Questions** — explicit list. Empty must read "none, because …" Prevents running past confusion.
- **Tradeoffs Considered** — alternatives that were rejected and why. Prevents silent decisions.
- **Out of Scope** — explicit non-goals. Prevents scope creep and overcomplication.

These fields are why the spine exists. They are the structured forcing function against the failure modes named in [Karpathy's late-2025 reflection on agent coding](https://x.com/karpathy/status/2015883857489522876?s=20).

## When to phase

Phase a node when its design or implementation work:

- Splits into ≥2 sequential or parallel chunks of meaningfully different shape, or
- Needs ≥2 implementer agents.

If neither applies, "No phases needed" is the right answer in the Phasing field.

**Light phasing** at upper levels (Project / Milestone / Initiative) — chunks of design or research work. Tracked as `meta.type=phase-plan` notes on the parent node + child tasks tagged `+phase-N`. Note shape: see `note-phase-plan-light.md`.

**Heavy phasing** at Story implementation — full `phase-planning-rules` contract. Note shape: see `note-phase-plan-heavy.md`. Includes Inherits From, Changes Introduced, 4–6 child tasks per phase, compilation safety, bridge code with removal targets.

## Tag and metadata naming

- Phase identification: tag children `+phase-1`, `+phase-2`, etc.
- Note types: `meta.type=brainstorm | spec | plan | phase-plan | reshape`
- Phase association on notes: `meta.phase=phase-1`, `meta.phase=phase-2`
- Reshape lineage on reshape notes: `meta.reshape-of-spec=<spec-note-id>`, `meta.parent-reshape=<reshape-note-id>` (when nested)
- Archive marker on tasks: tag `+reshape-archived`
- WBS-specific reserved namespace: any tag or metadata key prefixed with `wbs-`

## Decomposition gate

The orchestrator skill enforces this gate before allowing a node to transition to "ready to decompose":

1. All five Karpathy fields are populated. Empty must be a deliberate "none, because …", not a skipped section.
2. The Phasing field is either "No phases needed" or has at least one phase listed.
3. At least one explicit child node is named in the level-appropriate children list (Milestones list at Project, Initiatives list at Milestone, etc.).

The gate refuses to auto-fill missing fields. The user (or agent) must populate them deliberately.

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

## Bypass consequences

If you run `/brainstorm` directly (not via the WBS orchestrator), the brainstorming skill will write the spec to `docs/superpowers/specs/<file>.md` as a file in the repo. The orchestrator does not intercept commands it wasn't invoked through.

This means:

- The spec content will be in the repo, not in Tusk.
- Future agents reading Tusk for context won't find this spec.
- If you want it in Tusk later, copy it manually into a note via `tusk_note_add` and archive or delete the file.

If you mutate a node's description directly via `tusk_task_modify` to change its scope (instead of running `/wbs-reshape`), the prior reasoning is lost — there's no audit note bridging the old and new shape. The orchestrator does not detect this after the fact. Convention: scope changes that invalidate prior assumptions go through `/wbs-reshape`; trivial typo-fixes and phrasing edits do not.
