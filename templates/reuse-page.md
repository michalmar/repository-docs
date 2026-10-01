# <Unit name>

Catalog ID: `<owner/repository>:<unit>` · Type: <library / integration> ·
Status: <supported / deprecated / experimental / unknown> ·
Owner: <owner or unknown; approval reference or pending> ·
Source snapshot: <repository and commit or released version>

## Use it for

The common tasks this unit solves, when not to use it, the alternative to
choose instead, and any deprecated duplicates or APIs a consumer must avoid,
with their current replacement. For each deprecated API: what migration
removes, which one wins while both are present, and which repository files
(guides, templates, existing integrations) still show it.

## Install

Package name and source, version constraint, supported runtime versions and
required optional dependencies. For an integration, the library units it needs.

## Configure

Setting names, types, defaults and required combinations. Name secrets and
where they are read from; never include values.

## Minimal usage

The smallest correct example for the common task, with the setup and extension
points it relies on. Label an unexecuted example as such. Then list the
variation points a consumer changes to adapt it (for example authentication,
request parameters, pagination, response shape), each with its default and the
failure a wrong choice causes.

## Behavior consumers rely on

Lifecycle and state, pagination or batching, errors, retries and backoff,
idempotency, rate and size limits, concurrency. Mark irrelevant dimensions with
a short reason rather than inventing guarantees.

## Related units

Other catalog IDs this unit depends on, extends or replaces, each with package,
version constraint and a version-pinned URL. Copy none of their content.

## Not covered here

Topics outside this fast path, with pinned links to their detailed sources.

## Evidence and discrepancies

| Claim | Source path and symbol/test | Evidence label | Gap or limit |
| --- | --- | --- | --- |
| <claim> | <source in the named snapshot> | <observed / approved intent / executed check> | <uncertainty> |

| Existing documentation statement | Location | Observed code behavior | Proposed correction |
| --- | --- | --- | --- |
| <statement> | <path and line> | <source path and line> | <exact hunk reference or owner question> |

Organization norms appear here only as observations and a
Recommendation (unapproved) until an owner approves them.
