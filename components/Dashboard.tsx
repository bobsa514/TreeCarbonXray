import React, { useMemo } from 'react';
import { ProjectTree } from '../types';
import { Car, Cloud, Trees, CheckCircle2, TrendingUp, Leaf } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  projectTrees: ProjectTree[];
  switchToBuilder: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projectTrees, switchToBuilder }) => {
  
  // Aggregate Data based on the FINAL year of the projection
  const stats = useMemo(() => {
    if(projectTrees.length === 0) return null;

    const totalTrees = projectTrees.reduce((acc, t) => acc + t.count, 0);
    const horizon = projectTrees[0].forecastData.length - 1;

    // Current (Year 0) vs Projected (Year End)
    const currentTotalCO2 = projectTrees.reduce((acc, t) => acc + (t.currentCarbon), 0);
    const projectedTotalCO2 = projectTrees.reduce((acc, t) => acc + (t.forecastData[horizon].carbonStorage * t.count), 0);
    
    const netSequestration = projectedTotalCO2 - currentTotalCO2;

    // CO2 Tonnes (Projected)
    const co2Tonnes = projectedTotalCO2 / 1000;
    
    // Equivalencies (using Projected)
    // Approx 4.6 metric tons CO2 per year for a typical passenger vehicle.
    const carYears = projectedTotalCO2 / 4600;
    const gasolineGallons = projectedTotalCO2 / 8.887;

    return { totalTrees, currentTotalCO2, projectedTotalCO2, netSequestration, co2Tonnes, carYears, gasolineGallons, horizon };
  }, [projectTrees]);

  // Species Distribution for Mini Chart
  const speciesDist = useMemo(() => {
      const dist: Record<string, number> = {};
      projectTrees.forEach(t => {
          dist[t.speciesCommon] = (dist[t.speciesCommon] || 0) + t.count;
      });
      return Object.keys(dist).map(k => ({ name: k, value: dist[k] }));
  }, [projectTrees]);

  const COLORS = ['#39a872', '#60c68f', '#96deb3', '#c3eed2', '#298759', '#1f563d'];

  if (!stats || projectTrees.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="bg-gray-100 p-6 rounded-full mb-6">
                  <Trees className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Project Data Available</h2>
              <p className="text-gray-500 max-w-md mb-8">Start by adding trees to your project inventory to generate an impact report.</p>
              <button 
                onClick={switchToBuilder}
                className="bg-forest-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-forest-700 transition-shadow shadow-lg"
              >
                  Go to Project Builder
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Project Impact Report</h2>
            <p className="text-gray-500 mt-1">Environmental Assessment Summary ({stats.horizon} Year Horizon)</p>
        </div>
        <div className="mt-4 md:mt-0 bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium flex items-center border border-green-100">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {stats.totalTrees} Trees in Inventory
        </div>
      </div>

      {/* Main Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CO2 Primary Card */}
        <div className="bg-gradient-to-br from-forest-800 to-forest-900 rounded-2xl p-8 text-white shadow-xl md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-forest-700 rounded-full opacity-50 blur-3xl"></div>
            
            <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4 opacity-90">
                    <Cloud className="w-6 h-6" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Lifetime Carbon Storage</span>
                </div>
                
                <div className="flex items-baseline space-x-2">
                    <span className="text-6xl font-bold">{stats.projectedTotalCO2.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span className="text-2xl font-medium text-forest-200">kg CO₂e</span>
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-8 border-t border-forest-700 pt-6">
                    <div>
                        <span className="block text-forest-300 text-sm mb-1">Current Stock</span>
                        <span className="text-xl font-semibold opacity-80">{stats.currentTotalCO2.toLocaleString(undefined, {maximumFractionDigits:0})} kg</span>
                    </div>
                    <div>
                         <span className="block text-forest-300 text-sm mb-1">Net Sequestration (Growth)</span>
                         <div className="flex items-center text-green-300">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="text-xl font-semibold">+{stats.netSequestration.toLocaleString(undefined, {maximumFractionDigits:0})} kg</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Secondary Stats */}
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col justify-center">
                <h3 className="text-gray-500 text-sm font-medium uppercase mb-4 flex items-center">
                    <Car className="w-4 h-4 mr-2" /> Equivalency
                </h3>
                <div className="space-y-4">
                    <div>
                        <span className="text-3xl font-bold text-gray-800">{stats.carYears.toFixed(1)}</span>
                        <p className="text-sm text-gray-500 leading-tight mt-1">Passenger vehicles driven for one year</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(stats.carYears * 5, 100)}%` }}></div>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                        <span className="text-2xl font-bold text-gray-800">{stats.gasolineGallons.toFixed(0)}</span>
                        <p className="text-sm text-gray-500 leading-tight mt-1">Gallons of gasoline consumed</p>
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Breakdown Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-6">Project Composition</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={speciesDist}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {speciesDist.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
                {speciesDist.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                            <span className="text-gray-600">{s.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Additional Context */}
        <div className="lg:col-span-2 bg-forest-50 rounded-2xl p-8 border border-forest-100 flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold text-forest-900 mb-2">Growth & Yield Analysis</h3>
                <p className="text-forest-700 leading-relaxed">
                    This project utilizes growth coefficients to model the biological maturation of the inventory. Over the next <span className="font-bold">{stats.horizon} years</span>, the total carbon storage is projected to increase by <span className="font-bold">{((stats.netSequestration / stats.currentTotalCO2) * 100).toFixed(0)}%</span> as trees increase in diameter and biomass.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                     <div className="bg-white/60 p-4 rounded-lg">
                        <div className="text-xs text-forest-600 uppercase font-semibold">Metric Tonnes</div>
                        <div className="text-xl font-bold text-forest-800">{stats.co2Tonnes.toFixed(2)} t</div>
                     </div>
                     <div className="bg-white/60 p-4 rounded-lg">
                        <div className="text-xs text-forest-600 uppercase font-semibold">Trees</div>
                        <div className="text-xl font-bold text-forest-800">{stats.totalTrees}</div>
                     </div>
                </div>
            </div>
            <div className="mt-8 flex items-center text-sm text-forest-600 bg-white/50 p-4 rounded-lg">
                <Leaf className="w-5 h-5 mr-3 flex-shrink-0" />
                Includes above-ground biomass estimation derived from DBH-Height allometry.
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;