---
type: wbs-note
title: S3 — orientation skill rewrite — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/orientation-skill-rewrite
---

# S3 — orientation skill rewrite — brainstorm

Captures the design conversation for the S3 Story: rewrite `plugins/superhuman/skills/wbs-orientation/SKILL.md` to drop Tusk v0 MCP references and align with v1 (and v1.3.0's frontmatter-backed edges). The orientation skill is the orchestrator for every WBS operation — it auto-invokes on `/wbs-new`, `/wbs-status`, and any WBS-shaped conversational cue. Its current text still references v0 surfaces in roughly half its procedure.

Established by the migration spec / plan:

> "3. **Orientation skill rewrite.** Update every old-MCP reference in `wbs-orientation/SKILL.md` to the new surface; remove the optimistic-lock branch from the error table."

This brainstorm expands that line into a concrete inventory + translation table + drop-list + recommendation.

## Inventory of v0 references in the current orientation skill

A careful read of `plugins/superhuman/skills/wbs-orientation/SKILL.md` surfaces the following v0-era references that need rewriting:

### Step 1 — "Detect Tusk context"

| Current (v0) | Notes |
|---|---|
| `tusk_project_list` (resolve active project) | v0 concept; no v1 equivalent. Projects are `wbs-node level=project`. |
| `project=<name>` argument lookup via `tusk_project_list` | Same — paths replace name lookup. |
| "active project" / "Tusk Project" framing | The whole concept of a "project" as a top-level container is replaced by the wbs-node level enum. |
| "Hard error if the project has no taxonomy. ... `templates/wbs/taxonomy.md`" | v0 had per-project taxonomy. Under v1, the taxonomy lives in `tusk.toml` (pack-declared) and is workspace-wide. |
| The block comment "still reference Tusk v0 concepts (`tusk_project_list`, per-project taxonomy)" | Self-referential acknowledgment of the gap — gets removed when S3 lands. |

The **pack-presence check** at the top of step 1 is already v1-correct (added in S1's #24): `tusk_node_list type=wbs-node`. Preserve.

### Step 2 — "Identify the current node"

| Current (v0) | Notes |
|---|---|
| "task short ID" | v1 uses path IDs. The orientation skill should still accept free-form titles / partial slugs and resolve them, but the canonical form is the path. |
| `tusk_task_list` (list recent tasks for the user to disambiguate) | Maps to `tusk_query 'type:wbs-node' --sort '-modified' --take N`. |
| `tusk_task_get <short-id>` | Maps to `tusk_node_get <path-id>`. |

### Step 5 — "Wrapped brainstorming"

| Current (v0) | Notes |
|---|---|
| `tusk_note_add` (post brainstorm/spec content to the node) | Composite operation under v1: `tusk_node_create --type wbs-note + tusk_edge_add --type wbs-about` (or write the frontmatter directly under v1.3.0 conventions). |
| `meta.type=brainstorm` / `meta.type=spec` | v0 metadata. v1 uses the `kind` property on `wbs-note` directly. |
| `tusk_task_modify <id> description=… version=…` | Composite under v1: edit the file body (description is now the markdown body, not a property), no version field. |
| "fresh `version`" / optimistic-lock semantics | Gone — files are the truth, no optimistic lock. |

### Step 6 — "Wrapped writing-plans"

| Current (v0) | Notes |
|---|---|
| `tusk_note_list task=<story-id> meta.type=spec` | Maps to `tusk_query 'type:wbs-note AND kind:spec AND wbs-about->X=<story-id> AND archived:false' --sort '-modified' --take 1`. Or simpler: `tusk_edge_list --to=<story-id> --type=wbs-about` to find candidate notes, filter to `kind=spec` non-archived in-skill. |
| `tusk_note_add task=<story-id> meta.type=plan` | Composite under v1 (same pattern as spec). |
| Phase-plan note creation pattern | Same — composite. The phase-related skills (`phase-planning-rules`, `phase-continuity-review`, etc.) are slated for separate rewrite in S7. |

### Step 8 — "Decomposition transition"

`/wbs-new <free-form context>` — this command exists but still uses v0 tools internally. **S4 (`create-side-commands`) rewrites it, not S3.** The orientation skill's reference to the command remains — only the command's own implementation changes in S4. No edit needed in step 8.

### Step 10 — "Surface References"

| Current (v0) | Notes |
|---|---|
| `tusk_note_list task=<parent-id> meta.type=spec` | Maps to v1 query (see step 6). |
| `tusk_task_list parent=<parent-id> +phase-N` | v0 used hashtag-style phase tags. v1 has `phase` as a property on wbs-node: `tusk_query 'type:wbs-node AND wbs-parent->X=<parent-id> AND phase:phase-N'`. |

### Error handling table

| Current (v0) | Notes |
|---|---|
| "Tusk version conflict on a `tusk_task_modify`" | **Drop entirely.** No optimistic lock under v1; this error is impossible. |
| "Tusk MCP unavailable" | Update — should mention CLI-fallback path (the MCP-preferred / CLI-fallback pattern S2 established). |
| "Project has no taxonomy" | **Drop entirely.** Replaced by pack-presence check at the top of step 1. |

## Translation table — concise

| v0 | v1 (after S3) |
|---|---|
| `tusk_project_list` | (gone) — workspace has one or more `wbs-node level=project` |
| `tusk_task_list` | `tusk_query 'type:wbs-node AND <filter>'` |
| `tusk_task_get <id>` | `tusk_node_get <path-id>` |
| `tusk_task_modify <id> description=… version=…` | edit the markdown body of `<path-id>.md` directly (no version field) |
| `tusk_note_add task=<t> meta.type=<kind>` | (a) `tusk_node_create --type wbs-note ... + tusk_edge_add --type wbs-about --source <new> --target <t>` <br>(b) or write the new file directly with `wbs-about: <t>` in frontmatter (v1.3.0 idiom) |
| `tusk_note_list task=<t> meta.type=<kind>` | `tusk_edge_list --to=<t> --type=wbs-about`, then filter results by `kind` and `archived` in-skill |
| `meta.type=<kind>` (note metadata key) | `kind=<value>` on the wbs-note's frontmatter directly |
| `meta.phase=<value>` (phase tag) | `phase=<value>` property on the wbs-node's frontmatter directly |
| Optimistic-lock conflict on modify | (gone) |
| Per-project taxonomy / "active project" | (gone) — workspace-wide pack via `tusk_node_list type=wbs-node` |
| Task "short ID" | path ID (e.g., `wbs/superhuman-tusk-v1-migration/wbs-pack-polish`) |

## Drop-list — text that's removed entirely

1. The block comment in step 1: *"The two bullets below this point still reference Tusk v0 concepts ... slated for rewrite in Story S3 (orientation-skill-rewrite)"* — its own deletion is the S3 completion signal.
2. The `tusk_project_list` bullets in step 1.
3. The "Project has no taxonomy" error and the `templates/wbs/taxonomy.md` pointer (the recommended-taxonomy offer).
4. The "Tusk version conflict on a `tusk_task_modify`" row in the error handling table.
5. The `version=<…>` field references in step 5.4.
6. All `meta.type=` framing in step 5–6 (replaced by `kind=` property references).
7. "task short ID" terminology (replaced by "path ID" or just "ID").

## Add-list — content the rewrite introduces

1. **MCP-preferred / CLI-fallback note** — short paragraph near the top of the procedure mirroring S2's command spec: when MCP is reachable use `tusk_*` MCP tools; when not, shell out to `tusk` CLI. Either path produces the same result.
2. **Frontmatter-backed edge note** — short reminder that under v1.3.0, `tusk_edge_add` writes the edge into the source node's frontmatter automatically. The orientation skill doesn't need a separate "wire the edge" step; the edge-add IS the wiring.
3. **Updated step 2 disambiguation prompt** — when the user references a node by title or partial slug, the skill uses `tusk_query` with structural or semantic ranking to surface candidates instead of `tusk_task_list`.
4. **Path-ID examples throughout** — wherever the skill has an example, use a path like `wbs/<project>/<child>` instead of an opaque short ID.
5. **A short "Where the project lives now" section** at the top of step 1, replacing the dropped `tusk_project_list` bullets — explaining that the active project context is resolved by querying for `wbs-node level=project` and that the orientation skill prefers the most-recently-touched project when multiple exist.

## Open questions

### Q1 — Project resolution under multiple projects

Today the skill resolves "the active project" by `tusk_project_list` + asking the user. Under v1, what's the equivalent?

| Option | Trade |
|---|---|
| **A. Recently-touched heuristic.** Query `wbs-node level=project --sort '-modified' --take 1` and use that without asking. Surface the choice as a one-line note. | Fewest prompts. Risk: wrong choice if the user is jumping between projects. |
| **B. Always ask when >1 project exists.** Same UX as today's `tusk_project_list` + disambiguation prompt. | Safe. More prompts in the common single-project case. |
| **C. Take an explicit `task=<project-path>` parameter and require it.** No implicit project resolution. | Predictable. More verbose. |

**Decision: B.** Always ask when more than one project exists; use the sole project without prompting when there's exactly one. Preserves v0's disambiguation UX without an auto-pick that could silently target the wrong project.

### Q2 — Edge-add semantics for note creation

When the orientation skill creates a `wbs-note` (spec, plan, brainstorm), should it:

| Option | Trade |
|---|---|
| **A. Use MCP-style composite: `tusk_node_create` then `tusk_edge_add`.** | Two-step. Each step is atomic. Matches the migration spec's "feature request #1" (composite `tusk_node_attach`) — until that lands, two steps is the pattern. |
| **B. Write the frontmatter directly via filesystem.** | One step. Skill needs to know the file path and frontmatter conventions. Aligns with v1.3.0's "markdown is the source" model but bypasses Tusk's atomic edge-write. |
| **C. Use `tusk_node_create` with the edge declared in frontmatter from the start (`wbs-about: <target>` in the initial body parameter).** | One MCP call; Tusk indexes both node and edge in the same transaction. Cleanest. Requires `tusk_node_create` to accept frontmatter properties — checking: yes, the MCP tool has a `properties` field. |

**Decision: A.** Composite `tusk_node_create` then `tusk_edge_add` — two explicit steps mirroring the migration spec's MCP mapping table. Under v1.3.0 the edge-add still writes the `wbs-about` edge to frontmatter, so durability is unaffected; the skill just spells out both operations rather than relying on `tusk_node_create`'s `properties` field to carry the edge.

### Q3 — Description editing under v1

Under v0, `tusk_task_modify <id> description=<text>` rewrote the description field. Under v1, the description IS the markdown body (after the frontmatter block). Options for the skill:

| Option | Trade |
|---|---|
| **A. Edit the file directly via Read+Edit tools.** | Standard pattern for any markdown edit. Tusk picks up the change on next reindex (or via `tusk reindex` if the skill drives it explicitly). |
| **B. Use a Tusk MCP tool to update the body.** | There's no `tusk_node_set_body` — closest is `tusk_node_modify` which the MCP exposes for properties. Body updates likely fall through to file edits. |

**Tentative recommendation:** A. The skill already uses Read/Edit tools for everything else; markdown body edits are no different. The reindex after edit is automatic via the file watcher (or the skill triggers it explicitly if needed).

### Q4 — Phase tags / `phase` property

v0 used hashtag-style tags like `+phase-1` on tasks. Our v1 pack has a `phase` property on `wbs-node`. The orientation skill's existing references to `+phase-N` are scattered through steps 6 and 10.

| Option | Trade |
|---|---|
| **A. Replace every `+phase-N` reference with `phase=phase-N`.** | Mechanical. Preserves the same semantic with the new vocabulary. |
| **B. Drop the phase mechanism here and defer to S7 (phase skills port).** | S3 stays smaller. But the orientation skill's step 10 needs phase context to surface references correctly — leaving it broken until S7 is awkward. |

**Tentative recommendation:** A. The orientation skill mentions phase in passing; doing the mechanical rename now means S7 doesn't have to come back and patch step 10.

### Q5 — Should this rewrite be a single PR or a multi-phase plan?

The orientation skill is ~200 lines. The rewrite touches maybe 30-40 of those lines. The brainstorm + spec phase is this note; the actual edit is a single contiguous pass. No multi-phase implementation is needed.

**Tentative recommendation:** Single PR. The rewrite is mechanical given this inventory; no implementation discovery is likely to force a restructure.

## Out of scope for S3

- The `/wbs-new` command's v0 references — that's S4 (create-side commands).
- The phase-related skills (`phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review`) — those are S7.
- Templates referenced by the orientation skill (`templates/wbs/desc-*.md`, `templates/wbs/conventions.md`) — touched in S5 (template overhaul). The orientation skill's references to those templates stay as paths; only the templates themselves change in S5.
- `wbs-reshape-flow` skill (which orientation invokes) — has its own port surface. The brainstorm assumes that skill works under v1; if it carries v0 references too, that's a follow-up.

## Tentative implementation plan

A single editing pass over `plugins/superhuman/skills/wbs-orientation/SKILL.md`:

1. Step 1: drop the `tusk_project_list` bullets and the taxonomy-error path. Replace with a short "project resolution under v1" paragraph (per Q1's recommendation). Drop the self-referential "v0 concepts" block comment.
2. Step 2: replace `tusk_task_list` / `tusk_task_get` with the v1 equivalents; drop "short ID" framing.
3. Step 5: replace `tusk_note_add` and `tusk_task_modify` references; drop `version=` mentions; replace `meta.type=` with `kind=`.
4. Step 6: same rewrites; verify the wrapped writing-plans flow still references the right Tusk calls. Replace `meta.type=spec` queries with v1 equivalents.
5. Step 10: replace `tusk_note_list` / `tusk_task_list +phase-N` references with v1 queries.
6. Error handling table: drop the optimistic-lock row and the "Project has no taxonomy" row.
7. Add the MCP-preferred / CLI-fallback paragraph near the top.
8. Sweep examples to use path IDs.

Estimated diff: ~50-80 line changes across the 200-line file.

## Open questions — resolved (user, 2026-05-19)

1. **Q1 (project resolution): B — always ask when >1 project exists.** Same UX as v0's `tusk_project_list` + disambiguation prompt: query `wbs-node level=project`; if exactly one, use it; if multiple, list them and ask. No recently-touched auto-pick.
2. **Q2 (note creation): A — composite `tusk_node_create` then `tusk_edge_add`.** Two explicit steps, mirroring the migration spec's MCP mapping table. Under v1.3.0 the `tusk_edge_add` writes the `wbs-about` edge into the new note's frontmatter, so the composite still yields markdown-durable state — but the skill spells out both steps rather than packing the edge into the create call.
3. **Q3 (description editing): A — file edits via Read/Edit**, reindex handles indexing.
4. **Q4 (phase tags): A — rename `+phase-N` references to `phase=phase-N`** in steps 6 and 10 now (don't defer to S7).
5. **Q5 (PR shape): single PR.**

## References

- Migration spec: `wbs/superhuman-tusk-v1-migration/spec.md`
- Migration plan: `wbs/superhuman-tusk-v1-migration/plan.md`
- Target file for the rewrite: `plugins/superhuman/skills/wbs-orientation/SKILL.md`
- Pattern reference for MCP-preferred + CLI-fallback: `plugins/superhuman/commands/wbs-status.md` (S2)
- Tusk MCP tool list (loaded into this session): `tusk_node_list`, `tusk_node_get`, `tusk_node_create`, `tusk_node_modify`, `tusk_edge_add`, `tusk_edge_list`, `tusk_edge_remove`, `tusk_query`, `tusk_reindex`, `tusk_status`, `tusk_doctor`
