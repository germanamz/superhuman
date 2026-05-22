---
type: wbs-note
title: "Plan — gilbreth refactor: defer to elephant + unify on canonical types"
archived: false
kind: plan
wbs-about: wbs/gilbreth-wbs/elephant/gilbreth-refactor
---

# gilbreth refactor — Implementation Plan (phased)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
>
> **WBS note:** Plan for story `wbs/gilbreth-wbs/elephant/gilbreth-refactor`. Spec: [[wbs/gilbreth-wbs/elephant/gilbreth-refactor-spec]]. This is a single phased plan (light phasing); each phase is its own PR by scope.

**Goal:** Converge the marketplace on one canonical Tusk type vocabulary owned by Elephant, make gilbreth defer to `elephant:conventions`, and migrate/retire accordingly.

**Architecture:** Elephant ships the single canonical `core` pack (generic `node`/`note` with string `kind`/`level` + `parent`/`about`/`supersedes`/`blocks`/`references`); gilbreth consumes it and adds only the `wbs-workflow` behavior + retypes its artifacts. Breaking for both plugins (major bumps); two scopes → phase-1 is `elephant`, phase-2 is `gilbreth`, phase-3 is migration/retirement.

**Tech stack:** Tusk type pack (TOML), Claude Code skills/commands/templates (markdown), `tusk` CLI for verification.

---

## Phasing overview

- **Phase 1 — Elephant `core` pack** (scope `elephant`, breaking). Rename `knowledge.toml`→`core.toml`; add generic structural types; `note.kind` enum→string; update Elephant's 3 skills + README. PR: `feat(elephant)!`.
- **Phase 2 — gilbreth defer + retype** (scope `gilbreth`, breaking). Consume `core`; add `wbs-workflow`; defer `conventions.md` to `elephant:conventions`; retype orientation/commands/templates; update `/wbs-bootstrap`. PR: `feat(gilbreth)!`.
- **Phase 3 — migration + retirement.** Ship `/wbs-migrate` (or a documented migration) in gilbreth; after phases 1–2 merge AND the initiative's nodes are marked completed, retire this repo's WBS tree.

