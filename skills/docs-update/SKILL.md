---
name: "docs-update"
description: "Bring the current repository's reuse documentation up to date after code changes and publish it in the organization reuse index; also publishes documentation that was merged since the last publication. Use for requests like \"update the docs\", \"refresh the reuse documentation\" or \"publish the docs to the index\"."
compatibility: "Requires Git, Node.js 22+, documentation created by docs-create and an index set up by docs-index. Resolve package links from this skill's installed source, not the current project."
---

# Update this repository's documentation and publish it

Do every step yourself, including delegation to the internal agents; ask the
user only for the final confirmation. Follow the
[documentation policy](../../references/documentation-policy.md) and the
[reuse workflow](../../references/reuse-workflow.md). Run the
[helper](../../scripts/reuse.mjs) from this skill's package root as
`node "<package root>/scripts/reuse.mjs" <command>`.

1. **Preflight.** Run the workflow's preflight, which fetches `origin` first.
   Stop early, with an explicit `Action required`, when:
   - no index is configured: "run `/docs-index`, then `/docs-update` again";
   - the repository has no `origin` remote: "add it, then run `/docs-update` again";
   - `docs/reuse/catalog.json` does not exist: "run `/docs-create` first";
   - uncommitted changes touch `docs/reuse/` or the agent instruction file.

2. **Assess the changes.** Follow workflow step 6 from the last documentation
   commit to `HEAD`. Research new or changed units with workflow step 3 and edit
   the affected pages and catalog entries in the working tree, without
   committing. When nothing is affected, conclude "no documentation change
   needed" with a reason per changed area.

3. **Review.** When anything was edited, follow workflow step 5 with a fresh
   documentation reviewer, given the base, head and full patch; repair material
   findings once.

4. **Check what is left to publish.** The `status <root>` registration line
   reflects the freshly fetched `origin/<default>`, whatever branch is checked
   out:
   - `published`: the index already has the default branch's catalog;
   - `publication pending` (for example after a merge, including a first
     publication of a repository that is `not registered` yet): publish it,
     preparing the registration as in workflow step 4 when it is not registered;
   - `no catalog on origin/<default>`: nothing can be published until the
     documentation is merged; say so under `Action required`.
   Also note `Project unpushed commits` from an earlier run.

5. **Confirm once, commit, push and publish.** Only when there is no edit, no
   unpushed commit and the state is `published` (or nothing can be published
   yet), report that the documentation and the index are up to date, with any
   `Action required`, and stop without asking. Otherwise follow workflow step 7:
   one summary, one question, then commit only the edited files (if any), push,
   and publish when the documentation is on the default branch.

6. **Report.** End with `Action required`. When the documentation is on a
   branch other than the default branch, say exactly: merge `<branch>` into
   `<default>`, then run `/docs-update` again to publish it to the index.
   Include any index pull request, unresolved review findings and owner
   decisions.
