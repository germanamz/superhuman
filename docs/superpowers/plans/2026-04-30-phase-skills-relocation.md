# Phase Skills Relocation + Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Tusk-native versions of `phase-planning-rules`, `phase-continuity-review`, and `phase-post-implementation-review` inside `plugins/superhuman/skills/`, plus minor cross-reference fixes in already-shipped spine artifacts.

**Architecture:** Three new SKILL.md files under `plugins/superhuman/skills/<name>/`, each with WBS-tightened frontmatter and Tusk-bound rule prose. One small edit in `plugins/superhuman/skills/wbs-orientation/SKILL.md`. One alignment diff pass on `plugins/superhuman/templates/wbs/note-phase-plan-heavy.md`. Manual deletion step for the file-based originals in `~/.claude/skills/`.

**Tech Stack:** Markdown with YAML frontmatter; the `superpowers:writing-skills` skill governs SKILL.md authoring; `jq` for marketplace-catalog validation; `head` / `grep` / `awk` for inline frontmatter checks (no test runner — content artifacts).

**Spec:** [`docs/superpowers/specs/2026-04-30-phase-skills-relocation-design.md`](../specs/2026-04-30-phase-skills-relocation-design.md).

---

### Task 1: Author `phase-planning-rules` SKILL.md

**Files:**
- Create: `plugins/superhuman/skills/phase-planning-rules/SKILL.md`

- [ ] **Step 1: Invoke `superpowers:writing-skills` for SKILL.md authoring discipline**

The spec's Implementation Notes section requires this. Invoke before authoring:

Skill tool call: `skill: superpowers:writing-skills, args: "Authoring plugins/superhuman/skills/phase-planning-rules/SKILL.md per the design spec at docs/superpowers/specs/2026-04-30-phase-skills-relocation-design.md (Components section 1)."`

Read the skill's guidance, then proceed to step 2.

- [ ] **Step 2: Create the directory**

Run: `mkdir -p plugins/superhuman/skills/phase-planning-rules`

- [ ] **Step 3: Write the SKILL.md file**

Write to `plugins/superhuman/skills/phase-planning-rules/SKILL.md`:

```markdown
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
```

- [ ] **Step 4: Verify frontmatter**

Run: `head -4 plugins/superhuman/skills/phase-planning-rules/SKILL.md`

Expected output:
```
---
name: phase-planning-rules
description: Rules for drafting phased implementation plans for a WBS-Tusk-backed Story. Use when splitting a Story's implementation into phases — each phase becomes a `meta.type=phase-plan` Tusk note on the Story, and each task within is dispatched per-task to a separate implementer subagent.
---
```

- [ ] **Step 5: Verify name matches directory**

Run: `test "$(grep '^name:' plugins/superhuman/skills/phase-planning-rules/SKILL.md | head -1 | awk '{print $2}')" = "phase-planning-rules" && echo OK`

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/skills/phase-planning-rules/SKILL.md
git commit -m "Add Tusk-native phase-planning-rules skill to superhuman plugin"
```

---

### Task 2: Author `phase-continuity-review` SKILL.md

**Files:**
- Create: `plugins/superhuman/skills/phase-continuity-review/SKILL.md`

- [ ] **Step 1: Invoke `superpowers:writing-skills`**

Skill tool call: `skill: superpowers:writing-skills, args: "Authoring plugins/superhuman/skills/phase-continuity-review/SKILL.md per the design spec at docs/superpowers/specs/2026-04-30-phase-skills-relocation-design.md (Components section 2)."`

- [ ] **Step 2: Create the directory**

Run: `mkdir -p plugins/superhuman/skills/phase-continuity-review`

- [ ] **Step 3: Write the SKILL.md file**

Write to `plugins/superhuman/skills/phase-continuity-review/SKILL.md`:

```markdown
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
```

- [ ] **Step 4: Verify frontmatter**

Run: `head -4 plugins/superhuman/skills/phase-continuity-review/SKILL.md`

Expected: file starts with `---`, then `name: phase-continuity-review`, then the description line, then `---`.

- [ ] **Step 5: Verify name matches directory**

Run: `test "$(grep '^name:' plugins/superhuman/skills/phase-continuity-review/SKILL.md | head -1 | awk '{print $2}')" = "phase-continuity-review" && echo OK`

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/skills/phase-continuity-review/SKILL.md
git commit -m "Add Tusk-native phase-continuity-review skill to superhuman plugin"
```

