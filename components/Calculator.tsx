
import React, { useState, useMemo, useEffect } from 'react';
import { BiomassDensity, ModelConfidence, ProjectTree, GrowthCoefficient, SpeciesInfo, RegionOption, DbhUnit } from '../types';
import { forecastTreeGrowth } from '../services/carbonCalculator';
import SpeciesSelectorModal from './SpeciesSelectorModal';
import { getSpeciesLabel, FALLBACK_IMAGE } from '../services/speciesCatalog';
import { EXAMPLE_PROJECT_SPECIES } from '../constants';
import { Plus, Trash2, Leaf, Search, AlertCircle, ArrowRight, Clock, Info, Wand2, MapPin } from 'lucide-react';

interface CalculatorProps {
  densities: BiomassDensity[];
  growthCoeffs: GrowthCoefficient[];
  projectTrees: ProjectTree[];
  setProjectTrees: React.Dispatch<React.SetStateAction<ProjectTree[]>>;
  switchToDashboard: () => void;
  speciesList: SpeciesInfo[];
  regions: RegionOption[];
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  horizon: number;
  setHorizon: (horizon: number) => void;
  dbhUnit: DbhUnit;
  setDbhUnit: (unit: DbhUnit) => void;
}

const Calculator: React.FC<CalculatorProps> = ({
  densities,
  growthCoeffs,
  projectTrees,
  setProjectTrees,
  switchToDashboard,
  speciesList,
  regions,
  selectedRegion,
  setSelectedRegion,
  horizon,
  setHorizon,
  dbhUnit,
  setDbhUnit,
}) => {

  // Input State
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [count, setCount] = useState<number>(1);
  const [dbh, setDbh] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [selectedSpeciesInfo, setSelectedSpeciesInfo] = useState<SpeciesInfo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const projectTreesRef = React.useRef(projectTrees);
  useEffect(() => { projectTreesRef.current = projectTrees; }, [projectTrees]);

  const selectedRegionRef = React.useRef(selectedRegion);
  useEffect(() => { selectedRegionRef.current = selectedRegion; }, [selectedRegion]);

  const prevRegionRef = React.useRef(selectedRegion);

  const prevHorizonRef = React.useRef(horizon);

  const confidenceBadgeClass = (confidence: ModelConfidence): string => {
    if (confidence === 'exact') return 'bg-green-100 text-green-800 border-green-200';
    if (confidence === 'genus') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const confidenceTooltip = (confidence: ModelConfidence): string => {
    if (confidence === 'exact') return 'Exact match: growth data found for this exact species in the selected USFS region.';
    if (confidence === 'genus') return 'Genus match: no exact species data found; using coefficients from a related species in the same genus.';
    return 'Proxy model: no genus-level data found; using Acer rubrum (Red Maple) as a conservative growth proxy.';
  };

  // Filter species for autocomplete using the dynamic list
  const filteredSpecies = useMemo(() => {
    if (!speciesSearch) return speciesList.slice(0, 8);
    const search = speciesSearch.toLowerCase();
    
    const matches = speciesList.filter(s => 
      s.scientificName.toLowerCase().includes(search) ||
      s.commonName.toLowerCase().includes(search)
    );
    return matches.slice(0, 10);
  }, [speciesSearch, speciesList]);

  // Recalculate all trees only when horizon actually changes (not on every tree add/remove)
  useEffect(() => {
    if (prevHorizonRef.current === horizon) return;
    prevHorizonRef.current = horizon;
    if (projectTreesRef.current.length === 0) return;
    const updated = projectTreesRef.current.map(tree => {
      const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        tree.speciesScientific,
        tree.initialDbh,
        horizon,
        densities,
        growthCoeffs,
        selectedRegionRef.current || undefined
      );
      return {
        ...tree,
        modelConfidence,
        modelSourceScientific,
        forecastData: annualData,
        initialHeight: annualData[0]?.height ?? tree.initialHeight,
        currentCarbon: currentCarbon * tree.count,
      };
    });
    setProjectTrees(updated);
  }, [horizon, densities, growthCoeffs, setProjectTrees]);

  // Recalculate all trees when region changes
  useEffect(() => {
    if (prevRegionRef.current === selectedRegion) return;
    prevRegionRef.current = selectedRegion;
    if (projectTreesRef.current.length === 0) return;
    const updated = projectTreesRef.current.map(tree => {
      const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        tree.speciesScientific,
        tree.initialDbh,
        horizon,
        densities,
        growthCoeffs,
        selectedRegion || undefined
      );
      return {
        ...tree,
        modelConfidence,
        modelSourceScientific,
        forecastData: annualData,
        initialHeight: annualData[0]?.height ?? tree.initialHeight,
        currentCarbon: currentCarbon * tree.count,
      };
    });
    setProjectTrees(updated);
  }, [selectedRegion, densities, growthCoeffs, horizon, setProjectTrees]);

  const findSpeciesFromInput = (): SpeciesInfo | undefined => {
    const needle = speciesSearch.toLowerCase().trim();
    if (!needle) return undefined;
    // Exact match first, then partial
    return (
      speciesList.find(s =>
        s.scientificName.toLowerCase() === needle ||
        s.commonName.toLowerCase() === needle
      ) ||
      speciesList.find(s =>
        s.scientificName.toLowerCase().includes(needle) ||
        s.commonName.toLowerCase().includes(needle)
      )
    );
  };

  const handleAddTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesSearch || !dbh) return;

    const dbhVal = toCm(parseFloat(dbh));

    if (isNaN(dbhVal) || dbhVal <= 0) {
      setFormError(`Please enter a valid DBH greater than 0 ${dbhUnit}.`);
      return;
    }

    const matchedSpecies = findSpeciesFromInput();

    let scientific = matchedSpecies?.scientificName || speciesSearch;
    let common = matchedSpecies?.commonName || speciesSearch;
    
    if (!matchedSpecies && speciesSearch.includes('(')) {
        const parts = speciesSearch.split('(');
        scientific = parts[0].trim() || scientific;
        common = parts[1].replace(')', '').trim() || common;
    }

    // Run Forecast
    const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        scientific,
        dbhVal,
        horizon,
        densities,
        growthCoeffs,
        selectedRegion || undefined
    );

    const newTree: ProjectTree = {
      id: Math.random().toString(36).substr(2, 9),
      count: count,
      speciesCommon: common,
      speciesScientific: scientific,
      modelConfidence,
      modelSourceScientific,
      initialDbh: dbhVal,
      initialHeight: annualData[0].height,
      currentCarbon: currentCarbon * count,
      forecastData: annualData // Store the full projection
    };

    setProjectTrees(prev => [...prev, newTree]);

    // Reset form
    setSpeciesSearch('');
    setSelectedSpeciesInfo(null);
    setCount(1);
    setDbh('');
    setFormError(null);
    setShowDropdown(false);
  };

  const removeTree = (id: string) => {
    setProjectTrees(prev => prev.filter(t => t.id !== id));
  };

  const updateTreeCount = (id: string, newCount: number) => {
    if (!Number.isFinite(newCount) || newCount < 1) return;
    setProjectTrees(prev => prev.map(t => {
      if (t.id !== id) return t;
      const perTreeCurrent = t.forecastData[0]?.carbonStorage ?? 0;
      return {
        ...t,
        count: newCount,
        currentCarbon: perTreeCurrent * newCount,
      };
    }));
  };

  const toCm = (val: number): number => dbhUnit === 'in' ? val * 2.54 : val;
  const fromCm = (val: number): string =>
    dbhUnit === 'in'
      ? (val / 2.54).toFixed(1)
      : String(val);

  const selectSpecies = (info: SpeciesInfo) => {
    setSpeciesSearch(getSpeciesLabel(info));
    setSelectedSpeciesInfo(info);
    // Auto-fill DBH with species typical value if available
    if (info.typicalDbh !== undefined) {
      setDbh(fromCm(info.typicalDbh));
    }
    setShowDropdown(false);
    setShowSpeciesModal(false);
  };


  const loadExampleProject = () => {
    const exampleTrees: ProjectTree[] = EXAMPLE_PROJECT_SPECIES.map((t) => {
      const { annualData, currentCarbon, modelConfidence, modelSourceScientific } = forecastTreeGrowth(
        t.speciesScientific,
        t.initialDbh,
        horizon,
        densities,
        growthCoeffs,
        selectedRegionRef.current || undefined
      );
      return {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        modelConfidence,
        modelSourceScientific,
        initialHeight: annualData[0]?.height ?? 0,
        currentCarbon: currentCarbon * t.count,
        forecastData: annualData,
      };
    });
    setProjectTrees(exampleTrees);
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Project Inventory</h2>
          <p className="text-gray-500">Define existing trees to model future growth and sequestration.</p>
        </div>
        {projectTrees.length > 0 && (
           <button 
             onClick={switchToDashboard}
             className="bg-forest-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-forest-700 transition-colors shadow-sm flex items-center"
           >
             View Impact Report <ArrowRight className="w-4 h-4 ml-2" />
           </button>
        )}
      </div>

      {/* Global Parameters */}
      <div className="bg-cream-50 p-6 rounded-xl border border-sage-200/60 flex items-center space-x-6">
         <div className="p-3 bg-forest-100 rounded-full text-forest-600">
            <Clock className="w-6 h-6" />
         </div>
         <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Project Planning Horizon: <span className="text-blue-600">{horizon} Years</span>
            </label>
            <input 
                type="range" 
                min="5" 
                max="50" 
                step="5"
                value={horizon}
                onChange={(e) => setHorizon(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-forest-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5 yrs</span>
                <span>25 yrs</span>
                <span>50 yrs</span>
            </div>
         </div>
         <div className="hidden md:block text-sm text-gray-500 max-w-xs border-l pl-6">
            Adjusting the horizon recalculates the sequestration potential for the entire project lifecycle.
         </div>
        {regions.length > 0 && (
          <div className="hidden md:flex border-l border-gray-200 pl-6 items-center gap-3 flex-shrink-0">
            <div className="p-3 bg-forest-50 rounded-full text-forest-600">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                USFS Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
              >
                <option value="">All Regions (average)</option>
                {regions.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.name} — {r.city}, {r.state}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Input Form */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-sage-200/50 overflow-hidden sticky top-6">
            <div className="bg-forest-50 px-6 py-4 border-b border-forest-100">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Plus className="w-4 h-4 mr-2 text-forest-600" />
                Add Inventory
              </h3>
            </div>
            
            <form onSubmit={handleAddTree} className="p-6 space-y-5">
              {/* Species Autocomplete */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Species</label>
                  <button
                    type="button"
                    onClick={() => setShowSpeciesModal(true)}
                    className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-forest-200 bg-forest-50 text-forest-700 hover:bg-forest-100 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Browse list
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={speciesSearch}
                    onChange={(e) => {
                      setSpeciesSearch(e.target.value);
                      setSelectedSpeciesInfo(null);
                      setDbh('');
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="e.g. Red maple or Acer rubrum"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent outline-none transition-all"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                
                {showDropdown && filteredSpecies.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredSpecies.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSpecies(s)}
                        className="w-full text-left px-4 py-2 hover:bg-forest-50 flex flex-col border-b border-gray-50 last:border-0 text-sm text-gray-700"
                      >
                        <span className="font-semibold text-gray-800">{s.commonName}</span>
                        <span className="text-xs text-gray-500 italic">{s.scientificName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Species Preview */}
              {selectedSpeciesInfo && (
                <div className="flex items-center gap-3 p-3 bg-forest-50 border border-forest-200 rounded-lg">
                  <img
                    src={selectedSpeciesInfo.imageUrl}
                    alt={selectedSpeciesInfo.commonName}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-forest-100"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {selectedSpeciesInfo.commonName}
                    </div>
                    <div className="text-xs text-gray-500 italic truncate">
                      {selectedSpeciesInfo.scientificName}
                    </div>
                    <div className="text-[11px] text-forest-600 mt-0.5 flex items-center gap-1">
                      <span className="w-2 h-2 bg-forest-500 rounded-full inline-block" />
                      Species selected
                    </div>
                  </div>
                </div>
              )}

              {/* Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <div className="flex items-center">
                  <button 
                    type="button"
                    onClick={() => setCount(Math.max(1, count - 1))}
                    className="p-2.5 border border-gray-300 rounded-l-lg hover:bg-gray-50 bg-gray-50 text-gray-600"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2.5 text-center border-y border-gray-300 focus:ring-0 focus:outline-none" 
                    min="1"
                  />
                  <button 
                    type="button"
                    onClick={() => setCount(count + 1)}
                    className="p-2.5 border border-gray-300 rounded-r-lg hover:bg-gray-50 bg-gray-50 text-gray-600"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* DBH */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                    <span>Current DBH ({dbhUnit})</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseFloat(dbh);
                          if (!isNaN(current)) {
                            setDbh(dbhUnit === 'cm' ? (current / 2.54).toFixed(1) : (current * 2.54).toFixed(1));
                          }
                          setDbhUnit(dbhUnit === 'cm' ? 'in' : 'cm');
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border border-gray-300 hover:border-forest-400 text-gray-500 hover:text-forest-600 transition-colors"
                      >
                        Switch to {dbhUnit === 'cm' ? 'inches' : 'cm'}
                      </button>
                      <span className="text-xs font-normal text-gray-400 flex items-center cursor-help" title="Diameter at Breast Height (1.37m)">
                        <Info className="w-3 h-3 mr-1"/> What is this?
                      </span>
                    </div>
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={dbh}
                      onChange={(e) => { setDbh(e.target.value); setFormError(null); }}
                      placeholder={dbhUnit === 'cm' ? 'e.g. 20' : 'e.g. 8'}
                      min="0.1"
                      step="0.1"
                      className="w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 outline-none"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs">{dbhUnit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSpeciesInfo?.typicalDbh !== undefined
                      ? `Suggested for ~15-yr urban ${selectedSpeciesInfo.commonName} — adjust to match field measurements.`
                      : 'Height is automatically estimated based on DBH and species growth curve.'}
                  </p>
                  {selectedSpeciesInfo?.typicalDbh !== undefined && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3 flex-shrink-0" />
                      Typical for this species:{' '}
                      {dbhUnit === 'cm'
                        ? `${Math.round(selectedSpeciesInfo.typicalDbh * 0.5)}–${Math.round(selectedSpeciesInfo.typicalDbh * 1.8)} cm`
                        : `${Math.round(selectedSpeciesInfo.typicalDbh * 0.5 / 2.54 * 10) / 10}–${Math.round(selectedSpeciesInfo.typicalDbh * 1.8 / 2.54 * 10) / 10} in`
                      }
                    </p>
                  )}
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={!speciesSearch || !dbh || parseFloat(dbh) <= 0}
                className="w-full bg-forest-700 text-white py-3 rounded-lg font-semibold hover:bg-forest-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.98]"
              >
                Add to Inventory
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="xl:col-span-2 space-y-4">
           {projectTrees.length === 0 ? (
             <div className="h-full min-h-[400px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 p-8 text-center">
               <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                 <Leaf className="w-8 h-8 text-forest-200" />
               </div>
               <h3 className="text-lg font-medium text-gray-600 mb-1">Inventory Empty</h3>
               <p className="max-w-md mx-auto text-sm">Search for a species and input current size. The model will calculate current carbon storage and forecast growth for the next {horizon} years.</p>
               <button
                 type="button"
                 onClick={loadExampleProject}
                 className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 text-white rounded-lg hover:bg-forest-700 text-sm font-medium shadow-sm transition-colors"
               >
                 <Wand2 className="w-4 h-4" />
                 Try Example Project
               </button>
             </div>
           ) : (
             <div className="bg-white rounded-xl shadow-sm border border-sage-200/40 overflow-hidden">
               {/* Mobile Card View (< lg) */}
               <div className="lg:hidden divide-y divide-gray-100">
                 {projectTrees.map((tree) => {
                   const finalData = tree.forecastData[tree.forecastData.length - 1];
                   const totalCarbon = finalData ? finalData.carbonStorage * tree.count : 0;
                   return (
                     <div key={tree.id} className="p-4 space-y-2">
                       <div className="flex items-start justify-between">
                         <div>
                           <div className="font-medium text-gray-900">{tree.speciesCommon}</div>
                           <div className="text-xs text-gray-500 italic">{tree.speciesScientific}</div>
                         </div>
                         <button
                           onClick={() => removeTree(tree.id)}
                           className="text-gray-300 hover:text-red-500 p-1 rounded ml-2 transition-colors"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                         <label className="flex items-center gap-1.5">
                           <span className="text-xs text-gray-400">Qty</span>
                           <input
                             type="number"
                             min={1}
                             value={tree.count}
                             onChange={(e) => updateTreeCount(tree.id, parseInt(e.target.value) || 1)}
                             className="w-14 text-center border border-gray-200 rounded-md py-1 text-sm"
                           />
                         </label>
                         <span>
                           <span className="text-xs text-gray-400">DBH </span>
                           {fromCm(tree.initialDbh)} {dbhUnit}
                         </span>
                         <span>
                           <span className="text-xs text-gray-400">{horizon}yr CO&#8322; </span>
                           <strong className="text-forest-800">{totalCarbon.toFixed(0)}</strong> kg
                         </span>
                       </div>
                       <span
                         title={confidenceTooltip(tree.modelConfidence)}
                         className={`inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide cursor-help ${confidenceBadgeClass(tree.modelConfidence)}`}
                       >
                         {tree.modelConfidence}
                       </span>
                     </div>
                   );
                 })}
                 {/* Mobile total footer */}
                 <div className="px-4 py-3 bg-forest-50 border-t border-forest-100 flex justify-between items-center text-sm">
                   <span className="font-semibold text-gray-700">Project Total ({horizon} Years):</span>
                   <span>
                     <span className="text-lg font-bold text-forest-800">
                       {projectTrees.reduce((acc, t) => {
                         const last = t.forecastData[t.forecastData.length - 1];
                         return acc + (last ? last.carbonStorage * t.count : 0);
                       }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                     </span>
                     <span className="text-xs text-gray-500 ml-1">kg CO&#8322;</span>
                   </span>
                 </div>
               </div>

               {/* Desktop Table View (>= lg) */}
               <div className="hidden lg:block overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-forest-50 border-b border-forest-100">
                     <tr>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Species</th>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Size</th>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Projected Growth</th>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Impact</th>
                       <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {projectTrees.map((tree) => {
                         const finalData = tree.forecastData[tree.forecastData.length - 1];
                         if (!finalData) return null;
                         const growth = finalData.dbh - tree.initialDbh;
                         const totalCarbon = finalData.carbonStorage * tree.count;

                         return (
                           <tr key={tree.id} className="hover:bg-blue-50/50 transition-colors group">
                             <td className="px-6 py-4 font-medium text-gray-900">
                               <input
                                 type="number"
                                 min={1}
                                 value={tree.count}
                                 onChange={(e) => updateTreeCount(tree.id, parseInt(e.target.value) || 1)}
                                 className="w-16 text-center border border-gray-200 rounded-md py-2 text-sm"
                               />
                             </td>
                             <td className="px-6 py-4">
                               <div className="font-medium text-gray-900">{tree.speciesCommon}</div>
                               <div className="text-xs text-gray-500 italic">{tree.speciesScientific}</div>
                               <div className="mt-1.5 flex items-center gap-2">
                                 <span
                                   title={confidenceTooltip(tree.modelConfidence)}
                                   className={`inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide cursor-help ${confidenceBadgeClass(tree.modelConfidence)}`}
                                 >
                                   {tree.modelConfidence}
                                 </span>
                                 {tree.modelConfidence !== 'exact' && (
                                   <span className="text-[10px] text-gray-500">
                                     model: {tree.modelSourceScientific}
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-600">
                               <div className="flex items-center gap-2">
                                   <span title="Current DBH">{fromCm(tree.initialDbh)} {dbhUnit}</span>
                                   <ArrowRight className="w-3 h-3 text-gray-300" />
                                   <span className="text-xs text-gray-400">{tree.initialHeight.toFixed(1)}m</span>
                               </div>
                             </td>
                             <td className="px-6 py-4 text-right text-sm text-gray-600">
                                <div className="text-forest-600 font-medium">+{fromCm(growth)} {dbhUnit}</div>
                                <div className="text-xs text-gray-400">over {horizon} yrs</div>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className="font-semibold text-forest-800">{totalCarbon.toFixed(0)}</span> <span className="text-xs text-gray-500">kg CO&#8322;</span>
                             </td>
                             <td className="px-6 py-4 text-right">
                               <button 
                                 onClick={() => removeTree(tree.id)}
                                 className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </td>
                           </tr>
                         );
                     })}
                   </tbody>
                   <tfoot className="bg-forest-50 border-t border-forest-100">
                       <tr>
                           <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-700 text-right">Project Lifetime Total ({horizon} Years):</td>
                           <td className="px-6 py-4 text-right">
                               <span className="text-lg font-bold text-forest-800">
                                   {projectTrees.reduce((acc, t) => { const last = t.forecastData[t.forecastData.length - 1]; return acc + (last ? last.carbonStorage * t.count : 0); }, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                               </span>
                               <span className="text-xs text-gray-500 ml-1">kg CO&#8322;</span>
                           </td>
                           <td></td>
                       </tr>
                   </tfoot>
                 </table>
               </div>
             </div>
           )}
           
           <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Growth Model Active:</p>
                  <p>Calculations use US Forest Service regional growth coefficients.
                    <span className="font-medium"> Exact</span> = direct species match;
                    <span className="font-medium"> Genus</span> = related species proxy;
                    <span className="font-medium"> Proxy</span> = Acer rubrum fallback.
                    Hover confidence badges for details.
                  </p>
              </div>
           </div>
        </div>
      </div>
    </div>
    <SpeciesSelectorModal 
      open={showSpeciesModal}
      onClose={() => setShowSpeciesModal(false)}
      onSelect={selectSpecies}
      species={speciesList}
    />
    </>
  );
};

export default Calculator;
