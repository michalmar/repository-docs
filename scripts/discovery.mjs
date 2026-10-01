import { createHash } from 'node:crypto';
import {
  closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectSource } from './recovery.mjs';

const pluginRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const viewIds = ['product-runtime', 'interfaces-consumers', 'state-effects', 'operation-dependencies'];
const dimensions = ['selection', 'outputs', 'state', 'failures', 'trust', 'compatibility', 'consumers', 'tests'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const limits = [
  'Ready covers only the declared selected questions; deferred and excluded surfaces remain unassessed.',
  'Anchors and traces establish structural references, not actual reading, exhaustive repository coverage, runtime behavior, or semantic truth.',
  'Review references and independence are caller declarations, not authenticated fresh context or final prose approval.',
];

class DiscoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
  }
}

function requireThat(condition, message, code = 'INVALID_INPUT') {
  if (!condition) throw new DiscoveryError(code, message);
}

function object(value, keys, label) {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object.`);
  requireThat(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label} requires exactly these fields: ${keys.join(', ')}.`);
}

function text(value, label, empty = false) {
  requireThat(typeof value === 'string' && (empty || value.trim().length > 0) && !value.includes('\0'),
    `${label} must be ${empty ? 'a string' : 'a nonempty string'} without NUL.`);
}

function id(value, label) {
  requireThat(typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value),
    `${label} must be a lowercase ID (letters, digits, hyphens; 1-80 characters).`);
}

function sha(value, label, commit = false) {
  requireThat(typeof value === 'string' && (commit ? /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/ : /^[a-f0-9]{64}$/).test(value),
    `${label} must be a full lowercase ${commit ? 'Git object ID' : 'SHA-256 digest'}.`);
}

function choice(value, values, label) {
  requireThat(values.includes(value), `${label} must be one of: ${values.join(', ')}.`);
}

function strings(value, label, minimum = 0, validate = text) {
  requireThat(Array.isArray(value) && value.length >= minimum, `${label} must be an array (minimum ${minimum}).`);
  for (const entry of value) validate(entry, label);
  requireThat(new Set(value).size === value.length, `${label} contains duplicate entries.`);
}

function keyed(value, keys, label, minimum = 0, key = 'id') {
  requireThat(Array.isArray(value) && value.length >= minimum, `${label} must be an array (minimum ${minimum}).`);
  const result = new Map();
  for (const entry of value) {
    object(entry, keys, label);
    id(entry[key], `${label}.${key}`);
    requireThat(!result.has(entry[key]), `${label} contains duplicate ${key}: ${entry[key]}.`);
    result.set(entry[key], entry);
  }
  return result;
}

function references(value, table, label, minimum = 0) {
  strings(value, label, minimum, id);
  for (const reference of value) requireThat(table.has(reference), `${label} refers to missing ID: ${reference}.`);
}

function optionalStat(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function inside(root, target) {
  const path = relative(root, target);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

function externalPath(value, source, label) {
  text(value, label);
  requireThat(isAbsolute(value), `${label} must be an explicit absolute JSON filename.`, 'UNSAFE_PATH');
  const target = resolve(value);
  const root = parse(target).root;
  let cursor = root;
  let stat;
  for (const part of relative(root, target).split(sep).filter(Boolean)) {
    requireThat(!/[<>:"|?*\x00-\x1f\x7f]/.test(part) && !/[. ]$/.test(part)
      && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    `${label} has a nonportable filesystem component: ${part}.`, 'UNSAFE_PATH');
    cursor = join(cursor, part);
    stat = lstatSync(cursor);
    requireThat(!stat.isSymbolicLink(), `${label} cannot use a symlink or junction: ${cursor}.`, 'UNSAFE_PATH');
  }
  requireThat(stat?.isFile() && stat.nlink === 1,
    `${label} must be a regular, non-hardlinked file: ${target}.`, 'UNSAFE_PATH');
  const path = realpathSync(target);
  for (const excluded of [source.repository, pluginRoot, ...source.gitRoots]) {
    requireThat(!inside(excluded, path),
      `${label} must be outside the consumer, plugin package, and Git metadata: ${excluded}.`, 'UNSAFE_PATH');
  }
  return { path, stat };
}

function readArtifact(value, source, label) {
  const { path, stat } = externalPath(value, source, label);
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor);
    requireThat(opened.isFile() && opened.nlink === 1 && opened.dev === stat.dev && opened.ino === stat.ino,
      `${label} changed identity while being opened. Retry with an immutable regular file.`, 'CONCURRENT_CHANGE');
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    requireThat(after.size === opened.size && after.mtimeMs === opened.mtimeMs,
      `${label} changed while being read. Retain immutable packet/review bytes and retry.`, 'CONCURRENT_CHANGE');
    return { path, bytes, stat: after, label };
  } finally {
    closeSync(descriptor);
  }
}

function json(artifact) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(artifact.bytes));
  } catch (error) {
    throw new DiscoveryError('INVALID_JSON', `${artifact.label} is not valid UTF-8 JSON: ${artifact.path}: ${error.message}.`);
  }
}

