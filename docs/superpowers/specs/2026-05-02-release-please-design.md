# release-please for the superhuman marketplace

**Status:** Draft
**Date:** 2026-05-02

## Problem

The repo is a Claude Code plugin marketplace. Versions are currently set by hand in `plugins/<name>/.claude-plugin/plugin.json`, with no changelog, no tags, no release process, and no enforced relationship between any version field and the marketplace catalog. As more plugins are added, manual bookkeeping will drift and consumers will not get reliable update signals.

We want automated, per-plugin releases driven by conventional commits, with all version-bearing files updated atomically and a documented contributor flow.

## Goals

1. Each plugin in `plugins/<name>/` releases independently on its own version line.
2. The marketplace catalog itself releases on its own version line, bumped only by catalog-level changes (adding/removing a plugin, marketplace metadata changes).
3. release-please opens one release PR per affected component (plugin or marketplace) when conventional-commit-tagged work has merged to `main`.
4. Merging a release PR tags the release, publishes a GitHub Release, and writes a per-component CHANGELOG.
5. The version that Claude Code resolves (i.e. `plugin.json#version`) is always in sync with what release-please published.
6. Adding a new plugin to release-please is a documented, mechanical checklist.

## Non-goals

- Publishing plugins to npm or any external registry. Plugins are consumed via the marketplace, not as npm packages.
- Bumping the marketplace version on every plugin release. Marketplace bumps are reserved for catalog-level changes; per-plugin releases do not move the marketplace version line.
- Backfilling changelogs from pre-adoption history. The first release after adoption starts a new changelog from `bootstrap-sha`.
- Migrating in-flight branches (e.g. `wbs-reshape-impl`) to conventional commits. Conventional-commit format is required only for new commits to `main` after this lands.

## Background: how Claude Code resolves plugin versions

Per the official Claude Code plugin documentation, the version a user sees for an inline plugin (`source: "./plugins/<name>"`) is resolved in this order:

1. `version` field in `plugins/<name>/.claude-plugin/plugin.json`
2. `version` field on the matching entry in `.claude-plugin/marketplace.json#plugins[]`
3. The git commit SHA of the plugin source
4. `unknown`

`package.json` is not part of this resolution. Claude Code never reads it. It exists in this design purely as a release-please artifact.

The cache key for "is there an update available" is whichever string from steps 1–3 is found first. Setting an explicit semver in `plugin.json` means users only see updates when that string changes. This is the behavior we want.

## Architecture

release-please runs in **manifest mode** with the **`node`** release-type, declaring two kinds of components:

- **Plugin components** — one per plugin under `plugins/<name>/`. Released by commits scoped to that plugin.
- **Marketplace component** — at the repo root (`.`). Released by commits scoped to `marketplace`.

### Files release-please owns

- `release-please-config.json` — components, release types, extra-files declarations.
- `.release-please-manifest.json` — last-released version per component.

### Files release-please writes on each release PR

For each released **plugin** component:

- `plugins/<name>/package.json#version` — release-please's primary version anchor for the `node` release-type.
- `plugins/<name>/.claude-plugin/plugin.json#version` — via `extra-files` json updater, jsonpath `$.version`. **The field Claude Code actually reads.**
- `.claude-plugin/marketplace.json#plugins[?(@.name=="<plugin>")].version` — via `extra-files` json updater with a filter predicate. Redundant with `plugin.json` for resolution purposes, but keeps the marketplace catalog human-readable as a single-file index of currently-published versions.
- `plugins/<name>/CHANGELOG.md` — per-plugin changelog.
- `.release-please-manifest.json` — bumped entry for the released plugin.

For the **marketplace** component:

- `package.json#version` (at repo root) — release-please's version anchor for the marketplace component.
- `.claude-plugin/marketplace.json#version` (top-level) — via `extra-files` json updater, jsonpath `$.version`. The marketplace catalog version.
- `CHANGELOG.md` (at repo root) — catalog-level changelog.
- `.release-please-manifest.json` — bumped marketplace entry.

### Files release-please does not touch

