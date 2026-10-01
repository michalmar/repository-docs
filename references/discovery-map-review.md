# System-map evidence, review and bounded repair

Use for relationship verification during discovery, independent `system-map`
review, and the coordinator's transition from a supplied map to writing.
This precedes the selected-question packet and prose gates. It uses the existing
discovery author, independent reviewer and coordinator, not a new agent role.

## 1. Establish the map-level bar

Before author delivery, the reviewer retains source-first expectations within
the declared snapshot, readers and scope. For each material obligation, record
an ID, source anchors, the minimum map fact or research assignment, criticality,
and the reader consequence of its absence. Classify findings against this bar:

| Class | Required response |
| --- | --- |
| Map error or essential gap | Correct an unsupported connection, missing responsibility/consumer, or uncertainty that prevents assigning research. Hold admission. |
| Missing research disposition | Assign the material reader question to a bounded topic with source starts, or justify exclusion within the agreed scope. Hold admission while essential work is unassigned. |
| Delegated detail | Retain the question under an existing topic that explicitly covers it; no completed contract or separate helper page is required. |
| Authority decision | Record both sources, consequence and owner follow-up. Hold a normative claim; block the observational map only when its responsibility, connection or assignment cannot be established. |

A distinction belongs in the map when it changes the participants, data/resource
route, ownership, result consumer, or the scope of the next investigation.
Parameter arithmetic and exhaustive branch/assertion matrices stay in detailed
research unless they establish that distinction. Grouping remains valid when
the grouped routes and their differences are visible.

In evaluations, calibrate atomicity, granularity and criticality before freezing
the key and dispatching the author. A later key disagreement is a retained
dispute, not permission to weaken a criterion or relabel a historical failure.

Criticality needs an explicit reader consequence: omitting the obligation would
leave a core responsibility, material boundary or essential research assignment
unusable or misleading. The presence of stored data, credentials or an output
channel is a source lead, not by itself a critical finding. For each relevant
data question, identify the reader, actual data route and required research
scope. Detailed permission matrices and retention guarantees can stay open.

Calibrate equivalent wording and grouping with short controls before author
dispatch. For example, when the obligation is assigning stored-data visibility:

| Supplied map/handoff text | Judgment and boundary |
| --- | --- |
| "T-records: maintainers investigate who can read retained job records; start at store.write and admin.list; deployment permissions remain unverified." | Covered research disposition, assuming those source routes are evidenced. It does not claim a completed access audit. |
| "T-records: document storage and its lifetime." | Partial for the visibility obligation; a nearby storage topic does not explicitly assign it. |
| "T-records covers record visibility; exact ACLs and deletion timing require owner/deployment research." | Delegated detail is valid inside the explicit assignment; do not demand those answers in the map. |

These are calibration examples, not keyword rules or case-specific answers for
the discovery author. Record prospective changes to a reused key as a new
revision with reasons; keep the original key and historical scores unchanged.

**Exit:** expectations explain what must be established now and what may be
delegated, with source support rather than expectations derived from the map.

## 2. Verify relationship witnesses and data routes

For each material relationship, the author records a short witness:
stable relationship ID, producer, carried data/resource, actual mechanism,
consumer/effect, and source anchors for the connecting steps. An anchor may
cover several steps; file existence or similar names do not establish a bridge.
Separate observed connections from inferred or inaccessible links.

Compare sibling routes where the inventory exposes alternatives. Keep distinct
mechanisms, resource ownership/lifetimes and output shapes explicit, even inside
one Module or topic. Structural construction and behavior simulation, for
example, can share a documentation home without one being an output of the other.
Trace only far enough to substantiate the connection and assign later research.

Before returning the map, reconcile data routes exposed by the surveyed sources:
file/config inputs, returned values, persistence, events/listeners, logging and
external output where present. Follow the actual result consumer, including a
value returned into another computation. Record the relationship/topic IDs or
a source-backed deferral/exclusion; mark unavailable routes as gaps.
For stored or emitted application data, explicitly assign relevant visibility,
access/protection, retention or exposure questions to a topic. A generic storage
or logging label does not assign these questions. This is research routing, not
a completed privacy audit or a requirement to invent absent channels.

Record callable read/search/symbol capabilities, not only profile aliases. When
search is unavailable, use an authorized inventory and targeted reads, state the
limitation and leave any essential untraced route incomplete. Tool declarations
do not establish host support; broader tools or access require separate approval.

**Exit:** material connections have supported witnesses or named gaps, and each
discovered data route has an explicit documentation disposition.

## 3. Review the exact map

Only after retaining expectations, read the map. For each obligation, compare
the complete assigned scope with exact report text and source anchors. A nearby
topic, source locator or broad label is not coverage of an unstated mechanism or
research question. Confirm every critical-covered judgment explicitly, including
which report text covers the full obligation; partial coverage stays partial.

Return stable finding IDs using the evidence, affected IDs, reader consequence
and proposed-disposition fields in [map feedback](documentation-rounds.md).
Add the classification above and an exact report quote (or omission context).
Record unsupported claims separately from positive coverage. Record essential
unreviewed scope, source/key disputes and actual capability limitations.
Detailed questions correctly assigned for later work are not map defects.

