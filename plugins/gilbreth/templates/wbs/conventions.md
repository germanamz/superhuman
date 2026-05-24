# WBS Conventions

This document codifies the discipline the WBS orchestrator skill enforces. Read this before working on any WBS node.

> **Generic graph hygiene** (windowed access, note granularity, create vs. append vs. supersede, wikilinks, archive-don't-delete, tool discipline) is covered by `elephant:conventions`. Read that first — the rules here are WBS-specific additions on top of it.

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

**Light phasing** at upper levels (Project / Milestone / Initiative) — chunks of design or research work. Tracked as `kind=phase-plan` notes on the parent node + child nodes carrying the `phase=phase-N` property. Note shape: see `note-phase-plan-light.md`.

**Heavy phasing** at Story implementation — full `phase-planning-rules` contract. Note shape: see `note-phase-plan-heavy.md`. Includes Inherits From, Changes Introduced, 4–6 child tasks per phase, compilation safety, bridge code with removal targets.

## Property and edge naming

WBS-specific conventions (canonical type and edge names come from Elephant's `core` pack; see `elephant:conventions` for generic graph rules):

- Phase identification: the `phase=phase-1`, `phase=phase-2`, … property on nodes (and on `kind=phase-plan` notes).
- Note kinds: `kind=brainstorm | spec | plan | phase-plan | reshape-audit` on notes.
- Note attachment: an `about` edge from the note to its node.
- Reshape lineage: a `supersedes` edge from the new spec note to the prior one; the reshape-audit note records the bridge in prose with `[[wikilinks]]`.
- Archive marker on nodes: the workflow terminal `status=archived` (no separate tag — the status is the signal).
- Cross-references in bodies: `[[wikilinks]]` materialize `references` edges (declared in the `core` pack).

## Decomposition gate

The orchestrator skill enforces this gate before allowing a node to transition to "ready to decompose":

1. All five Karpathy fields are populated. Empty must be a deliberate "none, because …", not a skipped section.
2. The Phasing field is either "No phases needed" or has at least one phase listed.
3. At least one explicit child node is named in the level-appropriate children list (Milestones list at Project, Initiatives list at Milestone, etc.).

The gate refuses to auto-fill missing fields. The user (or agent) must populate them deliberately.

## Reshaping

The WBS is built top-down, but discovery is iterative. Brainstorming a child can surface that a parent's scope was wrong; implementation can reveal a story should be split; priorities can shift. **Reshape** is the structured response: re-brainstorm a node with full context of its original reasoning, then archive or reparent descendants based on the new shape. Mechanical subtree editing (drag-this-branch-here-then-fix-up-everything) is explicitly *not* the goal — context-aware re-brainstorm is.

A reshape always:

1. Records the **reasoning that triggered it** in a `kind=reshape-audit` note on the focal node — the user's voice, not a mechanical diff. Load-bearing: a future reader sees the prior spec, the new spec, and the reshape note bridges them with the learning.
2. Archives the prior `kind=spec` and `kind=plan` notes on the focal node (sets `archived=true`).
3. Creates a new `kind=spec` note via wrapped brainstorming, linked to the prior one with a `supersedes` edge.
4. Updates each direct child to one of three states: kept unchanged, reparented (subtree comes along), or archived.
5. Re-runs the Karpathy decomposition gate on the focal node's new description.

Use `/wbs-reshape <free-form trigger context> task=<focal-path>` to invoke explicitly, or let `wbs-orientation` auto-offer when an end-of-brainstorm, planning-time, or decomposition-gate signal indicates contradiction with parent context.

## Archive semantics

When a node is archived by reshape:

- It transitions to the `wbs-workflow`'s terminal `archived` status. The `gilbreth-wbs` pack declares it; reshape refuses to proceed if it's somehow absent.
- The `status=archived` *is* the archive marker — there is no separate tag (reshape-archive and user cancellation both land in the same terminal state; the reshape-audit note records the provenance).
- Its body is prepended with a one-line stamp pointing at the reshape note: `> **Archived by reshape on <YYYY-MM-DD>.** See reshape note [[<reshape-note-path>]] on [[<focal-node-path>]].` — original content preserved below.
- All non-archived notes on the node are archived (`archived=true` property).
- Descendants that weren't explicitly reparented out are archived recursively.
- Nodes in an in-flight status (`in-progress`) require user confirmation before archive — no soft skip.

Archive is reversible by deliberate user action (re-point the `parent` edge back into the live tree, transition out of `archived`). Hard delete is never required — and because everything is git-tracked markdown, the pre-archive state is recoverable from history regardless.

## Marking a node completed

A node's transition to `completed` must ship as a commit **on that node's own PR** — the PR that does (or finishes) the work the node tracks. Do not defer the status bump to a follow-up change or let it ride on a sibling or later node's branch.

Why this matters under **squash merge** (the common case): a PR collapses to a single commit on the default branch. If the `status=completed` change lives in the node's own PR, that squash commit records the work *and* its completion together — history correctly attributes "this node was completed by this PR." If the bump rides on a different PR, squash merge severs the link: the completion lands in an unrelated commit, the node's own PR looks like it left the work unfinished, and reconstructing what-shipped-when from history becomes guesswork.

Practically: the **last commit on a node's implementation branch flips its status to `completed`** — merging the PR *is* shipping the node, so the PR should already reflect that terminal state. If the PR is abandoned instead of merged, the branch is discarded and the premature `completed` goes with it; no harm.

(Anti-pattern, learned the hard way: bumping a node to `completed` on the *next* node's branch. It works functionally but decouples completion from the work in history — exactly what squash merge then erases.)

## Retiring a completed project

Archive (above) hides a node *within* the live graph — it stays queryable. **Retirement** is the opposite move for a whole finished effort: once a project node and all its descendants reach `completed` (or `archived`), delete the project's WBS tracking files from the workspace entirely.

Why retire instead of leaving completed nodes in place: the WBS tracking files (project/story nodes, spec/plan/brainstorm/reshape notes) exist to coordinate *in-flight* work. Once the work ships, they stop being coordination tools and become **noise** — every future agent that queries the workspace or reindexes pays a context and relevance cost for planning data about something already done. Removing them keeps the live graph scoped to active work.

The procedure, in order:

1. **Mark the terminal state.** Transition the project node (and any not-yet-marked descendants) to `completed`. Ideally the project's own completion already shipped on the final Story's PR (per "Marking a node completed" above — merging the last Story is what completes the project); this step catches any node whose completion wasn't recorded in its own PR.
2. **Commit the completion** as its own change, so the "done" state is a discrete point in history (separate from the file-removal commit in step 3).
3. **Delete the project's tracking files** (`git rm -r` the project's `wbs/<project>/` subtree and its `wbs/<project>.md` node). Commit the removal.
4. **Keep everything else.** The `gilbreth-wbs` pack in `tusk.toml`, the plugin's skills/commands/templates, and any *shipped artifacts* the project produced stay — only the project's own tracking data is removed.

Retirement is safe because the workspace is git-tracked: the full planning record (every node, note, reshape audit) remains recoverable from history if a future effort needs to reference how something was decided. Nothing is truly lost; it's just moved out of the live graph's default view.

Distinction from archive: archive is for a *node within an active project* that no longer fits (reshape discards it but keeps the lineage queryable). Retirement is for a *whole project that's finished* (remove the coordination data; rely on git history). When in doubt mid-project, archive; only retire once the top-level effort is genuinely complete.

## Migrating an existing workspace

Workspaces bootstrapped by an earlier `gilbreth` version used `wbs-node`/`wbs-note` types and `wbs-*`-prefixed edges. The current shape consumes Elephant's `core` pack and uses the canonical `node`/`note` + `parent`/`about`/`supersedes`/`blocks` names. Run `/wbs-migrate` once per such workspace to rewrite frontmatter, swap the pack section in `tusk.toml`, and reindex. The command is idempotent — running it on an already-migrated workspace is a no-op. All edits land in git-tracked markdown, so a clean pre-migration commit is the full recovery path.

## Deferred reshapes

When a child is reparented during a reshape but the user declines to reshape it now under its new parent, the child gets an explicit `## Open Questions` entry: "Reshape under new parent `[[<new-parent-path>]]` context — deferred from reshape `[[<reshape-note-path>]]` on <YYYY-MM-DD>." The next time the Karpathy gate runs on that child (e.g., before its decomposition or before it's brainstormed again), the open question forces resolution. Deferred reshapes are also listed in the focal node's reshape audit note.

## Bypass consequences

If you run `/brainstorm` directly (not via the WBS orchestrator), the brainstorming skill will write the spec to `docs/superpowers/specs/<file>.md` as a file in the repo. The orchestrator does not intercept commands it wasn't invoked through.

This means:

- The spec content will be a loose file in the repo, not a note in the graph.
- Future agents querying Tusk for context won't find this spec.
- If you want it in the graph later, create a `kind=spec` note (`tusk_node_create` + an `about` edge) with the content, and delete the loose file.

If you edit a node's body directly to change its scope (instead of running `/wbs-reshape`), the prior reasoning is lost — there's no audit note bridging the old and new shape. The orchestrator does not detect this after the fact. Convention: scope changes that invalidate prior assumptions go through `/wbs-reshape`; trivial typo-fixes and phrasing edits do not.
