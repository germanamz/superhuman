# superhuman

German's personal Claude Code marketplace.

## Install

In Claude Code:

```
/plugin marketplace add germanamz/superhuman
/plugin install superhuman@superhuman
```

The first command registers the marketplace. The second installs the `superhuman` plugin from it. The `<plugin>@<marketplace>` syntax disambiguates when multiple marketplaces ship a plugin with the same name.

## Plugins in this marketplace

- **`superhuman`** — starter plugin scaffold. Lives at [`plugins/superhuman/`](plugins/superhuman/).

## Adding new plugins

Two patterns are supported:

**Inline** — the plugin source lives in this repo:

1. Create `plugins/<new-name>/` with its own `.claude-plugin/plugin.json` and component directories.
2. Append an entry to `plugins[]` in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) with `source: { "type": "path", "path": "./plugins/<new-name>" }`.

**External GitHub** — the plugin lives in a separate repo:

1. Append an entry to `plugins[]` with `source: { "type": "github", "repo": "owner/repo" }`. No in-repo files needed.

## License

MIT — see [LICENSE](LICENSE).
