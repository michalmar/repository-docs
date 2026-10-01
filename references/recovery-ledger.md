# Recovery ledger: deterministic checkpoint and queue

Read this reference when initializing, resuming, recording, or reconciling a
recovery run. It is the authority for this helper's schema and commands. Use the
[workflow](recovery-workflow.md) for discovery, authoring, and review; use the
[shared policy](documentation-policy.md) for evidence and approval boundaries.
This is a local Node.js 22+ / Git helper, not the planned semantic impact checker.

## Start and resume

1. Adapt the [plan template](../templates/recovery-plan.json) to an approved,
   bounded goal, inventory, queue, and **explicit unit budget**. The example `2`
   is illustrative, not a default. Keep the existing version-1
   [source/document map](../templates/documentation-map.json) separate.
2. Select a clean, non-bare consumer Git worktree with a real HEAD. Create an
   artifact directory **outside both the consumer and executing plugin package**.
   Choose an absolute ledger filename there. Its parent must already exist.
3. Run `init`, then `next`. Give the selected item and durable evidence references
   to its author. `next` reserves one item; another process resumes that same
   active item without another budget charge or ledger write.
4. Record research, exact proposal, advisory review, and batch approval. The
   caller, not this helper, applies and commits the authorized documentation.
   Record `publish` with the actual resulting HEAD. Inspect `status` before
   selecting another item. If current documentation needs no edit, use the
   guarded empty-proposal `reassess` path below rather than a cosmetic commit.
5. On source/instruction drift, inspect `status`, reconcile the consumer to a
   clean snapshot, and run `sync`. Resolve every unclassified change with
   evidence before dispatch/publication. Reassess reopened items.
6. When later detail work exposes a source-backed finding at the **same**
   checkpoint, return it to the coordinator. After accepting its impact, the
   coordinator can `discover` new work and `reopen` affected closed work. Neither
   event approves documentation hunks or grants more budget. Use `next` to
   dispatch new/affected attempts rather than rerunning independent closed work.

PowerShell example; paths to the executable, consumer, state, and input files
are filesystem paths, while paths **inside JSON** use normalized Git `/` syntax:

```powershell
$helper = 'D:\plugins\repository-docs\scripts\recovery.mjs'
$repo = 'D:\repos\example'
$state = 'D:\recovery-artifacts\example\ledger.json'
node $helper init --repo $repo --state $state --plan 'D:\recovery-artifacts\example\plan.json'
node $helper status --repo $repo --state $state
node $helper next --repo $repo --state $state --revision 0
node $helper record --repo $repo --state $state --event 'D:\recovery-artifacts\example\event.json'
node $helper sync --repo $repo --state $state --revision 8
```

Use the **returned** revision, not the illustrative `8`. CLI results are JSON on
stdout. Invalid operations exit nonzero with
`{"ok":false,"error":{"code":"…","message":"…"}}` on stderr. Unknown commands,
extra/duplicate options, missing values, malformed JSON, and schema violations
fail explicitly. No operation installs tools, fetches objects, executes consumer
scripts, writes documentation, or invokes an LLM.

The public recovery module interface has the same behavior:

```javascript
import { recovery } from './scripts/recovery.mjs';
const result = recovery('next', { repo, state, revision: 0 });
// init: { repo, state, plan: parsedPlan }
// status: { repo, state }
// record: { repo, state, event: parsedEvent }
// sync: { repo, state, revision: currentRevision }
```

On Windows use a `file:///D:/…/scripts/recovery.mjs` URL for a dynamic import of
an absolute path, or a relative module specifier from a caller module. Module
failures throw errors with `code` and an actionable `message`.

## Discovery evidence without a ledger migration

New recovery procedures use the separate [discovery packet](discovery-packet.md)
and its read-only checker. Bind the initial immutable packet through
`inventory.ref`; retain later packet, checker and early coverage-review references
in the item's existing `research.evidenceRefs` and report. Record material early
findings through the existing gap/resolution mechanism. The final `review` event
still names the exact documentation proposal, not the discovery packet.

Discovery-packet binding itself adds no plan/event fields or map version. The
separate additive `reopen` event below handles later same-snapshot feedback. This helper
records references without opening or authenticating them: the coordinator
enforces the pre-drafting procedure, while the separate checker validates
declared packet structure and Git binding. Legacy narrative references remain
valid. A package update changes procedure identity and requires the ordinary
explicit `sync`/reassessment path, not reinitialization or an invented review of
old publications. Executable package scripts participate in that fingerprint.

