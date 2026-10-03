# Reuse documentation workflow

Used by [docs-create](../skills/docs-create/SKILL.md) and
[docs-update](../skills/docs-update/SKILL.md). The reader is the
**cross-project consumer**: an agent or engineer starting work in another
repository who must decide whether to reuse a unit of this one and how to use it
correctly. The output is uniform pages in `docs/reuse/`, a
`docs/reuse/catalog.json`, one pointer sentence in the repository's agent
instructions, and a publication of the catalog in the organization index. The
[documentation policy](documentation-policy.md) governs evidence, permission and
reporting.

## 1. Preflight

Find the repository root with `git rev-parse --show-toplevel`. Refresh the
remote state with `git fetch origin` and `git remote set-head origin --auto`,
then run the helper's `status <root>`. Record:

- whether an index is configured, its path and whether it has a remote;
- the current branch, the remote default branch (`origin/HEAD`), `HEAD`, and the
  `Project unpushed commits` the push would also publish;
- whether `docs/reuse/catalog.json` exists and the project's registration and
  publication state;
- uncommitted changes. Stop and name them if they touch `docs/reuse/`,
  `AGENTS.md` or `.github/copilot-instructions.md`; leave any other uncommitted
  change alone and never include it in a commit.

Stop before any drafting when the repository has no `origin` remote: nothing
could be pushed or published. Tell the user under `Action required` to add the
repository's remote (`git remote add origin <url>`) and run the skill again.

## 2. Survey reuse surfaces

Delegate the survey to a fresh
[repository-discovery](../com.github.copilot/agents/repository-discovery.agent.md)
agent when the host supports agents; otherwise do it yourself and say so. Build
the inventory from the repository's own declarations:

- published packages, entry points and versions from manifests;
- public exports and extension points intended for subclassing or registration;
- scaffolding and templates a consumer would start from;
- integration adapters to external systems: clients, authentication,
  pagination, rate limits, retries, webhooks and their configuration;
- existing documentation: README, docs sources, docstrings, changelog and
  migration notes, examples and tests.

Where an integration overrides or reimplements library behavior, classify it as
a **justified extension** (state the external-system reason), a copy of library
behavior, or use of a **deprecated** API, and name the library counterpart and
its replacement. Give each candidate unit a type (`library` or `integration`),
the consumer question it answers, source routes, existing homes and a
disposition: own page, grouped into another page, or excluded with a reason.

**Exit:** every published package or entry point and every external-system
integration has a disposition; the inventory names what was not examined.

## 3. Research each unit

Research the **most common reuse task first**, from implementation, tests and
configuration rather than existing prose. Trace beyond the first function when
behavior or defaults are selected elsewhere:

| Dimension, when relevant | Evidence question |
| --- | --- |
| Selection and inputs | Which defaults, flags, settings or registration order choose this behavior? |
| Outputs and usage | What arguments, results and consumer obligations make a normal example work? |
| State and lifecycle | What is persisted, who owns it, when is it released, can a call repeat? |
| Failures | What propagates, falls back, partially succeeds, retries or needs recovery? |
| Trust and privacy | Who can trigger it, which permission checks apply, which data crosses the boundary? |
| Compatibility | Which exact version ranges and runtimes are declared? |
| Tests | Which named tests assert the claim; were they read or run? |

For a library, establish when to use it and when not to, installation and
compatibility, required configuration, the minimal working usage, extension
points, lifecycle, errors, retries and limits, and deprecated APIs with their
replacements. For an integration, establish which library units it builds on
and why it extends them, the observed external-system behavior and its
configuration names.

Name the **variation points** a consumer changes when adapting the minimal usage
(for example authentication, request parameters, pagination and response
shape), each with its default and the failure a wrong choice causes. For every
**deprecated** API, record the replacement, what a migrating consumer removes,
which one wins while both are present, and every guide, example, template or
integration in the repository that still teaches it. Scope each claim to the
cases the source shows; a statement about "all" callers needs evidence for all.

Existing documentation is evidence: record each **discrepancy** with the code,
with both locations, in the page's discrepancy table. Reference a unit in
another repository by its catalog ID,
package, version constraint and a version-pinned URL; copy none of its content.
State an organization-level norm only as an observation followed by a
**Recommendation (unapproved)**.

**Exit:** every section of the page template has evidence, an explicit unknown
or a source-backed reason it does not apply.

## 4. Draft pages, catalog and registration

Write the drafts directly into the working tree, **uncommitted**. The skills
write only these files:

- one page per unit at `docs/reuse/<unit>.md` from the
  [page template](../templates/reuse-page.md);
- `docs/reuse/catalog.json` from the [catalog template](../templates/reuse-catalog.json).
  The catalog carries identity and routing only; the page is the single source
  of the explanation. Each `summary` is one line naming the task the unit
  solves, in words a consumer would search for; the index uses it verbatim;
