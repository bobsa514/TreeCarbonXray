
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import Analytics from './components/Analytics';
import { TabView, BiomassDensity, ProjectTree, GrowthCoefficient, SpeciesInfo } from './types';
import { DATA_URLS } from './constants';
import { parseBiomassDensity, parseGrowthCoefficients } from './services/dataService';
import { buildSpeciesCatalog } from './services/speciesCatalog';
import { Menu, Loader2, AlertTriangle } from 'lucide-react';

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
  
  // Project State (The User's Inventory)
  const [projectTrees, setProjectTrees] = useState<ProjectTree[]>([]);

  // Load Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Parallel fetch for essential calculation data
        const [ts9Res, ts6Res] = await Promise.all([
          fetch(DATA_URLS.TS9_BIOMASS_DENSITY),
          fetch(DATA_URLS.TS6_GROWTH_COEFFICIENTS)
        ]);

        if (!ts9Res.ok) throw new Error(`Failed to load Density Data (TS9): ${ts9Res.statusText}`);
        if (!ts6Res.ok) throw new Error(`Failed to load Growth Data (TS6): ${ts6Res.statusText}`);

        const ts9Text = await ts9Res.text();
        const ts6Text = await ts6Res.text();

        const parsedDensities = parseBiomassDensity(ts9Text);
        const parsedGrowthCoeffs = parseGrowthCoefficients(ts6Text);

        setDensities(parsedDensities);
        setGrowthCoeffs(parsedGrowthCoeffs);

        // Generate species catalog with images for autocomplete and picker
        const catalog = buildSpeciesCatalog(parsedDensities, parsedGrowthCoeffs);
        setSpeciesList(catalog);
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
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setMobileOpen(true)}
              className="lg:hidden mr-4 text-gray-500 hover:text-gray-700"
            >
              <Menu />
            </button>
            <h1 className="text-xl font-bold text-gray-800">{getTitle()}</h1>
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
