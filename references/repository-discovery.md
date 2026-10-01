# Source-grounded repository discovery

Use for explicitly requested recovery, or when a bounded task needs new
cross-runtime or indirect-consumer discovery. Read the
[shared policy](documentation-policy.md) first. This procedure produces evidence
and a queue; it does not authorize documentation edits. For recovery, use the
[discovery packet](discovery-packet.md) to make that evidence reusable outside
the author's context. A narrow task may keep the same accounting in its report
without introducing a ledger or a repository-wide inventory.

For a system map without authoring/recovery, use the dedicated
[repository-discovery agent](../com.github.copilot/agents/repository-discovery.agent.md)
instead; that handoff does not enter the later steps below.

## 1-2. Establish authority and survey breadth

Read and complete [discovery breadth](discovery-breadth.md), including both exit
criteria. Preserve stable surface IDs and source anchors in the recovery packet.
Its four views retain the inspected/uninspected surfaces and every candidate's
disposition before selecting depth.
A supplied source-bound system map can seed this inventory after checking its
scope, provenance and gaps. Its topic handoffs select investigations; detailed
packet obligations apply to the selected questions below, not every topic first.

## 3. Form prioritized questions

A work item answers a bounded reader question about an interface, flow or
architectural relationship. Include source/configuration/test routes, canonical
homes, dependencies and acceptance obligations. Reuse adequate architecture
material; otherwise select an architecture-spine question first. Its answer must
explain major runtime pieces and a representative business flow, not merely
point at an interesting function. A work item may span files; it is not a
page-per-class quota.

Prioritize critical business flows, externally consumed interfaces, persistent
writes, permission/privacy effects, shared dependencies, configuration precedence
and contradictory documentation. Record the reason for priority. Resolve
prerequisites first, and account for discoveries that do not fit the original map.

Use the [recovery plan and ledger interface](recovery-ledger.md) after the
inventory and run scope are approved. Its required fields are the authoritative
machine interface. Reference the immutable inventory packet through the existing
`inventory.ref`; later question-specific packets belong in research evidence.
The packet's selected questions are the current research slice, not a second
queue. Deferred surfaces and the approved ledger retain later work.

**Exit:** the approved initial target has a prioritized queue, known dependency
gaps, an architecture-spine task or adequate existing overview, and explicit
exclusions. The coordinator can choose the next ready question without rereading
the whole repository. Budget and review capacity are reserved before deepening.

## 4. Trace the selected question

After selection, follow [unit research](documentation-unit.md) across the relevant
contract dimensions. Record a concrete caller-to-result-consumer trace, including
selection/registration and state or external effects where applicable. Read
inbound callers as well as outbound implementations. Choose extra paths because
the source exposes them: browser/RPC, events/workers, CLI, provider selection,
configuration overrides, or persistence can have different contracts.

Each relevant dimension needs evidence or a named gap; non-applicability needs
a source-backed reason. Preserve unresolved branches, exact dependency ranges,
returned versus mutated values, and which tests were only read. A registered
callback alone does not prove unavailable framework execution semantics.

**Exit:** the selected packet contains traceable obligations and consumers, or
named blockers. Essential gaps stop drafting that question; unrelated deferred
work remains outside the selected slice. No exhaustive call graph is required.

## 5. Challenge coverage before drafting

Give a fresh [reviewer](../com.github.copilot/agents/documentation-reviewer.agent.md)
the neutral snapshot, tracked-path inventory, reader questions, approved scope,
canonical authority and dependency-access limits. Withhold the discovery packet
until source-derived expectations are retained. Then request its `discovery`
review: omitted material paths, parallel consumers, unjustified exclusions and
unsupported closure, bound to the exact packet.

For recovery, run the [packet check](discovery-packet.md) before and after that
review. Structural validity alone is not permission to draft. Repair material
coverage findings within the approved slice, or pause it with the finding and
next action. Give unrelated discoveries a deferred disposition and queue route.
Changing packet bytes or the source snapshot requires renewed review binding.

**Exit:** independent advisory coverage review supports the selected question
and no essential gap remains. Only then draft using the existing canonical home
or [architecture template](../templates/architecture-overview.md). Retain the
separate final review of the exact prose candidate: early coverage review cannot
validate assertions that have not yet been written.
