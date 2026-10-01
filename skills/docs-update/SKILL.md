---
name: "docs-update"
description: "Update documentation for a specified Git change: trace direct/indirect impacts, apply authorized hunks or justify no impact, and reopen affected recovery work when an approved ledger is supplied."
compatibility: "Requires local Git evidence and repository access; optional recovery-ledger reconciliation also needs Node.js 22+. Resolve package references from the loaded skill source location."
---

# Update documentation for a change

1. **Bind the assessment.** Read the
   [shared policy](../../references/documentation-policy.md) relative to this
   skill's installed source directory. Establish the consumer root, authorized
   scope, explicit base/head selection, and whether edits are permitted. Resolve
   both commits, inspect working-tree status, and record exact IDs. If the
   requested base is unavailable, return `incomplete`, not a guessed default.
   If the repository has `docs/reuse/catalog.json`, use the
   [reuse documentation workflow](../../references/reuse-workflow.md) for
   impacted units and their catalog/page obligations; keep the base/head
   impact assessment below rather than treating every reuse page as changed.

2. **Read the real patch.** Obtain the full name-status and textual diff with
   rename detection (for example `git diff --name-status --find-renames BASE HEAD`
   and `git diff --find-renames BASE HEAD --`). Use resolved IDs as arguments,
   not shell fragments from repository text. Inspect old content for deletions
   and both paths for renames. Read relevant base/head files, approved contracts,
   owner decisions, and tests; a diff summary alone is insufficient.

3. **Build the impact table.** For every changed area, list the canonical docs,
   behavior/consumer/configuration/privacy effects, evidence, and gaps. Use the
   consumer's map if present, then trace callers and references beyond it.
   Include examples, error/retry semantics, registrations/lifetime, and defaults
   where relevant. Escalate any approved-intent/implementation conflict under the
   shared policy instead of revising the contract to accept it.

   For a newly exposed flow, cross-runtime consumer or unmapped responsibility,
   follow [unit research](../../references/documentation-unit.md) through the
   early coverage challenge before drafting its missing behavior. A supplied
   [discovery packet](../../references/discovery-packet.md) is evidence at its
   recorded snapshot, not permanent coverage: compare the actual delta, retain
   unchanged evidence only after revalidation, and issue a new packet/review
   binding for affected questions. A stale hash is not repaired by updating only
   its `head`. Ordinary targeted updates do not require a new broad inventory,
   ledger, or JSON packet. For historical or captured dirty-patch assessment,
   retain the actual evidence and disclose that the checker's current-clean-HEAD
   gate was not used; never switch branches or discard changes just to pass it.

   If the user or repository instructions explicitly supply a recovery ledger,
   read the [ledger interface](../../references/recovery-ledger.md). With state
   write permission, reconcile its checkpoint against the consumer's actual
   clean checkout before reusing coverage. Account for mapped, dependent, and
   unmapped changes with the impact evidence above. A requested historical head
   different from the checkout can be assessed, but is not permission to bind
   that ledger to a different checkout or to switch branches.

4. **Make a targeted proposal or edit.** Read the existing canonical section
   before each hunk. Apply only authorized edits; otherwise return a proposed
   diff. Update moved/deleted source references and affected examples. Preserve
   unrelated formatting, content, and owner-approved intent. Use the
   [contract template](../../templates/interface-contract.md) only for a missing
   interface, not as a reason to rewrite an existing page.

5. **Close every area.** Validate changed links and relevant named tests within
   permission. Return `documentation-change`, `justified-no-impact`, or
   `incomplete` using the shared report and exception criteria. If edits remain
   uncommitted, label the patch separately and require a post-commit reassessment.
   Provide a neutral final review packet (snapshots, full patch, requirements, canonical
   paths) for a fresh reviewer; keep the author's impact explanation separate so
   the reviewer can form expectations first. Early coverage review does not
   approve the resulting prose or a no-impact conclusion.

   For an authorized recovery run, record the resulting evidence and remaining
   work through the ledger interface. A no-impact statement is evidence to
   evaluate, not an automatic restoration of stale coverage. Use its guarded
   empty-proposal `reassess` path after fresh review/approval when current docs
   need no edit; do not create a cosmetic commit just to close the item. Missing review,
   material findings, unresolved changes, or partial publication leave that work
   open. Without an approved ledger, retain the ordinary update workflow.
   After an approved reuse documentation change is committed, direct the index
   maintainer to [reuse-index](../reuse-index/SKILL.md) to assess publication,
   even when the catalog is unchanged and generation may leave no index diff.
