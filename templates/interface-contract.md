# <Interface name>

Status: <approved intent / observed implementation / proposal>
Owner: <team or person>; approval evidence: <decision or review, or pending>

## Scope

Purpose, maintainer and consumer audiences, supported mode/platform/version,
boundaries, and explicit non-goals.

## Inputs, outputs, and examples

Public entry points, data shapes, defaults, and one normal usage example.
Identify the caller obligations and observable result.

## Invariants and lifecycle

Ordering, concurrency, ownership, resource lifetime and release. Mark irrelevant
dimensions with a reason rather than inventing guarantees.

## Failures and recovery

Errors, timeout, cancellation, partial success, retry and idempotence.

## Compatibility and consumer impact

Version negotiation or migration obligations and behavior a consumer may rely on.

## Evidence and gaps

| Claim | Source path and symbol/test | Evidence label | Gap or limit |
| --- | --- | --- | --- |
| <claim> | <source in the same Git snapshot> | <observation / approved intent / executed check> | <remaining uncertainty> |

Keep execution results and actual base/head in the review report, not a
self-referential future commit ID in this contract.
