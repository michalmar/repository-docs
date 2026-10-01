#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { FLAT_INDEX_MAX_BYTES, oneLine, readCatalog, renderUnitLine } from './reuse-index.mjs';

const git = (checkout, ...args) => execFileSync('git', ['-C', checkout, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0' },
}).trim();
const compare = (left, right) => left.localeCompare(right, 'en');
function knownFields(value, allowed, name) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${name} must be an object`);
  for (const key of Object.keys(value)) {
    assert(allowed.includes(key), `${name}: unknown field ${key}`);
  }
}

function validName(name) {
  return typeof name === 'string'
    && /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/.test(name)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
}

function readManifest(index) {
  const manifest = JSON.parse(readFileSync(join(index, 'manifest.json'), 'utf8'));
  knownFields(manifest, ['title', 'purpose', 'repositories'], 'manifest');
  oneLine(manifest.title, 'manifest title');
  oneLine(manifest.purpose, 'manifest purpose');
  assert(Array.isArray(manifest.repositories) && manifest.repositories.length,
    'manifest repositories must be a nonempty list');
  const names = new Set();
  for (const [i, repository] of manifest.repositories.entries()) {
    knownFields(repository, ['name', 'url', 'branch', 'owner', 'area'],
      `manifest repository ${repository?.name ?? i}`);
    assert(validName(repository.name),
      `manifest repository ${repository.name ?? i}: invalid name`);
    const nameKey = repository.name.toLowerCase();
    assert(!names.has(nameKey), `Duplicate manifest repository name ${repository.name}`);
    names.add(nameKey);
    for (const field of ['url', 'branch', 'owner']) {
      oneLine(repository[field], `manifest repository ${repository.name} ${field}`);
    }
    assert(typeof repository.area === 'string' && repository.area.trim(),
      `manifest repository ${repository.name ?? i}: missing area`);
  }
  return manifest;
}

function originIdentity(value) {
  const scp = /^(?:(?<user>[^@/:]+)@)?(?<host>[^/:]+):(?<path>[^/?#][^?#]*)$/.exec(value);
  let host;
  let path;
  let user;
  if (scp) {
    ({ host, path, user } = scp.groups);
  } else {
    let url;
    try {
      url = new URL(value);
    } catch {
      return value;
    }
    if (!['https:', 'ssh:'].includes(url.protocol) || url.port || url.search || url.hash) return value;
    host = url.hostname;
    path = url.pathname.replace(/^\/+/, '');
    user = url.username;
    if (url.protocol === 'ssh:' && !user) return value;
  }
  const parts = path.replace(/\/+$/, '').split('/');
  const repository = parts.at(-1)?.replace(/\.git$/i, '');
  if (!repository) return value;
  parts[parts.length - 1] = repository;
  const domain = host.toLowerCase();
  if (domain === 'github.com' && parts.length === 2
    && (!scp || user === 'git')) {
    return `github:${parts.join('/')}`;
  }
  if (domain === 'dev.azure.com' && parts.length === 4 && parts[2] === '_git'
    && !scp) {
    return `azure:${parts[0].toLowerCase()}/${parts[1]}/${parts[3]}`;
  }
  if ((domain === 'ssh.dev.azure.com' || domain === 'vs-ssh.visualstudio.com')
    && parts.length === 4 && parts[0] === 'v3'
    && (user === 'git' || user?.toLowerCase() === parts[1].toLowerCase())) {
    return `azure:${parts[1].toLowerCase()}/${parts[2]}/${parts[3]}`;
  }
  const legacy = /^([^.]+)\.visualstudio\.com$/.exec(domain);
  if (legacy && !scp && (parts.length === 3 || (parts.length === 4 && parts[0] === 'DefaultCollection'))
    && parts[parts.length - 2] === '_git') {
    return `azure:${legacy[1]}/${parts[parts.length - 3]}/${repository}`;
  }
  return value;
}

const sameOrigin = (expected, actual) => originIdentity(expected) === originIdentity(actual);

function inspectClone(checkout, url) {
  const entry = lstatSync(checkout, { throwIfNoEntry: false });
  if (!entry) return { state: 'missing' };
  assert(entry.isDirectory(), `${checkout}: existing clone must be a directory, not a link`);
  const actual = realpathSync.native(git(checkout, 'rev-parse', '--show-toplevel'));
  const expected = realpathSync.native(checkout);
  assert((process.platform === 'win32' ? actual.toLowerCase() : actual)
    === (process.platform === 'win32' ? expected.toLowerCase() : expected),
  `${checkout}: existing directory is not a Git checkout root`);
  const origin = git(checkout, 'remote', 'get-url', 'origin');
  return { state: sameOrigin(url, origin) ? 'matching' : 'foreign origin', origin };
}

function configuredClones() {
  const home = homedir();
  const config = join(home, '.org-reuse', 'config.json');
  assert(lstatSync(config, { throwIfNoEntry: false })?.isFile(),
    `${config}: run setup first (configuration must be a regular file)`);
  const settings = JSON.parse(readFileSync(config, 'utf8'));
  knownFields(settings, ['root', 'indexRepo', 'indexUrl'], 'configuration');
  assert(typeof settings.root === 'string' && isAbsolute(settings.root),
    `${config}: root must be an absolute path`);
  assert(validName(settings.indexRepo), `${config}: invalid index repository name`);
  oneLine(settings.indexUrl, 'index repository URL');
  assert(lstatSync(settings.root, { throwIfNoEntry: false })?.isDirectory(),
    `${settings.root}: clone root must be a directory, not a link`);
  const index = join(settings.root, settings.indexRepo);
  const indexClone = inspectClone(index, settings.indexUrl);
  assert(indexClone.state === 'matching',
    indexClone.state === 'foreign origin'
      ? `${index}: foreign origin; expected ${settings.indexUrl}, actual ${indexClone.origin}`
      : `${index}: index clone is missing`);
  const expectedBranch = git(index, 'symbolic-ref', '--quiet', '--short',
    'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  const currentBranch = git(index, 'branch', '--show-current');
  assert(currentBranch === expectedBranch,
    `${index}: expected branch ${expectedBranch}, found ${currentBranch || 'detached HEAD'}`);
  const manifest = readManifest(index);
  const repositories = manifest.repositories.map(repository => {
    assert(repository.name.toLowerCase() !== settings.indexRepo.toLowerCase(),
      `${repository.name}: manifest repository name collides with the index repository`);
    git(index, 'check-ref-format', `refs/heads/${repository.branch}`);
    const checkout = join(settings.root, repository.name);
    return { ...repository, checkout, ...inspectClone(checkout, repository.url) };
  });
  return { ...settings, home, repositories };
}

function worktreeState(repository) {
  if (repository.state !== 'matching') return repository.state;
  const branch = git(repository.checkout, 'branch', '--show-current');
  if (branch !== repository.branch) return 'on another branch';
  if (git(repository.checkout, 'status', '--porcelain=v1', '--untracked-files=all')) return 'dirty';
  return 'clean';
}

function cloneState(repository) {
  const state = worktreeState(repository);
  if (state !== 'clean') return state;
  const tracking = `refs/remotes/origin/${repository.branch}`;
  const [ahead, behind] = git(repository.checkout, 'rev-list', '--left-right', '--count',
    `HEAD...${tracking}`).split(/\s+/).map(Number);
  if (ahead) return 'diverged';
  return behind ? 'behind' : 'clean';
}

function committedCatalogRevisions(index) {
  if (!git(index, 'ls-tree', '--name-only', 'HEAD', '--', 'catalog-revisions.json')) return {};
  const record = JSON.parse(git(index, 'show', 'HEAD:catalog-revisions.json'));
  knownFields(record, ['formatVersion', 'repositories', 'generatedAreas'], 'catalog revisions');
  assert(record.formatVersion === 1, `${index}: unsupported catalog revision format`);
  assert(record.repositories && typeof record.repositories === 'object'
    && !Array.isArray(record.repositories), `${index}: invalid catalog revision repositories`);
  for (const [name, revision] of Object.entries(record.repositories)) {
    assert(validName(name) && typeof revision === 'string' && /^[0-9a-f]{40}$/.test(revision),
      `${index}: invalid catalog revision for ${name}`);
  }
  assert(Array.isArray(record.generatedAreas)
    && record.generatedAreas.every(id => typeof id === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)),
  `${index}: invalid generated areas in catalog revisions`);
  return record.repositories;
}

function reportIndexStaleness(repositories, revisions, index) {
  let republish = false;
  for (const repository of repositories) {
    if (!Object.hasOwn(revisions, repository.name)) {
      console.log(`${repository.name}: not indexed`);
      republish = true;
      continue;
    }
    if (repository.state !== 'matching') continue;
    const branch = `refs/heads/${repository.branch}`;
    if (git(repository.checkout, 'for-each-ref', '--format=%(refname)', branch) !== branch) {
      console.log(`${repository.name}: index staleness unavailable (manifest branch not present locally)`);
      continue;
    }
    assert(git(repository.checkout, 'ls-tree', '--name-only', branch,
      '--', 'docs/reuse/catalog.json') === 'docs/reuse/catalog.json',
    `${repository.name}: manifest branch has no catalog at docs/reuse/catalog.json`);
    const current = git(repository.checkout, 'log', '-1', '--format=%H', branch,
      '--', 'docs/reuse/catalog.json');
    assert(current, `${repository.name}: manifest branch has no committed docs/reuse/catalog.json`);
    if (current !== revisions[repository.name]) {
      console.log(`${repository.name}: index stale (catalog ${current.slice(0, 12)}, `
        + `indexed ${revisions[repository.name].slice(0, 12)})`);
      republish = true;
    }
  }
  if (republish) {
    const scriptPath = process.platform === 'win32' ? '.\\scripts\\reuse.mjs' : './scripts/reuse.mjs';
    const quotedIndex = process.platform === 'win32'
      ? `'${index.replaceAll("'", "''")}'`
      : `'${index.replaceAll("'", "'\\''")}'`;
    console.log(`Republish index: node ${scriptPath} generate ${quotedIndex}`);
  }
}

