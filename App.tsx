import React, { lazy, Suspense, useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import { BotLeaf } from './components/Botanicals';
import { TabView, BiomassDensity, ProjectTree, GrowthCoefficient, SpeciesInfo, RegionOption, ProjectMetadata, DbhUnit } from './types';
import { DATA_URLS } from './constants';
import { parseBiomassDensity, parseGrowthCoefficients, parseRegionalInfo } from './services/dataService';
import { buildSpeciesCatalog, hydrateSpeciesCatalogImages, loadSpeciesImageMap } from './services/speciesCatalog';
import { forecastTreeGrowth } from './services/carbonCalculator';

const STORAGE_KEY = 'treecarbonxray_v1';
const FALLBACK_DATA_URLS = {
  TS1_REGIONAL_INFO: new URL('./Data/TS1_Regional_information.csv', import.meta.url).href,
  TS6_GROWTH_COEFFICIENTS: new URL('./Data/TS6_Growth_coefficients.csv', import.meta.url).href,
  TS9_BIOMASS_DENSITY: new URL('./Data/TS9_Biomass_density_factors.csv', import.meta.url).href,
};

const Builder = lazy(() => import('./components/Calculator'));
const Report = lazy(() => import('./components/Dashboard'));
const Analytics = lazy(() => import('./components/Analytics'));

interface StoredState {
  projectTrees: ProjectTree[];
  horizon: number;
  selectedRegion: string;
  projectMetadata?: ProjectMetadata;
  dbhUnit?: DbhUnit;
}

const loadCsvWithFallback = async (primary: string, fallback: string, label: string): Promise<string> => {
  try {
    const r = await fetch(primary, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  } catch (error) {
    console.warn(`Primary ${label} load failed, using local fallback.`, error);
    const fr = await fetch(fallback, { cache: 'no-store' });
    if (!fr.ok) throw new Error(`Failed to load ${label} from both primary and fallback sources.`);
    return fr.text();
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('builder');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [densities, setDensities] = useState<BiomassDensity[]>([]);
  const [growthCoeffs, setGrowthCoeffs] = useState<GrowthCoefficient[]>([]);
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');

  const [projectTrees, setProjectTrees] = useState<ProjectTree[]>([]);
  const [horizon, setHorizon] = useState(20);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({
    name: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [dbhUnit, setDbhUnit] = useState<DbhUnit>('cm');
  const [needsReconcile, setNeedsReconcile] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed: StoredState = JSON.parse(saved);
      const valid = Array.isArray(parsed.projectTrees)
        ? parsed.projectTrees.filter(t => Array.isArray(t.forecastData) && t.forecastData.length > 0)
        : [];
      if (valid.length > 0) {
        setProjectTrees(valid);
        setNeedsReconcile(true);
      }
      if (typeof parsed.horizon === 'number') setHorizon(parsed.horizon);
      if (typeof parsed.selectedRegion === 'string') setSelectedRegion(parsed.selectedRegion);
      if (parsed.projectMetadata) setProjectMetadata(parsed.projectMetadata);
      if (parsed.dbhUnit === 'cm' || parsed.dbhUnit === 'in') setDbhUnit(parsed.dbhUnit);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const toSave: StoredState = { projectTrees, horizon, selectedRegion, projectMetadata, dbhUnit };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch { /* quota exceeded */ }
    }, 500);
    return () => clearTimeout(t);
  }, [projectTrees, horizon, selectedRegion, projectMetadata, dbhUnit]);

  useEffect(() => {
    if (!needsReconcile || densities.length === 0 || growthCoeffs.length === 0) return;
    setNeedsReconcile(false);
    setProjectTrees(prev => prev.map(tree => {
      const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        tree.speciesScientific, tree.initialDbh, horizon, densities, growthCoeffs, selectedRegion || undefined,
      );
      return {
        ...tree,
        modelConfidence,
        modelSourceScientific,
        forecastData: annualData,
        initialHeight: annualData[0]?.height ?? tree.initialHeight,
        currentCarbon: currentCarbon * tree.count,
      };
    }));
  }, [needsReconcile, densities, growthCoeffs, horizon, selectedRegion]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ts9Text, ts6Text, ts1Text, speciesImages] = await Promise.all([
          loadCsvWithFallback(DATA_URLS.TS9_BIOMASS_DENSITY, FALLBACK_DATA_URLS.TS9_BIOMASS_DENSITY, 'Density Data (TS9)'),
          loadCsvWithFallback(DATA_URLS.TS6_GROWTH_COEFFICIENTS, FALLBACK_DATA_URLS.TS6_GROWTH_COEFFICIENTS, 'Growth Data (TS6)'),
          loadCsvWithFallback(DATA_URLS.TS1_REGIONAL_INFO, FALLBACK_DATA_URLS.TS1_REGIONAL_INFO, 'Regional Data (TS1)'),
          loadSpeciesImageMap(),
        ]);

        const parsedDensities = parseBiomassDensity(ts9Text);
        const parsedGrowthCoeffs = parseGrowthCoefficients(ts6Text);
        setDensities(parsedDensities);
        setGrowthCoeffs(parsedGrowthCoeffs);

        const catalog = buildSpeciesCatalog(parsedDensities, parsedGrowthCoeffs, speciesImages);
        setSpeciesList(catalog);
        void hydrateSpeciesCatalogImages(catalog, speciesImages).then(setSpeciesList).catch(() => {});

        const rawRegions = parseRegionalInfo(ts1Text);
        setRegions(rawRegions.map(r => ({ code: r.regionCode, name: r.regionName, city: r.city, state: r.state })));

        setLoading(false);
      } catch (err) {
        console.error('Data Loading Error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred loading data.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const clearProject = () => {
    setProjectTrees([]);
    setProjectMetadata({ name: '', location: '', date: new Date().toISOString().split('T')[0] });
  };

  const TabLoader: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
      <BotLeaf size={32} style={{ color: 'var(--olive)' }}/>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>LOADING VIEW…</p>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 14 }}>
          <BotLeaf size={40} style={{ color: 'var(--olive)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          <div className="eyebrow">Loading model data</div>
          <p className="body" style={{ color: 'var(--ink-3)' }}>Fetching growth coefficients from USFS i-Tree dataset.</p>
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', textAlign: 'center', padding: 32 }}>
          <div className="eyebrow" style={{ color: 'var(--terracotta-deep)' }}>Error</div>
          <h2 className="serif" style={{ fontSize: 40, margin: '8px 0 12px', letterSpacing: '-0.02em' }}>Could not load data.</h2>
          <p className="body" style={{ maxWidth: 480 }}>{error}</p>
          <button className="btn" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'builder':
        return (
          <Suspense fallback={<TabLoader/>}>
            <Builder
              densities={densities} growthCoeffs={growthCoeffs}
              projectTrees={projectTrees} setProjectTrees={setProjectTrees}
              switchToDashboard={() => setActiveTab('dashboard')}
              speciesList={speciesList}
              regions={regions}
              selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}
              horizon={horizon} setHorizon={setHorizon}
              dbhUnit={dbhUnit} setDbhUnit={setDbhUnit}
            />
          </Suspense>
        );
      case 'dashboard':
        return (
          <Suspense fallback={<TabLoader/>}>
            <Report
              projectTrees={projectTrees}
              switchToBuilder={() => setActiveTab('builder')}
              projectMetadata={projectMetadata} setProjectMetadata={setProjectMetadata}
              horizon={horizon} dbhUnit={dbhUnit}
            />
          </Suspense>
        );
      case 'analytics':
        return (
          <Suspense fallback={<TabLoader/>}>
            <Analytics projectTrees={projectTrees} switchToBuilder={() => setActiveTab('builder')} horizon={horizon} dbhUnit={dbhUnit}/>
          </Suspense>
        );
    }
  };

  return (
    <>
      <TopNav
        activeTab={activeTab} setActiveTab={setActiveTab}
        projectTrees={projectTrees}
        onClearProject={clearProject}
        horizon={horizon} setHorizon={setHorizon}
        regions={regions}
        selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}
        dbhUnit={dbhUnit} setDbhUnit={setDbhUnit}
      />
      <main style={{ animation: 'fadeUp .4s ease' }} key={activeTab}>
        {renderContent()}
      </main>
      <footer style={{
        padding: 32, borderTop: '1px solid var(--stone)', marginTop: 40,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'var(--ink-3)', fontSize: 11,
      }} className="no-print">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <BotLeaf size={16} style={{ color: 'var(--olive)' }}/>
          <span className="mono" style={{ letterSpacing: '0.08em' }}>
            TREECARBONXRAY · USFS i-TREE TS6/TS9 DATASET
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span className="mono">{speciesList.length || 194} SPECIES</span>
          <span className="mono">{regions.length || 16} REGIONS</span>
          <span className="mono">OFFLINE-CAPABLE</span>
        </div>
      </footer>
    </>
  );
};

export default App;
