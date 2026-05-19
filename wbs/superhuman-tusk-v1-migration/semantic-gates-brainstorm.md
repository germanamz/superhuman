---
type: wbs-note
title: S6 — semantic gates — brainstorm
archived: false
kind: brainstorm
wbs-about: wbs/superhuman-tusk-v1-migration/semantic-gates
---

# S6 — semantic gates — brainstorm

Captures the design conversation for S6: add the semantic-query layer to the three WBS gates that today run structural-only. This is the *actual win* of the Tusk v1 migration (per the spec) — not just porting, but using `tusk_query --semantic` (hybrid structural + cosine ranking) to catch contradictions and surface references that the structural checks miss.

Migration plan line:

> "6. **Semantic gates.** Ship Gate 1 first (highest leverage), then 2, then 3."

The migration spec's "Semantic-query wins" section is the design substrate; this brainstorm operationalizes it.

## The three gates and where they live

| Gate | Home | Today (structural only) | S6 adds (semantic) |
|---|---|---|---|
| **Gate 1 — end-of-brainstorm contradiction** | `wbs-orientation` §5.7 | Compares proposed spec against the **parent's** Karpathy fields (`Out of Scope`, `Success Criteria`). Misses cousin/sibling specs. | `tusk_query 'type:wbs-note AND kind:spec AND archived:false' --semantic '<proposed-spec scope + out-of-scope excerpt>' --take 5` — surfaces the top-5 semantically-near live specs across the *whole workspace*; ask the user "any of these conflict?" The structural parent check stays as the hard gate; semantic is the safety net. |
| **Gate 2 — reference surfacing** | `wbs-orientation` §10 | Structural: parent's spec/plan, phase-plan, sibling tasks via edges. | `tusk_query 'type:wbs-note AND archived:false' --semantic '<task description body>' --take 8`, unioned with the structural candidates. Surface in two groups: "structurally nearby" and "semantically nearby." |
| **Gate 3 — phase continuity drift** | `phase-continuity-review` skill | Manual scan across phase-plan notes for drift. | For each adjacent phase pair (N, N+1): `tusk_query 'kind:phase-plan AND phase:phase-{N+1}' --semantic '<phase-N bridge-code-removed section text>'`. If the N+1 plan isn't high-similarity to its predecessor's bridge section, that's the drift signal — surface as a warning. |

## The central design constraint: embeddings may be absent

`--semantic` requires Ollama configured in `tusk.toml [embeddings]`. **This workspace has no `[embeddings]` section** (confirmed: `grep [embeddings] tusk.toml` → none). The spec is explicit:

> "The gates that depend on it must degrade gracefully when embeddings are not available — fall back to structural-only behavior and surface a one-time hint."

So every semantic gate S6 adds must be wrapped in an availability check:

1. **Probe** `tusk.toml` for an `[embeddings]` section (or attempt a trivial `tusk_query --semantic` and detect the "embeddings not configured" error).
2. **If absent:** surface a *one-time* hint per session ("Semantic gates are degraded — `[embeddings]` isn't configured in tusk.toml. Running structural-only. See <setup pointer>."), then run the structural check alone. Never block on the missing semantic layer.
3. **If present:** run the hybrid query and fold its results into the gate.

The structural checks (already shipped in S3) remain the hard gates regardless. The semantic layer is strictly additive — it never replaces a structural check, only augments it. This means a workspace without embeddings loses *nothing* it had before S6; it just doesn't gain the semantic safety net.

## Scope question — Gate 3 and the S6/S7 overlap

Gate 3 lives in `phase-continuity-review/SKILL.md`, which **still carries v0 references** (`tusk_note_list ... meta.type=phase-plan`, `tusk_task_list parent +phase-N`). That skill is slated for S7 (phase skills port — the mechanical v0→v1 rewrite). So Gate 3 sits at the S6/S7 boundary:

| Option | Trade |
|---|---|
| **A. S6 does Gates 1 + 2 (orientation); S7 does the phase-skills port AND Gate 3 together.** | Keeps each PR coherent: S6 = "semantic layer in orientation," S7 = "phase skills fully ported (v1 vocab + Gate 3 semantic)." Gate 3's semantic addition rides along with the mechanical port of the same file, avoiding two passes over `phase-continuity-review`. |
| **B. S6 does all three gates (touching phase-continuity-review for Gate 3 only); S7 does the rest of the phase-skills port.** | S6 owns "all semantic gates" as one concept. But S6 would touch `phase-continuity-review` for the semantic bit while leaving its v0 references for S7 — two passes over the same file, and an awkward intermediate where that skill is half-ported. |
| **C. Reorder: S7 (phase skills port) before S6, then S6 adds all three semantic gates on top of fully-ported skills.** | Cleanest dependency order — semantic gates layer onto v1-correct skills. But reorders the plan, and Gates 1+2 (orientation) don't depend on the phase skills at all, so S6-first for those is fine. |

