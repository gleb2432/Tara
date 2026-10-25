/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, MapPin, ListOrdered, ClipboardList, Factory, ShieldCheck, Warehouse, Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface HeaderProps {
  currentTab: 'map' | 'queue' | 'logs';
  onTabChange: (tab: 'map' | 'queue' | 'logs') => void;
  onOpenInboundUnload: () => void; // Меню 1: Выгрузка с фуры
  onOpenPlantOutfeed: () => void;  // Меню 2: Завоз в цех
  onOpenAdmin: () => void;         // Админ-панель (admin2026)
  totalPallets: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenInboundUnload,
  onOpenPlantOutfeed,
  onOpenAdmin,
  totalPallets,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEffects.enabled = next;
    setSoundEnabled(next);
    if (next) soundEffects.playSuccess();
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-slate-900 border-b border-slate-800 shadow-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
          <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap leading-tight">
            ТЕРМИНАЛ КАРЩИКА
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            12 Секций (A–L, 84 рядов)
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links & Sound Toggle */}
      <nav className="flex items-center gap-1 sm:gap-1.5 order-3 sm:order-2 overflow-x-auto py-0.5 no-scrollbar">
        <button
          onClick={() => {
            soundEffects.playClick();
            onTabChange('map');
          }}
          className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'map'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Схема поля</span>
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            onTabChange('queue');
          }}
          className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'queue'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Очередь FIFO</span>
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            onTabChange('logs');
          }}
          className={`min-h-[40px] hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Журнал смены</span>
        </button>

        {/* Sound Chimes Toggle Button */}
        <button
          onClick={toggleSound}
          className={`min-h-[40px] p-2 rounded-xl transition-colors shrink-0 cursor-pointer border ${
            soundEnabled
              ? 'bg-slate-800 text-amber-400 border-amber-500/40'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title={soundEnabled ? 'Звуковые сигналы включены' : 'Звук отключен'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            onOpenAdmin();
          }}
          className="min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-slate-700/60"
          title="Админ-панель (пароль: admin2026)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Админ</span>
        </button>
      </nav>

      {/* Zone 3: 2 SEPARATE PRIMARY ACTION MENUS (Выгрузка с фуры и Завоз в цех) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 sm:order-3">
        {/* Меню 1: ВЫГРУЗКА С ФУРЫ (Приемка с фуры в ячейки склада) */}
        <button
          onClick={() => {
            soundEffects.playSuccess();
            onOpenInboundUnload();
          }}
          className="min-h-[42px] flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          title="Выгрузка паллет с фуры в ячейки склада"
        >
          <Warehouse className="w-4 h-4 stroke-[2.5]" />
          <span>1. Выгрузка с фуры</span>
        </button>

        {/* Меню 2: ЗАВОЗ В ЦЕХ (Подача паллет со склада в цех) */}
        <button
          onClick={() => {
            soundEffects.playSuccess();
            onOpenPlantOutfeed();
          }}
          className="min-h-[42px] flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-xl shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          title="Завоз паллет из ячеек склада в цех на розлив"
        >
          <Factory className="w-4 h-4 stroke-[2.5]" />
          <span>2. Завоз в цех</span>
        </button>
      </div>
    </header>
  );
};

