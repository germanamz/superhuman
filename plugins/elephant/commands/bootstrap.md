---
description: Initialize the current repo as a Tusk workspace and install Elephant's knowledge pack (plus the built-in tags pack) so capture/recall can write the agent's memory graph.
argument-hint: [name=<workspace-name>]
---

# /bootstrap

Bootstrap the current working directory for Elephant's knowledge graph on Tusk v1.4.0+. Idempotent: safe to re-run. Initializes a Tusk workspace (if absent), adds the built-in `tags` pack and Elephant's `knowledge` pack, then prints what-to-do-next.

This is the one-time init that Elephant's `capture`/`recall` skills offer when they detect no graph. Once the pack is in place it's a no-op.

## Input

Optional free-form text. Recognized keyword params:

- `name=<workspace-name>` — override the workspace name. Defaults to the basename of the current directory.

## Procedure

1. **Detect existing workspace.** Run `tusk status`. If it succeeds, skip step 2 with a soft note: "Tusk workspace already initialized at <root>." If it fails because no workspace was found, continue.

2. **Initialize the workspace.** Run `tusk init --name <name>` (`<name>` = the `name=` keyword if supplied, else `$(basename "$PWD")`). Hard error on failure. Ensure `.tusk/` is gitignored — append a `.tusk/` line to `.gitignore` if absent.

3. **Add the tags pack.** Run `tusk pack add tags`. Idempotent; surface stderr verbatim on failure.

4. **Detect existing knowledge pack.** Read `tusk.toml`; if `[node-types.note]` is present, skip step 5 with a soft note: "knowledge pack already present."

5. **Add the knowledge pack.** Run:

   ```sh
   tusk pack add "file://${CLAUDE_PLUGIN_ROOT}/packs/knowledge.toml"
   ```

   Use `--force` only if step 4 detected a colliding but equivalent declaration. Hard error on other failures.

6. **Verify with `tusk doctor`.** Surface output verbatim. Expect `doctor: no issues`.

7. **Print what to do next.**

   > Knowledge graph ready. Elephant's capture/recall will now use it automatically. Tag notes by topic (the `tags` pack is installed). To enable semantic recall, configure `[embeddings]` in `tusk.toml`.

## Errors

- **Tusk CLI not on PATH** — hard error; point at the Tusk v1.4.0+ install (`github.com/germanamz/tusk` releases).
- **Tusk older than v1.4.0** — the `wikilinks = true` flag in `knowledge.toml` requires v1.4.0; surface a clear version error.
- **`${CLAUDE_PLUGIN_ROOT}/packs/knowledge.toml` not found** — corrupted install; recommend reinstalling the `elephant` plugin.

## Examples

```
/bootstrap
/bootstrap name=my-project
```
