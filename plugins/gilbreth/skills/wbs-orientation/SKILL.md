---
name: wbs-orientation
description: Use when working in any WBS context — running /wbs-new or /wbs-status, working from a WBS node at any taxonomy level, or describing decomposition work ("design this milestone", "break this initiative into stories", "plan this story's implementation"). Auto-invokes to detect Tusk context, load the level-appropriate template, wrap brainstorming and writing-plans so their output lands as notes, enforce the Karpathy decomposition gate, and drive decomposition transitions.
---

# WBS Orientation

This is the orchestrator skill for the Gilbreth WBS spine. It is **rigid** — the order of operations below is enforced. Read `templates/wbs/conventions.md` (in the same plugin) before diverging from any step.

This skill relies on `elephant:conventions` for generic graph hygiene rules (windowed access, note granularity, create vs. append vs. supersede, wikilinks, archive-don't-delete, tool discipline). The `core` pack (from the `elephant` plugin) must be installed alongside the `gilbreth-wbs` workflow pack.

## When to invoke

Auto-invoke when ANY of the following is true:

- The user runs `/wbs-new` or `/wbs-status`.
- The user references a WBS node at any taxonomy level (project / milestone / initiative / story / task / spike) by path ID, title, or context.
- The user describes WBS-shaped work: "let's design milestone X", "break this initiative down", "plan the story for Y", "what's still open on this milestone", etc.

Do **not** invoke in workspaces without the `gilbreth-wbs` pack installed, or for non-Tusk file-based design work.

## Tool surface

**MCP-preferred with CLI fallback.** The procedure below names Tusk MCP tools (`tusk_node_list`, `tusk_node_get`, `tusk_node_create`, `tusk_node_modify`, `tusk_edge_add`, `tusk_edge_list`, `tusk_query`, `tusk_reindex`). When the MCP server is reachable, use them. When it isn't, shell out to the equivalent `tusk` CLI verbs (`tusk node list`, `tusk node get`, `tusk node create`, `tusk edge add`, `tusk edge list`, `tusk query`, `tusk reindex`) and parse their tab-aligned output. Either path yields the same result.

Node IDs are workspace-relative paths (e.g. `wbs/<project>/<child>`), not opaque short IDs. Under Tusk v1.3.0, `tusk_edge_add` writes the edge into the source node's frontmatter and reindexes it — the edge-add *is* the wiring; there is no separate persistence step.

## Semantic gate availability

Three gates have a **semantic** layer that ranks nodes by `tusk_query --semantic` (cosine similarity over embeddings): the end-of-brainstorm contradiction gate (§5.7), the planning-time contradiction gate (§6.6), and reference surfacing (§10). The semantic layer requires Ollama configured under `[embeddings]` in `tusk.toml`.

Before running any semantic query, determine availability:

1. **Parse `tusk.toml` for an `[embeddings]` section.** If absent, embeddings are definitely not configured — skip the semantic query entirely and (once per session) emit:

   > *Semantic gates are running in degraded mode — `[embeddings]` isn't configured in `tusk.toml`, so cross-workspace similarity checks are skipped. The structural checks still run. To enable the semantic layer, configure an embeddings provider (see Tusk's `[embeddings]` docs).*

2. **If the section is present**, run the semantic query but **defensively catch** an availability error (Tusk returns `--semantic requires [embeddings] block in tusk.toml` when the block is missing; expect a similar error if Ollama is down or the model is missing). On that error, fall back to structural-only and emit the same hint (once per session).

Rules:

- The **structural checks are the hard gates** and always run. The semantic layer is strictly additive — it never replaces a structural check, only augments it. A workspace without embeddings loses nothing it had before; it just doesn't gain the semantic safety net.
- The degraded-mode hint fires **at most once per session**. After emitting it, note that fact and suppress repeats.
- Never block a gate on the absence of the semantic layer.

## Operating procedure

### 1. Detect Tusk context

