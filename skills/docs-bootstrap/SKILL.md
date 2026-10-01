---
name: "docs-bootstrap"
description: "Bootstrap documentation on explicit request: propose a narrow source-backed diff, document reusable libraries and integrations for other projects, or run/resume scoped recovery with traced discovery evidence, early coverage review, and a durable work queue."
compatibility: "Requires repository access and Git evidence; recovery additionally requires Node.js 22+ and an approved external checkpoint path. Resolve package references from the loaded skill source."
---

# Bootstrap repository documentation

1. **Establish scope.** Confirm the explicit bootstrap request, consumer root,
   audience, authorized paths, and current Git snapshot. Resolve and read the
   [shared policy](../../references/documentation-policy.md) from this skill's
   installed source directory before proceeding. If either root or permission is
   unclear, report the missing input rather than guessing.

2. **Select the operation.** A discovery-only request uses the read-only
   [repository-discovery agent](../../com.github.copilot/agents/repository-discovery.agent.md)
   and stops at its system-map/report handoff, without entering steps 3-5.
   For requested independent map review or a transition from that map to writing,
   the caller uses [map review and bounded repair](../../references/discovery-map-review.md);
   discovery alone does not authorize a repair dispatch or writing.
   If delegation is unavailable, disclose that and use its procedure read-only;
   do not claim a fresh context. A bounded onboarding request uses the narrow path
   below. A request to make a repository's reusable libraries and integrations
   usable from other projects uses [reuse documentation](../../references/reuse-workflow.md)
   instead of steps 3-5; after its approved batch is committed, direct the
   maintainer to publish through [reuse-index](../reuse-index/SKILL.md).
   A request to recover documentation across a legacy repository uses
   [recovery](../../references/recovery-workflow.md). A request to continue an
   existing recovery uses that procedure's resume path and the explicitly named
   ledger. If breadth, checkpoint location, or budget is unclear, ask before
   starting recovery. Discovery alone does not authorize a repository-wide run.

3. **Inventory the narrow boundary.** Read existing instructions, canonical
   index, relevant architecture/contracts, source/tests, and decisions. Report
   each relevant document's path, audience, owner or unknown, authority,
   source boundary, and gaps. Reuse existing homes; identify competing pages
   before proposing a new one. Age alone does not invalidate existing intent.

4. **Research and propose one useful change.** Follow the
   [documentation-unit procedure](../../references/documentation-unit.md):
   define the reader's questions, trace implementation through result consumers,
   and challenge new discovery independently before drafting. Expose gaps and
   supply exact proposed hunks without applying them. Narrow work needs no ledger
   or mandatory JSON packet; recovery follows its packet/checking procedure.
   Use the linked
   templates only for genuinely missing material. A new page needs a route from
   the existing entry point; a source map is not proof of complete coverage.

5. **Review and hand off.** Return the shared report with inventory, expected
   obligations, proposed paths, sources, unassessed scope, and needed decisions.
   Provide neutral evidence for a fresh reviewer before the author's explanation.
   After exact-hunk approval, reread target files, materialize only those hunks,
   and verify their complete resulting content as well as relevant links/checks.
   Bind the post-commit assessment to the actual new head. A proposal or one
   completed page does not constitute whole-repository recovery.
