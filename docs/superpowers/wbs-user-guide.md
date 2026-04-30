# WBS User Guide

A practical walkthrough for humans using the Superhuman Work Breakdown Structure. Reference the [design spec](specs/2026-04-29-superhuman-wbs-spine-design.md) when you want the rationale; this doc is the day-to-day flow.

---

## What you get

The WBS gives you a five-level hierarchy for software work, backed entirely by [Tusk](https://github.com/germanamz/tusk):

```
Project → Milestone → Initiative → Story → Task / Spike
```

You drive it with two slash commands and one auto-invoked orchestrator skill:

| Surface | Purpose |
|---|---|
| `/wbs-new <level> [title]` | Create a node (Tusk task) at the given level under the current parent |
| `/wbs-status [task-id]` | Render the subtree from a node, with rollup, phase tags, and warnings |
| `wbs-orientation` skill | Auto-invokes when you work on a WBS node — loads the right template, runs brainstorming/planning, enforces the decomposition gate |

There is no separate UI. Everything happens in your Claude Code session against Tusk MCP.

---

## One-time setup

1. **Install the plugin.** From any Claude Code session:
   ```
   /plugin marketplace add /path/to/this/repo
   /plugin install superhuman@superhuman
   ```
   Confirm `/wbs-new` and `/wbs-status` appear in the slash-command list, and `wbs-orientation` appears in the skill registry.

2. **Install Tusk and add it as an MCP server.** Follow [Tusk's docs](https://github.com/germanamz/tusk). Then:
   ```
   claude mcp add tusk -- tusk mcp serve
   ```

3. **Apply the WBS taxonomy.** Either workspace-wide or per-project. The full snippet is in [`plugins/superhuman/templates/wbs/taxonomy.md`](../../plugins/superhuman/templates/wbs/taxonomy.md). Workspace-wide:
   ```toml
   # ~/.config/tusk/config.toml or project-root tusk.toml
   [settings.taxonomy]
   ranks = [["milestone"], ["initiative"], ["story"], ["task", "spike"]]
   ```

4. **Create your Tusk Project.**
   ```
   tusk project create my-project workflow=kanban
   ```
   Tusk's Project is the WBS Project — it's a container, not a task.

---

## The five levels at a glance

| Level | What it is | Description style |
|---|---|---|
| **Project** | The whole effort. Maps to a Tusk Project. | Vision, scope, success metric. ~100–300 words. |
| **Milestone** | A release-shaped checkpoint. | Outcome of the milestone, scope boundaries, the initiatives it groups. |
| **Initiative (Epic)** | A coherent body of work that produces a single user-visible capability. | Epic outcome, contracts with adjacent initiatives, the stories it spans. |
| **Story** | One user-visible behavior or system change. | User-visible outcome, acceptance, links to the spec note and plan note. |
| **Task** | Execution-ready unit. | Target files (with line ranges), the change to make, verification command, references to parent's notes. |
| **Spike** | Time-boxed research. Same rank as Task. | Research question, decision needed, time-box, expected output format. |

Design happens at the first four. Tasks and Spikes are execution-only — by the time work reaches them, every design question is answered.

---

## Daily flow: top-down decomposition

Walkthrough of the typical loop. Each step assumes you're in a Claude Code session with the plugin installed and Tusk configured.

### 1. Create the top-level node

```
/wbs-new milestone "Authentication overhaul"
```

The orchestrator skill auto-invokes. It:
- Reads `desc-milestone.md`, populates the title, leaves the Karpathy fields blank.
- Calls `tusk_task_create` to create the task.
- Hands off to brainstorming.

### 2. Brainstorm the design

The orchestrator wraps the existing `brainstorming` skill. You answer questions one at a time. The result lands as a `meta.type=spec` (or `meta.type=brainstorm`) Tusk note attached to the milestone — **not** as a file in your repo.

The five Karpathy forcing-function fields get populated on the task description as you go:

- **Success Criteria** — measurable / observable conditions.
- **Assumptions Made** — unverified premises you're treating as true. The point is to surface silent assumptions so they can be challenged or verified away. "none" is the ideal state — it means analysis was thorough enough to leave no unverified premises behind. If the list is long, that's a signal to do more verification, not to call it done.
- **Open Questions** — list. Empty must read "none, because …"
- **Tradeoffs Considered** — alternatives rejected and why.
- **Out of Scope** — explicit non-goals.

The orchestrator will not let you decompose this milestone into initiatives until all five are filled deliberately. Empty fields are fine — they just have to be intentional.

### 3. Decompose

Once the gate passes, the orchestrator walks you through creating child Initiatives. Each becomes its own Tusk task at `level=initiative`, parented to the Milestone, and the orchestrator loop repeats on each.

```
/wbs-new initiative "Replace session cookies with JWTs"
```

Recurse until you reach Stories.

### 4. Spec and plan a Story

At Story level, brainstorming produces a `meta.type=spec` note. When that's done, the orchestrator wraps the `writing-plans` skill — which produces a `meta.type=plan` note. The plan enumerates Tasks (and Phases, if needed).

### 5. Create the Tasks

For each task in the plan:

```
/wbs-new task "Add JWTRefreshHandler to auth router"
```

Each Task description should be execution-ready when you're done: target files with line ranges, the exact change, the verification command, and References pointing to the parent's spec / plan / phase-plan notes.

### 6. Implementer pickup

When an implementer (you, a teammate, or an agent) picks up a Task:

1. They run `tusk task get <short-id>` for the lean description.
2. They pull referenced notes on demand: `tusk note get <note-id>` for the parent's spec, plan, or phase-plan.
3. They execute, add annotations as they work, mark the Task done.
4. Tusk's completion-propagation rolls status up the tree.

### 7. Status check

```
/wbs-status                     # whole project
/wbs-status a3f8b2c1            # subtree
/wbs-status a3f8b2c1 --depth=2  # bounded subtree
```

You see the tree with status, % done from descendants, phase tags, and any warnings (empty Karpathy fields, phase-tag / phase-plan-note mismatches).

---

## The Karpathy decomposition gate

The orchestrator refuses to decompose a node into children until:

1. All five Karpathy fields are populated (deliberately — "none" is fine, blank is not).
2. The Phasing field is either "No phases needed" or has at least one phase listed.
3. The level-appropriate children section (Milestones / Initiatives / Stories / Tasks) lists at least one child by title.

The gate refuses to auto-fill anything. You (or the agent) must populate fields deliberately. This is the point — the gate is a structured forcing function against the failure modes Karpathy named: silent assumptions, unsurfaced confusion, missing tradeoffs, scope creep.

When the gate fails, the orchestrator names the missing field and offers to walk you through filling it. Don't fight the gate; the few extra minutes pay off downstream.

---

## Phasing

Phase a node when its work:

- Splits into ≥2 sequential or parallel chunks of meaningfully different shape, **or**
- Needs ≥2 implementer agents.

Otherwise, leave the Phasing field as "No phases needed."

### Light phasing (Project / Milestone / Initiative)

Chunks of design or research. The orchestrator attaches a `meta.type=phase-plan, meta.phase=phase-N` note to the parent (per `note-phase-plan-light.md`) and tags child tasks with `+phase-N`.

```
tusk task list parent=<milestone-id> +phase-2   # show just phase 2's children
tusk note list task=<milestone-id> meta.type=phase-plan meta.phase=phase-2  # the phase directive
```

### Heavy phasing (Story implementation)

Used when the implementation needs multiple agents or has compilation-safety bridge code. The phase plan note follows `note-phase-plan-heavy.md` and includes:

- **Inherits From** — what state the codebase is in when this phase starts
- **Phase Outcome** — the new state after this phase ships (must be independently shippable)
- **Tasks (4–6)** — the bounded list of child tasks for this phase
- **Bridge Code** — stubs / flags / adapters introduced for compilation safety, **with named removal target phases**
- **Compilation Safety** — confirmation the codebase still compiles after this phase
- **Changes Introduced** — what the next phase's "Inherits From" will reference
- **User-visible Behaviors** — acceptance criteria for the phase

Heavy phasing is the existing `phase-planning-rules` contract, just landing as Tusk notes instead of files.

---

## Right-sized descriptions

Keep descriptions appropriate to their level:

- **Upper levels (Project / Milestone / Initiative / Story)** — outcome-focused, ~100–300 words. Deep rationale belongs in attached notes, not the description.
- **Task / Spike** — whatever it takes to be actionable: file paths with line ranges, exact change, verification command, expected output, References to parent notes.

The orchestrator warns when an upper-level description exceeds 250 words ("move detail into a note") and when a Task description lacks file/line references. Warnings inform; they don't block.

The discipline: lean tickets, rich notes. An implementer should be able to read a Task description and act, pulling notes via `tusk_note_get` only when they need rationale.

---

## Common situations

### "Tusk MCP isn't reachable"

Hard error from the orchestrator. Confirm `claude mcp list` shows tusk and `tusk mcp serve` is running. Check `templates/wbs/taxonomy.md` for the recommended setup.

### "This project has no taxonomy"

The orchestrator surfaces the recommended taxonomy and offers to apply it (workspace-wide via `tusk.toml` or per-project via `tusk_project_settings_set`). You decide which.

### "I want to skip a rank"

Allowed. Tusk permits any-ancestor-to-any-descendant parenting (a Milestone can directly parent a Task). The orchestrator warns but doesn't block. If your project is small enough that intermediate Initiatives or Stories would just be ceremony, skip them.

### "I ran /brainstorm directly, not through the orchestrator"

That's fine — but the spec writes to `docs/superpowers/specs/<file>.md`, **not** to a Tusk note. Future agents reading Tusk for context won't find it. If you want it in Tusk afterwards, copy it into a note via `tusk_note_create` and archive the file.

### "I reparented a task and now phases look weird"

Tusk's notes move with the task. But `meta.phase=phase-N` metadata doesn't auto-update for the new parent's phase numbering. `/wbs-status` flags this as a warning; you fix it manually if needed.

### "Tusk rejected my update with a version conflict"

Someone else (or another session) modified the task. The orchestrator catches the optimistic-lock error, fetches current state, and asks how to proceed: retry, merge, abort. Don't auto-merge.

### "The spec changed materially"

Tusk notes are append-only. Convention: archive the old `meta.type=spec` note, post a new one. The orchestrator surfaces only the newest non-archived spec when loading context.

---

## Where everything lives

| What | Where |
|---|---|
| Description templates per level | `plugins/superhuman/templates/wbs/desc-*.md` |
| Note templates (brainstorm, spec, plan, phase plans) | `plugins/superhuman/templates/wbs/note-*.md` |
| Conventions reference (agent-facing) | `plugins/superhuman/templates/wbs/conventions.md` |
| Taxonomy reference (agent-facing) | `plugins/superhuman/templates/wbs/taxonomy.md` |
| Orchestrator skill | `plugins/superhuman/skills/wbs-orientation/SKILL.md` |
| Slash commands | `plugins/superhuman/commands/wbs-new.md`, `wbs-status.md` |
| Design spec (this guide's source) | `docs/superpowers/specs/2026-04-29-superhuman-wbs-spine-design.md` |
| Roadmap | `docs/superpowers/superhuman-wbs-roadmap.md` |

Tasks, descriptions, notes, annotations, status — all in Tusk. The repo holds code and these conventions; Tusk holds the work.

---

## What this guide doesn't cover

The WBS spine is sub-project #1 of a larger initiative. The roadmap covers what's coming:

- **#2** — Reshape of the existing `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review` skills to write to Tusk notes instead of files.
- **#3** — Richer Tusk integration patterns: bidirectional sync, dashboards, custom queries.
- **#4** — Implementation pipelines (agent-orchestrated and human-orchestrated execution patterns).
- **#5** — Conventions and helpers for note organization beyond what Tusk gives you out of the box.
- **#6 / #7** — Code quality and architecture conventions skills.

Until those land, you may need to bridge gaps manually (e.g., heavy phasing today still requires you to know the `phase-planning-rules` shape; sub-project #2 will make that automatic).

For corrections or extensions to this guide, edit it directly — it's a file in the repo, not a Tusk note.
