# Discovery packet contract

Read this reference when authoring or checking a discovery packet or its early
coverage review. Ordered research and review steps belong to the
[discovery procedure](repository-discovery.md) and
[recovery workflow](recovery-workflow.md); this reference defines their data.

## Boundary and completion

A packet is immutable, external evidence for a selected clean Git HEAD, not a
second progress ledger. Recovery `schemaVersion: 1` references the initial
inventory through `inventory.ref` and later question-specific packets through
existing research evidence, without new fields, events, or CLI options. Initial
inventory may be incomplete before `init`. Each selected research attempt has
its own immutable packet and independent coverage review before drafting.
The packet's questions are the current research slice; other queued surfaces
remain `deferred` with no selected question IDs. The canonical documentation map
remains a separate routing artifact. Ordinary narrow work may retain equivalent
trace/applicability accounting in its report without the optional JSON form.

**Ready** means all declared views and selected questions have structurally
supported accounting, complete referenced traces, no declared material gaps,
and an independent advisory `no-findings` review of the exact packet bytes.
Deferred/excluded surfaces remain unassessed. This check establishes neither
exhaustive repository coverage nor semantic correctness, actual reading, runtime
behavior, reviewer independence, or final prose approval. Substantiveness of
evidence, applicability, and flow relationships remains review work.

The [packet template](../templates/discovery-packet.json) illustrates a local
command. Its all-zero HEAD, paths, ranges, and assertions require adaptation;
it is not live evidence. The [review template](../templates/discovery-review.json)
starts explicitly incomplete and nonindependent, with placeholder bindings.
Illustrative assertions become evidence only after source-backed research and
the separate review; satisfying field shapes alone does not establish them.

## Exact interface and results

Node.js 22 or newer and local Git are required. From the plugin root:

```powershell
node scripts\discovery.mjs check --repo D:\work\consumer --packet D:\evidence\packet.json
node scripts\discovery.mjs check --repo D:\work\consumer --packet D:\evidence\packet.json --review D:\evidence\review.json
```

The only command is `check`; the only flags are `--repo`, `--packet`, and optional
`--review`, each supplied once with a separate value. Repository and artifact
paths are explicit absolute paths. Packet/review files are regular,
non-hardlinked files outside the consumer, executing plugin, and Git metadata
trees; every filesystem component must be free of symlinks/junctions.

The synchronous public export is
`checkDiscovery({ repo, packet, review? })` from `scripts/discovery.mjs`.
`packet` and `review` are JSON filenames, not parsed objects. Extra options are
errors. Expected incomplete accounting returns a report rather than throwing.

| Outcome | CLI exit | Meaning |
| --- | --- | --- |
| `ready` | `0` | Structurally supported selected scope with an exact, independent advisory no-findings review. |
| `review-required` | `2` | Structurally supported selected scope; no review supplied. |
| `incomplete` | `2` | An unavailable view/obligation, gap, absent/partial trace, finding, unassessed question, or incomplete/nonindependent review remains. |
| Error | `1` | Invalid JSON/schema/options/relationships, unsafe paths, unavailable Git/I/O, dirty source, stale binding, or concurrent change. |

Valid reports are JSON on stdout with `ok: true`, `outcome`, `repository`,
`head`, `packetSha256`, `scope`, `audiences`, `questionIds`, `blockers`,
`deferredSurfaceIds`, `excludedSurfaceIds`, `review` (summary or `null`), and
`limits`. Here `ok` means valid inputs, not completion: consume `outcome`.
Each blocker has a stable `code`, actionable `message`, and applicable named IDs.
Examples include `VIEW_UNAVAILABLE`, `OBLIGATION_UNAVAILABLE`, `SURFACE_GAP`,
`TRACE_MISSING`, `TRACE_PARTIAL`, `REVIEW_REQUIRED`, `REVIEW_NOT_INDEPENDENT`,
`REVIEW_INCOMPLETE`, `REVIEW_FINDING`, and `REVIEW_UNASSESSED`.

Invalid inputs produce no coverage report. The CLI emits
`{"ok":false,"error":{"code":"...","message":"..."}}` on stderr; the public export
throws a coded error. `packetSha256` hashes the exact input bytes, including
whitespace and line endings. Reformatting a packet invalidates an earlier review.

## Packet schema version 1

Objects have exactly their listed fields; additional fields are errors.
IDs are stable lowercase letters/digits/hyphens, start with a letter, and are
1-80 characters. IDs are unique within their collection; reference arrays are
unique and point to existing IDs. Text is nonempty and NUL-free unless noted.

Top-level fields:

| Field | Contract |
| --- | --- |
| `schemaVersion` | Exactly `1`. |
| `head` | Full lowercase 40- or 64-character Git object ID, equal to the current clean HEAD. |
| `scope` | The bounded selected scope. |
| `audiences` | Nonempty unique reader labels. |
| `evidence` | Nonempty anchor array described below. |
| `views` | Exactly the four named views below. |
| `surfaces` | Nonempty discovered-surface array. |
| `questions` | Nonempty selected-question array. |
| `traces` | Trace array; empty is retainable incomplete research. |

### Evidence anchors

Each anchor is `{id, path, startLine, endLine, kind}`. `kind` is `source`,
`config`, `test`, or `contract`. `path` is a normalized relative Git file path
using `/`, not a filesystem CLI path: no absolute paths, traversal, globs,
backslashes, Git metadata, or Windows-special components. Spaces and literal
square brackets are supported by the existing recovery routing rules.