---

### Task 3: Author `phase-post-implementation-review` SKILL.md

**Files:**
- Create: `plugins/superhuman/skills/phase-post-implementation-review/SKILL.md`

- [ ] **Step 1: Invoke `superpowers:writing-skills`**

Skill tool call: `skill: superpowers:writing-skills, args: "Authoring plugins/superhuman/skills/phase-post-implementation-review/SKILL.md per the design spec at docs/superpowers/specs/2026-04-30-phase-skills-relocation-design.md (Components section 3)."`

- [ ] **Step 2: Create the directory**

Run: `mkdir -p plugins/superhuman/skills/phase-post-implementation-review`

- [ ] **Step 3: Write the SKILL.md file**

Write to `plugins/superhuman/skills/phase-post-implementation-review/SKILL.md`:

```markdown
---
name: phase-post-implementation-review
description: Per-phase verification gate and final sequence review for a WBS-Tusk-backed Story. Run per-phase between implementer cohorts; run final sequence checks once after all phases ship.
---

## Post-Implementation Review and Verification

This review is performed by the planning agent — the same agent that drafted the phase-plan notes and ran the continuity review. It is the only agent that understands the reasoning behind the phase split and has visibility across the full plan.

Each Tusk task is dispatched to a separate implementer subagent. While implementer subagents can read the parent Story's `spec`, `plan`, and the relevant phase-plan note via Tusk MCP, they cannot coordinate with each other or flag cross-phase issues during execution. That makes this review the only point where plan-level intent is compared against actual code across the full sequence.

### Per-Phase Verification

Perform these checks after each phase's tasks are workflow-completed in Tusk, before dispatching the next phase's tasks to their implementer subagents. This is the planning agent's gate between phases — if a check fails, fix the issue before proceeding. Errors that pass this gate compound, and no downstream implementer subagent can detect or correct them.

1. **Compilation and type-checking.**
   The codebase must compile and pass all type checks with zero errors and zero new warnings. Run the full build, not just the files the implementer touched. If the project has a strict/pedantic compiler mode, use it. A compile failure here means the next implementer subagent inherits a broken starting point.
   _Verifies: planning rule 4 (compilation safety)._

2. **Task completion is literal.**
   Walk the phase-plan note task-by-task. For each task: identify the exact code change AND confirm the corresponding Tusk task is workflow-completed. If a task in the note cannot be mapped to a concrete code change, or a Tusk task is open while the note treats it as done (or vice versa), flag the failure. Skipped tasks usually mean the phase-plan note was ambiguous — fix the note for future reference even if you fix the code now.
   _Verifies: planning rule 2 (Tusk task description as primary directive)._

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
   - **Completion seal:** Post a timestamped annotation on the Story summarizing implementation outcome — date, phases shipped, bridges resolved, normalization follow-ups (if any), and the spec/plan note IDs. This is the durable marker future agents see when first reading the Story.
   - **Phase-plan archive:** For each `meta.type=phase-plan` note on the Story, set the archive flag via Tusk (the `meta.type=spec` and `meta.type=plan` notes stay non-archived as canonical references). Archived notes remain queryable via Tusk's archive flag but are hidden from default views — they document how the Story was implemented without cluttering future context.
   If either operation fails for some notes/annotations, surface clearly: completion is incomplete, and a future agent reading the Story will see phase-plan notes in the default view. Manual remediation: re-run the failed operation.
```

- [ ] **Step 4: Verify frontmatter**

Run: `head -4 plugins/superhuman/skills/phase-post-implementation-review/SKILL.md`

Expected: file starts with `---`, then `name: phase-post-implementation-review`, then the description line, then `---`.