- one sentence pointing to `docs/reuse/catalog.json` in `AGENTS.md`, or in an
  existing `.github/copilot-instructions.md` when the repository keeps its agent
  instructions there. If neither exists, create a minimal `AGENTS.md`
  containing only that sentence.

Do not edit any other existing documentation. A confirmed discrepancy goes in
the page's discrepancy table with both locations and the proposed correction.
When a guide, example, template or integration still teaches a deprecated
pattern, the reuse page warns about it and names the file. List these files in
the summary and under `Action required` for their owners.

Prepare the **index registration** when the repository is not registered yet:
its name (default: the repository name from `origin`), owner (from
`CODEOWNERS`, otherwise the remote's organization or project), and area. Read
`areas.json` in the index clone and choose the consumer-facing area whose task
fits; propose a new area (lowercase id, title and one-line consumer task) only
when none fits. Areas describe consumer tasks, never teams. A unit gets its own
catalog `area` only when it fits a different existing area than the repository
default.

**Exit:** complete drafts exist in the working tree, with their evidence and
remaining gaps; nothing is committed.

## 5. Independent review

Give a fresh [documentation reviewer](../com.github.copilot/agents/documentation-reviewer.agent.md)
the neutral evidence first: repository root, snapshot (and for an update the
base, head and full patch), the reuse inventory and source routes. Only after it
returns its expected obligations, give it the draft paths. It reviews omitted
behavior, unsupported claims, wrong reuse guidance, missed deprecations and
catalog/page inconsistency. Repair material findings once and send the repaired
drafts back to the same reviewer for confirmation. Findings that remain are
listed in the confirmation summary.

## 6. Update after code changes

`docs-update` starts from the **last documentation commit**: the base is
`git log -1 --format=%H -- docs/reuse` and the head is `HEAD`. Read the complete
`git diff --name-status --find-renames <base> HEAD` and the full patch, excluding
`docs/reuse/` itself, plus old content of deleted files and both paths of
renames. Uncommitted changes are not assessed; say so.

For every changed area, decide which units it affects: public exports and
signatures, configuration names and defaults, errors and retries, package
versions (update the catalog `version`), deprecations, new reusable surfaces
(research them as new units under step 3) and removed units (mark them
`deprecated` with their replacement while a supported release still ships them;
remove the page and entry only when none does). Follow callers beyond the
changed files where consumers are affected indirectly. Edit only the affected
sections; keep unrelated content and formatting.

When nothing affects the documentation, conclude **no documentation change
needed**, give a one-line reason per changed area, and commit nothing.

## 7. Confirm once, then commit, push and publish

Show the user one concise summary, then ask a single question:

- files created or changed, one line each, and the units with their summaries;
- discrepancies found in existing documentation and files that still teach
  deprecated patterns (reported, not edited);
- the review result and any unresolved findings;
- the index registration (name, owner, area, any new area) or "already registered";
- the exact effects: the commit on branch `<branch>`, the push to
  `origin/<branch>` (and any existing local commits the push would also
  publish), and either publication to the index now (when `<branch>` is the
  default branch) or "not yet: after `<branch>` is merged into `<default>`, run
  `/docs-update`". Name the fallbacks below as possible targets.

Choices: commit, push and publish (or commit and push, when publication must
wait); keep the drafts uncommitted; discard the drafts. To discard, delete the
files the skill created and restore the files it changed with `git restore`.

After confirmation:

1. **Commit** only the drafted files with `git add -- <paths>`. Use the message
   `Document reusable units for other projects` (create) or
   `Update reuse documentation` (update). If a commit hook fails, stop and
   report it; the drafts stay in place.
2. **Push** the current branch (`git push -u origin <branch>` when it has no
   upstream). If the remote rejects it because the branch is **protected**, move
   the commit to a review branch: `git switch -c docs/reuse-<short commit>`,
   reset the original branch to its upstream with
   `git branch -f <branch> origin/<branch>` only when it had no other unpushed
   commits, and push the review branch. If the push is rejected because the
   remote moved, do not force or rebase; report it. Each of these leaves an
   action for the user.
3. **Publish** when the documentation is on `origin/<default>`: run the helper's
   `publish <root>`, adding `--owner`, `--area` and, for a new area,
   `--area-title` and `--area-description` (and `--name` when it differs from
   the repository name) for an unregistered repository. The helper retries by
   itself when another developer published at the same moment. If the index's
   default branch rejects the push as protected, rerun with `--via-branch`. A
   local-only index publishes by local commit; say that nobody else can see it.
4. **Report** under the policy, ending with `Action required`, for example:
   - merge `<branch>` (or the review branch) into `<default>`, then run
     `/docs-update` to publish it to the index;
   - open a pull request for the index branch the helper pushed;
   - integrate the remote changes into `<branch>`, then run `/docs-update`;
   - fix the reported discrepancies and deprecated examples in the named files
     (their owners);
   - owner decisions for unresolved findings or code/intent conflicts.

A reuse page does not certify coverage of the whole repository. Agents in other
repositories reach published catalogs through the [organization index](reuse-index.md).
