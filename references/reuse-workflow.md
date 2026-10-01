# Reuse documentation

Use for an explicit request to make a repository's reusable libraries and
existing integrations usable from other projects. The reader is the
**cross-project consumer**: an agent or engineer starting new work elsewhere who
must decide whether to reuse a unit and how to use it correctly. Read the
[shared policy](documentation-policy.md) first; it governs authority, evidence
labels, permission and outcomes. The result is a proposal of uniform pages and a
catalog for one repository; it is not whole-repository recovery and uses no ledger.

## 1. Bind the scope

Establish the repository root, its actual Git snapshot, the authorized
documentation paths (default `docs/reuse/`), and any related repositories whose
units this one depends on, each with its own snapshot or released version.
Read an existing reuse catalog, the repository's instructions and entry points.

**Exit:** root, snapshot, authorized paths, related repositories and the
requested approver are explicit, or the missing input is reported.

## 2. Survey reuse surfaces

Build a reuse inventory from the repository's own declarations:

- published packages, entry points and versions from manifests;
- public exports and extension points intended for subclassing or registration;
- scaffolding and templates a consumer would start from;
- integration adapters to external systems: clients, authentication,
  pagination, rate limits, retries, webhooks and their configuration schemas;
- existing documentation surfaces: README, docs site sources, docstrings,
  changelog and migration notes, examples and tests.

Where an integration overrides or reimplements library behavior, classify it as a
**justified extension** (state the external-system reason), a copy of library
behavior, or use of a **deprecated** API, and name the library counterpart and its
current replacement. Give each candidate unit a type (`library` or
`integration`), the consumer question it answers, source routes, existing homes
and a disposition: own page, grouped into another page, or excluded with reason.

**Exit:** every published package or entry point and every external-system
integration found has a disposition; the inventory names what was not examined.

## 3. Research each unit

Follow the trace dimensions of [unit research](documentation-unit.md) for the
**most common reuse task first**, from implementation, tests and configuration
rather than existing prose. Existing documentation is evidence: record each
**discrepancy** between it and the code with both locations. For a library,
establish when to use it and when not to, installation and compatibility, required
configuration, the minimal working usage, extension points, lifecycle, errors,
retries and limits, and deprecated APIs with their replacements. For an
integration, establish which library units it builds on and why it extends
them, the observed external-system behavior and its configuration names.

Name the **variation points** a consumer changes when adapting the minimal usage
to another source (for example authentication, request parameters, pagination
and response shape), each with its default and the failure a wrong choice causes.
For every **deprecated** API, record the replacement, what a migrating consumer
must remove, which one takes precedence while both are present, and every
surface in the repositories that still teaches it: guides, examples, templates,
scaffolds and existing integrations. Scope each claim to the cases the source
shows; a statement about "all" streams, units or callers needs evidence for all.

Reference a unit in another repository by its **catalog ID**, package, version
constraint and a **version-pinned URL**; copy none of its content. State an
organization-level norm only as an observation ("all examined integrations use
X") followed by a **Recommendation (unapproved)** until an owner approves it.

**Exit:** every section of the page template has evidence, an explicit unknown
or a source-backed non-applicability reason for this unit.

## 4. Draft pages and catalog

Write one page per unit from the [reuse page template](../templates/reuse-page.md)
at `docs/reuse/<unit>.md`, and entries in `docs/reuse/catalog.json` following the
[catalog template](../templates/reuse-catalog.json). The catalog carries identity
and routing only; the page is the single source of the explanation. Each entry's
`summary` is one line naming the task the unit solves, in terms a consumer
would search for; the organization index uses it verbatim. Keep each
page a fast path for its common task and list uncovered topics with pinned
upstream links, so a reader knows when to research further. Propose separate
exact hunks that correct confirmed discrepancies in existing pages, and one
sentence in the repository's agent instructions pointing to
`docs/reuse/catalog.json`: in `AGENTS.md`, or an existing
`.github/copilot-instructions.md`. Agent hosts load these files automatically;
a README link alone is not enough. If neither file exists, propose a minimal
`AGENTS.md` containing only that sentence.

When a local index clone is configured, read its `manifest.json` and
`areas.json` through the [organization index contract](reuse-index.md).
Match the current repository to its sibling clone name in the manifest. Propose
a unit's optional `area` only when a consumer-facing taxonomy area fits the
unit **and differs from the repository default**; otherwise leave the field
out. If there is no configured local index clone, leave `area` out rather than
guessing an id. Report an unmatched repository or ambiguous area for the
maintainer to resolve; do not invent a taxonomy or treat the owning team as an
area.

Keep **correction hunks** small and complete. Before proposing one, search the
whole file for every occurrence of the stale pattern and correct all of them,
or none. Change only the confirmed discrepancy: every sentence or example line a
hunk adds needs the same source evidence as a page claim, and a hunk never
introduces a new instruction the source does not support. When a page or
template is stale in more places than a short correction can fix safely,
propose one notice at its top naming what is outdated and linking the reuse
page, instead of rewriting its examples. A deprecated pattern that remains in
a template or guide gets either such a correction or an explicit warning on the
reuse page that names the file.

**Exit:** exact proposed files and hunks, their evidence and remaining gaps are
ready for review; nothing is applied.

## 5. Review and approve per repository

Give a fresh [reviewer](../com.github.copilot/agents/documentation-reviewer.agent.md)
the neutral snapshot, reuse inventory and source routes. It derives the
consumer obligations first, then reviews the candidate pages for omitted
behavior, unsupported claims, wrong reuse guidance, missed deprecations and
catalog/page inconsistency. This one independent candidate review replaces the
separate pre-draft coverage challenge of recovery. Repair material findings once;
unresolved ones stay visible as partial scope.

The batch is approved **per repository** by its owner, or by an approver the
owner explicitly delegated and labeled as such. After approval, reread targets,
apply exactly the approved content, verify links and complete resulting files,
and commit. Return the shared report with the inventory, pages, discrepancies,
unapproved recommendations and unexamined scope.

**Exit:** the approved batch is committed and verified, or the report names what
remains partial. A reuse page does not certify coverage of the whole repository.
Agents in other repositories reach approved catalogs through the
[organization reuse index](reuse-index.md). After the approved change is
committed, direct its maintainer to [reuse-index](../skills/reuse-index/SKILL.md)
to sync, check whether regeneration changes the index, and publish if needed.
