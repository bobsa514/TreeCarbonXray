
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import Analytics from './components/Analytics';
import { TabView, BiomassDensity, ProjectTree, GrowthCoefficient, SpeciesInfo, RegionOption } from './types';
import { DATA_URLS } from './constants';
import { parseBiomassDensity, parseGrowthCoefficients, parseRegionalInfo } from './services/dataService';
import { buildSpeciesCatalog, hydrateSpeciesCatalogImages, loadSpeciesImageMap } from './services/speciesCatalog';
import { forecastTreeGrowth } from './services/carbonCalculator';
import { Menu, Loader2, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'treecarbonxray_v1';

interface StoredState {
  projectTrees: ProjectTree[];
  horizon: number;
  selectedRegion: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('builder');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Application State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [densities, setDensities] = useState<BiomassDensity[]>([]);
  const [growthCoeffs, setGrowthCoeffs] = useState<GrowthCoefficient[]>([]);
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  
  // Project State (The User's Inventory)
  const [projectTrees, setProjectTrees] = useState<ProjectTree[]>([]);
  const [horizon, setHorizon] = useState<number>(20);
  const [needsReconcile, setNeedsReconcile] = useState(false);

  // Restore persisted project state on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredState = JSON.parse(saved);
        const valid = Array.isArray(parsed.projectTrees)
          ? parsed.projectTrees.filter(
              t => Array.isArray(t.forecastData) && t.forecastData.length > 0
            )
          : [];
        if (valid.length > 0) {
          setProjectTrees(valid);
          setNeedsReconcile(true);  // flag for recalculation after data loads
        }
        if (typeof parsed.horizon === 'number') setHorizon(parsed.horizon);
        if (typeof parsed.selectedRegion === 'string') setSelectedRegion(parsed.selectedRegion);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save project state to localStorage (debounced 500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const toSave: StoredState = { projectTrees, horizon, selectedRegion };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // Storage quota exceeded — skip silently
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [projectTrees, horizon, selectedRegion]);

  // After data loads, reconcile any restored trees against fresh coefficients and current horizon
  useEffect(() => {
    if (!needsReconcile || densities.length === 0 || growthCoeffs.length === 0) return;
    setNeedsReconcile(false);
    setProjectTrees(prev => prev.map(tree => {
      const { annualData, currentCarbon } = forecastTreeGrowth(
        tree.speciesScientific,
        tree.initialDbh,
        horizon,
        densities,
        growthCoeffs,
        selectedRegion || undefined
      );
      return {
        ...tree,
        forecastData: annualData,
        initialHeight: annualData[0]?.height ?? tree.initialHeight,
        currentCarbon: currentCarbon * tree.count
      };
    }));
  }, [needsReconcile, densities, growthCoeffs, horizon, selectedRegion]);

  // Load Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Parallel fetch for essential calculation data and curated image map
        const [ts9Res, ts6Res, ts1Res, speciesImages] = await Promise.all([
          fetch(DATA_URLS.TS9_BIOMASS_DENSITY),
          fetch(DATA_URLS.TS6_GROWTH_COEFFICIENTS),
          fetch(DATA_URLS.TS1_REGIONAL_INFO),
          loadSpeciesImageMap(),
        ]);

        if (!ts9Res.ok) throw new Error(`Failed to load Density Data (TS9): ${ts9Res.statusText}`);
        if (!ts6Res.ok) throw new Error(`Failed to load Growth Data (TS6): ${ts6Res.statusText}`);
        // TS1 failure is non-fatal — region selector will just be empty

        const ts9Text = await ts9Res.text();
        const ts6Text = await ts6Res.text();

        const parsedDensities = parseBiomassDensity(ts9Text);
        const parsedGrowthCoeffs = parseGrowthCoefficients(ts6Text);

        setDensities(parsedDensities);
        setGrowthCoeffs(parsedGrowthCoeffs);

        // Generate species catalog with images for autocomplete and picker
        const catalog = buildSpeciesCatalog(parsedDensities, parsedGrowthCoeffs, speciesImages);
        setSpeciesList(catalog);
        // Enrich fallback cards in the background with species-specific images.
        void hydrateSpeciesCatalogImages(catalog, speciesImages)
          .then(setSpeciesList)
          .catch((imageErr) => {
            console.warn('Image enrichment skipped:', imageErr);
          });

        if (ts1Res.ok) {
          const ts1Text = await ts1Res.text();
          const rawRegions = parseRegionalInfo(ts1Text);
          setRegions(rawRegions.map(r => ({
            code: r.regionCode,
            name: r.regionName,
            city: r.city,
            state: r.state,
          })));
        }

        setLoading(false);

      } catch (err) {
        console.error("Data Loading Error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred loading data.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh]">
           <Loader2 className="w-12 h-12 text-forest-600 animate-spin mb-4" />
           <h2 className="text-xl font-semibold text-gray-800">Loading Model Data...</h2>
           <p className="text-gray-500 mt-2">Fetching growth coefficients from repository.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
           <div className="bg-red-50 p-4 rounded-full mb-4">
             <AlertTriangle className="w-12 h-12 text-red-500" />
           </div>
           <h2 className="text-xl font-bold text-gray-800">Error Loading Data</h2>
           <p className="text-gray-600 mt-2 max-w-md">{error}</p>
           <button 
             onClick={() => window.location.reload()}
             className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
           >
             Retry
           </button>
        </div>
      );
    }

    switch(activeTab) {
      case 'builder':
        return (
          <Calculator
            densities={densities}
            growthCoeffs={growthCoeffs}
            projectTrees={projectTrees}
            setProjectTrees={setProjectTrees}
            switchToDashboard={() => setActiveTab('dashboard')}
            speciesList={speciesList}
            regions={regions}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            horizon={horizon}
            setHorizon={setHorizon}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            projectTrees={projectTrees}
            switchToBuilder={() => setActiveTab('builder')}
          />
        );
      case 'analytics':
        return <Analytics projectTrees={projectTrees} />;
      default:
        return (
          <Calculator
            densities={densities}
            growthCoeffs={growthCoeffs}
            projectTrees={projectTrees}
            setProjectTrees={setProjectTrees}
            switchToDashboard={() => setActiveTab('dashboard')}
            speciesList={speciesList}
            regions={regions}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            horizon={horizon}
            setHorizon={setHorizon}
          />
        );
    }
  };

  const getTitle = () => {
      if (activeTab === 'builder') return 'Inventory & Forecast';
      if (activeTab === 'dashboard') return 'Impact Report';
      if (activeTab === 'analytics') return 'Analytics';
      return '';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-800">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white h-16 flex items-center justify-between px-6 z-10"
                style={{ borderBottom: '2px solid #b4e6c5', boxShadow: '0 1px 12px rgba(34,128,75,0.06)' }}>
          <div className="flex items-center">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden mr-4 text-gray-500 hover:text-gray-700"
            >
              <Menu />
            </button>
            <h1 className="text-xl font-bold text-forest-900 tracking-tight">{getTitle()}</h1>
          </div>
          <div className="flex items-center gap-3">
            {projectTrees.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all trees from this project?')) {
                    setProjectTrees([]);
                  }
                }}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Clear Project
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
