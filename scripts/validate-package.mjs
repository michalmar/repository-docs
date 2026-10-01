import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const schemaUrl = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const procedures = [
  'skills/docs-bootstrap/SKILL.md',
  'skills/docs-update/SKILL.md',
  'com.github.copilot/agents/documentation-reviewer.agent.md',
  'com.github.copilot/agents/repository-discovery.agent.md',
  'skills/reuse-setup/SKILL.md',
  'skills/reuse-index/SKILL.md',
];

export function validateManifest(manifest) {
  assert.equal(manifest.$schema, schemaUrl, 'Use the canonical Agent Plugins 1.0 schema');
  const strings = ['name', 'version', 'description', 'homepage', 'repository', 'license'];
  const allowed = ['$schema', ...strings, 'author', 'keywords', 'extensions'];
  for (const key of Object.keys(manifest)) {
    assert.ok(allowed.includes(key), `Unsupported manifest field: ${key}`);
  }
  for (const key of strings) {
    if (key in manifest) assert.equal(typeof manifest[key], 'string', `${key} must be a string`);
  }
  assert.equal(typeof manifest.name, 'string');
  assert.ok(manifest.name.length <= 64 && /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(manifest.name),
    'Invalid plugin name');
  if ('author' in manifest) {
    assert.ok(manifest.author && typeof manifest.author === 'object' && !Array.isArray(manifest.author));
    for (const [key, value] of Object.entries(manifest.author)) {
      assert.ok(['name', 'email', 'url'].includes(key), `Unsupported author field: ${key}`);
      assert.equal(typeof value, 'string');
    }
  }
  if ('keywords' in manifest) {
    assert.ok(Array.isArray(manifest.keywords) && manifest.keywords.every(value => typeof value === 'string'));
  }
  if ('extensions' in manifest) {
    assert.ok(manifest.extensions && typeof manifest.extensions === 'object' && !Array.isArray(manifest.extensions));
    for (const value of Object.values(manifest.extensions)) {
      assert.ok(value && typeof value === 'object' && !Array.isArray(value));
    }
  }
}

// This package deliberately uses single-line JSON values, a small YAML subset.
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(match, 'Missing frontmatter');
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z-]+): (.+)$/.exec(line);
    assert.ok(field, `Unsupported frontmatter syntax: ${line}`);
    assert.ok(!(field[1] in fields), `Duplicate frontmatter field: ${field[1]}`);
    fields[field[1]] = JSON.parse(field[2]);
  }
  return fields;
}

export function validateProcedure(text, name, readOnlyAgent = false) {
  const fields = frontmatter(text);
  assert.deepEqual(Object.keys(fields).sort(),
    (readOnlyAgent ? ['name', 'description', 'tools'] : ['name', 'description', 'compatibility']).sort());
  assert.equal(fields.name, name);
  assert.equal(typeof fields.description, 'string');
  assert.ok(fields.description.length > 0 && fields.description.length <= 1024);
  if (readOnlyAgent) {
    assert.deepEqual(fields.tools, ['read', 'search'], 'Read-only agents must have only documented read/search aliases');
  } else {
    assert.equal(typeof fields.compatibility, 'string');
    assert.ok(fields.compatibility.length > 0 && fields.compatibility.length <= 500);
    assert.ok(text.split('\n').length < 500);
  }
  const reference = name === 'reuse-setup'
    ? '../../references/reuse-index.md' : '../../references/documentation-policy.md';
  assert.ok(text.includes(reference), `Required reference pointer is missing: ${reference}`);
}

export function resolveResource(root, sourceFile, target) {
  const resource = resolve(dirname(sourceFile), target);
  const pathWithinRoot = relative(realpathSync(root), realpathSync(resource));
  assert.ok(pathWithinRoot !== '..' && !pathWithinRoot.startsWith(`..${sep}`) && !isAbsolute(pathWithinRoot),
    `Resource escapes package: ${target}`);
  return resource;
}