- Any file under `plugins/<name>/` other than the four listed above.
- `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `docs/**`.

### release-please-config.json shape

Two `packages` entries: one for the marketplace at `.`, one per plugin under `plugins/<name>`. Illustrated with the marketplace and the existing `superhuman` plugin:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "include-component-in-tag": true,
  "separate-pull-requests": true,
  "packages": {
    ".": {
      "component": "marketplace",
      "package-name": "superhuman-marketplace",
      "changelog-path": "CHANGELOG.md",
      "extra-files": [
        {
          "type": "json",
          "path": ".claude-plugin/marketplace.json",
          "jsonpath": "$.version"
        }
      ]
    },
    "plugins/superhuman": {
      "component": "superhuman",
      "package-name": "superhuman",
      "changelog-path": "CHANGELOG.md",
      "extra-files": [
        {
          "type": "json",
          "path": "plugins/superhuman/.claude-plugin/plugin.json",
          "jsonpath": "$.version"
        },
        {
          "type": "json",
          "path": ".claude-plugin/marketplace.json",
          "jsonpath": "$.plugins[?(@.name==\"superhuman\")].version"
        }
      ]
    }
  }
}
```

Notes:
- `include-component-in-tag: true` produces tags like `superhuman-v0.2.0` and `marketplace-v0.2.0`, namespaced per component.
- `separate-pull-requests: true` opens one release PR per component instead of bundling them.
- `extra-files` paths are repo-root-relative.
- The implementation plan should include a verification step that confirms all `extra-files` entries are written by release-please on a probe release (and adjust to component-relative paths if the empirical behavior differs from this assumption).

### Why filter predicates work

release-please evaluates jsonpath via `jsonpath-plus` (verified in `src/updaters/generic-json.ts`), which supports the full standard jsonpath syntax including filter predicates `[?(@.field=="x")]`. The only runtime constraint on the matched value is that it must be a string matching a version regex — which our targets already are. The known issue with filter predicates in release-please (#2455) is specific to TOML pre-processing, not JSON. No custom updater script is required.

### CI workflow

A single GitHub Actions workflow at `.github/workflows/release-please.yml`:

```yaml
name: release-please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

The default `GITHUB_TOKEN` is sufficient for opening PRs and creating tags/releases. No PAT needed unless we later want CI checks to run against release-please-authored PRs (which would require a PAT to bypass the same-actor check) — out of scope for v1.

## Bootstrap

One-time setup committed in a single PR. **Initial versions:** plugins keep their existing `0.1.0`; the marketplace starts at `0.2.0` to clearly mark the cutover to release-please-managed releases.

1. Add `"version": "0.2.0"` at the top level of `.claude-plugin/marketplace.json` (the field must exist for the jsonpath to update it).
2. Add `"version": "0.1.0"` to the `superhuman` entry in `.claude-plugin/marketplace.json#plugins[]`.
3. Create `package.json` at the repo root with `{ "name": "superhuman-marketplace", "version": "0.2.0", "private": true }`.
4. Create `plugins/superhuman/package.json` with `{ "name": "superhuman", "version": "0.1.0", "private": true }`.
5. Add `release-please-config.json` declaring both the `marketplace` component (at `.`) and the `superhuman` component as in the example above.
6. Add `.release-please-manifest.json` containing `{".": "0.2.0", "plugins/superhuman": "0.1.0"}` so release-please does not try to re-release these versions.
7. Add `.github/workflows/release-please.yml`.
8. Set `bootstrap-sha` in `release-please-config.json` to the current `main` HEAD SHA at the time the bootstrap PR is opened. Pre-bootstrap commits are excluded from changelog generation. (If new commits land on `main` between opening and merging the bootstrap PR, update `bootstrap-sha` accordingly so changelog generation begins after release-please adoption rather than retroactively classifying old commits.)
9. Add `CONTRIBUTING.md` documenting the commit format, release flow, and the new-plugin checklist (see below).
10. Update `CLAUDE.md` with a one-line pointer to `CONTRIBUTING.md` and a single bullet appended to "Adding a new plugin to the catalog" referencing the release-please checklist.

After this PR merges, the next conventional commit (e.g. `feat(superhuman): ...` or `feat(marketplace): ...`) will produce a release PR for that component.

## Conventional commits

Format: `<type>(<scope>): <subject>` where `<scope>` is a component name from `release-please-config.json`. Valid scopes are `marketplace` (for catalog-level changes) and any plugin component name (e.g. `superhuman`).

| Commit | Effect on `<scope>` component |
|---|---|
| `feat(<scope>): ...` | minor bump |
| `fix(<scope>): ...` | patch bump |
| `feat(<scope>)!: ...` or `BREAKING CHANGE:` footer | major bump |
| `chore(<scope>): ...`, `docs(<scope>): ...`, `refactor(<scope>): ...`, `test(<scope>): ...`, `ci(<scope>): ...`, `build(<scope>): ...`, `perf(<scope>): ...` | no bump; appears in changelog under its section if release-please's defaults include it |
| Any commit with no scope, or a scope that does not match a registered component | no bump for any component; not attributed to a release |

A commit's scope routes it to exactly one component. release-please does not dual-route a single commit. The repo uses **squash merge**, so one PR collapses to one commit on `main` and the PR title becomes that commit's subject — meaning a single PR can also only carry a single scope. When a change affects both a plugin and the marketplace catalog (e.g. registering a new plugin), split the work across **two PRs** — one per scope.

**PR titles must follow Conventional Commits** with the same `<type>(<scope>): <subject>` format as commits, because the squashed merge commit on `main` inherits the PR title verbatim.

**When to use `marketplace` scope:**
- Adding a new plugin to the catalog (`feat(marketplace): register <new> plugin`)
- Removing a plugin (`feat(marketplace)!: remove <old> plugin`)
- Marketplace metadata changes — description, owner, schema fields (`fix(marketplace): correct owner email`)

**When NOT to use `marketplace` scope:**
- Plugin internal changes (skills, commands, hooks) — use the plugin's own scope.
- Per-plugin version bumps — handled automatically by release-please via the plugin's own component.

`Release-As: x.y.z` in a commit footer overrides automatic bumping for that component's next release. Useful for `1.0.0` promotion or hotfix versioning.

## CONTRIBUTING.md

Lives at the repo root. Contents:

1. **Commit format** — conventional commits with a mandatory `(scope)` matching a registered component name (`marketplace` for catalog-level changes, or any plugin's component name for plugin-level changes). Worked examples and the bump table from the section above.
2. **Release flow** — narrative walkthrough: push → release PR opens for the affected component → review → merge → tag and GitHub Release auto-created → CHANGELOG at `plugins/<plugin>/CHANGELOG.md` for plugins or root `CHANGELOG.md` for the marketplace.
3. **Adding a new plugin to release-please** — the load-bearing checklist:
   1. Scaffold plugin contents per CLAUDE.md ("Adding plugin content").
   2. Create `plugins/<new>/package.json` with `{ "name": "<new>", "version": "0.0.0", "private": true }`.
   3. Set `version: "0.0.0"` in `plugins/<new>/.claude-plugin/plugin.json`.
   4. Add the marketplace entry in `.claude-plugin/marketplace.json#plugins[]` including `"version": "0.0.0"`.
   5. Register a `packages` entry in `release-please-config.json` keyed at `plugins/<new>` with `component`, `package-name`, and the two `extra-files` (plugin.json + filtered marketplace.json jsonpath using the new plugin's name).
   6. Seed `.release-please-manifest.json` with `"plugins/<new>": "0.0.0"`.
   7. Open **two squash-merge PRs** in sequence (one per scope, since squash merge yields one commit per PR):
      - PR 1, title `feat(<new>): scaffold <new> plugin` — contains the plugin scaffold and config-file changes that pertain to the new plugin's own release line.
      - PR 2, title `feat(marketplace): register <new> plugin` — contains the new entry in `.claude-plugin/marketplace.json#plugins[]` so the catalog version bumps too.
   8. After both merge to `main`, release-please opens **two** release PRs: one for `<new>` (bumping `0.0.0 → 0.1.0`) and one for `marketplace` (minor bump on the catalog version line). Merge both to publish `<new>-v0.1.0` and the corresponding `marketplace-v<bumped>`.
4. **Forcing a specific version** — `Release-As: x.y.z` footer.
5. **What not to commit** — release-please owns all `version` fields plus CHANGELOGs and `.release-please-manifest.json`. Manual edits to those will be overwritten or cause merge conflicts in the active release PR.
6. **Cross-references** — link to CLAUDE.md "Adding plugin content" and "Adding a new plugin to the catalog".

## CLAUDE.md updates

- Add at the top (after the layout intro): "See `CONTRIBUTING.md` for commit conventions and the release process."
- Append to "Adding a new plugin to the catalog": "Then follow the release-please registration steps in `CONTRIBUTING.md`."

## Testing & verification

- After bootstrap PR merges, verify a `chore(superhuman): ...` commit produces no release PR.
- Push a `feat(superhuman): ...` commit (a real change, not a probe) and verify release-please opens a PR that updates `plugins/superhuman/package.json`, `plugins/superhuman/.claude-plugin/plugin.json`, the per-plugin marketplace entry, `plugins/superhuman/CHANGELOG.md`, and the manifest, all with version `0.2.0`. Confirm the marketplace top-level version is **not** changed.
- Merge that PR and verify the tag `superhuman-v0.2.0` and the GitHub Release are created.
- Push a `feat(marketplace): ...` commit and verify release-please opens a separate PR that updates the root `package.json`, `.claude-plugin/marketplace.json#version` (top-level), and the root `CHANGELOG.md`. Confirm no plugin file is touched.
- Merge that PR and verify the tag `marketplace-v0.3.0` and the GitHub Release are created.
- Run `jq '.plugins[] | select(.name=="superhuman").version' .claude-plugin/marketplace.json` and confirm it matches `plugin.json#version`.
- Run `jq '.version' .claude-plugin/marketplace.json` and confirm it matches the root `package.json#version`.

## Open questions

None. All design decisions resolved during brainstorming.
