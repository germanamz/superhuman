# Rename the `superhuman` plugin → `gilbreth`

**Date:** 2026-05-20
**Status:** Approved (design)

## Summary

The `superhuman` plugin is, in its entirety, the WBS (work-breakdown-structure)
workflow: every command, skill, template, and pack under `plugins/superhuman/`
exists to drive recursive decomposition, planning, and phase review on
Tusk-backed projects. Naming that plugin after the marketplace (`superhuman`) is
generic and uninformative.

This spec renames the plugin to **`gilbreth`** — after Frank & Lillian Gilbreth,
the pioneers of breaking work into elemental units (therbligs). The name maps
directly onto what the plugin does: decomposition. The rename preserves the
plugin's content and version (0.3.0) and lands as a single marketplace-scoped
PR.

## What the WBS plugin actually is (analysis)

1. **A fixed taxonomy tree.** Every unit of work is a `wbs-node` with a `level`
   (Project → Milestone → Initiative → Story → Task, plus Spike). Hierarchy is
   the `wbs-parent` edge, which is *ordered* — sibling order under a parent is
   the priority signal.
2. **Recursive top-down decomposition.** A fuzzy idea at the top is broken down
   one level at a time until it reaches atomic, agent-executable Tasks. A parent
   can't be decomposed until its outcome is well-formed (the Karpathy gate).
3. **A per-node lifecycle state machine.** `drafted → brainstorming →
   spec-ready → planning → plan-ready → ready-to-decompose → in-progress →
   completed` (or `archived`); any state can return to `brainstorming`.
4. **Append-only thinking attached to nodes.** `wbs-note`s (spec / plan /
   brainstorm / phase-plan / reshape-audit) hang off nodes via `wbs-about`;
   `wbs-supersedes` preserves history.
5. **Phased execution + reshape.** Stories split into phases with continuity and
   post-implementation review; reshape re-brainstorms a node and
   archives/reparents/keeps its descendants.

The essence is a **gated recursive descent from a fuzzy idea to atomic work,
backed by a Tusk graph** — hence a decomposition-pioneer name rather than a
charting (`gantt`) or dependency (`pert`) name.

## Scope

### Renamed: `superhuman` → `gilbreth` (plugin identity)

- Directory: `plugins/superhuman/` → `plugins/gilbreth/` (git move; preserves
  the plugin `CHANGELOG.md` history).
- `plugins/gilbreth/.claude-plugin/plugin.json` — `name`.
- `plugins/gilbreth/package.json` — `name`.
- `plugins/gilbreth/README.md` — title and self-references.
- `.claude-plugin/marketplace.json` — the `plugins[]` entry's `name`, `source`
  (`./plugins/gilbreth`), and `description`. **The top-level marketplace `name`
  stays `superhuman`.**
- `release-please-config.json` — the `packages` key (`plugins/superhuman` →
  `plugins/gilbreth`), `component`, `package-name`,
  `pull-request-title-pattern` (`chore(gilbreth): release ${version}`), and the
  marketplace `extra-files` jsonpath filter (`@.name=="gilbreth"`).
- `.release-please-manifest.json` — rename the key and seed it `0.3.0`.
- `commitlint.config.mjs` — `scope-enum`: replace `superhuman` with `gilbreth`.
- `.github/workflows/lint-pr-title.yml` — `scopes`: replace `superhuman` with
  `gilbreth`.
- The pack label `superhuman-wbs` → `gilbreth-wbs` and prose "Superhuman WBS" →
  "Gilbreth WBS" across `packs/wbs.toml` comments, skills, commands, and
  conventions docs. **This is a documentation/hint label only — nothing in Tusk
  keys on the string; the pack-presence probe checks `tusk_node_list
  type=wbs-node`.**
- All `plugins/superhuman/...` path references inside skills, commands, and the
  `docs/superpowers/` guides → `plugins/gilbreth/...`.
- Root `README.md` — install command (`/plugin install gilbreth@superhuman`),
  plugin-list entry, and path.
- `CONTRIBUTING.md` — example component scopes that use `superhuman` as the
  sample plugin → `gilbreth`.
- Illustrative example node paths in docs (e.g.
  `wbs/superhuman-tusk-v1-migration/...` in `wbs-status.md`) → genericized
  neutral examples.

### Stays unchanged

- **Marketplace name** `superhuman` (it's the personal marketplace, not the
  plugin).
- `superhuman-marketplace` package name (root `package.json`, `package-lock`,
  release-please marketplace `package-name`).
- `tusk.toml` workspace name `superhuman-marketplace` and its already-installed
  pack stanzas (re-running `/wbs-bootstrap` is idempotent; no need to rewrite
  installed state).
- Repo URL `github.com/germanamz/superhuman` (`homepage`, `repository`).
- "**WBS**" terminology everywhere — it's the methodology, not the brand.

## Version & release-please mechanics

The rename preserves the plugin at **0.3.0**:

- Keep `version: 0.3.0` in `plugins/gilbreth/.claude-plugin/plugin.json`,
  `plugins/gilbreth/package.json`, and the `gilbreth` marketplace entry.
- Seed `.release-please-manifest.json` with `"plugins/gilbreth": "0.3.0"` so
  release-please treats 0.3.0 as already-released and does not reset to 0.0.0
  (this is the same hand-seeding the new-plugin onboarding flow performs).
- The `superhuman` component disappears from `release-please-config.json` and
  the manifest; it simply stops being tracked. Old tags (`superhuman-v0.3.0`)
  remain in history; new tags will be `gilbreth-v<x.y.z>`.

## PR sequencing

CONTRIBUTING's "split into two PRs" rule exists to avoid dual-*bumping* a single
squash commit across two components. A rename only needs the **marketplace**
catalog to bump — the plugin content is unchanged, so `gilbreth` must **not**
get a version bump. Therefore:

- **Single PR**, titled `feat(marketplace)!: rename superhuman plugin to
  gilbreth` (breaking — the install id changes from `superhuman@superhuman` to
  `gilbreth@superhuman`).
- `marketplace` is already a legal scope on `main`, which avoids the
  chicken-and-egg where a brand-new `gilbreth` scope would not yet be recognized
  by the commit-lint / PR-title-lint layers reading config from `main`.
- The same PR adds `gilbreth` to both lint configs so subsequent
  plugin-scoped commits are accepted.
- release-please result: `marketplace` opens a release PR (major bump for the
  breaking rename); `gilbreth` stays at the seeded 0.3.0 with no release PR
  until a future `gilbreth`-scoped commit lands.

## Verification

1. `jq .` over `.claude-plugin/marketplace.json`, `release-please-config.json`,
   `.release-please-manifest.json`, `plugins/gilbreth/.claude-plugin/plugin.json`,
   and `plugins/gilbreth/package.json`.
2. Confirm `./plugins/gilbreth` resolves to a directory containing
   `.claude-plugin/plugin.json`.
3. `grep -rn superhuman` across the repo confirms only the intended references
   remain: the marketplace name, `superhuman-marketplace`, `tusk.toml` workspace
   name + installed-pack stanzas, and the `germanamz/superhuman` repo URL.
4. Confirm no `plugins/superhuman/` path references remain.
