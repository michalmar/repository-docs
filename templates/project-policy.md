# Project documentation boundaries and exceptions

Owner: <team or person>
Canonical index: <repo-relative path>
Source/document map: <repo-relative path>

Record only project-specific facts and deviations here. Shared process policy
remains in the installed `repository-docs` plugin. Installation is not approval
to create this file.

## Boundaries

In-scope capabilities, audiences, canonical owners, and excluded/private paths.
Record missing ownership explicitly. Add a project-specific rule only with its
reason and owner approval.

## Patch-bound assessment or exception

- Scope: <paths, interface, behavior, audience>
- Reason: <why the reviewed change needs no docs or needs a policy deviation>
- Invariants and evidence: <what was verified unchanged; sources/checks>
- Reviewed patch: <actual base/head; separate captured dirty patch if any>
- Owner approval: <required decision, or why not required>
- Invalidation: <relevant source, consumer, contract, config, or policy changes>

This is not a blanket ignore list or a substitute for missing evidence.
`documentation-map.json` is an initial routing format, not a coverage guarantee
or a stage-3 checker contract. Paths are consumer-relative; `sources` entries
identify concrete files or directories to investigate, not automatic exceptions.