The file must be a regular committed blob at the supplied HEAD and a regular
worktree file: neither a symlink, submodule, nor directory is evidence here.
`startLine` and `endLine` are positive inclusive integers with
`startLine <= endLine <= committed line count`. Counts use raw Git blob LF
boundaries, with an unterminated final line counted once; an empty blob has zero
lines. Checkout conversion does not change the evidence being counted.
Two IDs cannot alias the same path/start/end anchor, even with different kinds;
reuse the existing ID. Distinct ranges in one file are allowed.

### Views and obligation support

Each view is `{id, status, evidenceIds, detail}`. The four IDs are
`product-runtime`, `interfaces-consumers`, `state-effects`, and
`operation-dependencies`, once each.

For both views and obligations:

* `supported` carries nonempty existing anchor IDs and a concrete `detail`.
* `not-applicable` carries nonempty existing anchor IDs and a source-backed
  applicability explanation.
* `unavailable` carries a named explanation in `detail`, may have no anchors,
  and remains an incomplete blocker rather than a fabricated fact.

`supported` may describe a visible external boundary with explicit source
visibility limits; it does not assert unobserved dependency/runtime guarantees.
An unknown fact essential to the selected question remains `unavailable` in its
affected view or obligation. A bounded observation is not a substitute for that
missing fact.

The checker requires nonempty details but cannot judge whether an explanation
is substantive or its anchor supports the assertion.

### Surfaces and selected questions

Each surface is
`{id, kind, summary, evidenceIds, disposition, questionIds, reason}`.
`kind` is `runtime`, `entry`, `consumer`, `state`, `dependency`, `configuration`,
`authority`, or `test`.

* `mapped`: nonempty anchors and selected questions; `reason` may be `""`.
* `deferred` / `excluded`: a nonempty reason and no selected question IDs.
  Include anchors for visible source; absent external evidence can be recorded
  without invented anchors. These IDs remain visible in reports without
  expanding the selected questions or implying global completeness.
* `gap`: a nonempty reason, available anchors if any, and affected question IDs
  if known. An unassigned gap blocks the overall declared scope. Assigned gaps
  block their questions. Both produce `incomplete`.

Each question is
`{id, question, audiences, surfaceIds, traceIds, obligations}`. Audiences are a
nonempty subset of the packet audiences. `surfaceIds` selects at least one
mapped surface and may additionally name gaps, never deferred/excluded surfaces.
Surface/question references agree in both directions. There is no mandatory
cross-product of audience, surface kind, question, or file.

Each question has exactly eight obligations, one for each dimension:
`selection`, `outputs`, `state`, `failures`, `trust`, `compatibility`,
`consumers`, and `tests`. Each is `{dimension, status, evidenceIds, detail}`
using the support rules above. Applicability is per question and dimension;
a global server-only or out-of-scope disclaimer does not replace it.

### Traces

Each trace is `{id, questionId, steps}` and belongs to exactly one selected
question. That question references the trace through `traceIds`; orphaned or
cross-question references are errors. An empty `traceIds` records incomplete
research without requiring a fictitious trace.

Each step is `{role, surfaceId, evidenceIds, detail}`. Roles are `caller`,
`selection`, `handler`, `effect`, or `consumer`. Step surfaces belong to the
trace's question; nonempty step anchors are also mapped by that surface.
A complete trace starts with `caller`, includes `handler` before its first
`consumer`, and ends with `consumer`. Empty or partial sequences remain
`incomplete`. Selection/effect steps follow material relevance accounted for
in obligations; they are not universal quotas.

Repeated role/surface/anchor steps and duplicate trace sequences for the same
question are errors, even if their prose differs. One surface can legitimately
appear in different roles. Whether the declared edges actually follow source
is an independent review question, not a structural verdict.

## Review schema version 1

Exact fields are `schemaVersion`, `head`, `packetSha256`, `reviewerRef`,
`expectationsRef`, `reportRef`, `advisory`, `independent`, `result`, `findings`,
and `unassessedQuestionIds`.

`schemaVersion` is `1`. HEAD and the full lowercase SHA-256 digest bind the
exact packet. The three nonempty reference strings identify the reviewer
context, separately derived source-first expectations, and coverage report.
They are declarations, not files the checker opens or authenticated identities.
`advisory` is exactly `true`; `independent` is boolean.

`result` is `no-findings`, `findings`, or `incomplete`. Findings are
`{id, description, material}` with unique IDs and boolean `material`.
Any finding prevents `ready`, including nonmaterial findings. A `findings`
result names at least one finding; `no-findings` requires both `findings` and
`unassessedQuestionIds` to be empty. Unassessed IDs identify existing selected
questions. Nonindependence or an incomplete result stays incomplete even when
the findings array is empty.

This is the pre-drafting coverage challenge. Existing final-candidate review
and exact-hunk approval remain separate.

## Read-only enforcement and compatibility

The checker reads local files and uses the recovery helper's hardened Git
inspection. It reads pinned regular blobs without filters/textconv, checks
clean HEAD before/after source inspection, and detects observed input-file
changes. It never writes repository or recovery state, fetches objects, runs
source/hooks/models, or installs dependencies. These checks are not an atomic
filesystem transaction or a sandbox against a concurrent hostile process.

Recovery's package-internal `inspectSource(repo, paths)` returns
`{repository, head, gitRoots, files: [{path, blob, lineCount}]}`; it is not a new
recovery command. The procedure fingerprint includes the package's scripts.
Earlier schema-1 ledgers remain readable; changed script resources use the
existing explicit procedure-drift reconciliation rather than silent migration.
Their next research attempt adopts the packet/coverage-review accounting;
historical publications retain their actual evidence, without retroactive
claims that this review occurred.