**Tentative recommendation:** A. Gates 1 + 2 in S6 (orientation is already v1-ported, so they layer cleanly). Gate 3 moves to S7, bundled with the mechanical port of `phase-continuity-review` — one pass over that file, semantic drift check added as part of bringing it to v1. Update the migration plan's S6/S7 descriptions to reflect this split. This keeps every file touched exactly once and every PR coherent.

## Testability limitation

Without `[embeddings]` configured, the semantic path **cannot be validated live** in this session — `tusk_query --semantic` will return the not-configured error (which is exactly the degradation path we'll test instead). S6 can fully validate:

- The structural checks (unchanged, already working).
- The degradation path (embeddings absent → one-time hint → structural-only).

The semantic-happy path (embeddings present → hybrid ranking) can only be validated in a workspace with Ollama configured. S6 ships the logic; live semantic validation is a follow-up gated on embeddings setup. Note this in the PR.

## Open questions

### Q1 — Gate 3 / S6-S7 split

A (Gates 1+2 in S6, Gate 3 with the S7 port) / B (all three in S6) / C (reorder S7 before S6)?

**Tentative recommendation:** A.

### Q2 — Embeddings-absence detection mechanism

| Option | Trade |
|---|---|
| **A. Parse `tusk.toml` for `[embeddings]`.** | Cheap, no query. Could drift from actual embedding availability (section present but Ollama down). |
| **B. Attempt a trivial `--semantic` query and catch the error.** | Authoritative — tests the real path. One extra query per session. |
| **C. Both: parse first (fast negative), then trust the query error at use time.** | Robust. Slightly more logic. |

**Tentative recommendation:** C — parse `tusk.toml` for the fast "definitely absent" case (emit the hint, skip semantic entirely), and also catch the query error defensively if the section is present but the backend is down.

### Q3 — One-time hint scope

The "embeddings degraded" hint should fire once, not on every gate invocation. Per-session? Per-conversation?

**Tentative recommendation:** once per session (first gate that would have used semantic). The skill notes it has emitted the hint and suppresses repeats.

### Q4 — PR shape

Gates 1 + 2 both live in `wbs-orientation/SKILL.md`. Single PR, one or two commits.

**Tentative recommendation:** single PR, one commit (both gates are edits to the same file; the migration-spec "ship Gate 1 first" ordering is about rollout priority, not separate PRs).

## Out of scope

- Gate 3 / `phase-continuity-review` — deferred to S7 (per Q1=A).
- Configuring embeddings / Ollama — that's a workspace-setup concern, not plugin code. S6 surfaces the hint; it doesn't install anything.
- The other phase skills (`phase-planning-rules`, `phase-post-implementation-review`) — S7.

## Open questions — resolved (user, 2026-05-19)

1. **Q1 (Gate 3 split): A** — Gates 1 + 2 in S6 (orientation §5.7, §10); Gate 3 folds into S7's mechanical port of `phase-continuity-review`. Each file touched once. The migration plan's S6/S7 descriptions are updated to reflect this split.
2. **Q2 (embeddings detection): C** — parse `tusk.toml` for `[embeddings]` (fast definitely-absent path → emit hint, skip semantic), and defensively catch the not-configured error if the section is present but the backend is down.
3. **Q3 (hint scope): once per session** — the skill notes it has emitted the degraded-mode hint and suppresses repeats.
4. **Q4 (PR shape): single PR, one commit** — both gates are edits to `wbs-orientation/SKILL.md`. The spec's "ship Gate 1 first" is rollout priority, not separate PRs.

Implementation note: the **planning-time contradiction gate (§6.6)** is the same shape as Gate 1 (§5.7) — it reuses Gate 1's semantic cross-spec search, scoped to the parent Initiative's ancestry. S6 wires the same semantic helper into both §5.7 and §6.6.

## References

- Migration spec "Semantic-query wins" section: `wbs/superhuman-tusk-v1-migration/spec.md` (Gates 1–3 with the exact queries) and "Risks → Embeddings unavailable."
- Gate homes: `plugins/superhuman/skills/wbs-orientation/SKILL.md` §5.7, §10; `plugins/superhuman/skills/phase-continuity-review/SKILL.md`.
- Prior brainstorms (translation table, conventions): S3/S4/S5 brainstorms in this project.
