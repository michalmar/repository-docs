# Research, write, and review a documentation unit

Use for a narrow bootstrap, one recovery work item, or a bounded missing contract
discovered during update. The [shared policy](documentation-policy.md) governs
authority, permission and outcomes.

## Frame the question

Record the audience, source snapshot, canonical home, actual question and its
acceptance obligations. Reuse existing approved content. A broad label such as
"all application hooks" is not a sufficiently bounded integration contract;
either define a locator-only overview or select concrete behavior to explain.
When supplied, use the discovery topic's stable IDs, scope and source routes as
the starting assignment, not as evidence that its detailed contract was verified.

**Exit:** scope, intended reader task, source routes and exclusions are explicit.
Identify whether this is new behavior discovery or a targeted correction whose
source obligations are already established; only the former needs the early
coverage challenge below.

## Trace the evidence

Read the relevant implementation, registrations, callers, configuration, schemas,
tests, existing contracts and decisions. Trace beyond the first function when
consumer behavior or defaults are selected elsewhere.

| Dimension, when relevant | Evidence question |
| --- | --- |
| Selection and inputs | Which defaults, flags, request/company settings or registration precedence choose this behavior? |
| Outputs and usage | What arguments, results and consumer obligations make a normal example usable? |
| State and lifecycle | What is persisted, who owns it, when is it committed/released, and can a call repeat? |
| Failures | What propagates, falls back, partially succeeds, retries or needs recovery? |
| Trust and privacy | Who can trigger it, what permission checks are bypassed, and which data crosses the seam? |
| Compatibility | What exact ranges/shapes are declared, and which guarantees actually have owner approval? |
| Other runtimes | Does browser/client behavior have separate registration, defaults or failure modes? |
| Tests | Which named tests assert the claim; were they read or actually run? |

Cite useful paths plus symbols or lines for material claims. A directory list is
investigation routing, not evidence that all its consumers were inspected.
Treat unfamiliar framework semantics as a dependency question, not a fact inferred
from a decorator name. Preserve exact dependency ranges rather than paraphrasing
them into narrower or broader support promises.

Record new investigation items and indirect consumers as
[map feedback](documentation-rounds.md) for the coordinator. Keep details that
answer this question in the current research; distinguish them from a genuinely
new topic, relationship or impact on another answer.
If essential evidence is missing, mark this scope partial/blocked. Independent
ready work may continue; required unknowns do not become a successful contract.

For new discovery, retain a selected flow from caller through selection/handler
and effects to its result consumer. Cross-runtime calls and failure branches
need their own evidenced relationships; one global limitation cannot dispose of
all consumers. In recovery, use the [packet reference](discovery-packet.md) for
stable IDs, dimension dispositions and exact snapshot binding. A narrow task may
retain the same trace and applicability accounting inline, without a ledger or
mandatory JSON tooling.

**Exit:** every relevant dimension has an evidenced answer, unavailable evidence,
or a source-backed non-applicability reason. Named tests distinguish source
inspection from execution. Another context can follow the selected trace and
the unresolved branches without relying on the author's memory.

## Challenge new discovery

Before drafting a newly discovered contract or architecture relationship, use
the [discovery coverage challenge](repository-discovery.md). The independent
reviewer derives expectations before receiving the author's packet; omissions
and unjustified exclusions return to research. An existing coverage review may
be reused only for the same selected question, snapshot and unchanged packet.

For a targeted wording/link correction with established obligations, retain the
scope reason and proceed to final candidate review without another breadth pass.
Recovery still supplies a question-specific packet at the next research attempt;
legacy published items are not retroactively relabeled as packet-reviewed.

**Exit:** the selected new behavior has independent advisory coverage support
and no essential gap, or remains explicitly incomplete. A valid packet alone
does not satisfy this gate.

## Draft a canonical change

For a missing interface use the [contract template](../templates/interface-contract.md);
for an overview use the [architecture template](../templates/architecture-overview.md).
Adapt to the real scope instead of filling irrelevant headings. Retain an
existing repository's structure and localization.

Supply a concrete example with evidenced setup/registration constraints where
possible. Label observations, approved intent and proposals separately. Pending
ownership may remain pending in observed/proposed text; it is not approval of a
new compatibility contract.

A new page needs a discovery route from the existing entry point. Keep packet
IDs, review rounds, run budgets and checkpoint state in external artifacts.
Canonical text records durable facts, authority and relevant evidence limits,
not the mutable recovery process. Use the
[source/document map](../templates/documentation-map.json) for useful source and
named-test routes, not complete-coverage assertions. Use
[project exceptions](../templates/project-policy.md) only for real local
deviations. Keep unrelated content and formatting intact.

**Exit:** exact proposed hunks, authority labels, examples, claim evidence,
navigation, and remaining gaps are ready for review; nothing is applied merely
because a skill was invoked.

## Review and repair

Prepare neutral Git-produced revisions, name-status, complete patch, relevant
source snapshots, the reader's questions and approved requirements. For unchanged
source, name the snapshot and proposed documentation patch explicitly. The
fresh [reviewer](../com.github.copilot/agents/documentation-reviewer.agent.md)
derives obligations before reading the candidate and author's explanation.
An independent context used for coverage review may continue with its retained
expectations, provided it did not author the repair and the binding remains
valid. This is final claim review, not a replay of a structural packet check.

Review both unsupported statements and missing material behavior. Resolve findings
against a revised candidate, preserving their IDs and evidence. Missing
source/search capability limits the review; it is not a pass. A newly discovered
unrelated topic returns as map feedback rather than silently enlarging the
current task or letting an author rewrite the shared map.

**Exit:** the bounded candidate has no unresolved material findings, or is
explicitly partial/blocked. The review is advisory and does not authorize writes.

## Apply only the approved batch

After exact-hunk approval, reread targets and materialize the approved content.
Check full resulting files against the proposal, not just `git apply --check`:
incorrect hunk counts can otherwise omit intended lines. Check affected navigation,
source/test references, map syntax and relevant authorized repository checks.

Commit a coherent change and reassess its actual base/head. A recovery coordinator
records the result through the [ledger](recovery-ledger.md); the helper's gates
do not certify the prose. Preserve useful partial publications without declaring
their work items covered.

**Exit:** the stored result matches approval, relevant checks and gaps are
reported, and the next action is reviewable. A finished page does not finish
unrelated recovery work.

When current canonical content already answers the question, report justified
no impact instead of manufacturing an edit. For recovery, the ledger's explicit
`reassess` path verifies an empty proposal and current document/navigation bytes
after fresh evidence, independent review and approval. It closes the bounded
assessment without claiming a new publication.

Return separate map feedback with every author outcome, including partial or
blocked results: finding records under the linked procedure, or an explicit
statement that none was found within the assessed scope. The coordinator
reconciles these before choosing another round; finishing this document is not
permission to dispatch more authors.
