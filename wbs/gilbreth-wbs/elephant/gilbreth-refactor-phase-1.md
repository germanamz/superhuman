---
type: wbs-note
title: Phase 1 handoff — Elephant core pack
phase: phase-1
archived: false
kind: phase-plan
wbs-about: wbs/gilbreth-wbs/elephant/gilbreth-refactor
---

# Phase 1 handoff — Elephant `core` pack

**wbs-note** `kind=phase-plan, phase=phase-1` on `wbs/gilbreth-wbs/elephant/gilbreth-refactor`. Cold-start handoff for a fresh session implementing Phase 1 only.

## Read first (pull via Tusk)
- Plan (authoritative task detail): [[wbs/gilbreth-wbs/elephant/gilbreth-refactor-plan]] — **only the `PHASE 1` section**.
- Spec (rationale): [[wbs/gilbreth-wbs/elephant/gilbreth-refactor-spec]].
- The MCP server holds the workspace write lock — prefer `tusk_*` MCP tools for graph reads.

## Objective (Phase 1 only)
Turn Elephant's `knowledge.toml` into the marketplace's single canonical `core.toml` pack and repoint Elephant's own artifacts at it. Scope is **`elephant` only** — do NOT touch gilbreth (that's Phase 2) and do NOT migrate/retire anything (Phase 3).

## Branch
`feat/elephant-core-pack` (off latest `main`). The planning notes (spec/plan/this handoff) are committed on it.

## Tasks (see plan PHASE 1 for exact content)
1. **Task 1.1** — `git mv plugins/elephant/packs/knowledge.toml plugins/elephant/packs/core.toml` and rewrite it as the generic canonical pack: `node` (+ `kind`/`level`/`phase` string, `archived` bool, `order` int), `note` (`kind` string, `phase`, `archived`), edges `parent`/`about`/`supersedes`/`blocks`/`references` (`wikilinks=true`). The exact TOML is in the plan. Verify in a **scratch** workspace (`tusk doctor` clean; `note.kind` accepts arbitrary strings; `parent`+wikilink+`about` materialize).
2. **Task 1.2** — repoint `plugins/elephant/{commands/bootstrap.md, skills/conventions, skills/capture, skills/recall, references/availability-check.md, README.md}` from `knowledge.toml`→`core.toml`. The `note.kind` enum is now an open string — `conventions` documents learning|decision|open-thread|checkpoint as the *recommended* values. `capture`/`recall` are otherwise unaffected (they use `note`/`tags`/`references`/`supersedes`, all still present).
3. **Task 1.3** — open the PR.

## Guardrails
- **Never mutate THIS repo's `tusk.toml` or live `wbs-*` nodes.** All pack verification happens in throwaway `mktemp -d` workspaces. This workspace stays on the old `gilbreth-wbs` pack until Phase 3.
- This is **breaking**: the PR title must be `feat(elephant)!: …` (or include a `BREAKING CHANGE:` footer) so release-please majors `elephant` (1.0.0 → 2.0.0).
- Keep `tusk doctor` clean. Tusk v1.4.0+ (already installed) for `wikilinks = true`.

## Execution
Subagent-driven (superpowers:subagent-driven-development): dispatch one implementer for Tasks 1.1–1.2 (point it at this note + the plan via Tusk IDs), then a combined spec+quality review, then the controller opens the PR (Task 1.3).

## Definition of done
`core.toml` loads clean; Elephant skills/bootstrap reference `core`; no `knowledge.toml` references remain; `feat(elephant)!` PR opened and green. Then STOP — Phase 2 (gilbreth) is a separate session, started only after this PR merges.
