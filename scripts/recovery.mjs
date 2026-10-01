import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync, fsyncSync, linkSync, lstatSync, openSync, readFileSync,
  readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const commands = ['init', 'status', 'next', 'record', 'sync'];
const hash = value => createHash('sha256').update(value).digest('hex');
const emptyPatchHash = hash('');
const loadedHelperHash = hash(readFileSync(fileURLToPath(import.meta.url)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class RecoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RecoveryError';
    this.code = code;
  }
}

function requireThat(condition, message, code = 'INVALID_INPUT') {
  if (!condition) throw new RecoveryError(code, message);
}

function object(value, keys, label) {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object.`);
  requireThat(same(Object.keys(value).sort(), [...keys].sort()),
    `${label} requires exactly these fields: ${keys.join(', ')}.`);
}

function text(value, label) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && !value.includes('\0'),
    `${label} must be a nonempty string without NUL.`);
}

function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  requireThat(Number.isSafeInteger(value) && value >= min && value <= max,
    `${label} must be an integer from ${min} through ${max}.`);
}

function choice(value, choices, label) {
  requireThat(choices.includes(value), `${label} must be one of: ${choices.join(', ')}.`);
}

function strings(value, label, min = 0, validate = text) {
  requireThat(Array.isArray(value) && value.length >= min, `${label} must be an array (minimum ${min}).`);
  for (const entry of value) validate(entry, label);
  requireThat(new Set(value).size === value.length, `${label} contains duplicate entries.`);
}

function id(value, label) {
  requireThat(typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value),
    `${label} must be a lowercase ID (letters, digits, hyphens; 1–80 characters).`);
}

function sha(value, label, commit = false) {
  requireThat(typeof value === 'string' && (commit ? /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/ : /^[a-f0-9]{64}$/).test(value),
    `${label} must be a full ${commit ? 'Git object ID' : 'SHA-256 hex digest'}.`);
}

function route(value, label, prefix = true) {
  text(value, label);
  requireThat(!/[\x00-\x1f\x7f\\:*?"<>|]/.test(value) && !value.startsWith('/')
    && (prefix || !value.endsWith('/')), `${label}: use a normalized relative Git path, not an absolute path, glob, or backslash path.`);
  const parts = (value.endsWith('/') ? value.slice(0, -1) : value).split('/');
  requireThat(parts.every(part => part && part !== '.' && part !== '..' && !/[. ]$/.test(part)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
    && parts[0].toLowerCase() !== '.git', `${label}: empty/traversal, Git metadata, or nonportable path component.`);
}

const fileRoute = (value, label) => route(value, label, false);
const matches = (path, watched) => watched.endsWith('/') ? path.startsWith(watched) : path === watched;
const inside = (root, path) => {
  const result = relative(root, path);
  return result === '' || (!isAbsolute(result) && result !== '..' && !result.startsWith(`..${sep}`));
};

function optionalStat(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function noSymlinks(path, missing = false) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let cursor = root;
  for (const part of relative(root, absolute).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    const stat = optionalStat(cursor);
    if (!stat && missing) return;
    requireThat(stat, `Path does not exist: ${cursor}. Create the parent directory explicitly.`, 'PATH_ERROR');
    requireThat(!stat.isSymbolicLink(), `Symlinks/junctions are not allowed here: ${cursor}.`, 'UNSAFE_PATH');
  }
}

function stateLocation(repo, state, extraRoots = []) {
  text(state, '--state');
  requireThat(isAbsolute(state), '--state must be an explicit absolute file path.', 'UNSAFE_PATH');
  const target = resolve(state);
  noSymlinks(dirname(target));
  requireThat(lstatSync(dirname(target)).isDirectory(), 'The state parent must be an existing directory.', 'UNSAFE_PATH');
  for (const root of [repo, pluginRoot, ...extraRoots]) {
    requireThat(!inside(root, target), `State must be outside the consumer, plugin package, and Git metadata: ${root}.`, 'UNSAFE_PATH');
  }
  for (const path of [target, `${target}.lock`, `${target}.tmp`]) {
    const stat = optionalStat(path);
    requireThat(!stat || (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1),
      `Conflicting non-regular, linked, or symlink path: ${path}.`, 'UNSAFE_PATH');
  }
  return target;
}

function git(repo, args, allowedExit = [], binary = false) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, {
    GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1', GIT_ALLOW_PROTOCOL: '',
  });
  const overrides = [];
  if (args[0] === 'status') {
    const filters = git(repo, ['config', '--null', '--get-regexp', '^filter\\..*\\.(clean|process|required)$'], [1]);
    const names = new Set((filters ?? '').split('\0').filter(Boolean)
      .map(entry => entry.split('\n')[0].replace(/\.(?:clean|process|required)$/, '')));
    for (const name of names) {
      overrides.push('-c', `${name}.clean=`, '-c', `${name}.process=`, '-c', `${name}.required=false`);
    }
  }
  try {
    const result = execFileSync('git', [
      '--no-pager', '--no-optional-locks', '--literal-pathspecs', '-c', 'core.fsmonitor=false',
      '-c', 'core.untrackedCache=false', ...overrides, '-C', repo, ...args,
    ], { env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });
    return binary ? result : result.toString('utf8');
  } catch (error) {
    if (allowedExit.includes(error.status)) return null;
    throw new RecoveryError('GIT_ERROR',
      `Git ${args[0]} failed for ${repo}: ${error.stderr?.toString('utf8').trim() || error.message}. `
      + 'Check the explicit repository and locally available base/HEAD objects; this helper never fetches.');
  }
}

function consumerRoot(input) {
  text(input, '--repo');
  requireThat(isAbsolute(input), '--repo must be an explicit absolute Git worktree root.', 'WRONG_REPOSITORY');
  const root = realpathSync(input);
  requireThat(lstatSync(root).isDirectory(), '--repo must name a directory.', 'WRONG_REPOSITORY');
  const actual = realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim());
  requireThat(root === actual, `Use the Git worktree root, not a subdirectory: ${actual}.`, 'WRONG_REPOSITORY');
  return root;
}

function head(repo) {
  const result = git(repo, ['rev-parse', '--verify', '--end-of-options', 'HEAD^{commit}']).trim();
  sha(result, 'Actual HEAD', true);
  return result;
}

function dirtyPaths(repo) {
  const tokens = git(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none']).split('\0');
  const changes = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    const status = token.slice(0, 2);
    const paths = [token.slice(3)];
    if (/[RC]/.test(status)) paths.unshift(tokens[++index]);
    requireThat(paths.every(path => typeof path === 'string' && path.length > 0),
      'Malformed Git worktree name-status output.', 'GIT_ERROR');
    changes.push({ status, paths });
  }
  return changes;
}

/**
 * PACKAGE-INTERNAL, read-only source inspection for sibling checkers.
 * Returns a clean HEAD, metadata roots, and regular pinned blob line counts.
 * Paths use the existing literal, normalized Git-file routing rules.
 */
export function inspectSource(input, paths) {
  try {
    strings(paths, 'source paths', 0, fileRoute);
    const repository = consumerRoot(input);
    const gitRoots = ['--absolute-git-dir', '--git-common-dir'].map(flag =>
      realpathSync(resolve(repository, git(repository, ['rev-parse', flag]).trim())));
    const selectedHead = head(repository);
    requireThat(dirtyPaths(repository).length === 0,
      'Source inspection requires a clean tracked/untracked worktree. Select or restore an explicit committed snapshot.', 'DIRTY_WORKTREE');
    const files = paths.map(path => {
      const listing = git(repository, ['ls-tree', '-z', selectedHead, '--', path]).split('\0').filter(Boolean);
      requireThat(listing.length === 1 && /^100(?:644|755) blob [a-f0-9]+\t/.test(listing[0])
        && listing[0].slice(listing[0].indexOf('\t') + 1) === path,
      `Evidence must name an existing regular committed blob, not a directory, symlink, or submodule: ${path}.`, 'SOURCE_ERROR');
      const diskPath = join(repository, ...path.split('/'));
      noSymlinks(diskPath);
      requireThat(lstatSync(diskPath).isFile(), `Evidence worktree path must be a regular file: ${path}.`, 'UNSAFE_PATH');
      const blob = listing[0].split(' ')[2].split('\t')[0];
      const bytes = git(repository, ['cat-file', 'blob', blob], [], true);
      let lineCount = 0;
      for (const byte of bytes) if (byte === 10) lineCount += 1;
      if (bytes.length && bytes[bytes.length - 1] !== 10) lineCount += 1;
      return { path, blob, lineCount };
    });
    requireThat(dirtyPaths(repository).length === 0 && head(repository) === selectedHead,
      'HEAD or the worktree changed during source inspection. Retry on a stable clean snapshot.', 'CONCURRENT_CHANGE');
    return { repository, head: selectedHead, gitRoots, files };
  } catch (error) {
    if (error instanceof RecoveryError) throw error;
    if (typeof error.code === 'string') {
      throw new RecoveryError('IO_ERROR', `${error.code}: ${error.message}. Check the explicit repository, source paths, and permissions.`);
    }
    throw error;
  }
}

function fileHashes(value, label, nullable = false) {
  requireThat(Array.isArray(value), `${label} must be an array.`);
  const paths = [];
  for (const entry of value) {
    object(entry, ['path', 'sha256'], label);
    fileRoute(entry.path, `${label}.path`);
    if (!nullable || entry.sha256 !== null) sha(entry.sha256, `${label}.sha256`);
    paths.push(entry.path);
  }
  requireThat(new Set(paths).size === paths.length, `${label} contains duplicate paths.`);
}

function procedure(repo, instructionPaths) {
  const files = [];
  function collect(directory) {
    noSymlinks(directory);
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      requireThat(!stat.isSymbolicLink(), `Plugin resource is a symlink: ${path}.`, 'UNSAFE_PATH');
      if (stat.isDirectory()) collect(path);
      else {
        requireThat(stat.isFile(), `Plugin resource is not a regular file: ${path}.`, 'UNSAFE_PATH');
        const resource = relative(pluginRoot, path).split(sep).join('/');
        const sha256 = hash(readFileSync(path));
        requireThat(resource !== 'scripts/recovery.mjs' || sha256 === loadedHelperHash,
          'The helper changed after this module was loaded. Start a new Node process, inspect status, and sync the procedure drift.', 'PROCEDURE_CHANGED');
        files.push({ path: resource, sha256 });
      }
    }
  }
  for (const directory of ['skills', 'references', 'templates', 'scripts', join('com.github.copilot', 'agents')]) {
    collect(join(pluginRoot, directory));
  }
  for (const path of ['plugin.json']) {
    const diskPath = join(pluginRoot, ...path.split('/'));
    noSymlinks(diskPath);
    requireThat(lstatSync(diskPath).isFile(), `Plugin resource must be a file: ${diskPath}.`, 'UNSAFE_PATH');
    const sha256 = hash(readFileSync(diskPath));
    files.push({ path, sha256 });
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const manifest = readJson(join(pluginRoot, 'plugin.json'));
  requireThat(manifest.name === 'repository-docs', 'The executing package must identify itself as repository-docs.', 'PROCEDURE_ERROR');
  text(manifest.version, 'Plugin version');
  const instructions = instructionPaths.map(path => {
    const diskPath = join(repo, ...path.split('/'));
    noSymlinks(diskPath, true);
    const stat = optionalStat(diskPath);
    if (stat) {
      requireThat(stat.isFile(), `Instruction must be a regular file: ${path}.`, 'UNSAFE_PATH');
      requireThat(git(repo, ['ls-files', '-z', '--', path]).split('\0').includes(path),
        `Existing instruction is not tracked by Git: ${path}. Select tracked instructions explicitly.`, 'UNSAFE_PATH');
    }
    return { path, sha256: stat ? hash(readFileSync(diskPath)) : null };
  });
  const identity = { pluginRoot, name: manifest.name, version: manifest.version, files, instructions };
  return { ...identity, sha256: hash(JSON.stringify(identity)) };
}

function validateProcedure(identity) {
  object(identity, ['pluginRoot', 'name', 'version', 'files', 'instructions', 'sha256'], 'procedure');
  requireThat(typeof identity.pluginRoot === 'string' && isAbsolute(identity.pluginRoot), 'Invalid bound plugin root.');
  requireThat(identity.name === 'repository-docs', 'Invalid bound plugin name.');
  text(identity.version, 'procedure.version');
  fileHashes(identity.files, 'procedure.files');
  requireThat(identity.files.length > 0, 'Missing procedure resource fingerprints.');
  fileHashes(identity.instructions, 'procedure.instructions', true);
  const { sha256, ...fields } = identity;
  sha(sha256, 'procedure.sha256');
  requireThat(hash(JSON.stringify(fields)) === sha256, 'Procedure fingerprint does not match its recorded fields.');
}

function snapshot(repo, instructionPaths) {
  return { head: head(repo), procedure: procedure(repo, instructionPaths), dirty: dirtyPaths(repo) };
}

function issues(value, label) {
  requireThat(Array.isArray(value), `${label} must be an array.`);
  const ids = [];
  for (const issue of value) {
    object(issue, ['id', 'description', 'material'], label);
    id(issue.id, `${label}.id`);
    text(issue.description, `${label}.description`);
    requireThat(typeof issue.material === 'boolean', `${label}.material must be boolean.`);
    ids.push(issue.id);
  }
  requireThat(new Set(ids).size === ids.length, `${label} contains duplicate IDs.`);
}

function itemDefinition(item) {
  object(item, ['id', 'question', 'scope', 'audiences', 'priority', 'rationale', 'owner',
    'authority', 'authorityRef', 'watch', 'documents', 'dependencies', 'issues'], 'item');
  id(item.id, 'item.id');
  for (const key of ['question', 'scope', 'rationale']) text(item[key], `item.${key}`);
  strings(item.audiences, 'item.audiences', 1);
  integer(item.priority, 'item.priority', 0, 1_000_000);
  if (item.owner !== null) text(item.owner, 'item.owner');
  choice(item.authority, ['observed', 'proposed', 'approved-intent'], 'item.authority');
  if (item.authorityRef !== null) text(item.authorityRef, 'item.authorityRef');
  requireThat(item.authority !== 'approved-intent' || (item.owner !== null && item.authorityRef !== null),
    'Approved intent requires a named owner and authorityRef; batch approval is a separate declaration.');
  object(item.watch, ['source', 'config', 'tests'], 'item.watch');
  for (const group of Object.keys(item.watch)) strings(item.watch[group], `item.watch.${group}`, 0, route);
  requireThat(Object.values(item.watch).flat().length > 0, 'Each item needs at least one source/config/test watch route.');
  strings(item.documents, 'item.documents', 1, fileRoute);
  strings(item.dependencies, 'item.dependencies', 0, id);
  issues(item.issues, 'item.issues');
}

function graph(items, audiences) {
  const byId = new Map();
  for (const item of items) {
    itemDefinition(item);
    requireThat(!byId.has(item.id), `Duplicate item ID: ${item.id}.`);
    requireThat(item.audiences.every(audience => audiences.includes(audience)),
      `Item ${item.id} has an audience outside the run contract.`);
    byId.set(item.id, item);
  }
  const visited = new Set();
  const visiting = new Set();
  function visit(item) {
    requireThat(!visiting.has(item.id), `Dependency cycle at ${item.id}.`);
    if (visited.has(item.id)) return;
    visiting.add(item.id);
    for (const dependency of item.dependencies) {
      requireThat(byId.has(dependency), `Unknown dependency ${dependency} in ${item.id}.`);
      visit(byId.get(dependency));
    }
    visiting.delete(item.id);
    visited.add(item.id);
  }
  for (const item of items) visit(item);
}

function planSchema(plan) {
  object(plan, ['schemaVersion', 'goal', 'audiences', 'unitBudget', 'inventory', 'approvalRef', 'instructionPaths', 'navigation', 'items'], 'plan');
  requireThat(plan.schemaVersion === 1, 'Unsupported recovery plan schemaVersion; expected 1.');
  text(plan.goal, 'plan.goal');
  strings(plan.audiences, 'plan.audiences', 1);
  integer(plan.unitBudget, 'plan.unitBudget', 1);
  text(plan.approvalRef, 'plan.approvalRef');
  strings(plan.instructionPaths, 'plan.instructionPaths', 0, fileRoute);
  strings(plan.navigation, 'plan.navigation', 0, fileRoute);
  object(plan.inventory, ['ref', 'scope', 'checked', 'unchecked', 'exclusions'], 'inventory');
  for (const key of ['ref', 'scope']) text(plan.inventory[key], `inventory.${key}`);
  strings(plan.inventory.checked, 'inventory.checked', 1);
  strings(plan.inventory.unchecked, 'inventory.unchecked');
  requireThat(Array.isArray(plan.inventory.exclusions), 'inventory.exclusions must be an array.');
  for (const entry of plan.inventory.exclusions) {
    object(entry, ['scope', 'reason', 'evidenceRef'], 'inventory.exclusion');
    for (const key of Object.keys(entry)) text(entry[key], `inventory.exclusion.${key}`);
  }
  requireThat(Array.isArray(plan.items) && plan.items.length > 0, 'A run needs explicit work items.');
  graph(plan.items, plan.audiences);
  navigationGate(plan, plan.items);
}

function navigationGate(plan, items) {
  for (const path of plan.navigation) {
    requireThat(!plan.instructionPaths.includes(path) && !items.some(item =>
      item.documents.includes(path) || Object.values(item.watch).flat().some(watch => matches(path, watch))),
    `Navigation path ${path} overlaps substantive documents, source/config/test routes, or instructions. Declare routing-only files separately.`);
  }
}

const eventFields = {
  start: ['itemId'],
  resume: ['itemId', 'reason'],
  research: ['itemId', 'evidenceRefs', 'reportRef', 'gaps'],
  proposal: ['itemId', 'proposalRef', 'patchSha256', 'documents'],
  review: ['itemId', 'proposalRef', 'result', 'reportRef', 'reviewerRef', 'advisory', 'independent', 'findings'],
  resolve: ['itemId', 'findingId', 'reason', 'evidenceRef'],
  approve: ['itemId', 'proposalRef', 'approvalRef', 'coverage'],
  publish: ['itemId', 'commit', 'coverage', 'reportRef'],
  reassess: ['itemId', 'commit', 'reportRef'],
  pause: ['itemId', 'coverage', 'reason', 'reportRef', 'decisionRef'],
  discover: ['items', 'reason', 'evidenceRef'],
  reopen: ['itemIds', 'reason', 'evidenceRefs'],
  'resolve-change': ['changeIds', 'itemIds', 'resolution', 'reason', 'evidenceRefs'],
  budget: ['unitBudget', 'approvalRef'],
  sync: [],
};

function eventSchema(event, internal = false) {
  requireThat(event && typeof event === 'object', 'event must be an object.');
  requireThat(Object.hasOwn(eventFields, event.type) && (internal || event.type !== 'sync'),
    'Unknown event type. Consult references/recovery-ledger.md.');
  object(event, ['type', ...eventFields[event.type]], `event ${event.type}`);
  if ('itemId' in event) id(event.itemId, 'event.itemId');
  for (const key of ['reason', 'reportRef', 'proposalRef', 'reviewerRef', 'approvalRef', 'evidenceRef']) {
    if (key in event) text(event[key], `event.${key}`);
  }
  if ('evidenceRefs' in event) strings(event.evidenceRefs, 'event.evidenceRefs', 1);
  if ('findingId' in event) id(event.findingId, 'event.findingId');
  if ('gaps' in event) issues(event.gaps, 'event.gaps');
  if ('findings' in event) issues(event.findings, 'event.findings');
  if ('coverage' in event) choice(event.coverage, event.type === 'pause'
    ? ['partial', 'blocked', 'deferred'] : ['closed', 'partial'], 'event.coverage');
  if (event.type === 'pause') {
    if (event.decisionRef !== null) text(event.decisionRef, 'event.decisionRef');
    requireThat(event.coverage !== 'deferred' || event.decisionRef !== null, 'A deferral needs a decisionRef.');
  }
  if (event.type === 'proposal') {
    sha(event.patchSha256, 'event.patchSha256');
    fileHashes(event.documents, 'event.documents');
  }
  if (event.type === 'review') {
    choice(event.result, ['findings', 'no-findings', 'incomplete'], 'event.result');
    requireThat(event.advisory === true && typeof event.independent === 'boolean',
      'Review must be advisory:true and declare independent:true or false.');
  }
  if (['publish', 'reassess'].includes(event.type)) sha(event.commit, 'event.commit', true);
  if (event.type === 'discover') {
    requireThat(Array.isArray(event.items) && event.items.length > 0, 'discover needs at least one item.');
    for (const item of event.items) itemDefinition(item);
  }
  if (event.type === 'reopen') strings(event.itemIds, 'event.itemIds', 1, id);
  if (event.type === 'resolve-change') {
    strings(event.changeIds, 'event.changeIds', 1, id);
    strings(event.itemIds, 'event.itemIds', 0, id);
    choice(event.resolution, ['mapped', 'no-impact'], 'event.resolution');
    requireThat(event.resolution === 'mapped' ? event.itemIds.length > 0 : event.itemIds.length === 0,
      'mapped requires itemIds; no-impact requires an empty itemIds array.');
  }
  if (event.type === 'budget') integer(event.unitBudget, 'event.unitBudget', 1);
}

function newItem(definition) {
  return {
    ...structuredClone(definition), progress: 'pending', coverage: 'unassessed', stage: 'queued',
    attempt: 0, charged: false, evidenceRefs: [], researchReports: [], proposal: null, review: null,
    approval: null, publication: null, assessment: null, pause: null, extraWatch: [], usedProposalRefs: [],
    issues: definition.issues.map(issue => ({ ...issue, resolved: false, resolution: null })),
    staleHistory: [],
  };
}

const active = state => state.items.find(item => item.progress === 'active');
const unresolved = state => state.changes.filter(change => change.resolution === null);
const dependenciesClosed = (state, item) => item.dependencies.every(id =>
  state.items.find(candidate => candidate.id === id).coverage === 'closed');
const ready = state => state.items.filter(item => item.progress === 'pending' && dependenciesClosed(state, item))
  .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const watches = item => [...Object.values(item.watch).flat(), ...item.documents, ...item.extraWatch];
const documentPaths = (state, item) => [...item.documents, ...state.plan.navigation];

function dependents(state, ids) {
  const affected = new Set(ids);
  let added;
  do {
    added = false;
    for (const item of state.items) {
      if (!affected.has(item.id) && item.dependencies.some(id => affected.has(id))) {
        affected.add(item.id);
        added = true;
      }
    }
  } while (added);
  return affected;
}

function invalidate(state, ids, revision, reason) {
  for (const item of state.items) {
    if (!ids.has(item.id)) continue;
    item.staleHistory.push({
      revision, reason, head: state.checkpoint.head, attempt: item.attempt,
      evidenceRefs: item.evidenceRefs, researchReports: item.researchReports,
      proposal: item.proposal, review: item.review, approval: item.approval,
      publication: item.publication, assessment: item.assessment, issues: structuredClone(item.issues),
    });
    item.progress = 'pending';
    item.coverage = 'stale';
    item.stage = 'queued';
    item.charged = false;
    item.evidenceRefs = [];
    item.researchReports = [];
    item.proposal = item.review = item.approval = item.publication = item.assessment = item.pause = null;
    for (const issue of item.issues) {
      issue.resolved = false;
      issue.resolution = null;
    }
  }
}

function addIssues(item, entries) {
  for (const issue of entries) {
    requireThat(!item.issues.some(existing => existing.id === issue.id),
      `Duplicate finding/gap ID ${issue.id} in ${item.id}; use resolve, not replacement.`);
    item.issues.push({ ...issue, resolved: false, resolution: null });
  }
}

function proposalGate(item) {
  requireThat(item.evidenceRefs.length > 0 && item.researchReports.length > 0 && item.proposal,
    'Research evidence, a report, and an exact proposal are required.', 'GATE_FAILED');
}

function reviewGate(item, coverage) {
  proposalGate(item);
  requireThat(item.review && item.review.proposalRef === item.proposal.proposalRef,
    'Record advisory review of the exact current proposal first.', 'GATE_FAILED');
  if (coverage === 'closed') {
    requireThat(item.review.result === 'no-findings' && item.review.independent
      && !item.issues.some(issue => issue.material && !issue.resolved),
    'Closure requires declared independent no-findings review and no unresolved material gaps/findings. Repair and re-review, or publish partial.', 'GATE_FAILED');
  }
}

function changeSchema(change) {
  object(change, ['base', 'head', 'status', 'paths'], 'Git change');
  sha(change.base, 'change.base', true);
  sha(change.head, 'change.head', true);
  requireThat(/^(?:[AMDTUXB]|[RC][0-9]{1,3})$/.test(change.status)
    && (!/^[RC]/.test(change.status) || Number(change.status.slice(1)) <= 100),
    'Invalid Git name-status code.');
  strings(change.paths, 'change.paths', /^[RC]/.test(change.status) ? 2 : 1, fileRoute);
  requireThat(change.paths.length === (/^[RC]/.test(change.status) ? 2 : 1), 'Invalid Git name-status path count.');
}

function verificationSchema(verification, type) {
  if (!['sync', 'publish', 'reassess'].includes(type)) {
    requireThat(verification === null, 'Only sync/publish/reassess may carry Git verification.');
    return;
  }
  object(verification, ['head', 'procedure', 'changes', 'nonlinear'], 'verification');
  sha(verification.head, 'verification.head', true);
  validateProcedure(verification.procedure);
  requireThat(Array.isArray(verification.changes) && typeof verification.nonlinear === 'boolean', 'Invalid Git verification.');
  for (const change of verification.changes) changeSchema(change);
}

function applyEvent(state, event, verification, revision) {
  eventSchema(event, true);
  verificationSchema(verification, event.type);
  const item = event.itemId ? state.items.find(item => item.id === event.itemId) : null;
  requireThat(!event.itemId || item, `Unknown item ID: ${event.itemId}.`);
  const entry = { ...structuredClone(event), revision, assessedHead: state.checkpoint.head };
  if (event.type === 'sync') {
    const all = verification.nonlinear || verification.procedure.sha256 !== state.checkpoint.procedure.sha256;
    const affected = new Set(all ? state.items.map(item => item.id) : []);
    if (all) {
      for (const change of state.changes) {
        if (change.resolution?.resolution !== 'no-impact') continue;
        change.staleResolutions.push(change.resolution);
        change.resolution = null;
      }
    }
    verification.changes.forEach((change, index) => {
      const instruction = change.paths.some(path => state.instructionPaths.includes(path)
        || state.plan.navigation.includes(path));
      const mapped = state.items.filter(item => instruction
        || change.paths.some(path => watches(item).some(watch => matches(path, watch))));
      for (const item of mapped) {
        affected.add(item.id);
        if (change.status.startsWith('R')) {
          item.extraWatch = [...new Set([...item.extraWatch, change.paths[1]])];
        }
      }
      state.changes.push({
        id: `change-${revision}-${index + 1}`, ...change,
        resolution: mapped.length ? { kind: 'routing', itemIds: mapped.map(item => item.id), revision } : null,
        staleResolutions: [],
      });
    });
    invalidate(state, dependents(state, affected), revision, all ? 'procedure-or-history-drift' : 'mapped-git-change');
    state.checkpoint = { head: verification.head, procedure: verification.procedure };
    return;
  }
  if (event.type === 'discover') {
    const definitions = state.items.map(item => Object.fromEntries(Object.keys(state.plan.items[0]).map(key => [key,
      key === 'issues' ? item.issues.map(({ id, description, material }) => ({ id, description, material })) : item[key]])));
    const combined = [...definitions, ...event.items];
    graph(combined, state.plan.audiences);
    navigationGate(state.plan, combined);
    state.items.push(...event.items.map(newItem));
    state.scopeVersion += 1;
    return;
  }
  if (event.type === 'budget') {
    requireThat(event.unitBudget > state.budget.limit, 'A budget event must explicitly increase the current unit limit.');
    state.budget.limit = event.unitBudget;
    return;
  }
  if (event.type === 'reopen') {
    for (const itemId of event.itemIds) {
      const target = state.items.find(item => item.id === itemId);
      requireThat(target && target.coverage === 'closed',
        `Reopen target ${itemId} must be an existing closed item.`);
    }
    const affected = dependents(state, event.itemIds);
    requireThat(!affected.has(active(state)?.id),
      'Feedback would invalidate active work. Preserve its evidence and explicitly pause it before reopening its prerequisite.', 'ACTIVE_ITEM');
    invalidate(state, affected, revision, 'same-snapshot-feedback');
    return;
  }
  if (event.type === 'resolve-change') {
    for (const itemId of event.itemIds) requireThat(state.items.some(item => item.id === itemId), `Unknown mapped item: ${itemId}.`);
    for (const changeId of event.changeIds) {
      const change = state.changes.find(change => change.id === changeId);
      requireThat(change && change.resolution === null, `Change ${changeId} is unknown or already accounted for.`);
      change.resolution = entry;
      for (const itemId of event.itemIds) {
        const mappedItem = state.items.find(item => item.id === itemId);
        mappedItem.extraWatch = [...new Set([...mappedItem.extraWatch, ...change.paths])];
      }
    }
    if (event.itemIds.length) invalidate(state, dependents(state, event.itemIds), revision, 'explicit-change-mapping');
    return;
  }
  if (event.type === 'start' || event.type === 'resume') {
    requireThat(!active(state), 'There is already an active item; next resumes it. Pause it before selecting another.', 'ACTIVE_ITEM');
    requireThat(unresolved(state).length === 0, 'Resolve unclassified Git changes before dispatch.', 'UNCLASSIFIED_CHANGES');
    requireThat(dependenciesClosed(state, item), `Dependencies of ${item.id} are not closed.`, 'DEPENDENCY_BLOCKED');
    if (event.type === 'start') {
      requireThat(ready(state)[0]?.id === item.id, 'start must select the highest-priority ready item; use next.', 'NOT_READY');
      requireThat(state.budget.spent < state.budget.limit, 'Unit budget exhausted. Pause incomplete; record an explicitly approved budget increase to continue.', 'BUDGET_EXHAUSTED');
      state.budget.spent += 1;
      item.attempt += 1;
      item.charged = true;
    } else {
      requireThat(item.progress === 'paused' && item.charged, 'resume requires a paused, already charged assessment attempt.');
    }
    item.progress = 'active';
    item.pause = null;
    if (item.stage === 'queued') item.stage = 'research';
    return;
  }
  requireThat(item.progress === 'active', `Item ${item.id} is not active; use next or record resume.`, 'NOT_ACTIVE');
  if (event.type === 'research') {
    addIssues(item, event.gaps);
    item.evidenceRefs = [...new Set([...item.evidenceRefs, ...event.evidenceRefs])];
    item.researchReports.push({ ref: event.reportRef, revision, assessedHead: state.checkpoint.head });
    item.proposal = item.review = item.approval = null;
    item.stage = 'researched';
  } else if (event.type === 'proposal') {
    requireThat(item.evidenceRefs.length && item.researchReports.length, 'Record research before proposing.', 'GATE_FAILED');
    requireThat(same(documentPaths(state, item).sort(), event.documents.map(entry => entry.path).sort()),
      'Proposal must fingerprint every canonical and shared navigation document, and only those documents.');
    requireThat(!item.usedProposalRefs.includes(event.proposalRef), 'Use a new exact proposalRef for a revised candidate.');
    item.usedProposalRefs.push(event.proposalRef);
    item.proposal = entry;
    item.review = item.approval = null;
    item.stage = 'proposed';
  } else if (event.type === 'review') {
    proposalGate(item);
    requireThat(event.proposalRef === item.proposal.proposalRef, 'Review names a superseded or unknown proposal.');
    addIssues(item, event.findings);
    item.review = entry;
    item.approval = null;
    item.stage = 'reviewed';
  } else if (event.type === 'resolve') {
    const finding = item.issues.find(issue => issue.id === event.findingId);
    requireThat(finding && !finding.resolved, `Finding ${event.findingId} is unknown or already resolved.`);
    finding.resolved = true;
    finding.resolution = entry;
    item.review = item.approval = null;
    item.stage = item.proposal ? 'proposed' : item.evidenceRefs.length ? 'researched' : 'research';
  } else if (event.type === 'approve') {
    requireThat(unresolved(state).length === 0, 'Unclassified changes prevent approval.', 'UNCLASSIFIED_CHANGES');
    reviewGate(item, event.coverage);
    requireThat(event.proposalRef === item.proposal.proposalRef, 'Approval names a superseded or unknown proposal.');
    item.approval = entry;
    item.stage = 'approved';
  } else if (event.type === 'reassess') {
    requireThat(unresolved(state).length === 0, 'Unclassified changes prevent reassessment closure.', 'UNCLASSIFIED_CHANGES');
    reviewGate(item, 'closed');
    requireThat(item.approval && item.approval.proposalRef === item.proposal.proposalRef
      && item.approval.coverage === 'closed', 'Record exact-proposal approval for closed reassessment first.', 'GATE_FAILED');
    requireThat(item.proposal.patchSha256 === emptyPatchHash, 'Reassessment requires an explicitly empty documentation patch.', 'GATE_FAILED');
    requireThat(verification.head === event.commit && event.commit === state.checkpoint.head
      && verification.procedure.sha256 === state.checkpoint.procedure.sha256
      && verification.changes.length === 0 && !verification.nonlinear,
    'Reassessment must verify unchanged documentation at the current checkpoint, not invent a publication.', 'GATE_FAILED');
    item.assessment = { ...entry, outcome: 'justified-no-impact' };
    item.coverage = 'closed';
    item.progress = 'done';
    item.stage = 'reassessed';
    item.pause = null;
  } else if (event.type === 'publish') {
    requireThat(unresolved(state).length === 0, 'Unclassified changes prevent publication.', 'UNCLASSIFIED_CHANGES');
    reviewGate(item, event.coverage);
    requireThat(item.approval && item.approval.proposalRef === item.proposal.proposalRef
      && item.approval.coverage === event.coverage, 'Record matching exact-proposal/coverage approval before publication.', 'GATE_FAILED');
    requireThat(verification.head === event.commit && verification.head !== state.checkpoint.head
      && !verification.nonlinear && verification.changes.length > 0
      && verification.procedure.sha256 === state.checkpoint.procedure.sha256,
    'Publication needs a real linear documentation-only advancement under the same procedure.', 'GATE_FAILED');
    requireThat(verification.changes.every(change => change.paths.every(path => documentPaths(state, item).includes(path))),
      'Publication includes paths outside the approved canonical/navigation documents. Use sync and reassess.', 'DRIFT');
    const others = state.items.filter(other => other.id !== item.id
      && verification.changes.some(change => change.paths.some(path => watches(other).some(watch => matches(path, watch)))));
    const affected = dependents(state, others.map(other => other.id));
    requireThat(!affected.has(item.id), 'This publication changes an assessed prerequisite; use sync and reassess.', 'DRIFT');
    invalidate(state, affected, revision, 'shared-document-publication');
    item.publication = entry;
    item.coverage = event.coverage;
    item.progress = event.coverage === 'closed' ? 'done' : 'paused';
    item.stage = 'published';
    if (event.coverage === 'partial') item.pause = { reason: 'Partial publication; explicit resume required.', reportRef: event.reportRef };
    state.checkpoint = { head: verification.head, procedure: verification.procedure };
  } else if (event.type === 'pause') {
    item.progress = 'paused';
    item.coverage = event.coverage;
    item.pause = entry;
  }
}

function ledgerState(ledger) {
  object(ledger, ['schemaVersion', 'repository', 'createdAt', 'initial', 'plan', 'revision', 'records'], 'ledger');
  requireThat(ledger.schemaVersion === 1, 'Unsupported recovery ledger schemaVersion; expected 1.');
  requireThat(typeof ledger.repository === 'string' && isAbsolute(ledger.repository), 'Invalid ledger repository root.');
  timestamp(ledger.createdAt, 'ledger.createdAt');
  object(ledger.initial, ['head', 'procedure'], 'ledger.initial');
  sha(ledger.initial.head, 'ledger.initial.head', true);
  validateProcedure(ledger.initial.procedure);
  planSchema(ledger.plan);
  requireThat(same(ledger.initial.procedure.instructions.map(entry => entry.path), ledger.plan.instructionPaths),
    'Bound instruction paths differ from the plan.');
  integer(ledger.revision, 'ledger.revision');
  requireThat(Array.isArray(ledger.records) && ledger.records.length === ledger.revision, 'Ledger revision must equal its journal length.');
  const state = {
    plan: ledger.plan, checkpoint: structuredClone(ledger.initial), instructionPaths: ledger.plan.instructionPaths,
    scopeVersion: 1, budget: { limit: ledger.plan.unitBudget, spent: 0 },
    items: ledger.plan.items.map(newItem), changes: [],
  };
  for (const [index, record] of ledger.records.entries()) {
    object(record, ['revision', 'at', 'event', 'verification'], 'journal record');
    requireThat(record.revision === index + 1, 'Nonsequential journal revision.');
    timestamp(record.at, 'journal.at');
    applyEvent(state, record.event, record.verification, record.revision);
    requireThat(same(state.checkpoint.procedure.instructions.map(entry => entry.path), state.instructionPaths),
      'Journal changes the instruction path contract.');
  }
  return state;
}

function timestamp(value, label) {
  requireThat(typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value, `${label} must be an ISO UTC timestamp.`);
}

function readJson(path) {
  const source = readFileSync(path, 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new RecoveryError('INVALID_JSON', `Invalid JSON in ${path}: ${error.message}.`);
  }
}

function changesBetween(repo, base, target) {
  const resolvedBase = git(repo, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
  requireThat(resolvedBase === base, 'The recorded base is not an exact commit.', 'GIT_ERROR');
  if (base === target) return { changes: [], nonlinear: false };
  const ancestor = git(repo, ['merge-base', '--is-ancestor', base, target], [1]) !== null;
  const rows = ancestor ? git(repo, ['rev-list', '--reverse', '--topo-order', '--parents', `${base}..${target}`, '--'])
    .trim().split('\n').map(line => line.trim().split(' ')) : [];
  let previous = base;
  const linear = ancestor && rows.every(row => {
    const valid = row.length === 2 && row[1] === previous;
    previous = row[0];
    return valid;
  }) && previous === target;
  const pairs = linear ? rows.map(row => [row[1], row[0]]) : [[base, target]];
  const changes = [];
  for (const [from, to] of pairs) {
    const tokens = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z',
      '--find-renames', '--ignore-submodules=none', from, to, '--']).split('\0');
    for (let index = 0; index < tokens.length - 1;) {
      const status = tokens[index++];
      const paths = [tokens[index++]];
      if (/^[RC]/.test(status)) paths.push(tokens[index++]);
      const change = { base: from, head: to, status, paths };
      changeSchema(change);
      changes.push(change);
    }
  }
  return { changes, nonlinear: !linear };
}

function drift(state, observed) {
  return {
    head: observed.head !== state.checkpoint.head,
    procedure: observed.procedure.sha256 !== state.checkpoint.procedure.sha256,
    dirty: observed.dirty.length > 0,
  };
}

function currentGate(state, observed, allowActiveDocs = false) {
  const difference = drift(state, observed);
  requireThat(!difference.head && !difference.procedure,
    'HEAD or procedure/instruction identity differs from the checkpoint. Inspect status, then sync --revision with a clean worktree.', 'DRIFT');
  const item = active(state);
  const onlyDrafts = item && observed.dirty.every(change =>
    change.paths.every(path => documentPaths(state, item).includes(path) && !sourcePath(state, path)));
  requireThat(!difference.dirty || (allowActiveDocs && onlyDrafts),
  'The worktree has source, other-document, or untracked changes. Reconcile them explicitly; only the active item’s canonical draft paths may be dirty.', 'DIRTY_WORKTREE');
}

function sourcePath(state, path) {
  return state.instructionPaths.includes(path)
    || state.items.some(item => [...Object.values(item.watch).flat(), ...item.extraWatch]
      .some(watch => matches(path, watch)));
}

function verifyCanonicalContents(repo, item, commit) {
  for (const document of item.proposal.documents) {
    const listing = git(repo, ['ls-tree', '-z', commit, '--', document.path]).split('\0').filter(Boolean);
    requireThat(listing.length === 1 && /^100(?:644|755) blob [a-f0-9]+\t/.test(listing[0])
      && listing[0].slice(listing[0].indexOf('\t') + 1) === document.path,
    `Canonical document is missing or not a regular Git blob: ${document.path}.`, 'GATE_FAILED');
    const blobId = listing[0].split(' ')[2].split('\t')[0];
    // Hash Git's bytes, not decoded/re-encoded text or CRLF-translated worktree content.
    const content = git(repo, ['cat-file', 'blob', blobId], [], true);
    requireThat(hash(content) === document.sha256,
      `Committed content does not match the approved full-document SHA-256: ${document.path}. Repair/reapprove the exact proposal.`, 'GATE_FAILED');
  }
}

function verifyPublication(repo, state, observed, event) {
  const item = state.items.find(item => item.id === event.itemId);
  requireThat(item, `Unknown item: ${event.itemId}.`);
  requireThat(observed.dirty.length === 0, 'Publication requires a clean tracked/untracked worktree.', 'DIRTY_WORKTREE');
  requireThat(event.commit === observed.head, 'publish.commit must equal the actual resolved HEAD.', 'GATE_FAILED');
  requireThat(observed.procedure.sha256 === state.checkpoint.procedure.sha256,
    'Procedure/instruction drift requires sync and reassessment.', 'DRIFT');
  const change = changesBetween(repo, state.checkpoint.head, observed.head);
  requireThat(change.changes.every(change => change.paths.every(path => !sourcePath(state, path))),
  'A source/config/test/instruction path changed in this commit range. Use sync and reassess; a mixed commit is not a publication shortcut.', 'DRIFT');
  reviewGate(item, event.coverage);
  verifyCanonicalContents(repo, item, observed.head);
  return { head: observed.head, procedure: observed.procedure, ...change };
}

function verifyReassessment(repo, state, observed, event) {
  const item = state.items.find(item => item.id === event.itemId);
  requireThat(item, `Unknown item: ${event.itemId}.`);
  currentGate(state, observed);
  requireThat(event.commit === observed.head, 'reassess.commit must equal the actual current checkpoint HEAD.', 'GATE_FAILED');
  reviewGate(item, 'closed');
  requireThat(item.proposal.patchSha256 === emptyPatchHash, 'Reassessment requires an explicitly empty documentation patch.', 'GATE_FAILED');
  verifyCanonicalContents(repo, item, observed.head);
  return { head: observed.head, procedure: observed.procedure, changes: [], nonlinear: false };
}

function report(ledger, state, observed, action) {
  const difference = drift(state, observed);
  const stale = difference.head || difference.procedure || difference.dirty;
  const allClosed = state.items.every(item => item.coverage === 'closed');
  const reason = stale ? 'checkpoint-drift-or-dirty-worktree' : unresolved(state).length ? 'unclassified-changes'
    : allClosed ? 'closed-target' : active(state) ? 'active-item'
      : state.budget.spent >= state.budget.limit ? 'budget-exhausted'
        : ready(state).length ? 'ready-items' : 'blocked-partial-or-deferred';
  return {
    ok: true, action, revision: ledger.revision, repository: ledger.repository,
    goal: state.plan.goal, audiences: state.plan.audiences, inventory: state.plan.inventory,
    navigation: state.plan.navigation,
    scopeVersion: state.scopeVersion,
    outcome: reason === 'closed-target' ? 'complete' : 'incomplete', reason,
    checkpoint: { head: state.checkpoint.head, procedure: state.checkpoint.procedure.sha256 },
    observed: { head: observed.head, procedure: observed.procedure.sha256, worktreeChanges: observed.dirty },
    drift: difference, budget: { ...state.budget, remaining: state.budget.limit - state.budget.spent },
    activeItem: active(state)?.id ?? null, readyItems: stale || unresolved(state).length ? [] : ready(state).map(item => item.id),
    items: state.items.map(item => ({ ...item, effectiveCoverage: stale || unresolved(state).length ? 'stale' : item.coverage })),
    unclassifiedChanges: unresolved(state), changes: state.changes,
  };
}

function persist(path, ledger, previous) {
  const temporary = `${path}.tmp`;
  let descriptor;
  let created = false;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    created = true;
    writeFileSync(descriptor, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    noSymlinks(dirname(path));
    const stat = optionalStat(path);
    requireThat(previous === null ? !stat : stat?.isFile() && !stat.isSymbolicLink()
      && stat.nlink === 1 && readFileSync(path, 'utf8') === previous,
    'Ledger changed while this writer was preparing its update. Reload status and retry with the current revision.', 'STALE_REVISION');
    if (previous === null) linkSync(temporary, path);
    else renameSync(temporary, path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (created && optionalStat(temporary)) unlinkSync(temporary);
  }
}

function writeLocked(path, operation) {
  const lock = `${path}.lock`;
  let descriptor;
  try {
    descriptor = openSync(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new RecoveryError('LOCKED', `Writer lock exists: ${lock}. Inspect it and confirm its writer stopped before removing exactly this lock; locks are never stolen automatically.`);
  }
  try {
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() })}\n`);
    closeSync(descriptor);
    descriptor = undefined;
    requireThat(!optionalStat(`${path}.tmp`),
      `Recovery temporary file already exists: ${path}.tmp. Inspect the interrupted write before removing exactly that file.`, 'TEMP_CONFLICT');
    return operation();
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    unlinkSync(lock);
  }
}

