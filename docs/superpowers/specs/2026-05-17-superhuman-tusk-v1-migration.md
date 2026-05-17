# Superhuman ↔ Tusk v1 Migration — Design Spec

**Date:** 2026-05-17
**Author:** German Meza (`iam@germanamz.com`)
**Status:** Draft — review pending
**Supersedes operative parts of:** [WBS Spine Design (2026-04-29)](2026-04-29-superhuman-wbs-spine-design.md), [WBS Reshape Design (2026-05-01)](2026-05-01-wbs-reshape-design.md) — the *taxonomy* and *Karpathy gate* survive; the *Tusk MCP surface* they assume does not.

## TL;DR

Tusk v1.1.0 replaced the old project/task/note model with a single primitive — a typed `node` (markdown + TOML frontmatter) plus typed edges, plus a structural+semantic query surface. Every MCP tool the Superhuman plugin currently calls (`tusk_task_*`, `tusk_note_*`, `tusk_project_*`) no longer exists. This spec covers the schema, MCP-tool mapping, the gates that get *better* under semantic query, the migration steps for existing workspaces, and the feature requests for Tusk that fall out.

## Goals

1. Make every Superhuman skill, command, and template valid against Tusk v1.1.0's MCP surface.
2. Use semantic query (the new capability) to strengthen the three gates that today rely on the user remembering parent context.
3. Keep the WBS taxonomy, the Karpathy decomposition gate, and the reshape flow intact — they're orthogonal to the storage rewrite.
4. Ship the schema as a Tusk type pack so workspaces opt in with one command and the schema is reproducible.

## Non-goals

