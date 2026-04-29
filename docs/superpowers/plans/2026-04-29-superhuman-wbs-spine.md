# Superhuman WBS Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the WBS spine — a five-level Tusk-backed Work Breakdown Structure exposed through the `superhuman` plugin as one orchestrator skill, two slash commands, and thirteen template/reference files.

**Architecture:** All deliverables ship as additions to `plugins/superhuman/`. There is no runtime application code; the spine is configuration + skill-content delivery. Tusk MCP serves as the runtime backend at use-time; this plan only adds the conventions, templates, and orchestration prompts the agent reads. The marketplace catalog and plugin manifest are unchanged.

**Tech Stack:** Markdown for skill, command, and template files (with YAML frontmatter on skill/command files). JSON for the existing plugin manifest. `jq` for static checks during verification.

**Spec:** `docs/superpowers/specs/2026-04-29-superhuman-wbs-spine-design.md`

**Working directory:** `/Users/germanamz/projects/superhuman`. All commands assume this is `cwd`.

---

## Notes on TDD adaptation

This is a skill-and-template delivery — Markdown content with structure, not code-with-tests. The TDD analogue used throughout (same pattern as the earlier marketplace scaffold plan):

- **"Failing test"** → run a verification command (`test ! -f`, `grep -L`, `jq`, etc.) that fails because the file or content doesn't exist yet.
- **"Implementation"** → create the file with the exact content shown.
- **"Passing test"** → re-run the verification command and confirm success.

Each task ends with its own `git commit`. Nine logical commits land on top of the existing scaffold and spec history.

---

## File Structure

| Path | Responsibility |
|---|---|
| `plugins/superhuman/templates/wbs/conventions.md` | Discipline guide: right-sized descriptions, Karpathy fields, phasing rules, tag/metadata naming, decomposition gate, bypass consequences |
| `plugins/superhuman/templates/wbs/taxonomy.md` | Recommended Tusk taxonomy, setup instructions, rank rules, opt-out, migration |
| `plugins/superhuman/templates/wbs/desc-project.md` | Description template — Project level (vision/scope/milestones list) |
| `plugins/superhuman/templates/wbs/desc-milestone.md` | Description template — Milestone level (scope/initiatives list) |
| `plugins/superhuman/templates/wbs/desc-initiative.md` | Description template — Initiative/Epic level (epic outcome/stories list) |
| `plugins/superhuman/templates/wbs/desc-story.md` | Description template — Story level (user-visible outcome/spec+plan note links) |
| `plugins/superhuman/templates/wbs/desc-task.md` | Description template — Task level (execution-ready: files/lines/verification) |
| `plugins/superhuman/templates/wbs/desc-spike.md` | Description template — Spike level (research question/time-box/decision needed) |
| `plugins/superhuman/templates/wbs/note-brainstorm.md` | Note shape for brainstorm transcripts |
| `plugins/superhuman/templates/wbs/note-spec.md` | Note shape for spec content (adapted from superpowers spec format) |
| `plugins/superhuman/templates/wbs/note-plan.md` | Note shape for plan content (adapted from superpowers plan format) |
| `plugins/superhuman/templates/wbs/note-phase-plan-light.md` | Lightweight phase plan note shape (Project/Milestone/Initiative phasing) |
| `plugins/superhuman/templates/wbs/note-phase-plan-heavy.md` | Heavyweight phase plan note shape (Story-implementation phasing; Inherits From / Changes Introduced / 4–6 tasks / bridge code) |
| `plugins/superhuman/commands/wbs-new.md` | `/wbs-new <level> [title]` slash command |
| `plugins/superhuman/commands/wbs-status.md` | `/wbs-status [task-id]` slash command |
| `plugins/superhuman/skills/wbs-orientation/SKILL.md` | Orchestrator skill — auto-invoked in WBS contexts; loads templates, wraps brainstorming/writing-plans, enforces Karpathy gate, drives decomposition |

Files NOT touched: the marketplace catalog (`.claude-plugin/marketplace.json`), the plugin manifest (`plugins/superhuman/.claude-plugin/plugin.json`), the existing READMEs, the spec doc, and the roadmap doc.

---

## Task 1: Reference docs — conventions and taxonomy

**Files:**
- Create: `plugins/superhuman/templates/wbs/conventions.md`
- Create: `plugins/superhuman/templates/wbs/taxonomy.md`

These are foundation reference docs. The orchestrator skill links to them; they have no external dependencies on Tusk and are pure prose.

- [ ] **Step 1: Verify the templates dir does not yet exist (failing "test")**

Run:
```bash
test ! -d plugins/superhuman/templates && echo "OK: templates dir absent"
```
Expected: `OK: templates dir absent`

- [ ] **Step 2: Create the templates/wbs directory**

Run:
```bash
mkdir -p plugins/superhuman/templates/wbs
```
Expected: no output, exit 0.

- [ ] **Step 3: Create conventions.md**

Write `plugins/superhuman/templates/wbs/conventions.md` with exactly this content:

````markdown
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
- Note types: `meta.type=brainstorm | spec | plan | phase-plan`
- Phase association on notes: `meta.phase=phase-1`, `meta.phase=phase-2`
- WBS-specific reserved namespace: any tag or metadata key prefixed with `wbs-`

## Decomposition gate

The orchestrator skill enforces this gate before allowing a node to transition to "ready to decompose":

1. All five Karpathy fields are populated. Empty must be a deliberate "none, because …", not a skipped section.
2. The Phasing field is either "No phases needed" or has at least one phase listed.
3. At least one explicit child node is named in the level-appropriate children list (Milestones list at Project, Initiatives list at Milestone, etc.).

The gate refuses to auto-fill missing fields. The user (or agent) must populate them deliberately.

## Bypass consequences

If you run `/brainstorm` directly (not via the WBS orchestrator), the brainstorming skill will write the spec to `docs/superpowers/specs/<file>.md` as a file in the repo. The orchestrator does not intercept commands it wasn't invoked through.

This means:

