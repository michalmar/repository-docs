# Organization reuse index

Use after approved [reuse documentation](reuse-workflow.md) exists in one or
more repositories, to let agents in other repositories find it. The index is
**routing only**: each repository's `docs/reuse/` pages and `catalog.json` stay
the single source of the explanation.

## Manifest and area taxonomy

Keep an index repository beside the repositories it routes to, all under one
clone root: `<root>/<name>`. Its `manifest.json` and `areas.json` are reviewed,
versioned inputs. A new index can start from the
[manifest template](../templates/reuse-index-manifest.json) and
[areas template](../templates/reuse-index-areas.json); replace every
placeholder before generating. For example, in `<root>/index/manifest.json`:

```json
{
  "title": "Acme reuse index",
  "purpose": "Find shared units before implementing a new integration.",
  "repositories": [
    {
      "name": "sdk",
      "url": "https://github.com/acme/sdk.git",
      "branch": "main",
      "owner": "platform team",
      "area": "clients"
    },
    {
      "name": "feeds",
      "url": "https://dev.azure.com/acme/data/_git/feeds",
      "branch": "main",
      "owner": "data team",
      "area": "integrations"
    }
  ]
}
```

`name` is the unique, explicit local folder name, not a name derived from
`url`; it uses letters, digits, dots, underscores or hyphens, beginning and
ending with a letter or digit. Names must also be distinct ignoring case, so
they do not collide on Windows. The URL may be any Git clone URL. `branch`
identifies the checked-out branch, `owner` is a team (not a taxonomy area),
and `area` is a required default area id. All five entry fields are required;
unknown manifest fields are rejected. The title and purpose are each a
nonempty line.

In `<root>/index/areas.json`, define consumer-facing tasks, not organization
teams:

```json
{
  "areas": [
    { "id": "clients", "title": "API clients", "description": "Build and authenticate API clients." },
    { "id": "integrations", "title": "Data integrations", "description": "Ingest and process external data." }
  ]
}
```

Each area id is unique ignoring case and contains only letters, digits,
hyphens or underscores, starting with a letter or digit. Its title and task
description are each one nonempty line. A catalog unit may specify an optional `area`
that overrides its repository's default; both defaults and overrides must
name an area in this taxonomy. Otherwise the generator fails and names the
offending repository or unit.

## Roles, change control and maintenance triggers

The **source repository owner** approves the reuse documentation and catalog
for that repository; the **index maintainer** proposes routing/taxonomy changes
and reviews the generated diff. A manifest `owner` records the owning team,
not the audience or a taxonomy area. The authorized approver decides the exact
maintenance proposal before edits, and separately approves any push and its
target after reviewing the resulting index diff. A recorded approval or a
successful generator run is not permission to push. For an index topic branch,
the user opens the pull request through their GitHub or Azure DevOps UI.
Follow the [reuse-index maintainer skill](../skills/reuse-index/SKILL.md)
for the ordered publication procedure.

Propose maintenance from a concrete **budget failure**, a documented unit with
**no fitting area**, or an **empty or near-empty area**, not from team ownership
alone. Inventory relevant committed catalogs, assigned default and override
areas, generated area sizes, consumer tasks, and empty-area warnings. Show
evidence, intended routes, affected repositories and the proposed before/after
diff to the owner/approver. Keep areas as consumer-facing capability domains;
`owner` remains a separate manifest field. Report competing interpretations
instead of silently inventing an area or reassigning a unit.

| Operation | Proposed change and approval boundary |
| --- | --- |
| Add a repository | Show its URL, branch, owner, unique local clone name, committed catalog and default consumer area. Obtain approval before editing `manifest.json` or creating its sibling clone. Confirm an existing clone's origin and branch; never overwrite it. |
| Remove a repository | Establish that no needed unit remains routed through it and what consumers lose. Obtain approval before removing its manifest entry. Leave its existing local clone intact; generation drops only its index routes. |
| Create, rename, split or merge an area | Show the consumer tasks and projected unit distribution, then get approval for the exact `areas.json` and manifest default changes and any affected catalog overrides. A rename is a new id plus migration of all references, not just a display-title edit. Recheck all catalog and default references before generating. |
| Move a unit to an existing area | Show the unit's consumer use and the catalog's current effective area. Obtain its repository owner's approval, then edit the unit's optional catalog `area` in `docs/reuse/catalog.json` (omit the override to use the repository default); review and publish it through that repository's documentation workflow, and wait for the commit on its manifest branch before syncing the index. Never substitute a manifest `owner` edit for a catalog move. |