**Exit:** the advisory review is bound to exact source/procedure/map references,
all declared obligations are assessed, and critical-covered judgments have
explicit scope confirmations. Incomplete review remains incomplete.

## 4. Coordinator: preserve, repair once, then admit or stop

Before dispatch, record the authorized scope, source/procedure identity, external
artifact location, author/reviewer identities and repair limit: zero or one.
Use zero when repair is not authorized. A first-output-only evaluation retains
that limit; a repair ceiling does not require using an attempt.

1. Save the first complete map, review, critical-scope confirmations and any
   score under immutable references/content hashes before returning feedback.
   Apply the admission gate below. If it passes, no repair is needed.
2. If it does not pass, reconcile findings using the evidence/disposition rules
   in [documentation rounds](documentation-rounds.md). A permitted repair needs
   concrete in-scope findings and available evidence. Missing access, unresolved
   key disputes or pending authority essential to the map require a checkpoint,
   not a speculative repair. No ledger initialization or detailed unit is admitted.
3. Charge the single repair dispatch before continuing the same author context.
   Supply the exact prior map and accepted source-backed findings, not the hidden
   evaluation key or a desired score. Limit edits to affected relationships,
   topics and their dependents. Retain stable IDs and unrelated content. Return
   a new complete map plus a delta: finding ID, changed IDs, evidence, resolution
   and affected handoffs. Preserve the original; this is not a replacement run.
4. The same independent reviewer can continue with its retained expectations.
   It must not author the repair. Bind rereview to the new complete map, inspect
   the delta and dependent effects, check unchanged coverage for regressions,
   and explicitly reconfirm critical-covered scope. New findings remain visible.
   Preserve original judgments; corrections to judgments are separate addenda,
   not fabricated author repairs.
5. Record first-attempt and post-repair outcomes separately. Apply the gate to
   the latest exact map/review only. An interrupted dispatched repair consumes
   the slot; resume its context/artifacts without another dispatch budget.
   Drift in source, scope or procedures pauses admission for explicit
   reconciliation; it cannot silently reset the repair limit or rebind evidence.

**Admission gate:** the map is `mapped`, independent review is complete with
`no-findings` for map-level obligations, every critical obligation is covered
and explicitly scope-confirmed, and no essential gap, material unsupported claim
or unresolved scope/key dispute remains. For a scored evaluation, also require
`passed`; an empty `blockers` array is insufficient. Retained delegated detail
questions and properly routed owner decisions alone do not close this gate.

Admission permits only separately authorized question selection/recovery, not
prose approval. After a failed repair, exhausted budget or unavailable review,
stop with the latest findings and pending action. Selecting an unrelated unit
or a narrower packet does not clear a failed gate for the declared map scope.

The coordinator retains an external record of bindings, authorized limit,
dispatch/continuation history, findings/dispositions, delta, review confirmations
and both outcomes. The recovery helper does not parse or enforce this map gate;
the coordinator must check it before `init`. Existing ledgers use their drift
and affected-work rules, not retroactive certification.

## Evaluation boundary

Complete evaluation preparation before launching the discovery author:

1. Bind one procedure version and the actual source scope. Verify a permitted
   read and an actual search/symbol operation if available; otherwise record
   the inventory/read substitute and its limits. Record host-observed model
   identity when supplied, or `unavailable`. Resolve procedure-loading conflicts
   before launch; loading an older installed wrapper is not candidate activation.
2. Start the independent reviewer using a continuation-capable transport
   (background for a multi-turn `task` agent). Retain its source-only expectations,
   then successfully deliver the candidate key in that same context. This real
   delivery proves continuation support before spending an author attempt.
3. Resolve every key-coverage objection, including entries outside existing
   criterion IDs. Record accepted additions, existing coverage, delegated detail
   or exclusions with evidence and reader consequences. Rereview a revised key
   against retained expectations; preserve each revision and the original
   objections. The coordinator adjudicates scope, not a requested passing score.
4. Freeze the accepted key and calibration controls, exact source/procedure
   digests, completed key-review reference, capability evidence and repair limit.
   Only then launch the author without the key or calibration examples.

**Dispatch gate:** no unresolved key-coverage dispute, completed independent
key review, demonstrated reviewer continuation, and a bound readable procedure
and source scope. Empty `disputes` alone does not clear nonempty `coverageGaps`.
An unresolved preparation issue pauses before author dispatch; do not overlap
key acceptance with expensive report generation. Reuse the accepted reviewer
for map assessment and repair rereview; later newly discovered scope disputes
remain visible rather than being absorbed into existing criteria.

Known failures become regression cases, not held-out improvement evidence.
Measure first-attempt coverage separately from coverage after one repair, and
record correction effort and actual tool exposure. Test tool-availability changes
separately from instruction changes when making causal comparisons. A fresh
source-backed case and a live run need separate authorization. Supplied judgments,
valid hashes and passing mechanical tests do not prove better discovery.
