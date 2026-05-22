# Phase plan (heavy) — <parent-title> / phase <N>

**note frontmatter:** `kind=phase-plan, phase=phase-<N>` (linked to its Story by an `about` edge)

**Use this template when** the parent node is a Story whose implementation plan needs phasing — typically because the work splits across multiple implementer agents or has compilation-safety bridge code requirements. Follows the contract from the existing `phase-planning-rules` skill.

## Inherits From

<What state the codebase will be in when this phase begins: which prior phases have completed, which interfaces / files / types they introduced. The implementer agent for this phase relies on this section being accurate.>

## Phase Outcome

<What this phase delivers. Phrase as the new state of the codebase after the phase ships. Must be independently shippable — the system must be deployable and functional after this phase, even if a later phase will replace some of the bridge code.>

## Tasks (4–6)

<A numbered list of exactly 4–6 tasks the implementer agent will execute. Each task is a node at `level=task`, parented to the Story via `parent`, with the `phase=phase-<N>` property.

### Task 1: <title>

Files: create / modify.
Steps: ordered checkbox list.

### Task 2: …

…>

## Bridge Code

<Stubs, no-ops, feature flags, or adapter layers introduced in this phase to maintain compilation safety. Each entry tags the **removal target phase** where the bridge will be replaced. If you cannot name a removal phase, the plan is incomplete.

| Bridge | Introduced for | Removal target |
|---|---|---|
| `<symbol or file>` | <reason> | `phase-<K>` |>

## Compilation Safety

<Confirmation that the codebase compiles and passes type-checking after this phase is applied in isolation. List any pedantic / strict modes that should be run.>

## Changes Introduced

<Concrete output of this phase that the next phase's "Inherits From" will reference:

- New files: …
- Modified interfaces: …
- New environment variables: …
- Schema migrations: …
- New dependencies: …
- Bridge code added (with removal target): …>

## User-visible Behaviors

<List of behaviors that must still work after this phase ships. Used by the implementer agent as acceptance criteria, and by the post-implementation review for regression checking.>
