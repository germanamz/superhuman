---
type: wbs-note
title: "Spec — gilbreth refactor: defer to elephant + unify on canonical types"
kind: spec
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/gilbreth-refactor
---

# Spec — gilbreth refactor: defer to elephant + unify on canonical types

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant/gilbreth-refactor` by a `wbs-about` edge)

## Goal

Converge the marketplace on a single canonical Tusk type vocabulary owned by Elephant, and make gilbreth defer to `elephant:conventions` for generic graph discipline. This removes the duplication created by extracting Elephant and replaces the `wbs-`-prefixed types with unprefixed canonical types shared across plugins.

## Architecture

### One canonical pack, owned by Elephant

Elephant's `knowledge.toml` becomes the marketplace's single canonical graph-vocabulary pack, renamed `core.toml`. All types are generic (no WBS semantics); `kind`/`level` are free **strings** (not enums) so the vocabulary stays generic and the plugins stay decoupled — each plugin documents its own `kind`/`level` values.

- `node` — props: `kind` (string), `level` (string), `phase` (string), `archived` (bool), `order` (int)
- `note` — props: `kind` (string), `phase` (string), `archived` (bool)
- `parent` — node→node, ordered, acyclic, hierarchy (the structural hierarchy edge)
- `about` — note→node
- `supersedes` — note→note (append-only history; unifies gilbreth's `wbs-supersedes` and Elephant's `supersedes`)
- `blocks` — node→node
- `references` — `*`→`*`, `wikilinks = true`
- composes with the built-in `tags` pack (`tag` nodes + `tagged` edge)

Elephant's own skills (`conventions`/`capture`/`recall`) use only `note`/`references`/`supersedes`/`tags`; the generic `node`/`parent`/`about`/`blocks` live in the canonical pack for gilbreth and other consumers (Elephant owns the canonical vocabulary even for types it doesn't itself use).

### gilbreth extends what's in place

gilbreth stops declaring its own node/note/edge types. It consumes Elephant's `core` pack and adds only the genuinely WBS-specific part: the **`wbs-workflow` behavior** (the status state machine on `node`). Concretely:

- `conventions.md` defers to `elephant:conventions` for generic Tusk discipline; keeps only WBS-specific rules (levels, Karpathy gate, phasing, reshape).
- `wbs-orientation`, all `/wbs-*` commands, and the `templates/wbs/*` switch to the unprefixed canonical types (`node`/`note`/`parent`/`about`/`supersedes`/`blocks`).
- `level` and note `kind` are populated as string values (project|milestone|… and spec|plan|…) on the canonical types; validated by gilbreth convention, not a pack enum.

### Bootstrap

- Elephant's `/bootstrap` installs `core` + `tags`.
- gilbreth's `/wbs-bootstrap` installs Elephant's `core` pack (+ `tags`) and adds the `wbs-workflow` behavior to the manifest.

## Migration

- **This repo's WBS tree:** do NOT hand-rewrite the live `wbs-*` nodes. This is the last Elephant story — once it completes, the initiative is done, so **retire the WBS tracking tree** (per the `conventions.md` "Retiring a completed project" procedure: `git rm` the `wbs/gilbreth-wbs/` subtree + node after marking everything completed). Sidesteps migrating historical nodes.
- **Other workspaces + gilbreth's own artifacts:** ship a documented migration (or a small `/wbs-migrate` helper) that rewrites prefixed frontmatter (`type: wbs-node`→`node`, edge keys `wbs-parent`→`parent`, etc.) and updates the pack section in `tusk.toml`, then reindexes. Markdown is git-tracked, so the migration is recoverable.

## Phasing

Phased (light, at story level). Proposed phases — confirmed/refined at planning:

1. **Elephant core pack.** Rename `knowledge.toml`→`core.toml`; add the generic `node`/`parent`/`about`/`blocks` types; change `note.kind` enum→string; declare `supersedes`/`references` canonically. Update Elephant's three skills for the (mostly unchanged) generic vocabulary. Scope `elephant` (breaking → major bump).
2. **gilbreth defer + retype.** Remove gilbreth's type declarations; add the `wbs-workflow` behavior on `node`; point `conventions.md` at `elephant:conventions`; retype `wbs-orientation`/commands/templates to canonical names; update `/wbs-bootstrap`. Scope `gilbreth` (breaking → major bump).
3. **Migration + retirement.** Ship the migration doc/helper; retire this repo's WBS tree after the initiative is marked complete.

## Error handling / risk

- **Breaking for both plugins** (Elephant `note.kind` enum→string + pack rename; gilbreth's entire type vocabulary) → major version bumps for `elephant` and `gilbreth`.
- **Two component scopes** (`elephant`, `gilbreth`) + `marketplace` if catalog metadata changes → separate PRs per the repo's one-scope-per-squash-commit rule.
- **Live-graph risk:** the workspace we're working in uses `wbs-*` types. Sequence so gilbreth's pack/type changes don't break the in-flight tree before retirement; do phase 3 (retire) only after phases 1–2 are merged and the initiative's nodes are marked completed.
- `tusk doctor` must stay clean after each phase; `--force` reconciles identical re-adds.

## Verification

- Elephant `core` pack loads; `tusk doctor` clean; `note.kind` accepts arbitrary strings; `node`/`parent`/`about`/`blocks` declared.
- gilbreth: `wbs-orientation` + gates still drive WBS flows with the canonical types (no behavioral regression); `conventions.md` references `elephant:conventions`; no `wbs-`-prefixed type names remain in gilbreth artifacts.
- Migration doc/helper rewrites a sample prefixed node + tusk.toml correctly and reindexes clean.
- This repo's WBS tree retired (subtree removed) only after the initiative is marked complete.
- Both plugins still load; release-please opens major-bump release PRs for `elephant` and `gilbreth`.

## Out of scope

- New Elephant capabilities; Researcher (#6); Engineering conventions (#5 of the roadmap).
- Changing WBS semantics (levels, Karpathy gate, phasing, reshape stay — only their type names + the generic-discipline delegation change).

## Open questions

- `/wbs-migrate` helper vs. a documented manual migration — decided at planning (leaning: documented steps + a thin command, since other workspaces need it).
- Whether gilbreth declares a formal plugin dependency on elephant or just relies on the `core` pack being installed — decided at planning.
