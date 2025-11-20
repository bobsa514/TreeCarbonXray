import React, { useMemo, useState } from 'react';
import { SpeciesInfo } from '../types';
import { FALLBACK_IMAGE, getSpeciesLabel } from '../services/speciesCatalog';
import { Search, X } from 'lucide-react';

interface SpeciesSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (species: SpeciesInfo) => void;
  species: SpeciesInfo[];
}

const SpeciesSelectorModal: React.FC<SpeciesSelectorModalProps> = ({
  open,
  onClose,
  onSelect,
  species,
}) => {
  const [query, setQuery] = useState('');

  const filteredSpecies = useMemo(() => {
    if (!query) return species;
    const needle = query.toLowerCase();
    return species.filter(
      (s) =>
        s.scientificName.toLowerCase().includes(needle) ||
        s.commonName.toLowerCase().includes(needle)
    );
  }, [query, species]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Browse Species</h3>
            <p className="text-sm text-gray-500">
              Tap a card to populate the form with common and scientific names.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close species picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-6 py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by common or scientific name"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredSpecies.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No species match your search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecies.map((s) => (
                <button
                  key={s.scientificName}
                  onClick={() => onSelect(s)}
                  className="group text-left rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
                >
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                    <img
                      src={s.imageUrl}
                      alt={getSpeciesLabel(s)}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-sm font-semibold text-gray-900 leading-tight">
                      {s.commonName}
                    </div>
                    <div className="text-xs text-gray-500 italic">{s.scientificName}</div>
                    <div className="text-[11px] text-forest-700 font-medium bg-forest-50 inline-block px-2 py-1 rounded-full">
                      Select
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeciesSelectorModal;
