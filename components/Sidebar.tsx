import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Calculator, BarChart3, TreeDeciduous, Sprout } from 'lucide-react';
import { TabView } from '../types';

interface SidebarProps {
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const facts = [
  'Mature trees can absorb up to 48 lbs of CO₂ per year.',
  'Urban trees can cut peak summer temperatures by 2–9°F through shade and evapotranspiration.',
  'Planting 30 trees next to buildings can reduce heating and cooling energy use by ~10%.',
  'Trees intercept thousands of gallons of stormwater per acre each year, reducing runoff.',
  'Forests store about twice as much carbon in soil as in living biomass.',
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) => {
  const navItems = [
    { id: 'builder', label: 'Project Builder', icon: Calculator },
    { id: 'dashboard', label: 'Impact Report', icon: LayoutDashboard },
    { id: 'analytics', label: 'Visual Analytics', icon: BarChart3 },
  ];

  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const handleNavClick = (id: string) => {
    setActiveTab(id as TabView);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-forest-900 text-white transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="flex items-center justify-center h-20 border-b border-forest-800">
          <div className="flex items-center space-x-3">
            <div className="bg-forest-500 p-2 rounded-lg">
              <TreeDeciduous className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide leading-none">Tree Carbon Xray</h1>
              <span className="text-xs text-forest-300 uppercase tracking-wider">Inventory & Forecast</span>
            </div>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-3 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex items-center w-full px-4 py-3.5 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-forest-600 to-forest-700 text-white shadow-lg border border-forest-500' 
                    : 'text-forest-200 hover:bg-forest-800 hover:text-white'}
                `}
              >
                <Icon className={`w-5 h-5 mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-forest-800">
          <div className="bg-forest-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center mb-2">
                <Sprout className="w-4 h-4 text-forest-300 mr-2" />
                <h4 className="text-sm font-semibold text-forest-200">Did you know?</h4>
            </div>
            <p className="text-xs text-forest-300 leading-relaxed">
              {facts[factIndex]}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