- The spec content will be in the repo, not in Tusk.
- Future agents reading Tusk for context won't find this spec.
- If you want it in Tusk later, copy it manually into a note via `tusk_note_create` and archive or delete the file.
````

- [ ] **Step 4: Create taxonomy.md**

Write `plugins/superhuman/templates/wbs/taxonomy.md` with exactly this content:

````markdown
# Recommended WBS Taxonomy

This is the recommended Tusk taxonomy for the Superhuman WBS:

```
[[milestone], [initiative], [story], [task, spike]]
```

Four ranks, with `task` and `spike` sharing the lowest rank. WBS Project maps to a Tusk Project (a container, not a task), so it doesn't appear in the rank list.

## Apply the taxonomy

### Workspace-wide (recommended for most users)

Edit `tusk.toml` (typically at `~/.config/tusk/config.toml` or in your project root) and add:

```toml
[settings.taxonomy]
ranks = [["milestone"], ["initiative"], ["story"], ["task", "spike"]]
```

Reload Tusk's MCP server (Claude Code restarts it automatically when config changes).

### Per-project override

```bash
tusk project settings set <project-name> taxonomy='[["milestone"], ["initiative"], ["story"], ["task", "spike"]]'
```

Or via MCP: call `tusk_project_settings_set` with the same payload.

## Rank rules

Tusk validates parent-child relationships strictly:

- A task's parent must sit at a strictly lower rank index than the task itself.
- Any ancestor rank may parent any descendant rank — a milestone can directly parent a task without an intermediate initiative or story (skipping is allowed).
- Peer levels at the same rank may not parent each other.
- Only top-rank levels (rank 0) may be root tasks.

## When to opt out

Some projects don't benefit from the WBS hierarchy:

- Bug trackers (use a flat taxonomy or none).
- Scratch / personal projects.
- Tickets that fit a different taxonomy entirely (`epic → ticket`, etc.).

Opt out per-project by setting the taxonomy to an empty list: `taxonomy=[]`. Tasks in that project will not carry a level field, and the WBS orchestrator skill will not engage.

## Migration notes

Per Tusk's rules, taxonomy edits are prospective — existing tasks are not retroactively re-validated. After changing the taxonomy:

1. Run `tusk task level-check <project>` to surface tasks with invalid levels.
2. Update each violating task's level via `tusk task modify <id> level=<new-level>`.
3. Tusk does not block reads of violators; the check is informational.
````

- [ ] **Step 5: Verify both files exist and start with `#`**

Run:
```bash
test -s plugins/superhuman/templates/wbs/conventions.md && head -1 plugins/superhuman/templates/wbs/conventions.md | grep -q '^# ' && test -s plugins/superhuman/templates/wbs/taxonomy.md && head -1 plugins/superhuman/templates/wbs/taxonomy.md | grep -q '^# ' && echo "OK: both reference docs present"
```
Expected: `OK: both reference docs present`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/templates/wbs/conventions.md plugins/superhuman/templates/wbs/taxonomy.md
git commit -m "Add WBS conventions and taxonomy reference docs"
```

---

## Task 2: Description templates — upper levels

**Files:**
- Create: `plugins/superhuman/templates/wbs/desc-project.md`
- Create: `plugins/superhuman/templates/wbs/desc-milestone.md`
- Create: `plugins/superhuman/templates/wbs/desc-initiative.md`

These three share the common Karpathy skeleton with level-specific framing in the Outcome and Success Criteria sections, plus a level-appropriate "children" list (Milestones / Initiatives / Stories).

- [ ] **Step 1: Verify none of the three files exist (failing "test")**

Run:
```bash
for f in desc-project.md desc-milestone.md desc-initiative.md; do test ! -f "plugins/superhuman/templates/wbs/$f" || { echo "FAIL: $f exists"; exit 1; }; done && echo "OK: none exist yet"
```
Expected: `OK: none exist yet`

- [ ] **Step 2: Create desc-project.md**

Write `plugins/superhuman/templates/wbs/desc-project.md` with exactly this content:

````markdown
# <project-title>

## Outcome

<One paragraph describing what this project delivers. Who is it for? What durable change does it create when it succeeds? Avoid restating the project name; describe the world after.>

## Success Criteria

<Measurable / observable conditions. Examples:
- "Users can do X without intervention from Y."
- "<metric> reaches <threshold> over <window>."
- "Stakeholders sign off on the v1 demo by <date>.">

## Assumptions Made

<Explicit list of what we believe is true that this project depends on. Empty must read "none.">

## Open Questions

<Unresolved questions. Empty must read "none, because …">

## Tradeoffs Considered

<Alternatives evaluated and why rejected. Includes the "do nothing" option when relevant.>

## Out of Scope

<Explicit non-goals.>

## Phasing

No phases needed.

<Or, if phased: list phases with outcomes and dependencies. Project-level phases are usually long research/design streams.>

## Milestones

<The milestone titles this project decomposes into. Each becomes a Tusk task at `level=milestone` parented to this Project.>
````

- [ ] **Step 3: Create desc-milestone.md**

Write `plugins/superhuman/templates/wbs/desc-milestone.md` with exactly this content:

````markdown
# <milestone-title>

## Outcome

<One paragraph: what changes when this milestone ships. Reference the parent Project's outcome and explain how this milestone advances it.>

## Success Criteria

<Measurable acceptance for this milestone. Often a release-style checkpoint or capability set.>

## Assumptions Made

<Empty must read "none.">

## Open Questions

<Empty must read "none, because …">

## Tradeoffs Considered

<Alternatives rejected and why.>

## Out of Scope

<Explicit non-goals for this milestone — what's deferred to a later milestone.>

## Phasing

No phases needed.

<Or, if phased: list phases as `+phase-1`, `+phase-2`, etc., with outcomes and dependencies. See `note-phase-plan-light.md` for the per-phase note shape.>

## Initiatives

<The initiative titles this milestone groups. Each becomes a Tusk task at `level=initiative` parented to this Milestone.>
````

- [ ] **Step 4: Create desc-initiative.md**

Write `plugins/superhuman/templates/wbs/desc-initiative.md` with exactly this content:

````markdown
# <initiative-title>

## Outcome

<One paragraph: the epic-level outcome this initiative delivers. Phrase as a coherent body of work that produces a single user-visible or system-visible capability.>

## Success Criteria

<Acceptance for the initiative. Often expressed as the union of its stories' acceptance.>

## Assumptions Made

<Empty must read "none.">

## Open Questions

<Empty must read "none, because …">

## Tradeoffs Considered

<Alternatives rejected. Architectural choices, dependency choices, scope choices.>

## Out of Scope

<Explicit non-goals.>

## Contracts

<Cross-initiative contracts: what other initiatives depend on this, what this depends on. Often empty for self-contained initiatives.>

## Phasing

No phases needed.

<Or list phases. See `note-phase-plan-light.md`.>

## Stories

<The story titles this initiative spans. Each becomes a Tusk task at `level=story` parented to this Initiative.>
````

- [ ] **Step 5: Verify all three files exist and contain the Karpathy fields**

Run:
```bash
for f in desc-project.md desc-milestone.md desc-initiative.md; do
  for field in "Success Criteria" "Assumptions Made" "Open Questions" "Tradeoffs Considered" "Out of Scope"; do
    grep -q "^## $field" "plugins/superhuman/templates/wbs/$f" || { echo "FAIL: $f missing $field"; exit 1; }
  done
