# Superhuman Marketplace + Plugin Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `/Users/germanamz/projects/superhuman` as a Claude Code marketplace that ships with one empty starter plugin (`superhuman`) and a layout that supports adding more inline or external plugins later.

**Architecture:** Marketplace catalog at `.claude-plugin/marketplace.json` in the repo root. The single starter plugin lives at `plugins/superhuman/` with its own `.claude-plugin/plugin.json` and empty placeholder directories for skills/commands/agents/hooks. Future plugins drop into `plugins/<name>/` (inline) or get an external `source` entry in the catalog (GitHub).

**Tech Stack:** No build tooling. JSON manifests, Markdown docs, plain shell. Validation uses `jq` (already installed on macOS via Xcode CLT).

**Spec:** `docs/superpowers/specs/2026-04-28-superhuman-marketplace-scaffold-design.md`

**Working directory:** `/Users/germanamz/projects/superhuman`. All commands assume this is `cwd`.

---

## File Structure

Files this plan creates:

| Path | Responsibility |
|------|---|
| `.claude-plugin/marketplace.json` | Marketplace catalog — lists the `superhuman` plugin with a `path` source |
| `plugins/superhuman/.claude-plugin/plugin.json` | Manifest for the starter plugin (name, version, author, license) |
| `plugins/superhuman/skills/.gitkeep` | Reserve empty `skills/` dir in git |
| `plugins/superhuman/commands/.gitkeep` | Reserve empty `commands/` dir |
| `plugins/superhuman/agents/.gitkeep` | Reserve empty `agents/` dir |
| `plugins/superhuman/hooks/.gitkeep` | Reserve empty `hooks/` dir |
| `plugins/superhuman/README.md` | Plugin-level README — identifies the plugin as a scaffold awaiting content |
| `README.md` | Marketplace-level README — install instructions and plugin list for GitHub viewers |
| `CLAUDE.md` | Repo-level orientation for future Claude Code sessions |
| `LICENSE` | MIT license, copyright 2026 German Meza |
| `.gitignore` | Excludes `.DS_Store`, `node_modules/`, `.claude/`, `.worktrees/` |

Files NOT touched: `docs/superpowers/specs/2026-04-28-superhuman-marketplace-scaffold-design.md` already exists and is committed.

---

## Notes on TDD adaptation

This is a scaffolding task — config files and Markdown, not code-with-tests. The TDD analogue used throughout this plan:

- **"Failing test"** → run a verification command (`jq`, `test -d`, `ls`) that fails because the file/dir doesn't exist yet.
- **"Implementation"** → create the file with exact contents shown.
- **"Passing test"** → re-run the verification command and confirm success.

Each task ends with its own `git commit`. Four logical commits land on top of the existing spec commit. (Spec said "single initial commit"; that referred to the original scaffold concept before the spec itself got committed first. Four small logical commits are clearer for review than one bundled commit.)

---

## Task 1: Manifests (marketplace + plugin)

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `plugins/superhuman/.claude-plugin/plugin.json`

The two manifests are the foundation — every other file in the plugin is optional or supporting. Pair them in one task because plugin #1 cannot be referenced from the catalog until both exist, and they're trivial to verify together.

- [ ] **Step 1: Verify both manifest files do not yet exist (failing "test")**

Run:
```bash
test ! -f .claude-plugin/marketplace.json && test ! -f plugins/superhuman/.claude-plugin/plugin.json && echo "OK: neither file exists"
```
Expected: `OK: neither file exists`

- [ ] **Step 2: Create the parent directories**

Run:
```bash
mkdir -p .claude-plugin plugins/superhuman/.claude-plugin
```
Expected: no output, exit 0.

- [ ] **Step 3: Create the marketplace catalog**

Write `.claude-plugin/marketplace.json` with exactly this content:

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

- [ ] **Step 4: Create the plugin manifest**

Write `plugins/superhuman/.claude-plugin/plugin.json` with exactly this content:

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

- [ ] **Step 5: Verify both manifests parse as valid JSON**

Run:
```bash
jq . .claude-plugin/marketplace.json > /dev/null && jq . plugins/superhuman/.claude-plugin/plugin.json > /dev/null && echo "OK: both parse"
```
Expected: `OK: both parse` (and no jq error output).

- [ ] **Step 6: Verify required fields are present**

Run:
```bash
jq -e '.name and .plugins and (.plugins | length > 0)' .claude-plugin/marketplace.json && jq -e '.name and .description' plugins/superhuman/.claude-plugin/plugin.json && echo "OK: required fields present"
```
Expected: `true` (twice from `jq -e`) then `OK: required fields present`.

- [ ] **Step 7: Verify the path source resolves**

Run:
```bash
PATH_FROM_CATALOG=$(jq -r '.plugins[0].source.path' .claude-plugin/marketplace.json) && test -f "$PATH_FROM_CATALOG/.claude-plugin/plugin.json" && echo "OK: catalog path -> $PATH_FROM_CATALOG resolves to a manifest"
```
Expected: `OK: catalog path -> ./plugins/superhuman resolves to a manifest`

