#!/usr/bin/env node
// Build one organization llms.txt index from per-repository docs/reuse/catalog.json files.
// Routing only: every note comes from a catalog field; the linked pages stay canonical.
import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const types = { library: 'Libraries', integration: 'Integrations' };
export const FLAT_INDEX_MAX_BYTES = 16 * 1024;
export const oneLine = (value, name) => {
  assert(typeof value === 'string' && value.trim() && !/[\r\n]/.test(value), `${name} must be one nonempty line`);
  return value.trim();
};

export function readCatalog({ checkout, link, revision }) {
  assert(typeof checkout === 'string' && typeof link === 'string' && typeof revision === 'string', 'Each repository needs checkout, link and revision');
  assert(!/[\s()<>]/.test(link), `Unsafe link base: ${link}`);
  const catalog = JSON.parse(readFileSync(join(checkout, 'docs', 'reuse', 'catalog.json'), 'utf8'));
  assert.equal(catalog.formatVersion, 1, 'Unsupported catalog format');
  const repository = oneLine(catalog.repository, 'repository');
  assert(Array.isArray(catalog.units) && catalog.units.length, `${repository} has no units`);
  const units = catalog.units.map(unit => {
    const id = oneLine(unit.id, 'id');
    assert(id.startsWith(`${repository}:`), `${id} does not belong to ${repository}`);
    assert(Object.hasOwn(types, unit.type), `${id}: unknown type ${unit.type}`);
    assert(typeof unit.page === 'string' && /^docs\/reuse\/[A-Za-z0-9._/-]+\.md$/.test(unit.page)
      && !unit.page.split('/').includes('..'), `${id}: unsafe page path`);
    const page = resolve(checkout, ...unit.page.split('/'));
    assert(existsSync(page) && lstatSync(page).isFile(), `${id}: page ${unit.page} is missing`);
    assert(unit.package === null || typeof unit.package === 'string', `${id}: package must be a string or null`);
    assert(Array.isArray(unit.keywords) && unit.keywords.every(item => typeof item === 'string'), `${id}: keywords`);
    return { id, type: unit.type, page: unit.page, summary: oneLine(unit.summary, `${id} summary`),
      status: oneLine(unit.status, `${id} status`), version: oneLine(unit.version, `${id} version`),
      package: unit.package, keywords: unit.keywords, area: unit.area };
  });
  return { repository, link, revision, units };
}

export function renderUnitLine(entry) {
  const release = entry.package ? `Package ${entry.package} ${entry.version}` : `Version ${entry.version}`;
  const keywords = entry.keywords.length ? `; keywords ${entry.keywords.join(', ')}` : '';
  return `- [${entry.id}](${entry.catalog.link}${entry.page}): ${entry.summary} ${release}; status ${entry.status}`
    + `${keywords}; source ${entry.catalog.repository} at ${entry.catalog.revision.slice(0, 12)}.`;
}

export function renderIndex(sources) {
  const title = oneLine(sources.title, 'title');
  assert(Array.isArray(sources.repositories) && sources.repositories.length, 'List at least one repository');
  const catalogs = sources.repositories.map(readCatalog), seen = new Set();
  for (const catalog of catalogs) {
    assert(!seen.has(catalog.repository), `Duplicate repository ${catalog.repository}`);
    seen.add(catalog.repository);
  }
  const entries = catalogs.flatMap(catalog => catalog.units.map(unit => ({ ...unit, catalog })))
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const lines = [`# ${title}`, '',
    '> Reusable libraries and existing integrations. Check this index before writing a new integration, API client, data extractor or shared utility.',
    '',
    'Generated from each repository\'s `docs/reuse/catalog.json`. The linked pages are canonical: open the relevant page before implementing; it states when not to use a unit.'];
  for (const [type, heading] of Object.entries(types)) {
    const items = entries.filter(entry => entry.type === type);
    if (!items.length) continue;
    lines.push('', `## ${heading}`, '');
    for (const entry of items) {
      lines.push(renderUnitLine(entry));
    }
  }
  lines.push('', '## Catalogs', '');
  for (const catalog of [...catalogs].sort((a, b) => a.repository.localeCompare(b.repository, 'en'))) {
    lines.push(`- [${catalog.repository}](${catalog.link}docs/reuse/catalog.json): Machine-readable catalog of ${catalog.repository} at ${catalog.revision.slice(0, 12)}.`);
  }
  const index = `${lines.join('\n')}\n`;
  return index;
}

export function buildIndex(sources, outputName = 'llms.txt') {
  const index = renderIndex(sources);
  const bytes = Buffer.byteLength(index, 'utf8');
  assert(bytes <= FLAT_INDEX_MAX_BYTES,
    `${outputName} is ${bytes} bytes; exceeds the ${FLAT_INDEX_MAX_BYTES}-byte flat index budget`);
  return index;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [config, output] = process.argv.slice(2);
    assert(config && output, 'Usage: reuse-index.mjs <sources.json> <output llms.txt>');
    writeFileSync(output, buildIndex(JSON.parse(readFileSync(config, 'utf8')), output));
    console.log(`Wrote ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
