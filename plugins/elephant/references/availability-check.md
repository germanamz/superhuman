# Availability check

Both `capture` and `recall` gate on this before touching the graph.

## Procedure

1. **Probe for the core pack.** Query the `note` type:
   - MCP: `tusk_query type=note take=1`
   - CLI: `tusk query 'type:note' --take 1`
   An "unknown node type" / undeclared-type error means the `core` pack is NOT installed. A success (even zero rows) means it is.

2. **If present:** proceed silently. Operate on the graph.

3. **If absent:** emit the bootstrap offer ONCE per session:

   > No knowledge graph here yet. Run `/bootstrap` to let me start keeping notes for this workspace, or I'll stay quiet about it for now.

   Record that the offer was made. If the user declines (or doesn't act), go **dormant for the session** — do not re-offer, do not re-probe on every note-worthy moment.

## Notes

- MCP-preferred, CLI-fallback (the MCP server may hold the write lock; prefer MCP tools).
- "Once per session" is per Elephant skill activation context; mirror wbs-orientation's once-per-session degraded-mode hint discipline.
