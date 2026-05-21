---
name: conventions
description: Use whenever about to read or write a Tusk knowledge graph — creating, editing, linking, tagging, or archiving `note`s, or querying the graph. Auto-invokes to surface Elephant's knowledge-modeling rules (Tusk is not a default-known tool): how to size and kind a note, when to create vs append vs supersede, how to keep notes discoverable for windowed recall, and archive/tool discipline.
---

# Conventions

This is the graph-hygiene rulebook for the `knowledge` pack — generic across all project types. `capture`, `recall`, and gilbreth build on these rules — read this first whenever you touch a Tusk knowledge graph.

## Windowed memory

The core principle: **capture broadly, keep each note small and atomic, recall narrowly.**

- A context window is finite. The graph + full-text/semantic index is what makes broad capture compatible with that limit: future agents can retrieve exactly the few notes relevant to the current moment without pulling in everything.
- "One idea per note" is load-bearing here. A sprawling note that covers three learnings plus a decision means every recall hit drags in unneeded context.
- Write notes at the boundary of knowledge, not in bulk afterward. A note written while the insight is fresh is richer and more precise than a retcon.

## Note granularity & kind

Every `note` should capture exactly one idea. Choose `kind` by the nature of that idea:

- `learning` — a durable, non-obvious finding: something you learned that would surprise the agent on a cold read. Not ephemeral state; something worth knowing next session.
- `decision` — a choice that was made, plus its rationale. Records not just *what* was decided but *why*, so it isn't re-litigated.
- `open-thread` — an unresolved question or loose end. Exists to prevent forgetting; resolved by archiving it (with a note on how it closed) or superseding it with a `learning` or `decision`.
- `checkpoint` — a "where I left off / start here next" summary, written at a natural work boundary (end of session, end of a phase). Orients the next agent picking up the thread.

When in doubt: if it's a fact you learned, `learning`; if it's a fork you chose, `decision`; if it's still open, `open-thread`; if it's a handoff marker, `checkpoint`.

## Create vs. append vs. supersede

- **Create a new note** when you have a distinct idea not yet captured. Default to new.
- **Append to an existing note** only when you're adding detail to the *same* idea — same event, same decision, same open thread. This is the exception, not the rule.
- **Supersede** when a note is wrong or outdated:
  1. Set `archived=true` on the old note.
  2. Create a replacement note.
  3. Add a `supersedes` edge from the new note to the old one.
  This preserves append-only history — never silently rewrite a superseded fact. The old note stays queryable (with `archived:true` in the filter) for lineage.

Never edit a note's body to reverse a past finding without superseding it first.

## Discoverability

Future agents recall narrowly *because* notes are well-titled, linked, and tagged. That doesn't happen automatically.

- **Titles and bodies:** state the topic explicitly. Avoid pronouns-only bodies ("it was wrong", "we fixed it"). Name the thing. The full-text and semantic indexer works on what you write.
- **Link related notes with `[[wikilinks]]`.** A wikilink materializes a `references` edge in the graph, making "what does this note relate to" queryable without re-reading every note.
- **Tag topics via the `tags` pack.** A `tagged` edge from a note to a `tag` node makes "everything about X" a single query (`tusk_query 'tagged:<tag>'`). Tag broadly — tags cost nothing and pay for themselves at recall time.

The test: would a fresh agent reading only the title and first sentence know what this note is about? If not, revise.

## Archive, don't delete

- `archived=true` is the soft-delete and supersede marker. Set it; never hard-delete a note.
- Queries exclude archived notes by default. That's intentional — archived notes are background history, not foreground context.
- The history *is* the value. Knowing that a decision was made, then reversed, then re-made under new constraints is richer than having only the current state. Hard deletes destroy that lineage.
- "Archive" means `archived=true` on the note — not removal from the graph, not a separate archive workspace.

## Tool discipline

MCP-preferred, CLI-fallback. The MCP server may hold the write lock; prefer `tusk_*` MCP tools (`tusk_node_create`, `tusk_node_modify`, `tusk_edge_add`, `tusk_query`, etc.) and fall back to the equivalent `tusk` CLI verbs only when the MCP server is unreachable.

For the "is a knowledge graph present?" probe and the bootstrap-offer behavior, see `references/availability-check.md` — that procedure is the canonical gate for `capture` and `recall`; do not restate it here.