- **Pack-presence check (Tusk v1).** Before anything else, verify the `gilbreth-wbs` pack is installed in the active workspace. Probe with `tusk_node_list type=node`: an error indicating the type is undeclared (or an explicit "unknown node type" response) means the pack isn't loaded. When that happens, surface this hint and abort the current operation — do not fall back, do not attempt repair:

  > The `gilbreth-wbs` pack isn't installed in this workspace. Run `/wbs-bootstrap` to initialize Tusk and add the pack, then re-run what you were doing.

  This is the only intervention this skill does about workspace setup — `/wbs-bootstrap` owns the actual mutation. If `tusk_node_list type=node` succeeds (even with zero rows), the pack is present; continue.
- **Resolve the active project.** A project is a `node` with `level=project` — there is no separate project concept under Tusk v1, and the taxonomy is workspace-wide (declared in `tusk.toml` by the pack), not per-project. Query the projects:

  ```
  tusk_query 'type:node AND level:project'
  ```

  - If the invoking command passed an explicit `task=<path-id>` (or `project=<path-id>`) argument, resolve the project from that node's ancestry and skip the prompt.
  - If exactly one project exists, use it without prompting.
  - If more than one exists, list them and ask the user which to work in. Do not auto-pick.
- Hard error if Tusk is unreachable via both MCP and CLI. Point at `/wbs-bootstrap` for setup.

### 2. Identify the current node

