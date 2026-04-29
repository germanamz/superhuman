# Superhuman WBS Spine — Design Spec

**Date:** 2026-04-29
**Author:** German Meza (`iam@germanamz.com`)
**Status:** Approved — ready for implementation plan
**Roadmap entry:** [Sub-project #1 in `docs/superpowers/superhuman-wbs-roadmap.md`](../superhuman-wbs-roadmap.md)

## Goal

Ship the **WBS spine**: the load-bearing first sub-project of the Superhuman WBS initiative. The spine establishes a five-level inverted-flame Work Breakdown Structure for software work, backed entirely by [Tusk](https://github.com/germanamz/tusk) as the system of record, and exposes a small set of Claude Code skills, slash commands, and templates inside the `superhuman` plugin that walk users and agents through decomposition without reinventing existing brainstorming or planning machinery.

The spine is the foundation that every other sub-project (phase-skills relocation, Tusk integration patterns, implementation pipelines, windowed note-taking, code/architecture conventions) plugs into.

## Why this exists

[Andrej Karpathy's late-2025 reflection on agent coding](https://x.com/karpathy/status/2015883857489522876?s=20) names the specific failure modes of unstructured agent work:

> "make wrong assumptions and just run along … don't manage their confusion … don't surface inconsistencies … don't present tradeoffs … don't push back … like to overcomplicate code and APIs … give it success criteria and watch it go."

The WBS spine is a structured forcing function against those exact failures. Each design level requires an explicit *Success Criteria*, *Assumptions Made*, *Open Questions*, *Tradeoffs Considered*, and *Out of Scope*. The orchestrator skill refuses to mark a node "ready to decompose" until those fields are populated — empty fields must be deliberate ("Open Questions: none, because…"), not skipped. Decomposition is declarative: a parent's child list is its plan, and children are framed as outcomes, not imperative steps.

## Architecture

### The five WBS levels

```
Project → Milestone → Initiative (Epic) → Story → Task / Spike
```

**Design happens at the first four levels.** Each level gets its own brainstorming/design pass at its own scope, producing a tier-specific design artifact. **Task / Spike is execution-only** — by the time work reaches that level, every design question is resolved, and an implementer agent (or human) executes from the description and referenced notes.

**Phasing is a general design technique applicable at any level**, not a separate WBS level. A node may be phased when its design or implementation work splits into ≥2 sequential or parallel chunks of meaningfully different shape, or needs ≥2 implementer agents. Phasing comes in two weights:

- **Light phasing** at upper levels (Project / Milestone / Initiative): chunks of design or research work tracked as parent-attached notes plus tagged child tasks.
- **Heavy phasing** at Story-implementation: same shape, but the parent's `phase-plan` notes follow the existing `phase-planning-rules` contract (Inherits From, Changes Introduced, 4–6 child tasks per phase, compilation safety, bridge-code removal targets).

### Storage model — Tusk holds everything

Tusk is the brain and memory. The repo holds code only.

| Layer | Tusk representation |
|---|---|
| WBS Project | **Tusk Project** (workflow-attached container) |
| Milestone / Initiative / Story / Task / Spike | **Tusk task with `level=<level>`**, in a parent-child tree |
| Recommended taxonomy | `[[milestone], [initiative], [story], [task, spike]]` (4 ranks) |
| Right-sized outcome statements (every level) | Task **description** (markdown) |
| Brainstorm transcripts, specs, plans, phase plans | Task **notes** with `meta.type=brainstorm | spec | plan | phase-plan` and `meta.phase=phase-N` where applicable |
| Running log of decisions, status updates | Task **annotations** (immutable, timestamped) |
| Phasing | Tag `+phase-N` on the children belonging to a phase, plus a note on the parent with `meta.type=phase-plan, meta.phase=phase-N` carrying the directive |
| Status, completion, completion propagation | Tusk's workflow + completion-propagation features |
| Urgency cascading from a parent (e.g., "ship-critical" milestone) | Tusk's per-task urgency-weight overrides |

Tusk's first-class `level` field, taxonomy validation, parent-child rank rules, append-only notes with metadata, and trailing-window note display are all used as designed — the spine adds conventions on top, not new mechanisms.

### Right-sized descriptions

Description content varies by level. The discipline is "right-sized for level":

- **Project** — vision, scope, success metric. Roughly 100–300 words.
- **Milestone** — outcome of the milestone, scope boundaries, the initiatives it groups.
- **Initiative (Epic)** — epic outcome, contracts with adjacent initiatives, the stories it spans.
- **Story** — user-visible outcome, success criteria, acceptance, links to the spec note and plan note.
- **Task** — execution-ready instructions: target files (with line ranges if applicable), the change to make, the verification command, the expected output, references to the parent's spec/plan/phase-plan notes by note ID.
- **Spike** — research question, decision to be made, time-box, expected output format.

Upper levels stay tight (the rationale lives in attached notes); Task / Spike descriptions are longer because they carry the implementer-actionable content. The orchestrator's "lean-ticket" warning is level-sensitive: aggressive at Milestone level (>250 words → suggest moving detail into a note), permissive at Task level.

### Existing skill composition

The spine **composes** existing Claude Code skills, it does not replace them.

- `brainstorming` is wrapped at every design-level node. Where it normally writes `docs/superpowers/specs/<file>.md`, the orchestrator captures the same content and posts it as a Tusk note (`meta.type=brainstorm` or `meta.type=spec`) on the current task.
- `writing-plans` is wrapped similarly — output becomes a Tusk note with `meta.type=plan`.
- `phase-planning-rules` is invoked at Story-implementation time when the plan needs phasing. Sub-project #2 reshapes its output destination from "phase-N file in `plans/`" to "a `meta.type=phase-plan, meta.phase=phase-N` note on the parent task" — the spine specifies the destination shape via `note-phase-plan-heavy.md`; the actual reshape lands in #2.
- `phase-continuity-review` and `phase-post-implementation-review` are similarly relocated and reshaped in #2 — they read phase-plan notes via Tusk MCP rather than file paths.

## Components

The WBS spine ships as additions to `plugins/superhuman/`:

```
plugins/superhuman/
  skills/
    wbs-orientation/SKILL.md
  commands/
    wbs-new.md
    wbs-status.md
  templates/wbs/
    desc-project.md
    desc-milestone.md
    desc-initiative.md
    desc-story.md
    desc-task.md
    desc-spike.md
    note-brainstorm.md
    note-spec.md
    note-plan.md
    note-phase-plan-light.md
    note-phase-plan-heavy.md
    conventions.md
    taxonomy.md
```

### 1. Orchestrator skill: `skills/wbs-orientation/SKILL.md`

Auto-invokes when the user is working in a WBS context — mentioning a level, working from a Tusk task, or running `/wbs-*` commands. Responsibilities:

- **Detect Tusk context** via `tusk_task_get` / `tusk_task_tree` MCP calls. If no current task, prompt the user.
- **Load the right template** — reads `templates/wbs/desc-<level>.md` or `note-<type>.md` based on context. Templates are agent inputs, not artifacts on disk in the user's repo.
- **Wrap brainstorming** — invokes the existing `brainstorming` skill so its content production runs unchanged, but captures the output and posts it as a Tusk note (`task=<current-task-id>, meta.type=spec, body=<content>`) instead of letting it land as `docs/superpowers/specs/<file>.md`. The exact wrapping mechanism (subagent invocation that captures the output, context-shim instructions that redirect the Write call, or post-write hoist that reads the file then deletes it) is a design decision for the implementation plan — all three are viable; the spec mandates only that the spec content end up as a Tusk note and not a repo file.
- **Wrap writing-plans** — same wrapping pattern, output lands as a `meta.type=plan` Tusk note.
- **Enforce the Karpathy decomposition gate** — before allowing a status transition to "ready to decompose," confirm Success Criteria, Assumptions Made, Open Questions, Tradeoffs Considered, and Out of Scope are all populated. Empty must read "none, because…".
- **Drive decomposition transitions** — when a node passes the gate, walk the user through creating children at the next rank down via `/wbs-new` per child.
- **Enforce right-sized descriptions** — level-sensitive warnings when descriptions exceed budget for upper levels, or when Task descriptions lack file/line references.
- **Surface References** — at Task / Spike level, help the user populate the References section by suggesting recent notes and sibling tasks pulled from Tusk MCP.

The skill is **rigid** in the brainstorming-skill taxonomy sense: order of operations is enforced, especially the gate before decomposition.

### 2. Slash commands

#### `commands/wbs-new.md` → `/wbs-new <level> [title]`

Creates a Tusk task at the given level under the current parent (or as a root task in the active Project if no parent context).

Flow:
1. Resolves parent: from explicit flag, from current Tusk task context, or from user prompt.
2. Validates the level against the project's taxonomy (Tusk validates on create; the command surfaces the error early).
3. Reads `templates/wbs/desc-<level>.md`, inserts the title, leaves Karpathy fields empty.
4. Calls `tusk_task_create` with `description=<populated-template>`, `level=<level>`, `parent=<parent-id>`.
5. Hands off to the orchestrator skill to begin brainstorming/decomposition on the new node.

#### `commands/wbs-status.md` → `/wbs-status [task-id]`

Renders the subtree from a node with status rollup. Defaults to the current task context, or the project root if none.

Flow:
1. Calls Tusk MCP — `tusk_task_tree` for the subtree shape and `tusk_task_summary` (or `tusk task tree --rollup` via shell) for `%done` rollup.
2. Prints a tree view: level, title, status, % done from descendants, phase tags.
3. Highlights nodes with empty Karpathy fields, phase tag / phase-plan-note mismatches, or other warnings the orchestrator surfaces.

Both commands are thin wrappers — most logic lives in the orchestrator skill. The commands exist as discoverable entry points.

### 3. Description templates: `templates/wbs/desc-<level>.md`

One per level. All six share a common skeleton, with framing tuned per level:

```markdown
# <title>

## Outcome
What changes when this is done. (One paragraph.)

## Success Criteria
Measurable / observable conditions. The Karpathy "loop target."

## Assumptions Made
Explicit list. Empty must read "none."

## Open Questions
Explicit list. Empty must read "none, because …"

## Tradeoffs Considered
Alternatives that were rejected and why.

## Out of Scope
Explicit non-goals.

## Phasing
"No phases needed" by default, or a list with `+phase-N` tag refs and brief outcomes.

## References  (Task / Spike only)
Tusk note IDs, sibling task IDs, annotation IDs.
```

Per-level framing differences are described in the Right-sized descriptions section above. Task / Spike templates additionally include explicit slots for target files, change summary, verification command, and expected output.

Templates stay lean — none should exceed ~200 lines.

### 4. Note templates: `templates/wbs/note-<type>.md`

Define the structured shape of Tusk notes the orchestrator emits:

- `note-brainstorm.md` — captures a brainstorm session: what was discussed, decisions made, alternatives rejected, open follow-ups.
- `note-spec.md` — adapts the existing superpowers spec shape (Goal, Architecture, Components, Testing, Verification, Out of Scope) to a Tusk note body.
- `note-plan.md` — adapts the existing superpowers plan shape (File Structure, Tasks, Verification).
- `note-phase-plan-light.md` — lightweight phasing for Project / Milestone / Initiative phasing: name, outcome, dependencies, parallelism, owner.
- `note-phase-plan-heavy.md` — destination shape for the existing `phase-planning-rules` content: Inherits From, Changes Introduced, 4–6 task list, compilation-safety bridge code, removal targets. Sub-project #2 does the actual reshape of the existing skill; this template defines where the result lives.

### 5. Conventions: `templates/wbs/conventions.md`

A short doc the orchestrator skill references. Codifies:

- **Right-sized descriptions** — outcome-focused at upper levels, execution-ready at Task / Spike. Examples per level.
- **Lean tickets, rich notes** — the discipline + warning thresholds. Examples of "too much in description, move into a note."
- **Karpathy forcing functions** — one sentence per required field on why it exists.
- **When to phase** — phase if (a) work splits into ≥2 sequential/parallel chunks of meaningfully different shape, or (b) the work needs ≥2 implementer agents.
- **Tag and metadata naming** — `+phase-N` for phasing, `meta.type=<note-type>`, `meta.phase=phase-N`. Reserved namespace: anything with `wbs-` prefix.
- **Decomposition gate** — required-fields check + at least one explicit children list.
- **Bypass consequences** — what happens when `/brainstorm` is run directly (content lives in repo, not in Tusk).

### 6. Taxonomy: `templates/wbs/taxonomy.md`

A short doc describing the recommended Tusk taxonomy and how to apply it:

- The recommended ranks: `[[milestone], [initiative], [story], [task, spike]]`.
- Workspace-level setup snippet for `tusk.toml`.
- Per-project override via `tusk_project_settings_set` MCP call or `tusk project` CLI.
- When to opt out (scratch projects, bug-tracker-style workflows).
- Migration notes (taxonomy edits are prospective per Tusk's rules).

This doc is informational for users; the orchestrator skill assumes the taxonomy is already configured and surfaces an error if not.

## Data flow

### Flow 0 — One-time setup (per workspace or project)

1. Install the `superhuman` plugin via Claude Code's marketplace.
2. Install Tusk and add it as an MCP server: `claude mcp add tusk -- tusk mcp serve`.
3. Apply the WBS taxonomy per `templates/wbs/taxonomy.md` — workspace default in `tusk.toml`, or per-project.
4. Create the WBS Project: `tusk project create <project-name> workflow=<workflow>`.

### Flow 1 — Top-down decomposition

1. User opens a Claude Code session: "I want to design Project X."
2. The orchestrator skill auto-invokes.
3. Skill calls Tusk MCP, sees no top-rank task in the Project. Confirms with user, runs `/wbs-new milestone "<title>"` to create the first Milestone task with description from `desc-milestone.md` (Karpathy fields blank).
4. Skill invokes wrapped `brainstorming`. The user and agent fill in the description and post the brainstorm transcript as a `meta.type=brainstorm` note.
5. Skill checks the decomposition gate. If pass: prompt for child Initiatives. If fail: surface what's missing.
6. For each Initiative, run `/wbs-new initiative "<title>"`. Recurse.
7. At Story level, wrapped brainstorming produces `meta.type=spec` and wrapped writing-plans produces `meta.type=plan` notes. The plan note enumerates Tasks (and Phases if needed).
8. Each Task is created via `/wbs-new task` as a child of the Story; if heavy phasing is in effect, the Task is tagged `+phase-N` to mark its phase membership (see Flow 3 — phase is a tag, not a separate WBS level).
9. Decomposition stops at Task level. Tasks have execution-ready descriptions and References pointing to parent notes.

### Flow 2 — Brainstorm-to-note capture

1. Orchestrator invokes the existing `brainstorming` skill via the Skill tool with a context shim.
2. Brainstorming runs its normal loop (one question, propose 2–3 approaches, present design, etc.).
3. At brainstorming's "Write design doc" step, the orchestrator's wrapping mechanism captures the spec content and calls `tusk_note_create` with `task=<current-task-id>, meta.type=spec, body=<content>` instead of letting brainstorming write the file. (Mechanism choice — subagent capture, context-shim, or post-write hoist — is a plan-level decision.)
4. The Karpathy required fields from the spec become the task's description (right-sized for level). Full spec lives in the note.
5. Brainstorming's spec-self-review and user-review gates still run, reading from the Tusk note.
6. When brainstorming's terminal step ("invoke writing-plans") fires, the orchestrator wraps writing-plans the same way — the plan lands as a `meta.type=plan` note.

### Flow 3 — Adding phases

**Light phasing** (upper levels): the brainstorm note records the phasing decision; per-phase `meta.type=phase-plan, meta.phase=phase-N` notes are added to the parent task following `note-phase-plan-light.md`; child tasks are tagged `+phase-N`.

**Heavy phasing** (Story implementation): wrapped writing-plans creates per-phase `meta.type=phase-plan, meta.phase=phase-N` notes following `note-phase-plan-heavy.md` (the existing `phase-planning-rules` content); 4–6 child tasks per phase are created tagged `+phase-N`.

**Identifying a phase:** `tusk task list parent=<story-id> +phase-2` returns just that phase's tasks; `tusk note list task=<story-id> meta.type=phase-plan meta.phase=phase-2` returns the phase directive.

### Flow 4 — Implementer pickup

1. Implementer (human or AI) calls `tusk_task_get <task-id>` for the lean execution-ready description.
2. Implementer pulls referenced notes on demand: `tusk_note_get <note-id>` for the parent's spec, plan, or phase-plan.
3. Implementer reads sibling tasks under the same phase (`tusk task list parent=<story-id> +phase-N`) for cohort context.
4. Implementer executes — writes code, runs tests.
5. Implementer adds annotations as work progresses (status pings, blockers, decisions).
6. Implementer can append notes when learnings are worth keeping for future agents (sub-project #5 leans on this exact pattern).
7. Implementer transitions the task through the workflow when done; Tusk's completion propagation rolls status up.

This flow validates the right-sized-description discipline. If implementers report needing fields not in the description, the description template is too lean for that level. If implementers routinely don't read parent notes, the rich-notes pattern isn't being used and content is being duplicated into descriptions.

## Error handling

### 1. Tusk unavailable or misconfigured

Hard error with a clear remediation pointer (`templates/wbs/taxonomy.md`). No silent fallback to file-based design.

### 2. Project has no WBS taxonomy

Hard error. Orchestrator surfaces the recommended taxonomy and offers two paths — workspace default or per-project override. User decides; orchestrator runs the chosen `tusk` command.

### 3. Skipping ranks

Allowed (Tusk permits any-ancestor-to-any-descendant parenting). Orchestrator flags it as a warning: "you're skipping Milestone and Initiative — if intentional (small project), continue; if not, consider creating intermediate nodes." Does not block.

### 4. Reparenting / restructuring

Native Tusk operation. Notes attached to the task move with it. Phase-plan note metadata (`meta.phase=phase-N`) does not auto-update — orchestrator surfaces this as a manual concern when reparenting is detected.

### 5. Karpathy gate failures

Orchestrator names the missing or weak fields, refuses to proceed, and offers to walk through filling them. Does not auto-fill.

### 6. Wrapping bypass

When the user runs `/brainstorm` directly, brainstorming writes to a file as it normally would. Orchestrator does not intercept commands it wasn't invoked through. `templates/wbs/conventions.md` documents the consequence.

### 7. Concurrent editing

Tusk's optimistic locking rejects stale-version updates. Orchestrator catches the version error, fetches current state, and asks the user how to proceed (retry, merge, abort). Does not auto-merge.

### 8. Stale spec or plan notes

Tusk notes are append-only. Convention: when a spec materially changes, archive the old `meta.type=spec` note and post a new one. Orchestrator surfaces only the newest non-archived note of each type when loading context.

### 9. Phase tag / phase-plan-note mismatch

`/wbs-status` flags the mismatch as a warning. Orchestrator suggests creating the missing artifact or removing the orphan; does not auto-fix.

### 10. Missing or corrupt template

Orchestrator falls back to a minimal built-in template embedded in the skill, logs a warning, and continues. User sees a "plugin appears damaged — `desc-<level>.md` is missing; using fallback" message.

## Verification

### Static checks (automated; run after each implementation phase)

- All shipped files exist (skill, commands, templates).
- Each Markdown file with frontmatter parses as valid YAML and includes required keys.
- Plugin manifest lists no missing references.
- Marketplace catalog still validates with `jq`.

### Plugin install verification (manual; one-shot after install)

- `/plugin marketplace add /Users/germanamz/projects/superhuman` succeeds.
- `/plugin install superhuman@superhuman` succeeds with no parse errors.
- `/wbs-new` and `/wbs-status` appear in the slash-command list.
- The `wbs-orientation` skill appears in the skill registry.

### Bootstrap walkthrough (manual; first time using the spine)

In a fresh Tusk workspace:

1. Apply the WBS taxonomy per `templates/wbs/taxonomy.md`.
2. `tusk project create test-wbs workflow=kanban`.
3. With test-wbs active in Claude Code: `/wbs-new milestone "Smoke test milestone"`.
4. `tusk task get <id>` returns the new task with `level=milestone` and a description matching `desc-milestone.md`'s template (Karpathy fields blank).

### End-to-end smoke (manual; one full decomposition)

1. Create a Milestone via `/wbs-new milestone`. Confirm wrapped brainstorming auto-invokes, drives Karpathy fields into the description, and posts a `meta.type=brainstorm` note.
2. Try the decomposition gate with one required field empty — confirm refusal and field-name surfacing.
3. Fill the field; gate passes. Create an Initiative under the Milestone.
4. Recurse to Story. Confirm wrapped brainstorming produces `meta.type=spec` and wrapped writing-plans produces `meta.type=plan`.
5. Add light phasing at Initiative — confirm a `meta.type=phase-plan, meta.phase=phase-1` note on the Initiative and at least one child task tagged `+phase-1`.
6. Add heavy phasing at Story — confirm phase-plan note follows `note-phase-plan-heavy.md` and 4–6 child tasks are created tagged.
7. `/wbs-status` from the Milestone — tree renders with rollup, phase tags, and warnings.
8. `tusk task done` on a Task — confirm completion propagates upward.

### Implementer-pickup smoke (manual)

Pick one Task from the smoke walkthrough:

1. Read its description only. Confirm actionable execution instructions and References to parent notes.
2. Pull one referenced note. Confirm it provides the rationale the description deferred.
3. Sanity check: did you need to read more than the parent's spec + plan + phase-plan? If yes, description too lean. Did you need sibling tasks for cohort context? If yes, parent notes are missing context.

### Bypass tolerance (manual)

1. Run `/brainstorm` directly (without `/wbs-new`). Confirm it writes to `docs/superpowers/specs/<file>.md` as normal.
2. Confirm `templates/wbs/conventions.md` documents the consequence.

### Error-path checks (manual; spot-check 2–3)

- Stop the Tusk MCP server, run `/wbs-new milestone` → expect hard error with remediation pointer (case 1).
- `/wbs-new story` directly under the Project → expect a flag/warning, operation succeeds (case 3).
- Mark a node "ready to decompose" with empty Open Questions → expect refusal with field-name surfacing (case 5).
- Tag a child task `+phase-3` with no matching parent note → expect `/wbs-status` to flag (case 9).

## Out of scope

The following are explicitly *not* part of this sub-project. They live in other roadmap entries.

- **Reshape of the existing phase skills** (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) to write to Tusk notes rather than files. The spine specifies the destination shape via `note-phase-plan-heavy.md`; sub-project #2 does the reshape and relocation into the plugin.
- **Richer Tusk integration patterns**: bidirectional sync with external tools, dashboards, custom queries, automations. These are sub-project #3.
- **Implementation pipelines**: agent-orchestrated and human-orchestrated execution patterns per task, building on the implementer-pickup flow defined here. Sub-project #4.
- **Conventions and helpers for note organization** — Tusk's notes already implement trailing-window access natively; sub-project #5 layers conventions and tooling on top.
- **Code quality and architecture conventions** — sub-projects #6 and #7 codify the user's standards as their own skills/guides.

## Bootstrapping note

The spec for the WBS spine itself lives in this file (`docs/superpowers/specs/2026-04-29-superhuman-wbs-spine-design.md`) rather than in Tusk because Tusk-with-the-spine doesn't exist yet — we can't dogfood what we're designing. After the spine ships and Tusk is bootstrapped per Flow 0, future design specs (including specs for sub-projects #2 through #7) move into Tusk as `meta.type=spec` notes on their respective Tusk tasks. The keeper roadmap doc (`docs/superpowers/superhuman-wbs-roadmap.md`) similarly stays as a file for now and can be migrated to a Tusk Project description after the spine ships.

## References

- [Karpathy on agent coding (X, late 2025)](https://x.com/karpathy/status/2015883857489522876?s=20) — names the failure modes the Karpathy forcing-function fields exist to prevent.
- [Tusk repository and design](https://github.com/germanamz/tusk) — the storage backend; first-class `level` field, taxonomies, parent-child rank rules, append-only notes with metadata, trailing-window note display.
- Existing phase skills in `~/.claude/skills/` — `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`. The spine consumes the rules concept; sub-project #2 reshapes their output destination.
- [Marketplace scaffold spec](2026-04-28-superhuman-marketplace-scaffold-design.md) — the layout the spine ships into.
