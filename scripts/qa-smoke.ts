import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBiomassDensity, parseGrowthCoefficients, parseRegionalInfo } from '../services/dataService.ts';
import { forecastTreeGrowth, solveEquation } from '../services/carbonCalculator.ts';

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

// --- Regional forecast helper (exercises region-specific equation types) ---
const assertRegionalForecast = (data: Awaited<ReturnType<typeof loadData>>, species: string, region: string, expectedConfidence: 'exact' | 'genus' | 'proxy') => {
  const result = forecastTreeGrowth(species, 20, 20, data.density, data.growth, region);
  assert.equal(result.modelConfidence, expectedConfidence, `${species}@${region} confidence mismatch`);
  assert.equal(result.annualData.length, 21, `${species}@${region} should produce horizon + 1 data points`);
  assert.ok(result.currentCarbon > 0, `${species}@${region} current carbon should be positive`);
  result.annualData.forEach((row, index) => {
    assert.ok(Number.isFinite(row.carbonStorage), `${species}@${region} carbonStorage must be finite`);
    assert.ok(row.carbonStorage >= 0, `${species}@${region} carbonStorage must be non-negative`);
    if (index > 0) {
      assert.ok(row.age >= result.annualData[index - 1].age, `${species}@${region} age must be non-decreasing`);
    }
  });
};

// --- Direct solveEquation regression tests for new equation types ---
const testQuartEquation = () => {
  const coeffs = { a: -0.163, b: 0.783, c: 0.00079, d: -0.00015, e: 9.06e-7, mse: 0 };
  const x = 15;
  const result = solveEquation('quart', x, coeffs as any);
  const expected = -0.163 + 0.783*15 + 0.00079*225 + (-0.00015)*3375 + 9.06e-7*50625;
  assert.ok(Math.abs(result - expected) < 0.01, `quart: got ${result}, expected ~${expected.toFixed(4)}`);
};

const testLoglogw4Equation = () => {
  const coeffs = { a: 1.5, b: 2.0, c: 0, d: 0, e: 0, mse: 0.1 };
  const x = 10;
  const result = solveEquation('loglogw4', x, coeffs as any);
  const expected = Math.exp(1.5 + 2.0 * Math.log(Math.log(10 + 1)) + (100 * 0.1 / 2));
  assert.ok(Math.abs(result - expected) < 0.01, `loglogw4: got ${result}, expected ~${expected.toFixed(4)}`);
};

const testExpow2Equation = () => {
  const coeffs = { a: 1.0, b: 0.05, c: 0, d: 0, e: 0, mse: 0.2 };
  const x = 20;
  const result = solveEquation('expow2', x, coeffs as any);
  const expected = Math.exp(1.0 + 0.05*20 + Math.sqrt(20) * 0.1);
  assert.ok(Math.abs(result - expected) < 0.01, `expow2: got ${result}, expected ~${expected.toFixed(4)}`);
};

const testExpow3Equation = () => {
  const coeffs = { a: 1.0, b: 0.05, c: 0, d: 0, e: 0, mse: 0.2 };
  const x = 20;
  const result = solveEquation('expow3', x, coeffs as any);
  const expected = Math.exp(1.0 + 0.05*20 + 20 * 0.1);
  assert.ok(Math.abs(result - expected) < 0.01, `expow3: got ${result}, expected ~${expected.toFixed(4)}`);
};

const testExpow4Equation = () => {
  const coeffs = { a: 1.0, b: 0.05, c: 0, d: 0, e: 0, mse: 0.2 };
  const x = 5;
  const result = solveEquation('expow4', x, coeffs as any);
  const expected = Math.exp(1.0 + 0.05*5 + 25 * 0.1);
  assert.ok(Math.abs(result - expected) < 0.01, `expow4: got ${result}, expected ~${expected.toFixed(4)}`);
};

const main = async () => {
  const data = await loadData();
  assert.ok(data.regions.length >= 10, 'TS1 parse unexpectedly small');
  assert.ok(data.growth.length > 1000, 'TS6 parse unexpectedly small');
  assert.ok(data.density.length > 100, 'TS9 parse unexpectedly small');

  assertForecastHealth('Acer rubrum', 'exact')(data);
  assertForecastHealth('Acer unknownus', 'genus')(data);
  assertForecastHealth('Completely unknown species', 'proxy')(data);

  // Direct equation regression tests (TDD: should fail before implementation)
  testQuartEquation();
  testLoglogw4Equation();
  testExpow2Equation();
  testExpow3Equation();
  testExpow4Equation();
  console.log('  Direct equation tests passed: quart, loglogw4, expow2, expow3, expow4');

  // Regional forecast tests exercising new equation types
  assertRegionalForecast(data, 'Washingtonia robusta', 'InlEmp', 'exact');   // quart: height eq
  assertRegionalForecast(data, 'Celtis sinensis', 'InlVal', 'exact');        // loglogw4: multiple eqs
  assertRegionalForecast(data, 'Pinus edulis', 'InterW', 'exact');            // expow4: age eq
  assertRegionalForecast(data, 'Malus spp.', 'TpIntW', 'exact');              // expow3: age eq
  console.log('  Regional forecast tests passed: quart, loglogw4, expow4, expow3 species');

  console.log('Smoke tests passed: parsers + forecast confidence + forecast shape + equation types');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
