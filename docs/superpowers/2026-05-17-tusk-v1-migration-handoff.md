# Handoff — Superhuman ↔ Tusk v1 migration

**Date:** 2026-05-17
**Author:** German Meza (`iam@germanamz.com`)
**For:** whoever picks up the Superhuman plugin's Tusk v1 migration after this session.

This is a session-handoff doc, not a spec or plan. It tells you what's already done, what state the workspace is in, and what to do next. The design substance lives in the spec and plan; this doc is the orientation pass.

## Read these first

1. `docs/superpowers/specs/2026-05-17-superhuman-tusk-v1-migration.md` — design spec. Covers the schema, the MCP-tool mapping, the three semantic-query gates that motivate the migration, and the open questions.
2. The Tusk-managed copies of the spec and plan, which are now the *live* source of truth:
   - `wbs/superhuman-tusk-v1-migration/spec.md` (`type=wbs-note, kind=spec`)
   - `wbs/superhuman-tusk-v1-migration/plan.md` (`type=wbs-note, kind=plan`)
3. `plugins/superhuman/packs/wbs.toml` — the `superhuman-wbs` Tusk type pack. Two node types (`wbs-node`, `wbs-note`), three edge types (`wbs-parent`, `wbs-about`, `wbs-supersedes`), one workflow (`wbs-workflow`).

The `docs/superpowers/specs/…` copy is the historical snapshot. Treat the `wbs/…/spec.md` copy as the editable one — any updates land there and flow back into the docs/ copy only if you want a stable archival snapshot.

## Workspace state

The repo is now a Tusk workspace. From `tusk status`:

```
TYPE      COUNT
wbs-node  8        ← 1 project + 7 stories
wbs-note  2        ← spec + plan
edges     9        ← 7 wbs-parent + 2 wbs-about
```

Hierarchy:

```
wbs/superhuman-tusk-v1-migration                            (project, status=plan-ready)
├─ wbs/superhuman-tusk-v1-migration/spec                    (kind=spec, archived=false)
├─ wbs/superhuman-tusk-v1-migration/plan                    (kind=plan, archived=false)
├─ wbs/superhuman-tusk-v1-migration/pack-and-bootstrap         (S1, status=drafted)
├─ wbs/superhuman-tusk-v1-migration/wbs-status-readonly-port   (S2, status=drafted)
├─ wbs/superhuman-tusk-v1-migration/orientation-skill-rewrite  (S3, status=drafted)
├─ wbs/superhuman-tusk-v1-migration/create-side-commands       (S4, status=drafted)
├─ wbs/superhuman-tusk-v1-migration/template-overhaul          (S5, status=drafted)
├─ wbs/superhuman-tusk-v1-migration/semantic-gates             (S6, status=drafted)
└─ wbs/superhuman-tusk-v1-migration/phase-skills-port          (S7, status=drafted)
```

Sibling ordering is encoded in the Story *titles* (`S1 — …`, `S2 — …`), **not** in the `wbs-parent` edge ordinals — all sibling edges came in with ordinal 0 (see *Tusk rough edges to dodge* below).

## New files in version control

```
tusk.toml                                                       new — workspace manifest + pack contents
plugins/superhuman/packs/wbs.toml                               new — the pack source
wbs/superhuman-tusk-v1-migration.md                             new — project wbs-node
wbs/superhuman-tusk-v1-migration/spec.md                        new — wbs-note kind=spec
wbs/superhuman-tusk-v1-migration/plan.md                        new — wbs-note kind=plan
wbs/superhuman-tusk-v1-migration/pack-and-bootstrap.md          new — Story S1
wbs/superhuman-tusk-v1-migration/wbs-status-readonly-port.md    new — Story S2
wbs/superhuman-tusk-v1-migration/orientation-skill-rewrite.md   new — Story S3
wbs/superhuman-tusk-v1-migration/create-side-commands.md        new — Story S4
wbs/superhuman-tusk-v1-migration/template-overhaul.md           new — Story S5
wbs/superhuman-tusk-v1-migration/semantic-gates.md              new — Story S6
wbs/superhuman-tusk-v1-migration/phase-skills-port.md           new — Story S7
docs/superpowers/specs/2026-05-17-superhuman-tusk-v1-migration.md   new — design spec snapshot
docs/superpowers/2026-05-17-tusk-v1-migration-handoff.md        new — this file
.gitignore                                                      modified — `.tusk/` appended by `tusk init`
```

`.tusk/` is local-only (the SQLite index Tusk maintains). Do not commit it.

`.mcp.json` was **not** modified. It still invokes `tusk mcp serve`; new Tusk's CLI accepts `serve` as a no-op positional argument so the existing config keeps working. Worth tightening when S3 (orientation rewrite) touches the MCP surface.

## What's next — pick up S1

The seven Stories under the migration project are the unit of follow-up work. They were sequenced for shrinking blast radius first; do not reorder without re-reading the plan note's "Sequencing" section.

**S1 — pack-and-bootstrap** is next. Concretely:

