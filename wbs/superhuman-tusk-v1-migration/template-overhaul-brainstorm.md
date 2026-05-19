---
type: wbs-note
title: S5 — template overhaul — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/template-overhaul
---

# S5 — template overhaul — brainstorm

Captures the design conversation for S5: bring the `plugins/superhuman/templates/wbs/` templates up to the v1 vocabulary the rest of the plugin now uses (after S2–S4 ported the commands and skills). Templates are the content the commands/skills *emit* — desc-* templates seed node bodies, note-* templates shape wbs-note bodies, `conventions.md` is the prose reference. They lag the code: 12 of 14 still carry v0 references.

Migration plan line:

> "5. **Templates.** Update `templates/wbs/*.md` to reference `wbs-note` ids instead of "Tusk note IDs"; drop the "version" field; reword "meta.type=spec" → "kind=spec"."

This is the most mechanical Story — the translation table is fully established by S2–S4. One genuine decision (`taxonomy.md`'s fate) and otherwise a sweep.

## File inventory

14 templates. **Clean already:** none with zero v0 refs except trivially — effectively all 12 listed below need edits; `desc-initiative.md` and `desc-project.md` need only the "Tusk task" → "wbs-node" wording.

| File | v0 surface | Edit weight |
|---|---|---|
| `taxonomy.md` | Entire file documents v0 per-project taxonomy (`tusk project settings set`, `tusk_project_settings_set`, "WBS Project maps to a Tusk Project"). **Orphaned** — nothing references it as a template (the S3 rewrite dropped the orientation skill's pointer). | **Delete** (see Q1) |
| `conventions.md` | `meta.type=`, `+phase-N` tags, `meta.phase=`, `tusk_note_archive`, `tusk_task_modify`, `tusk_note_add`, "short-id", reshape note as `meta.type=reshape` | Heavy |
| `note-reshape.md` | `meta.type=reshape`, `meta.reshape-of-spec`, `meta.parent-reshape`, "short-id" throughout the disposition lists | Heavy (and align with S4's `wbs-supersedes` model) |
| `note-spec.md` / `note-plan.md` / `note-brainstorm.md` | "Tusk note metadata: `meta.type=X`" header | Light (header → `kind=X` frontmatter) |
| `note-phase-plan-heavy.md` / `note-phase-plan-light.md` | "Tusk note metadata: `meta.type=phase-plan, meta.phase=phase-N`", `+phase-N` tags, "Tusk task short IDs" | Medium |
| `desc-story.md` | spec/plan note refs as `meta.type=spec`/`plan`, `meta.phase=phase-N`, `+phase-N` tags, "Tusk task" | Medium |
| `desc-milestone.md` | `+phase-N`, "Tusk task" | Light |
| `desc-task.md` | "Sibling tasks: `<short-id>`", `+phase-N` | Light |
| `desc-spike.md` | `+phase-N` | Light |
| `desc-initiative.md` / `desc-project.md` | "Each becomes a Tusk task at `level=X`" | Trivial (wording) |

## Translation reminders (established S2–S4)

- "Tusk note metadata: `meta.type=X`" → a note on the `kind` frontmatter property: `kind=X` (the `wbs-note` enum: `spec / plan / brainstorm / phase-plan / reshape-audit`). Note that `meta.type=reshape` maps to `kind=reshape-audit` (the enum value).
- `+phase-N` tag → `phase=phase-N` property on the wbs-node.
- `meta.phase=phase-N` → `phase=phase-N` property.
- "short ID" / "short-id" → path ID (e.g. `wbs/<project>/<child>`).
- "Tusk task" → "wbs-node"; "Tusk note" → "wbs-note".
- `tusk_note_archive <note>` → `tusk_node_modify <note-path> --prop archived=true`.
- `tusk_task_modify <id> description=…` → direct markdown-body edit (no version field).
- `tusk_note_add` → composite `tusk_node_create` + `tusk_edge_add wbs-about`.
- Reshape audit note links the prior spec via a `wbs-supersedes` edge (per S4), so `meta.reshape-of-spec` / `meta.parent-reshape` become body references plus the edge — not frontmatter metadata keys.

## Decisions

### Q1 — `taxonomy.md`: delete or rewrite?

The file documents the v0 per-project taxonomy mechanism end-to-end. Under v1 the taxonomy is the pack's `level` enum (`project / milestone / initiative / story / task / spike`), workspace-wide, declared in `tusk.toml`. The orientation skill already documents this inline (its step 1, post-S3). Nothing references `taxonomy.md` as a file.

| Option | Trade |
|---|---|
| **A. Delete it.** | Removes an obsolete, orphaned file. The v1 taxonomy model is already documented in the orientation skill and the pack header. Git preserves it if ever needed. |
| **B. Rewrite it** to describe the v1 level-enum model. | Keeps a dedicated taxonomy reference. But it would largely duplicate the orientation skill's step 1 and the pack's header comments — a third place to keep in sync. |

**Tentative recommendation:** A (delete). The v1 model has no per-project configuration to document — it's just the pack's enum. A standalone file would be redundant. Git history retains the v0 doc.

### Q2 — `conventions.md` light-phasing section

`conventions.md` describes light phasing (`meta.type=phase-plan` notes + `+phase-N` child tags). This is a real mechanism the phase skills (S7) still use. The S5 rewrite should update the *vocabulary* (`kind=phase-plan`, `phase=phase-N`) but **not** redesign the phasing mechanism — that's S7's call if anything.

**Tentative recommendation:** mechanical vocabulary update only; leave the phasing design to S7.

### Q3 — PR shape

14 files (12 edits + 1 delete + the brainstorm). Single PR. Per-file commits would be noisy at this volume; group by category.

**Tentative recommendation:** single PR, ~3 commits: (a) `desc-*.md` sweep, (b) `note-*.md` sweep, (c) `conventions.md` + delete `taxonomy.md`. Plus the brainstorm/status commit.

## Out of scope

- Phase mechanism redesign — S7.
- Semantic-gate language — S6 (the templates don't carry gate logic; the skills do).
- The `archived` bool property cleanup (noted in S4) — future pack tweak.

## Open questions — resolved (user, 2026-05-19)

1. **Q1 (`taxonomy.md`): A — delete.** Orphaned and obsolete; git retains the v0 doc.
2. **Q2 (conventions phasing): vocabulary-only update**, phasing-mechanism redesign deferred to S7.
3. **Q3 (PR shape): single PR**, category commits.

## Scope addition (user, 2026-05-19): wikilinks materialize edges

Mid-sweep the user directed: cross-references in templates should use `[[wikilinks]]`, not `<note-path>` text placeholders — Tusk materializes edges from body wikilinks. Verified in `~/projects/tusk/internal/node/wikilinks.go` + `reindex.go:158`: body `[[target]]` tokens materialize as `references` edges **only when the workspace declares `[edge-types.references]`** (the literal name activates the materializer; it can't be `wbs-`-prefixed).

**Decision: declare `[edge-types.references]` in `superhuman-wbs`** (mirroring vault — `from=["*"] to=["*"]`, many-to-many, `inverse=referenced-by`). This makes the pack self-contained: wikilinks materialize without requiring vault composition.

Collision note: vault also declares `references`. A workspace adding both packs hits a section collision on `tusk pack add`; the resolution is to skip our `references` when vault is present, or `--force`. The composition matrix in `wbs.toml` is updated to document this. This is the one edge type that intentionally breaks the "wbs-prefix avoids collisions" rule, because the materializer hard-codes the name.

S5 therefore includes a small **pack change** (`feat`) on top of the template sweep:

1. Add `[edge-types.references]` to `plugins/superhuman/packs/wbs.toml`; update the header composition matrix.
2. Re-apply the pack to the dogfood workspace `tusk.toml`.
3. Templates use `[[<node-path>]]` wikilinks in their cross-reference fields (spec note, plan note, phase-plan note, sibling tasks, reshape dispositions) so those become real `references` edges on reindex.

## References

- Migration spec / plan: `wbs/superhuman-tusk-v1-migration/{spec,plan}.md`
- Translation table source: `wbs/superhuman-tusk-v1-migration/orientation-skill-rewrite-brainstorm.md` (S3) and `create-side-commands-brainstorm.md` (S4)
- Target dir: `plugins/superhuman/templates/wbs/`
