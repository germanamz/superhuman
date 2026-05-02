# release-please for the superhuman marketplace

**Status:** Draft
**Date:** 2026-05-02

## Problem

The repo is a Claude Code plugin marketplace. Versions are currently set by hand in `plugins/<name>/.claude-plugin/plugin.json`, with no changelog, no tags, no release process, and no enforced relationship between any version field and the marketplace catalog. As more plugins are added, manual bookkeeping will drift and consumers will not get reliable update signals.

We want automated, per-plugin releases driven by conventional commits, with all version-bearing files updated atomically and a documented contributor flow.

## Goals

1. Each plugin in `plugins/<name>/` releases independently on its own version line.
2. release-please opens one release PR per plugin when conventional-commit-tagged work has merged to `main`.
3. Merging a release PR tags the release, publishes a GitHub Release, and writes a per-plugin CHANGELOG.
4. The version that Claude Code resolves (i.e. `plugin.json#version`) is always in sync with what release-please published.
5. Adding a new plugin to release-please is a documented, mechanical checklist.

## Non-goals

- Publishing plugins to npm or any external registry. Plugins are consumed via the marketplace, not as npm packages.
- Versioning the marketplace catalog itself. The top-level `marketplace.json#version` field (a manifest-schema version per the Claude Code docs) is left unmanaged by release-please.
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

release-please runs in **manifest mode** with the **`node`** release-type, declaring one component per plugin under `plugins/<name>/`.

### Files release-please owns

- `release-please-config.json` — components, release types, extra-files declarations.
- `.release-please-manifest.json` — last-released version per component.

### Files release-please writes on each release PR

For each released plugin:

- `plugins/<name>/package.json#version` — release-please's primary version anchor for the `node` release-type.
- `plugins/<name>/.claude-plugin/plugin.json#version` — via `extra-files` json updater, jsonpath `$.version`. **The field Claude Code actually reads.**
- `.claude-plugin/marketplace.json#plugins[?(@.name=="<plugin>")].version` — via `extra-files` json updater with a filter predicate. Redundant with `plugin.json` for resolution purposes, but keeps the marketplace catalog human-readable as a single-file index of currently-published versions.
- `plugins/<name>/CHANGELOG.md` — per-component changelog (release-please default in manifest mode).
- `.release-please-manifest.json` — bumped entry for the released component.

### Files release-please does not touch

