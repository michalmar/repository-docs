# Map feedback and documentation rounds

Use when detailed research/review finds something that changes the discovery
map or another documentation task, and at each recovery round boundary.
The [unit procedure](documentation-unit.md) owns detailed research and prose
review; the [ledger](recovery-ledger.md) owns work state. One coordinator owns
map revisions, shared navigation and ledger writes. This is a serial procedure,
not a scheduler or permission to start a fleet.

For findings from initial system-map review, use the classification and
single-repair limit in [map review](discovery-map-review.md). Reuse the finding
fields and reconciliation rules below, but keep the pre-writing record external:
no work-item ID or ledger event is required before admission. The ledger-routing
steps below apply only after a recovery has been authorized and initialized.

## 1. Return findings separately from the document

Alongside the exact documentation proposal or justified retention, return
`map feedback: none in the assessed scope` or the following finding records.
Retain them externally, not in canonical documentation.

| Field | Required content |
| --- | --- |
| Finding ID and origin | Stable ID, author/reviewer artifact and originating question/work item. |
| Binding | Exact source snapshot, procedure identity and supplied map reference/revision; state when no map was supplied. |
| Kind | New documentation topic, new relationship, classification correction, or impact on existing documentation. |
| Affected IDs | Known Module, relationship, topic and work-item IDs; mark proposed IDs and unmapped impacts explicitly. |
| Evidence | Paths plus symbols/lines supporting the finding; distinguish observation, inference, approved intent and gaps. |
| Reader consequence | What the reader cannot safely understand/use/change, and why the current task does not already cover it. |
| Proposed disposition | Handle here, merge with a named topic/finding, add scoped work, reopen affected work, or defer/exclude with a reason and consequence. |

A newly understood parameter or failure branch normally stays inside the current
question. Promote it only when it changes map granularity, adds a worthwhile
reader question, or invalidates another answer. A renamed label is not a new
responsibility. Map feedback does not approve a contract or broaden edit scope.

Flag material correctness/authority conflicts immediately. Hold the affected
claim/publication and identify the next owner/action; do not wait for the end
of the round to disclose a known misleading answer.

**Exit:** each finding has evidence, a reader consequence and a proposed route,
or explicitly names the evidence needed before it can be accepted.

## 2. Reconcile before assigning another round

Keep an external round record: round ID, source/procedure/map references,
selected work-item IDs, topic-to-work mapping, feedback references, coordinator
dispositions, and remaining budget. This record is explanatory evidence; the
ledger is the single work-state authority. A round covers the selected items
once, including blocked/partial outcomes, rather than retrying until they pass.

At the boundary, after active work is closed or safely paused:

1. Check each finding against the source snapshot and current map. If Git
   advanced, explicitly reconcile the affected anchors and preserve the old
   binding; documentation-only commits do not permit silently relabeling it.
   Use ordinary `sync` for actual source/procedure drift, not for new knowledge.
2. Deduplicate by responsibility, reader question and source/consumer routes,
   not title alone. Record accepted, duplicate-of, rejected, deferred or
   evidence-needed dispositions with reasons. Distinct consumers may warrant
   separate questions even when their labels match.
3. Revise the external observational map under the same stable IDs where
   possible, retaining superseded versions and aliases for merged topics.
   Decide which existing work is actually invalidated and why. Changes to
   canonical shared navigation still need an exact reviewed/approved proposal.
4. Route an accepted new question through `discover` with a complete item and
   dependency definition. Route a finding that invalidates closed work through
   evidence-bearing `reopen`; its dependent closure is invalidated too. Queue
   records are not approval of prose or an expansion of the agreed budget.
   Explicit reopening targets must be closed; unclosed work uses ordinary
   research/repair/resume. Reopening requires a clean checkpoint, including
   canonical drafts; preserve and reconcile dirty work first.
   Refer to the reconciled finding/decision artifact as event evidence.
5. Select the next round from new or affected work and previously unfinished
   agreed work. Leave unaffected closed items closed. Work that remains active
   resumes through existing gates. If an active dependent would be invalidated,
   preserve and explicitly pause it before reopening its closed prerequisite.
   The helper rejects unsafe active reopening.

Register newly found work at this boundary so it does not silently expand the
current assignment. An urgent correction can end the round early at a safe
checkpoint. If a finding exceeds the approved goal/access/budget, request that
change or stop with the pending decision; acceptance of a finding is not
permission for unlimited follow-up.

**Exit:** every returned finding has a reconciled disposition, accepted
in-scope work has a ledger route, and the next bounded selection is explicit.
An evidence-needed or essential deferred finding remains a coverage gap.

## 3. Repeat only the affected research

Use the ordinary unit research, selected-question packet, independent coverage
challenge and final candidate review for new/reopened questions. Previous
publication is history, not reusable approval for changed conclusions. When
existing prose is still correct after fresh assessment, use `reassess` rather
than inventing a cosmetic edit. Dependent questions wait for their prerequisites.

At the next boundary, reconcile that round's findings before declaring closure.
An empty ready queue or absence of new pages is insufficient. Closure requires
reviewed scoped answers, all accepted material findings incorporated or explicitly
excluded by the agreed scope, and no essential unresolved coverage/authority gap.
Budget exhaustion, missing decisions and blocked evidence mean a checkpoint
with remaining work, not success.

The helper checks declared state transitions, not semantic certification of
findings, map completeness or human approval. It does not parse the external
round record or enforce this reconciliation gate; the coordinator must report
it separately from the helper's mechanical `complete` status.
