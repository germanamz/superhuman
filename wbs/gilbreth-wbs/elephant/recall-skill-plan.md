---
type: wbs-note
title: Plan — recall skill
kind: plan
wbs-about: wbs/gilbreth-wbs/elephant/recall-skill
archived: false
---

# recall skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
>
> **WBS note:** Plan for story `wbs/gilbreth-wbs/elephant/recall-skill`. Spec: [[wbs/gilbreth-wbs/elephant/recall-skill-spec]].

**Goal:** Ship `elephant:recall` — an auto-invoking (need-driven) AND explicitly-invocable skill that pulls a narrow, windowed slice of the knowledge graph into context when the agent needs it.

**Architecture:** A single `plugins/elephant/skills/recall/SKILL.md` (rigid retrieval procedure that reads the flexible `conventions` rulebook, gates on the availability check). One `feat(elephant)` PR; no catalog/release-please changes (`elephant` already registered). `conventions` + `capture` are on `main`.

**Tech Stack:** Claude Code skill markdown. "Tests" are content-validation commands (`grep`, frontmatter check) + a manual smoke.

---

## File structure

PR (`feat(elephant)`):
- Create `plugins/elephant/skills/recall/SKILL.md` — the recall skill
- Modify `plugins/elephant/README.md` — move `recall` from "coming later" to a shipped skill (completes the skill trio)

---

## Task 1: Write the recall SKILL

**Files:**
- Create: `plugins/elephant/skills/recall/SKILL.md`

Read first for grounding: `plugins/elephant/skills/conventions/SKILL.md` (rules — link, don't restate), `plugins/elephant/skills/capture/SKILL.md` (match its tone + structure; recall is its read-side mirror), `plugins/elephant/references/availability-check.md` (the gate), `plugins/elephant/packs/knowledge.toml` (vocabulary). Match the imperative, skimmable tone.

- [ ] **Step 1: Write `SKILL.md` frontmatter exactly**

```markdown
---
name: recall
description: Use whenever you need context or background to proceed — regardless of whether the user asked — to pull the relevant slice of prior knowledge from the Tusk knowledge graph into the window. Fires when starting a substantive piece of work, switching to a new topic, or hitting a question prior sessions may have answered. Pulls a narrow, windowed slice (not the whole graph). Also invocable by name ("what do we know about X?").
---
```

- [ ] **Step 2: Write the body — intro + behavior + procedure**

Skimmable prose. Cover:

- **One-line intro:** recall is the read side of Tusk-as-memory and the windowed mirror of `capture` (link it); it applies the `conventions` rulebook (link `../conventions/SKILL.md`) and gates on `../../references/availability-check.md` (link). Both auto-invoking (need-driven) and an explicit entry point.
- **`## When to recall`:** the need-driven trigger — recall when you need context to proceed, regardless of whether the user asked (starting work, context switch, a question prior sessions may have captured). NOT a per-turn reflex (that floods context and defeats windowed memory). A once-per-slice guard: don't re-pull a slice already recalled this session.
- **`## Procedure`** (numbered, rigid):
  1. **Gate.** Availability check ([`references/availability-check.md`](../../references/availability-check.md)): absent → offer `/bootstrap` once then dormant; present → continue.
  2. **Frame the need.** Derive the topic/query from what you're about to do (or the explicit request).
  3. **Once-per-slice guard.** If already recalled this slice this session, skip.
  4. **Structural query** via MCP `tusk_query` — `tagged:<topic>`, recent `checkpoint`s, `references`-linked notes; exclude `archived`.
  5. **Semantic query** when `[embeddings]` is configured (`tusk_query … --semantic '<need>'` / MCP `semantic`); else emit a one-time degraded hint and skip this step. Never block on its absence.
  6. **Merge + window.** Union, de-dupe, exclude `archived`, cap at a small N — a slice, not the graph.
  7. **Surface + use.** Announce a terse summary (e.g. `🧠 recalled 3 notes on <topic>: …`), then proceed using the recalled notes. If nothing matched, say so briefly and proceed — never fabricate.
- **`## Degraded mode`:** one sentence — without `[embeddings]`, structural recall still runs; the semantic step is skipped with a one-time hint (mirrors the wbs-orientation degraded-mode discipline).

Do NOT restate the `conventions` rules or the availability-check procedure — link them.

- [ ] **Step 3: Verify frontmatter + structure**

```bash
head -5 plugins/elephant/skills/recall/SKILL.md      # name: recall + description (need-driven + named entry)
grep -iE 'conventions|availability-check|capture' plugins/elephant/skills/recall/SKILL.md   # links peers
grep -iE 'tusk_query|semantic|tagged|archived' plugins/elephant/skills/recall/SKILL.md      # query mechanics
```
Expected: frontmatter present; links `conventions`/`availability-check`/`capture`; names the structural+semantic query mechanics, archived exclusion.

- [ ] **Step 4: Verify WBS-agnostic + no rule duplication**

```bash
grep -iE 'wbs|karpathy|milestone|initiative|level=' plugins/elephant/skills/recall/SKILL.md && echo "LEAK" || echo "clean: no WBS vocabulary"
```
Expected: `clean: no WBS vocabulary`. Also eyeball that it links to `conventions` rather than re-listing modeling rules.

- [ ] **Step 5: Commit**

```bash
git add plugins/elephant/skills/recall/SKILL.md
git commit -m "feat(elephant): add recall skill"
```

---

## Task 2: Update the plugin README

**Files:**
- Modify: `plugins/elephant/README.md`

- [ ] **Step 1: List `recall` as shipped (completes the trio)**

In `### Skills`, list all three as shipped and remove the "coming later" line:
```markdown
### Skills
- `conventions` — auto-invoking graph-hygiene rulebook for the knowledge pack.
- `capture` — proactively writes note-worthy work into the graph; auto-invoking and invocable by name.
- `recall` — pulls the relevant windowed slice of prior knowledge into context when needed; auto-invoking and invocable by name.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/elephant/README.md
git commit -m "docs(elephant): list recall skill in README"
```

---

## Task 3: Open the PR (controller)

- [ ] **Step 1: Push + open**

```bash
git push -u origin feat/elephant-recall
gh pr create --title "feat(elephant): add recall skill" --body "<summary + link to story>"
```
Expected: `lint-commits` + `lint-pr-title` pass (`elephant` scope already on `main`).

---

## Post-merge

Flip the story to `completed` on this PR's branch (single-PR story). release-please opens an `elephant` release PR. With this story done, only story #5 (gilbreth refactor) remains in the initiative.

## Out of scope (later story)

- gilbreth's defer-to-elephant refactor + prefix removal (story 5).
- Restating `conventions` rules or the availability-check procedure (link them).
- `[embeddings]` configuration — recall only degrades gracefully without it.