/**
 * Execute the same operation as the CLI. plan/event are parsed JSON objects;
 * revision is mandatory for next/sync and event.revision for record.
 */
export function recovery(command, options) {
  try {
    requireThat(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22 or newer is required.');
    choice(command, commands, 'command');
    const fields = ['repo', 'state', ...(command === 'init' ? ['plan'] : command === 'record' ? ['event']
      : ['next', 'sync'].includes(command) ? ['revision'] : [])];
    object(options, fields, 'options');
    const repo = consumerRoot(options.repo);
    const gitRoots = ['--absolute-git-dir', '--git-common-dir'].map(flag => realpathSync(resolve(repo,
      git(repo, ['rev-parse', flag]).trim())));
    const path = stateLocation(repo, options.state, gitRoots);
    if (command === 'init') {
      planSchema(options.plan);
      return writeLocked(path, () => {
        requireThat(!optionalStat(path), `State already exists: ${path}. Use status/resume or choose a new path; init never overwrites.`, 'STATE_EXISTS');
        const observed = snapshot(repo, options.plan.instructionPaths);
        requireThat(observed.dirty.length === 0, 'Initialize on an explicitly selected clean Git snapshot.', 'DIRTY_WORKTREE');
        const ledger = {
          schemaVersion: 1, repository: repo, createdAt: new Date().toISOString(),
          initial: { head: observed.head, procedure: observed.procedure },
          plan: structuredClone(options.plan), revision: 0, records: [],
        };
        const state = ledgerState(ledger);
        requireThat(same(observed, snapshot(repo, state.instructionPaths)), 'Repository/procedure changed during init; retry on a stable snapshot.', 'CONCURRENT_CHANGE');
        persist(path, ledger, null);
        return report(ledger, state, observed, 'initialized');
      });
    }
    const operation = () => {
      requireThat(optionalStat(path), `Ledger does not exist: ${path}. Initialize it with an explicit plan first.`, 'STATE_MISSING');
      const previous = readFileSync(path, 'utf8');
      const ledger = readJson(path);
      const state = ledgerState(ledger);
      requireThat(ledger.repository === repo, `Ledger belongs to ${ledger.repository}, not ${repo}. Use the original consumer root.`, 'WRONG_REPOSITORY');
      stateLocation(repo, path, [...gitRoots, ledger.initial.procedure.pluginRoot, state.checkpoint.procedure.pluginRoot]);
      const observed = snapshot(repo, state.instructionPaths);
      if (command === 'status') return report(ledger, state, observed, 'status');
      let event;
      let verification = null;
      let revision = options.revision;
      if (command === 'record') {
        requireThat(options.event && typeof options.event === 'object', '--event must contain a JSON event object.');
        ({ revision, ...event } = options.event);
        eventSchema(event);
      }
      integer(revision, 'expected revision');
      requireThat(revision === ledger.revision, `Stale revision ${revision}; current ledger revision is ${ledger.revision}. Reload status and reassess the intended event.`, 'STALE_REVISION');
      let action = 'recorded';
      if (command === 'next') {
        currentGate(state, observed, true);
        if (unresolved(state).length) return report(ledger, state, observed, 'paused');
        if (active(state)) return report(ledger, state, observed, 'resumed');
        if (state.items.every(item => item.coverage === 'closed')) return report(ledger, state, observed, 'complete');
        if (state.budget.spent >= state.budget.limit || !ready(state).length) {
          return report(ledger, state, observed, 'paused');
        }
        event = { type: 'start', itemId: ready(state)[0].id };
        action = 'selected';
      } else if (command === 'sync') {
        requireThat(observed.dirty.length === 0, 'sync requires a clean worktree; it binds committed Git evidence only.', 'DIRTY_WORKTREE');
        if (!drift(state, observed).head && !drift(state, observed).procedure) return report(ledger, state, observed, 'unchanged');
        event = { type: 'sync' };
        verification = { head: observed.head, procedure: observed.procedure, ...changesBetween(repo, state.checkpoint.head, observed.head) };
        action = 'synced';
      } else if (event.type === 'publish') {
        verification = verifyPublication(repo, state, observed, event);
      } else if (event.type === 'reassess') {
        verification = verifyReassessment(repo, state, observed, event);
      } else {
        currentGate(state, observed, event.type !== 'reopen');
      }
      applyEvent(state, event, verification, ledger.revision + 1);
      ledger.revision += 1;
      ledger.records.push({ revision: ledger.revision, at: new Date().toISOString(), event, verification });
      ledgerState(ledger);
      requireThat(same(observed, snapshot(repo, state.instructionPaths)),
        'Repository/procedure changed during this operation. State was not advanced; inspect status and retry.', 'CONCURRENT_CHANGE');
      persist(path, ledger, previous);
      return report(ledger, state, observed, action);
    };
    return command === 'status' ? operation() : writeLocked(path, operation);
  } catch (error) {
    if (error instanceof RecoveryError) throw error;
    if (typeof error.code === 'string') {
      throw new RecoveryError('IO_ERROR', `${error.code}: ${error.message}. Check the explicit paths and permissions; inspect status before retrying an interrupted write.`);
    }
    throw error;
  }
}

function cli(args) {
  const [command, ...flags] = args;
  choice(command, commands, 'command');
  const options = {};
  for (let index = 0; index < flags.length; index += 2) {
    const flag = flags[index];
    requireThat(['--repo', '--state', '--plan', '--event', '--revision'].includes(flag)
      && index + 1 < flags.length && !flags[index + 1].startsWith('--'),
    'Use --repo ABSOLUTE_ROOT --state ABSOLUTE_LEDGER, --plan FILE for init, --event FILE for record, and --revision INTEGER for next/sync.');
    const key = flag.slice(2);
    requireThat(!Object.hasOwn(options, key), `Duplicate option: ${flag}.`);
    options[key] = flags[index + 1];
  }
  for (const key of ['plan', 'event']) if (key in options) options[key] = readJson(options[key]);
  if ('revision' in options) {
    requireThat(/^(?:0|[1-9][0-9]*)$/.test(options.revision), '--revision must be a nonnegative integer.');
    options.revision = Number(options.revision);
  }
  return recovery(command, options);
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPoint && optionalStat(entryPoint) && realpathSync(entryPoint) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    console.log(JSON.stringify(cli(process.argv.slice(2))));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: error.code ?? 'INTERNAL_ERROR', message: error.message } }));
    process.exitCode = 1;
  }
}
