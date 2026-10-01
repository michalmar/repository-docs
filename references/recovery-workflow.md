# Resumable documentation recovery

Use only for an explicit request to recover documentation across a repository,
or to resume a named recovery. A narrow bootstrap continues to use its existing
bounded path. Read the [shared policy](documentation-policy.md) first.

## New recovery: agree before writing

Establish maintainer and interface-consumer questions, the actual Git snapshot,
allowed source/dependency access, documentation paths, check permissions, and
budget. Agree on an external artifact/checkpoint location; never guess a user's
configuration directory or put mutable run state into canonical documentation.

Recovery requires Node.js 22+, Git, accessible installed package resources, and
the [ledger helper](recovery-ledger.md). Verify those capabilities. A missing
capability yields an explicit incomplete result rather than a manual success
record or an unapproved installation.

Run [repository discovery](repository-discovery.md) before picking a writing
topic. Retain the declared scope in an external source-bound
[system map](../templates/discovery-report.md) or
[discovery packet](discovery-packet.md), identify the architecture-spine question,
and build prioritized work items with questions, watched source/config/test
paths, canonical document paths, dependencies and exclusions. Initial breadth
may contain explicit gaps; finish traces and independent coverage review for
each selected question before its prose, not every queued topic up front.

When a supplied system map is the basis for admitting writing, complete
[map review and bounded repair](discovery-map-review.md) before `init`.
Retain its admitted map/review references in the inventory evidence. A failed
declared map gate cannot be bypassed by selecting an unrelated narrow unit.
Direct selected-question recovery still uses its packet gates; this does not
require completing every queued Interface contract in the initial map.

Obtain approval for the initial target, state path and capacity for early coverage
and final claim review. Follow the ledger reference's unchanged version-1 plan
format and `init` command. Use `inventory.ref` for the immutable initial inventory;
the helper records the real consumer snapshot and instruction identity. Keep
canonical docs/map in the consumer; keep evidence and the mutable run ledger
outside both the consumer and installed plugin.

Declare coordinator-owned routing files in the plan's `navigation`, separately
from each item's substantive canonical documents. Each proposal fingerprints
their complete intended content. A dependent interface can then add its index/map
entry without invalidating an unchanged architecture prerequisite. Routing
declarations are not permission to relabel source or contract text as navigation.

**Gate:** an approved bounded target, explicit unit budget, inventory evidence,
and a resumable initialized ledger exist. Discovery alone has not written docs.

## Resume: validate rather than restart

Read only the explicitly supplied ledger and verify its consumer root, run goal,
scope, snapshot and procedure identity through `status`. A new process must
reconstruct progress from it, not from the author's remembered transcript.

If source or instructions changed, use the ledger's explicit `sync` and
evidence-bearing reconciliation. Inspect the real changes, including renamed
and deleted paths, affected dependencies and unmapped areas. Reuse unaffected
evidence only when its binding remains valid. An unmapped path never means
automatic no impact.

Surface malformed state, stale writer revisions, unavailable commits or an
unexpected checkout. Preserve the existing ledger; never reinitialize it to
hide a failure. Do not switch branches or broaden permissions to make it pass.

**Legacy compatibility:** version-1 ledgers with narrative inventory references
still load. Adopting changed procedures uses normal explicit drift reconciliation;
it does not migrate the plan schema or fabricate a prior discovery review. At
the next research attempt, add the current question's packet/check/coverage-review
references through existing research evidence. Preserve closed historical items
and their actual evidence; reopen only when normal drift or new findings require
it. The ledger does not dereference packets or enforce this procedural gate.

**Gate:** the ledger can safely describe the current checkout, or the run is
paused with concrete stale/unclassified work and a next action.

## Iterate one ready work item

1. **Select.** Use `next`. Resume an active item first; otherwise choose the
   highest-priority dependency-ready item. An empty ready queue can mean
   blocked work, exhausted budget or an incomplete run, not success. Record the
   round's selected IDs; collect feedback without silently enlarging that round.

2. **Research.** Give the author that question, relevant inventory, canonical
   paths and source routes. Follow [unit research](documentation-unit.md), retain
   a question-specific discovery packet and perform the source-first coverage
   challenge before drafting. Run its checker; `review-required` and `incomplete`
   are not ready. Record the packet, check and early review references using the
   existing `research` evidence fields; preserve material findings as gaps until
   resolved. Return unrelated discoveries as separate map feedback without
   silently expanding this item.
   The same independent reviewer may later review prose, but never author it.

3. **Propose.** Produce exact hunks for the chosen boundary, together with source
   evidence and remaining gaps. Use the existing overview/index to keep the
   change discoverable. A finished artifact is not yet closed coverage.

4. **Review.** Prepare the neutral source/requirements packet for a fresh
   read-only reviewer. Deliver the candidate and author report only after
   independent expectations, or continue the uncontaminated independent coverage
   context with its retained expectations. Record final findings and
   proposal-bound outcomes separately from the earlier discovery review.
   Repair material findings; classify missing evidence as partial/blocked.

5. **Approve and commit.** Obtain approval for exact hunks, apply only them, verify
   complete resulting content and relevant checks, then commit. Record the
   actual result through the ledger's guarded publication/completion interface.
   A mixed or unexpected source change requires reconciliation, not a fabricated
   documentation-only completion. If fresh assessment shows current documentation
   needs no edit, use the ledger's empty-proposal `reassess` gate after research,
   independent review and approval; retain its current Git bytes without a
   cosmetic documentation commit.

6. **Checkpoint.** Preserve evidence, separate map feedback, approval and the new
   head. Report coverage separately from publication and owner intent. Continue
   the selected round within its budget; at its boundary perform
   [round reconciliation](documentation-rounds.md) before selecting new/affected
   work or declaring closure. Partial/blocked items and deferred feedback remain
   visible rather than triggering an automatic retry loop.

The initial helper serializes one active item. Keep the shared index, source map
and queue under coordinator ownership. Do not spawn a fleet or parallel ledger
writers merely because several topics exist. Fresh author contexts can continue
successive items; review always has a real independent context.

## Stop honestly and hand off maintenance

Return the common report plus the ledger path/revision, assessed target, completed
items, partial/blocked/deferred work, unclassified changes and budget status.
The unit budget is a dispatch limit, not a measurement of model credits or time.
Respect any separately agreed host/time/credit ceiling and checkpoint when reached.

Run closure requires all agreed obligations and returned map findings reconciled,
with no essential gap. The helper does not enforce semantic round closure.
Explicit exclusions and deferrals remain visible; they are not documented
behavior. Sampling outside
the mapped scope can reveal omissions, but cannot prove exhaustive coverage.

After initial recovery, use [docs-update](../skills/docs-update/SKILL.md) for real
base/head changes. Supply the approved ledger so affected work can be reopened.
Changes to source, consumers, configuration, contracts or instruction identity
can invalidate an earlier assessment without implying a rewrite of every page.

Measure reviewed answers, unresolved material findings, correction effort and
usage per bounded task. Page counts, tool-read counts and successful links are
not semantic quality scores. Model/effort selection belongs to the caller; this
procedure does not pin a model or treat maximum reasoning as a coverage strategy.
