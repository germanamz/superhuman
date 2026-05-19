---
type: wbs-note
title: S4 — create-side commands — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/create-side-commands
---

# S4 — create-side commands — brainstorm

Captures the design conversation for S4: port the create-side surface from Tusk v0 to v1. These are the commands that *mutate* the WBS graph — create nodes, attach notes, reparent, archive. S2 (read-only) and S3 (orchestrator) preceded this deliberately so the read and orchestration surfaces were proven before the mutation surface lands.

Migration plan line:

> "4. **Create-side commands.** `/wbs-new`, `/wbs-reshape` — both need the `tusk_node_create` + `tusk_edge_add` pattern; both write into `wbs-note`."

## Scope question (the one real decision)

The plan names two commands. But `/wbs-reshape` is a **thin wrapper** over the `wbs-reshape-flow` skill — the command does arg-parsing and delegates; the skill (`plugins/superhuman/skills/wbs-reshape-flow/SKILL.md`, 207 lines) carries all the reshape logic and **28 v0 references**. Porting the command without the skill leaves `/wbs-reshape` pointing at a v0 skill — non-functional.

So the realistic S4 file set is **three files**:

1. `plugins/superhuman/commands/wbs-new.md`
2. `plugins/superhuman/commands/wbs-reshape.md`
3. `plugins/superhuman/skills/wbs-reshape-flow/SKILL.md`

| Option | Trade |
|---|---|
| **A. All three in S4.** | `/wbs-reshape` actually works when S4 ships. Bigger PR (~3 files, the skill is the bulk). Matches "create-side is done" as a coherent milestone. |
| **B. Two commands in S4; reshape-flow skill as a new S4.5.** | Smaller PRs. But S4 ships a `/wbs-reshape` command that calls a broken skill — a known-broken intermediate state on `main`. |
| **C. `/wbs-new` only in S4; `/wbs-reshape` + skill as S4.5.** | `/wbs-new` is the higher-traffic command; ship it first, clean. Reshape (command + skill) becomes its own coherent Story. No broken intermediate. |

**Tentative recommendation:** A. The create-side is one coherent surface; shipping it half-ported leaves a broken command on main. The reshape-flow skill rewrite is mechanical (same translation table as S3), so the larger PR isn't riskier — just longer. C is the fallback if the PR feels too big to review in one pass.

## v0 → v1 mappings new to S4

S2 and S3 established most of the table. S4 introduces the **mutation-specific** mappings not seen before:

| v0 | v1 |
|---|---|
| `tusk_task_create --level=X --parent=Y` | `tusk_node_create --type wbs-node --prop level=X` then `tusk_edge_add --type wbs-parent --source <new> --target Y`. Under v1.3.0 the edge-add writes `wbs-parent: Y` into the new node's frontmatter. |
| `tusk_note_archive <note>` | `tusk_node_modify <note> --prop archived=true`. To preserve lineage, also `tusk_edge_add --type wbs-supersedes --source <new-note> --target <old-note>`. |
| `tusk_task_modify parent=<new>` (reparent) | Reparent = swap the `wbs-parent` edge: `tusk_edge_remove --type wbs-parent --source <child> --target <old-parent>` then `tusk_edge_add --type wbs-parent --source <child> --target <new-parent>`. Under v1.3.0 both rewrite the child's frontmatter `wbs-parent` value. **Subtree follows automatically** — the child's own children still declare `wbs-parent: <child>`, so they ride along unchanged. Semantics preserved from v0. |
| `+reshape-archived` tag via `tusk_task_modify` | The reshape archive uses the workflow's `archived` terminal status (`tusk_node_modify <id> --prop status=archived`) plus the `archived=true` property. No tag mechanism — the status *is* the signal. |
| `tusk_task_modify ... version=<current-version>` | Edit the markdown body / properties directly. No version field, no optimistic lock. |
| optimistic-lock conflict handling (reshape-flow step 8, error table) | **Dropped entirely** — same as S3. Files are the truth; no version conflicts. |
| `meta.type=reshape` audit note | `wbs-note` with `kind=reshape-audit` (the `kind` enum in the pack already includes `reshape-audit`), linked via `wbs-about`. |

Plus all the S3-established mappings (`tusk_task_*` → `tusk_node_*`/`tusk_query`, `tusk_note_*` → composite create+edge, `meta.type=` → `kind`, `tusk_project_list` → query `level:project`, "short ID" → path ID, `templates/wbs/taxonomy.md` pointer → `/wbs-bootstrap`).

## File-by-file inventory

### `commands/wbs-new.md`

v0 surface: `tusk_project_list`, `tusk_task_create`, `tusk_task_list`, per-project taxonomy validation, "short ID" parent resolution, `project=<id>` param. Port mirrors S3's step-1/step-2 rewrites plus the `tusk_task_create` → composite mapping above. The command's own procedure (parse → resolve project → infer level → resolve parent → load template → create → hand off to orientation) stays structurally identical; only the Tusk calls change.

### `commands/wbs-reshape.md`

