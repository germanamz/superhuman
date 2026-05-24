---
description: One-time migration of an existing Gilbreth WBS workspace from the legacy `wbs-*`-prefixed types to Elephant's canonical `core` pack. Idempotent.
---

# /wbs-migrate

Migrate an existing Gilbreth WBS workspace from the pre-`core` shape (where the gilbreth `wbs` pack declared its own `wbs-node`/`wbs-note` types and `wbs-parent`/`wbs-about`/`wbs-supersedes`/`wbs-blocks` edges) to the current shape, where Elephant's `core` pack owns the generic vocabulary and gilbreth's pack contributes only the `wbs-workflow` state machine.

The migration covers four mechanical rewrites:

1. **Node/note frontmatter type rename** across every `wbs/**/*.md`: `type: wbs-node` → `type: node`, `type: wbs-note` → `type: note`.
2. **Edge-key rename** in the same files: the four forward edges (`wbs-parent`, `wbs-about`, `wbs-supersedes`, `wbs-blocks`) and their inverses (`wbs-children`, `wbs-notes`, `wbs-superseded-by`, `wbs-blocked-by`) drop the `wbs-` prefix. Edge *values* (paths) are unchanged.
3. **`tusk.toml` pack section swap**: remove the legacy `[node-types.wbs-node|wbs-note]`, `[edge-types.wbs-parent|wbs-about|wbs-supersedes|wbs-blocks|references]`, and `[behaviors.workflow.wbs-workflow]` blocks (plus their banner comments) that the OLD `wbs` pack appended. Then `tusk pack add` Elephant's `core` (with `--force` to reconcile) and gilbreth's current workflow-only `wbs.toml`.
4. **`tusk reindex`** so the index reflects the renamed frontmatter and the new pack.

Idempotent: re-running on an already-migrated workspace produces no changes and exits with a clean `tusk doctor`.

Recoverability: every file under `wbs/**` is git-tracked markdown. **Commit a clean baseline before running this command** — if anything goes wrong, `git restore` (or `git reset --hard`) returns the workspace to the pre-migration state byte-for-byte. The migration touches only `wbs/**/*.md` and `tusk.toml`; nothing outside that footprint changes.

## Input

No arguments. The command operates on the current workspace (CWD must be inside a Tusk workspace; the command walks upward to find the workspace root, same as the Tusk CLI).

## Procedure

1. **Pre-flight: confirm the workspace and a clean working tree.**
   - Run `tusk status` from CWD. If it fails (no workspace found), hard error with: `/wbs-migrate must run inside a Tusk workspace. Run /wbs-bootstrap first if this is a fresh checkout.`
   - Run `git status --porcelain wbs tusk.toml`. If output is non-empty, refuse to proceed and print: `Working tree has uncommitted changes under wbs/ or tusk.toml. Commit or stash them first — /wbs-migrate rewrites these files in place, and a clean baseline is the recovery path.` (The user can pass through by stashing/committing; the command does not stash automatically.)

2. **Detect already-migrated state (idempotency check).**
   - Grep `wbs/` for any line matching `^type: wbs-node$`, `^type: wbs-note$`, or any frontmatter key starting with `wbs-` (forward edges or inverses): `grep -rEn '^type: wbs-(node|note)$|^wbs-(parent|about|supersedes|blocks|children|notes|superseded-by|blocked-by):' wbs/ || true`.
   - Grep `tusk.toml` for legacy pack blocks: `grep -E '^\[(node-types\.wbs-(node|note)|edge-types\.wbs-(parent|about|supersedes|blocks))\]' tusk.toml || true`.
   - If **both** are empty, the workspace is already migrated. Skip steps 3–5; jump to step 6 (`tusk doctor`) and exit success with the note: `Workspace already on the canonical core shape; nothing to migrate. Doctor still run for confirmation.`

3. **Rewrite `wbs/**/*.md` frontmatter.** For every file under `wbs/`:
   - Replace `^type: wbs-node$` → `type: node`.
   - Replace `^type: wbs-note$` → `type: note`.
   - For each frontmatter key in the closed set below, rename the key (left-hand side only — the value stays as-is):

     | Old key                | New key          |
     |------------------------|------------------|
     | `wbs-parent`           | `parent`         |
     | `wbs-children`         | `children`       |
     | `wbs-about`            | `about`          |
     | `wbs-notes`            | `notes`          |
     | `wbs-supersedes`       | `supersedes`     |
     | `wbs-superseded-by`    | `superseded-by`  |
     | `wbs-blocks`           | `blocks`         |
     | `wbs-blocked-by`       | `blocked-by`     |

     Rename the key whether it appears as a scalar (`wbs-parent: wbs/proj`) or as a list head (`wbs-children:` followed by `- wbs/proj/x` lines). Only frontmatter — do not touch body text (wikilinks and prose remain intact).

   Implementation hint: a `perl -i -0777` (slurp mode) one-liner per file is the cleanest pattern on macOS/Linux. Extract the frontmatter block (`\A---\n(.*?)\n---\n`), run the substitutions on that capture only, then re-emit. This guarantees prose containing the strings `wbs-parent:` or `type: wbs-node` is untouched.