Do phases in order; each merges before the next starts (phase 2 consumes phase-1's published `core` pack; phase 3 retires only after both merge).

---

## PHASE 1 — Elephant `core` pack

### Task 1.1: Rebuild the pack as `core.toml`

**Files:**
- Rename/Create: `plugins/elephant/packs/knowledge.toml` → `plugins/elephant/packs/core.toml`

- [ ] **Step 1: `git mv` the pack and rewrite it**

`git mv plugins/elephant/packs/knowledge.toml plugins/elephant/packs/core.toml`, then make `core.toml`:

```toml
# Elephant — core type pack
#
# The marketplace's single canonical Tusk graph vocabulary. Generic: no
# WBS or domain semantics. `kind`/`level` are free strings so consumers
# (elephant's knowledge skills, gilbreth's WBS workflow, future plugins)
# specialize via string values without coupling enums. Tusk v1.4.0+.
#
# Compose with the built-in `tags` pack for topics. Other built-in packs
# (kanban/vault) are seeds you extend via `tusk pack add --force`.

[node-types.node]
description = "A graph node — specialized by `kind`/`level` string values"
properties = [
    { name = "kind",     type = "string" },
    { name = "level",    type = "string" },
    { name = "phase",    type = "string" },
    { name = "archived", type = "bool" },
    { name = "order",    type = "int" },
]

[node-types.note]
description = "A note attached to nodes / the graph — specialized by `kind` string"
properties = [
    { name = "kind",     type = "string" },
    { name = "phase",    type = "string" },
    { name = "archived", type = "bool" },
]

[edge-types.parent]
description = "Hierarchy: this node is a child of another node"
from = ["node"]
to   = ["node"]
cardinality = "many-to-one"
ordered = true
acyclic = true
inverse = "children"
hierarchy = "parent"

[edge-types.about]
description = "This note is about a node"
from = ["note"]
to   = ["node"]
cardinality = "many-to-one"
ordered = false
acyclic = true
inverse = "notes"

[edge-types.supersedes]
description = "This note replaces a prior note (append-only history)"
from = ["note"]
to   = ["note"]
cardinality = "many-to-one"
ordered = false
acyclic = true
inverse = "superseded-by"

[edge-types.blocks]
description = "This node blocks another node"
from = ["node"]
to   = ["node"]
cardinality = "many-to-many"
ordered = false
acyclic = true
inverse = "blocked-by"

[edge-types.references]
description = "Implicit edge materialized from body [[wikilinks]] (wikilinks = true marks the materialization target, Tusk v1.4.0)."
from = ["*"]
to   = ["*"]
cardinality = "many-to-many"
ordered = false
acyclic = false
inverse = "referenced-by"
wikilinks = true
```

Note: `parent` requires a sortable `order` property on its `from` node type (Tusk v1.3.0+ `ordered=true` rule) — `node` has `order`. No workflow behavior here (gilbreth adds `wbs-workflow` in phase 2).

- [ ] **Step 2: Verify the pack loads + types behave** (scratch workspace)

```bash
TMP=$(mktemp -d) && cd "$TMP" && git init -q && tusk init --name core-test
tusk pack add tags
tusk pack add "file://$OLDPWD/plugins/elephant/packs/core.toml"
tusk doctor
# note.kind accepts arbitrary strings; node + parent + wikilink work:
printf '# n1\n' | tusk node create --type node --path n/n1.md --prop level=project --prop order=0
printf '# k\nSee [[n/n1]].\n' | tusk node create --type note --path k/k1.md --prop kind=learning
tusk node create --type note --path k/k2.md --prop kind=spec   # arbitrary kind string OK
tusk edge add --type about --source k/k1 --target n/n1
tusk edge list --from k/k1   # expect: references→n/n1 (wikilink) and about→n/n1
cd - && rm -rf "$TMP"
```
Expected: `doctor: no issues`; both `kind` values accepted; `references` + `about` edges present. If anything fails, STOP and report.

- [ ] **Step 3: Commit** — `git add -A plugins/elephant/packs && git commit -m "feat(elephant)!: replace knowledge pack with canonical core pack"`

### Task 1.2: Update Elephant skills + bootstrap + README for `core`

**Files:** `plugins/elephant/commands/bootstrap.md`, `plugins/elephant/skills/conventions/SKILL.md`, `plugins/elephant/skills/capture/SKILL.md`, `plugins/elephant/skills/recall/SKILL.md`, `plugins/elephant/references/availability-check.md`, `plugins/elephant/README.md`

- [ ] **Step 1: Repoint pack path + probe**

`grep -rl 'knowledge.toml\|knowledge pack\|node-types.note\|type=note\|type:note' plugins/elephant` and update: `/bootstrap` adds `core.toml` (not `knowledge.toml`); the availability-check probe still uses `type=note`/`type:note` (unchanged — `note` still exists). The `kind` enum is now open — `conventions` documents the knowledge kinds (learning|decision|open-thread|checkpoint) as the **recommended** values, noting `kind` is a free string at the pack level.

- [ ] **Step 2: Verify** — `grep -r 'knowledge.toml' plugins/elephant` returns nothing; `conventions` still lists the four knowledge kinds; capture/recall unaffected (they use `note`/`tags`/`references`/`supersedes`, all still present).

- [ ] **Step 3: Commit** — `git commit -am "feat(elephant): point skills/bootstrap at the core pack"`

### Task 1.3: Open Phase-1 PR (controller)

- [ ] Push; `gh pr create --title "feat(elephant)!: canonical core type pack" --body "<summary; BREAKING: knowledge.toml→core.toml, note.kind enum→string, adds node/parent/about/blocks>"`. Ensure a `!`/`BREAKING CHANGE:` so release-please majors `elephant`. Merge before Phase 2.

---

## PHASE 2 — gilbreth defer + retype

Starts after Phase 1 merges. Read the spec + Elephant's `core.toml` first.

### Task 2.1: Replace gilbreth's pack with the workflow extension

**Files:** `plugins/gilbreth/packs/wbs.toml`

- [ ] **Step 1:** Rewrite `wbs.toml` to declare ONLY the `[behaviors.workflow.wbs-workflow]` block (unchanged states/transitions) now targeting `node` (`applies-to = ["node"]`). Remove all `node-types.*`/`edge-types.*` (they come from `core`). Add a header comment: gilbreth consumes Elephant's `core` pack; this pack adds only the WBS workflow.

- [ ] **Step 2: Verify** (scratch workspace): `tusk pack add core` then `tusk pack add wbs.toml`; `tusk doctor` clean; a `node` accepts `status` transitions per `wbs-workflow`.

- [ ] **Step 3: Commit** — `git commit -am "feat(gilbreth)!: consume elephant core pack; keep only wbs-workflow"`

### Task 2.2: Retype all gilbreth artifacts to canonical names

**Files:** everything under `plugins/gilbreth/` referencing `wbs-`-prefixed TYPES (skills, commands, templates).

- [ ] **Step 1: Find every reference** — `grep -rnE 'wbs-node|wbs-note|wbs-parent|wbs-about|wbs-supersedes|wbs-blocks|wbs-children|wbs-notes' plugins/gilbreth`. Map: `wbs-node`→`node`, `wbs-note`→`note`, `wbs-parent`→`parent`, `wbs-about`→`about`, `wbs-supersedes`→`supersedes`, `wbs-blocks`→`blocks`, inverses `wbs-children`→`children`, `wbs-notes`→`notes`. Apply across `wbs-orientation/SKILL.md`, the phase skills, all `commands/wbs-*.md`, and `templates/wbs/*`. **Do NOT** rename the pack name `gilbreth-wbs`, the `wbs-workflow` behavior, the `/wbs-*` command names, `level`/`kind` string values, or doc prose about "WBS" — only the Tusk TYPE/EDGE identifiers.

- [ ] **Step 2: Verify** — the grep above returns nothing (no prefixed type identifiers remain); spot-check that `tusk_query 'type:node ...'` examples read correctly.

- [ ] **Step 3: Commit** — `git commit -am "feat(gilbreth)!: retype WBS artifacts to canonical unprefixed types"`

### Task 2.3: Defer conventions + update bootstrap

**Files:** `plugins/gilbreth/templates/wbs/conventions.md`, `plugins/gilbreth/commands/wbs-bootstrap.md`, `plugins/gilbreth/skills/wbs-orientation/SKILL.md`

- [ ] **Step 1:** In `conventions.md`, replace the generic Tusk-discipline sections (windowed access, node/append/supersede, naming, wikilinks, archive) with a pointer to `elephant:conventions`, keeping only WBS-specific rules (levels, Karpathy gate, phasing, reshape, completion/retirement). In `wbs-orientation`, add a line that it relies on `elephant:conventions` for generic graph hygiene. Update `/wbs-bootstrap` to `tusk pack add` Elephant's `core` pack (+ `tags`) then add the `wbs-workflow` (gilbreth's `wbs.toml`).

