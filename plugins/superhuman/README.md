# superhuman

Starter plugin scaffold for the [superhuman](../../README.md) marketplace.

This plugin is empty — the directory structure is in place, but no skills, commands, agents, or hooks have been added yet. Components land here as work progresses.

## Layout

- `skills/` — auto-invoked or user-invoked skills (each in its own subdirectory with a `SKILL.md`)
- `commands/` — slash commands (one Markdown file per command)
- `agents/` — subagent definitions (one Markdown file per agent)
- `hooks/` — event hooks (`hooks.json` plus any scripts they call)

## Manifest

See `.claude-plugin/plugin.json` for plugin metadata.