- [ ] **Step 5: Verify name matches directory**

Run: `test "$(grep '^name:' plugins/superhuman/skills/phase-post-implementation-review/SKILL.md | head -1 | awk '{print $2}')" = "phase-post-implementation-review" && echo OK`

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add plugins/superhuman/skills/phase-post-implementation-review/SKILL.md
git commit -m "Add Tusk-native phase-post-implementation-review skill to superhuman plugin"
```

---

### Task 4: Cross-reference edits in `wbs-orientation/SKILL.md`

**Files:**
- Modify: `plugins/superhuman/skills/wbs-orientation/SKILL.md`

The current step 6 ("Wrapped writing-plans") in `wbs-orientation/SKILL.md` describes heavy-phasing without naming `phase-planning-rules` or `phase-post-implementation-review` by their plugin-namespaced skill names. Add explicit references so the orchestrator can hand off cleanly.

- [ ] **Step 1: Read the current wbs-orientation SKILL.md**

Run: `cat plugins/superhuman/skills/wbs-orientation/SKILL.md | head -100`

Locate step 6 (around line 76 in the current file, which begins with `### 6. Wrapped writing-plans`).

- [ ] **Step 2: Edit step 6 to reference `superhuman:phase-planning-rules`**

In `plugins/superhuman/skills/wbs-orientation/SKILL.md`, find the existing line in step 6 that reads:

```
4. If the plan has phases (heavy phasing — multiple implementer agents, sequential dependencies, etc.), per-phase notes are added with `meta.type=phase-plan, meta.phase=phase-N`. Each phase note follows `templates/wbs/note-phase-plan-heavy.md`.
```

Replace it with:

```
4. If the plan has phases (heavy phasing — multiple implementer subagents per Tusk task, sequential bridge-code dependencies, etc.), `superhuman:phase-planning-rules` auto-invokes; let it drive the per-phase note shape and the 4–6 task split. Per-phase notes land as `meta.type=phase-plan, meta.phase=phase-N` on the Story, following `templates/wbs/note-phase-plan-heavy.md`. After all phase-plan notes are drafted, `superhuman:phase-continuity-review` auto-invokes before any task is dispatched. After each phase's tasks are workflow-completed and after all phases ship, `superhuman:phase-post-implementation-review` auto-invokes for the per-phase gate and final sequence verification.
```

- [ ] **Step 3: Verify the edits**

