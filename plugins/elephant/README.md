# elephant

Makes Tusk the agent's short-to-medium-term memory keeper. Capture learnings broadly into a knowledge graph and recall them narrowly (windowed) so knowledge transfers seamlessly across sessions.

## What ships

### Commands
- `/bootstrap` — initialize a Tusk workspace and install the `knowledge` + `tags` packs.

### Packs
- `packs/knowledge.toml` — a generic, WBS-agnostic knowledge graph: a `note` type (`kind`: learning | decision | open-thread | checkpoint) with `references` (wikilink-materialized) and `supersedes` edges. Requires Tusk v1.4.0+.

### Skills
- `conventions` — auto-invoking graph-hygiene rulebook for the knowledge pack.
- `capture` — proactively writes note-worthy work (learnings, decisions, open-threads, checkpoints) into the graph; auto-invoking and invocable by name.
- `recall` — pulls the relevant windowed slice of prior knowledge into context when needed; auto-invoking and invocable by name.

## Layout

- `commands/` — slash commands (one Markdown file per command)
- `packs/` — Tusk type packs (TOML) installed by `/bootstrap`
- `references/` — shared procedure docs the skills read (e.g. `references/availability-check.md`, the present/absent gate `capture` and `recall` run before touching the graph)
- `skills/` — auto-invoking skills (one directory per skill, each containing a `SKILL.md`)

## Conventions

Declares canonical, unprefixed Tusk types. Built-in packs (`tags`, `kanban`, `vault`) are seeds you extend via `tusk pack add … --force`, not competitors to avoid.
