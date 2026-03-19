import { ModelConfidence, ProjectTree, ProjectMetadata, DbhUnit } from '../types';

const escapeCsv = (value: string | number): string => {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const confidenceNote = (confidence: ModelConfidence, source: string): string => {
  switch (confidence) {
    case 'exact':
      return 'Species-specific USFS i-Tree coefficients (~10–20% uncertainty)';
    case 'genus':
      return `Genus-level coefficients from ${source} (~20–40% uncertainty)`;
    case 'proxy':
      return `Proxy: ${source} model used — species not in USFS database (~40–60% uncertainty)`;
  }
};

export const exportInventoryToCsv = (
  trees: ProjectTree[],
  metadata: ProjectMetadata,
  _horizon: number, // kept for call-site compatibility; year columns derived from forecastData
  dbhUnit: DbhUnit = 'cm'
): void => {
  const fromCm = (val: number): string =>
    dbhUnit === 'in' ? (val / 2.54).toFixed(1) : String(val);

  // Build year columns from the first tree's forecast length
  const forecastYears = trees.length > 0 ? trees[0].forecastData.length : 0;
  const yearHeaders = Array.from({ length: forecastYears }, (_, i) => `Year ${i} CO2 (kg)`);

  const headers = [
    'Species (Common)',
    'Species (Scientific)',
    'Count',
    `Initial DBH (${dbhUnit})`,
    'Initial Height (m)',
    'Model Confidence',
    'Model Source',
    'Model Note',
    ...yearHeaders,
  ];

  const rows = trees.map((t) => {
    const yearValues = t.forecastData.map(fd =>
      (fd.carbonStorage * t.count).toFixed(2)
    );
    return [
      t.speciesCommon,
      t.speciesScientific,
      t.count,
      fromCm(t.initialDbh),
      t.initialHeight.toFixed(2),
      t.modelConfidence,
      t.modelSourceScientific,
      confidenceNote(t.modelConfidence, t.modelSourceScientific),
      ...yearValues,
    ].map(escapeCsv);
  });

  const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tree-carbon-inventory-${metadata.date || 'export'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
