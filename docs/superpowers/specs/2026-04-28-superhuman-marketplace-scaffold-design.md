# Superhuman marketplace + plugin scaffold

**Date:** 2026-04-28
**Author:** German Meza (`iam@germanamz.com`)
**Status:** Approved — ready for implementation plan

## Goal

Scaffold `/Users/germanamz/projects/superhuman` as a custom Claude Code marketplace that:

1. Hosts one starter plugin (`superhuman`) inline as a minimal stub.
2. Supports adding more inline plugins later (subdirectory layout).
3. Supports listing external GitHub-hosted plugins as catalog entries.

The starter plugin ships empty — directory structure only. Real skills, commands, agents, and hooks are added in follow-up work.

## Layout decision

Plugins live under `plugins/<name>/` from day one, not at the repo root. The root holds only the marketplace catalog and repo-level docs. This keeps the marketplace catalog and the plugin's own manifest in cleanly separated namespaces, and adding plugin #2 means dropping a new folder under `plugins/` — no restructuring of plugin #1.

Rejected alternative: rooting the first plugin at the repo top (the superpowers pattern). It's slightly simpler for one plugin but forces a disruptive layout change the moment a second inline plugin is added.

## Directory tree

```
superhuman/
├── .claude-plugin/
│   └── marketplace.json              # marketplace catalog
├── plugins/
│   └── superhuman/                   # the starter plugin
│       ├── .claude-plugin/
│       │   └── plugin.json           # plugin manifest
│       ├── skills/.gitkeep
│       ├── commands/.gitkeep
│       ├── agents/.gitkeep
│       ├── hooks/.gitkeep
│       └── README.md
├── docs/
│   └── superpowers/
│       └── specs/                    # this spec lives here
├── .gitignore
├── LICENSE                           # MIT
├── README.md                         # marketplace-level README
└── CLAUDE.md                         # repo-level guidance for future sessions
```

`.gitkeep` files preserve the empty component directories in git so future contributors see the intended layout.

## Manifests

### `.claude-plugin/marketplace.json`

```json
{
  "name": "superhuman",
  "description": "German's personal Claude Code marketplace",
  "owner": {
    "name": "German Meza",
    "email": "iam@germanamz.com"
  },
  "plugins": [
    {
      "name": "superhuman",
      "description": "Starter plugin scaffold for the superhuman marketplace",
      "source": {
        "type": "path",
        "path": "./plugins/superhuman"
      }
    }
  ]
}
```

### `plugins/superhuman/.claude-plugin/plugin.json`

```json
{
  "name": "superhuman",
  "description": "Starter plugin scaffold for the superhuman marketplace",
  "version": "0.1.0",
  "author": {
    "name": "German Meza",
    "email": "iam@germanamz.com"
  },
  "homepage": "https://github.com/germanamz/superhuman",
  "repository": "https://github.com/germanamz/superhuman",
  "license": "MIT",
  "keywords": []
}
```

### Patterns for future plugin additions

- **Inline plugin:** create `plugins/<new-name>/` with its own `.claude-plugin/plugin.json` and component dirs, then append to `plugins[]` in `marketplace.json` with `source: { "type": "path", "path": "./plugins/<new-name>" }`.
- **External GitHub plugin:** append to `plugins[]` with `source: { "type": "github", "repo": "owner/repo" }` — no in-repo files required.

## Top-level files

### `README.md` (marketplace-level)

Sections:
- One-line description of the marketplace
- Install: `/plugin marketplace add germanamz/superhuman` then `/plugin install superhuman@superhuman`
- "Plugins in this marketplace" — bulleted list, currently just `superhuman`
- "Adding new plugins" — short note on inline-vs-external patterns referencing this spec

### `plugins/superhuman/README.md` (plugin-level)

Stub identifying the plugin and noting it is a scaffold awaiting content. Lists empty placeholder sections for skills, commands, agents, hooks.

### `CLAUDE.md` (root)

Short orientation for future Claude Code sessions opened in this repo:
- This is a Claude Code marketplace + plugin repo, not a typical application
- Layout summary (marketplace catalog at `.claude-plugin/marketplace.json`, plugins under `plugins/<name>/`)
- Where new skills/commands/agents/hooks belong
- Conventions when adding a new plugin entry to the catalog

### `LICENSE`

MIT, copyright 2026 German Meza. Matches the `license: MIT` field in the plugin manifest.

### `.gitignore`

```
.DS_Store
node_modules/
.claude/
.worktrees/
```

## Verification

### Static checks (run automatically during scaffolding)

- `jq . .claude-plugin/marketplace.json` succeeds (valid JSON).
- `jq . plugins/superhuman/.claude-plugin/plugin.json` succeeds.
- `marketplace.json` `plugins[0].source.path` resolves to a directory containing `.claude-plugin/plugin.json`.
- Required fields present: marketplace has `name` and `plugins[]`; plugin has `name` and `description`.

### Manual install test (user runs after scaffolding completes)

```
/plugin marketplace add /Users/germanamz/projects/superhuman
/plugin install superhuman@superhuman
/plugin list
```

Expected: `superhuman` appears in the plugin list with no parse errors. This is the authoritative validation — JSON validity alone does not guarantee the Claude Code plugin loader accepts the manifest schema.

### Git state

After scaffolding, all generated files are committed in a single initial commit. `git status` returns clean.

## Out of scope

- Actual skills, commands, agents, or hooks. Component directories are empty placeholders.
- Cross-platform manifests (Codex `.codex/`, Cursor `.cursor-plugin/`, OpenCode `.opencode/`, `gemini-extension.json`). These can be added later if multi-platform distribution becomes a goal.
- CI/release tooling (changelog generators, version-bump configs, GitHub Actions). Out of scope for the scaffold.
- Publishing the repo to GitHub. The spec assumes the repo will eventually live at `github.com/germanamz/superhuman` and bakes that URL into the manifests, but the actual `git push` is a separate manual step the user performs when ready.