function status() {
  const { root, home, indexRepo, repositories } = configuredClones();
  const index = join(root, indexRepo);
  const revisions = committedCatalogRevisions(index);
  const pointer = join(home, '.copilot', 'instructions', 'org-reuse.instructions.md');
  const entry = lstatSync(pointer, { throwIfNoEntry: false });
  assert(!entry || entry.isFile(), `${pointer}: pointer must be a regular file`);
  const pointerState = entry
    ? (readFileSync(pointer, 'utf8') === instructionFor(root, indexRepo) ? 'present' : 'different')
    : 'missing';
  console.log(`Root: ${root}\nPointer: ${pointer} (${pointerState})`);
  for (const repository of repositories) {
    console.log(`${repository.name}: ${cloneState(repository)}`);
  }
  reportIndexStaleness(repositories, revisions, index);
}

function sync() {
  const { root, indexRepo, repositories } = configuredClones();
  for (const repository of repositories) {
    assert(repository.state !== 'foreign origin',
      `${repository.checkout}: foreign origin; expected ${repository.url}, actual ${repository.origin}`);
  }
  const index = join(root, indexRepo);
  const revisions = committedCatalogRevisions(index);
  for (const repository of repositories) {
    if (repository.state === 'missing') {
      clone(repository.checkout, repository.url, repository.branch);
      continue;
    }
    const state = worktreeState(repository);
    if (state === 'dirty' || state === 'on another branch') {
      console.log(`${repository.name}: ${state}; skipped`);
      continue;
    }
    const tracking = `refs/remotes/origin/${repository.branch}`;
    git(repository.checkout, 'fetch', '--no-tags', '--no-write-fetch-head', 'origin',
      `+refs/heads/${repository.branch}:${tracking}`);
    const updated = cloneState(repository);
    if (updated === 'behind') {
      git(repository.checkout, 'merge', '--ff-only', tracking);
      console.log(`${repository.name}: fast-forwarded`);
    } else if (updated === 'diverged') {
      console.log(`${repository.name}: diverged; skipped`);
    } else if (updated === 'clean') {
      console.log(`${repository.name}: clean; up to date`);
    } else {
      throw new Error(`${repository.name}: changed during sync (${updated}); not fast-forwarded`);
    }
  }
  reportIndexStaleness(repositories, revisions, index);
}

