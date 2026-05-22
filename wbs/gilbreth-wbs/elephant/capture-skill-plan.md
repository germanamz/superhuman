---
type: wbs-note
title: Plan — capture skill
kind: plan
archived: false
wbs-about: wbs/gilbreth-wbs/elephant/capture-skill
---

# capture skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
>
> **WBS note:** Plan for story `wbs/gilbreth-wbs/elephant/capture-skill`. Spec: [[wbs/gilbreth-wbs/elephant/capture-skill-spec]].

**Goal:** Ship `elephant:capture` — an auto-invoking AND explicitly-invocable skill that proactively writes note-worthy work into the knowledge graph, applying `conventions` and gating on the availability check.

**Architecture:** A single `plugins/elephant/skills/capture/SKILL.md` (rigid write procedure that reads the flexible `conventions` rulebook). One `feat(elephant)` PR; no catalog/release-please changes (`elephant` already registered). `conventions` is on `main`.

**Tech Stack:** Claude Code skill markdown. "Tests" are content-validation commands (`grep`, frontmatter check) plus a manual smoke note.

---

## File structure

PR (`feat(elephant)`):
- Create `plugins/elephant/skills/capture/SKILL.md` — the capture skill
- Modify `plugins/elephant/README.md` — move `capture` from "coming later" to a shipped skill

---

## Task 1: Write the capture SKILL

**Files:**
- Create: `plugins/elephant/skills/capture/SKILL.md`

Read first for grounding: `plugins/elephant/skills/conventions/SKILL.md` (the rules capture applies — reference it, don't restate), `plugins/elephant/references/availability-check.md` (the gate), `plugins/elephant/packs/knowledge.toml` (vocabulary), and `plugins/gilbreth/skills/wbs-orientation/SKILL.md` (tone + how it names MCP/CLI tools). Match the imperative, skimmable tone.

- [ ] **Step 1: Write `SKILL.md` frontmatter exactly**

```markdown
---
name: capture
description: Use proactively to capture note-worthy work into the Tusk knowledge graph so future sessions can recall it — at natural work boundaries (finishing an investigation, before a context switch, task completion) and the moment a hard-won learning, a decision + rationale, a discovered constraint, or an open thread surfaces. Fires regardless of whether the user mentioned Tusk. Also invocable by name to persist learnings on demand (e.g. a subagent before reporting back).
---
```

- [ ] **Step 2: Write the body — intro + procedure + behavior**

Skimmable prose. Cover:

- **One-line intro:** capture is the write side of Tusk-as-memory; it applies the `conventions` rulebook (link it) and gates on `references/availability-check.md` (link it). Both auto-invoking and an explicit entry point.
- **`## Behavior`:** autonomous (writes without per-note approval — asking each time defeats proactive memory) + announced (emit a terse one-line acknowledgment per capture, e.g. `📝 captured learning: <title>`); batch multiple items at a boundary rather than interrupting per item.
- **`## Procedure`** (numbered, rigid):
  1. **Gate.** Run the availability check (`references/availability-check.md`): absent graph → offer `/bootstrap` once then dormant; present → continue silently.
  2. **Identify items.** Enumerate the note-worthy items from the work (or the explicit request); assign each a `kind` (`learning|decision|open-thread|checkpoint`) per `conventions`. Skip trivia that is re-derivable from code/docs.
  3. **Dedup check (lightweight).** For each item, look for an existing note on the same topic — `tusk_query` by `tagged:<topic>` / title match, plus `--semantic`/`semantic` when embeddings are configured. This is a targeted existence check, NOT full retrieval (that's `recall`).
  4. **Create / append / supersede** per `conventions`: new note for a distinct idea; append for the same idea; `archived=true` + a `supersedes` edge to replace an outdated note.
  5. **Model the note** per `conventions`: small + atomic, discoverable title/body, topic `tags`, `[[wikilinks]]` to related notes.
  6. **Write** via MCP (`tusk_node_create` / `tusk_node_modify`, `tusk_edge_add`); MCP-preferred, CLI-fallback.
  7. **Acknowledge** with the terse one-line-per-capture summary; batch at boundaries.
- **`## When NOT to capture`:** trivia, secrets/credentials, or anything re-derivable from the codebase; if no graph and the user already declined `/bootstrap` this session, stay dormant.

Do NOT restate the `conventions` rules or the availability-check procedure — link to them.

- [ ] **Step 3: Verify frontmatter + structure**

```bash
head -5 plugins/elephant/skills/capture/SKILL.md          # name: capture + description
grep -iE 'conventions|availability-check' plugins/elephant/skills/capture/SKILL.md   # links both
grep -iE 'tusk_node_create|tusk_edge_add|tusk_query' plugins/elephant/skills/capture/SKILL.md  # names MCP tools
```
Expected: frontmatter present (`name: capture`, a `description` that mentions both auto + named-entry use); references both `conventions` and `availability-check`; names the MCP write/query tools.

- [ ] **Step 4: Verify WBS-agnostic + no rule duplication**

```bash
grep -iE 'wbs|karpathy|milestone|initiative|level=' plugins/elephant/skills/capture/SKILL.md && echo "LEAK" || echo "clean: no WBS vocabulary"
```
Expected: `clean: no WBS vocabulary`. Also eyeball that it links to `conventions` rather than re-listing the modeling rules.

- [ ] **Step 5: Commit**

```bash
git add plugins/elephant/skills/capture/SKILL.md
git commit -m "feat(elephant): add capture skill"
```

---

## Task 2: Update the plugin README

**Files:**
- Modify: `plugins/elephant/README.md`

- [ ] **Step 1: Move `capture` to a shipped skill**

In `### Skills`, list `capture` as shipped and leave only `recall` under "coming in later stories":
```markdown
### Skills
- `conventions` — auto-invoking graph-hygiene rulebook for the knowledge pack.
- `capture` — proactively writes note-worthy work (learnings, decisions, open-threads, checkpoints) into the graph; auto-invoking and invocable by name.
- _Coming in a later story_: `recall` (windowed retrieval).
```

- [ ] **Step 2: Commit**

```bash
git add plugins/elephant/README.md
git commit -m "docs(elephant): list capture skill in README"
```

---

## Task 3: Open the PR (controller)

- [ ] **Step 1: Push + open**

```bash
git push -u origin feat/elephant-capture
gh pr create --title "feat(elephant): add capture skill" --body "<summary + link to story>"
```
Expected: `lint-commits` + `lint-pr-title` pass (`elephant` scope already on `main`).

---

## Post-merge

Flip the story to `completed` on this PR's branch (single-PR story; completion bump rides it). release-please opens an `elephant` release PR.

## Out of scope (later stories)

- `recall` (story 4) — capture's dedup is deliberately lightweight; full retrieval is recall.
- gilbreth defer-to-elephant refactor (story 5).
- Restating `conventions` rules or the availability-check procedure (link them).