- [ ] **Step 8: Commit**

```bash
git add .claude-plugin/marketplace.json plugins/superhuman/.claude-plugin/plugin.json
git commit -m "Add marketplace catalog and superhuman plugin manifest"
```

---

## Task 2: Plugin component placeholders + plugin README

**Files:**
- Create: `plugins/superhuman/skills/.gitkeep`
- Create: `plugins/superhuman/commands/.gitkeep`
- Create: `plugins/superhuman/agents/.gitkeep`
- Create: `plugins/superhuman/hooks/.gitkeep`
- Create: `plugins/superhuman/README.md`

These four directories are where future skills, slash commands, subagents, and hooks will land. They need to exist in git so the layout is visible to anyone cloning the repo. Empty directories don't get tracked — the convention is a `.gitkeep` placeholder file. The plugin README explains what the plugin is supposed to be.

- [ ] **Step 1: Verify the four component dirs do not yet exist (failing "test")**

Run:
```bash
for d in skills commands agents hooks; do test ! -e "plugins/superhuman/$d" || { echo "FAIL: plugins/superhuman/$d already exists"; exit 1; }; done && echo "OK: none exist yet"
```
Expected: `OK: none exist yet`

- [ ] **Step 2: Create the four directories with .gitkeep placeholders**

Run:
```bash
for d in skills commands agents hooks; do mkdir -p "plugins/superhuman/$d" && touch "plugins/superhuman/$d/.gitkeep"; done
```
Expected: no output, exit 0.

- [ ] **Step 3: Create the plugin-level README**

Write `plugins/superhuman/README.md` with exactly this content:

```markdown
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
```

- [ ] **Step 4: Verify all four .gitkeep files and the README exist**

Run:
```bash
for f in plugins/superhuman/skills/.gitkeep plugins/superhuman/commands/.gitkeep plugins/superhuman/agents/.gitkeep plugins/superhuman/hooks/.gitkeep plugins/superhuman/README.md; do test -f "$f" || { echo "FAIL: $f missing"; exit 1; }; done && echo "OK: all five files present"
```
Expected: `OK: all five files present`

- [ ] **Step 5: Verify the .gitkeep files are tracked by git after staging**

Run:
```bash
git add plugins/superhuman/skills/.gitkeep plugins/superhuman/commands/.gitkeep plugins/superhuman/agents/.gitkeep plugins/superhuman/hooks/.gitkeep plugins/superhuman/README.md && git diff --cached --name-only | sort
```
Expected output (sorted):
```
plugins/superhuman/README.md
plugins/superhuman/agents/.gitkeep
plugins/superhuman/commands/.gitkeep
plugins/superhuman/hooks/.gitkeep
plugins/superhuman/skills/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git commit -m "Add plugin component directories and plugin README"
```

---

## Task 3: Root-level files (README, CLAUDE.md, LICENSE, .gitignore)

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`
- Create: `LICENSE`
- Create: `.gitignore`

These four files orient three different audiences: GitHub viewers (README), future Claude Code sessions (CLAUDE.md), legal compliance (LICENSE), and git itself (.gitignore). Group them in one task because none depends on the others and they're all small.

- [ ] **Step 1: Verify none of the four root files exist yet (failing "test")**

Run:
```bash
for f in README.md CLAUDE.md LICENSE .gitignore; do test ! -f "$f" || { echo "FAIL: $f already exists"; exit 1; }; done && echo "OK: none exist yet"
```
Expected: `OK: none exist yet`

- [ ] **Step 2: Create the marketplace README**

Write `README.md` with exactly this content (4-backtick outer fence used because the README itself contains 3-backtick code blocks):

````markdown
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

See [`docs/superpowers/specs/2026-04-28-superhuman-marketplace-scaffold-design.md`](docs/superpowers/specs/2026-04-28-superhuman-marketplace-scaffold-design.md) for the full design.

## License

MIT — see [LICENSE](LICENSE).
````

- [ ] **Step 3: Create CLAUDE.md**

Write `CLAUDE.md` with exactly this content:

```markdown
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

For an inline plugin: create `plugins/<new-name>/.claude-plugin/plugin.json`, then append to `plugins[]` in `.claude-plugin/marketplace.json` with `source: { "type": "path", "path": "./plugins/<new-name>" }`.

For an external plugin: append to `plugins[]` with `source: { "type": "github", "repo": "owner/repo" }` — no in-repo files needed.

## Verifying changes

After editing any manifest, validate JSON with `jq . <file>` and confirm the `path` source (if any) resolves to a directory containing `.claude-plugin/plugin.json`.
```

- [ ] **Step 4: Create LICENSE**

Write `LICENSE` with exactly this content:

```
MIT License

Copyright (c) 2026 German Meza

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Create .gitignore**

Write `.gitignore` with exactly this content:

```
.DS_Store
node_modules/
.claude/
.worktrees/
```

- [ ] **Step 6: Verify all four files exist and have non-zero size**

