---
type: wbs-node
title: "gilbreth refactor: defer to elephant + drop type prefixes"
order: 4
level: story
status: drafted
---

# gilbreth refactor: defer to elephant + drop type prefixes

## Outcome

gilbreth is brought in line with Elephant on two fronts: (1) its generic Tusk discipline defers to `elephant:conventions` (keeping only WBS-specific rules — levels, Karpathy gate, phasing, reshape); and (2) it adopts the cross-plugin unprefixed canonical type convention, stripping the `wbs-` prefixes (`wbs-node`→`node`, `wbs-note`→`note`, `wbs-parent`→`parent`, `wbs-about`→`about`, `wbs-supersedes`→`supersedes`, `wbs-blocks`→`blocks`). Built-in packs (kanban/vault) become seeds extended via `--force` rather than packs to avoid.

## Success Criteria

- gilbreth's `conventions.md` / `wbs-orientation` reference `elephant:conventions` for generic Tusk discipline; no behavioral regression in WBS flows or gates.
- The WBS pack and all skill/command/template references use unprefixed canonical types; `tusk doctor` clean.
- A migration path exists for existing `wbs-`-prefixed node frontmatter (rename or reindex).
- Documentation records that gilbreth intentionally owns the canonical `node`/`note`/`parent`/`blocks`/`references` types and that kanban/vault are seeds, not collisions.

## Assumptions Made

- Elephant stories 1–4 (pack, conventions, capture, recall) ship first.
- Claude Code resolves `elephant:conventions` cross-plugin references at runtime.
- `--force` cleanly handles identical-type re-adds.

## Open Questions

- Migration mechanism for existing prefixed frontmatter (in-place rename + reindex vs. regenerate) — resolved at this story's brainstorm.
- Whether gilbreth declares a formal dependency on elephant or references it by name.

## Tradeoffs Considered

- Resolved at this story's brainstorm. Note the accepted trade: unprefixed names mean WBS + kanban/vault coexist only via the canonical-type + `--force` convention, not via prefix isolation.

## Out of Scope

- Building Elephant's skills/pack (stories 1–4).

## Spec note

Populated by this story's wrapped brainstorming.

## Plan note

Populated by this story's wrapped writing-plans.

## Phasing

Likely phased (defer-to-elephant vs. prefix migration are separable chunks) — confirmed at planning.

## Tasks

To be decomposed after this story is brainstormed and planned.
