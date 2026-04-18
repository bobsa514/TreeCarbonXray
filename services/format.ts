export const fmt = {
  kg: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  kg1: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }),
  t2: (v: number) => (v / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }),
  pct: (v: number) => `${Math.round(v)}%`,
  num: (v: number) => v.toLocaleString(),
};

export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;

export const fmtDbh = (dbh: number, unit: 'cm' | 'in'): string =>
  unit === 'in' ? `${cmToIn(dbh).toFixed(1)} in` : `${dbh.toFixed(1)} cm`;
