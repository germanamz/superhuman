---
type: wbs-note
title: Plan — knowledge pack + /bootstrap + availability check
kind: plan
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/knowledge-pack
---

# Knowledge pack + /bootstrap + availability check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **WBS note:** This plan is the `kind=plan` note for story `wbs/gilbreth-wbs/elephant/knowledge-pack`. Tasks below become `level=task` child wbs-nodes via `/wbs-new … task=wbs/gilbreth-wbs/elephant/knowledge-pack`. Spec: [[wbs/gilbreth-wbs/elephant/knowledge-pack-spec]].

**Goal:** Scaffold the `elephant` plugin and ship its generic `knowledge` Tusk pack (`note` type + `references`/`supersedes` edges), a `/bootstrap` command, and a shared availability-check doc — registered in the marketplace and release-please.

**Architecture:** A new inline plugin under `plugins/elephant/` following the gilbreth plugin's layout. The pack declares unprefixed canonical types per the cross-plugin convention; `references` uses Tusk v1.4.0's `wikilinks = true` flag. Work lands as **two squash PRs** by scope: PR-A `feat(elephant)` (plugin + pack + command + doc + release-please onboarding), PR-B `feat(marketplace)` (catalog entry).

**Tech Stack:** Claude Code plugin manifests (JSON), Tusk v1.4.0 type pack (TOML), markdown command/skill docs, release-please + commitlint config. "Tests" are validation commands (`jq`, `tusk doctor`, `tusk pack add`, wikilink probe, `npx commitlint`).

---

## File structure

PR-A (`feat(elephant)`):
- Create `plugins/elephant/.claude-plugin/plugin.json` — plugin manifest (version 0.0.0)
- Create `plugins/elephant/package.json` — release-please package (version 0.0.0)
- Create `plugins/elephant/packs/knowledge.toml` — the knowledge type pack
- Create `plugins/elephant/commands/bootstrap.md` — `/bootstrap` command
- Create `plugins/elephant/references/availability-check.md` — shared availability-check procedure
- Create `plugins/elephant/README.md` — plugin overview
- Modify `release-please-config.json` — add `plugins/elephant` package entry
- Modify `.release-please-manifest.json` — seed `"plugins/elephant": "0.0.0"`
- Modify `commitlint.config.mjs` — add `elephant` to `scope-enum`
- Modify `.github/workflows/lint-pr-title.yml` — add `elephant` to `scopes`

PR-B (`feat(marketplace)`):
- Modify `.claude-plugin/marketplace.json` — append `elephant` to `plugins[]`

---

## Task 1: Scaffold the elephant plugin manifest

**Files:**
- Create: `plugins/elephant/.claude-plugin/plugin.json`
- Create: `plugins/elephant/package.json`

- [ ] **Step 1: Write `plugins/elephant/.claude-plugin/plugin.json`**

```json
{
  "name": "elephant",
  "description": "Makes Tusk the agent's short-to-medium-term memory keeper: capture learnings broadly into a knowledge graph and recall them narrowly (windowed) so knowledge transfers seamlessly across sessions.",
  "version": "0.0.0",
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

- [ ] **Step 2: Write `plugins/elephant/package.json`**

```json
{ "name": "elephant", "version": "0.0.0", "private": true }
```

- [ ] **Step 3: Validate JSON**

Run: `jq . plugins/elephant/.claude-plugin/plugin.json plugins/elephant/package.json`
Expected: both pretty-print with no parse error; `version` is `"0.0.0"` in each.

- [ ] **Step 4: Commit**

```bash
git add plugins/elephant/.claude-plugin/plugin.json plugins/elephant/package.json
git commit -m "feat(elephant): scaffold plugin manifest"
```

---

## Task 2: Create the knowledge pack

**Files:**
- Create: `plugins/elephant/packs/knowledge.toml`

- [ ] **Step 1: Write `plugins/elephant/packs/knowledge.toml`**

```toml
# Elephant — knowledge type pack
#
# A generic, WBS-agnostic knowledge graph for capturing learnings as the
# agent's short-to-medium-term memory. Declares canonical, UNPREFIXED types
# per the cross-plugin convention (built-in packs are seeds extended via
# `--force`, not collisions to avoid).
#
# Minimum Tusk version: v1.4.0 — the `references` edge uses the
# `wikilinks = true` flag to mark itself as the wikilink-materialization
# target (configurable as of v1.4.0; in v1.3.0 the materializer hard-coded
# the edge name `references`).
#
# Composition: layer the built-in `tags` pack (`tusk pack add tags`) for
# topics (`tag` nodes + `tagged` edge). `references` is `--force`-safe
# against the vault/WBS packs because the declaration is identical.

[node-types.note]
description = "A captured knowledge note — a learning, decision, open thread, or checkpoint"
properties = [
    { name = "kind",     type = "enum", values = ["learning","decision","open-thread","checkpoint"] },
    { name = "archived", type = "bool" },
]

[edge-types.references]
description = "Implicit edge materialized from body [[wikilinks]]. `wikilinks = true` marks this edge as the materialization target (Tusk v1.4.0)."
from        = ["*"]
to          = ["*"]
cardinality = "many-to-many"
ordered     = false
acyclic     = false
inverse     = "referenced-by"
wikilinks   = true