- Re-litigating the WBS taxonomy. The five levels and the Karpathy fields stay.
- Backwards compatibility with old-Tusk workspaces. We do not migrate user data; we document a manual conversion in [Migration steps](#migration-steps-for-existing-workspaces).
- Replacing brainstorming/writing-plans with Tusk-native flows. We continue to wrap them.

## What changed in Tusk

| Aspect | Old (the plugin assumes) | New (v1.1.0) |
|---|---|---|
| Primitive | `project`, `task`, `note` — three concepts | One: `node` (markdown + TOML frontmatter), declared types live in `tusk.toml` |
| Hierarchy | Built-in `parent` on tasks; level enum | User-declared `parent` *edge* between user-declared node-types |
| Notes-on-task | `tusk_note_add(task=…, meta.type=…)` | Separate node + edge; no built-in note concept |
| Append/archive | `tusk_note_archive(note=…)` | User convention — a property like `archived: true` |
| Versioning | Optimistic-lock on `tusk_task_modify` | None — files are the truth |
| Query | Filter-only (`tusk_task_list`) | `tusk_query` — structural / semantic (Ollama) / hybrid |
| Workflow validation | Implicit | Declarative `[behaviors.workflow.<name>]` in `tusk.toml` |
| Distribution | One-off `tusk init` | `tusk pack add <name-or-url>` — built-ins: `kanban`, `tags`, `vault` |

The MCP surface is now: `tusk_query`, `tusk_node_{get,list,create,modify,delete,move}`, `tusk_edge_{add,list,remove}`, `tusk_reindex`. Eleven tools the plugin calls today are gone.

## Schema — the `superhuman-wbs` type pack

Shipped as `plugins/superhuman/packs/wbs.toml`. The orchestrator runs `tusk pack add file://<absolute-path-to-pack>` once per workspace; subsequent runs are no-ops.

### Node type: `wbs-node`

One node-type covers every WBS level. Level is a property, parent is an edge.

```toml
[node-types.wbs-node]
description = "A WBS node — Project / Milestone / Initiative / Story / Task / Spike"
properties = [
  { name = "level", type = "enum",
    values = ["project","milestone","initiative","story","task","spike"] },
  # status comes from the workflow behavior; do not redeclare here.
  { name = "phase", type = "string" },  # e.g. "phase-2" — applies at task level
]
```

Status is owned by the workflow behavior (`wbs-workflow`, below). The pack must not redeclare `status` on the node-type — kanban-pack experience confirms Tusk rejects duplicate declarations.

### Node type: `wbs-note` (**open question** — see below)

```toml
[node-types.wbs-note]
description = "A spec / plan / brainstorm / phase-plan note attached to a wbs-node"
properties = [
  { name = "kind", type = "enum",
    values = ["spec","plan","brainstorm","phase-plan","reshape-audit"] },
  { name = "phase", type = "string" },     # set when kind = phase-plan
  { name = "archived", type = "bool" },
]
```

This is **not** what the single-type answer literally said. The single-type answer covers the task hierarchy; notes still need a home. Three options:

1. **Separate `wbs-note` type** *(default — written above)* — clean separation, easy queries (`type:wbs-note AND kind:spec`), but adds a second type to the pack.
2. **Reuse the vault pack's `note`** with a `kind` property and a `references` edge — composes with built-in packs but couples to vault's evolution.
3. **Folded into `wbs-node`** with `level=note` and a `kind` property — keeps single-type promise but conflates execution nodes with reference material; queries become noisier.

**Recommendation:** option 1. The pack stays self-contained and the queries that drive the semantic gates (below) are clearer.

### Edge types

```toml
[edge-types.parent]
description = "WBS parent — this node is a child of another node"
from        = ["wbs-node"]
to          = ["wbs-node"]
cardinality = "many-to-one"
ordered     = true
acyclic     = true
inverse     = "children"

[edge-types.about]
description = "This note is about a wbs-node"
from        = ["wbs-note"]
to          = ["wbs-node"]
cardinality = "many-to-one"
ordered     = false
acyclic     = true
inverse     = "notes"

[edge-types.supersedes]
description = "This note supersedes a prior note (replaces tusk_note_archive)"
from        = ["wbs-note"]
to          = ["wbs-note"]
cardinality = "many-to-one"
ordered     = false
acyclic     = true
```

`supersedes` plus `archived=true` on the prior note gives us the append-only-with-archive pattern the old plugin relied on, without a custom MCP verb.

### Workflow behavior

```toml
[behaviors.workflow.wbs-workflow]
applies-to      = ["wbs-node"]
status-property = "status"

states = [
  { name = "drafted",        initial = true },
  { name = "brainstorming",  start = true },
  { name = "spec-ready" },                       # spec note exists, archived=false
  { name = "planning" },                         # stories only
  { name = "plan-ready" },                       # stories only
  { name = "ready-to-decompose" },               # Karpathy gate passed
  { name = "in-progress" },
  { name = "completed",      terminal = true, done = true },
  { name = "archived",       terminal = true },
]

transitions = [
  { from = "drafted",          to = "brainstorming" },
  { from = "brainstorming",    to = "spec-ready" },
  { from = "spec-ready",       to = "planning" },
  { from = "spec-ready",       to = "ready-to-decompose" },  # non-stories
  { from = "planning",         to = "plan-ready" },
  { from = "plan-ready",       to = "ready-to-decompose" },
  { from = "ready-to-decompose", to = "in-progress" },
  { from = "in-progress",      to = "completed" },
  # reshape escape: any non-terminal state may go back to brainstorming
  { from = "spec-ready",       to = "brainstorming" },
  { from = "planning",         to = "brainstorming" },
  { from = "plan-ready",       to = "brainstorming" },
  { from = "ready-to-decompose", to = "brainstorming" },
  { from = "in-progress",      to = "brainstorming" },
  # archive
  { from = "drafted",          to = "archived" },
  { from = "brainstorming",    to = "archived" },
  { from = "spec-ready",       to = "archived" },
  { from = "planning",         to = "archived" },
  { from = "plan-ready",       to = "archived" },
  { from = "ready-to-decompose", to = "archived" },
  { from = "in-progress",      to = "archived" },
]
```

`ready-to-decompose` is the state the Karpathy gate guards. The orchestrator skill enforces "all Karpathy fields populated" before allowing the transition; the engine enforces "you can't get there from `drafted` without passing through `spec-ready`."

## MCP tool mapping table

| Plugin uses today | Maps to (new) | Notes |
|---|---|---|
| `tusk_project_list` | `tusk_node_list "type:wbs-node AND level:project"` | "Workspace" replaces "the Tusk app"; a *project* is a wbs-node like any other. |
| `tusk_project_settings` | Read `tusk.toml` directly + `tusk_node_get <project-id>` | Workspace settings → `tusk.toml`. Project-scoped knobs live on the project node's body or properties. |
| `tusk_task_create` | `tusk_node_create --type wbs-node --prop level=<L>` + `tusk_edge_add --type parent --source <new> --target <parent>` | Two calls. Composite request — see [Feature requests](#feature-requests-for-tusk). |
| `tusk_task_get <id>` | `tusk_node_get <id>` | Path-based ID (`wbs/proj/foo`) instead of opaque short ID — see [Open questions](#open-questions). |
| `tusk_task_list parent=<p>` | `tusk_edge_list --to=<p> --type=parent` then `tusk_node_get` per child, **or** `tusk_node_list 'type:wbs-node'` then filter | The edge-list path is cheaper and gives stable ordering (the edge type is `ordered = true`). |
| `tusk_task_modify <id> description=…` | Open the file, rewrite the body (frontmatter is properties, body is description) | No optimistic lock. The "version conflict" branch of the orientation error table goes away. |
| `tusk_task_summary <id>` | `tusk_node_get` + traverse edges; compute counts in the skill | Used only by `/wbs-status`. |
| `tusk_task_tree <root>` | `tusk_edge_list --to=<root> --type=parent`, recurse | Used only by `/wbs-status`. See [Feature requests](#feature-requests-for-tusk) — depth-N descendants. |
| `tusk_note_add task=<t> meta.type=<kind>` | `tusk_node_create --type wbs-note --prop kind=<kind>` + `tusk_edge_add --type about --source <new> --target <t>` | Two calls. Composite request — see [Feature requests](#feature-requests-for-tusk). |
| `tusk_note_list task=<t> meta.type=<kind>` | `tusk_query 'type:wbs-note AND kind:<kind> AND -archived' --sort '-modified'` then filter by edge | The query language doesn't include "follow an edge"; we still need a `tusk_edge_list --to=<t>` join. See [Feature requests](#feature-requests-for-tusk). |
| `tusk_note_archive <note>` | `tusk_node_modify <note> --prop archived=true` + `tusk_edge_add --type supersedes --source <new-note> --target <old-note>` | The convention is "archived → invisible to default queries; superseded → traceable." |

## Semantic-query wins

These three gates are weak today and become much stronger under hybrid query. This is the actual win, not just porting.

### Gate 1 — End-of-brainstorm contradiction (orientation §5.7)

**Today:** compare proposed spec against *parent's* `## Out of Scope`. Misses cousin specs.

**New:**

```
tusk_query 'type:wbs-note AND kind:spec AND -archived' \
  --semantic '<proposed-spec excerpt: scope + out-of-scope>' \
  --take 5
```

Pre-filter to live specs across the workspace; rank by semantic similarity. The orchestrator surfaces the top 5 to the user and asks: "any of these conflict with what we're about to write?" The structural parent-Out-of-Scope check still runs as a hard gate; the semantic surface is the additional safety net.

### Gate 2 — Reference surfacing at task level (orientation §10)

**Today:** structural-only — parent's spec, parent's plan, phase-plan, sibling tasks.

**New:**

```
tusk_query 'type:wbs-note AND -archived' \
  --semantic '<task description body>' \
  --take 8
```

Then union with the structural candidates. Surface in two groups: "structurally nearby" and "semantically nearby." User picks; never auto-populate.

### Gate 3 — Phase continuity review (phase-continuity-review skill)

**Today:** manual scan across `phase-plan` notes for drift.

**New:** for each adjacent phase pair `(N, N+1)`:

```
tusk_query 'type:wbs-note AND kind:phase-plan AND about:<story> AND phase:phase-{N+1}' \
  --semantic '<phase-N "bridge code removed" section text>'
```

If the phase-N+1 plan does not appear high-similarity to its predecessor's bridge-code section, that's the drift signal. Surface as a warning, not a hard block.

## Migration steps for existing workspaces

Manual; one-time per workspace.

1. **Inventory old data.** `tusk_task_list` and `tusk_note_list` no longer exist; if a user still has old-Tusk artifacts, they exist as files in their old workspace. Export them as markdown.
2. **Initialize a fresh workspace.** `tusk init --name <workspace>` in the desired directory.
3. **Add the WBS pack.** `tusk pack add file://<abs-path-to>/plugins/superhuman/packs/wbs.toml` (or once we host it, `tusk pack add https://…`).
4. **Recreate the project node.** `tusk node create --type wbs-node --path wbs/<project-slug>.md --title "<Project>" --prop level=project --prop status=in-progress`.
5. **Recreate descendants top-down.** For each old task: `tusk node create --type wbs-node --path wbs/<parent-slug>/<child-slug>.md --prop level=<L>`, then `tusk edge add --type parent --source wbs/<parent>/<child> --target wbs/<parent>`. Paste old description into body.
6. **Recreate notes.** For each old note: `tusk node create --type wbs-note --path wbs/<parent>/<child>-spec.md --prop kind=spec`, then `tusk edge add --type about --source <new-note> --target <parent>`. If the old note was archived, set `archived=true`.
7. **Run `tusk doctor`.** Resolve any dangling edges or schema violations.

The plugin will ship a `/wbs-bootstrap` command that automates steps 3 and 4 against the current workspace.

## Open questions

1. **Notes type modeling.** Default: `wbs-note` as a separate type (above). Alternatives: vault-pack `note` + `kind` property, or fold into `wbs-node` with `level=note`. Pick before implementation.
2. **Node ID / path scheme.** Tusk IDs are workspace-relative paths. Options: (a) `wbs/<project>/<milestone>/<initiative>/<story>/<task>.md` — readable but reparenting requires `tusk node move`; (b) flat `wbs/<slug>.md` — reparenting is just an edge edit, but paths convey no hierarchy at a glance. Recommendation: (b), since reshape is a first-class operation.
3. **Short IDs vs paths in user-facing prose.** The orchestrator skill talks about "task short IDs" today. Under v1, the ID *is* the path. We either teach users to use paths (concrete, no lookup needed) or maintain a slug index. Recommendation: use paths verbatim; drop the "short ID" abstraction.
4. **Embeddings dependency.** `--semantic` requires Ollama configured in `[embeddings]`. The gates that depend on it must degrade gracefully when embeddings are not available — fall back to structural-only behavior and surface a one-time hint.
5. **`/wbs-status` rollup performance.** A deeply nested project may take many `tusk_edge_list` round-trips. Need to benchmark before declaring depth-N traversal "fast enough"; if not, see feature request #4.

## Feature requests for Tusk

Surfaced by this migration. Numbered for cross-reference in Tusk issues.

1. **Composite `tusk_node_attach`** — one MCP call that creates a node *and* attaches a typed edge in a single transaction. Today every spec/plan write is two MCP round-trips; in agent contexts this doubles latency and creates an interleaving window for the watcher.
2. **Revisionable behavior.** Declare a node-type as revisionable keyed on `(parent-edge-target, property)`. The engine then enforces "at most one non-archived note per (parent, kind)" and auto-creates the `supersedes` edge on new revisions. Eliminates the bookkeeping in the orchestrator for spec/plan replacement.
3. **`tusk_query` with edge follow.** Today `tusk_query` filters and ranks but doesn't traverse. Even `--filter 'about->target.id:<id>'` would collapse the join we currently do client-side.
4. **Depth-N descendants in one query.** The binary already mentions `descendants_%d`; expose it via `tusk_query --descendants-of=<id> --depth=N` so `/wbs-status` is one call instead of a recursive walk.
5. **`tusk_query --explain` for cosine scores.** When the contradiction gate surfaces a node, the orchestrator should show *why* — the cosine score plus the matching chunks. Right now we only get the rank.
6. **Workflow validators that read child status.** Today the orchestrator enforces "all Karpathy fields populated" before `ready-to-decompose`. The engine could enforce "all `children` edges' targets have status in {spec-ready, ready-to-decompose, completed}" via a new `[behaviors.gates.<name>]` block. Moves correctness out of the skill.
7. **`tusk pack add` from a local path / git ref.** Today the pack story is "built-in names or a URL." A plugin shipping its pack on disk wants `tusk pack add ./relative/path/wbs.toml`. (We work around this in the orchestrator by computing an absolute `file://` URL, but the friction is real.)
8. **First-class "soft delete" / archive.** A `--archived` property is a convention; an engine-level `node.archived` field with default-exclusion from queries would standardize it across packs.

## Implementation plan (high-level)

Sequenced as Stories under a Project node, once this spec is approved. Each becomes its own Story-level WBS node in the workspace after we bootstrap.

1. **Pack and bootstrap.** Author `plugins/superhuman/packs/wbs.toml`; add `/wbs-bootstrap` command; smoke-test in a scratch workspace.
2. **Read-only port: `/wbs-status`.** Lowest blast radius. Replaces `tusk_task_summary` + `tusk_task_tree` with `tusk_edge_list` walks. Validates the schema against a real workload.
3. **Orientation skill rewrite.** Update every old-MCP reference in `wbs-orientation/SKILL.md` to the new surface; remove the optimistic-lock branch from the error table.
4. **Create-side commands.** `/wbs-new`, `/wbs-reshape` — both need the `tusk_node_create` + `tusk_edge_add` pattern; both write into `wbs-note`.
5. **Templates.** Update `templates/wbs/*.md` to reference `wbs-note` ids instead of "Tusk note IDs"; drop the "version" field; reword "meta.type=spec" → "kind=spec".
6. **Semantic gates.** Ship Gate 1 first (highest leverage), then 2, then 3.
7. **Phase skills.** `phase-planning-rules`, `phase-continuity-review`, `phase-post-implementation-review` — same MCP renames; the continuity review picks up the semantic query.

Each step is a single PR with `feat(superhuman): …` scope; release-please bumps the plugin minor on the bootstrap step (new feature surface) and patches thereafter.

## Risks

- **Embeddings unavailable.** If the user hasn't configured Ollama, the semantic gates silently degrade. Risk: false sense of safety. Mitigation: at first invocation of a gate, check `tusk.toml [embeddings]`; if missing, surface a one-time setup hint and proceed with structural-only.
- **Path churn from reshape.** If we keep hierarchical paths and the user reshapes often, `tusk node move` runs constantly. Mitigation: open-question (2) above — recommend flat paths.
- **Pack drift.** As Tusk evolves built-in packs, our `wbs.toml` could collide. Mitigation: namespace our edge types (`wbs-parent`, `wbs-about`) if Tusk ships a generic `parent` edge.