4. **Swap the pack section in `tusk.toml`.** Order matters: add core first, then strip the legacy blocks, then add the gilbreth workflow pack. This sequencing keeps the workspace recoverable on partial failure — if `tusk pack add core` blows up (network, missing file, permissions), `tusk.toml` still contains the intact legacy pack and the frontmatter rewrite from step 3 is the only on-disk change, fully reversible with `git restore`. Stripping first would orphan `tusk.toml` (no `references` edge declared, no node/note types) before the replacement is in hand.

   - **Add Elephant's `core` pack.** Resolve `${ELEPHANT_PLUGIN_ROOT}` the same way `/wbs-bootstrap` does (the `elephant` plugin's install root in this marketplace), then:

     ```sh
     tusk pack add "file://${ELEPHANT_PLUGIN_ROOT}/packs/core.toml" --force
     ```

     The legacy `wbs-*`-prefixed declarations and the new canonical (`node`/`note`/`parent`/…) declarations coexist in `tusk.toml` at this point — they don't collide because the names are distinct. `--force` is harmless here: on a true pre-migration workspace `core` is absent, and on a partially-migrated workspace it reconciles any pre-existing overlap.

   - **Strip the legacy gilbreth pack contents.** The blocks to remove (with their preceding contiguous `#` comment banners, if any):
     - `[node-types.wbs-node]`
     - `[node-types.wbs-note]`
     - `[edge-types.wbs-parent]`
     - `[edge-types.wbs-about]`
     - `[edge-types.wbs-supersedes]`
     - `[edge-types.wbs-blocks]`
     - `[edge-types.references]` (the OLD pack declared it; the new `core` pack re-declares it identically — the canonical decl from the previous bullet is what stays)
     - `[behaviors.workflow.wbs-workflow]` (the OLD pack appended it; the next bullet's `tusk pack add` re-appends it cleanly)

     Each block runs from its `[…]` header to the line immediately before the next `[…]` header (or EOF). A practical approach: split `tusk.toml` on TOML section headers, drop the listed sections plus any `#`-prefixed comment lines that immediately precede them (the OLD pack's banner comment), and re-join. Trim trailing blank lines. Faster shortcut on a recognizably-shaped file: the OLD pack is always appended in one chunk starting with the banner `# Gilbreth WBS — Tusk type pack`; deleting from that line to EOF strips the whole block in one move. Fall back to the per-section strip only if that banner has been edited away.

   - **Add gilbreth's workflow pack:**

     ```sh
     tusk pack add "file://${CLAUDE_PLUGIN_ROOT}/packs/wbs.toml" --force
     ```

     `--force` makes this add robust if `[behaviors.workflow.wbs-workflow]` was left behind by an incomplete strip in the previous bullet.

5. **Reindex.** Run `tusk reindex`. This re-parses every node and note file from disk and rebuilds the edge graph from the renamed frontmatter keys.

6. **Verify with `tusk doctor`.** Run `tusk doctor`. Surface its output verbatim. Expect `doctor: no issues` on Tusk v1.3.0+. If doctor reports off-schema nodes or dangling edges, do not commit — re-read the report and walk back to whichever step missed a file.

7. **Print the next-step message.** Emit:

   > Migration complete. Review the diff (`git diff`) and commit `wbs/` and `tusk.toml` with a Conventional Commits message — pick a scope appropriate to the consuming repo (e.g. `chore(<scope>): migrate WBS workspace to canonical types`). Once committed, the migration is part of git history; running `/wbs-migrate` again is a no-op.

## Errors

- **Not inside a Tusk workspace** — hard error at step 1. Pointer to `/wbs-bootstrap`.
- **Working tree dirty under `wbs/` or `tusk.toml`** — refuse to proceed at step 1. The user must commit or stash first; the command does not auto-stash because the dirty state may itself be in-flight WBS edits that the user wants to keep separate from the mechanical migration.
- **`elephant` plugin not installed** — hard error at step 4 (the `tusk pack add` of `core.toml` fails because `${ELEPHANT_PLUGIN_ROOT}/packs/core.toml` does not exist). Install the `elephant` plugin from the marketplace first, then re-run.
- **`tusk pack add` or `tusk reindex` failure** — surface stderr verbatim. Do not proceed to commit. The working tree is recoverable via `git restore wbs tusk.toml` (or `git reset --hard`) because step 1 enforced a clean baseline.
- **`tusk doctor` reports issues** — do not commit. The most likely cause is a frontmatter key that wasn't caught by the rename pass (e.g. a non-canonical key in a hand-edited file). Inspect the doctor output, fix the offending file, re-run from step 5.

## Examples

```
/wbs-migrate    # idempotent; safe to run on any workspace, migrated or not
```

After a successful run on a pre-migration workspace, `git diff --stat` typically shows:

```
 tusk.toml                       | ~120 -----------
 wbs/<project>.md                |   2 +-
 wbs/<project>/<story>.md        |   4 +-
 wbs/<project>/<story-spec>.md   |   4 +-
 ...
```

A second `/wbs-migrate` immediately after produces an empty diff and a clean `tusk doctor`.