- [ ] **Step 2: Verify** — `conventions.md` references `elephant:conventions`; no duplicated generic rules; `/wbs-bootstrap` installs `core` + workflow; `tusk doctor` clean in a fresh scratch bootstrap.

- [ ] **Step 3: Commit** — `git commit -am "feat(gilbreth): defer generic conventions to elephant; bootstrap core pack"`

### Task 2.4: Open Phase-2 PR (controller)

- [ ] Push; `gh pr create --title "feat(gilbreth)!: consume elephant core pack and defer conventions" --body "<summary; BREAKING: type rename + pack change>"`. Ensure `!` for a `gilbreth` major bump. Merge before Phase 3.

---

## PHASE 3 — migration + retirement

### Task 3.1: Ship the migration helper/doc

**Files:** `plugins/gilbreth/commands/wbs-migrate.md` (new) + a section in `conventions.md` or README

- [ ] **Step 1:** Add a `/wbs-migrate` command documenting + performing the one-time migration for an existing workspace: rewrite node frontmatter `type: wbs-node`→`node` and `type: wbs-note`→`note`; rename edge keys `wbs-parent`→`parent`, `wbs-about`→`about`, `wbs-supersedes`→`supersedes`, `wbs-blocks`→`blocks` (and inverses) across `wbs/**/*.md`; replace the pack section in `tusk.toml` (drop old `wbs-*` type decls; `tusk pack add core --force` + add `wbs-workflow`); `tusk reindex`. Idempotent; instruct committing the result. Surface that markdown is git-tracked so it's recoverable.

- [ ] **Step 2: Verify** (scratch workspace seeded with a couple of old `wbs-node`/`wbs-parent` files + the old pack): run the procedure; `tusk doctor` clean; `tusk query 'type:node'` returns the migrated nodes; edges intact.

- [ ] **Step 3: Commit + PR** — `feat(gilbreth): add /wbs-migrate for the canonical-type migration`.

### Task 3.2: Retire this repo's WBS tree (after the initiative is complete)

**Files:** `wbs/gilbreth-wbs/**`, roadmap doc

- [ ] **Step 1: Pre-req** — only after Phases 1–2 are merged AND every Elephant initiative node (incl. this story) is marked `completed`. Per `conventions.md` "Retiring a completed project": confirm terminal states, then `git rm -r wbs/gilbreth-wbs/` and `wbs/gilbreth-wbs.md`.
- [ ] **Step 2:** Update `docs/superpowers/gilbreth-wbs-roadmap.md`: move Elephant (#4) to **Done**, link spec/plan record (note: tracking tree retired; recoverable from git history).
- [ ] **Step 3: Commit + PR** — `chore(gilbreth): retire completed Elephant WBS tracking tree` (or `docs` scope for the roadmap). This is the commit that follows the initiative's completion.

---

## Self-review notes / risks

- Sequence strictly: phase 2 needs phase-1's `core` pack published; phase 3 retires only after 1–2 merge.
- This workspace runs on `wbs-*` types NOW; do not change *this repo's* `tusk.toml`/nodes until phase 3 (retirement) — phases 1–2 change shipped plugin artifacts, not this repo's live tracking graph. (If a phase-2 verification needs the new types in THIS workspace, use a scratch workspace, never the live one.)
- Each phase keeps `tusk doctor` clean and is independently reviewable.

## Out of scope

- New capabilities; Researcher (#6); roadmap Engineering-conventions (#5).
- Changing WBS semantics — only type names + generic-discipline delegation change.
