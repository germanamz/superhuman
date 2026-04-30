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

- If the invoking command passed an explicit `project=<name>` argument, use that project — confirm it exists via `tusk_project_get`, hard error if not. Otherwise, call `tusk_project_get` (or `tusk_project_list`) to identify the active project.
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
