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

Declares canonical, unprefixed Tusk types. Built-in packs (`tags`, `kanban`, `vault`) are seeds you extend via `tusk pack add … --force`, not competitors to avoid.
