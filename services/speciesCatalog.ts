import { BiomassDensity, GrowthCoefficient, SpeciesInfo } from '../types';

// Curated overrides for species where we want a specific photo.
const IMAGE_OVERRIDES: Record<string, string> = {
  'acer palmatum': 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Acer_palmatum0.jpg',
};

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80';

const signatureFromString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000);
};

/**
 * Build a catalog of species from biomass density and growth coefficient tables.
 * Each entry includes scientific/common names and an image to display in the picker.
 */
export const buildSpeciesCatalog = (
  densities: BiomassDensity[],
  growthCoeffs: GrowthCoefficient[]
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
    const seed = encodeURIComponent(`${key}-${normalizedCommon.toLowerCase().replace(/\s+/g, '-')}`);
    const imageUrl =
      IMAGE_OVERRIDES[key] ||
      // Use Picsum with a deterministic, human-readable seed so each species gets a distinct image without repetition.
      `https://picsum.photos/seed/${seed}/480/320`;

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