Run: `grep -n "superhuman:phase-" plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected: at least three lines showing `superhuman:phase-planning-rules`, `superhuman:phase-continuity-review`, and `superhuman:phase-post-implementation-review`.

- [ ] **Step 4: Commit**

```bash
git add plugins/superhuman/skills/wbs-orientation/SKILL.md
git commit -m "Cross-reference phase skills from wbs-orientation step 6"
```

---

### Task 5: Alignment diff pass on `note-phase-plan-heavy.md`

**Files:**
- Modify (only if drift found): `plugins/superhuman/templates/wbs/note-phase-plan-heavy.md`

The new `phase-planning-rules` rules 7–9 reference these section names: **Inherits From**, **Phase Outcome**, **Tasks**, **Bridge Code**, **Compilation Safety**, **Changes Introduced**, **User-visible Behaviors**. Verify the template's headings match exactly. Drift = implementer confusion.

- [ ] **Step 1: List the template's H2 headings**

Run: `grep -n "^## " plugins/superhuman/templates/wbs/note-phase-plan-heavy.md`

Expected output (current state):
```
7:## Inherits From
11:## Phase Outcome
15:## Tasks (4–6)
28:## Bridge Code
36:## Compilation Safety
40:## Changes Introduced
51:## User-visible Behaviors
```

- [ ] **Step 2: Compare to rule references**

Each rule's referenced heading must exist in the template. Cross-reference:

- Rule 7: "Changes Introduced" ✓, "Inherits From" ✓
- Rule 8: "Bridge Code" ✓
- Rule 9: "User-visible Behaviors" ✓
- Continuity check 3: "Changes Introduced" ✓, "Inherits From" ✓
- Continuity check 4: "Bridge Code" entries ✓
- Per-phase check 2: "Tasks" ✓
- Per-phase check 5: "Changes Introduced" ✓
- Per-phase check 6: "Bridge Code" ✓

If all match, no edit needed; skip to step 4. If any heading drifts, edit the template to align with the rule reference (rules are the authority — the spec's section 5 of Components specifies this).

- [ ] **Step 3: If edits were needed, commit**

```bash
git add plugins/superhuman/templates/wbs/note-phase-plan-heavy.md
git commit -m "Align note-phase-plan-heavy.md headings with new phase rule references"
```

If no edits were needed, no commit; proceed to Task 6.

---

### Task 6: Static verification of all new files

**Files:**
- Verify (no changes): all three new SKILL.md files, `wbs-orientation/SKILL.md`, `note-phase-plan-heavy.md`, `.claude-plugin/marketplace.json`.

- [ ] **Step 1: Confirm all three new SKILL.md files exist**

Run: `ls plugins/superhuman/skills/phase-planning-rules/SKILL.md plugins/superhuman/skills/phase-continuity-review/SKILL.md plugins/superhuman/skills/phase-post-implementation-review/SKILL.md`

Expected: all three paths print, no "No such file" errors.

- [ ] **Step 2: Confirm each file's name field matches its directory**

Run:
```bash
for skill in phase-planning-rules phase-continuity-review phase-post-implementation-review; do
  name=$(grep '^name:' plugins/superhuman/skills/$skill/SKILL.md | head -1 | awk '{print $2}')
  test "$name" = "$skill" && echo "$skill OK" || echo "$skill MISMATCH: $name"
done
```

Expected:
```
phase-planning-rules OK
phase-continuity-review OK
phase-post-implementation-review OK
```

- [ ] **Step 3: Confirm each frontmatter parses as YAML**

Run:
```bash
for skill in phase-planning-rules phase-continuity-review phase-post-implementation-review; do
  python3 -c "