Make approved source catalog commits available on the manifest branches,
then sync their clean sibling clones before creating an index taxonomy branch
and generating a cross-repository area change.
`sync` requires the index clone to be on its remote default branch, so run it
before creating or switching to an index topic branch. `generate` can then read
the proposed index inputs on that branch. If a new manifest entry has no
sibling clone yet, create only that approved clone with Git after checking the
target path, URL and branch; `sync` cannot read an unmerged topic-branch
manifest. An incomplete source/index migration is a stop, not a partly
published taxonomy.

## Set up a developer's clones

With Node.js 22+ and Git, run from the plugin checkout. Choose an index clone
name that is not another repository's clone name:

```powershell
node .\scripts\reuse.mjs setup 'D:\git' org-index 'https://github.com/acme/org-index.git'
```

`setup <root> <indexRepo> <indexUrl>` clones the index into
`<root>/<indexRepo>` on its remote default branch, reads its `manifest.json`,
then clones each named repository into `<root>/<name>` on its declared `branch`.
The index must already contain a root `llms.txt`. Git handles both GitHub and
Azure DevOps URLs through the developer's ordinary credential helper; neither
`gh` nor `az` is used. The command does not pull existing clones, regenerate
the index, install a plugin, or change a project repository.

It writes `~/.org-reuse/config.json` with the absolute `root`, `indexRepo` and
`indexUrl`, plus the one-sentence instruction
`~/.copilot/instructions/org-reuse.instructions.md`. That instruction has
`applyTo: "**"` and names the absolute `<root>/<indexRepo>/llms.txt` path, so
an agent in a deeper app worktree can still find the index. An existing clone
must be a checkout at the expected path with its declared origin and branch;
for the index, setup checks the branch recorded by its local `origin/HEAD`.
Otherwise setup stops rather than moving or overwriting it. An existing
personal pointer with different content is printed as an old/new difference;
type `yes` at the prompt to replace it. An empty or declined response leaves
the pointer and configuration unchanged. To switch clone roots, rerun setup
with the new root and confirm the changed pointer; clones in the old root
remain untouched.

If a developer names an existing checkout outside the configured root, the
relative index link `../<name>/...` still resolves to `<root>/<name>`, where
`name` is the manifest's explicit clone name, not a folder inferred from its
URL or the external checkout. Inspect only the named checkout and configured
root; do not discover other external clones or use a linked directory as an
in-root clone. Show the manifest URL and branch and check the destination with
`status`. Leave the outside checkout unchanged. If `<root>/<name>` is missing,
offer a fresh clone there only after explicit confirmation; `sync` is the
existing safe path, but it also fetches/fast-forwards other eligible in-root
clones. Disclose those effects before confirmation; if only the one clone is
approved, stop rather than invoking whole-root `sync`. If the destination
already exists, report its actual state instead of replacing it; normal
origin, branch, dirty and diverged rules apply. Never relocate an external
checkout or silently change the root.

For isolated local tests, redirect the operating-system home with `USERPROFILE`
on Windows or `HOME` on Unix. When manually checking discovery in the Copilot
CLI, set `COPILOT_HOME` to `<test-home>/.copilot` as well, then run
`copilot instruction list --json`. This check should list the generated file
with `location: "user"`; do not run setup against a real profile merely to
test the pointer.

## Inspect and update the local clones

After `setup`, run these commands from the plugin checkout without arguments:

```powershell
node .\scripts\reuse.mjs status
node .\scripts\reuse.mjs sync
```

Both commands read the root and index clone from `~/.org-reuse/config.json`,
then the index clone's **local** manifest. They require the index checkout to
remain on its remote default branch with the configured origin. They neither
fetch the index nor regenerate its `llms.txt`; update and review the index
manifest separately before syncing a newly listed repository.

