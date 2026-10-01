# Repository Docs

A GitHub Copilot plugin for evidence-based repository documentation. It helps
an agent map a repository from its source, write and update documentation next
to the code, document reusable libraries and integrations for other projects,
and route agents in other repositories to them through an organization reuse
index.

Canonical facts stay in the repository being documented; this package holds
the shared process. Agents propose exact files or hunks and wait for your
approval before applying them. Existing documentation is treated as evidence,
and conflicts with the code are reported rather than silently overwritten.

## Status

Experimental, version `0.6.0`. Developed and evaluated with GitHub Copilot CLI,
mostly on synthetic fixtures and a few open-source repositories:

- With one always-loaded instruction pointing to the reuse index, fresh agents
  reused the right library in every synthetic cross-repository run; without
  the pointer they almost always reimplemented it.
- Reuse pages cut exploration by 30-45%, but did not change correctness
  against small, readable libraries.

Not yet validated: setup against real GitHub or Azure DevOps organizations,
real user profiles, owner review on a real legacy repository, and agent hosts
other than Copilot. Semantic review by an agent is advisory, not a guarantee.

## Install

Requires GitHub Copilot CLI. The helper scripts need Node.js 22+ and Git; they
use only Node built-ins, so there is nothing to `npm install`.

```powershell
copilot plugin install msucharda/repository-docs
copilot plugin list
```

Start a **new** session, then check `/skills list` and `/agent` for the skills
and agents below. Installing does not change any repository.

## Components

| Component | Responsibility |
| --- | --- |
| [docs-bootstrap](skills/docs-bootstrap/SKILL.md) | Narrow onboarding, reuse documentation, or explicit repository recovery/resume: inventory, architecture spine, prioritized research, exact proposals and review. |
| [docs-update](skills/docs-update/SKILL.md) | From an actual base/head diff, including renames, deletions and indirect impacts: targeted documentation changes or reasoned no-impact. |
| [reuse-setup](skills/reuse-setup/SKILL.md) | Guide a developer through choosing a clone root, approving personal configuration and pointer writes, then inspecting and safely syncing local organization clones. |
| [reuse-index](skills/reuse-index/SKILL.md) | Maintainer workflow: sync, regenerate the index within its size budget, review and commit, then request push approval. |
| [repository-discovery](com.github.copilot/agents/repository-discovery.agent.md) | Read-only system map: meaningful modules, evidenced relationships and scoped research handoffs. |
| [documentation-reviewer](com.github.copilot/agents/documentation-reviewer.agent.md) | Fresh-context advisory review limited to `read`/`search` tools; derives expected impacts before reading the author's explanation. |
| [Shared policy](references/documentation-policy.md) | Authority, evidence labels, escalation and report outcomes, maintained once. |
| [Discovery](references/repository-discovery.md), [map review](references/discovery-map-review.md), [packet checker](references/discovery-packet.md) | Evidence views, flow traces, source-first coverage review and at most one authorized repair before writing. |
| [Recovery workflow](references/recovery-workflow.md) and [ledger helper](references/recovery-ledger.md) | Resumable, external state for whole-repository documentation recovery with one active work item. |
| [Reuse documentation](references/reuse-workflow.md), [page](templates/reuse-page.md) and [catalog](templates/reuse-catalog.json) templates | Pages for cross-project consumers: when to use a unit, install, configure, minimal usage, behavior, deprecations. |
| [Organization reuse index](references/reuse-index.md), [helper](scripts/reuse.mjs), [manifest](templates/reuse-index-manifest.json) and [areas](templates/reuse-index-areas.json) templates | Local side-by-side clones, a personal pointer instruction, safe fast-forward sync and a generated two-level `llms.txt` index. |
| [Overview](templates/architecture-overview.md), [contract](templates/interface-contract.md), [map](templates/documentation-map.json), [project exceptions](templates/project-policy.md) | Small starting points, used only for actual gaps. |

## Use it

Open a new session in the repository you want to document. Example requests:

- `Use /docs-bootstrap for this repository. Inventory existing docs and owners,
  then propose a narrow diff for the queue interface. Do not apply it.`
- `Use /docs-update for base <commit> and head <commit>. Assess the whole patch
  and propose affected docs only.`
- `Teams in other projects keep reimplementing what this repository provides.
  Document its reusable libraries and integrations for them; propose the pages
  and catalog, do not apply them.`
- `Use /docs-bootstrap to recover maintainer and integration documentation.
  Inventory the whole repository first and propose a prioritized work queue.`

Discovery of a skill is not permission to edit: approve exact paths or hunks
before anything is applied.

## Organization reuse index

1. Document each source repository in reuse mode and commit its
   `docs/reuse/` pages and `docs/reuse/catalog.json`.
2. Create an index repository from the [manifest](templates/reuse-index-manifest.json)
   and [areas](templates/reuse-index-areas.json) templates, clone it beside the
   source repositories, and generate the index:
   `node scripts/reuse.mjs generate <index checkout>`.
3. Each developer asks Copilot to `Set up the organization repositories`. The
   `reuse-setup` skill previews two personal files, a configuration and an
   always-loaded pointer instruction, and writes them only after confirmation.

See the [index reference](references/reuse-index.md) for the manifest format,
sync and status rules, staleness reporting and pointer channels.

## Scope

No MCP server, hooks, telemetry, CI, deployment or automatic updater is
included. The helper scripts are offline Node.js/Git code: they validate
declared evidence and Git state, never edit consumer documentation and never
run repository code. The two agents use Copilot's agent directory; other
clients may ignore them.

## License

[MIT](LICENSE). Upstream notices for adapted ideas are in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