done && echo "OK: all upper-level templates have Karpathy fields"
```
Expected: `OK: all upper-level templates have Karpathy fields`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/templates/wbs/desc-project.md plugins/superhuman/templates/wbs/desc-milestone.md plugins/superhuman/templates/wbs/desc-initiative.md
git commit -m "Add WBS description templates for Project, Milestone, Initiative"
```

---

## Task 3: Description templates — narrow levels

**Files:**
- Create: `plugins/superhuman/templates/wbs/desc-story.md`
- Create: `plugins/superhuman/templates/wbs/desc-task.md`
- Create: `plugins/superhuman/templates/wbs/desc-spike.md`

Story keeps the Karpathy skeleton plus links to the spec/plan notes. Task and Spike are execution-ready and include References sections.

- [ ] **Step 1: Verify none of the three files exist**

Run:
```bash
for f in desc-story.md desc-task.md desc-spike.md; do test ! -f "plugins/superhuman/templates/wbs/$f" || { echo "FAIL: $f exists"; exit 1; }; done && echo "OK: none exist yet"
```
Expected: `OK: none exist yet`

- [ ] **Step 2: Create desc-story.md**

Write `plugins/superhuman/templates/wbs/desc-story.md` with exactly this content:

````markdown
# <story-title>

## Outcome

<One paragraph: the user-visible behavior or system change this story delivers. Phrase from the user's perspective when applicable ("users can …", "the system supports …").>

## Success Criteria

<Acceptance criteria. Often expressed as: given X, when Y, then Z.>

## Assumptions Made

<Empty must read "none.">

## Open Questions

<Empty must read "none, because …">

## Tradeoffs Considered

<Alternatives rejected.>

## Out of Scope

<Explicit non-goals.>

## Spec note

<Note ID of the `meta.type=spec` Tusk note containing this story's full design spec, populated by wrapped brainstorming.>

## Plan note

<Note ID of the `meta.type=plan` Tusk note containing this story's implementation plan, populated by wrapped writing-plans.>

## Phasing

No phases needed.

<Or list phases for heavy phasing. Each phase has its own `meta.type=phase-plan, meta.phase=phase-N` note on this Story (see `note-phase-plan-heavy.md`). Tasks belonging to a phase are tagged `+phase-N`.>

## Tasks

<The task / spike titles this story decomposes into. Each becomes a Tusk task at `level=task` or `level=spike` parented to this Story.>
````

- [ ] **Step 3: Create desc-task.md**

Write `plugins/superhuman/templates/wbs/desc-task.md` with exactly this content:

````markdown
# <task-title>

## Outcome

<What execution of this task accomplishes. One or two sentences. Concrete and actionable.>

## Target Files

<Specific files (with line ranges if applicable):
- Create: `path/to/new/file.ext`
- Modify: `path/to/existing/file.ext:LINE_RANGE`
- Test: `path/to/test/file.ext`>

## Change Summary

<The exact change to make. Code blocks if applicable. Reference the parent's spec/plan/phase-plan notes for design rationale rather than restating it here.>

## Verification

<The command(s) to run after the change, with the expected output:

```bash
<command>
```

Expected: <exact expected output or behavior>>

## References

<Tusk artifacts to consult while executing:
- Spec note: `<note-id-or-link>`
- Plan note: `<note-id-or-link>`
- Phase plan note (if phased): `<note-id-or-link>`
- Sibling tasks (cohort context): `<short-id>, <short-id>, …`
- Parent task annotations of interest: `<annotation-id>, …`>

## Phase

<If part of a phase: `+phase-N`. Else: "Not phased.">
````

- [ ] **Step 4: Create desc-spike.md**

Write `plugins/superhuman/templates/wbs/desc-spike.md` with exactly this content:

````markdown
# <spike-title>

## Research Question

<The specific question this spike answers. Phrase narrowly — a spike that asks "how should we do auth?" is too wide; "should we use JWTs or session cookies for the admin UI?" is right-sized.>

## Decision Needed

<What downstream decision this spike unblocks. Name the parent task or story that will act on the spike's output.>

## Time-box

<Maximum hours / days the spike should take. If exceeded, escalate to the parent rather than continuing.>

## Expected Output Format

<What the spike's deliverable looks like:
- A note with a recommendation and rationale, or
- A working prototype at <path>, or
- A decision matrix in a note, or
- Etc.>

## Constraints

<Anything that bounds the spike's exploration: tech stack decisions already made, deadlines, dependencies on parallel work, etc.>

## References

