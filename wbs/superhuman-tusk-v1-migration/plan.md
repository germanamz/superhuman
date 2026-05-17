---
type: wbs-note
title: Migration plan — Superhuman ↔ Tusk v1
archived: false
kind: plan
---

# Implementation plan — Superhuman ↔ Tusk v1 migration

Drives the spec at `wbs/superhuman-tusk-v1-migration/spec.md` into seven sequenced Stories. Each Story ships as a single PR with `feat(superhuman): …` or `chore(superhuman): …` scope so release-please tracks it.

## Inheritance from the spec

- **Schema unchanged.** Use the `superhuman-wbs` pack already added to this workspace (`plugins/superhuman/packs/wbs.toml`). No further `tusk pack add` calls.
- **Two open questions resolved here.** Path scheme: hierarchical paths (`wbs/<project>/<child>.md`) — reshape pressure is low for this self-referential project, and readable IDs help while we're bootstrapping. Notes-modeling: separate `wbs-note` type (option 1 in the spec). Both can be revisited per-Story if friction shows up.

## Sequencing

The seven Stories are sequenced for shrinking blast radius first, then expanding the surface:

```
S1  pack-and-bootstrap         (foundation, smoke-tested in scratch ws)
   │
S2  wbs-status-readonly-port   (read-only — validates schema under real load)
   │
S3  orientation-skill-rewrite  (MCP renames, drop optimistic-lock branch)
   │
S4  create-side-commands       (/wbs-new, /wbs-reshape)
   │
S5  template-overhaul          (refer to wbs-note ids, drop "meta.type")
   │
S6  semantic-gates             (the actual leverage — Gate 1 → 2 → 3)
   │
S7  phase-skills-port          (phase-* skills onto the new surface)
```

S1 → S5 are sequential. S6 depends on S3 (orientation owns the gate invocations) and S5 (templates reference kind=spec/plan). S7 depends on S5.

## Per-Story shape

Each Story below gets its own wbs-node at `wbs/superhuman-tusk-v1-migration/<slug>` with a `wbs-parent` edge to the migration project. The Story's own spec note will be drafted via the existing brainstorming flow when work picks up.

### S1 — Pack and bootstrap

- **Outcome:** `plugins/superhuman/packs/wbs.toml` ships in the plugin and is reproducible in a fresh workspace via a single `tusk pack add` invocation. A `/wbs-bootstrap` command automates the init step.
- **Files:**
  - `plugins/superhuman/packs/wbs.toml` *(already drafted; verify reload-clean)*
  - `plugins/superhuman/commands/wbs-bootstrap.md` *(new)*
  - `plugins/superhuman/skills/wbs-orientation/SKILL.md` *(touch: detect missing pack and prompt bootstrap)*
- **Verification:** `tusk init && tusk pack add file://…/wbs.toml && tusk doctor` in a scratch dir produces no issues *(track the known kanban-pack `status`-undeclared warning as out-of-scope)*.
- **Risk:** `tusk doctor` undeclared-property warning may confuse first-time users — surface in `wbs-bootstrap` output with a "this is a known Tusk quirk" note.

### S2 — `/wbs-status` read-only port

- **Outcome:** `/wbs-status` renders a WBS subtree using `tusk_edge_list` walks and `tusk_node_get` reads, with no calls to removed MCP tools.
- **Files:**
  - `plugins/superhuman/commands/wbs-status.md` *(rewrite)*
  - No template changes.