function generate(index) {
  assert(lstatSync(index).isDirectory(), `${index}: index checkout must be a directory`);
  const manifest = readManifest(index);
  const title = oneLine(manifest.title, 'manifest title');
  const purpose = oneLine(manifest.purpose, 'manifest purpose');
  const taxonomy = JSON.parse(readFileSync(join(index, 'areas.json'), 'utf8'));
  knownFields(taxonomy, ['areas'], 'areas');
  assert(Array.isArray(taxonomy.areas) && taxonomy.areas.length, 'areas must contain a nonempty areas list');
  const areaIds = new Set();
  for (const [i, area] of taxonomy.areas.entries()) {
    knownFields(area, ['id', 'title', 'description'], `area ${area?.id ?? i}`);
    assert(typeof area.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(area.id),
      `area ${area.id}: invalid id`);
    const areaKey = area.id.toLowerCase();
    assert(!areaIds.has(areaKey), `Duplicate area ${area.id}`);
    areaIds.add(areaKey);
    oneLine(area.title, `area ${area.id} title`);
    oneLine(area.description, `area ${area.id} description`);
  }
  const areas = new Map(taxonomy.areas.map(area => [area.id, { ...area, entries: [] }]));
  for (const repository of manifest.repositories) {
    assert(areas.has(repository.area),
      `manifest repository ${repository.name}: unknown area ${repository.area}`);
  }
  const catalogNames = new Set();
  const catalogs = manifest.repositories.map(repository => {
    const checkout = join(dirname(index), repository.name);
    assert(existsSync(checkout), `Missing clone for ${repository.name}: ${checkout}`);
    assert(lstatSync(checkout).isDirectory(), `${repository.name}: clone must be a directory, not a link`);
    const branch = git(checkout, 'branch', '--show-current');
    assert(branch === repository.branch,
      `${repository.name}: expected branch ${repository.branch}, found ${branch || 'detached HEAD'}`);
    assert(!git(checkout, 'status', '--porcelain=v1', '--untracked-files=all',
      '--', 'docs/reuse/catalog.json'), `${repository.name}: catalog has uncommitted changes`);
    const revision = git(checkout, 'log', '-1', '--format=%H', '--', 'docs/reuse/catalog.json');
    assert(revision, `${repository.name}: catalog has no committed revision`);
    const catalog = readCatalog({ checkout, link: `../${repository.name}/`, revision });
    assert(!catalogNames.has(catalog.repository), `Duplicate catalog repository ${catalog.repository}`);
    catalogNames.add(catalog.repository);
    for (const unit of catalog.units) {
      const area = unit.area === undefined ? repository.area : unit.area;
      assert(areas.has(area), `${unit.id}: unknown area ${area}`);
      areas.get(area).entries.push({ ...unit, catalog });
    }
    return { ...catalog, name: repository.name };
  });
  const generatedAreas = [];
  const outputs = new Map();
  const root = [
    `# ${title}`, '', `> ${purpose}`, '',
    'Reusable libraries and existing integrations. Open the linked canonical reuse page before implementing.',
    '', '## Areas', '',
  ];
  for (const area of [...areas.values()].sort((a, b) => compare(a.id, b.id))) {
    if (!area.entries.length) {
      console.error(`Warning: area ${area.id} has no units`);
      continue;
    }
    generatedAreas.push(area.id);
    const file = `area-${area.id}.txt`;
    root.push(`- [${area.title}](${file}): ${area.description}`);
    outputs.set(file, `# ${area.title}\n\n> ${area.description}\n\n`
      + area.entries.sort((a, b) => compare(a.id, b.id)).map(renderUnitLine).join('\n') + '\n');
  }
  root.push('', 'If no area fits, grep all local catalogs: `rg -n --glob "**/docs/reuse/catalog.json" "<task>" ..`.',
    '', '## Catalogs', '');
  for (const catalog of [...catalogs].sort((a, b) => compare(a.name, b.name))) {
    root.push(`- [${catalog.repository}](${catalog.link}docs/reuse/catalog.json): `
      + `Machine-readable catalog of ${catalog.repository} at ${catalog.revision.slice(0, 12)}.`);
  }
  outputs.set('llms.txt', `${root.join('\n')}\n`);
  outputs.set('catalog-revisions.json', `${JSON.stringify({
    formatVersion: 1,
    repositories: Object.fromEntries([...catalogs].sort((a, b) => compare(a.name, b.name))
      .map(catalog => [catalog.name, catalog.revision])),
    generatedAreas,
  }, null, 2)}\n`);
  for (const [file, content] of outputs) {
    const bytes = Buffer.byteLength(content, 'utf8');
    assert(bytes <= FLAT_INDEX_MAX_BYTES,
      `${file} is ${bytes} bytes; exceeds the ${FLAT_INDEX_MAX_BYTES}-byte index budget`);
    const existing = lstatSync(join(index, file), { throwIfNoEntry: false });
    assert(!existing || existing.isFile(), `${file}: generated output must be a regular file`);
  }
  const record = join(index, 'catalog-revisions.json');
  const previous = existsSync(record) ? JSON.parse(readFileSync(record, 'utf8')) : null;
  if (previous) {
    assert(previous.formatVersion === 1 && Array.isArray(previous.generatedAreas)
      && previous.generatedAreas.every(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)),
    `Invalid existing ${record}`);
  }
  for (const [file, content] of outputs) writeFileSync(join(index, file), content);
  for (const id of previous?.generatedAreas ?? []) {
    const file = `area-${id}.txt`;
    if (!outputs.has(file) && lstatSync(join(index, file), { throwIfNoEntry: false })) {
      unlinkSync(join(index, file));
    }
  }
  console.log(`Wrote ${outputs.size} files in ${index}`);
}

