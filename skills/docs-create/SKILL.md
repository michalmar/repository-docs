---
name: "docs-create"
description: "Document the current repository's reusable libraries and integrations for other projects and publish them in the organization reuse index. Use for requests like \"document this project\", \"make this repository reusable for other teams\" or \"add this repository to the docs index\"."
compatibility: "Requires Git, Node.js 22+ and an index set up by docs-index. Resolve package links from this skill's installed source, not the current project."
---

# Document this repository and publish it

Do every step yourself, including delegation to the internal agents; ask the
user only for the final confirmation. Follow the
[documentation policy](../../references/documentation-policy.md) and the
[reuse workflow](../../references/reuse-workflow.md). Run the
[helper](../../scripts/reuse.mjs) from this skill's package root as
`node "<package root>/scripts/reuse.mjs" <command>`.

1. **Preflight.** Run the workflow's preflight. Stop early, with an explicit
   `Action required`, when:
   - no index is configured: "run `/docs-index`, then `/docs-create` again";
   - the repository has no `origin` remote: "add it, then run `/docs-create` again";
   - `docs/reuse/catalog.json` already exists: the repository is already
     documented; "run `/docs-update` to bring it up to date and publish it";
   - uncommitted changes touch the files this skill would draft.

2. **Survey, research and draft.** Follow workflow steps 2-4: inventory the
   reuse surfaces with a fresh discovery agent, research each unit, and write
   the pages, catalog and agent-instruction sentence into the working tree
   without committing. Prepare the index registration.

3. **Review.** Follow workflow step 5 with a fresh documentation reviewer, then
   repair material findings once.

4. **Confirm once, commit, push and publish.** Follow workflow step 7: one
   summary, one question, then commit only the drafted files, push the current
   branch, and publish when the documentation is on the default branch.

5. **Report.** End with `Action required`. When the documentation is on a
   branch other than the default branch, say exactly: merge `<branch>` into
   `<default>`, then run `/docs-update` in this repository to publish it to the
   index. Include any index pull request, unresolved review findings and
   owner decisions.
