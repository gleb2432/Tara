/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Search, X } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface AvailableBrandInfo {
  name: string;
  totalPallets: number;
}

interface DriverTopBarProps {
  selectedBrandFilter: string;
  onBrandFilterChange: (brandName: string) => void;
  availableBrands: AvailableBrandInfo[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const DriverTopBar: React.FC<DriverTopBarProps> = ({
  selectedBrandFilter,
  onBrandFilterChange,
  availableBrands,
  searchQuery = '',
  onSearchQueryChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 shadow-sm">
      {/* Search Input for Batch / Row / Plate */}
      {onSearchQueryChange && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Поиск по номеру партии, ряду (A1, C4) или госномеру..."
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Brand Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden md:flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Марка:</span>
        </span>

        {/* Button: All brands */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            onBrandFilterChange('all');
          }}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center ${
            selectedBrandFilter === 'all'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-400/50 scale-102'
              : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          Все марки
        </button>

        {/* Dynamic Buttons for each brand on the field */}
        {availableBrands.map((brand) => {
          const isActive = selectedBrandFilter.toLowerCase() === brand.name.toLowerCase();

          return (
            <button
              key={brand.name}
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onBrandFilterChange(brand.name);
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-400/50 scale-102'
                  : 'bg-slate-950 text-slate-200 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{brand.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-amber-400'
                }`}
              >
                {brand.totalPallets} пал
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

