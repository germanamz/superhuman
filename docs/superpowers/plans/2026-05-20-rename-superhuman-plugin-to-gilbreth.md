# Rename `superhuman` plugin → `gilbreth` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the marketplace's only plugin from `superhuman` to `gilbreth` across the directory, manifests, marketplace catalog, release-please config, lint layers, and all internal/doc references — preserving version 0.3.0 and leaving the marketplace name, repo URL, and "WBS" methodology term unchanged.

**Architecture:** This is a config-and-docs repo (a Claude Code plugin marketplace), not an application — there are no unit tests. Each task is verification-driven: make the change, then run a concrete shell check (`jq`, `grep`, path resolution) with a stated expected result. The rename lands as a single `feat(marketplace)!` PR.

**Tech Stack:** JSON manifests, TOML (Tusk pack), Markdown (skills/commands/docs), release-please, commitlint, GitHub Actions. macOS BSD `sed` (note `sed -i ''`).

**Branch:** Work happens on the already-created `rename-plugin-gilbreth` branch.

**Token map (used throughout):**

| Old | New | Notes |
|---|---|---|
| `plugins/superhuman` | `plugins/gilbreth` | path refs (NOT tusk.toml, NOT CHANGELOG, NOT this plan/spec) |
| `superhuman:` | `gilbreth:` | skill-invocation namespace (functional) |
| `superhuman-wbs` | `gilbreth-wbs` | pack label (documentation only) |
| `Superhuman WBS` | `Gilbreth WBS` | prose |
| `Superhuman plugin` | `Gilbreth plugin` | prose |
| `superhuman-tusk-v1-migration` | `website-relaunch` | genericized example node path |
| `superhuman@superhuman` | `gilbreth@superhuman` | install id (plugin part only) |

**Left unchanged:** marketplace `name` (`superhuman`), `superhuman-marketplace` package name, `tusk.toml` (workspace name + installed-pack stanzas — historical state, re-bootstrap is idempotent), `github.com/germanamz/superhuman` repo URL, `plugins/superhuman/CHANGELOG.md` (release history), the bare word "WBS".

---

### Task 1: Move the plugin directory

**Files:**
- Move: `plugins/superhuman/` → `plugins/gilbreth/`

- [ ] **Step 1: git-move the directory**

```bash
git mv plugins/superhuman plugins/gilbreth
```

- [ ] **Step 2: Verify the move preserved contents**

Run: `ls plugins/gilbreth/.claude-plugin/plugin.json && git status --short | head`
Expected: the `plugin.json` path prints; `git status` shows renames (`R`) under `plugins/gilbreth/`, no untracked plugin files.

---

### Task 2: Update the plugin's own manifests and README

**Files:**
- Modify: `plugins/gilbreth/.claude-plugin/plugin.json`
- Modify: `plugins/gilbreth/package.json`
- Modify: `plugins/gilbreth/README.md`

- [ ] **Step 1: Rename in `plugin.json`** (change `name` only; keep `version`, `homepage`, `repository`)

In `plugins/gilbreth/.claude-plugin/plugin.json`, change:
```json
  "name": "superhuman",
```
to:
```json
  "name": "gilbreth",
```

- [ ] **Step 2: Rename in `package.json`**

In `plugins/gilbreth/package.json`, change `"name": "superhuman"` to `"name": "gilbreth"` (keep `"version": "0.3.0"`, `"private": true`).

- [ ] **Step 3: Update the plugin README title**

