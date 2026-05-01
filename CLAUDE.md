# CLAUDE.md

This repo is a Claude Code marketplace, not a typical application.

## Layout

- `.claude-plugin/marketplace.json` — the marketplace catalog. Every installable plugin in this marketplace appears in its `plugins[]` array.
- `plugins/<name>/` — one directory per inline plugin. Each contains its own `.claude-plugin/plugin.json` plus optional `skills/`, `commands/`, `agents/`, `hooks/` directories.
- `docs/superpowers/specs/` — design documents.
- `docs/superpowers/plans/` — implementation plans.

## Adding plugin content

When asked to add a skill, command, agent, or hook, place it under the relevant plugin's directory:

- Skills → `plugins/<plugin-name>/skills/<skill-name>/SKILL.md`
- Slash commands → `plugins/<plugin-name>/commands/<command-name>.md`
- Subagents → `plugins/<plugin-name>/agents/<agent-name>.md`
- Hooks → `plugins/<plugin-name>/hooks/hooks.json` (plus any scripts the hooks invoke)

## Adding a new plugin to the catalog

For an inline plugin: create `plugins/<new-name>/.claude-plugin/plugin.json`, then append to `plugins[]` in `.claude-plugin/marketplace.json` with `"source": "./plugins/<new-name>"` (a plain string — relative paths must start with `./`).

For an external plugin: append to `plugins[]` with `"source": { "source": "github", "repo": "owner/repo" }` — no in-repo files needed. Other object-form types: `url`, `git-subdir`, `npm`. The discriminator field is `source`, not `type`.

## Verifying changes

After editing any manifest, validate JSON with `jq . <file>` and confirm the `path` source (if any) resolves to a directory containing `.claude-plugin/plugin.json`.
