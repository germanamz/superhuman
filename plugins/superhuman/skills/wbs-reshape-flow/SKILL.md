---
name: wbs-reshape-flow
description: Re-brainstorm a WBS node with full original context and apply the resulting structural change — archive, reparent, or keep descendants — when discovery during brainstorming, planning, or implementation contradicts an earlier shape. Auto-invoked by wbs-orientation on end-of-brainstorm, planning-time, or decomposition-gate-failure triggers; also invoked explicitly via `/wbs-reshape <free-form trigger context> task=<focal-path>`.
---

# WBS Reshape

This is the reshape orchestrator skill for the Superhuman WBS spine. It is **rigid** — the order of operations below is enforced. Read `templates/wbs/conventions.md` (in the same plugin) before diverging from any step.

The skill's purpose is *context-aware re-brainstorm*, not mechanical subtree editing. When a node's prior spec/plan no longer fits, this skill loads the original reasoning, captures what was learned, wraps the `brainstorming` skill with that context, and walks per-child disposition decisions (keep / reparent / archive). Reparented children whose own subtrees need reshaping recurse through this same workflow at the user's election.

## Tool surface

**MCP-preferred with CLI fallback.** The procedure names Tusk MCP tools (`tusk_query`, `tusk_node_get`, `tusk_node_create`, `tusk_node_modify`, `tusk_edge_add`, `tusk_edge_remove`, `tusk_edge_list`). When the MCP server is unreachable, shell out to the `tusk` CLI equivalents. Node IDs are workspace-relative paths. Under Tusk v1.3.0, `tusk_edge_add` / `tusk_edge_remove` rewrite the source node's frontmatter and reindex it — edge changes are durable in markdown, and there is no version field or optimistic lock anywhere in this flow.

## When to invoke

Invoke when ANY of the following is true:

