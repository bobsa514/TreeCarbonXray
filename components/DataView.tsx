import React from 'react';
import { RegionalInfo, SpeciesCount } from '../types';

interface DataViewProps {
    regionalInfo: RegionalInfo[];
    speciesData: SpeciesCount[];
}

const DataView: React.FC<DataViewProps> = ({ regionalInfo, speciesData }) => {
    return (
        <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Regional Reference Data</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Region</th>
                                <th className="px-6 py-3">City/State</th>
                                <th className="px-6 py-3">Year</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {regionalInfo.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{item.regionCode}</td>
                                    <td className="px-6 py-4">{item.regionName}</td>
                                    <td className="px-6 py-4">{item.city}, {item.state}</td>
                                    <td className="px-6 py-4">{item.collectionYear}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Species Inventory (Snippet)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Scientific Name</th>
                                <th className="px-6 py-3">Common Name</th>
                                <th className="px-6 py-3 text-right">Total Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {speciesData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.spCode}</td>
                                    <td className="px-6 py-4 italic">{item.scientificName}</td>
                                    <td className="px-6 py-4">{item.commonName}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{item.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DataView;