1. Verify the pack reloads clean in a fresh scratch workspace:
   ```sh
   mkdir /tmp/wbs-smoke && cd /tmp/wbs-smoke
   tusk init --name smoke
   tusk pack add "file:///Users/germanamz/projects/superhuman/plugins/superhuman/packs/wbs.toml"
   tusk doctor
   ```
   Expect: clean except for the known `[undeclared-property] … status` warning that also affects built-in kanban. If you see anything *else*, treat it as a blocker on S1.
2. Author `plugins/superhuman/commands/wbs-bootstrap.md` — a slash command that runs `tusk init` (if needed) and `tusk pack add file://<pack-path>` against the current working directory, then prints a "what to do next" message. Use the existing `wbs-new.md` / `wbs-status.md` shape as a stencil.
3. Wire `wbs-orientation/SKILL.md`'s "Detect Tusk context" step to detect a missing pack and offer to run `/wbs-bootstrap`. (Don't do the full skill rewrite here — that's S3.)
4. Ship as one PR with title `feat(superhuman): wbs-bootstrap command and superhuman-wbs pack`. Release-please will bump the plugin minor.

After S1 merges, S2 (`/wbs-status` read-only port) is next — the lowest-risk port of an existing command and the first one that exercises the new query surface under realistic load.

## Open questions to resolve in S1 / S2

These are flagged in the spec but were intentionally left open during bootstrap:

1. **Notes type modeling.** We landed on the separate `wbs-note` type (spec's recommendation). If S2 surfaces ergonomic problems (e.g. queries against notes feel verbose), revisit options 2/3 from the spec.
2. **Hierarchical paths.** We're using `wbs/<project>/<child>.md`. If reshape during S3/S4 churns paths heavily, flat paths (`wbs/<slug>.md`) become more attractive. Decide when reshape-flow gets rewritten in S4.
3. **Embeddings dependency.** None of the gates are live yet, so this isn't a blocker until S6. Make sure S1's bootstrap command surfaces a one-time hint if `[embeddings]` isn't configured in `tusk.toml`.

## Tusk rough edges to dodge

Discovered while bootstrapping. Workarounds in place; none block forward progress. **Do not paper these over silently** — when the affected code path comes up in a Story, surface the workaround in the PR description so the rough edge gets visibility.

1. **Avoid `:` in string property values.** `tusk node modify --prop title="Foo: bar"` writes unquoted YAML and the next file read fails with a frontmatter decode error. Affects titles especially.
2. **Always pass `.md` to `tusk node move` targets.** Without an extension, the file gets renamed to extension-less and falls out of sync with the index. Fix by `mv`-ing the file and running `tusk reindex`.
3. **Filter syntax is `key=value`, not `key:value`.** The help text says otherwise. The orientation skill rewrite (S3) must use `=`.
4. **`wbs-parent` edge ordinals are all 0.** Sibling order isn't preserved by `tusk edge add` even though the type declares `ordered = true`. Use title prefixes for ordering until/unless Tusk grows a `--ordinal` flag.
5. **The `undeclared-property` warning on `status` is permanent.** Same root cause as the built-in kanban pack. Suppress in the bootstrap command's output with a one-liner explanation; don't try to fix in our pack.

All five should eventually be filed as upstream issues against `github.com/germanamz/tusk`. That work is **not** part of this migration — the migration only documents the workarounds and proceeds.

## Commit posture

Nothing has been committed yet. The recommended first commit is the **whole bootstrap as a single PR** before S1's pack-loading code:

```
feat(superhuman): bootstrap Tusk v1 workspace for migration WBS

- Add superhuman-wbs Tusk pack (wbs-node, wbs-note, edges, workflow).
- Initialize repo as Tusk workspace; .tusk/ gitignored.
- Land migration project, spec, plan, and 7 Story children as Tusk nodes.
- Add design spec snapshot under docs/superpowers/specs/.
- Add this handoff under docs/superpowers/.
```

That gives the team a single discoverable starting point. S1 then lands as the second PR, scoped to the bootstrap *command* rather than the workspace setup itself.

If you'd rather split the commit: `feat(superhuman): add superhuman-wbs Tusk pack` first, then `chore(superhuman): bootstrap migration WBS in Tusk` for the `wbs/**` files. Both still under the `superhuman` component for release-please.

## Definition of "this migration is done"

Pulled from the plan note's "Cross-cutting verification" section, repeated here so the finish line is visible from the handoff:

1. `grep -rE 'tusk_(project|task|note)_[a-z]+' plugins/superhuman/` returns zero matches.
2. `tusk doctor` clean in a workspace bootstrapped from this plugin (modulo the kanban-style `status` warning).
3. The user flow `/wbs-bootstrap` → `/wbs-new` → brainstorm → decompose → `/wbs-status` works end-to-end without surfacing any removed MCP tool.

When all three hold and S7 has merged, the migration is shippable. Cut a minor release of the plugin and update `superhuman-wbs-roadmap.md` to mark the Tusk v1 migration sub-project as done.