function unchanged(artifact, source) {
  const current = readArtifact(artifact.path, source, artifact.label);
  requireThat(current.bytes.equals(artifact.bytes) && current.stat.dev === artifact.stat.dev
    && current.stat.ino === artifact.stat.ino && current.stat.mtimeMs === artifact.stat.mtimeMs,
  `${artifact.label} changed during checking. Use immutable evidence files and repeat the review for new bytes.`, 'CONCURRENT_CHANGE');
}

function packetSchema(packet, blockers) {
  object(packet, ['schemaVersion', 'head', 'scope', 'audiences', 'evidence', 'views', 'surfaces', 'questions', 'traces'], 'packet');
  requireThat(packet.schemaVersion === 1, 'packet.schemaVersion must be 1.');
  sha(packet.head, 'packet.head', true);
  text(packet.scope, 'packet.scope');
  strings(packet.audiences, 'packet.audiences', 1);
  const evidence = keyed(packet.evidence, ['id', 'path', 'startLine', 'endLine', 'kind'], 'evidence', 1);
  const views = keyed(packet.views, ['id', 'status', 'evidenceIds', 'detail'], 'views');
  const surfaces = keyed(packet.surfaces,
    ['id', 'kind', 'summary', 'evidenceIds', 'disposition', 'questionIds', 'reason'], 'surfaces', 1);
  const questions = keyed(packet.questions,
    ['id', 'question', 'audiences', 'surfaceIds', 'traceIds', 'obligations'], 'questions', 1);
  const traces = keyed(packet.traces, ['id', 'questionId', 'steps'], 'traces');
  const anchors = new Set();
  for (const entry of evidence.values()) {
    text(entry.path, `evidence ${entry.id}.path`);
    requireThat(Number.isSafeInteger(entry.startLine) && entry.startLine > 0
      && Number.isSafeInteger(entry.endLine) && entry.endLine >= entry.startLine,
    `Evidence ${entry.id} needs positive inclusive ordered line numbers.`);
    choice(entry.kind, ['source', 'config', 'test', 'contract'], `evidence ${entry.id}.kind`);
    const anchor = JSON.stringify([entry.path, entry.startLine, entry.endLine]);
    requireThat(!anchors.has(anchor), `Evidence ${entry.id} aliases an existing path/line anchor; reuse its ID.`);
    anchors.add(anchor);
  }
  function support(entry, label, context, code) {
    choice(entry.status, ['supported', 'unavailable', 'not-applicable'], `${label}.status`);
    text(entry.detail, `${label}.detail`);
    references(entry.evidenceIds, evidence, `${label}.evidenceIds`, entry.status === 'unavailable' ? 0 : 1);
    if (entry.status === 'unavailable') blockers.push({ code, ...context, message: entry.detail });
  }
  requireThat(views.size === viewIds.length && viewIds.every(view => views.has(view)),
    `views must contain exactly one of each: ${viewIds.join(', ')}.`);
  for (const view of views.values()) support(view, `view ${view.id}`, { viewId: view.id }, 'VIEW_UNAVAILABLE');
  for (const surface of surfaces.values()) {
    choice(surface.kind, ['runtime', 'entry', 'consumer', 'state', 'dependency', 'configuration', 'authority', 'test'],
      `surface ${surface.id}.kind`);
    choice(surface.disposition, ['mapped', 'deferred', 'excluded', 'gap'], `surface ${surface.id}.disposition`);
    text(surface.summary, `surface ${surface.id}.summary`);
    text(surface.reason, `surface ${surface.id}.reason`, surface.disposition === 'mapped');
    references(surface.evidenceIds, evidence, `surface ${surface.id}.evidenceIds`, surface.disposition === 'mapped' ? 1 : 0);
    references(surface.questionIds, questions, `surface ${surface.id}.questionIds`, surface.disposition === 'mapped' ? 1 : 0);
    if (['deferred', 'excluded'].includes(surface.disposition)) {
      requireThat(surface.questionIds.length === 0, `Unassessed surface ${surface.id} cannot select questions; use mapped or gap.`);
    }
    if (surface.disposition === 'gap') blockers.push({
      code: 'SURFACE_GAP', surfaceId: surface.id, questionIds: surface.questionIds, message: surface.reason,
    });
  }
  for (const question of questions.values()) {
    text(question.question, `question ${question.id}.question`);
    strings(question.audiences, `question ${question.id}.audiences`, 1);
    requireThat(question.audiences.every(audience => packet.audiences.includes(audience)),
      `Question ${question.id} audiences must be declared in packet.audiences.`);
    references(question.surfaceIds, surfaces, `question ${question.id}.surfaceIds`, 1);
    requireThat(question.surfaceIds.some(surface => surfaces.get(surface).disposition === 'mapped'),
      `Question ${question.id} must select at least one mapped surface.`);
    for (const surfaceId of question.surfaceIds) {
      const surface = surfaces.get(surfaceId);
      requireThat(['mapped', 'gap'].includes(surface.disposition) && surface.questionIds.includes(question.id),
        `Question ${question.id} and selected surface ${surfaceId} must map reciprocally (mapped or gap).`);
    }
    references(question.traceIds, traces, `question ${question.id}.traceIds`);
    for (const traceId of question.traceIds) requireThat(traces.get(traceId).questionId === question.id,
      `Question ${question.id} cannot select trace ${traceId} owned by another question.`);
    if (!question.traceIds.length) blockers.push({
      code: 'TRACE_MISSING', questionId: question.id, message: 'The selected question has no concrete caller-to-consumer trace.',
    });
    const obligations = keyed(question.obligations,
      ['dimension', 'status', 'evidenceIds', 'detail'], `question ${question.id}.obligations`, 0, 'dimension');
    requireThat(obligations.size === dimensions.length && dimensions.every(dimension => obligations.has(dimension)),
      `Question ${question.id} needs exactly one obligation for each: ${dimensions.join(', ')}.`);
    for (const obligation of obligations.values()) support(obligation,
      `question ${question.id} obligation ${obligation.dimension}`,
      { questionId: question.id, dimension: obligation.dimension }, 'OBLIGATION_UNAVAILABLE');
  }
  for (const surface of surfaces.values()) {
    for (const questionId of surface.questionIds) requireThat(questions.get(questionId).surfaceIds.includes(surface.id),
      `Surface ${surface.id} and question ${questionId} must map reciprocally.`);
  }
  const traceSignatures = new Set();
  for (const trace of traces.values()) {
    id(trace.questionId, `trace ${trace.id}.questionId`);
    const question = questions.get(trace.questionId);
    requireThat(question?.traceIds.includes(trace.id), `Trace ${trace.id} must be selected by its existing question ${trace.questionId}.`);
    requireThat(Array.isArray(trace.steps), `Trace ${trace.id}.steps must be an array.`);
    const steps = new Set();
    const signatures = trace.steps.map(step => {
      object(step, ['role', 'surfaceId', 'evidenceIds', 'detail'], `trace ${trace.id} step`);
      choice(step.role, ['caller', 'selection', 'handler', 'effect', 'consumer'], `trace ${trace.id} step.role`);
      id(step.surfaceId, `trace ${trace.id} step.surfaceId`);
      requireThat(question.surfaceIds.includes(step.surfaceId),
        `Trace ${trace.id} step surface ${step.surfaceId} must belong to question ${question.id}.`);
      references(step.evidenceIds, evidence, `trace ${trace.id} step.evidenceIds`, 1);
      requireThat(step.evidenceIds.every(anchor => surfaces.get(step.surfaceId).evidenceIds.includes(anchor)),
        `Trace ${trace.id} step anchors must also be mapped by surface ${step.surfaceId}.`);
      text(step.detail, `trace ${trace.id} step.detail`);
      const signature = JSON.stringify([step.role, step.surfaceId, [...step.evidenceIds].sort()]);
      requireThat(!steps.has(signature), `Trace ${trace.id} contains a duplicate role/surface/anchor step.`);
      steps.add(signature);
      return signature;
    });
    const signature = JSON.stringify([question.id, signatures]);
    requireThat(!traceSignatures.has(signature), `Trace ${trace.id} duplicates another trace for question ${question.id}.`);
    traceSignatures.add(signature);
    const roles = trace.steps.map(step => step.role);
    if (roles[0] !== 'caller' || roles.at(-1) !== 'consumer'
      || !roles.includes('handler') || roles.indexOf('consumer') < roles.indexOf('handler')) {
      blockers.push({ code: 'TRACE_PARTIAL', questionId: question.id, traceId: trace.id,
        message: 'A complete trace starts with caller, contains handler before consumer, and ends with consumer; retain partial evidence as incomplete.' });
    }
  }
  return { evidence, questions };
}

