import React, { useMemo } from 'react';
import { ProjectTree } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';

interface AnalyticsProps {
    projectTrees: ProjectTree[];
}

const Analytics: React.FC<AnalyticsProps> = ({ projectTrees }) => {

    // 1. Prepare Time Series Data
    const timeSeriesData = useMemo(() => {
        if(projectTrees.length === 0) return [];
        const years = projectTrees[0].forecastData.length;
        const data = [];

        for (let i = 0; i < years; i++) {
            const yearData: any = { year: i };
            let totalYearCarbon = 0;

            projectTrees.forEach(t => {
                // Accumulate carbon for this species group
                const treeCarbon = t.forecastData[i].carbonStorage * t.count;
                yearData[t.speciesCommon] = (yearData[t.speciesCommon] || 0) + treeCarbon;
                totalYearCarbon += treeCarbon;
            });
            
            yearData.total = totalYearCarbon;
            data.push(yearData);
        }
        return data;
    }, [projectTrees]);

    const xTickInterval = useMemo(() => {
        if (timeSeriesData.length <= 1) return 0;
        return Math.max(1, Math.floor((timeSeriesData.length - 1) / 6));
    }, [timeSeriesData]);

    // 2. Carbon by Species (Final Year)
    const speciesCarbonData = useMemo(() => {
        const data: Record<string, { name: string, co2: number, count: number }> = {};
        const horizonIndex = projectTrees.length > 0 ? projectTrees[0].forecastData.length - 1 : 0;

        projectTrees.forEach(t => {
            const finalCarbon = t.forecastData[horizonIndex].carbonStorage * t.count;
            if (!data[t.speciesCommon]) {
                data[t.speciesCommon] = { name: t.speciesCommon, co2: 0, count: 0 };
            }
            data[t.speciesCommon].co2 += finalCarbon;
            data[t.speciesCommon].count += t.count;
        });
        return Object.values(data).sort((a, b) => b.co2 - a.co2);
    }, [projectTrees]);

    // 3. Scatter data (Current DBH vs Efficiency)
    const scatterData = useMemo(() => {
        const horizonIndex = projectTrees.length > 0 ? projectTrees[0].forecastData.length - 1 : 0;
        return projectTrees.map(t => ({
            dbh: t.initialDbh,
            co2: t.forecastData[horizonIndex].carbonStorage, // Lifetime potential per tree
            name: t.speciesCommon,
            amt: t.count 
        }));
    }, [projectTrees]);

    if (projectTrees.length === 0) {
        return (
             <div className="h-[50vh] flex items-center justify-center text-gray-400">
                 <p>Add trees to your project to view detailed analytics.</p>
             </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Visual Analytics</h2>
            </div>

            {/* MAIN CHART: Time Series */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Cumulative Carbon Sequestration Over Time</h3>
                <p className="text-xs text-gray-500 mb-6">Projected accumulation of carbon storage (kg CO₂) over the planning horizon.</p>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={timeSeriesData}
                            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#39a872" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#39a872" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="year" 
                                tick={{fontSize: 12}} 
                                interval={xTickInterval || 0}
                                tickMargin={10}
                                allowDecimals={false}
                                label={{ value: 'Year', position: 'insideBottomRight', offset: -5 }}
                            />
                            <YAxis 
                                width={90}
                                tickMargin={10}
                                allowDecimals={false}
                                label={{ value: 'Total CO₂ (kg)', angle: -90, position: 'insideLeft', offset: 10 }} 
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip contentStyle={{borderRadius: '8px'}} />
                            <Area type="monotone" dataKey="total" stroke="#298759" fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                
                {/* Carbon Contribution by Species */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Total Impact by Species (Project Lifetime)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={speciesCarbonData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} tickMargin={12} />
                                <YAxis 
                                    width={80}
                                    tickMargin={8}
                                    label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', offset: 10 }} 
                                />
                                <Tooltip 
                                    cursor={{fill: '#f9fafb'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                />
                                <Bar dataKey="co2" fill="#39a872" name="Lifetime CO₂ (kg)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Efficiency Chart (Scatter) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Sequestration Efficiency</h3>
                        <p className="text-xs text-gray-500 mb-6">Initial DBH vs. Lifetime Carbon Potential per tree.</p>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            type="number" 
                            dataKey="dbh" 
                            name="DBH" 
                            tickMargin={10} 
                            tickFormatter={(v) => `${Math.round(v)} cm`}
                            label={{ value: 'Initial DBH (cm)', position: 'insideBottom', offset: -15 }} 
                        />
                        <YAxis 
                            type="number" 
                            dataKey="co2" 
                            name="CO₂" 
                            width={110}
                            tickMargin={12}
                            tickFormatter={(v) => Math.round(v).toLocaleString()}
                            unit=" kg"
                            label={{ value: 'Lifetime CO₂ per tree (kg)', angle: -90, position: 'insideLeft', offset: -5 }} 
                        />
                        <ZAxis type="number" dataKey="amt" range={[60, 400]} name="Count" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '8px'}} />
                                    <Scatter name="Trees" data={scatterData} fill="#8884d8" fillOpacity={0.6} stroke="#8884d8" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                     {/* Summary Table */}
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Species Breakdown</h3>
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Species</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-right">Total CO₂</th>
                                        <th className="px-4 py-3 text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {speciesCarbonData.map((row, i) => {
                                        const totalProjectCo2 = Object.values(speciesCarbonData).reduce((a,b) => a + b.co2, 0);
                                        const percentage = (row.co2 / totalProjectCo2) * 100;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
                                                <td className="px-4 py-3 text-right text-gray-600">{row.co2.toLocaleString(undefined, {maximumFractionDigits:0})} kg</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
