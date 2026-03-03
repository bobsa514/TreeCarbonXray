import { ProjectTree, ProjectMetadata } from '../types';

const escapeCsv = (value: string | number): string => {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportInventoryToCsv = (
  trees: ProjectTree[],
  metadata: ProjectMetadata,
  horizon: number
): void => {
  const headers = [
    'Species (Common)',
    'Species (Scientific)',
    'Count',
    'Initial DBH (cm)',
    'Initial Height (m)',
    'Current Carbon (kg CO2)',
    `Projected Carbon at ${horizon} yrs (kg CO2)`,
    'Model Confidence',
    'Model Source',
  ];

  const rows = trees.map((t) => {
    const projected = t.forecastData[t.forecastData.length - 1];
    return [
      t.speciesCommon,
      t.speciesScientific,
      t.count,
      t.initialDbh,
      t.initialHeight.toFixed(2),
      t.currentCarbon.toFixed(2),
      (projected.carbonStorage * t.count).toFixed(2),
      t.modelConfidence,
      t.modelSourceScientific,
    ].map(escapeCsv);
  });

  const projectLine = `# ${metadata.name || 'Tree Carbon Inventory'} — ${metadata.location || ''} — ${metadata.date}`;
  const csv = [projectLine, headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');

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