[edge-types.supersedes]
description = "This note replaces a prior note (append-only knowledge history)"
from        = ["note"]
to          = ["note"]
cardinality = "many-to-one"
ordered     = false
acyclic     = true
inverse     = "superseded-by"
```

- [ ] **Step 2: Verify the pack loads in a scratch workspace**

```bash
TMP=$(mktemp -d) && cd "$TMP" && git init -q && tusk init --name elephant-pack-test
tusk pack add tags
tusk pack add "file://$OLDPWD/plugins/elephant/packs/knowledge.toml"
tusk doctor
```
Expected: `tusk doctor` reports `doctor: no issues` (a legacy `[undeclared-property] … status` warning, if any, is tolerable per the gilbreth precedent).

- [ ] **Step 3: Verify the `wikilinks = true` materialization works (the v1.4.0 assumption)**

```bash
printf '# t1\nSee [[notes/t2]].\n' | tusk node create --type note --path notes/t1.md --prop kind=learning
printf '# t2\n' | tusk node create --type note --path notes/t2.md --prop kind=learning
tusk edge list --from notes/t1
```
Expected: a `references` edge from `notes/t1` to `notes/t2` appears (materialized from the `[[notes/t2]]` wikilink). If it does NOT, the `wikilinks` key name is wrong for this Tusk build — STOP and confirm the exact flag via `tusk` docs / the v1.4.0 changelog (issue #410) before proceeding.

- [ ] **Step 4: Verify `supersedes`**

```bash
tusk edge add --type supersedes --source notes/t2 --target notes/t1
tusk edge list --from notes/t2
```
Expected: a `supersedes` edge from `notes/t2` to `notes/t1`. Then `cd - && rm -rf "$TMP"`.

- [ ] **Step 5: Commit**

```bash
git add plugins/elephant/packs/knowledge.toml
git commit -m "feat(elephant): add knowledge type pack"
```

---

## Task 3: Create the /bootstrap command

**Files:**
- Create: `plugins/elephant/commands/bootstrap.md`

Model on `plugins/gilbreth/commands/wbs-bootstrap.md` (same idempotent shape).

- [ ] **Step 1: Write `plugins/elephant/commands/bootstrap.md`**

````markdown
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
````

- [ ] **Step 2: Validate frontmatter present**

Run: `head -4 plugins/elephant/commands/bootstrap.md`
Expected: a YAML frontmatter block with `description:` and `argument-hint:`.

- [ ] **Step 3: Commit**

```bash
git add plugins/elephant/commands/bootstrap.md
git commit -m "feat(elephant): add /bootstrap command"
```

---

## Task 4: Create the shared availability-check doc

**Files:**
- Create: `plugins/elephant/references/availability-check.md`

Resolves the spec's open question: the procedure lives in its own `references/` doc (decoupled from the `conventions` skill, which ships in a later story). `capture` and `recall` will link to it.

- [ ] **Step 1: Write `plugins/elephant/references/availability-check.md`**

```markdown
# Availability check

Both `capture` and `recall` gate on this before touching the graph.

## Procedure

1. **Probe for the knowledge pack.** Query the `note` type:
   - MCP: `tusk_query type=note take=1`
   - CLI: `tusk query 'type:note' --take 1`
   An "unknown node type" / undeclared-type error means the `knowledge` pack is NOT installed. A success (even zero rows) means it is.

2. **If present:** proceed silently. Operate on the graph.