export function localLinkTargets(text) {
  const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t\r]*$/gm, '')
    .replace(/(`+).*?\1/g, '');
  return [...prose.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)]
    .map(match => match[1].split('#')[0])
    .filter(target => target && !/^[a-z][a-z0-9+.-]*:/i.test(target));
}

function markdownFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.stage1-test-')) continue;
    const path = join(root, entry.name);
    assert.ok(!lstatSync(path).isSymbolicLink(), `Unexpected symlink in package: ${path}`);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

export function validatePackage(root = packageRoot) {
  const manifest = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8'));
  validateManifest(manifest);
  assert.equal(manifest.name, 'repository-docs');
  assert.equal(manifest.version, '0.6.0');
  assert.equal(manifest.license, 'MIT', 'The package is MIT licensed');
  assert.deepEqual(readdirSync(join(root, 'skills')).sort(),
    ['docs-bootstrap', 'docs-update', 'reuse-index', 'reuse-setup']);
  assert.deepEqual(readdirSync(join(root, 'com.github.copilot', 'agents')).sort(),
    ['documentation-reviewer.agent.md', 'repository-discovery.agent.md']);
  for (const path of [
    'mcp.json', '.mcp.json', 'hooks.json', 'agents',
    'com.github.copilot/hooks', 'com.github.copilot/rules',
    'com.github.copilot/commands', 'com.github.copilot/lsp.json',
  ]) {
    assert.ok(!existsSync(join(root, path)), `Out-of-scope runtime component: ${path}`);
  }
  for (const [index, procedure] of procedures.entries()) {
    const name = ['docs-bootstrap', 'docs-update', 'documentation-reviewer', 'repository-discovery',
      'reuse-setup', 'reuse-index'][index];
    validateProcedure(readFileSync(join(root, procedure), 'utf8'), name, index === 2 || index === 3);
  }
  for (const path of [
    'references/documentation-policy.md', 'templates/interface-contract.md',
    'templates/project-policy.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md',
    'references/repository-discovery.md', 'references/documentation-unit.md',
    'references/documentation-rounds.md',
    'references/recovery-workflow.md', 'references/recovery-ledger.md',
    'templates/architecture-overview.md', 'templates/recovery-plan.json',
    'scripts/recovery.mjs', 'scripts/discovery.mjs',
    'references/discovery-packet.md', 'templates/discovery-packet.json',
    'templates/discovery-review.json',
    'references/discovery-breadth.md', 'references/discovery-steering.md',
    'references/discovery-map-review.md',
    'templates/discovery-report.md',
    'references/reuse-workflow.md', 'templates/reuse-page.md', 'templates/reuse-catalog.json',
    'templates/reuse-index-manifest.json', 'templates/reuse-index-areas.json',
    'references/reuse-index.md', 'scripts/reuse-index.mjs', 'scripts/reuse.mjs',
  ]) {
    assert.ok(lstatSync(join(root, path)).isFile(), `Required file missing: ${path}`);
  }
  const map = JSON.parse(readFileSync(join(root, 'templates', 'documentation-map.json'), 'utf8'));
  assert.equal(map.formatVersion, 1);
  assert.equal(map.documents.length, 1);
  assert.deepEqual(Object.keys(map.documents[0]).sort(), ['id', 'owner', 'path', 'sources', 'tests']);
  const plan = JSON.parse(readFileSync(join(root, 'templates', 'recovery-plan.json'), 'utf8'));
  assert.ok(plan && typeof plan === 'object' && !Array.isArray(plan), 'Recovery plan must be a JSON object');
  for (const name of ['discovery-packet.json', 'discovery-review.json']) {
    const template = JSON.parse(readFileSync(join(root, 'templates', name), 'utf8'));
    assert.equal(template.schemaVersion, 1, `${name} must use discovery schema version 1`);
  }
  let links = 0;
  for (const file of markdownFiles(root)) {
    const text = readFileSync(file, 'utf8');
    for (const target of localLinkTargets(text)) {
      resolveResource(root, file, decodeURIComponent(target));
      links += 1;
    }
  }
  return { procedures: procedures.length, localFileLinks: links };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePackage();
  console.log(`Package checks passed: ${result.procedures} procedures, ${result.localFileLinks} local file links.`);
  console.log('Static package profile only; not client loading, semantic review, or lifecycle certification.');
}
