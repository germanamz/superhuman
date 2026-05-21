---
type: wbs-node
title: Knowledge pack + /bootstrap + availability check
order: 0
level: story
status: plan-ready
---

# Knowledge pack + /bootstrap + availability check

## Outcome

The foundation the other stories build on: a generic `knowledge` Tusk pack declaring an unprefixed canonical `note` type (with a `kind` enum) plus `references` and `supersedes` edges, a `/bootstrap` command that installs it alongside the built-in `tags` pack, and the shared availability-check routine `capture`/`recall` gate on. Also scaffolds the `elephant` plugin and registers it in the marketplace.

## Success Criteria

- `packs/knowledge.toml` declares `note` (`kind` enum: learning|decision|open-thread|checkpoint, `archived` bool), `references`, `supersedes`; `tusk doctor` stays clean alongside `tags` (and the WBS pack).
- `/bootstrap` installs `tags` + the knowledge pack idempotently (`--force`-safe; runs `tusk init` if needed).
- The availability check reports present/absent and drives offer-once-then-dormant.
- The `elephant` plugin loads and is registered in the marketplace (via the two-scope PR onboarding).

## Assumptions Made

- Tusk v1.4.0+ (configurable `wikilinks = true` materialization); MCP-preferred / CLI-fallback access.
- Cross-plugin convention: declare canonical unprefixed types, use built-in packs as a seed, rely on `--force` for identical-type coexistence.
- The built-in `tags` pack provides `tag` nodes + a `tagged` edge (per the WBS composition matrix).

## Open Questions

- Home of the shared availability-check procedure (own `references/` doc vs. inlined in `conventions`) — resolved at plan time.
- Whether `/bootstrap` also offers `[embeddings]` config — leaning no; recall story revisits.

## Tradeoffs Considered

- One `note` type + `kind` enum vs. separate types per kind: chose one type (recall's "all knowledge on topic X" is the load-bearing query; consistent with the single-type-many-kinds precedent).
- Topics as `tags` (built-in pack) vs. custom anchor nodes: chose tags (reuse existing infra).
- v1 lifecycle-free (resolve = archive) vs. an open→resolved workflow: chose minimal v1 (YAGNI).
- Unprefixed canonical types vs. `wbs-`-style prefixes: chose unprefixed cross-plugin convention; accepts that built-in kanban/vault are seeds extended via `--force`, not avoided.

## Out of Scope

- capture / recall / conventions skill logic (later stories).
- Stripping `wbs-` prefixes from gilbreth (story #5, rescoped).
- Embeddings configuration; an open→resolved note workflow (possible v2).

## Spec note

[[wbs/gilbreth-wbs/elephant/knowledge-pack-spec]]

## Plan note

[[wbs/gilbreth-wbs/elephant/knowledge-pack-plan]]

## Phasing

No phases needed.

## Tasks

To be decomposed after planning.
