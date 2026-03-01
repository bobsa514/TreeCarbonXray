import { BiomassDensity, GrowthCoefficient, SpeciesInfo } from '../types';

export type SpeciesImageMap = Record<string, string>;

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80';
const IMAGE_CACHE_KEY = 'treecarbonxray_species_images_v1';
const IMAGE_RESOLVE_CONCURRENCY = 6;
const WIKIPEDIA_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

type SpeciesImageEntry = {
  scientific?: string;
  common?: string;
  image?: string;
};

const normalizeKey = (value?: string): string => (value ? value.toLowerCase().trim() : '');

const parseValue = (raw: string): string => raw.replace(/^['"]|['"]$/g, '').trim();

const applyKeyValue = (line: string, target: SpeciesImageEntry) => {
  const separator = line.indexOf(':');
  if (separator === -1) return;

  const key = line.slice(0, separator).trim();
  const value = parseValue(line.slice(separator + 1).trim());
  if (!key) return;

  target[key as keyof SpeciesImageEntry] = value;
};

const parseSpeciesImageYaml = (yamlText: string): SpeciesImageEntry[] => {
  const lines = yamlText.split(/\r?\n/);
  const entries: SpeciesImageEntry[] = [];
  let current: SpeciesImageEntry | null = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    if (line.startsWith('species:')) return;

    if (line.startsWith('- ')) {
      if (current) entries.push(current);
      current = {};

      const inline = line.slice(2).trim();
      if (inline) applyKeyValue(inline, current);
      return;
    }

    if (current) applyKeyValue(line, current);
  });

  if (current) entries.push(current);
  return entries;
};

const isMeaningfulImage = (value?: string): value is string => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== 'todo';
};

const readImageCache = (): SpeciesImageMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(IMAGE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SpeciesImageMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeImageCache = (cache: SpeciesImageMap) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore write failures (private mode/quota).
  }
};

const normalizeSpeciesName = (value: string): string =>
  value
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildWikipediaCandidates = (scientificName: string, commonName: string): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (value?: string) => {
    if (!value) return;
    const normalized = normalizeSpeciesName(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(normalized);
  };

  const scientific = normalizeSpeciesName(scientificName);
  const scientificWords = scientific.split(/\s+/).filter(Boolean);

  push(scientific);
  if (scientificWords.length >= 2) {
    push(`${scientificWords[0]} ${scientificWords[1]}`);
  }
  if (scientificWords.length >= 1) {
    push(scientificWords[0]);
  }

  const strippedCultivar = scientific.replace(/'[^']+'/g, '').trim();
  if (strippedCultivar !== scientific) {
    push(strippedCultivar);
  }

  push(commonName);
  return candidates;
};

