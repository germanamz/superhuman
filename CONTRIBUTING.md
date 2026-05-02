# Contributing

This repo is a Claude Code plugin marketplace. Releases are automated by [release-please](https://github.com/googleapis/release-please) and driven by [Conventional Commits](https://www.conventionalcommits.org/). This document covers the commit format, the release flow, and how to register a new plugin with release-please.

For where to put new files (skills, commands, agents, hooks), see `CLAUDE.md`.

## Components

release-please tracks two kinds of components, each with its own version line and changelog:

- **`marketplace`** — the catalog itself, at the repo root. Bumped by catalog-level changes only.
- **`<plugin-name>`** — one component per plugin under `plugins/<name>/`. Bumped by changes to that plugin's contents.

Components are declared in `release-please-config.json`. The component name is the value you put in a commit's `(scope)`.

## Commit format

Every commit must follow Conventional Commits with a mandatory scope:

```
<type>(<scope>): <subject>
```

`<scope>` must be a registered component name — `marketplace`, or any plugin's component name (e.g. `superhuman`).

| Commit | Effect on `<scope>` component |
|---|---|
| `feat(<scope>): ...` | minor bump |
| `fix(<scope>): ...` | patch bump |
| `feat(<scope>)!: ...` or `BREAKING CHANGE:` footer | major bump |
| `chore(<scope>): ...`, `docs(<scope>): ...`, `refactor(<scope>): ...`, `test(<scope>): ...`, `ci(<scope>): ...`, `build(<scope>): ...`, `perf(<scope>): ...` | no version bump; appears in the changelog if release-please's defaults include that section |
| Any commit with no scope, or a scope that does not match a registered component | no bump for any component; not attributed to any release |

A commit's scope routes it to **exactly one** component. release-please does not dual-route a commit. When a change affects both a plugin and the marketplace catalog, use **two commits** — one per scope.

### When to use `marketplace` scope

- Adding a new plugin to the catalog (`feat(marketplace): register <new> plugin`)
- Removing a plugin (`feat(marketplace)!: remove <old> plugin`)
- Marketplace metadata changes — description, owner, schema fields (`fix(marketplace): correct owner email`)

### When NOT to use `marketplace` scope

- Plugin internal changes (skills, commands, hooks, agents) — use the plugin's own scope.
- Routine per-plugin version bumps — release-please handles these automatically through the plugin's own component.

### Forcing a specific version

Add a `Release-As: x.y.z` footer to a commit to override automatic bumping for that component's next release. Useful for `1.0.0` promotion or hotfix versioning:

```
feat(superhuman): promote to stable

Release-As: 1.0.0
```

## Release flow

1. Push conventional commits to `main` (typically via merged PRs).
2. The `.github/workflows/release-please.yml` workflow runs on every push to `main`.
3. For each component with unreleased changes, release-please opens (or updates) a release PR. The PR contains:
   - bumped `version` in the component's `package.json`, in `plugin.json` (for plugins), and in the matching marketplace entry
   - generated `CHANGELOG.md` updates
   - updated `.release-please-manifest.json`
4. Review and merge the release PR.
5. release-please tags the release (`<component>-v<x.y.z>`) and creates a GitHub Release with the changelog.

The default `GITHUB_TOKEN` is enough — no PAT required.

## Adding a new plugin to release-please

To onboard a new plugin called `<new>`:

1. Scaffold the plugin per `CLAUDE.md` ("Adding plugin content"). Create `plugins/<new>/.claude-plugin/plugin.json` and any `skills/`, `commands/`, `agents/`, `hooks/` directories.
2. Create `plugins/<new>/package.json`:
   ```json
   { "name": "<new>", "version": "0.0.0", "private": true }
   ```
3. Set `"version": "0.0.0"` in `plugins/<new>/.claude-plugin/plugin.json`.
4. Add the marketplace entry in `.claude-plugin/marketplace.json#plugins[]`, **including** `"version": "0.0.0"` (the field must be present for release-please's jsonpath to update it):
   ```json
   {
     "name": "<new>",
     "version": "0.0.0",
     "description": "...",
     "source": "./plugins/<new>"
   }
   ```
5. Register a `packages` entry in `release-please-config.json` keyed at `plugins/<new>`:
   ```json
   "plugins/<new>": {
     "component": "<new>",
     "package-name": "<new>",
     "changelog-path": "CHANGELOG.md",
     "extra-files": [
       {
         "type": "json",
         "path": "plugins/<new>/.claude-plugin/plugin.json",
         "jsonpath": "$.version"
       },
       {
         "type": "json",
         "path": ".claude-plugin/marketplace.json",
         "jsonpath": "$.plugins[?(@.name==\"<new>\")].version"
       }
     ]
   }
   ```
6. Seed `.release-please-manifest.json` with `"plugins/<new>": "0.0.0"`.
7. Make **two commits** on a feature branch:
   - `feat(<new>): scaffold <new> plugin` — covers the plugin's own scaffold and the per-plugin config-file changes (`plugins/<new>/**`, the `packages` entry in `release-please-config.json`, the entry in `.release-please-manifest.json`).
   - `feat(marketplace): register <new> plugin` — covers the new entry in `.claude-plugin/marketplace.json#plugins[]` so the catalog version bumps too.
8. Open a PR. After it merges to `main`, release-please opens **two** release PRs:
   - one for `<new>` bumping `0.0.0 → 0.1.0`, publishing tag `<new>-v0.1.0`
   - one for `marketplace` bumping the catalog version, publishing tag `marketplace-v<bumped>`

Merge both release PRs to publish.

## What not to commit by hand

release-please owns these files. Manual edits to them will be overwritten by the active release PR or cause merge conflicts:

- `.release-please-manifest.json`
- `package.json#version` (root) and `plugins/*/package.json#version`
- `.claude-plugin/marketplace.json#version` (top-level) and `.claude-plugin/marketplace.json#plugins[*].version`
- `plugins/*/.claude-plugin/plugin.json#version`
- Per-component `CHANGELOG.md` files

The only time you set these by hand is during the new-plugin onboarding above (seeding `0.0.0`).

## Cross-references

- `CLAUDE.md` — repo layout, where to place skills/commands/agents/hooks, and the plain checklist for adding a plugin to the marketplace catalog (separate from the release-please registration covered here).
