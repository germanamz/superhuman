# Recommended WBS Taxonomy

This is the recommended Tusk taxonomy for the Superhuman WBS:

```
[[milestone], [initiative], [story], [task, spike]]
```

Four ranks, with `task` and `spike` sharing the lowest rank. WBS Project maps to a Tusk Project (a container, not a task), so it doesn't appear in the rank list.

## Apply the taxonomy

### Workspace-wide (recommended for most users)

Edit `tusk.toml` (typically at `~/.config/tusk/config.toml` or in your project root) and add:

```toml
[settings.taxonomy]
ranks = [["milestone"], ["initiative"], ["story"], ["task", "spike"]]
```

Reload Tusk's MCP server (Claude Code restarts it automatically when config changes).

### Per-project override

```bash
tusk project settings set <project-name> taxonomy='[["milestone"], ["initiative"], ["story"], ["task", "spike"]]'
```

Or via MCP: call `tusk_project_settings_set` with the same payload.

## Rank rules

Tusk validates parent-child relationships strictly:

- A task's parent must sit at a strictly lower rank index than the task itself.
- Any ancestor rank may parent any descendant rank — a milestone can directly parent a task without an intermediate initiative or story (skipping is allowed).
- Peer levels at the same rank may not parent each other.
- Only top-rank levels (rank 0) may be root tasks.

## When to opt out

Some projects don't benefit from the WBS hierarchy:

- Bug trackers (use a flat taxonomy or none).
- Scratch / personal projects.
- Tickets that fit a different taxonomy entirely (`epic → ticket`, etc.).

Opt out per-project by setting the taxonomy to an empty list: `taxonomy=[]`. Tasks in that project will not carry a level field, and the WBS orchestrator skill will not engage.

## Migration notes

Per Tusk's rules, taxonomy edits are prospective — existing tasks are not retroactively re-validated. After changing the taxonomy:

1. Run `tusk task level-check <project>` to surface tasks with invalid levels.
2. Update each violating task's level via `tusk task modify <id> level=<new-level>`.
3. Tusk does not block reads of violators; the check is informational.