function clone(checkout, url, branch) {
  const existing = inspectClone(checkout, url);
  if (existing.state !== 'missing') {
    assert(existing.state === 'matching',
      `${checkout}: origin differs from ${url} (actual ${existing.origin})`);
    const expectedBranch = branch ?? git(checkout, 'symbolic-ref', '--quiet', '--short',
      'refs/remotes/origin/HEAD').replace(/^origin\//, '');
    const currentBranch = git(checkout, 'branch', '--show-current');
    assert(currentBranch === expectedBranch,
      `${checkout}: expected branch ${expectedBranch}, found ${currentBranch || 'detached HEAD'}`);
    return;
  }
  execFileSync('git', ['clone', ...(branch ? ['--branch', branch, '--single-branch'] : []),
    '--', url, checkout], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`Cloned ${checkout}`);
}

const instructionFor = (root, indexRepo) =>
  `---\napplyTo: "**"\n---\nBefore implementing an integration, API client, data extractor or shared utility, read the organization's reuse index at \`${join(root, indexRepo, 'llms.txt')}\` and use the libraries and integrations it links.\n`;

async function setup(root, indexRepo, indexUrl) {
  assert(validName(indexRepo), `Invalid index repository name ${indexRepo}`);
  oneLine(indexUrl, 'index repository URL');
  const home = homedir();
  const config = join(home, '.org-reuse', 'config.json');
  const pointer = join(home, '.copilot', 'instructions', 'org-reuse.instructions.md');
  for (const directory of [dirname(config), join(home, '.copilot'), dirname(pointer)]) {
    const entry = lstatSync(directory, { throwIfNoEntry: false });
    assert(!entry || entry.isDirectory(), `${directory}: configuration directory must not be a link or file`);
  }
  const existingConfig = lstatSync(config, { throwIfNoEntry: false });
  assert(!existingConfig || existingConfig.isFile(), `${config}: configuration must be a regular file`);
  const instruction = instructionFor(root, indexRepo);
  const existingPointer = lstatSync(pointer, { throwIfNoEntry: false });
  assert(!existingPointer || existingPointer.isFile(), `${pointer}: pointer must be a regular file`);
  if (existingPointer) {
    const previous = readFileSync(pointer, 'utf8');
    if (previous !== instruction) {
      console.error(`--- existing ${pointer}\n${previous.trimEnd().split('\n').map(line => `- ${line}`).join('\n')}`
        + `\n+++ proposed ${pointer}\n${instruction.trimEnd().split('\n').map(line => `+ ${line}`).join('\n')}`);
      process.stderr.write('Type yes to replace the personal instruction: ');
      const reader = createInterface({ input: process.stdin });
      const answer = await new Promise(resolveAnswer => {
        reader.once('line', resolveAnswer);
        reader.once('close', () => resolveAnswer(''));
      });
      reader.close();
      assert(answer.trim() === 'yes', `${pointer}: existing pointer not replaced`);
    }
  }
  mkdirSync(root, { recursive: true });
  assert(lstatSync(root).isDirectory(), `${root}: clone root must be a directory, not a link`);
  const index = join(root, indexRepo);
  clone(index, indexUrl);
  const manifest = readManifest(index);
  for (const repository of manifest.repositories) {
    assert(repository.name.toLowerCase() !== indexRepo.toLowerCase(),
      `${repository.name}: manifest repository name collides with the index repository`);
  }
  for (const repository of manifest.repositories) {
    clone(join(root, repository.name), repository.url, repository.branch);
  }
  assert(lstatSync(join(index, 'llms.txt'), { throwIfNoEntry: false })?.isFile(),
    `${index}: missing root llms.txt or not a regular file`);
  mkdirSync(dirname(config), { recursive: true });
  mkdirSync(dirname(pointer), { recursive: true });
  writeFileSync(config, `${JSON.stringify({ root, indexRepo, indexUrl }, null, 2)}\n`);
  writeFileSync(pointer, instruction);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === 'generate' && args.length === 1) {
      generate(resolve(args[0]));
    } else if (command === 'setup' && args.length === 3) {
      await setup(resolve(oneLine(args[0], 'root')), args[1], args[2]);
    } else if (command === 'sync' && args.length === 0) {
      sync();
    } else if (command === 'status' && args.length === 0) {
      status();
    } else {
      throw new Error('Usage: reuse.mjs generate <index repository checkout>\n'
        + '       reuse.mjs setup <root> <indexRepo> <indexUrl>\n'
        + '       reuse.mjs sync\n'
        + '       reuse.mjs status');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
