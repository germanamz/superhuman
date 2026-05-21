---
type: wbs-note
title: Spec — knowledge pack + /bootstrap + availability check
archived: false
kind: spec
---

# Spec — knowledge pack + /bootstrap + availability check

**wbs-note frontmatter:** `kind=spec` (linked to `wbs/gilbreth-wbs/elephant/knowledge-pack` by a `wbs-about` edge)

## Goal

Deliver the foundation the rest of the Elephant initiative builds on: a generic, WBS-agnostic `knowledge` Tusk pack, a `/bootstrap` command that installs it (composing with the built-in `tags` pack), and a shared availability-check routine that `capture` and `recall` gate on. This story also scaffolds the `elephant` plugin itself and registers it in the marketplace.

## Architecture

A Tusk type pack + a slash command + a small reusable availability-check procedure, shipped inside a new `elephant` plugin directory.

### Type model — unprefixed, canonical

Following the cross-plugin convention decision (drop the `wbs-`-style prefixes; declare canonical unprefixed types and use built-in packs as a seed), the `knowledge` pack declares:

**Node type `note`**
- `kind` — enum: `learning | decision | open-thread | checkpoint`
- `archived` — bool (append-only / supersede pattern, same discipline as the WBS notes)
- No lifecycle/status property in v1. Resolving an open-thread = archive it (and optionally a superseding note). An `open → resolved` workflow is a possible v2.

**Edge `references`**
- Declared with `wikilinks = true` (Tusk v1.4.0): this edge is the materialization target for body `[[wikilinks]]`. In v1.3.0 the materializer hard-coded the edge name `references`; v1.4.0 makes the target configurable via the flag (changelog: "configurable wikilink-materialization edge via wikilinks flag", issue #410). We keep the name `references` by convention, not constraint.
- `from`/`to` = `["*"]`, identical to the canonical declaration the WBS/vault packs use, so it is `--force`-safe when multiple packs are present (re-adding strips the duplicate and re-appends).
- Only one edge type carries `wikilinks = true` per workspace; all packs that declare it must agree (they declare the identical edge).

**Edge `supersedes`**
- `note` → `note`. "This note replaces that one." Append-only knowledge history (the windowed-memory analogue of `wbs-supersedes`, now unprefixed under the unified convention). Set deliberately, not via wikilinks.

### Composition

- Layers with the built-in **`tags`** pack (`tag` nodes + `tagged` edge) — topics are tags, not custom anchor nodes. Recall pulls "everything known about topic X" via `tagged`.
- `--force` is the intended mechanism for identical-type coexistence: because canonical declarations match across packs, `tusk pack add … --force` removes colliding sections and re-appends cleanly. The built-in packs (kanban/vault) are usable as a *starting point* you then extend, not competitors to avoid.

## Components

### `packs/knowledge.toml`
Declares `note`, `references` (`wikilinks = true`), `supersedes`. No workflow behavior (notes are append-only + archived, not state machines).

### `commands/bootstrap.md`
One-time, idempotent init for a workspace:
1. `tusk init` if no `tusk.toml` exists.
2. `tusk pack add tags` (idempotent).
3. Add the `knowledge` pack (`--force`-safe).
4. Confirm via `tusk doctor` / a `note`-type probe.
Invoked by the offer-to-bootstrap-once path, or directly by the user.

### Availability check (shared procedure)
A small routine (documented once, referenced by `capture` and `recall`): probe whether the `note` type is declared (e.g. a `tusk_node_list`/`tusk_query type=note` that errors on undeclared type, mirroring wbs-orientation's pack-presence probe). Returns present / absent. Absent → offer `/bootstrap` once per session, then dormant; present → silent. Where this procedure physically lives (a shared `references/` doc in the plugin, or inlined in `conventions`) is a plan-time detail.

### Plugin scaffold
`plugins/elephant/.claude-plugin/plugin.json`, `plugins/elephant/package.json` (`version 0.0.0`), and the release-please onboarding from CONTRIBUTING (config entry, manifest seed, commitlint + lint-pr-title scope additions). Marketplace registration is a **separate PR** (`feat(marketplace)`), per the two-scope rule.

## Data flow

1. `/bootstrap` (or the offer path) → installs `tags` + `knowledge` → workspace now has the `note` type.
2. `capture` (later story) writes `note`s with a `kind`, `[[wikilinks]]` (→ `references`), and `tagged` topic links.
3. `recall` (later story) queries `type=note` + `tagged`/semantic to surface a narrow slice.

## Error handling

- No `tusk.toml`: `/bootstrap` runs `tusk init` first; the offer-once path surfaces the bootstrap offer rather than erroring.
- Pack already present: idempotent / `--force`-safe; re-running is a no-op or clean re-append.
- MCP write-lock contention: prefer MCP tools over the CLI (the MCP server holds the lock).
- Declined bootstrap: dormant for the session (no nagging), per the initiative spec.

## Verification

- `tusk pack add` of the `knowledge` pack + `tags` leaves `tusk doctor` clean.
- A `note` can be created with each `kind`; a body `[[wikilink]]` materializes a `references` edge (confirming `wikilinks = true` works on v1.4.0); a `supersedes` edge links two notes.
- `/bootstrap` is idempotent (second run is a no-op / clean).
- The availability check correctly reports present vs. absent.
- Plugin loads; `elephant` appears in the marketplace catalog after the registration PR; release-please opens the expected version PRs.

## Out of scope

- `capture`, `recall`, and `conventions` skill logic (later stories).
- Stripping the `wbs-` prefixes from gilbreth (story #5 — rescoped to include it; note the `references` "can't be prefixed" caveat dissolves under v1.4.0).
- Embeddings configuration (recall story handles degraded mode).
- An `open → resolved` note workflow (possible v2).

## Assumptions

- Tusk **v1.4.0+** (required for the configurable `wikilinks = true` materialization flag). Confirmed installed on the dev machine.
- The built-in `tags` pack provides `tag` nodes + a `tagged` edge.
- MCP-preferred / CLI-fallback access.

## Open questions

- Exact home of the shared availability-check procedure (own `references/` doc vs. inlined in `conventions`) — resolved at plan time.
- Whether `/bootstrap` should also offer to configure `[embeddings]` — leaning no for this story (keep it about the pack); recall story revisits.