3. **If absent:** emit the bootstrap offer ONCE per session:

   > No knowledge graph here yet. Run `/bootstrap` to let me start keeping notes for this workspace, or I'll stay quiet about it for now.

   Record that the offer was made. If the user declines (or doesn't act), go **dormant for the session** — do not re-offer, do not re-probe on every note-worthy moment.

## Notes

- MCP-preferred, CLI-fallback (the MCP server may hold the write lock; prefer MCP tools).
- "Once per session" is per Elephant skill activation context; mirror wbs-orientation's once-per-session degraded-mode hint discipline.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/elephant/references/availability-check.md
git commit -m "feat(elephant): add shared availability-check doc"
```

---

## Task 5: Plugin README

**Files:**
- Create: `plugins/elephant/README.md`

- [ ] **Step 1: Write `plugins/elephant/README.md`**

```markdown
# elephant

Makes Tusk the agent's short-to-medium-term memory keeper. Capture learnings broadly into a knowledge graph and recall them narrowly (windowed) so knowledge transfers seamlessly across sessions.

## What ships

### Commands
- `/bootstrap` — initialize a Tusk workspace and install the `knowledge` + `tags` packs.

### Packs
- `packs/knowledge.toml` — a generic, WBS-agnostic knowledge graph: a `note` type (`kind`: learning | decision | open-thread | checkpoint) with `references` (wikilink-materialized) and `supersedes` edges. Requires Tusk v1.4.0+.

### Skills
- _Coming in later stories_: `conventions` (graph-hygiene rulebook), `capture` (broad note capture), `recall` (windowed retrieval).

## Conventions

Declares canonical, unprefixed Tusk types. Built-in packs (`tags`, `kanban`, `vault`) are seeds you extend via `tusk pack add … --force`, not collisions to avoid.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/elephant/README.md
git commit -m "docs(elephant): add plugin README"
```

---

## Task 6: Register with release-please + lint scopes

**Files:**
- Modify: `release-please-config.json`
- Modify: `.release-please-manifest.json`
- Modify: `commitlint.config.mjs`
- Modify: `.github/workflows/lint-pr-title.yml`

- [ ] **Step 1: Add the package entry to `release-please-config.json`** (inside `packages`, after the `plugins/gilbreth` block)

```json
    "plugins/elephant": {
      "component": "elephant",
      "package-name": "elephant",
      "changelog-path": "CHANGELOG.md",
      "pull-request-title-pattern": "chore(elephant): release ${version}",
      "extra-files": [
        {
          "type": "json",
          "path": ".claude-plugin/plugin.json",
          "jsonpath": "$.version"
        },
        {
          "type": "json",
          "path": "/.claude-plugin/marketplace.json",
          "jsonpath": "$.plugins[?(@.name==\"elephant\")].version"
        }
      ]
    }
```

- [ ] **Step 2: Seed `.release-please-manifest.json`**

```json
{
  ".": "0.3.0",
  "plugins/gilbreth": "0.4.0",
  "plugins/elephant": "0.0.0"
}
```

- [ ] **Step 3: Add `elephant` to the commitlint `scope-enum`**

In `commitlint.config.mjs`, change the scope-enum line to:
```js
    'scope-enum': [2, 'always', ['marketplace', 'gilbreth', 'elephant']],
```

- [ ] **Step 4: Add `elephant` to the lint-pr-title `scopes`**

In `.github/workflows/lint-pr-title.yml`, the `scopes:` block becomes:
```yaml
          scopes: |
            marketplace
            gilbreth
            elephant
```

- [ ] **Step 5: Validate**

Run: `jq . release-please-config.json .release-please-manifest.json && node -e "import('./commitlint.config.mjs').then(m=>console.log(m.default.rules['scope-enum'][2]))"`
Expected: both JSON files parse; the printed array includes `elephant`.

- [ ] **Step 6: Commit**

```bash
git add release-please-config.json .release-please-manifest.json commitlint.config.mjs .github/workflows/lint-pr-title.yml
git commit -m "feat(elephant): onboard elephant to release-please and lint scopes"
```

---

## Task 7: Open PR-A

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin <branch>
gh pr create --title "feat(elephant): scaffold elephant plugin with knowledge pack" --body "<summary + link to story wbs/gilbreth-wbs/elephant/knowledge-pack>"
```

- [ ] **Step 2: Watch the required checks**

Run: `gh pr checks --watch`
Expected: `lint-commits` and `lint-pr-title` pass.
**Known risk:** `lint-pr-title` may evaluate the `scopes` list from `main` (base branch), where `elephant` isn't present yet, and reject the `feat(elephant)` title. If it fails for that reason: either (a) land the scope additions (Task 6 steps 3–4) as a tiny precursor `chore(marketplace)` PR first, then rebase PR-A; or (b) confirm the action reads the head ref and retry. Do NOT `--no-verify`-bypass; the CI checks are unbypassable.

---

## Task 8: Register in the marketplace (PR-B, separate scope)

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Branch from main** (after PR-A merges, so the catalog points at a real plugin dir)

```bash
git checkout main && git pull && git checkout -b feat/register-elephant
```

- [ ] **Step 2: Append to `plugins[]` in `.claude-plugin/marketplace.json`**

```json
    {
      "name": "elephant",
      "version": "0.0.0",
      "description": "Makes Tusk the agent's short-to-medium-term memory keeper: capture learnings broadly into a knowledge graph and recall them narrowly across sessions.",
      "source": "./plugins/elephant"
    }
```

- [ ] **Step 3: Validate**

Run: `jq '.plugins[] | select(.name=="elephant") | .source' .claude-plugin/marketplace.json && test -f plugins/elephant/.claude-plugin/plugin.json && echo "source resolves"`
Expected: prints `"./plugins/elephant"` and `source resolves`.

- [ ] **Step 4: Commit, push, open PR-B**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat(marketplace): register elephant plugin"
git push -u origin feat/register-elephant
gh pr create --title "feat(marketplace): register elephant plugin" --body "Registers the elephant plugin scaffolded in PR-A."
```

---

## Post-merge

After both PRs merge, release-please opens two release PRs: `elephant` (0.0.0 → 0.1.0, tag `elephant-v0.1.0`) and `marketplace` (catalog bump). Merge both to publish. Then mark this story `completed` on its own PR per the WBS "Marking a node completed" convention — i.e., the status bump rides PR-A (the plugin work), not a later story's branch.

## Out of scope (deferred to later stories)

- `conventions`, `capture`, `recall` skill logic.
- Stripping `wbs-` prefixes from gilbreth (story #5).
- `[embeddings]` configuration.