## Plan schema, version 1

Objects require **exactly** their documented fields; unknown or missing fields
are errors. Arrays shown as empty are explicit, not inferred. References are
nonempty strings naming caller-managed, versioned artifacts/reports/decisions.
The helper records but never dereferences or authenticates them.

| Field | Contract |
| --- | --- |
| `schemaVersion` | Exactly `1`; this is not `documentation-map.json`'s schema. |
| `goal`, `audiences` | Nonempty goal and unique, nonempty audience strings. |
| `unitBudget` | Explicit positive safe integer; no implicit run size. |
| `inventory` | `{ref, scope, checked, unchecked, exclusions}`; nonempty `ref` and `scope`; unique string arrays `checked` (nonempty) and `unchecked`; exclusions are `{scope, reason, evidenceRef}`. |
| `approvalRef` | Run scope/budget approval declaration, not authenticated permission. |
| `instructionPaths` | Unique explicit consumer instruction/policy **file** paths; `[]` explicitly declares none. Missing selected files have a `null` fingerprint, so later creation is drift. Existing files must be tracked and regular. |
| `navigation` | Unique exact shared routing-file paths, such as the root README, documentation index, and source map; `[]` explicitly declares none. They must not overlap any substantive canonical document, watched source/config/test route, or instruction path. |
| `items` | Nonempty array of the work-item objects below. |

Every work item has these fields:

| Field | Contract |
| --- | --- |
| `id` | Stable lowercase ID: initial letter, then letters/digits/hyphens, at most 80 characters. Unique across the run and discoveries. |
| `question`, `scope` | Nonempty bounded question and investigation boundary. |
| `audiences` | Nonempty unique subset of the run audiences. |
| `priority`, `rationale` | Integer `0..1000000`, **higher first**, plus a nonempty reason. Ties use ascending ID, independent of locale. |
| `owner` | Named owner or `null` for unknown. |
| `authority`, `authorityRef` | `observed`, `proposed`, or `approved-intent`; a reference or `null`. Approved intent requires both owner and authority reference. Batch approval never silently promotes authority. |
| `watch` | `{source, config, tests}`; each is a unique path array; at least one route overall. |
| `documents` | Nonempty unique array of exact substantive canonical document file paths. Shared routing files belong in `navigation`, not in each item's `documents`. |
| `dependencies` | Unique existing item IDs. Self-dependencies and cycles fail, including discoveries. |
| `issues` | Array of `{id, description, material}`; `material` is boolean; IDs are unique within the item across initial issues, later gaps, and review findings. |

Routes are literal relative Git file paths or directory prefixes ending in `/`.
`src/runtime/` includes descendants; `src/runtime` is an exact path. Absolute,
drive, traversal, `.git`, empty-segment, backslash, wildcard `*`/`?`, control
character, and nonportable Windows paths fail. Spaces, Unicode, `&`, `$`, and
literal brackets are supported; nothing is a shell fragment or glob.
Missing source routes may remain declared to cover future additions; their
existence and semantic completeness are not certified.

## Events and mechanical gates

`record --event FILE` reads one JSON object with `revision` (the expected current
ledger revision), `type`, and **exactly** the additional fields in this table.
An accepted record increments the revision. Events targeting one active item use
`itemId`; run-level reopening/mapping uses `itemIds`.