`status` prints the clone root, the personal pointer's path and whether its
content is present, missing or different, then one state for every manifest
repository: `missing`, `clean`, `behind`, `dirty`, `on another branch`,
`diverged` (including local commits ahead of the remote-tracking branch), or
`foreign origin`. It is read-only and uses **locally fetched**
`origin/<branch>` refs. A remote commit may not appear as `behind` until a
fetch or `sync` updates that ref; status does not claim to probe the live
provider. A matching checkout without that tracking ref reports an error
instead of guessing its state; `sync` can fetch the ref for a clean checkout.

`sync` first checks every existing clone's origin, including the index. A
foreign origin aborts before **any** fetch or clone and reports the folder,
expected URL and actual URL. It clones missing manifest repositories on their
declared branches, skips dirty and wrong-branch clones without fetching them,
and fetches only clean matching-branch clones. It fast-forwards when the
fetched manifest branch descends from local `HEAD`, and reports a diverged
clone without merging or changing its checked-out files. It never deletes,
moves or renames clones, changes the pointer/configuration, pushes, or
regenerates the index. A Git/network error is reported as an error, not as a
successful sync.

Both commands compare the **committed** `catalog-revisions.json` in the local
index clone (`HEAD`) with the last commit changing `docs/reuse/catalog.json`
on each clone's local manifest branch. `sync` makes this comparison after its
clone/fetch/fast-forward work; `status` uses only local refs and does not fetch.
A catalog change pushed to a clean clone's remote is therefore detected by
`sync`, then also shown by `status`. Source-only commits do not make an index
stale. Uncommitted edits to the index record or a clone's catalog do not count
as published revisions.

An indexed repository with a different committed catalog revision is reported
as `index stale`; a manifest repository absent from the committed record is
`not indexed` (including when there is no committed record yet). The report
prints the republish command, with the index checkout path quoted, for example
`node .\scripts\reuse.mjs generate 'D:\git\org-index'` from the plugin checkout.
The index maintainer runs that command, reviews and commits the generated
files, and pushes the index separately. Neither command updates the index
clone from its remote: if another maintainer has published a new index, update
your local index checkout separately before interpreting its record. A
missing/foreign clone cannot supply a trusted catalog for comparison; a
missing local manifest branch is reported as unavailable, and a missing
committed catalog or malformed revision record is an error, not a clean index.

Origin comparison accepts a trailing `.git`, case-insensitive hosts, and the
GitHub HTTPS/SSH forms (`https://github.com/<owner>/<repo>` and
`git@github.com:<owner>/<repo>`). It also equates Azure DevOps modern HTTPS
(`https://dev.azure.com/<org>/<project>/_git/<repo>`), SSH
(`git@ssh.dev.azure.com:v3/<org>/<project>/<repo>`) and legacy HTTPS/SSH
(`https://<org>.visualstudio.com/<project>/_git/<repo>` and
`<org>@vs-ssh.visualstudio.com:v3/<org>/<project>/<repo>`); the legacy HTTPS
`DefaultCollection` segment is accepted. Local fixture and normalization
checks cover these shapes; cloning against a real Azure DevOps organization
has **not** been verified.

## Generate an area index

Run from the plugin checkout, with the index checkout path as the argument:

```powershell
node scripts/reuse.mjs generate D:\git\index
```

The command reads committed catalogs on each manifest branch in the sibling
clones. It refuses a missing clone, a wrong branch, or an uncommitted catalog;
it never clones, pulls, commits or pushes. It writes `llms.txt`, one
`area-<id>.txt` per nonempty area, and `catalog-revisions.json` into the
index checkout. The root lists area titles, descriptions and links; a
grep-all-local-catalogs fallback; and links to each catalog. Each area file
lists its units with the same summary, package, version, status, keywords and
source format as the flat generator. Links to sibling clones are relative
(`../<name>/...`) from both root and area files.

Areas sort by id and units by catalog id. An empty area is omitted from the
root and reported as a warning; a previously generated file for an area that
becomes empty is removed. No timestamps are written, so unchanged inputs
produce byte-identical files. The revision record has `formatVersion: 1`,
`repositories` mapping clone names to the last Git commit that changed their
catalog, and `generatedAreas` listing the currently generated area ids. A
source-code-only commit therefore does not make the catalog appear stale.