v0 surface: `tusk_project_list`, "Tusk Project"/"active project", `project=<id>`, "short ID", `templates/wbs/taxonomy.md`, `meta.type=reshape`. Thin wrapper — small port. Drop the `project=<id>` param and the taxonomy-error path (same as S3).

### `skills/wbs-reshape-flow/SKILL.md`

The bulk. 28 v0 references including the substantive mutation mappings (reparent, archive cascade, note archival). Key sections needing care:

- **Step 1 context resolution** — `tusk_project_list` → `level:project` query (always-ask per S3's decision).
- **Step 2 focal-node resolution** — `tusk_task_get <short-id>` → `tusk_node_get <path-id>`; drop `version`.
- **Context load (specs/plans/reshape notes/children)** — `tusk_note_list ... meta.type=X` and `tusk_task_list parent=` → edge-list + kind/level filters.
- **Wrapped brainstorming** — `tusk_note_add` → composite create+edge (reuses orientation step 5.3a).
- **Per-child disposition (reparent)** — `tusk_task_modify parent=` → the edge-swap above. The "subtree comes along automatically" note stays true under v1 and should be re-affirmed (different mechanism, same outcome).
- **Mutation step (archive prior notes, post new spec, update description)** — `tusk_note_archive` → `archived=true` property; `tusk_task_modify description= version=` → direct body edit.
- **Archive cascade** — `+reshape-archived` tag → `status=archived`; `tusk_task_list parent=` walk → `tusk_edge_list --to=<id> --type=wbs-parent` recursion.
- **Error table** — drop the optimistic-lock row.

## Open questions

### Q1 — Scope (the three-file decision above)

A (all three in S4) / B (commands now, skill as S4.5) / C (`/wbs-new` now, reshape command+skill as S4.5)?

**Tentative recommendation:** A.

### Q2 — Reshape archive: status vs property

The reshape-flow archives nodes. Two signals exist in the pack: the `archived` bool property and the workflow's `archived` terminal status.

| Option | Trade |
|---|---|
| **A. Use the workflow `archived` status** (`status=archived`). | Single source of truth; `/wbs-status` already reads status. The workflow declares `archived` as terminal. |
| **B. Use the `archived` bool property.** | Separate from workflow; allows "archived" orthogonal to status. Redundant with the status. |
| **C. Both** (status=archived AND archived=true). | Belt-and-suspenders; two things to keep in sync. |

**Tentative recommendation:** A. The workflow status is the canonical signal; the `archived` bool property is arguably redundant and could be dropped from the pack in a future cleanup (out of S4 scope). For now S4 sets `status=archived` and leaves the `archived` property untouched.

### Q3 — Note archival + supersedes

When reshape archives a prior spec note and posts a new one, should it always create the `wbs-supersedes` edge linking new→old?

| Option | Trade |
|---|---|
| **A. Always link `wbs-supersedes`.** | Full lineage; the append-only history the pack was designed for. |
| **B. Only set `archived=true`, skip the edge.** | Simpler; loses the explicit supersession chain. |

**Tentative recommendation:** A. The `wbs-supersedes` edge is exactly this scenario's reason for existing in the pack.

### Q4 — PR shape

If Q1=A, the PR is ~3 files. Single PR or split commits within one PR?

**Tentative recommendation:** Single PR, three commits (one per file) plus the brainstorm/status commits, mirroring the prior Stories' commit hygiene.

## Out of scope

- Phase skills (S7), templates (S5), semantic gates (S6).
- The `archived` bool property cleanup (mentioned in Q2) — a future pack tweak, not S4.
- `/wbs-status` and `wbs-orientation` — already ported (S2, S3).

## Open questions — resolved (user, 2026-05-19)

1. **Q1 (scope): A — all three files in S4.** `/wbs-new`, `/wbs-reshape`, and `wbs-reshape-flow/SKILL.md` port together so the create-side surface ships coherent and `/wbs-reshape` is functional on landing.
2. **Q2 (archive signal): A — workflow `status=archived`.** The user added: deletion is git-tracked, so the choice is low-stakes — archived content (and any later hard-delete) is recoverable from history. S4 sets `status=archived`; the redundant `archived` bool property is left untouched (future cleanup, safe to delete whenever since git preserves it).
3. **Q3 (supersedes edge): A — always link `wbs-supersedes`** new→old when archiving a prior spec/plan note.
4. **Q4 (PR shape): single PR, per-file commits.**

## References

- Migration spec / plan: `wbs/superhuman-tusk-v1-migration/{spec,plan}.md`
- S3 brainstorm (translation table this builds on): `wbs/superhuman-tusk-v1-migration/orientation-skill-rewrite-brainstorm.md`
- Target files: `plugins/superhuman/commands/wbs-new.md`, `plugins/superhuman/commands/wbs-reshape.md`, `plugins/superhuman/skills/wbs-reshape-flow/SKILL.md`
- Pattern reference (ported orchestrator): `plugins/superhuman/skills/wbs-orientation/SKILL.md`