| `type` | Additional fields | Transition / requirement |
| --- | --- | --- |
| `start` | `itemId` | Equivalent to dispatch by `next`: highest-priority ready pending item, closed prerequisites, no other active item, budget available. |
| `resume` | `itemId, reason` | Explicitly reactivate a paused partial/blocked/deferred attempt, with closed prerequisites and no other active item. No new charge. Use `next` to resume an **already active** item without writing. |
| `research` | `itemId, evidenceRefs, reportRef, gaps` | Active item; nonempty evidence-reference array and report; `gaps` contains new issue objects. Adds evidence; supersedes current proposal/review/approval. |
| `proposal` | `itemId, proposalRef, patchSha256, documents` | Research required. `proposalRef` uniquely names this item's exact candidate; revisions need new references. `patchSha256` is the declared candidate-patch SHA-256. `documents` contains `{path, sha256}` for **every** item canonical document and every shared navigation file, including unchanged routing files. |
| `review` | `itemId, proposalRef, result, reportRef, reviewerRef, advisory, independent, findings` | Current proposal required. `result`: `findings`, `no-findings`, or `incomplete`; `advisory` must be `true`; `independent` is a boolean declaration. `findings` adds new issues only; existing findings retain IDs and remain open. Supersedes approval. |
| `resolve` | `itemId, findingId, reason, evidenceRef` | Explicitly resolve an open gap/finding; retains its history. Invalidates current review/approval: re-review is required. A resolution is an evidence-bearing declaration, not semantic verification. |
| `approve` | `itemId, proposalRef, approvalRef, coverage` | Exact current reviewed proposal; `coverage` is `closed` or `partial`. Closed coverage requires declared independent `no-findings` review and no unresolved material issue. Partial approval can acknowledge an incomplete/failed review and named gaps. |
| `publish` | `itemId, commit, coverage, reportRef` | Matching approval and `coverage`; actual full Git HEAD ID; clean documentation-only advancement and matching canonical bytes. Closed publication finishes the item. Partial publication pauses it with coverage still partial. |
| `reassess` | `itemId, commit, reportRef` | Close unchanged current documentation after fresh research, an empty-patch proposal, independent no-findings review, and closed-coverage approval. Verifies current clean checkpoint and every canonical/navigation Git blob. Records `assessment`, not a fabricated publication. |
| `pause` | `itemId, coverage, reason, reportRef, decisionRef` | Active item becomes paused; coverage is `partial`, `blocked`, or `deferred`. `decisionRef` is a reference or `null`; a deferral requires a reference. |
| `discover` | `items, reason, evidenceRef` | Add full work-item definitions; validate the combined graph. Increments `scopeVersion`, visibly changing the target denominator. Does not expand the budget or authorize new documentation hunks. |
| `reopen` | `itemIds, reason, evidenceRefs` | At a clean, unchanged checkpoint, explicitly reopen existing closed items and invalidate their transitive dependents. Nonempty unique target IDs, reason, and evidence references are required. Rejects unknown/nonclosed targets and any affected active attempt. Preserves history; changes neither scope nor budget. |
| `resolve-change` | `changeIds, itemIds, resolution, reason, evidenceRefs` | Resolve named, currently unclassified Git changes. `mapped` requires nonempty known `itemIds`; registers their exact changed paths and reopens these items plus dependents. `no-impact` requires `itemIds:[]`; records a specific evidence-bearing exception, never a permanent path ignore. |
| `budget` | `unitBudget, approvalRef` | Explicit approved positive safe-integer increase; original budget and approvals remain in history. |

All reference/reason fields are nonempty. `evidenceRefs` arrays are nonempty and
unique. `gaps` and `findings` use the plan's issue shape and may be empty.
`changeIds` is a nonempty unique array; hashes are lowercase 64-digit SHA-256;
`commit` is a full lowercase 40- or 64-digit Git object ID, not a branch name.
Except for dispatch/resume and run-level events, an item must be active.
All events are rejected under HEAD/procedure drift except verified `publish`.

Stages are `queued → research → researched → proposed → reviewed → approved →
published`, or `reassessed` for unchanged content. Revised research/proposals and resolved findings move back through
the relevant gates. Current fields are projections; superseded records stay in
the append-only journal. An existing material finding cannot disappear because
a later reviewer reports no new findings.

Minimal research and review examples (replace references with retained artifacts):

```json
{
  "revision": 1,
  "type": "research",
  "itemId": "architecture-spine",
  "evidenceRefs": ["artifact:spine-source-packet@1"],
  "reportRef": "artifact:spine-research@1",
  "gaps": []
}
```

```json
{
  "revision": 3,
  "type": "review",
  "itemId": "architecture-spine",
  "proposalRef": "artifact:spine-exact-patch@1",
  "result": "no-findings",
  "reportRef": "artifact:independent-spine-review@1",
  "reviewerRef": "artifact:fresh-review-context@1",
  "advisory": true,
  "independent": true,
  "findings": []
}
```

