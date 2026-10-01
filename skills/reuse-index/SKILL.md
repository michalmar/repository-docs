---
name: "reuse-index"
description: "Publish an approved organization reuse index after reuse documentation changes, or maintain its repositories and consumer-facing areas when evidence shows the routing needs to change."
compatibility: "Requires Node.js 22+, Git, and local sibling clones configured by reuse setup for sync. Resolve package links from the loaded skill source; publication and maintenance need separate approvals."
---

# Publish and maintain the organization reuse index

1. **Bind the change.** Read the [shared policy](../../references/documentation-policy.md)
   and [index contract and change control](../../references/reuse-index.md)
   from this skill's installed source directory. Confirm the approved reuse
   documentation change or the requested maintenance operation, its owner and
   approval, the configured clone root, index checkout, manifest branch and
   source catalog revisions. Establish a clean index checkout on its remote
   default branch and its current base commit. If approval, configuration,
   ownership or source evidence is missing, report what is incomplete.

2. **Sync before branching.** Run `node scripts/reuse.mjs sync` from the plugin
   root while the index clone is on its remote default branch. Inspect the
   result: the command does not update the index clone. Stop on a missing or
   foreign index checkout, failed fetch, dirty or wrong-branch source clone,
   divergence, or a missing committed catalog needed by `generate`; resolve
   that state with its owner rather than publishing an old or partial snapshot.
   Fetch and fast-forward the index clone separately when its remote default
   branch has advanced, then recheck the intended change. Record the catalog
   revisions that will be indexed. `status` alone uses local refs and is not
   a substitute for sync.

3. **Propose maintenance before editing.** If a budget failure, a unit with no
   fitting area, or an empty or near-empty area warrants maintenance, make a
   source-backed proposal using the [maintenance rules](../../references/reuse-index.md#roles-change-control-and-maintenance-triggers).
   Show affected manifest entries, areas, catalog units, owners, consumer
   routes and expected file changes. Obtain explicit approval for the exact
   add/remove repository, create/rename/split/merge area, or catalog `area`
   move **before applying any maintenance change**. A moved unit's `area`
   is a documentation change in its own repository: send it through that
   repository's owner-approved documentation workflow and wait until its
   commit is available on the manifest branch. Re-run sync **while the index
   clone is still on its default branch** to take in those catalog changes.
   For a manifest or areas change, only then create an index topic branch
   from the fresh default branch **before editing**; arrange missing sibling
   clones under the approved root without changing personal setup or
   overwriting existing clones. Do not publish the index until all required
   source and index inputs fit.

4. **Generate, check and review.** Run
   `node scripts/reuse.mjs generate <absolute-index-checkout>` from the plugin
   root. Generation validates the manifest, committed catalogs and every
   complete output against the 16,384-byte UTF-8 budget before writing.
   Report each generated file's actual byte size, including `llms.txt`,
   `catalog-revisions.json` and every generated `area-*.txt`; a failed
   generation is a stop: return to the maintenance proposal in step 3 if
   the budget requires a new area, rather than hand-truncating a file. Inspect
   `git status` in the index checkout, stage **only** the approved manifest/
   areas changes and generated additions, edits and deletions, then show
   `git diff --cached --stat`, the complete `git diff --cached`, and
   `git diff --cached --check`. Include untracked generated files in that
   staged review. If no index diff remains, report it as up to date; do not
   create an empty commit or push. Resolve unexpected diffs before continuing.

5. **Commit, then request push approval.** Commit the reviewed index diff.
   If neither `manifest.json` nor `areas.json` changed against the recorded
   default-branch base, this is a regeneration-only commit: request explicit
   approval to push directly to the verified remote default branch (`main`
   when that is its name). If either changed, keep the topic branch and
   request explicit approval to push that branch instead.
   **Never push without approval for the specific target.**
   If an approved direct push is rejected because the default branch is
   protected, create a topic branch at the committed index change, show the
   new target, and request approval again before pushing it. A
   non-fast-forward rejection requires reconciling the remote and
   regenerating, not a force push or automatic fallback. For branch
   publication the user opens the pull request in the GitHub or Azure DevOps
   UI; report the branch and remaining review rather than opening or merging
   it on their behalf.