function reviewSchema(review, packet, packetSha256, questions, blockers) {
  object(review, ['schemaVersion', 'head', 'packetSha256', 'reviewerRef', 'expectationsRef', 'reportRef',
    'advisory', 'independent', 'result', 'findings', 'unassessedQuestionIds'], 'review');
  requireThat(review.schemaVersion === 1, 'review.schemaVersion must be 1.');
  sha(review.head, 'review.head', true);
  sha(review.packetSha256, 'review.packetSha256');
  requireThat(review.head === packet.head && review.packetSha256 === packetSha256,
    'Review HEAD and SHA-256 must match this exact packet. Obtain a new review after packet or source changes.', 'STALE_REVIEW');
  for (const field of ['reviewerRef', 'expectationsRef', 'reportRef']) text(review[field], `review.${field}`);
  requireThat(review.advisory === true, 'review.advisory must be true; this is not authenticated approval.');
  requireThat(typeof review.independent === 'boolean', 'review.independent must be boolean.');
  choice(review.result, ['no-findings', 'findings', 'incomplete'], 'review.result');
  const findings = keyed(review.findings, ['id', 'description', 'material'], 'review.findings');
  for (const finding of findings.values()) {
    text(finding.description, `finding ${finding.id}.description`);
    requireThat(typeof finding.material === 'boolean', `Finding ${finding.id}.material must be boolean.`);
  }
  references(review.unassessedQuestionIds, questions, 'review.unassessedQuestionIds');
  requireThat(review.result !== 'no-findings' || (!findings.size && !review.unassessedQuestionIds.length),
    'A no-findings review requires empty findings and unassessedQuestionIds.');
  requireThat(review.result !== 'findings' || findings.size > 0, 'A findings review must name at least one finding.');
  if (!review.independent) blockers.push({
    code: 'REVIEW_NOT_INDEPENDENT', message: 'The declared review is not independent; obtain a separate source-first coverage review.',
  });
  if (review.result === 'incomplete') blockers.push({ code: 'REVIEW_INCOMPLETE', message: 'The coverage review declares incomplete assessment.' });
  for (const finding of findings.values()) blockers.push({
    code: 'REVIEW_FINDING', findingId: finding.id, material: finding.material, message: finding.description,
  });
  for (const questionId of review.unassessedQuestionIds) blockers.push({
    code: 'REVIEW_UNASSESSED', questionId, message: 'The coverage reviewer left this selected question unassessed.',
  });
}