- If the user provided a path ID, use it. If they referenced a node by title or partial slug, resolve it via `tusk_query 'type:node'` (add `--semantic <phrase>` to rank by the user's phrasing) and confirm the match.
- Otherwise, use the most recently inspected/modified/created node this session.
- Otherwise, ask the user which node they're working on, listing recent candidates via `tusk_query 'type:node' --sort '-modified' --take 10`.
- Call `tusk_node_get <path-id>` to fetch the full node: level (property), status (property), the markdown body (the description), and its `parent` edge.

### 3. Load the right template

Based on the node's `level`, read the corresponding description template:

- `milestone` → `templates/wbs/desc-milestone.md`
- `initiative` → `templates/wbs/desc-initiative.md`
- `story` → `templates/wbs/desc-story.md`
- `task` → `templates/wbs/desc-task.md`
- `spike` → `templates/wbs/desc-spike.md`
- (Project-level descriptions — `templates/wbs/desc-project.md` — apply to the `level=project` node itself.)

If the template file is missing, fall back to a minimal in-skill template (see "Fallback templates" at the bottom of this file) and log a warning that the plugin appears damaged.

### 4. Decide the operation

Four operations are common:

- **Brainstorm a node's design.** Use when the node's description has empty Karpathy fields. Go to "Wrapped brainstorming."
- **Plan a Story's implementation.** Use when a Story has its spec note populated and is ready for implementation planning. Go to "Wrapped writing-plans."
- **Decompose a node into children.** Use when the description's Karpathy fields are populated and the user wants to create the next-rank-down children. Go to "Decomposition transition."
- **Reshape a node.** Use when the node's prior spec/plan no longer fits — context shifted, parent scope was wrong, learning during brainstorming/planning surfaced contradiction. Go to "Wrapped reshape."

If unclear, ask the user which operation they want.

### 5. Wrapped brainstorming

When brainstorming a node:

1. Invoke the `brainstorming` skill via the Skill tool, with a context shim describing:
   - The current node's level, title, and parent context.
   - The level-appropriate description template (loaded in step 3).
   - The directive that the brainstorm output must land as a `note` (a node with `kind=brainstorm` or `kind=spec`, linked to the current node by an `about` edge), not as `docs/superpowers/specs/<file>.md`.
2. Let brainstorming run its normal loop (one question at a time, propose 2–3 approaches, present design sections).
3. At brainstorming's "Write design doc" terminal step, capture the spec content. Choose the wrapping mechanism:
   - **Subagent capture (preferred):** invoke brainstorming as a subagent with instructions to return the final spec content as text rather than write it to disk; the orchestrator then creates the note (see step 3a).
   - **Context-shim:** instruct the brainstorming skill in its initial context that the "Write design doc" step must create the note via the step-3a sequence — viable if brainstorming is flexible enough to honor the override.
   - **Post-write hoist:** let brainstorming write the file, then read it, create the note via step 3a, and delete the original file. Last resort.
3a. **Create the note (composite).** Two steps, in order:
   - `tusk_node_create --type note --path wbs/<project>/<slug>.md --prop kind=<spec|brainstorm>` with the captured content as the body.
   - `tusk_edge_add --type about --source <new-note-path> --target <current-node-path>` — under v1.3.0 this writes `about: <target>` into the note's frontmatter and reindexes it.
4. Update the node's description: populate the Karpathy fields with summaries from the spec, leaving deep rationale in the note. Edit the node's markdown body directly (Read + Edit the `<path-id>.md` file) — the description is the body after the frontmatter, not a property; there is no `version` field and no optimistic lock.
5. The brainstorming skill's spec self-review and user-review gates still run, reading from the note.
6. When brainstorming's terminal step would invoke `writing-plans`, wrap that the same way (see step 6).
7. **End-of-brainstorm contradiction gate.** Before brainstorming creates the new `kind=spec` note, run two checks:

   - **Structural (hard gate, always runs).** Compare the proposed spec against the parent node's Karpathy fields (`Out of Scope`, `Success Criteria`). If the proposed spec contradicts the parent — for example, the new design needs a capability the parent's "Out of Scope" rules out — that's a contradiction.
   - **Semantic (additive, runs when embeddings are available — see "Semantic gate availability" below).** Surface specs anywhere in the workspace that are semantically near the proposed scope, in case a *cousin or sibling* spec (not just the parent) conflicts:

     ```
     tusk_query 'type:node AND kind:spec AND archived:false'
       --semantic '<proposed spec: outcome + out-of-scope excerpt>' --take 5
     ```

     (Note: `kind` lives on `note`, so query `type:note AND kind:spec`; the example's `node` is shorthand — use `note`.) Present the top matches and ask the user: "Any of these conflict with what we're about to write?" This is a safety net, not a hard gate — the user judges relevance.

   If either check surfaces a contradiction, offer three choices:

   - **(1) Reshape the parent now (pause-and-resume).** Invoke `gilbreth:wbs-reshape-flow` via the Skill tool with the parent as focal node. After it completes (or aborts), re-load the now-refreshed parent context and re-evaluate whether the in-flight spec for this child still makes sense.
   - **(2) Accept the deviation.** Post the spec as-is. Add an entry to the spec note's `## Open Questions` section: "Diverges from parent <parent-path> Out of Scope: <field>. Accepted on <YYYY-MM-DD> pending parent reshape." This becomes a forcing function for whoever later reshapes the parent.
   - **(3) Abandon this brainstorm.** Discard the in-flight spec content. Reshape the parent first (offer to invoke `gilbreth:wbs-reshape-flow` on the parent now), then start the child brainstorm fresh under refreshed context.

   Default to none — the user must pick. Do not auto-decide.

### 5a. Soft-mode reshape hints

While running wrapped brainstorming (step 5) or wrapped writing-plans (step 6), if user phrasing strongly suggests structural drift — phrases like "this contradicts X," "this is actually two stories," "we should split this," "this doesn't fit under <parent>" — emit a one-line hint, *not* a blocking prompt:

> *"Sounds like the shape might need to change. If so, you can run `/wbs-reshape <free-form trigger context> task=<task-id>` to drive that explicitly, or keep going and the end-of-brainstorm gate will check for contradictions automatically."*

Emit at most once per brainstorm/plan invocation. Do not interrupt the flow. The hard gates in steps 5.7, 6.6, and 7 are the authoritative triggers.

### 6. Wrapped writing-plans

When planning a Story's implementation:

1. Invoke the `writing-plans` skill via the Skill tool, with a context shim describing:
   - The current Story's spec note. Pull it via `tusk_edge_list --to=<story-path> --type=about` to find candidate notes, then filter to the newest non-archived one with `kind=spec` (read each candidate's frontmatter, or use `tusk_query 'type:note AND kind:spec AND archived:false' --sort '-modified'` and intersect with the edge candidates).
   - The directive that the plan output must land as a `note` with `kind=plan`, not as `docs/superpowers/plans/<file>.md`.
2. Let writing-plans produce the plan content.
3. Create the plan note (composite, same as step 5.3a): `tusk_node_create --type note --prop kind=plan` with the plan as body, then `tusk_edge_add --type about --source <new-note> --target <story-path>`.
4. If the plan has phases (heavy phasing — multiple implementer subagents per task node, sequential bridge-code dependencies, etc.), `gilbreth:phase-planning-rules` auto-invokes; let it drive the per-phase note shape and the 4–6 task split. Per-phase notes are `note`s with `kind=phase-plan, phase=phase-N` on the Story, following `templates/wbs/note-phase-plan-heavy.md`. After all phase-plan notes are drafted, `gilbreth:phase-continuity-review` auto-invokes before any task is dispatched. After each phase's tasks are workflow-completed and after all phases ship, `gilbreth:phase-post-implementation-review` auto-invokes for the per-phase gate and final sequence verification.
5. Each task in the plan becomes a child node at `level=task` parented to the Story via `parent`, with `phase=phase-N` set if the plan is phased. Use `/wbs-new <free-form context describing the task> task=<story-path>` for each — do not bypass the command.
6. **Planning-time contradiction gate.** Before creating the plan note, run the same two-check shape as step 5.7: the **structural** check (does the plan require a phase, dependency, or scope element that contradicts the parent's `## Phasing`, `## Out of Scope`, or `## Tradeoffs Considered`?), plus the **semantic** cross-spec/plan search when embeddings are available (`tusk_query 'type:note AND kind:plan AND archived:false' --semantic '<plan scope excerpt>' --take 5` — surfaces sibling plans that may conflict on shared surface area). If either surfaces a contradiction, surface the same three-choice prompt described in step 5.7, scoped to the parent of this Story's Initiative (or the nearest ancestor whose Karpathy fields are contradicted). Same defaults: user picks; never auto-decide.

### 7. Enforce the Karpathy decomposition gate

Before allowing a node to transition to a "ready to decompose" status (or before scaffolding child nodes), verify all of the following on the node's description:

- `## Success Criteria` is non-empty and not just placeholder text.
- `## Assumptions Made` is non-empty (must read "none" if there genuinely are none).
- `## Open Questions` is non-empty (must read "none, because …" if genuinely none).
- `## Tradeoffs Considered` is non-empty.
- `## Out of Scope` is non-empty.
- The level-appropriate children section (`## Milestones`, `## Initiatives`, `## Stories`, or `## Tasks`) lists at least one child by title — or the node is intentionally a leaf.

If any check fails: name the missing or weak field(s), refuse to proceed with decomposition, and offer to walk the user through filling them. **Never auto-fill.** Empty fields must be deliberate.

**Reshape escape hatch.** If the gate fails specifically because the node's design conflicts with a parent constraint (for example, the user can't write `## Success Criteria` without violating the parent's `## Out of Scope`), the right answer is reshape, not field-massaging. Surface the three-choice prompt from step 5.7, scoped to the parent. The user picks: reshape the parent, accept the deviation as a recorded divergence, or abandon and restart.

### 8. Decomposition transition

When the gate passes and the user is ready to create children:

1. Read the children list from the description (Milestones / Initiatives / Stories / Tasks section).
2. For each child, run `/wbs-new <free-form context including level cue and title>` (add `task=<parent-path>` if the parent isn't the current node in session context) — this creates the node and re-invokes this orchestrator skill on the new node.
3. Optionally suggest brainstorming each child immediately, or let the user defer.

### 9. Right-sized description warnings

While editing a node's description:

- At Project / Milestone / Initiative / Story levels, warn when description length exceeds 250 words: "This description is getting long; consider moving rationale into a `kind=brainstorm` or `kind=spec` note."
- At Task / Spike levels, warn when description **lacks** required execution-ready content: missing `## Target Files`, `## Verification`, or `## References` sections, or no concrete file paths in `## Target Files`.

These warnings inform; they do not block. Stop nagging once acknowledged.

### 10. Surface References

At Task / Spike level, when the user is populating the `## References` section, query Tusk for likely candidates in two groups.

**Structurally nearby (always).** Find the notes attached to the parent via `tusk_edge_list --to=<parent-path> --type=about`, then filter by `kind`:

- Parent's spec note (`kind=spec`).
- Parent's plan note (`kind=plan`).
- Phase-plan note for this task's phase (`kind=phase-plan` with `phase=<phase>`).
- Sibling tasks in the same phase (`tusk_query 'type:node AND phase:<phase>'` intersected with `tusk_edge_list --to=<parent-path> --type=parent`).

**Semantically nearby (when embeddings are available — see "Semantic gate availability" below).** Rank all live notes by similarity to the task's description body:

```
tusk_query 'type:note AND archived:false' --semantic '<task description body>' --take 8
```

Union with the structural set, de-duplicated. Present the two groups under distinct headings ("structurally nearby" / "semantically nearby") so the user sees why each candidate surfaced.

Suggest these as the user fills the References section — ideally as `[[wikilinks]]` so they materialize `references` edges. The user picks; do not auto-populate.

### 11. Wrapped reshape

When reshaping a node — explicit `/wbs-reshape` invocation, or one of the gate-driven offers from steps 5.7 / 6.6 / 7:

1. Invoke the `gilbreth:wbs-reshape-flow` skill via the Skill tool, passing the focal node's path ID and (if the trigger surfaced one) the contradicting parent context.
2. The reshape skill drives its own loop — context load, trigger capture, wrapped brainstorming, per-child disposition, mutation, audit note. See `plugins/gilbreth/skills/wbs-reshape-flow/SKILL.md`.
3. When reshape completes, it returns a structured summary (focal node path, new spec note path, audit note path, disposition list, gate-pass flag).
4. **If reshape was invoked from step 5.7 or 6.6 (pause-and-resume)**: reload the now-refreshed parent context. Re-display the in-flight child spec or plan. Ask the user: "Parent context has been reshaped. Does the in-flight content for this child still make sense, or do you want to revise?" Revise → restart the child's wrapped brainstorming/writing-plans flow with refreshed context. Keep → proceed to commit.
5. **If reshape was invoked from step 7 (gate failure)**: re-run the Karpathy gate on the original child node. If it now passes, proceed with decomposition transition. If it still fails for an unrelated reason, surface that.
6. **If reshape was invoked explicitly via `/wbs-reshape`**: control returns to the user. No automatic resume.

## Error handling

| Failure | Behavior |
|---|---|
| Tusk unavailable (both MCP and CLI) | Hard error. Point at `/wbs-bootstrap` for setup. No file-based fallback. |
| `gilbreth-wbs` pack not installed | Hard error from the step-1 pack-presence check. Point at `/wbs-bootstrap`. |
| Skipping ranks (Story directly under Project) | Allow but warn. |
| Reparenting | Allow. Notes follow the node via their `about` edge; flag the `phase` property as a manual concern. |
| Karpathy gate fails | Refuse to decompose. Name missing fields. Offer to walk through filling them. Never auto-fill. |
| User runs `/brainstorm` directly (bypass) | Don't intercept. The output is a file in the repo, not a note. Convention doc explains the consequence. |
| Phase / phase-plan-note mismatch | Surface as a warning in `/wbs-status`. Do not auto-fix. |
| Missing template file | Fall back to in-skill minimal template. Log a warning. |
| Stale spec note | Notes are append-only by convention — set `archived=true` on the old note and create a new one (linking the new note to the old via `supersedes`). Surface only the newest non-archived note when loading context. |

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