- **Verification:** point at `wbs/superhuman-tusk-v1-migration` once Stories S1–S7 land as nodes; expect the seven Stories listed with status rollup.
- **Risk:** depth-N traversal is naive; benchmark before declaring done. If slow on >50 nodes, file the Tusk feature request for native descendants traversal *(spec FR #4)* and ship the naive version anyway.

### S3 — Orientation skill rewrite

- **Outcome:** `wbs-orientation/SKILL.md` reads cleanly against the new MCP surface. The "Tusk version conflict" row of the error table is gone. References to `tusk_task_*`/`tusk_note_*` are replaced per the mapping table in the spec.
- **Files:**
  - `plugins/superhuman/skills/wbs-orientation/SKILL.md` *(line-by-line rewrite)*
- **Verification:** grep for `tusk_(project|task|note)_` under `plugins/superhuman/` returns zero matches *after* S3 + S4 + S5 + S7 land.
- **Risk:** churn collides with S4/S5. Resolve by landing S3 first and treating its content as the source of truth for naming.

### S4 — Create-side commands

- **Outcome:** `/wbs-new` and `/wbs-reshape` write to Tusk via `tusk_node_create` + `tusk_edge_add`. Note creation lands `wbs-note` + `wbs-about` edge.
- **Files:**
  - `plugins/superhuman/commands/wbs-new.md` *(rewrite)*
  - `plugins/superhuman/commands/wbs-reshape.md` *(rewrite)*
  - `plugins/superhuman/skills/wbs-reshape-flow/SKILL.md` *(MCP renames + replace `tusk_note_archive` with `--prop archived=true` + `wbs-supersedes` edge)*
- **Verification:** `/wbs-new context="test story under migration" task=wbs/superhuman-tusk-v1-migration` creates a child story node and a parent edge; reshape can archive its spec.
- **Risk:** the two-call `node_create` + `edge_add` pattern doubles latency. Document as Tusk FR #1 and ship the naive version.

### S5 — Template overhaul

- **Outcome:** every `templates/wbs/*.md` references `wbs-note` IDs and `kind=…` instead of `meta.type=…`. The story template's "Spec note" / "Plan note" sections refer to `wbs-note` paths.
- **Files:**
  - `plugins/superhuman/templates/wbs/desc-{project,milestone,initiative,story,task,spike}.md`
  - `plugins/superhuman/templates/wbs/note-{brainstorm,spec,plan,phase-plan-light,phase-plan-heavy,reshape}.md`
  - `plugins/superhuman/templates/wbs/conventions.md`
  - `plugins/superhuman/templates/wbs/taxonomy.md`
- **Verification:** grep for `meta\.type` and `tusk_(task|note)_` under `plugins/superhuman/templates/` returns zero matches.
- **Risk:** templates ship in user prompts at runtime — any stale reference confuses brainstorming. Block-merge until grep is clean.

### S6 — Semantic gates

- **Outcome:** three gates land, in order: end-of-brainstorm contradiction (Gate 1), reference surfacing at task level (Gate 2), phase continuity drift (Gate 3). Each gate uses `tusk_query --semantic` with a structural pre-filter; each degrades to structural-only if `[embeddings]` is unconfigured.
- **Files:**
  - `plugins/superhuman/skills/wbs-orientation/SKILL.md` *(insert Gate 1 invocation at §5.7 and Gate 2 invocation at §10)*
  - `plugins/superhuman/skills/phase-continuity-review/SKILL.md` *(rewrite drift detection to use Gate 3)*
- **Verification:** for Gate 1, create two sibling-cousin specs that semantically conflict; the gate must surface the cousin and require user disposition.
- **Risk:** Ollama not configured → silent degradation. Mitigation: one-time hint when a gate first runs without embeddings.

### S7 — Phase skills port

- **Outcome:** `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review` all run on the new MCP surface.
- **Files:**
  - `plugins/superhuman/skills/phase-planning-rules/SKILL.md`
  - `plugins/superhuman/skills/phase-continuity-review/SKILL.md`
  - `plugins/superhuman/skills/phase-post-implementation-review/SKILL.md`
- **Verification:** grep for `tusk_(project|task|note)_` under `plugins/superhuman/skills/phase-*` returns zero matches.
- **Risk:** phase-continuity-review overlaps with S6's Gate 3. Resolution: S6 lands the *query*; S7 lands the *skill orchestration around the query*.

## Cross-cutting verification

After S7 lands:

1. `grep -rE 'tusk_(project|task|note)_[a-z]+' plugins/superhuman/` returns zero matches.
2. `tusk doctor` clean in a workspace bootstrapped from this plugin (modulo the kanban-style `status` warning, which is upstream).
3. A user can `/wbs-bootstrap`, `/wbs-new context="seed project"`, brainstorm it, decompose into stories, and run `/wbs-status` — all without surfacing a removed MCP tool.

## What this plan deliberately does *not* do

- It does not file the eight Tusk feature requests. Those live in the spec and should be filed as separate Tusk repo issues once S1 lands.
- It does not migrate any user's old-Tusk data. Documentation-only migration as per spec §Migration steps.
- It does not change the WBS taxonomy or the Karpathy gate. The gate's *enforcement mechanism* may move to the engine later (Tusk FR #6), but the gate itself is unchanged.

## Sequencing tied to release-please

Each Story is one squash-merge PR with `feat(superhuman):` scope (or `chore(superhuman):` if it's reshuffling without new surface). S1 is the only Story that ships a meaningfully new feature surface (the bootstrap command) and should be the minor bump; S2–S7 are patch-class but still `feat(superhuman):` because each *replaces* a broken surface.