Between these examples, revision `2` records `proposal`: an exact candidate
reference, its patch digest, and expected full-document digests. Hash the bytes
intended for Git, accounting for line-ending/attribute conversion; the verifier
reads Git blobs rather than CRLF-translated worktree files.

Then record approval **before** the caller commits:

```json
{
  "revision": 4,
  "type": "approve",
  "itemId": "architecture-spine",
  "proposalRef": "artifact:spine-exact-patch@1",
  "approvalRef": "artifact:exact-spine-hunks-approval@1",
  "coverage": "closed"
}
```

After the real documentation commit, use revision `5` with
`{"type":"publish","itemId":"architecture-spine","commit":"ACTUAL_HEAD",
"coverage":"closed","reportRef":"artifact:spine-materialization-check@1"}`.
Include `"revision":5` in that event and replace `ACTUAL_HEAD` with Git's full
resolved ID. Nothing asks a document to embed its own future SHA.

For justified no-impact after a source change, first `sync` and investigate the
real source delta. Record fresh research explaining why current documents still
answer the bounded question. Propose the exact existing Git bytes for every
canonical/navigation file, with `patchSha256` equal to SHA-256 of **zero bytes**.
Obtain a fresh independent no-findings review and exact approval for closed
coverage. Then record `reassess` with the current revision, item ID, actual
checkpoint `commit`, and reassessment `reportRef`. No new Git commit is needed.
Unclassified changes, dirty/stale state, material findings, absent approval,
nonempty patch digest, missing/non-regular documents, or mismatched bytes fail.
The resulting `assessment.outcome` is `justified-no-impact`; old publications
remain historical evidence. This checks declared gates and current bytes, not
whether the no-impact reasoning is semantically correct.

### Same-snapshot feedback and subsequent rounds

Later source inspection can reveal an omitted Module, relationship, consumer, or
documentation task without any Git source change. Detail authors return proposed
findings and source evidence to one coordinator; a proposal is not automatically
accepted map knowledge, approved intent, or permission to publish. Once the
coordinator accepts the finding and identifies its impact, use the existing
`discover` event for genuinely new work and this event for existing closure:

```json
{
  "revision": 12,
  "type": "reopen",
  "itemIds": ["architecture-spine"],
  "reason": "Accepted detail finding exposes a missing result consumer in this explanation.",
  "evidenceRefs": ["artifact:accepted-consumer-finding@2"]
}
```

Replace `12` with the returned current revision. These are **exactly** the event
fields: no new source SHA, fabricated Git change, approval field, or hidden map
store. References should retain the finding, its source anchors and the
coordinator's accepted impact; the helper validates nonempty unique references,
not their truth or the coordinator's identity.

- Every explicitly named target must exist and currently be `closed`. Empty,
  duplicate, unknown, pending, active, paused, or already-reopened target IDs
  fail; a mixed valid/invalid request is rejected as a whole. Revision, HEAD and
  procedure/instruction identity must match, and the tracked/untracked worktree
  must be clean, even if an unrelated active item's canonical draft is the only
  dirty file. Actual Git/procedure drift still belongs to `sync`.
- Invalidation follows the declared dependency graph transitively, including
  dependent pending or paused work, using the same machinery as mapped changes.
  It never infers undeclared semantic impacts. An affected **active** dependent
  rejects the entire event with `ACTIVE_ITEM`; preserve its evidence and
  explicitly pause it first, then retry against the new revision. A clean,
  unrelated active attempt is preserved and still owns the single active slot.
- Affected work becomes pending/stale/queued. Prior evidence, research,
  proposal, review, approval, publication, assessment and issue resolutions
  remain in `staleHistory` and the unchanged earlier journal. The history reason
  is `same-snapshot-feedback`; its revision links to the recorded reason and
  evidence references. Current research/proposal/review/approval are cleared;
  prior proposal references remain reserved and cannot name the new candidate.
  Issues keep their IDs but require fresh resolution. Historical publication
  is not current closure, and no file is changed by reopening.
- The checkpoint, Git-change accounting, `scopeVersion`, item count and budget
  are unchanged by `reopen`. Only `discover` adds to the scope denominator.
  Reopening clears the affected attempt's charged state, so `next` spends one
  normal unit on its next attempt. A previously charged paused dependent also
  needs a new attempt after invalidation; it cannot reuse its old charge through
  `resume`. Independent closed items retain their exact projections.
