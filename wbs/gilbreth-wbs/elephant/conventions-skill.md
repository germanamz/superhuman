---
type: wbs-node
title: conventions skill
status: completed
order: 1
level: story
---

# conventions skill

## Outcome

`elephant:conventions` — an auto-invoking skill that is the WBS-agnostic graph-hygiene rulebook for the `knowledge` pack. It makes Tusk's knowledge-modeling discipline explicit whenever the agent reads or writes a knowledge graph, so notes are captured well and stay discoverable for windowed recall. Generalizes gilbreth's `conventions.md` (Tusk-usage parts) without WBS vocabulary; the single source of modeling truth `capture`/`recall`/gilbreth build on.

## Success Criteria

- `plugins/elephant/skills/conventions/SKILL.md` exists with valid frontmatter; `description` auto-invokes on Tusk knowledge-graph interaction (read or write).
- Covers the six rulebook sections (windowed memory; note granularity & kind; create/append/supersede; discoverability; archive semantics; tool discipline).
- Uses only `knowledge`-pack vocabulary (no `wbs-node`/levels/Karpathy); references `references/availability-check.md` instead of restating it.
- Plugin still loads; skill is discoverable.

## Assumptions Made

- The knowledge pack (story 1) is shipped and its `note`/`kind`/`references`/`supersedes` + `tags` model is the vocabulary.

## Open Questions

none — content follows from the shipped pack and gilbreth's conventions; trigger scope (read+write graph interaction) settled.

## Tradeoffs Considered

- Auto-invoking skill (chosen) vs. a passive referenced rulebook: chose auto-invoke because Tusk is unfamiliar to the base model, so proactively surfacing the rules on any graph interaction prevents wrong assumptions; accepts benign trigger overlap with capture/recall.
- Single SKILL.md (chosen) vs. SKILL + split reference docs: chose one skimmable file; availability-check stays its own doc.

## Out of Scope

- `capture`/`recall` logic (stories 3–4); gilbreth's defer-to-elephant refactor (story 5).
- Re-stating the availability-check procedure; any WBS-specific rules.

## Spec note

[[wbs/gilbreth-wbs/elephant/conventions-skill-spec]]

## Plan note

[[wbs/gilbreth-wbs/elephant/conventions-skill-plan]]

## Phasing

No phases needed.

## Tasks

To be decomposed after planning.