In `plugins/gilbreth/README.md`, change only the title line `# superhuman` to `# gilbreth`. Leave the `[superhuman](../../README.md)` link in the first paragraph untouched — it names the marketplace, not the plugin. (Path tokens in the body are handled by Task 6's global pass.)

- [ ] **Step 4: Verify JSON validity and the new name**

Run:
```bash
jq -e '.name == "gilbreth" and .version == "0.3.0"' plugins/gilbreth/.claude-plugin/plugin.json
jq -e '.name == "gilbreth"' plugins/gilbreth/package.json
```
Expected: both print `true`.

---

### Task 3: Update the marketplace catalog entry

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Rename the plugin entry** (keep the top-level marketplace `name: "superhuman"`)

In `.claude-plugin/marketplace.json`, change the single `plugins[]` entry from:
```json
    {
      "name": "superhuman",
      "version": "0.3.0",
      "description": "Starter plugin scaffold for the superhuman marketplace",
      "source": "./plugins/superhuman"
    }
```
to:
```json
    {
      "name": "gilbreth",
      "version": "0.3.0",
      "description": "WBS-driven decomposition, planning, and phase-review skills for Tusk-backed projects",
      "source": "./plugins/gilbreth"
    }
```

- [ ] **Step 2: Verify**

Run:
```bash
jq -e '.name == "superhuman" and .plugins[0].name == "gilbreth" and .plugins[0].source == "./plugins/gilbreth" and .plugins[0].version == "0.3.0"' .claude-plugin/marketplace.json
```
Expected: prints `true`.

---

### Task 4: Update release-please config and manifest

**Files:**
- Modify: `release-please-config.json`
- Modify: `.release-please-manifest.json`

- [ ] **Step 1: Rename the package block in `release-please-config.json`**

Change the `"plugins/superhuman"` package block so that:
- the key `"plugins/superhuman"` becomes `"plugins/gilbreth"`,
- `"component": "superhuman"` becomes `"component": "gilbreth"`,
- `"package-name": "superhuman"` becomes `"package-name": "gilbreth"`,
- `"pull-request-title-pattern": "chore(superhuman): release ${version}"` becomes `"pull-request-title-pattern": "chore(gilbreth): release ${version}"`,
- the marketplace `extra-files` jsonpath `$.plugins[?(@.name=="superhuman")].version` becomes `$.plugins[?(@.name=="gilbreth")].version`.

Leave the `"."` (marketplace) block untouched — including `"package-name": "superhuman-marketplace"`.

- [ ] **Step 2: Rename the manifest key, keep the version**

In `.release-please-manifest.json`, change the key `"plugins/superhuman": "0.3.0"` to `"plugins/gilbreth": "0.3.0"`. Leave `".": "0.2.0"` untouched.

- [ ] **Step 3: Verify**

Run:
```bash
jq -e '.packages["plugins/gilbreth"].component == "gilbreth" and (.packages | has("plugins/superhuman") | not)' release-please-config.json
jq -e '(.packages["plugins/gilbreth"]["extra-files"][] | select(.path=="/.claude-plugin/marketplace.json").jsonpath) == "$.plugins[?(@.name==\"gilbreth\")].version"' release-please-config.json
jq -e '."plugins/gilbreth" == "0.3.0" and (has("plugins/superhuman") | not)' .release-please-manifest.json
```
Expected: all three print `true`.

---

### Task 5: Update the two lint layers

**Files:**
- Modify: `commitlint.config.mjs`
- Modify: `.github/workflows/lint-pr-title.yml`

- [ ] **Step 1: Update commitlint scope-enum**

In `commitlint.config.mjs`, change:
```js
    'scope-enum': [2, 'always', ['marketplace', 'superhuman']],
```
to:
```js
    'scope-enum': [2, 'always', ['marketplace', 'gilbreth']],
```
(Leave the file's header comment mentioning "the superhuman marketplace" — that names the marketplace.)

- [ ] **Step 2: Update PR-title scopes**

In `.github/workflows/lint-pr-title.yml`, in the `scopes:` list, change the `superhuman` line to `gilbreth` (keep `marketplace`).

- [ ] **Step 3: Verify**

Run:
```bash
grep -q "marketplace', 'gilbreth'" commitlint.config.mjs && echo OK-commitlint
grep -qE "^\s*gilbreth\s*$" .github/workflows/lint-pr-title.yml && ! grep -qE "^\s*superhuman\s*$" .github/workflows/lint-pr-title.yml && echo OK-prtitle
```
Expected: prints `OK-commitlint` and `OK-prtitle`.

---

### Task 6: Global text replacements inside the plugin and docs

**Files (explicit list — excludes `tusk.toml`, `CHANGELOG.md`, and this plan/spec):**
- `plugins/gilbreth/commands/*.md`
- `plugins/gilbreth/skills/*/SKILL.md`
- `plugins/gilbreth/templates/wbs/*.md`
- `plugins/gilbreth/packs/wbs.toml`
- `plugins/gilbreth/README.md`
- `docs/superpowers/wbs-user-guide.md`
- `docs/superpowers/superhuman-wbs-roadmap.md`

- [ ] **Step 1: Apply the token replacements across the file set**

```bash
FILES=$(printf '%s\n' \
  plugins/gilbreth/commands/*.md \
  plugins/gilbreth/skills/*/SKILL.md \
  plugins/gilbreth/templates/wbs/*.md \
  plugins/gilbreth/packs/wbs.toml \
  plugins/gilbreth/README.md \
  docs/superpowers/wbs-user-guide.md \
  docs/superpowers/superhuman-wbs-roadmap.md)

# Order matters: longer/qualified tokens before the bare path token.
sed -i '' \
  -e 's/superhuman-tusk-v1-migration/website-relaunch/g' \
  -e 's/superhuman-wbs/gilbreth-wbs/g' \
  -e 's/superhuman:/gilbreth:/g' \
  -e 's/Superhuman WBS/Gilbreth WBS/g' \
  -e 's/Superhuman plugin/Gilbreth plugin/g' \
  -e 's|plugins/superhuman|plugins/gilbreth|g' \
  $FILES
```

- [ ] **Step 2: Fix the roadmap's reference to the now-renamed plugin scaffold**

The roadmap's line 2 reads "the empty `superhuman` plugin" as historical narrative. Change the backticked `` `superhuman` `` plugin reference in `docs/superpowers/superhuman-wbs-roadmap.md` to `` `gilbreth` `` so it points at the current name. (Only the inline-code plugin name; leave prose describing past state.)

- [ ] **Step 3: Rename the roadmap file and fix its inbound reference**

```bash
git mv docs/superpowers/superhuman-wbs-roadmap.md docs/superpowers/gilbreth-wbs-roadmap.md
sed -i '' 's|superhuman-wbs-roadmap.md|gilbreth-wbs-roadmap.md|g' docs/superpowers/wbs-user-guide.md
```

- [ ] **Step 4: Verify no stray plugin-identity tokens remain in the file set**

Run:
```bash
grep -rn -E "superhuman:|superhuman-wbs|plugins/superhuman|Superhuman WBS|Superhuman plugin|superhuman-tusk-v1-migration" \
  plugins/gilbreth docs/superpowers/wbs-user-guide.md docs/superpowers/gilbreth-wbs-roadmap.md \
  | grep -v "CHANGELOG.md" || echo "CLEAN"
```
Expected: prints `CLEAN`.

---

### Task 7: Update root README and CONTRIBUTING examples

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Update the root README install command, prose, and plugin-list entry**

In `README.md` (keep the `# superhuman` title — it names the marketplace):
- Change the install command `/plugin install superhuman@superhuman` to `/plugin install gilbreth@superhuman`.
- Change "The second installs the `superhuman` plugin from it." to "The second installs the `gilbreth` plugin from it."
- Change the plugin-list bullet:
  ```markdown
  - **`superhuman`** — starter plugin scaffold. Lives at [`plugins/superhuman/`](plugins/superhuman/).
  ```
  to:
  ```markdown
  - **`gilbreth`** — WBS-driven decomposition, planning, and phase-review skills for Tusk-backed projects. Lives at [`plugins/gilbreth/`](plugins/gilbreth/).
  ```

- [ ] **Step 2: Update CONTRIBUTING example scopes**

In `CONTRIBUTING.md`:
- Change `or any plugin's component name (e.g. `superhuman`).` to `or any plugin's component name (e.g. `gilbreth`).`
- Change the forcing-a-version example `feat(superhuman): promote to stable` to `feat(gilbreth): promote to stable`.

- [ ] **Step 3: Verify**

Run:
```bash
grep -q "gilbreth@superhuman" README.md && ! grep -q "superhuman@superhuman" README.md && echo OK-readme
grep -q "e.g. \`gilbreth\`" CONTRIBUTING.md && grep -q "feat(gilbreth): promote" CONTRIBUTING.md && echo OK-contrib
```
Expected: prints `OK-readme` and `OK-contrib`.

---

### Task 8: Full-repo verification

- [ ] **Step 1: Validate all touched JSON**

Run:
```bash
for f in .claude-plugin/marketplace.json release-please-config.json .release-please-manifest.json \
         plugins/gilbreth/.claude-plugin/plugin.json plugins/gilbreth/package.json; do
  jq . "$f" > /dev/null && echo "OK $f"
done
```
Expected: an `OK` line for each of the five files (no `jq` parse errors).

- [ ] **Step 2: Confirm the marketplace source resolves**

Run:
```bash
test -f "./plugins/gilbreth/.claude-plugin/plugin.json" && echo "source resolves"
test ! -e "./plugins/superhuman" && echo "old dir gone"
```
Expected: prints `source resolves` and `old dir gone`.

- [ ] **Step 3: Confirm only intended `superhuman` references remain**

Run:
```bash
grep -rn "superhuman" . \
  --include="*.md" --include="*.json" --include="*.toml" --include="*.mjs" --include="*.yml" \
  | grep -vE "germanamz/superhuman|superhuman-marketplace|CHANGELOG|docs/superpowers/(specs|plans)/2026-05-20" \
  | grep -vE "\"name\": \"superhuman\"|name = \"superhuman-marketplace\"|# superhuman|superhuman marketplace|\[superhuman\]|@superhuman|tusk\.toml"
```
Expected: returns only the deliberate marketplace-name references — i.e. `marketplace.json` top-level `"name": "superhuman"`, the root README title/marketplace mentions, the install `@superhuman` suffix, the commitlint header comment, and `tusk.toml` workspace/pack stanzas. Eyeball the output: there must be **zero** lines referring to the plugin (`plugins/superhuman`, `superhuman:`, `superhuman-wbs`, a plugin-scoped commit scope). If any plugin reference appears, fix it and re-run.

---

### Task 9: Commit

- [ ] **Step 1: Stage everything and commit**

```bash
git add -A
git commit -m "feat(marketplace)!: rename superhuman plugin to gilbreth

The marketplace's only plugin is the WBS workflow; rename it from the
generic marketplace-named 'superhuman' to 'gilbreth' (after the
work-decomposition pioneers). Plugin content and version (0.3.0) are
unchanged. Marketplace name, repo URL, and the WBS methodology term stay.

BREAKING CHANGE: the plugin install id changes from superhuman@superhuman
to gilbreth@superhuman."
```

- [ ] **Step 2: Verify the commit and tree state**

Run: `git log --oneline -1 && git status --short`
Expected: the rename commit is on top; `git status` is clean (no uncommitted changes).

---

## Notes for the implementer

- **Do not edit** `tusk.toml`, any `CHANGELOG.md`, the root `package.json`/`package-lock.json` (`superhuman-marketplace` stays), or release-please-owned `version` fields beyond the deliberate manifest-key rename in Task 4.
- The single `feat(marketplace)!` PR is intentional: a rename only needs the **marketplace** catalog to bump, and `marketplace` is already a legal commit scope, avoiding a chicken-and-egg with the new `gilbreth` scope. See the design spec for the full rationale.
- After merge, release-please opens a `marketplace` release PR (major bump for the breaking rename); `gilbreth` stays at the seeded 0.3.0 until a future `gilbreth`-scoped commit.