<Tusk artifacts to consult:
- Parent task / story: `<task-id>`
- Related notes: `<note-id>, <note-id>, …`
- Prior spikes that inform this one: `<task-id>, …`>

## Phase

<If part of a phase: `+phase-N`. Else: "Not phased.">
````

- [ ] **Step 5: Verify all three files exist with required sections**

Run:
```bash
grep -q "^## Spec note" plugins/superhuman/templates/wbs/desc-story.md && grep -q "^## Plan note" plugins/superhuman/templates/wbs/desc-story.md && grep -q "^## Target Files" plugins/superhuman/templates/wbs/desc-task.md && grep -q "^## Verification" plugins/superhuman/templates/wbs/desc-task.md && grep -q "^## References" plugins/superhuman/templates/wbs/desc-task.md && grep -q "^## Time-box" plugins/superhuman/templates/wbs/desc-spike.md && grep -q "^## Research Question" plugins/superhuman/templates/wbs/desc-spike.md && echo "OK: narrow-level templates have required sections"
```
Expected: `OK: narrow-level templates have required sections`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/templates/wbs/desc-story.md plugins/superhuman/templates/wbs/desc-task.md plugins/superhuman/templates/wbs/desc-spike.md
git commit -m "Add WBS description templates for Story, Task, Spike"
```

---

## Task 4: Note templates — design content

**Files:**
- Create: `plugins/superhuman/templates/wbs/note-brainstorm.md`
- Create: `plugins/superhuman/templates/wbs/note-spec.md`
- Create: `plugins/superhuman/templates/wbs/note-plan.md`

These define the structured shape the orchestrator (and wrapped brainstorming/writing-plans) emit as Tusk notes.

- [ ] **Step 1: Verify none of the three files exist**

Run:
```bash
for f in note-brainstorm.md note-spec.md note-plan.md; do test ! -f "plugins/superhuman/templates/wbs/$f" || { echo "FAIL: $f exists"; exit 1; }; done && echo "OK: none exist yet"
```
Expected: `OK: none exist yet`

- [ ] **Step 2: Create note-brainstorm.md**

Write `plugins/superhuman/templates/wbs/note-brainstorm.md` with exactly this content:

````markdown
# Brainstorm — <node-title>

**Tusk note metadata:** `meta.type=brainstorm`

## Context

<What was already known going in. The state of the parent / related nodes when this brainstorm started.>

## Discussion

<The substantive back-and-forth: questions explored, options considered, evidence weighed. Not a verbatim transcript — a digest of the reasoning.>

## Decisions

<Concrete choices made during the brainstorm. One bullet per decision, phrased as a commitment.>

## Alternatives Rejected

<Options considered and rejected, with the reason for each.>

## Open Follow-ups

<Loose threads that didn't get resolved. These usually land in the node's Open Questions field, but capture them here too so the brainstorm note is self-contained.>
````

- [ ] **Step 3: Create note-spec.md**

Write `plugins/superhuman/templates/wbs/note-spec.md` with exactly this content:

````markdown
# Spec — <node-title>

**Tusk note metadata:** `meta.type=spec`

## Goal

<One paragraph: what this node delivers. Mirrors the description's Outcome but expanded with rationale.>

## Architecture

<The shape of the design. Components, boundaries, key abstractions. Diagrams if helpful.>

## Components

<Per-component descriptions. What each does, what it depends on, what its interface looks like.>

## Data flow

<How data and control move through the components. End-to-end scenarios.>

## Error handling

<Failure modes and how they're handled.>

## Verification

<How we'll know this is correct: tests, smoke checks, acceptance scenarios.>

## Out of scope

<Explicit non-goals for the implementation.>
````

- [ ] **Step 4: Create note-plan.md**

Write `plugins/superhuman/templates/wbs/note-plan.md` with exactly this content:

````markdown
# Plan — <node-title>

**Tusk note metadata:** `meta.type=plan`

**Spec reference:** `<note-id of the spec note>`

## File Structure

<Files this plan creates or modifies, with the responsibility of each.>

## Tasks

<Numbered task list. Each task corresponds to a Tusk task that will be created at `level=task` parented to the Story this plan belongs to. For each:

### Task <N>: <title>

**Files:** create / modify list.

**Steps:**
- [ ] Step description
- [ ] Step description
- [ ] Commit

If the plan is heavily phased, group tasks by `+phase-N` and reference the corresponding `note-phase-plan-heavy.md` note for the phase contract.>

## Verification

<End-to-end checks across the plan: static checks, smoke runs, behavioral verification.>
````

- [ ] **Step 5: Verify all three files exist with the metadata header**

Run:
```bash
for f in note-brainstorm.md note-spec.md note-plan.md; do grep -q "^\*\*Tusk note metadata:\*\*" "plugins/superhuman/templates/wbs/$f" || { echo "FAIL: $f missing metadata header"; exit 1; }; done && echo "OK: all design-content note templates declare their meta.type"
```
Expected: `OK: all design-content note templates declare their meta.type`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/templates/wbs/note-brainstorm.md plugins/superhuman/templates/wbs/note-spec.md plugins/superhuman/templates/wbs/note-plan.md
git commit -m "Add WBS note templates for brainstorm, spec, plan"
```

---

## Task 5: Note templates — phasing

**Files:**
- Create: `plugins/superhuman/templates/wbs/note-phase-plan-light.md`
- Create: `plugins/superhuman/templates/wbs/note-phase-plan-heavy.md`

