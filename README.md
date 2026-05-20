# superhuman

German's personal Claude Code marketplace.

## Install

In Claude Code:

```
/plugin marketplace add germanamz/superhuman
/plugin install gilbreth@superhuman
```

The first command registers the marketplace. The second installs the `gilbreth` plugin from it. The `<plugin>@<marketplace>` syntax disambiguates when multiple marketplaces ship a plugin with the same name.

## Plugins in this marketplace

- **`gilbreth`** — a guided work-breakdown workflow for Tusk-backed projects. Recursively decomposes a fuzzy idea down a fixed taxonomy (Project → Milestone → Initiative → Story → Task) into atomic, agent-ready tasks, with brainstorm → spec → plan → phase-review gates at every level. Lives at [`plugins/gilbreth/`](plugins/gilbreth/).

## Adding new plugins

Two patterns are supported:

**Inline** — the plugin source lives in this repo:

1. Create `plugins/<new-name>/` with its own `.claude-plugin/plugin.json` and component directories.
2. Append an entry to `plugins[]` in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) with `source: { "type": "path", "path": "./plugins/<new-name>" }`.

**External GitHub** — the plugin lives in a separate repo:

1. Append an entry to `plugins[]` with `source: { "type": "github", "repo": "owner/repo" }`. No in-repo files needed.

## License

MIT — see [LICENSE](LICENSE).
