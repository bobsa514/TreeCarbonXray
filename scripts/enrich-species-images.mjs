#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const WIKIPEDIA_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIPEDIA_SEARCH_API = 'https://en.wikipedia.org/w/api.php';
const DEFAULT_CONCURRENCY = 4;
const YAML_PATH = path.resolve(process.cwd(), 'public/species-images.yaml');

const args = process.argv.slice(2);
const options = {
  write: args.includes('--write'),
  limit: Number.parseInt(readArgValue(args, '--limit') || '0', 10) || 0,
  concurrency: Number.parseInt(readArgValue(args, '--concurrency') || `${DEFAULT_CONCURRENCY}`, 10) || DEFAULT_CONCURRENCY,
};

function readArgValue(argv, key) {
  const index = argv.findIndex((arg) => arg === key);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function parseQuotedValue(line) {
  const separator = line.indexOf(':');
  if (separator === -1) return '';
  return line
    .slice(separator + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function normalizeSpeciesName(value) {
  return value
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCandidates(scientificName, commonName) {
  const candidates = [];
  const seen = new Set();

  const push = (value) => {
    if (!value) return;
    const normalized = normalizeSpeciesName(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(normalized);
  };

  const scientific = normalizeSpeciesName(scientificName);
  const parts = scientific.split(/\s+/).filter(Boolean);

  push(scientific);
  if (parts.length >= 2) push(`${parts[0]} ${parts[1]}`);
  if (parts.length >= 1) push(parts[0]);

  const withoutCultivar = scientific.replace(/'[^']+'/g, '').trim();
  if (withoutCultivar !== scientific) {
    push(withoutCultivar);
  }

  push(commonName);
  return candidates;
}

async function fetchWikipediaImage(title) {
  const slug = encodeURIComponent(title.replace(/\s+/g, '_'));
  const response = await fetch(`${WIKIPEDIA_SUMMARY_API}/${slug}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.thumbnail?.source || data.originalimage?.source || null;
}

async function searchWikipediaTitle(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '1',
    format: 'json',
  });
  const response = await fetch(`${WIKIPEDIA_SEARCH_API}?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data?.query?.search?.[0]?.title || null;
}

async function resolveSpeciesImage(scientificName, commonName) {
  const candidates = buildCandidates(scientificName, commonName);
  const triedTitles = new Set();

  const tryTitle = async (title) => {
    if (!title) return null;
    const key = title.toLowerCase();
    if (triedTitles.has(key)) return null;
    triedTitles.add(key);
    return fetchWikipediaImage(title);
  };

  for (const candidate of candidates) {
    try {
      const direct = await tryTitle(candidate);
      if (direct) return direct;

      const searchedTitle = await searchWikipediaTitle(candidate);
      const searched = await tryTitle(searchedTitle);
      if (searched) return searched;
    } catch {
      // Ignore this candidate and continue.
    }
  }
  return null;
}

function parseEntries(lines) {
  const entries = [];
  let current = null;

  const pushCurrent = () => {
    if (current?.scientificName) entries.push(current);
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === 'species:') return;

    if (trimmed.startsWith('- scientific:')) {
      pushCurrent();
      current = {
        scientificName: parseQuotedValue(trimmed.replace(/^- /, '')),
        commonName: '',
        image: '',
        imageLineIndex: -1,
      };
      return;
    }

    if (!current) return;
    if (trimmed.startsWith('scientific:')) {
      current.scientificName = parseQuotedValue(trimmed);
      return;
    }
    if (trimmed.startsWith('common:')) {
      current.commonName = parseQuotedValue(trimmed);
      return;
    }
    if (trimmed.startsWith('image:')) {
      current.image = parseQuotedValue(trimmed);
      current.imageLineIndex = index;
    }
  });

  pushCurrent();
  return entries;
}

function isMissingImage(value) {
  const normalized = (value || '').toLowerCase().trim();
  return !normalized || normalized === 'todo';
}

async function runWithConcurrency(items, worker, concurrency) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const yamlText = await fs.readFile(YAML_PATH, 'utf8');
  const lines = yamlText.split(/\r?\n/);
  const entries = parseEntries(lines);

  const pending = entries.filter((entry) => isMissingImage(entry.image));
  const targets = options.limit > 0 ? pending.slice(0, options.limit) : pending;

  let resolved = 0;
  let unresolved = 0;

  await runWithConcurrency(
    targets,
    async (entry) => {
      if (entry.imageLineIndex < 0) return;
      const image = await resolveSpeciesImage(entry.scientificName, entry.commonName);
      if (!image) {
        unresolved += 1;
        return;
      }

      const originalLine = lines[entry.imageLineIndex] || '    image: "TODO"';
      const indentMatch = originalLine.match(/^(\s*)image:/);
      const indent = indentMatch ? indentMatch[1] : '    ';
      lines[entry.imageLineIndex] = `${indent}image: "${image}"`;
      resolved += 1;
    },
    Math.max(1, options.concurrency)
  );

  const output = lines.join('\n');
  if (options.write) {
    await fs.writeFile(YAML_PATH, output, 'utf8');
  }

  const mode = options.write ? 'write' : 'dry-run';
  console.log(`[${mode}] total entries: ${entries.length}`);
  console.log(`[${mode}] missing image entries scanned: ${targets.length}`);
  console.log(`[${mode}] resolved: ${resolved}`);
  console.log(`[${mode}] unresolved: ${unresolved}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
