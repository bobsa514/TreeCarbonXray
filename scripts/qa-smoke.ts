import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBiomassDensity, parseGrowthCoefficients, parseRegionalInfo } from '../services/dataService.ts';
import { forecastTreeGrowth } from '../services/carbonCalculator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const loadData = async () => {
  const [ts1, ts6, ts9] = await Promise.all([
    readFile(path.join(rootDir, 'Data/TS1_Regional_information.csv'), 'utf8'),
    readFile(path.join(rootDir, 'Data/TS6_Growth_coefficients.csv'), 'utf8'),
    readFile(path.join(rootDir, 'Data/TS9_Biomass_density_factors.csv'), 'utf8'),
  ]);

  return {
    regions: parseRegionalInfo(ts1),
    growth: parseGrowthCoefficients(ts6),
    density: parseBiomassDensity(ts9),
  };
};

const assertForecastHealth = (species: string, expectedConfidence: 'exact' | 'genus' | 'proxy') => {
  return ({ growth, density }: Awaited<ReturnType<typeof loadData>>) => {
    const result = forecastTreeGrowth(species, 20, 20, density, growth);
    assert.equal(result.modelConfidence, expectedConfidence, `${species} confidence mismatch`);
    assert.equal(result.annualData.length, 21, `${species} should produce horizon + 1 data points`);
    assert.ok(result.currentCarbon > 0, `${species} current carbon should be positive`);

    result.annualData.forEach((row, index) => {
      assert.ok(Number.isFinite(row.carbonStorage), `${species} carbonStorage must be finite`);
      assert.ok(row.carbonStorage >= 0, `${species} carbonStorage must be non-negative`);
      assert.ok(row.annualSequestration >= 0, `${species} annualSequestration must be non-negative`);
      if (index > 0) {
        assert.ok(row.age >= result.annualData[index - 1].age, `${species} age must be non-decreasing`);
      }
    });
  };
};

const main = async () => {
  const data = await loadData();
  assert.ok(data.regions.length >= 10, 'TS1 parse unexpectedly small');
  assert.ok(data.growth.length > 1000, 'TS6 parse unexpectedly small');
  assert.ok(data.density.length > 100, 'TS9 parse unexpectedly small');

  assertForecastHealth('Acer rubrum', 'exact')(data);
  assertForecastHealth('Acer unknownus', 'genus')(data);
  assertForecastHealth('Completely unknown species', 'proxy')(data);

  console.log('Smoke tests passed: parsers + forecast confidence + forecast shape');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