Light is for upper-level (Project / Milestone / Initiative) design phasing. Heavy is the destination shape for the existing `phase-planning-rules` skill content (reshape happens in sub-project #2).

- [ ] **Step 1: Verify neither file exists**

Run:
```bash
test ! -f plugins/superhuman/templates/wbs/note-phase-plan-light.md && test ! -f plugins/superhuman/templates/wbs/note-phase-plan-heavy.md && echo "OK: neither exists yet"
```
Expected: `OK: neither exists yet`

- [ ] **Step 2: Create note-phase-plan-light.md**

Write `plugins/superhuman/templates/wbs/note-phase-plan-light.md` with exactly this content:

````markdown
# Phase plan (light) — <parent-title> / phase <N>

**Tusk note metadata:** `meta.type=phase-plan, meta.phase=phase-<N>`

**Use this template when** the parent node is at Project, Milestone, or Initiative level and you need to break design or research work into chunks.

## Phase Outcome

<What this phase produces. Usually a deliverable consumed by the next phase or by the parent's decomposition step.>

## Dependencies

<Other phases that must complete before this one starts (`+phase-K`), or "none" if this phase has no upstream dependencies.>

## Parallelism

<Can this phase run in parallel with other phases? List the parallel-eligible siblings (`+phase-K`), or "must run sequentially after dependencies."

## Owner

<Player ID, agent name, or "TBD" if not yet assigned.>

## Tasks in this phase

<Tusk task short IDs of the children tagged `+phase-<N>`. Populated as those tasks are created.>

## Notes

<Anything implementer-relevant: known unknowns, references to upstream notes, etc.>
````

- [ ] **Step 3: Create note-phase-plan-heavy.md**

Write `plugins/superhuman/templates/wbs/note-phase-plan-heavy.md` with exactly this content:

````markdown
# Phase plan (heavy) — <parent-title> / phase <N>

**Tusk note metadata:** `meta.type=phase-plan, meta.phase=phase-<N>`

**Use this template when** the parent node is a Story whose implementation plan needs phasing — typically because the work splits across multiple implementer agents or has compilation-safety bridge code requirements. Follows the contract from the existing `phase-planning-rules` skill.

## Inherits From

<What state the codebase will be in when this phase begins: which prior phases have completed, which interfaces / files / types they introduced. The implementer agent for this phase relies on this section being accurate.>

## Phase Outcome

<What this phase delivers. Phrase as the new state of the codebase after the phase ships. Must be independently shippable — the system must be deployable and functional after this phase, even if a later phase will replace some of the bridge code.>

## Tasks (4–6)

<A numbered list of exactly 4–6 tasks the implementer agent will execute. Each task is a Tusk task at `level=task`, parented to the Story, tagged `+phase-<N>`.

### Task 1: <title>

Files: create / modify.
Steps: ordered checkbox list.

### Task 2: …

…>

## Bridge Code

<Stubs, no-ops, feature flags, or adapter layers introduced in this phase to maintain compilation safety. Each entry tags the **removal target phase** where the bridge will be replaced. If you cannot name a removal phase, the plan is incomplete.

| Bridge | Introduced for | Removal target |
|---|---|---|
| `<symbol or file>` | <reason> | `+phase-<K>` |>

## Compilation Safety

<Confirmation that the codebase compiles and passes type-checking after this phase is applied in isolation. List any pedantic / strict modes that should be run.>

## Changes Introduced

<Concrete output of this phase that the next phase's "Inherits From" will reference:

- New files: …
- Modified interfaces: …
- New environment variables: …
- Schema migrations: …
- New dependencies: …
- Bridge code added (with removal target): …>

## User-visible Behaviors

<List of behaviors that must still work after this phase ships. Used by the implementer agent as acceptance criteria, and by the post-implementation review for regression checking.>
````

- [ ] **Step 4: Verify both files exist with the metadata header and key sections**

Run:
```bash
grep -q "meta.type=phase-plan, meta.phase=phase-<N>" plugins/superhuman/templates/wbs/note-phase-plan-light.md && grep -q "^## Phase Outcome" plugins/superhuman/templates/wbs/note-phase-plan-light.md && grep -q "meta.type=phase-plan, meta.phase=phase-<N>" plugins/superhuman/templates/wbs/note-phase-plan-heavy.md && grep -q "^## Inherits From" plugins/superhuman/templates/wbs/note-phase-plan-heavy.md && grep -q "^## Bridge Code" plugins/superhuman/templates/wbs/note-phase-plan-heavy.md && grep -q "^## Changes Introduced" plugins/superhuman/templates/wbs/note-phase-plan-heavy.md && echo "OK: phase plan templates have required sections"
```
Expected: `OK: phase plan templates have required sections`

- [ ] **Step 5: Commit**

```bash
git add plugins/superhuman/templates/wbs/note-phase-plan-light.md plugins/superhuman/templates/wbs/note-phase-plan-heavy.md
git commit -m "Add WBS phase plan note templates (light and heavy)"
```

---

## Task 6: `/wbs-new` slash command

**Files:**
- Create: `plugins/superhuman/commands/wbs-new.md`

The slash command's body is the procedural directive the agent follows when the user types `/wbs-new`. It uses Tusk MCP for actual task creation.

- [ ] **Step 1: Verify the file does not exist**

Run:
```bash
test ! -f plugins/superhuman/commands/wbs-new.md && echo "OK: command file absent"
```
Expected: `OK: command file absent`

- [ ] **Step 2: Create the command file**

Write `plugins/superhuman/commands/wbs-new.md` with exactly this content:

````markdown
---
description: Create a Tusk task at a WBS level under the current parent, with the level-appropriate description template populated.
argument-hint: <level> [title]
---

# /wbs-new

Create a new WBS node — a Tusk task — at the given level under the current parent (or as a root in the active Tusk Project if no parent context).

## Arguments

- `<level>` (required) — one of: `milestone`, `initiative`, `story`, `task`, `spike`. Must match the active project's taxonomy.
- `[title]` (optional) — the task title. If omitted, prompt the user for it before creating.

## Procedure

1. **Resolve the active Tusk Project.** Use Tusk MCP (`tusk_project_list` or `tusk_project_get`) to determine the current project. If multiple projects exist and none is implied by context, ask the user which one.

2. **Validate the level against the project's taxonomy.** Call `tusk_project_settings_get` (or equivalent) to fetch the taxonomy. Confirm `<level>` appears in the rank list. If the project has no WBS taxonomy, surface a hard error pointing at `templates/wbs/taxonomy.md`.

3. **Resolve the parent.** In order of preference:
   - An explicit `parent=<short-id>` flag in the user's message.
   - The "current" Tusk task — the one most recently inspected, modified, or created in this session (the orchestrator skill maintains this context).
   - For root-rank levels (the top of the taxonomy), no parent — the task is created as a root in the project.
   - Otherwise, ask the user which parent task to use, listing recent candidate parents from `tusk_task_list`.

4. **Validate parent rank.** Tusk validates on create, but surface the error early: parent rank index must be strictly lower than the new task's rank.

5. **Load the description template.** Read `plugins/superhuman/templates/wbs/desc-<level>.md` from the plugin. Replace `<*-title>` placeholders with the resolved title.

6. **Create the Tusk task.** Call `tusk_task_create` with:
   - `title=<resolved-title>`
   - `level=<level>`
   - `parent=<parent-short-id>` (omit if root)
   - `description=<populated-template-content>`
   - `project=<project-name>`

7. **Hand off to the orchestrator skill.** Invoke `wbs-orientation` (the orchestrator skill) so it can begin walking the user through brainstorming the new node's content and driving the Karpathy decomposition gate.

## Errors

- **Tusk MCP unavailable** — hard error with remediation pointer. Do not fall back to file-based design.
- **No taxonomy on the project** — hard error pointing at `templates/wbs/taxonomy.md`.
- **Invalid level / rank parent mismatch** — surface Tusk's validation error verbatim.
- **Skipping ranks (e.g., `/wbs-new story` directly under a Project)** — allow but flag with a warning. Tusk permits any-ancestor-to-any-descendant parenting.

## Examples

```
/wbs-new milestone "Authentication overhaul"
/wbs-new initiative "Replace session cookies with JWTs"
/wbs-new story "Implement /api/auth/refresh endpoint"
/wbs-new task "Add JWTRefreshHandler to auth router"
/wbs-new spike "Compare HS256 vs RS256 for our deployment scale"
```
````

- [ ] **Step 3: Verify the command has frontmatter and procedure**

Run:
```bash
head -5 plugins/superhuman/commands/wbs-new.md | grep -q '^description:' && grep -q '^## Procedure' plugins/superhuman/commands/wbs-new.md && grep -q 'tusk_task_create' plugins/superhuman/commands/wbs-new.md && echo "OK: wbs-new has frontmatter and procedure"
```
Expected: `OK: wbs-new has frontmatter and procedure`

- [ ] **Step 4: Commit**

```bash
git add plugins/superhuman/commands/wbs-new.md
git commit -m "Add /wbs-new slash command for creating WBS nodes"
```

---

## Task 7: `/wbs-status` slash command

**Files:**
- Create: `plugins/superhuman/commands/wbs-status.md`

- [ ] **Step 1: Verify the file does not exist**

Run:
```bash
test ! -f plugins/superhuman/commands/wbs-status.md && echo "OK: command file absent"
```
Expected: `OK: command file absent`

- [ ] **Step 2: Create the command file**

Write `plugins/superhuman/commands/wbs-status.md` with exactly this content:

````markdown
---
description: Render the WBS subtree from a node with status rollup, phase tags, and orchestrator-surfaced warnings.
argument-hint: [task-id]
---

# /wbs-status

Render the WBS subtree from the given node (or from the project root if none) with status rollup, phase tags, and any warnings from the orchestrator skill.

## Arguments

- `[task-id]` (optional) — Tusk task short ID. Defaults to the current task context, or to the project root if no context exists.

## Procedure

1. **Resolve the target node.** Use the explicit task-id, or the orchestrator's current-task context, or the project root.

2. **Fetch the subtree.** Call Tusk MCP — `tusk_task_tree` for the structure and `tusk_task_summary` (or `tusk task tree --rollup` via shell) for `%done` rollup from descendants.

3. **Render the tree** with one task per line, indented by depth:
   - Level (e.g., `[milestone]`, `[story]`, `[task]`).
   - Title.
   - Status (from the workflow).
   - `%done` from descendants (when applicable).
   - Phase tags if any (`+phase-1`, `+phase-2`, …).

4. **Surface warnings:**
   - Tasks with empty Karpathy fields (Success Criteria, Assumptions, Open Questions, Tradeoffs Considered, Out of Scope) at design levels.
   - Phase-tag / phase-plan-note mismatches: a child tagged `+phase-N` whose parent has no `meta.type=phase-plan, meta.phase=phase-N` note (or a phase-plan note with no tagged children).
   - Reparented nodes whose phase-plan note metadata may need refreshing (heuristic: parent changed and `meta.phase` exists).

5. **Print the legend** at the bottom showing the symbols used for warnings.

## Errors

- **Tusk MCP unavailable** — hard error with remediation pointer.
- **Task ID not found** — surface Tusk's error verbatim and suggest `/wbs-status` with no argument to view the project root.

## Examples

```
/wbs-status                     # the active project, from root
/wbs-status a3f8b2c1             # subtree rooted at task a3f8b2c1
/wbs-status a3f8b2c1 --depth=2   # limit subtree depth
```
````

- [ ] **Step 3: Verify the command has frontmatter and procedure**

Run:
```bash
head -5 plugins/superhuman/commands/wbs-status.md | grep -q '^description:' && grep -q '^## Procedure' plugins/superhuman/commands/wbs-status.md && grep -q 'tusk_task_tree' plugins/superhuman/commands/wbs-status.md && echo "OK: wbs-status has frontmatter and procedure"
```
Expected: `OK: wbs-status has frontmatter and procedure`

- [ ] **Step 4: Commit**

```bash
git add plugins/superhuman/commands/wbs-status.md
git commit -m "Add /wbs-status slash command for WBS tree rollup"
```

---

## Task 8: Orchestrator skill — `wbs-orientation`

**Files:**
- Create: `plugins/superhuman/skills/wbs-orientation/SKILL.md`

The orchestrator is the load-bearing piece. It auto-invokes when the user works on a WBS node, loads the right templates, wraps brainstorming and writing-plans, enforces the Karpathy decomposition gate, and drives decomposition transitions.

- [ ] **Step 1: Verify the skill directory does not exist**

Run:
```bash
test ! -d plugins/superhuman/skills/wbs-orientation && echo "OK: skill dir absent"
```
Expected: `OK: skill dir absent`

- [ ] **Step 2: Create the skill directory**

Run:
```bash
mkdir -p plugins/superhuman/skills/wbs-orientation
```

- [ ] **Step 3: Create SKILL.md**

Write `plugins/superhuman/skills/wbs-orientation/SKILL.md` with exactly this content:

````markdown
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

- Call `tusk_project_get` (or `tusk_project_list`) to identify the active project.
- Hard error if Tusk MCP is unreachable. Point at `templates/wbs/taxonomy.md` for setup.
- Hard error if the project has no taxonomy. Surface the recommended taxonomy from `templates/wbs/taxonomy.md` and offer to apply it (workspace-wide or per-project).

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

Three operations are common:

- **Brainstorm a node's design.** Use when the node's description has empty Karpathy fields. Go to "Wrapped brainstorming."
- **Plan a Story's implementation.** Use when a Story has its spec note populated and is ready for implementation planning. Go to "Wrapped writing-plans."
- **Decompose a node into children.** Use when the description's Karpathy fields are populated and the user wants to create the next-rank-down children. Go to "Decomposition transition."

If unclear, ask the user which operation they want.

### 5. Wrapped brainstorming

When brainstorming a node:

1. Invoke the `brainstorming` skill via the Skill tool, with a context shim describing:
   - The current node's level, title, and parent context.
   - The level-appropriate description template (loaded in step 3).
   - The directive that the brainstorm output must land as a Tusk note (`meta.type=brainstorm` or `meta.type=spec`), not as `docs/superpowers/specs/<file>.md`.
2. Let brainstorming run its normal loop (one question at a time, propose 2–3 approaches, present design sections).
3. At brainstorming's "Write design doc" terminal step, capture the spec content. Choose the wrapping mechanism:
   - **Subagent capture (preferred):** invoke brainstorming as a subagent with instructions to return the final spec content as text rather than write it to disk; the orchestrator then posts it via `tusk_note_create`.
   - **Context-shim:** instruct the brainstorming skill in its initial context that the "Write design doc" step must call `tusk_note_create` with the right meta — viable if brainstorming is flexible enough to honor the override.
   - **Post-write hoist:** let brainstorming write the file, then read it, post via `tusk_note_create`, and delete the file. Last resort.
4. Update the node's description: populate the Karpathy fields with summaries from the spec, leaving deep rationale in the note. Use `tusk_task_modify` with `description=<populated-template>` and a fresh `version`.
5. The brainstorming skill's spec self-review and user-review gates still run, reading from the Tusk note.
6. When brainstorming's terminal step would invoke `writing-plans`, wrap that the same way (see step 6).

### 6. Wrapped writing-plans

When planning a Story's implementation:

1. Invoke the `writing-plans` skill via the Skill tool, with a context shim describing:
   - The current Story's spec note (pulled via `tusk_note_get`).
   - The directive that the plan output must land as a Tusk note (`meta.type=plan`), not as `docs/superpowers/plans/<file>.md`.
2. Let writing-plans produce the plan content.
3. Post the plan via `tusk_note_create` with `task=<story-id>, meta.type=plan, body=<plan-content>`.
4. If the plan has phases (heavy phasing — multiple implementer agents, sequential dependencies, etc.), per-phase notes are added with `meta.type=phase-plan, meta.phase=phase-N`. Each phase note follows `templates/wbs/note-phase-plan-heavy.md`.
5. Each task in the plan becomes a child Tusk task at `level=task` parented to the Story, tagged `+phase-N` if the plan is phased. Use `/wbs-new task` for each — do not bypass the command.

### 7. Enforce the Karpathy decomposition gate

Before allowing a node to transition to a "ready to decompose" status (or before scaffolding child nodes), verify all of the following on the node's description:

- `## Success Criteria` is non-empty and not just placeholder text.
- `## Assumptions Made` is non-empty (must read "none" if there genuinely are none).
- `## Open Questions` is non-empty (must read "none, because …" if genuinely none).
- `## Tradeoffs Considered` is non-empty.
- `## Out of Scope` is non-empty.
- The level-appropriate children section (`## Milestones`, `## Initiatives`, `## Stories`, or `## Tasks`) lists at least one child by title — or the node is intentionally a leaf.

If any check fails: name the missing or weak field(s), refuse to proceed with decomposition, and offer to walk the user through filling them. **Never auto-fill.** Empty fields must be deliberate.

### 8. Decomposition transition

When the gate passes and the user is ready to create children:

1. Read the children list from the description (Milestones / Initiatives / Stories / Tasks section).
2. For each child title, run `/wbs-new <child-level> "<title>"` — this creates the Tusk task and re-invokes this orchestrator skill on the new node.
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
````

- [ ] **Step 4: Verify the skill file has frontmatter, the procedure, and the error table**

Run:
```bash
head -5 plugins/superhuman/skills/wbs-orientation/SKILL.md | grep -q '^name: wbs-orientation' && head -5 plugins/superhuman/skills/wbs-orientation/SKILL.md | grep -q '^description:' && grep -q '^## Operating procedure' plugins/superhuman/skills/wbs-orientation/SKILL.md && grep -q '^## Error handling' plugins/superhuman/skills/wbs-orientation/SKILL.md && grep -q '### 7. Enforce the Karpathy decomposition gate' plugins/superhuman/skills/wbs-orientation/SKILL.md && echo "OK: orchestrator skill structure present"
```
Expected: `OK: orchestrator skill structure present`

- [ ] **Step 5: Commit**

```bash
git add plugins/superhuman/skills/wbs-orientation/SKILL.md
git commit -m "Add wbs-orientation orchestrator skill"
```

---

## Task 9: End-to-end verification

**Files:** none created. This task verifies the full delivery is sound and matches the spec.

This is a final pass with no commits. If a check fails, stop and investigate.

- [ ] **Step 1: Verify the full file tree matches the spec**

Run:
```bash
find plugins/superhuman -type f -not -name '.gitkeep' -not -path '*/templates/wbs/*' -not -path '*/skills/wbs-orientation/*' -not -path '*/commands/wbs-*' | sort && echo "---" && find plugins/superhuman/templates/wbs plugins/superhuman/skills/wbs-orientation plugins/superhuman/commands -type f 2>/dev/null | sort
```

The first block shows the pre-existing scaffold files (manifests, READMEs); the second block shows the WBS spine additions. The second block must contain exactly:

```
plugins/superhuman/commands/wbs-new.md
plugins/superhuman/commands/wbs-status.md
plugins/superhuman/skills/wbs-orientation/SKILL.md
plugins/superhuman/templates/wbs/conventions.md
plugins/superhuman/templates/wbs/desc-initiative.md
plugins/superhuman/templates/wbs/desc-milestone.md
plugins/superhuman/templates/wbs/desc-project.md
plugins/superhuman/templates/wbs/desc-spike.md
plugins/superhuman/templates/wbs/desc-story.md
plugins/superhuman/templates/wbs/desc-task.md
plugins/superhuman/templates/wbs/note-brainstorm.md
plugins/superhuman/templates/wbs/note-phase-plan-heavy.md
plugins/superhuman/templates/wbs/note-phase-plan-light.md
plugins/superhuman/templates/wbs/note-plan.md
plugins/superhuman/templates/wbs/note-spec.md
plugins/superhuman/templates/wbs/taxonomy.md
```

- [ ] **Step 2: Verify all six description templates have the Karpathy skeleton**

Run:
```bash
for f in plugins/superhuman/templates/wbs/desc-project.md plugins/superhuman/templates/wbs/desc-milestone.md plugins/superhuman/templates/wbs/desc-initiative.md plugins/superhuman/templates/wbs/desc-story.md; do
  for field in "## Outcome" "## Success Criteria" "## Assumptions Made" "## Open Questions" "## Tradeoffs Considered" "## Out of Scope"; do
    grep -q "^$field" "$f" || { echo "FAIL: $f missing $field"; exit 1; }
  done
done && echo "OK: design-level templates have Karpathy fields"
```
Expected: `OK: design-level templates have Karpathy fields`

(Note: `desc-task.md` and `desc-spike.md` have a different shape — execution-ready, not Karpathy fields. They were verified separately in Task 3.)

- [ ] **Step 3: Verify both slash commands declare argument hints**

Run:
```bash
grep -q "^argument-hint:" plugins/superhuman/commands/wbs-new.md && grep -q "^argument-hint:" plugins/superhuman/commands/wbs-status.md && echo "OK: slash commands have argument hints"
```
Expected: `OK: slash commands have argument hints`

- [ ] **Step 4: Verify the orchestrator skill references conventions.md**

Run:
```bash
grep -q 'templates/wbs/conventions.md' plugins/superhuman/skills/wbs-orientation/SKILL.md && grep -q 'templates/wbs/taxonomy.md' plugins/superhuman/skills/wbs-orientation/SKILL.md && echo "OK: orchestrator skill cross-references the reference docs"
```
Expected: `OK: orchestrator skill cross-references the reference docs`

- [ ] **Step 5: Re-validate the existing manifests**

Run:
```bash
jq -e '.name and .plugins' .claude-plugin/marketplace.json && jq -e '.name and .description' plugins/superhuman/.claude-plugin/plugin.json && echo "OK: manifests still valid"
```
Expected: `true` (twice from `jq -e`) then `OK: manifests still valid`.

- [ ] **Step 6: Verify git status is clean**

Run:
```bash
git status --porcelain
```
Expected: no output (empty — clean working tree).

- [ ] **Step 7: Verify the commit history shows the eight WBS spine commits**

Run:
```bash
git log --oneline | head -12
```
Expected: the eight task commits from this plan, on top of the prior commits (spec, roadmap, scaffold). Newest first, with messages similar to:
```
<sha> Add wbs-orientation orchestrator skill
<sha> Add /wbs-status slash command for WBS tree rollup
<sha> Add /wbs-new slash command for creating WBS nodes
<sha> Add WBS phase plan note templates (light and heavy)
<sha> Add WBS note templates for brainstorm, spec, plan
<sha> Add WBS description templates for Story, Task, Spike
<sha> Add WBS description templates for Project, Milestone, Initiative
<sha> Add WBS conventions and taxonomy reference docs
<sha> Add WBS spine design spec and Superhuman WBS roadmap
…
```

- [ ] **Step 8: Surface install instructions for the user**

Output to the user (do not run — these are slash commands the user runs in their own Claude Code session):

```
WBS spine implementation complete. To exercise it:

  1. /plugin marketplace add /Users/germanamz/projects/superhuman   (or pull latest if already added)
  2. /plugin install superhuman@superhuman                            (or upgrade)
  3. Confirm /wbs-new and /wbs-status appear in the slash-command list.
  4. Confirm wbs-orientation appears in the skill registry.

Then bootstrap a Tusk project per `plugins/superhuman/templates/wbs/taxonomy.md` and run the smoke walkthrough from
`docs/superpowers/specs/2026-04-29-superhuman-wbs-spine-design.md` (Verification → End-to-end smoke).
```

---

## Out of scope (do NOT do)

- Do **not** reshape the existing `phase-planning-rules`, `phase-continuity-review`, or `phase-post-implementation-review` skills. Sub-project #2 in the roadmap handles relocation and reshape. The spine only ships the destination shape (`note-phase-plan-heavy.md`).
- Do **not** wire bidirectional sync, dashboards, or custom Tusk queries. Sub-project #3.
- Do **not** ship implementation pipelines (agent-orchestrated or human-orchestrated execution patterns). Sub-project #4.
- Do **not** ship code-quality or architecture conventions skills. Sub-projects #6 and #7.
- Do **not** push the repo to GitHub. The user pushes manually when ready.