- Reopening immediately makes the bounded target incomplete. Exhausted budgets
  leave work pending and `next` paused/incomplete until an explicit `budget`
  increase is recorded. Existing unclassified Git changes remain unresolved;
  reopening does not bypass their dispatch/closure gates. Fresh research, an
  exact new proposal, independent advisory review and exact approval are still
  needed before `publish` or unchanged-content `reassess`. Review, accepted map
  findings and run-budget approval remain distinct from publication permission.

This is an additive event in **schemaVersion 1**, not a new CLI command or state
service. Updated helpers load and replay prior version-1 journals without
rewriting them. Older helpers that do not recognize `reopen` cannot read a
journal containing it. Updating the installed helper still changes procedure
identity and requires ordinary explicit `sync` before further work; do not
invent historical reviews or bypass that reconciliation.

The synthetic two-round public-interface regression exercises first-round
publication/reassessment, later source-backed finding acceptance, `discover`
plus same-checkpoint `reopen`, a budget pause, and fresh closure of only
new/affected work. It checks mechanical orchestration and unchanged source
bytes, not LLM discovery quality, prose correctness or real-repository behavior.

An unclassified exception is explicit, for example:

```json
{
  "revision": 8,
  "type": "resolve-change",
  "changeIds": ["change-8-1"],
  "itemIds": [],
  "resolution": "no-impact",
  "reason": "Describe the changed area and unchanged invariants within this exact base/head.",
  "evidenceRefs": ["artifact:change-8-1-investigation@1"]
}
```

## Git reconciliation and publication

`status` is read-only. It compares actual HEAD, procedure fingerprints, and dirty
tracked/untracked paths against the checkpoint. Drift makes the outcome
incomplete and effective coverage stale; stored historical closure is not current
success. `next` fails on HEAD/procedure drift. A dirty active canonical draft may
be resumed and reviewed; source/config/test/instruction or other-document dirt
blocks mutations. `init`, `sync`, `publish`, `reassess`, and `reopen` require a clean worktree.
Git-ignored files are outside the worktree-cleanliness check.
Configured Git clean/process filters, fsmonitor, external diff/textconv helpers,
and network protocols are disabled during inspection. Repositories requiring
external clean transformations may therefore report conservatively dirty; use a
plain-content checkout rather than asking this helper to run their filters.

`sync` consumes actual Git NUL-delimited name-status, including both rename paths
and deletions. Linear commit ranges are inspected **per commit**, so a source
edit later reverted in the range cannot hide inside a docs-only publication.
Nonlinear/re-written history uses endpoint name-status and conservatively
invalidates every item; publication shortcuts require linear ancestry. Missing
base objects are errors; the caller must make them available without this helper
fetching anything.

Mapped changes reopen matching source/config/test/canonical routes and all
transitive dependents. Renames retain the old route and add the exact new path.
Renamed and explicitly mapped extra routes retain source-change protection;
moving a watched source into a planned document path does not authorize
overwriting it through publication.
Old evidence, approvals, publications, and issue resolutions become stale
history; issue IDs survive and require fresh resolution. Unrelated assessments
survive. Unmapped changes are listed individually and pause dispatch/closure
until `resolve-change`; matching a route only routes reassessment, never proves
semantic no-impact.

Shared navigation is coordinator-owned routing, not a place to hide substantive
contract text or source files. Every item proposal/review/approval includes its
complete intended bytes. This lets a dependent interface add its index/map links
without reopening an unchanged architecture prerequisite. Changes to shared
navigation outside that guarded publication path conservatively reopen all items
on `sync`. Moving a substantive contract into `navigation` to avoid invalidation
would violate the run's declared scope, not establish semantic correctness.

Procedure identity fingerprints the executing package's `plugin.json`, helper,
all files under `skills`, `references`, `templates`, and
`com.github.copilot/agents`, plus the plan's selected consumer instruction files.
It records package root/name/version and SHA-256 per resource and for the whole
identity. Installed sources need not be a Git checkout. A relevant content,
addition/deletion, package-location, or instruction change invalidates all items
on `sync`; an unrelated plugin-source commit alone is not procedure drift.
Previously declared no-impact exceptions also become unclassified again; their
old resolutions remain in stale history. If the helper file changes while a
module caller keeps it loaded, restart Node before reconciling the new identity.