Run:
```bash
for f in README.md CLAUDE.md LICENSE .gitignore; do test -s "$f" || { echo "FAIL: $f missing or empty"; exit 1; }; done && echo "OK: all four root files present and non-empty"
```
Expected: `OK: all four root files present and non-empty`

- [ ] **Step 7: Verify .gitignore would not accidentally ignore the .gitkeep files**

Run:
```bash
git check-ignore plugins/superhuman/skills/.gitkeep plugins/superhuman/commands/.gitkeep plugins/superhuman/agents/.gitkeep plugins/superhuman/hooks/.gitkeep && echo "FAIL: .gitkeep files are being ignored" || echo "OK: .gitkeep files are not ignored"
```
Expected: `OK: .gitkeep files are not ignored` (and `git check-ignore` exits non-zero because no paths matched, which is what we want).

- [ ] **Step 8: Commit**

```bash
git add README.md CLAUDE.md LICENSE .gitignore
git commit -m "Add marketplace README, CLAUDE.md, LICENSE, and .gitignore"
```

---

## Task 4: End-to-end verification

**Files:** none created. This task verifies the whole scaffold is complete and correct.

Last task before handing back to the user. Confirms:
1. The full directory tree matches the spec.
2. Both manifests parse and have required fields.
3. The path-source link from catalog to plugin works.
4. Git working tree is clean.
5. Commit history shows the expected sequence.

This task creates no commits — it's a final sanity pass.

- [ ] **Step 1: Verify the full file tree matches the spec**

Run:
```bash
find . -type f -not -path './.git/*' -not -path './docs/*' | sort
```
Expected output (exact, sorted):
```
./.claude-plugin/marketplace.json
./.gitignore
./CLAUDE.md
./LICENSE
./README.md
./plugins/superhuman/.claude-plugin/plugin.json
./plugins/superhuman/README.md
./plugins/superhuman/agents/.gitkeep
./plugins/superhuman/commands/.gitkeep
./plugins/superhuman/hooks/.gitkeep
./plugins/superhuman/skills/.gitkeep
```

If the output differs, stop and investigate before proceeding. Common causes: a file was missed, a typo in a path, or `.gitignore` is hiding something.

- [ ] **Step 2: Re-verify both manifests parse and have required fields**

Run:
```bash
jq -e '.name == "superhuman" and (.plugins | length) == 1 and .plugins[0].source.type == "path"' .claude-plugin/marketplace.json && jq -e '.name == "superhuman" and .version == "0.1.0" and .license == "MIT"' plugins/superhuman/.claude-plugin/plugin.json && echo "OK: manifests have expected fields"
```
Expected: `true` (twice) then `OK: manifests have expected fields`.

- [ ] **Step 3: Verify the catalog path source resolves**

Run:
```bash
PATH_FROM_CATALOG=$(jq -r '.plugins[0].source.path' .claude-plugin/marketplace.json) && test -f "$PATH_FROM_CATALOG/.claude-plugin/plugin.json" && PLUGIN_NAME_AT_PATH=$(jq -r '.name' "$PATH_FROM_CATALOG/.claude-plugin/plugin.json") && CATALOG_PLUGIN_NAME=$(jq -r '.plugins[0].name' .claude-plugin/marketplace.json) && test "$PLUGIN_NAME_AT_PATH" = "$CATALOG_PLUGIN_NAME" && echo "OK: catalog -> plugin link resolves and names match ($PLUGIN_NAME_AT_PATH)"
```
Expected: `OK: catalog -> plugin link resolves and names match (superhuman)`

- [ ] **Step 4: Verify git status is clean**

Run:
```bash
git status --porcelain
```
Expected: no output (empty — clean working tree).

- [ ] **Step 5: Verify commit history**

Run:
```bash
git log --oneline
```
Expected: four commits in this order (newest first), with messages similar to:
```
<sha> Add marketplace README, CLAUDE.md, LICENSE, and .gitignore
<sha> Add plugin component directories and plugin README
<sha> Add marketplace catalog and superhuman plugin manifest
<sha> Add design spec for superhuman marketplace + plugin scaffold
```

(The fourth commit is the spec, which already existed when this plan started.)

- [ ] **Step 6: Print install instructions for the user**

Output to the user (do not run — these are slash commands the user runs in their own Claude Code session):

```
Scaffold complete. To install and verify in Claude Code, run these slash commands in a separate session:

  /plugin marketplace add /Users/germanamz/projects/superhuman
  /plugin install superhuman@superhuman
  /plugin list

The 'superhuman' plugin should appear in /plugin list with no parse errors.
```

---

## Out of scope (do NOT do)

- Do **not** push the repo to GitHub. The spec calls this out — the user will do `git push` manually when ready.
- Do **not** add real skills, commands, agents, or hooks. Only `.gitkeep` placeholders. Filling in components is follow-up work.
- Do **not** add cross-platform configs (Codex, Cursor, OpenCode, Gemini). Out of scope per the spec.
- Do **not** add CI workflows, version-bump configs, or release tooling.