const fetchWikipediaThumbnail = async (title: string): Promise<string | null> => {
  try {
    const slug = encodeURIComponent(title.replace(/\s+/g, '_'));
    const response = await fetch(`${WIKIPEDIA_SUMMARY_API}/${slug}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = await response.json() as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      type?: string;
    };

    const imageUrl = data.thumbnail?.source || data.originalimage?.source;
    return isMeaningfulImage(imageUrl) ? imageUrl : null;
  } catch {
    return null;
  }
};

const resolveSpeciesImage = async (scientificName: string, commonName: string): Promise<string | null> => {
  const candidates = buildWikipediaCandidates(scientificName, commonName);
  for (const candidate of candidates) {
    const image = await fetchWikipediaThumbnail(candidate);
    if (image) return image;
  }
  return null;
};

export const loadSpeciesImageMap = async (): Promise<SpeciesImageMap> => {
  try {
    // Relative path keeps this working under /TreeCarbonXray/ on GitHub Pages.
    const response = await fetch('species-images.yaml');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const yamlText = await response.text();
    const entries = parseSpeciesImageYaml(yamlText);

    return entries.reduce<SpeciesImageMap>((acc, entry) => {
      if (!entry) return acc;

      const imageUrl = entry.image?.trim();
      if (!isMeaningfulImage(imageUrl)) return acc;

      const scientific = normalizeKey(entry.scientific);
      const common = normalizeKey(entry.common);

      if (scientific) acc[scientific] = imageUrl;
      if (common) acc[common] = imageUrl;

      return acc;
    }, {});
  } catch (err) {
    console.warn('Failed to load species image map; using fallback images.', err);
    return {};
  }
};

export const hydrateSpeciesCatalogImages = async (
  catalog: SpeciesInfo[],
  curatedImages: SpeciesImageMap = {}
): Promise<SpeciesInfo[]> => {
  if (catalog.length === 0) return catalog;

  const dynamicCache = readImageCache();
  const mergedCache: SpeciesImageMap = { ...dynamicCache };
  let cacheChanged = false;

  const keysToResolve = new Set<string>();
  const byScientific = new Map<string, number[]>();

  catalog.forEach((entry, index) => {
    const key = normalizeKey(entry.scientificName);
    if (!key) return;

    const indices = byScientific.get(key) || [];
    indices.push(index);
    byScientific.set(key, indices);

    if (entry.imageUrl === FALLBACK_IMAGE) {
      keysToResolve.add(key);
    }
  });

  if (keysToResolve.size === 0) return catalog;

  const updated = [...catalog];
  const queue = Array.from(keysToResolve);

  const applyImage = (key: string, imageUrl: string) => {
    const indices = byScientific.get(key);
    if (!indices) return;
    indices.forEach((index) => {
      updated[index] = { ...updated[index], imageUrl };
    });
  };

  const worker = async () => {
    while (queue.length > 0) {
      const key = queue.shift();
      if (!key) return;

      const sampleIndex = byScientific.get(key)?.[0];
      if (sampleIndex === undefined) continue;
      const species = updated[sampleIndex];
      const commonKey = normalizeKey(species.commonName);

      const curated = curatedImages[key] || curatedImages[commonKey];
      if (isMeaningfulImage(curated)) {
        applyImage(key, curated);
        continue;
      }

      const cached = mergedCache[key] || mergedCache[commonKey];
      if (isMeaningfulImage(cached)) {
        applyImage(key, cached);
        continue;
      }

      const resolved = await resolveSpeciesImage(species.scientificName, species.commonName);
      if (!resolved) continue;

      mergedCache[key] = resolved;
      if (commonKey) mergedCache[commonKey] = resolved;
      cacheChanged = true;
      applyImage(key, resolved);
    }
  };

  const workers = Array.from(
    { length: Math.min(IMAGE_RESOLVE_CONCURRENCY, queue.length) },
    () => worker()
  );
  await Promise.all(workers);

  if (cacheChanged) {
    writeImageCache(mergedCache);
  }

  return updated;
};

const resolveImageUrl = (
  images: SpeciesImageMap,
  scientificName: string,
  commonName: string
): string => {
  const normalizedScientific = normalizeKey(scientificName);
  const normalizedCommon = normalizeKey(commonName);

  return (
    images[normalizedScientific] ||
    images[normalizedCommon] ||
    FALLBACK_IMAGE
  );
};

/**
 * Build a catalog of species from biomass density and growth coefficient tables.
 * Each entry includes scientific/common names and an image to display in the picker.
 */
export const buildSpeciesCatalog = (
  densities: BiomassDensity[],
  growthCoeffs: GrowthCoefficient[],
  speciesImages: SpeciesImageMap = {}
): SpeciesInfo[] => {
  const catalog = new Map<string, SpeciesInfo>();

  const addSpecies = (scientificName: string, commonName?: string) => {
    if (!scientificName) return;

    const key = scientificName.toLowerCase().trim();
    if (catalog.has(key)) {
      const existing = catalog.get(key)!;
      if (!existing.commonName && commonName) {
        catalog.set(key, { ...existing, commonName: commonName.trim() });
      }
      return;
    }

    const normalizedCommon = (commonName || scientificName).trim();
    const imageUrl = resolveImageUrl(speciesImages, scientificName, normalizedCommon);

    catalog.set(key, {
      scientificName: scientificName.trim(),
      commonName: normalizedCommon,
      imageUrl,
    });
  };

  densities.forEach((d) => addSpecies(d.scientificName, d.commonName));
  growthCoeffs.forEach((g) => addSpecies(g.scientificName));

  // Add a stable fallback image in case a request fails to resolve.
  return Array.from(catalog.values())
    .map((entry) => ({ ...entry, imageUrl: entry.imageUrl || FALLBACK_IMAGE }))
    .sort((a, b) => a.scientificName.localeCompare(b.scientificName));
};

export const getSpeciesLabel = (species: SpeciesInfo): string => {
  const common = species.commonName && species.commonName !== species.scientificName;
  return common
    ? `${species.commonName} (${species.scientificName})`
    : species.scientificName;
};