Publication is the deliberately narrow exception to HEAD drift. It verifies:

- Actual HEAD equals the event's commit and advances the checkpoint through
  non-merge, linear commits with at least one changed path.
- Every intermediate changed path belongs to this proposal's exact canonical
  or declared shared navigation
  document list; no declared source/config/test/instruction path changed.
- Every canonical document exists as a regular committed Git blob and its full
  SHA-256 matches the approved proposal; symlinks, missing files, submodules, and
  incomplete materialization fail.
- Evidence, current review, approval, and requested coverage gates hold.

It then binds the new HEAD without reopening its own just-published item.
Substantive shared-document users and their dependents are reopened; unrelated work is
preserved. If the publication changes this item's prerequisite, or the range
mixes source/other docs, use `sync` and reassess instead. Moving/deleting a
canonical home is outside this shortcut: re-plan that boundary explicitly.

## Persistence, budget, and honest completion

The ledger JSON has exactly
`{schemaVersion, repository, createdAt, initial, plan, revision, records}`.
`repository` is the verified real Git worktree root; `initial` contains actual
`head` and `procedure`. `records` is an append-only array of
`{revision, at, event, verification}` with sequential revisions; top-level
`revision` equals its length. Timestamps are ISO UTC. `verification` is `null`
except for helper-generated `sync`/`publish`/`reassess` facts:
`{head, procedure, changes, nonlinear}`; each change is
`{base, head, status, paths}`. `sync` is an internal event, not a recordable
caller assertion. Reassessment verifies the current checkpoint with no new Git
changes; its current-content assessment is separate from publication.

Procedure objects are
`{pluginRoot, name, version, files, instructions, sha256}`. `files` and
`instructions` contain `{path, sha256}` entries; only a missing instruction may
have a null digest. The aggregate is SHA-256 of the preceding fields' JSON.
The schema and all event transitions are validated when loading; a new process
replays this small ledger, not a fresh repository inventory.

`status` includes revision, checkpoint/observed identity, drift, budget,
scope version, inventory (including unchecked/excluded surfaces), shared navigation, current and
effective item coverage, issues, stale history, ready/active items, and
unclassified changes. Work progress (`pending`, `active`, `paused`, `done`),
coverage (`unassessed`, `stale`, `partial`, `blocked`, `deferred`, `closed`), stage,
and authority are separate fields.

Each newly dispatched assessment attempt spends one unit, including a new
attempt after invalidation. Active/paused resumption spends none. This is **not a
token/credit budget**, does not measure model cost, and does not limit work inside
one attempt. Partial/blocked/deferred items stay paused until explicit `resume`;
they are not automatically selected in a loop. If unfinished scope remains when
the budget is exhausted, the result is paused/incomplete. Completion requires
every currently declared item closed, no unclassified change, and a clean,
current checkpoint—not merely an empty ready queue. Accepted deferrals remain
visible and incomplete in this conservative helper. Completion is of this
bounded target, not proof of global discovery or semantic coverage.

Writers use exclusive `LEDGER.lock`, check the optimistic revision, write/fsync
exclusive `LEDGER.tmp`, then atomically replace the ledger. Initialization uses a
no-clobber publication and never overwrites existing state. All three paths must
be regular, unlinked files when present; symlinks/junctions and conflicting
directories fail. Parents must exist; consumer/plugin/Git-metadata paths fail.
The helper cleans only the precise lock/temp files it created. `status` never
creates them. Existing lock/temp files are not stolen or broadly cleaned: inspect
an interrupted writer and remove only those exact files after it has stopped.
Rejected validation, stale revision, and pre-publication persistence failures
leave existing ledger bytes intact.

Atomic replacement is not a tamper-proof database or a guarantee against
power-loss/filesystem failure. After an interrupted replacement or cleanup
error, inspect `status` and the exact sibling files before retrying. The ledger
lock serializes cooperating ledger writers, **not** other Git editors; the helper
rechecks the snapshot before saving, but callers must avoid concurrent consumer
edits. Persist durable referenced artifacts separately; JSON references alone
do not preserve their contents.

Machine checks validate structure, recorded gates, byte identity, routing, and
Git facts. They do **not** authenticate approval, establish reviewer independence,
execute reported tests, verify a declared patch/reference, discover indirect
semantic impacts, or prove that prose answers its question correctly.
