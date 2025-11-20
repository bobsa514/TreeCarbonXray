
import React, { useState, useMemo, useEffect } from 'react';
import { BiomassDensity, ProjectTree, GrowthCoefficient, SpeciesInfo } from '../types';
import { forecastTreeGrowth } from '../services/carbonCalculator';
import SpeciesSelectorModal from './SpeciesSelectorModal';
import { getSpeciesLabel } from '../services/speciesCatalog';
import { Plus, Trash2, Leaf, Search, AlertCircle, ArrowRight, Clock, Info, Wand2 } from 'lucide-react';

interface CalculatorProps {
  densities: BiomassDensity[];
  growthCoeffs: GrowthCoefficient[];
  projectTrees: ProjectTree[];
  setProjectTrees: React.Dispatch<React.SetStateAction<ProjectTree[]>>;
  switchToDashboard: () => void;
  speciesList: SpeciesInfo[];
}

const Calculator: React.FC<CalculatorProps> = ({ 
  densities, 
  growthCoeffs, 
  projectTrees, 
  setProjectTrees, 
  switchToDashboard,
  speciesList 
}) => {
  // Global Config
  const [horizon, setHorizon] = useState<number>(20);

  // Input State
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [count, setCount] = useState<number>(1);
  const [dbh, setDbh] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);

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

  // Update existing trees when Horizon changes
  useEffect(() => {
    if (projectTrees.length > 0) {
        const updated = projectTrees.map(tree => {
             const { annualData } = forecastTreeGrowth(
                tree.speciesScientific, // Pass specific name
                tree.initialDbh,
                horizon,
                densities,
                growthCoeffs
            );
            return { ...tree, forecastData: annualData };
        });
        // Only update if data actually changes to prevent loop
        if (JSON.stringify(updated[0].forecastData.length) !== JSON.stringify(projectTrees[0].forecastData.length)) {
            setProjectTrees(updated);
        }
    }
  }, [horizon, densities, growthCoeffs, projectTrees, setProjectTrees]); 

  const findSpeciesFromInput = (): SpeciesInfo | undefined => {
    const needle = speciesSearch.toLowerCase();
    return speciesList.find(
      (s) =>
        needle.includes(s.scientificName.toLowerCase()) ||
        needle.includes(s.commonName.toLowerCase())
    );
  };

  const handleAddTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesSearch || !dbh) return;

    const dbhVal = parseFloat(dbh);

    const matchedSpecies = findSpeciesFromInput();

    let scientific = matchedSpecies?.scientificName || speciesSearch;
    let common = matchedSpecies?.commonName || speciesSearch;
    
    if (!matchedSpecies && speciesSearch.includes('(')) {
        const parts = speciesSearch.split('(');
        scientific = parts[0].trim() || scientific;
        common = parts[1].replace(')', '').trim() || common;
    }

    // Run Forecast
    const { annualData, currentCarbon } = forecastTreeGrowth(
        scientific,
        dbhVal,
        horizon,
        densities,
        growthCoeffs
    );

    const newTree: ProjectTree = {
      id: Math.random().toString(36).substr(2, 9),
      count: count,
      speciesCommon: common,
      speciesScientific: scientific,
      initialDbh: dbhVal,
      initialHeight: annualData[0].height,
      currentCarbon: currentCarbon * count,
      forecastData: annualData // Store the full projection
    };

    setProjectTrees(prev => [...prev, newTree]);

    // Reset form
    setSpeciesSearch('');
    setCount(1);
    setDbh('');
    setShowDropdown(false);
  };

  const removeTree = (id: string) => {
    setProjectTrees(prev => prev.filter(t => t.id !== id));
  };

  const updateTreeCount = (id: string, newCount: number) => {
    if (!Number.isFinite(newCount) || newCount < 1) return;
    setProjectTrees(prev => prev.map(t => t.id === id ? { ...t, count: newCount } : t));
  };

  const selectSpecies = (info: SpeciesInfo) => {
    setSpeciesSearch(getSpeciesLabel(info));
    setShowDropdown(false);
    setShowSpeciesModal(false);
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-6">
         <div className="p-3 bg-blue-50 rounded-full text-blue-600">
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Input Form */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                      Current DBH (cm)
                      <span className="text-xs font-normal text-gray-400 flex items-center cursor-help" title="Diameter at Breast Height (1.37m)">
                          <Info className="w-3 h-3 mr-1"/> What is this?
                      </span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={dbh}
                      onChange={(e) => setDbh(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 outline-none"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs">cm</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                      Height is automatically estimated based on DBH and Species Growth Curve.
                  </p>
              </div>

              <button 
                type="submit" 
                disabled={!speciesSearch || !dbh}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform active:scale-[0.98]"
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
             </div>
           ) : (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
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
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <span title="Current DBH">{tree.initialDbh}cm</span>
                                    <ArrowRight className="w-3 h-3 text-gray-300" />
                                    <span className="text-xs text-gray-400">{tree.initialHeight.toFixed(1)}m</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-gray-600">
                                 <div className="text-forest-600 font-medium">+{growth.toFixed(1)} cm</div>
                                 <div className="text-xs text-gray-400">over {horizon} yrs</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <span className="font-semibold text-forest-800">{totalCarbon.toFixed(0)}</span> <span className="text-xs text-gray-500">kg CO₂</span>
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
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-700 text-right">Project Lifetime Total ({horizon} Years):</td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-lg font-bold text-forest-800">
                                    {projectTrees.reduce((acc, t) => acc + (t.forecastData[t.forecastData.length-1].carbonStorage * t.count), 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                                <span className="text-xs text-gray-500 ml-1">kg CO₂</span>
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
                  <p>Calculations use US Forest Service regional growth coefficients. If specific species coefficients are unavailable for the projected age, the model utilizes a generic proxy (Acer rubrum) for growth rates.</p>
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
