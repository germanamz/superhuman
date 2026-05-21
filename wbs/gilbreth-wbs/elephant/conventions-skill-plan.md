---
type: wbs-note
title: Plan — conventions skill
kind: plan
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/conventions-skill
---

# conventions skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **WBS note:** Plan for story `wbs/gilbreth-wbs/elephant/conventions-skill`. Spec: [[wbs/gilbreth-wbs/elephant/conventions-skill-spec]].

**Goal:** Ship `elephant:conventions`, an auto-invoking SKILL that is the WBS-agnostic graph-hygiene rulebook for the `knowledge` pack.

**Architecture:** A single skimmable `plugins/elephant/skills/conventions/SKILL.md` (reference/flexible skill). One `feat(elephant)` PR; `elephant` is already registered in the marketplace, so no catalog/release-please changes are needed.

**Tech Stack:** Claude Code skill markdown (YAML frontmatter + body). "Tests" are content-validation commands (`grep`, frontmatter check).

---

## File structure

PR (`feat(elephant)`):
- Create `plugins/elephant/skills/conventions/SKILL.md` — the rulebook skill
- Modify `plugins/elephant/README.md` — move `conventions` from "coming in later stories" to a shipped skill

---

## Task 1: Write the conventions SKILL

**Files:**
- Create: `plugins/elephant/skills/conventions/SKILL.md`

Ground the prose in two existing sources (read them first): `plugins/gilbreth/templates/wbs/conventions.md` (the Tusk-usage discipline to generalize — strip all WBS vocabulary) and `plugins/elephant/packs/knowledge.toml` + `plugins/elephant/references/availability-check.md` (the exact vocabulary: `note` type, `kind` enum `learning|decision|open-thread|checkpoint`, `references`/`supersedes` edges, the `tags` pack). Match the skimmable, imperative tone of gilbreth's `wbs-orientation` SKILL.

- [ ] **Step 1: Write `SKILL.md` frontmatter exactly**

```markdown
---
name: conventions
description: Use whenever about to read or write a Tusk knowledge graph — creating, editing, linking, tagging, or archiving `note`s, or querying the graph. Auto-invokes to surface Elephant's knowledge-modeling rules (Tusk is not a default-known tool): how to size and kind a note, when to create vs append vs supersede, how to keep notes discoverable for windowed recall, and archive/tool discipline.
---
```

- [ ] **Step 2: Write the body — six sections**

Write skimmable prose (headings + tight bullets), WBS-agnostic, grounded as above. Each section must cover:

1. `## Windowed memory` — the why: capture broadly, keep each note small and atomic (one idea), recall narrowly. The graph + indexation is what makes broad capture compatible with a small context window. This is the load-bearing principle.
2. `## Note granularity & kind` — one idea per `note`. How to choose `kind`: `learning` (a durable non-obvious finding), `decision` (a choice + its rationale), `open-thread` (an unresolved question / loose end), `checkpoint` (a "where I left off / start here next" summary at a work boundary).
3. `## Create vs. append vs. supersede` — write a NEW note for a distinct idea; APPEND to an existing note only when adding to the same idea; when a note is wrong/outdated, set `archived=true` and create a replacement linked with a `supersedes` edge (append-only history — never silently rewrite a superseded fact).
4. `## Discoverability` — write titles and bodies the indexer and semantic search can find (state the topic explicitly, avoid pronouns-only); link related notes with `[[wikilinks]]` (materialize `references` edges); tag topics via the `tags` pack so "everything about X" is queryable by `tagged`. The point: future agents recall narrowly because notes are well-titled, linked, and tagged.
5. `## Archive, don't delete` — `archived=true` is the soft-delete/supersede marker; never hard-delete a note (history is the value). Querying excludes archived by default.
6. `## Tool discipline` — MCP-preferred / CLI-fallback (the MCP server may hold the write lock; prefer `tusk_*` MCP tools). For "is there a graph here?" and the bootstrap-offer behavior, point to `references/availability-check.md` (do NOT restate it).

Add a one-line intro stating this is the WBS-agnostic rulebook for the `knowledge` pack, read/built-on by `capture`, `recall`, and (later) gilbreth.

- [ ] **Step 3: Verify frontmatter + content**

```bash
head -5 plugins/elephant/skills/conventions/SKILL.md   # name + description present
grep -c '^## ' plugins/elephant/skills/conventions/SKILL.md   # expect 6
grep -i 'availability-check' plugins/elephant/skills/conventions/SKILL.md   # references the doc
```
Expected: frontmatter has `name: conventions` + a `description:`; six `##` sections; one reference to `availability-check`.

- [ ] **Step 4: Verify WBS-agnostic (no leaked vocabulary)**

```bash
grep -iE 'wbs|karpathy|milestone|initiative|decompos|phase-plan|level=' plugins/elephant/skills/conventions/SKILL.md && echo "LEAK — remove WBS terms" || echo "clean: no WBS vocabulary"
```
Expected: `clean: no WBS vocabulary`. If anything matches, rewrite that line generically.

- [ ] **Step 5: Commit**

```bash
git add plugins/elephant/skills/conventions/SKILL.md
git commit -m "feat(elephant): add conventions rulebook skill"
```

---

## Task 2: Update the plugin README

**Files:**
- Modify: `plugins/elephant/README.md`

- [ ] **Step 1: Move `conventions` to a shipped skill**

In the `### Skills` section, remove `conventions` from the "coming in later stories" line and list it as shipped, e.g.:
```markdown
### Skills
- `conventions` — auto-invoking graph-hygiene rulebook for the knowledge pack (how to model and recall knowledge well).
- _Coming in later stories_: `capture` (broad note capture), `recall` (windowed retrieval).
```
Also add `skills/` to the `## Layout` section if it isn't already listed.

- [ ] **Step 2: Commit**

```bash
git add plugins/elephant/README.md
git commit -m "docs(elephant): list conventions skill in README"
```

---

## Task 3: Open the PR

- [ ] **Step 1: Push and open** (controller handles)

```bash
git push -u origin <branch>
gh pr create --title "feat(elephant): add conventions rulebook skill" --body "<summary + link to story>"
```
Expected: `lint-commits` + `lint-pr-title` pass (the `elephant` scope is already on `main`, so no scope risk this time).

---

## Post-merge

Mark the story `completed` on this PR's branch (last commit flips status), per the WBS completion rule — this story is a single PR, so the completion bump rides it directly. release-please opens an `elephant` patch/minor release PR.

## Out of scope (later stories)

- `capture` (story 3), `recall` (story 4) — they will reference this skill.
- gilbreth's defer-to-elephant refactor (story 5).