## Generate a flat index

List the repositories in a sources file and run the generator from this
package's `scripts/` directory:

```json
{ "title": "Acme reuse index",
  "repositories": [
    { "checkout": "C:/checkouts/acme-sdk", "link": "https://github.com/acme/sdk/blob/main/", "revision": "<commit>" } ] }
```

```powershell
node scripts/reuse-index.mjs sources.json llms.txt
```

`checkout` is a local checkout of the named revision; `link` is the prefix
prepended to each catalog page path (default branch, so links stay current);
`revision` is the commit the catalog was read from and appears in each note.

For repositories cloned side by side on developer machines (for example
`D:\git\<repository>`), keep the index in its own clone beside them and use
relative links, so every machine resolves them against its own clones:

```json
{ "title": "Acme reuse index",
  "repositories": [
    { "checkout": "D:/git/acme-sdk", "link": "../acme-sdk/", "revision": "<commit>" } ] }
```

The generator writes an [llms.txt](https://llmstxt.org/) file: libraries, then
integrations, each linked by catalog ID with its `summary`, package, version,
status, keywords and source revision, followed by links to the catalogs. It
refuses a missing or multi-line `summary`, an unknown type, an ID outside its
repository, an unsafe or missing page and a duplicate repository.
Regenerate and commit the index whenever an approved catalog changes (regenerate, never hand-edit); the
index never adds text a catalog does not contain.

Both generators limit **every completed output file** to the same
`FLAT_INDEX_MAX_BYTES` (16,384 bytes, or 16 KiB), including headings and
newlines. This is below the measured approximately 20 KB Copilot CLI `view`
limit, with some headroom; it is not a guarantee for other clients. If the
flat index, area file, root index or revision record exceeds the budget,
generation exits with an error reporting the file and actual UTF-8 byte size
**before** writing or replacing generated files. Invalid manifest and catalog
inputs also fail before any generated files are changed. Split an overfull
area or revise the taxonomy; never hand-truncate an index. Flat-mode output
is unchanged for organizations that fit its budget.

## Point agents at it

`llms.txt` has no verified automatic loading by Copilot; an agent reaches it
through a pointer. Publish the index in one repository and state its location
in one sentence. With local clones, name the index path on that machine, for
example: "Before implementing an integration, API client, data extractor or
shared utility, read the organization's reuse index at
`D:/git/acme-reuse-index/llms.txt` and use the libraries and integrations it
links." The agent also needs read access to the sibling clones: the user
approves reads outside the project, or the session allows them.

| Channel | Reach and limits |
| --- | --- |
| The personal `~/.copilot/instructions/org-reuse.instructions.md` written by `setup` | Always-loaded user instruction naming this developer's absolute local index path. A local CLI 1.0.89 check in a redirected home listed it with `location: "user"` and enabled by default; no real profile was changed. |
| A `*.instructions.md` file with `applyTo: "**"` in a directory listed by `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` | Copilot CLI loads it into every session as an external instruction (observed with CLI 1.0.89); needs distribution to developer machines, with the local index path. An `AGENTS.md` in that directory was not loaded at session start. Pilot on local clones beside three unrelated repositories, with a request that did not mention reuse: 3/3 fresh agents reused the right library with the pointer, 0/3 without it. Earlier GitHub-hosted stand-ins: 9/9 across three tasks. |
| A project template `AGENTS.md` | Only projects created from the template. |
| A skill whose description names these tasks | No always-loaded text beyond its description; relies on the model activating and then following it. Pilot: activated 9 of 9 times, but in 2 runs the agent ignored its body and reimplemented. |

Prefer an always-loaded instruction as the primary route; add a skill only as a
supplement. An `--add-dir` checkout is announced to the model and acts as a
pointer of its own. Side-by-side clones are no substitute for a pointer: when
the request asked for reuse, agents without one walked up from the project and
found the clones, but when it did not, none looked. Measure a pointer by
whether a fresh agent actually reuses the right unit and passes executable
checks, not by whether it opens the index. The pilot evidence is recorded in
the development repository's result catalog.
