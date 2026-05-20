---
type: wbs-note
title: S7 — phase skills port — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/phase-skills-port
---

# S7 — phase skills port — brainstorm

The final Story. Ports the three phase skills from Tusk v0 to v1, and folds in **Gate 3** (the semantic phase-continuity drift check deferred from S6). After S7 merges, the migration's definition-of-done checks apply.

Migration plan line:

> "7. **Phase skills.** `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review` — same MCP renames; the continuity review picks up the semantic query."

## File inventory

| File | v0 surface | + new |
|---|---|---|
| `phase-planning-rules/SKILL.md` (47 lines) | `meta.type=phase-plan`, `meta.phase=phase-N`, `+phase-N` tags, `tusk_task_get`, "task short ID", `meta.type=spec/plan` refs | — |
| `phase-continuity-review/SKILL.md` (40 lines) | `tusk_note_list … meta.type=phase-plan`, `meta.phase` sort, `tusk_task_list parent +phase-N` | **Gate 3** (semantic drift) |
| `phase-post-implementation-review/SKILL.md` (75 lines) | `meta.type=phase-plan` archive, `meta.type=spec/plan` | — |

## Translation reminders (established S2–S6)

- `meta.type=X` (note) → `kind=X` (wbs-note frontmatter property); attachment via `wbs-about` edge.
- `meta.phase=phase-N` / `+phase-N` tag → the `phase=phase-N` property on the wbs-node.
- `tusk_task_get <short-id>` → `tusk_node_get <path-id>`.
- `tusk_note_list task=<id> meta.type=phase-plan` → `tusk_edge_list --to=<story-path> --type=wbs-about` filtered to `kind=phase-plan` (intersect with `tusk_query 'type:wbs-note AND kind:phase-plan AND archived:false'`).
- `tusk_task_list parent=<id> +phase-N` → `tusk_query 'type:wbs-node AND phase:phase-N'` intersected with `tusk_edge_list --to=<story-path> --type=wbs-parent`.
- "phase-plan archive" → `tusk_node_modify <note-path> --prop archived=true`.
- "task short ID" dispatch → "task path ID"; the per-task dispatch convention itself is unchanged (subagent gets the path, pulls context via Tusk).
- MCP-preferred / CLI-fallback note added near the top of each skill (consistent with S2–S6).

## Gate 3 — semantic phase-continuity drift

Per the migration spec, this is the semantic addition to `phase-continuity-review`. For each adjacent phase pair (N, N+1):

```
tusk_query 'type:wbs-note AND kind:phase-plan AND phase:phase-{N+1} AND archived:false'
  --semantic '<phase-N "bridge code removed" / "Changes Introduced" section text>'
```

If the phase-N+1 plan doesn't rank high-similarity to its predecessor's bridge/changes section, that's the **drift signal** — the next phase may not actually build on what the prior one introduced. Surface as a **warning**, not a hard block (the structural continuity checks remain the authoritative gates).

Reuses the **"Semantic gate availability"** pattern S6 added to `wbs-orientation`: parse `tusk.toml` for `[embeddings]`; if absent, skip the semantic drift check and emit the once-per-session degraded-mode hint; if present, run but defensively catch the `--semantic requires [embeddings]` error. Cross-reference the orientation skill's section rather than restating the whole pattern.

## Per-task dispatch convention (unchanged, re-affirmed)

The phase skills encode the per-task subagent dispatch: each implementer subagent receives only the task **path ID**, pulls its task body (primary directive) via `tusk_node_get`, then pulls referenced notes (`spec`, `plan`, own phase's `phase-plan`) on demand. It can't communicate with the planner or sibling subagents. This is intentional WBS ceremony — the port preserves it verbatim, only swapping the Tusk calls. (No auto-bundling of context into the dispatch; the subagent self-serves.)

## Decisions

### Q1 — Gate 3 surfacing

Warning (not hard block), reusing S6's availability pattern. **Tentative recommendation:** confirm — matches the migration spec ("surface as a warning, not a hard block") and S6's additive-semantic principle.

### Q2 — PR shape

Three files, all mechanical except Gate 3. **Tentative recommendation:** single PR, per-file commits (one per skill), mirroring S4.

### Q3 — Definition-of-done verification in this PR

This is the last Story. After the three skills are ported, run the migration's three done-checks and record the results in the PR:

1. `grep -rE 'tusk_(project|task|note)_[a-z]+' plugins/superhuman/` returns **zero** matches.
2. `tusk doctor` clean in the dogfood workspace (modulo the known stale `WorkflowDrift` cache entries, which are display-only).
3. The end-to-end flow (`/wbs-bootstrap` → `/wbs-new` → brainstorm → decompose → `/wbs-status`) references no removed MCP tool.

**Tentative recommendation:** yes — fold the done-checks into S7's PR as the migration's closing verification. If check 1 finds stragglers outside the phase skills, fix them in this PR (they'd be migration bugs).

## Out of scope

- Configuring embeddings (Gate 3's semantic path can't be validated live here — same limitation as S6).
- Any new phasing mechanism — S7 ports the existing one, vocabulary only (the S5 brainstorm already deferred mechanism redesign here, and the answer is "no redesign").

## Open questions for the user

1. **Q1 (Gate 3):** warning + S6 availability pattern. Confirm.
2. **Q2 (PR shape):** single PR, per-file commits. Confirm.
3. **Q3 (done-checks in this PR):** run the three definition-of-done checks as S7's closing verification, fix any stragglers found. Confirm.

## References

- Migration spec "Semantic-query wins → Gate 3": `wbs/superhuman-tusk-v1-migration/spec.md`.
- Definition of done: migration spec + the S1-merged handoff.
- S6 availability pattern: `plugins/superhuman/skills/wbs-orientation/SKILL.md` "Semantic gate availability".
- Target files: `plugins/superhuman/skills/phase-{planning-rules,continuity-review,post-implementation-review}/SKILL.md`.