/** Check explicit immutable JSON files against a clean local Git HEAD; never write or execute source. */
export function checkDiscovery(options) {
  try {
    requireThat(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22 or newer is required.');
    object(options, ['repo', 'packet', ...(options && Object.hasOwn(options, 'review') ? ['review'] : [])], 'options');
    const initial = inspectSource(options.repo, []);
    const packetFile = readArtifact(options.packet, initial, '--packet');
    const packet = json(packetFile);
    const blockers = [];
    const { evidence, questions } = packetSchema(packet, blockers);
    requireThat(packet.head === initial.head,
      'packet.head differs from the current clean HEAD. Rediscover the selected scope and review a new packet.', 'STALE_PACKET');
    const packetSha256 = hash(packetFile.bytes);
    const reviewFile = options.review === undefined ? null : readArtifact(options.review, initial, '--review');
    const review = reviewFile ? json(reviewFile) : null;
    if (reviewFile) reviewSchema(review, packet, packetSha256, questions, blockers);
    const incomplete = blockers.length > 0;
    if (!reviewFile) blockers.push({
      code: 'REVIEW_REQUIRED', message: 'Obtain an independent advisory coverage review of this exact packet before drafting.',
    });
    const source = inspectSource(initial.repository, [...new Set(packet.evidence.map(entry => entry.path))]);
    requireThat(source.head === initial.head, 'HEAD changed during discovery checking. Retry on a stable clean snapshot.', 'CONCURRENT_CHANGE');
    const files = new Map(source.files.map(file => [file.path, file]));
    for (const anchor of evidence.values()) requireThat(anchor.endLine <= files.get(anchor.path).lineCount,
      `Evidence ${anchor.id} ends at line ${anchor.endLine}, but ${anchor.path} has ${files.get(anchor.path).lineCount} committed lines.`, 'SOURCE_ERROR');
    unchanged(packetFile, source);
    if (reviewFile) unchanged(reviewFile, source);
    return {
      ok: true, outcome: incomplete ? 'incomplete' : reviewFile ? 'ready' : 'review-required',
      repository: source.repository, head: source.head, packetSha256, scope: packet.scope,
      audiences: packet.audiences, questionIds: [...questions.keys()], blockers,
      deferredSurfaceIds: packet.surfaces.filter(surface => surface.disposition === 'deferred').map(surface => surface.id),
      excludedSurfaceIds: packet.surfaces.filter(surface => surface.disposition === 'excluded').map(surface => surface.id),
      review: review ? Object.fromEntries(['result', 'advisory', 'independent', 'reviewerRef', 'expectationsRef', 'reportRef']
        .map(field => [field, review[field]])) : null,
      limits: [...limits],
    };
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    if (error?.name === 'RecoveryError') throw new DiscoveryError(error.code, error.message);
    if (typeof error?.code === 'string') throw new DiscoveryError('IO_ERROR',
      `${error.code}: ${error.message}. Check explicit file paths, repository availability, and permissions.`);
    throw new DiscoveryError('INTERNAL_ERROR', `Unexpected discovery check failure: ${error?.message ?? String(error)}. No coverage result was produced.`);
  }
}

function cli(args) {
  requireThat(args[0] === 'check', 'Use only: check --repo ABSOLUTE_ROOT --packet ABSOLUTE_FILE [--review ABSOLUTE_FILE].');
  const options = {};
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    requireThat(['--repo', '--packet', '--review'].includes(flag) && index + 1 < args.length && !args[index + 1].startsWith('--'),
      'Use --repo ABSOLUTE_ROOT --packet ABSOLUTE_FILE [--review ABSOLUTE_FILE]; each option takes one value.');
    const key = flag.slice(2);
    requireThat(!Object.hasOwn(options, key), `Duplicate option: ${flag}.`);
    options[key] = args[index + 1];
  }
  return checkDiscovery(options);
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPoint && optionalStat(entryPoint) && realpathSync(entryPoint) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const report = cli(process.argv.slice(2));
    console.log(JSON.stringify(report));
    process.exitCode = report.outcome === 'ready' ? 0 : 2;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: error.code ?? 'INTERNAL_ERROR', message: error.message } }));
    process.exitCode = 1;
  }
}
