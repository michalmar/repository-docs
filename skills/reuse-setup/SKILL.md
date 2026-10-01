---
name: "reuse-setup"
description: "Set up or update a developer's organization repository clones and reuse index, including when they explicitly name a checkout outside the configured clone root. Use for ordinary requests like \"set up the organization repositories\" or \"update my organization clones\": choose a clone root, review personal configuration and pointer writes, then run setup, status or safe sync."
compatibility: "Requires Node.js 22+, Git, local clone access and a chosen index Git URL. Resolve the helper and index reference from this skill's installed source, not the current project."
---

# Set up local organization reuse

1. **Bind the operation and paths.** Read the [organization index guide](../../references/reuse-index.md)
   and use the [local reuse helper](../../scripts/reuse.mjs) from this skill's
   package root. For setup, obtain the developer's chosen absolute clone root,
   index clone name and index Git URL; do not infer them from the current project.
   For status or sync, use the existing personal configuration. Inspect the
   chosen root and existing index manifest locally when available. If a required
   path, index URL or operation is unclear, ask rather than running a write.

2. **Resolve a named outside checkout.** Only when the developer explicitly
   names an outside checkout, match it to a repository in the local index
   manifest by its explicitly declared name, URL and branch; if the
   identity is unclear, ask instead of guessing from the outside folder or URL.
   Inspect only that named path and the configured root; do not scan other
   locations or follow unexpected links.
   Explain that index links such as `../<manifest-name>/docs/reuse/...` resolve
   from `<root>/<indexRepo>` to `<root>/<manifest-name>`, not to the named
   checkout outside the root. Show that exact expected destination and the
   manifest URL and branch. Leave the outside checkout in place, unchanged:
   never move, rename, delete, pull or modify it, and never change the configured
   root to accommodate it silently. Run `status` for the in-root destination.
   If it is missing, offer a **fresh** clone there via the existing `sync`
   flow, with the full effect disclosed: sync may fetch/fast-forward other
   clean matching clones under the root. **WAIT FOR EXPLICIT USER CONFIRMATION**
   of that action before running `sync`; an ordinary request or silence is not
   approval. If the developer only wants the missing clone and does not approve
   the other possible sync effects, stop and explain that the helper cannot
   target one repository. If the destination already exists, do not offer a
   replacement clone: report its `status` state (clean, behind, dirty,
   wrong-branch, diverged or foreign-origin) and follow the usual preflight
   and skip rules for any separately requested sync. Never overwrite the
   destination. Finish this branch only after reporting the actual in-root
   state and any missing approval; the outside checkout is not a substitute.
   After an approved `sync`, use `status` to report the result, not a second
   sync.

3. **Preview and confirm setup.** Only for initial setup or an explicitly
   requested root change: before running `setup`, show the chosen root,
   index clone destination and the manifest clone destinations known locally.
   Show every write outside the clone root: the exact proposed content and
   existing content or absence of `~/.org-reuse/config.json` (absolute `root`,
   `indexRepo`, `indexUrl`) and
   `~/.copilot/instructions/org-reuse.instructions.md` (`applyTo: "**"` and
   the absolute `<root>/<indexRepo>/llms.txt` path). Show the resolved home
   paths and any parent directories that need creation. Only these two files
   may be written outside the clone root. **WAIT FOR EXPLICIT USER CONFIRMATION
   before writing the configuration or the pointer**, including when they do
   not exist or would be unchanged. An ordinary setup request, autopilot or
   silence is not that confirmation; if unavailable, stop without running
   setup. The helper asks for `yes` only when replacing a different pointer:
   answer it only after the user approves that exact replacement.

4. **Run approved setup.** From the package root, run
   `node .\scripts\reuse.mjs setup '<root>' '<indexRepo>' '<indexUrl>'`
   (use `./scripts/reuse.mjs` on Unix). It may create the root and clone the
   index and manifest repositories within it; existing clones stay in place
   and are not pulled. If setup fails partway, report the error and which
   clones or personal files were actually created; do not imply rollback or
   silently rerun. To change roots, repeat the preview and confirmation for
   the new paths; leave old clones untouched.

5. **Inspect, then update only on request.** For ordinary status or update
   requests not already handled in step 2, run
   `node .\scripts\reuse.mjs status` to read local states without fetching.
   For a requested clone update, run `node .\scripts\reuse.mjs sync`, then
   `node .\scripts\reuse.mjs status` again. `sync` fetches only clean,
   matching-branch clones and advances them **fast-forward only**; it may
   clone missing manifest repositories. It never fetches the index checkout
   or rewrites the personal configuration or pointer. Never delete, move or
   rename clones. Use the Git-based helper, not `gh` or `az` provider CLIs.

6. **Report without repairing.** List each clean/updated/missing clone and
   report skipped dirty or wrong-branch clones, diverged clones, foreign-origin
   paths (which abort sync before any fetch), and `index stale` or `not indexed`
   repositories. Report a missing/different pointer, unavailable local tracking
   ref, missing catalog or command error as such, not as success. `status`
   observes local refs, not the live remote. Do not merge, rebase, reset,
   force-update, regenerate or republish the index as a remedy; hand off any
   separate maintainer action explicitly.