- `.claude-plugin/marketplace.json#version` (top-level) — manifest-schema field, unrelated to plugin releases.
- Any file under `plugins/<name>/` other than the four listed above.
- `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `docs/**`.

### release-please-config.json shape

Per-component configuration (one `packages` entry per plugin, illustrated for the existing `superhuman` plugin):

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "include-component-in-tag": true,
  "separate-pull-requests": true,
  "packages": {
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
- `include-component-in-tag: true` produces tags like `superhuman-v0.2.0`, namespaced per plugin.
- `separate-pull-requests: true` opens one release PR per plugin instead of bundling them.
- `extra-files` paths are repo-root-relative.
- The implementation plan should include a verification step that confirms both `extra-files` entries are written by release-please on a probe release (and adjust to component-relative paths if the empirical behavior differs from this assumption).

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

One-time setup committed in a single PR:

1. Add `"version": "0.1.0"` to the `superhuman` entry in `.claude-plugin/marketplace.json#plugins[]` (the field must exist for the jsonpath to update it).
2. Create `plugins/superhuman/package.json` with `{ "name": "superhuman", "version": "0.1.0", "private": true }`.
3. Add `release-please-config.json` with the `superhuman` component declared as in the example above.
4. Add `.release-please-manifest.json` containing `{"plugins/superhuman": "0.1.0"}` so release-please does not try to release `0.1.0` again.
5. Add `.github/workflows/release-please.yml`.
6. Set `bootstrap-sha` in `release-please-config.json` to the current `main` HEAD SHA at the time the bootstrap PR is opened. Pre-bootstrap commits are excluded from the changelog. (If new commits land on `main` between opening and merging the bootstrap PR, update `bootstrap-sha` accordingly so changelog generation begins after release-please adoption rather than retroactively classifying old commits.)
7. Add `CONTRIBUTING.md` documenting the commit format, release flow, and the new-plugin checklist (see below).
8. Update `CLAUDE.md` with a one-line pointer to `CONTRIBUTING.md` and a single bullet appended to "Adding a new plugin to the catalog" referencing the release-please checklist.

After this PR merges, the next conventional commit (e.g. `feat(superhuman): ...`) will produce a release PR bumping `0.1.0 → 0.2.0`.

## Conventional commits

Format: `<type>(<scope>): <subject>` where `<scope>` is the plugin component name from `release-please-config.json`.

| Commit | Effect on `<scope>` plugin |
|---|---|
| `feat(<scope>): ...` | minor bump |
| `fix(<scope>): ...` | patch bump |
| `feat(<scope>)!: ...` or `BREAKING CHANGE:` footer | major bump |
| `chore(<scope>): ...`, `docs(<scope>): ...`, `refactor(<scope>): ...`, `test(<scope>): ...`, `ci(<scope>): ...`, `build(<scope>): ...`, `perf(<scope>): ...` | no bump; appears in changelog under its section if release-please's defaults include it |
| Any commit with no scope, or a scope that does not match a registered component | no bump for any plugin; not attributed to a release |

`Release-As: x.y.z` in a commit footer overrides automatic bumping for that plugin's next release. Useful for `1.0.0` promotion or hotfix versioning.

## CONTRIBUTING.md

Lives at the repo root. Contents:

1. **Commit format** — conventional commits with a mandatory `(scope)` matching a plugin component name. Worked examples and the bump table from the section above.
2. **Release flow** — narrative walkthrough: push → release PR opens → review → merge → tag and GitHub Release auto-created → CHANGELOG at `plugins/<plugin>/CHANGELOG.md`.
3. **Adding a new plugin to release-please** — the load-bearing checklist:
   1. Scaffold plugin contents per CLAUDE.md ("Adding plugin content").
   2. Create `plugins/<new>/package.json` with `{ "name": "<new>", "version": "0.0.0", "private": true }`.
   3. Set `version: "0.0.0"` in `plugins/<new>/.claude-plugin/plugin.json`.
   4. Add the marketplace entry in `.claude-plugin/marketplace.json#plugins[]` including `"version": "0.0.0"`.
   5. Register a `packages` entry in `release-please-config.json` keyed at `plugins/<new>` with `component`, `package-name`, and the two `extra-files` (plugin.json + filtered marketplace.json jsonpath using the new plugin's name).
   6. Seed `.release-please-manifest.json` with `"plugins/<new>": "0.0.0"`.
   7. Commit as `feat(<new>): scaffold <new> plugin` on a feature branch.
   8. Merge to `main` → release-please opens a release PR bumping `0.0.0 → 0.1.0` → merge to publish `<new>-v0.1.0`.
4. **Forcing a specific version** — `Release-As: x.y.z` footer.
5. **What not to commit** — release-please owns all `version` fields plus CHANGELOGs and `.release-please-manifest.json`. Manual edits to those will be overwritten or cause merge conflicts in the active release PR.
6. **Cross-references** — link to CLAUDE.md "Adding plugin content" and "Adding a new plugin to the catalog".

## CLAUDE.md updates

- Add at the top (after the layout intro): "See `CONTRIBUTING.md` for commit conventions and the release process."
- Append to "Adding a new plugin to the catalog": "Then follow the release-please registration steps in `CONTRIBUTING.md`."

## Testing & verification

- After bootstrap PR merges, verify a `chore(superhuman): ...` commit produces no release PR.
- Push a `feat(superhuman): ...` commit (a real change, not a probe) and verify release-please opens a PR that updates `package.json`, `plugin.json`, the marketplace entry, the changelog, and the manifest, all with version `0.2.0`.
- Merge that PR and verify the tag `superhuman-v0.2.0` and the GitHub Release are created.
- Run `jq '.plugins[] | select(.name=="superhuman").version' .claude-plugin/marketplace.json` and confirm it matches `plugin.json#version`.

## Open questions

None. All design decisions resolved during brainstorming.