- The user runs `/wbs-reshape <free-form trigger context> task=<focal-path>` (or `/wbs-reshape <context>` with focal node from session context).
- The `wbs-orientation` skill delegates to this skill on an end-of-brainstorm contradiction gate (parent's Karpathy fields contradict the proposed child spec), a planning-time contradiction gate (plan can't fit parent's stated decomposition), or a decomposition-gate failure caused by a parent constraint.
- The user describes mid-flight learning that invalidates a node's prior shape ("we need to split this story", "the parent initiative was wrongly scoped", "external priorities changed and this branch should be retired").

Do **not** invoke for routine description edits, typo fixes, or phrasing changes — those are direct edits to the node's markdown body. Reshape is for scope changes that invalidate prior assumptions and require an audit trail.

## Operating procedure

### 1. Detect Tusk context

- A project is a `wbs-node level=project`. If invoked with an explicit `task=<focal-path>` (or `project=<path>`) argument, derive the project from that node's ancestry. Otherwise query `tusk_query 'type:wbs-node AND level:project'`: use the sole project if there's one, else ask the user which (do not auto-pick).
- Hard error if Tusk is unreachable via both MCP and CLI. Point at `/wbs-bootstrap` for setup.
- Hard error if the `superhuman-wbs` pack isn't installed (the step-1 pack-presence check from `wbs-orientation`). Point at `/wbs-bootstrap`.
- The `wbs-workflow` declares a terminal `archived` status — reshape archive semantics use it. (The `superhuman-wbs` pack always declares it, so this is a no-op check in practice; surface a hard error only if a workspace has somehow removed it from `tusk.toml`.)

### 2. Identify the focal node

In priority order:

1. Explicit `task=<focal-path>` from `/wbs-reshape`.
2. Auto-invoke focal node passed by `wbs-orientation` (when delegated from an end-of-brainstorm, planning-time, or decomposition-gate trigger).
3. The most recently inspected, modified, or created node this session.
4. Ask the user, listing recent candidates via `tusk_query 'type:wbs-node' --sort '-modified' --take 10`.

Call `tusk_node_get <focal-path>` to fetch the full node: level, status, the markdown body (the description), and its `wbs-parent` edge. There is no version field.

### 3. Load original reasoning

Pull all of the following. Notes attached to a node are found via `tusk_edge_list --to=<focal-path> --type=wbs-about`, then filtered by `kind` and `archived=false` (read each candidate's frontmatter, or intersect with `tusk_query 'type:wbs-note AND kind:<k> AND archived:false' --sort '-modified'`):

- The focal node's object (already fetched in step 2).
- The newest non-archived `kind=spec` note on the focal node.
- The newest non-archived `kind=plan` note, if any.
- The newest non-archived `kind=reshape-audit` note (a prior reshape on this node, if any) — surfaces lineage when this is the second or later reshape.
- Direct children: `tusk_edge_list --to=<focal-path> --type=wbs-parent` gives each child's source path. For each, `tusk_node_get` captures title, level, status, and the first 1–2 sentences of the body (one-line summary).
- Any descendants currently in an in-flight status (`in-progress`). Walk the subtree via repeated `tusk_edge_list --to=<id> --type=wbs-parent` calls, collecting these into a concurrency-watch list used in step 7.

If the focal node has no spec note, surface a warning: "This node has no `kind=spec` note — there's no original reasoning to load. Reshape will proceed but the audit note's `## Original Shape` section will be sparse." Allow the user to continue or abort.

### 4. Synthesize "what we wanted vs. what's here"

Before asking the user any reshape questions, produce a written summary the user reads. Format:

> **Original outcome:** <one line from the spec's outcome section>
>
> **Original reasoning:** <key Karpathy fields from the spec — Success Criteria, Tradeoffs Considered, Out of Scope — paraphrased into 2–3 sentences>
>
> **Current shape:** <focal node's current child list with levels and statuses; phasing summary if the node is phased>
>
> **Tradeoffs at design time:** <bullet list pulled from the spec's `## Tradeoffs Considered`>

This synthesis lands as a regular assistant message — not a Tusk note — and is the shared reference frame for the rest of the flow.

### 5. Capture the trigger

Ask the user, one question at a time. Do not batch.

1. *"What did you learn that triggered this reshape?"* — free text. Becomes the **Trigger** sentence and seeds the **Reasoning** section of the audit note.
2. *"Which pieces of the original reasoning no longer hold?"* — free text. Becomes the **Invalidated Assumptions** section. Cross-reference each item against the spec's `## Assumptions Made` field where possible.
3. *"What outcome do you now want?"* — free text. Becomes the seed brief for the wrapped brainstorming run in step 6.

These three answers are the load-bearing inputs to the reshape. Do not auto-fill any of them. If the user gives a one-word answer to the first question, prompt for elaboration — the audit note's value comes from the depth of the reasoning capture.

### 6. Wrapped brainstorming

Invoke the `brainstorming` skill via the Skill tool with a context shim describing:

- The synthesis from step 4.
- The trigger and invalidated assumptions from step 5.
- The level-appropriate description template (loaded from `templates/wbs/desc-<level>.md` based on the focal node's level — same loading rules as `wbs-orientation` step 3).
- The directive that brainstorming's terminal "Write design doc" output must land as a *new* `kind=spec` wbs-note on the focal node, **not** as `docs/superpowers/specs/<file>.md`.

Use the same wrapping mechanism documented in `wbs-orientation/SKILL.md` step 5 ("Subagent capture" preferred — invoke brainstorming as a subagent with instructions to return the final spec content as text rather than write it to disk; this orchestrator then creates the note via the composite `tusk_node_create` + `tusk_edge_add` sequence in step 8.2).

Brainstorming runs its normal loop (one question at a time, propose 2–3 approaches, present design sections). The synthesis from step 4 is the input context, not a constraint — the user is free to move scope in any direction, including dramatic departures from the original.

If brainstorming's spec content does not converge (user gives up, asks too many open questions, etc.), reshape can be aborted at this point with no mutations applied. No audit note is posted on abort.

### 7. Disposition decisions per direct child

For each direct child of the focal node (loaded in step 3), present the user with the new spec content from step 6 and ask one of:

- **Keep unchanged.** Leave the child alone. The new spec's children list still names this child.
- **Reparent.** The child belongs under a different parent in the new shape. Ask which parent — an existing wbs-node or a new one. If new, run `/wbs-new <free-form context including level cue and title> task=<grandparent-path>` first to create it. Apply the move by swapping the `wbs-parent` edge: `tusk_edge_remove --type wbs-parent --source <child-path> --target <old-parent-path>` then `tusk_edge_add --type wbs-parent --source <child-path> --target <new-parent-path>`. The child's subtree comes along automatically — the child's own children still declare `wbs-parent: <child-path>`, so they ride along unchanged. Then ask: *"Reshape this child now under its new parent?"*
  - If **yes**: recurse into step 1 of this skill with the reparented child as the new focal node. The recursive run posts its own `kind=reshape-audit` note; the parent reshape's audit note (this run's) lists the nested reshape note path in its `## Nested Reshapes` section. If recursion depth from the top-level invocation exceeds 3, pause and confirm with the user that continued descent is intended — deeply-nested reshapes usually mean the wrong focal node was chosen at the top.
  - If **no**: capture the deferral. Step 8.6 patches the child's `## Open Questions` section once the audit note's path is known. Do not edit the child's description in step 7. The patch format applied at step 8.6 is: `Reshape under new parent <new-parent-path> context — deferred from reshape <audit-note-path> on <YYYY-MM-DD>.`
- **Archive.** The child no longer fits the new shape. Apply archive semantics (see "Archive semantics" below). Children of the archived child are archived recursively unless they have already been explicitly reparented out earlier in this loop.

> *"<child-path> (<title>) is in <in-flight-status>. Archiving / reparenting it will disrupt that work. Confirm? (y/N)"*

Default is **N**. Soft-mode skipping is not allowed. If the user declines, the child must be **kept unchanged** for this reshape — they can revisit after the in-flight work completes.

The user can also elect to **create new children** that didn't exist before. For each new child, run `/wbs-new <free-form context including level cue and title> task=<focal-path>` to scaffold it under the focal node. New children are listed in the audit note's `## New Shape` section as `**created via /wbs-new**`.

### 8. Apply mutations

Apply in this exact order. Each step is a single Tusk call (or a small bounded loop of them). If any step fails (MCP error, missing node), surface the partial state with the paths of what was applied so the user can recover manually — do not roll back automatically. There is no version field and no optimistic lock; concurrent edits to the same files are the only conflict source, and the file watcher reconciles them.

1. **Archive prior notes on the focal node.** For each non-archived `kind=spec | plan | brainstorm` note on the focal node, set `tusk_node_modify <note-path> --prop archived=true`.
2. **Create the new `kind=spec` note** on the focal node, using the brainstorming output from step 6. Composite: `tusk_node_create --type wbs-note --prop kind=spec` with the new spec as body, then `tusk_edge_add --type wbs-about --source <new-note-path> --target <focal-path>`. Also link the supersession chain: `tusk_edge_add --type wbs-supersedes --source <new-note-path> --target <prior-spec-path>` (from step 3's loaded prior spec). Capture the new note path for the audit note's references.
3. **Update the focal node's description** by editing the markdown body of `<focal-path>.md` directly (Read + Edit). The new description has Karpathy fields populated from the new spec (paraphrased — the spec is the authoritative version, the description is the lean-ticket reference per `templates/wbs/conventions.md`). The `## <Children>` section is rebuilt from step 7's dispositions. No version field.
4. **Apply each child disposition.** For each direct child, in the order surfaced in step 7:
   - **Keep unchanged**: no-op.
   - **Reparent (with recursion)**: swap the `wbs-parent` edge — `tusk_edge_remove --type wbs-parent --source <child-path> --target <old-parent-path>` then `tusk_edge_add --type wbs-parent --source <child-path> --target <new-parent-path>`. The recursive `wbs-reshape-flow` invocation runs immediately after, before processing the next child. Its mutations land in this run's step 8 ordering and its own audit note posts as part of the recursive run; the parent-reshape note (this run's) is created in substep 5 and lists the recursive run's audit-note path in its `## Nested Reshapes` section.
   - **Reparent (without recursion)**: same edge-swap. Do not modify the child's description here — the deferred-reshape entry on `## Open Questions` is patched in substep 6, once the audit note's path is known.
   - **Archive**: see "Archive semantics" below for the procedure.
5. **Create the `kind=reshape-audit` note** on the focal node, using `templates/wbs/note-reshape.md` as the body shape. Composite: `tusk_node_create --type wbs-note --prop kind=reshape-audit` with the populated template as body, then `tusk_edge_add --type wbs-about --source <audit-note-path> --target <focal-path>`. The body records:
   - The prior spec path (from step 3) under a `## Supersedes` reference — the `wbs-supersedes` edge from substep 2 already captures this structurally.
   - The parent reshape's audit-note path if this is a recursive run (passed in via the recursion call), under `## Parent Reshape`.
   - Every section filled. Reasoning and Invalidated Assumptions must be the verbatim user input from step 5; do not paraphrase.

   Capture the new audit-note path for substep 6.
6. **Patch deferred-reshape entries.** For each child marked "reparent without recursion" in substep 4, append a deferred-reshape entry to the child's `## Open Questions` section (Read + Edit the child's body) using the audit-note path from substep 5. Format: `Reshape under new parent <new-parent-path> context — deferred from reshape <audit-note-path> on <YYYY-MM-DD>.` If no children are marked "reparent without recursion," substep 6 is a no-op.

### 9. Re-run the Karpathy decomposition gate

On the focal node's new description, verify all of the following — same checks as `wbs-orientation` step 7:

- `## Success Criteria` is non-empty and not just placeholder text.
- `## Assumptions Made` is non-empty (must read "none" if there genuinely are none).
- `## Open Questions` is non-empty (must read "none, because …" if genuinely none). Note: this section may now contain deferred-reshape pointers from step 7 — those satisfy non-emptiness but should not be the *only* content.
- `## Tradeoffs Considered` is non-empty.
- `## Out of Scope` is non-empty.
- The level-appropriate children section lists at least one child by title — or the node is intentionally a leaf.

If any check fails: name the missing or weak field(s), refuse to mark the reshape complete, and offer to walk the user through filling them. The reshape audit note has already been posted; the gate failure means follow-up work on the description is required before the node is ready for downstream use.

### 10. Return control

If invoked from `wbs-orientation` (auto-invoke from steps 5.7, 6.6, or 7), return a structured summary to the caller:

- Focal node path.
- New spec note path.
- Reshape audit note path.
- Disposition list per direct child (kept / reparented-to-X / archived / new).
- Whether the Karpathy gate passed (true/false; if false, list the failing fields).
- Whether any deferred reshapes were recorded.

The caller (`wbs-orientation`) decides whether to resume the original flow (pause-and-resume from step 5.7 or 6.6) or hand control back to the user.

If invoked explicitly via `/wbs-reshape`, control returns to the user. Print the same structured summary as a final message.

## Archive semantics

When a node is archived as part of this reshape, apply all of the following — in this order — for each archived node:

1. **Workflow transition.** Move the node to the `wbs-workflow`'s terminal `archived` status: `tusk_node_modify <node-path> --prop status=archived`. The `superhuman-wbs` pack declares `archived` as a terminal status reachable from any non-terminal state.
2. **Description stamp.** Prepend a one-line marker to the node's body (Read + Edit), preserving original content:

   ```markdown
   > **Archived by reshape on <YYYY-MM-DD>.** See reshape note <reshape-note-path> on <focal-node-path>.

   <original description preserved below>
   ```

3. **Note archival.** For every non-archived note on the node (`tusk_edge_list --to=<node-path> --type=wbs-about`), set `tusk_node_modify <note-path> --prop archived=true`.

**Cascade.** Children of the archived node that weren't explicitly reparented out in step 7 are archived recursively. Walk via `tusk_edge_list --to=<archived-path> --type=wbs-parent`, applying the steps above to each. The cascade stops at any descendant that has been explicitly reparented out earlier in step 7 — that subtree has a new parent (a different `wbs-parent` edge) and stays alive.

**Concurrency guard.** Before archiving any node in an in-flight status (`in-progress`), the hard-confirm prompt from step 7 applies. Default N. No soft skip.

**Reversal.** Archive is reversible by deliberate user action: re-point the archived node's `wbs-parent` edge back into the live tree and transition its status out of `archived`. This skill does not automate reversal — that's a separate user gesture. (Because all of this lives in git-tracked markdown, the pre-archive state is also recoverable from history.)

## Error handling

| Failure | Behavior |
|---|---|
| Tusk unavailable (both MCP and CLI) | Hard error in step 1. Pointer to `/wbs-bootstrap`. |
| `superhuman-wbs` pack not installed | Hard error in step 1. Pointer to `/wbs-bootstrap`. |
| `wbs-workflow` missing the terminal `archived` status | Hard error in step 1. Refuse to proceed (shouldn't happen with the shipped pack). |
| Focal node has no spec note | Warn in step 3. Allow user to abort or proceed with sparse audit note. |
| Brainstorm in step 6 doesn't converge | Allow abort. No mutations applied. No audit note posted. |
| User abandons after step 8 begins | Surface partial-state paths of what was applied. Manual remediation by the user; reshape can be re-invoked to recover. State is git-tracked, so prior state is recoverable from history. |
| Concurrency block on an `in-progress` node | Hard-confirm prompt. Default N. No soft skip. |
| Karpathy gate fails after reshape (step 9) | Audit note already posted. Refuse to mark reshape complete. Walk user through filling the failing fields. Do not roll back the audit note. |
| Recursive reshape on reparented child fails | The parent reshape's audit note still posts. The failed nested reshape is listed in `## Nested Reshapes` with a "(failed)" suffix and the partial-state paths. |

## Design references

- Spec: `docs/superpowers/specs/2026-05-01-wbs-reshape-design.md`
- Conventions: `templates/wbs/conventions.md` (sections "Reshaping", "Archive semantics", "Deferred reshapes")
- Audit-note template: `templates/wbs/note-reshape.md`
- Wrapped brainstorming pattern: `wbs-orientation/SKILL.md` step 5
- Auto-invoke triggers in `wbs-orientation`: steps 5.7 (end-of-brainstorm), 6.6 (planning-time), 7 (decomposition-gate failure escape hatch)
