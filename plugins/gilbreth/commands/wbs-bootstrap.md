---
description: Initialize the current repo as a Tusk workspace and install the gilbreth-wbs pack so /wbs-new, /wbs-status, and the wbs-orientation skill can run.
argument-hint: [name=<workspace-name>]
---

# /wbs-bootstrap

Bootstrap the current working directory for the Gilbreth WBS flow on Tusk v1. Idempotent: safe to re-run. Initializes a Tusk workspace (if one isn't already present) and adds the `gilbreth-wbs` pack from this plugin's `packs/wbs.toml`. Prints a what-to-do-next message and a one-time hint if `[embeddings]` isn't configured.

This command exists so the first run from a fresh checkout is one keystroke. Once the workspace and pack are in place it's a no-op; `/wbs-new` and `/wbs-status` take over.

## Input

Optional free-form text. Recognized keyword params:

- `name=<workspace-name>` — override the workspace name. Defaults to the basename of the current directory.

## Procedure

1. **Detect existing workspace.** Run `tusk status` from CWD. If it succeeds, a workspace root has been discovered upward — skip step 2 and emit a soft note: "Tusk workspace already initialized at <root>; checking pack only." If it fails because no workspace was found, continue to step 2.

2. **Initialize the workspace.** Run `tusk init --name <name>` from CWD, where `<name>` is the `name=` keyword if supplied, else `$(basename "$PWD")`. Hard error if `tusk init` fails. After init, ensure `.tusk/` is gitignored — if `.gitignore` doesn't already mention it, append a single line: `.tusk/`. `tusk init` does this itself in fresh repos; the check is for repos whose `.gitignore` predates it.

3. **Detect existing pack.** Read `tusk.toml` and check for `[node-types.wbs-node]`. If present, the pack is already loaded — skip step 4 and emit a soft note: "gilbreth-wbs pack already present; skipping `tusk pack add`."

4. **Add the gilbreth-wbs pack.** Resolve the absolute path to this plugin's `packs/wbs.toml`. Inside a slash command, `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin's install root, so the pack lives at `${CLAUDE_PLUGIN_ROOT}/packs/wbs.toml`. Run:

   ```sh
   tusk pack add "file://${CLAUDE_PLUGIN_ROOT}/packs/wbs.toml"
   ```

   Hard error on failure.

5. **Verify with `tusk doctor`.** Run `tusk doctor`. Surface its output verbatim. Expect `doctor: no issues` on Tusk v1.2.0+. Known-tolerable: an `[undeclared-property] … status` warning from older Tusk versions (same root cause as the built-in kanban pack — non-fatal; track upstream).

6. **Check embeddings configuration.** Read `tusk.toml` and look for an `[embeddings]` section. If absent, print a one-time hint and continue:

   > Note: `[embeddings]` isn't configured in `tusk.toml`. The semantic-query gates the WBS flow relies on (Karpathy decomposition checks, similar-task lookups, brainstorm continuity) require it. Configuring is not required to use `/wbs-new` and `/wbs-status` today, but the gates won't fire until it's set. See the migration spec for the required provider entries.

7. **Print what to do next.** Emit a short message scoped to the resulting state:

   > Workspace ready. Next:
   > - `/wbs-new create a project for <…>` to seed the WBS root.
   > - `/wbs-new create a milestone under task=<project-id> for <…>` to start decomposing.
   > - `/wbs-status` to render the current tree.
   > - Level templates: `plugins/gilbreth/templates/wbs/desc-<level>.md`.

## Errors

- **Tusk CLI not on PATH** — hard error. Pointer to the Tusk v1 install instructions (`github.com/germanamz/tusk` releases).
- **`tusk init` fails** — surface stderr verbatim; do not retry. Common causes: existing non-Tusk `.tusk/` directory, lack of write permission.
- **`tusk pack add` fails** — surface stderr verbatim. Most likely a malformed `wbs.toml` (shouldn't happen if installed via the marketplace) or a Tusk version older than v1.0.0 that doesn't accept `file://` pack sources.
- **`${CLAUDE_PLUGIN_ROOT}/packs/wbs.toml` not found** — hard error. Indicates a corrupted plugin install; recommend reinstalling the `gilbreth` plugin from the marketplace.

## Examples

```
/wbs-bootstrap                       # uses the current dir's basename as the workspace name
/wbs-bootstrap name=acme-platform    # override the workspace name
```

## Why this command stays thin

The command is a one-shot bootstrapper, not part of the daily flow. Putting it in `commands/` rather than burying it inside `wbs-orientation`'s "Detect Tusk context" step keeps the entry point discoverable (`/wbs-bootstrap` shows up in slash-command listing) and the skill free of workspace-mutation logic. The orientation skill detects the missing pack and points users here, but does not invoke it implicitly — initialization is a deliberate user action.