import sys, yaml
content = open('plugins/superhuman/skills/$skill/SKILL.md').read()
parts = content.split('---', 2)
assert len(parts) >= 3, '$skill: no frontmatter delimiters'
fm = yaml.safe_load(parts[1])
assert 'name' in fm and 'description' in fm, '$skill: missing name or description'
print('$skill OK')
"
done
```

Expected:
```
phase-planning-rules OK
phase-continuity-review OK
phase-post-implementation-review OK
```

- [ ] **Step 4: Confirm wbs-orientation cross-references**

Run: `grep -c "superhuman:phase-" plugins/superhuman/skills/wbs-orientation/SKILL.md`

Expected: a number ≥ 3 (one each for `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`).

- [ ] **Step 5: Confirm marketplace catalog still validates**

Run: `jq . .claude-plugin/marketplace.json > /dev/null && echo OK`

Expected: `OK`

- [ ] **Step 6: No commit needed**

This task is read-only verification. If anything failed, return to the relevant task and fix.

---

### Task 7: Plugin install verification (manual)

**Files:** None modified — manual verification only.

This task verifies the plugin loads cleanly and the new skills register correctly. Performed by the user, not the implementer subagent.

- [ ] **Step 1: Reinstall (or refresh) the superhuman plugin in Claude Code**

In a Claude Code session, run:
```
/plugin marketplace remove superhuman
/plugin marketplace add /Users/germanamz/projects/superhuman
/plugin install superhuman@superhuman
```

Expected: no parse errors, plugin installs cleanly.

- [ ] **Step 2: Verify the three new skills appear in the skill registry**

In a Claude Code session, ask: "What `superhuman:` skills are available?"

Expected: response includes `superhuman:wbs-orientation`, `superhuman:phase-planning-rules`, `superhuman:phase-continuity-review`, and `superhuman:phase-post-implementation-review` — with their frontmatter descriptions matching what was authored.

- [ ] **Step 3: Confirm no auto-invoke collision warnings between plugin and `~/.claude/skills/` versions**

Both versions coexist until Task 9 runs. The plugin version's `superhuman:` prefix and tighter frontmatter (`WBS-Tusk-backed Story`) should mean Claude Code disambiguates when an auto-invoke trigger fires. If Claude Code surfaces a collision warning, capture it; the implementation plan needs revision before Task 9 proceeds.

Expected: no collision warnings.

- [ ] **Step 4: No commit needed**

Manual verification step.

---

### Task 8: Behavioral verification walkthrough (manual)

**Files:** None modified — manual end-to-end behavior check.

This task drives one full Story-with-phases through the new skills, end-to-end. Performed by the user (or a separate session), not the implementer subagent. Requires a Tusk MCP server with the WBS taxonomy applied.

- [ ] **Step 1: Set up a fresh Tusk Project with the WBS taxonomy**

Per `plugins/superhuman/templates/wbs/taxonomy.md`. Confirm `tusk_project_get` returns a project with `[[milestone], [initiative], [story], [task, spike]]` ranks.

- [ ] **Step 2: Create a Story with a populated `meta.type=spec` note**

Use `/wbs-new milestone "<title>"`, decompose to a Story via wrapped brainstorming. Confirm the Story has Karpathy fields populated and a `meta.type=spec` note attached.

- [ ] **Step 3: Drive wrapped writing-plans into heavy phasing**

Trigger plan-writing such that the plan declares ≥2 sequential phases with bridge code. Confirm `superhuman:phase-planning-rules` auto-invokes when the planner starts decomposing into phases.

- [ ] **Step 4: Confirm phase-plan notes land correctly in Tusk**

Query: `tusk_note_list task=<story-id> meta.type=phase-plan`.

Expected: one note per phase, each with `meta.phase=phase-N`, content following `templates/wbs/note-phase-plan-heavy.md` (Inherits From / Phase Outcome / Tasks / Bridge Code / Compilation Safety / Changes Introduced / User-visible Behaviors sections).

- [ ] **Step 5: Confirm 4–6 tagged child Tusk tasks per phase**

Query: `tusk_task_list parent=<story-id> +phase-1` and `+phase-2`, etc.

Expected: each phase returns 4–6 tasks at `level=task`, parented to the Story, tagged with the matching `+phase-N`.

- [ ] **Step 6: Confirm `phase-continuity-review` auto-invokes**

After all phase-plan notes are drafted, before dispatching the first task. The planning agent should announce continuity-review invocation.

Expected: continuity review walks the 7 checks via Tusk MCP queries.

- [ ] **Step 7: Dispatch one task to a subagent; confirm per-task dispatch grain**

Manually dispatch the first task of phase 1 to a subagent — passing only the Tusk task short ID, not bundled context.

Expected: subagent calls `tusk_task_get <task-id>`, then pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand. Subagent does not request bundled context from the dispatcher.

- [ ] **Step 8: Confirm `phase-post-implementation-review` auto-invokes per phase**

After phase 1's tasks are workflow-completed in Tusk, before dispatching phase 2's first task.

Expected: post-impl review runs the 7 per-phase checks.

- [ ] **Step 9: Confirm final sequence verification + completion seal + archive**

After all phases ship and final-sequence checks complete, the planning agent posts a completion-seal annotation on the Story and archives each `meta.type=phase-plan` note.

Verify by:
- `tusk_annotation_list task=<story-id>` — expect a recent annotation with the seal text (date, phases shipped, bridges resolved).
- `tusk_note_list task=<story-id> meta.type=phase-plan` (default view) — expect zero results.
- `tusk_note_list task=<story-id> meta.type=phase-plan archived=true` (or equivalent) — expect all phase-plan notes still queryable.

- [ ] **Step 10: Bypass tolerance check**

In a non-WBS context (no active Tusk Story), draft a phase plan inline. Confirm none of the three new skills auto-invoke.

Expected: planning proceeds without phase-discipline scaffolding. (Per spec: this is intentional — the file-based mode is dropped.)

- [ ] **Step 11: No commit needed**

Manual verification. If any step fails, return to the relevant authoring task and fix; rerun static verification (Task 6) before continuing.

---

### Task 9: Original-skill removal (manual user step)

**Files:**
- Delete (outside the repo): `~/.claude/skills/phase-planning-rules/`, `~/.claude/skills/phase-continuity-review/`, `~/.claude/skills/phase-post-implementation-review/`.

**Performed by the user only**, after Task 7 and Task 8 pass. The originals live in the user's home directory, outside the repo — no CI hook or implementer subagent should run these commands. The implementation plan documents the step so the user knows it's the final cleanup.

- [ ] **Step 1: Confirm Task 7 and Task 8 verifications passed**

If either task surfaced a collision warning, broken auto-invoke, or behavioral gap, **do not proceed**. Fix the underlying issue first.

- [ ] **Step 2: Delete the three original skills**

Run (user shell, not Claude Code Bash tool):

```bash
rm -rf ~/.claude/skills/phase-planning-rules
rm -rf ~/.claude/skills/phase-continuity-review
rm -rf ~/.claude/skills/phase-post-implementation-review
```

- [ ] **Step 3: Confirm originals are gone**

Run: `ls ~/.claude/skills/ 2>/dev/null | grep -E "^phase-(planning|continuity|post)"`

Expected: no output.

- [ ] **Step 4: In Claude Code, confirm only plugin versions auto-invoke**

Trigger a phase-planning auto-invoke (e.g., draft a plan that declares heavy phasing in a WBS Story). Confirm the invoked skill is `superhuman:phase-planning-rules`, not the bare `phase-planning-rules`.

- [ ] **Step 5: No commit needed**

The deletion happens outside the repo. No git changes.

---

### Task 10: Update roadmap entry

**Files:**
- Modify: `docs/superpowers/superhuman-wbs-roadmap.md`

Mark sub-project #2 as Done and link the spec and plan.

- [ ] **Step 1: Read the current roadmap row**

Run: `grep -n "Phase skills relocation" docs/superpowers/superhuman-wbs-roadmap.md`

Expected: matches a row containing `| 2 | **Phase skills relocation + polish** ... | Not started | — | — |`.

- [ ] **Step 2: Update the row**

Edit the row to:

```
| 2 | **Phase skills relocation + polish** — move the three phase skills (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) from `~/.claude/skills/` into the `superhuman` plugin, reshape for WBS context | Done | [2026-04-30 spec](specs/2026-04-30-phase-skills-relocation-design.md) | [2026-04-30 plan](plans/2026-04-30-phase-skills-relocation.md) |
```

- [ ] **Step 3: Verify**

Run: `grep "Phase skills relocation" docs/superpowers/superhuman-wbs-roadmap.md`

Expected: the row shows `Done` and links to the spec and plan files.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/superhuman-wbs-roadmap.md
git commit -m "Mark WBS sub-project #2 (phase skills relocation) as Done"
```

---

## Implementation Notes

- **Tasks 1–3 are independently executable.** Each produces one self-contained SKILL.md file. They can be dispatched in parallel to separate subagents if desired (each subagent invokes `superpowers:writing-skills` independently).
- **Tasks 4–6 must run after Tasks 1–3.** Task 4 (cross-references) names the new skills; Task 5 (template alignment) verifies headings against the rules just authored; Task 6 (static verification) checks all artifacts.
- **Tasks 7–9 are manual.** They require human action in Claude Code (Task 7), a Tusk MCP environment (Task 8), and outside-the-repo file deletion (Task 9).
- **Task 10** is the bookkeeping step; run it after Tasks 7–9 confirm the implementation works end-to-end.
- **Tusk MCP verb names** (`tusk_note_list`, `tusk_task_get`, `tusk_annotation_list`, archive-flag setter, etc.) are referenced by intent throughout. If the live Tusk MCP exposes different exact names at implementation time, substitute accordingly — the rule prose names operations conceptually, not as fragile API calls.
