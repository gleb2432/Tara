/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { YardRow, YardSection, FifoRankedBatch, OperationLogEntry } from '../types/terminal';
import { SECTION_LETTERS } from '../data/initialData';
import { getUrgencyStyles, getRowFifoStatus, formatDateRu, getBatchesInRow } from '../utils/fifoUtils';
import { soundEffects } from '../utils/audio';
import { 
  Sparkles, 
  ArrowDownToLine, 
  Factory, 
  ArrowRightLeft, 
  Flame, 
  AlertTriangle, 
  Layers, 
  Filter,
  Grid2X2,
  Grid3X3,
  Rows,
  Clock,
  Truck,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';

interface YardMapProps {
  rows: YardRow[];
  rankedBatches: FifoRankedBatch[];
  selectedBrandFilter: string;
  smartRecommendedRowId: string | null;
  searchQuery?: string;
  logs?: OperationLogEntry[];
  focusedLogId?: string | null;
  onUnloadIntoRow: (row: YardRow) => void;
  onRowClick: (row: YardRow, targetSection?: YardSection) => void;
  onOpenPlantFeedForRow?: (row: YardRow) => void;
  relocateMode?: {
    active: boolean;
    sourceSection: YardSection;
    onTargetSelect: (targetSectionId: string) => void;
    onCancel: () => void;
  };
}

export const YardMap: React.FC<YardMapProps> = ({
  rows,
  rankedBatches,
  selectedBrandFilter,
  smartRecommendedRowId,
  searchQuery = '',
  logs = [],
  focusedLogId = null,
  onUnloadIntoRow,
  onRowClick,
  onOpenPlantFeedForRow,
  relocateMode,
}) => {
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [mobileCols, setMobileCols] = useState<1 | 2 | 3>(2); // Default 2 columns on mobile for 12 sections!
  
  // Recent Actions Marking State
  const [highlightRecentActions, setHighlightRecentActions] = useState<boolean>(true);
  const [recentCountLimit, setRecentCountLimit] = useState<number>(5); // Show last 5 actions by default
  const [recentActionFilter, setRecentActionFilter] = useState<'all' | 'unload' | 'pickup' | 'move'>('all');

  const rankedMap = new Map<string, FifoRankedBatch>();
  rankedBatches.forEach((rb) => rankedMap.set(rb.id, rb));

  // Compute map of recent actions per row ID
  const recentActionsByRowMap = useMemo(() => {
    if (!highlightRecentActions || !logs || logs.length === 0) return new Map<string, { rank: number; log: OperationLogEntry }>();

    // Filter logs by selected action type
    let filteredLogs = logs;
    if (recentActionFilter !== 'all') {
      filteredLogs = logs.filter((l) => l.action === recentActionFilter);
    }

    // Take top N recent logs
    const topLogs = filteredLogs.slice(0, recentCountLimit);

    const map = new Map<string, { rank: number; log: OperationLogEntry }>();

    topLogs.forEach((log, index) => {
      const rank = index + 1; // 1 = newest
      // Extract target row ID from log fields
      let targetRow = log.rowId || log.targetRowId || '';

      // Clean up string like "Ряд A1" or "A1"
      if (targetRow.startsWith('Ряд ')) {
        targetRow = targetRow.replace('Ряд ', '').trim();
      }

      if (targetRow && !map.has(targetRow)) {
        map.set(targetRow, { rank, log });
      }

      // If source row also exists in move log
      if (log.rowId && log.targetRowId) {
        let srcRow = log.rowId.replace('Ряд ', '').trim();
        if (srcRow && !map.has(srcRow)) {
          map.set(srcRow, { rank, log });
        }
      }
    });

    return map;
  }, [logs, highlightRecentActions, recentCountLimit, recentActionFilter]);

  // Top recent logs list for quick jump bar
  const activeRecentLogs = useMemo(() => {
    let filtered = logs;
    if (recentActionFilter !== 'all') {
      filtered = logs.filter((l) => l.action === recentActionFilter);
    }
    return filtered.slice(0, recentCountLimit);
  }, [logs, recentCountLimit, recentActionFilter]);

  // Group rows by Section letter
  const sectionsGroupMap = new Map<string, YardRow[]>();
  rows.forEach((r) => {
    const letter = r.sectionLetter || r.id.charAt(0) || 'A';
    if (!sectionsGroupMap.has(letter)) {
      sectionsGroupMap.set(letter, []);
    }
    sectionsGroupMap.get(letter)!.push(r);
  });

  // Filter sections if specific section selected on phone
  const displayedSections = activeSectionFilter === 'all'
    ? Array.from(sectionsGroupMap.entries())
    : Array.from(sectionsGroupMap.entries()).filter(([secLetter]) => secLetter === activeSectionFilter);

  const handleJumpToRow = (rowId: string) => {
    soundEffects.playClick();
    let targetId = rowId;
    if (targetId.startsWith('Ряд ')) targetId = targetId.replace('Ряд ', '').trim();

    // Find section letter for this row
    const targetRow = rows.find((r) => r.id === targetId);
    if (targetRow) {
      const secLetter = targetRow.sectionLetter;
      if (activeSectionFilter !== 'all' && activeSectionFilter !== secLetter) {
        setActiveSectionFilter('all');
      }
    }

    setTimeout(() => {
      const el = document.getElementById(`row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Relocate Mode Notice Bar */}
      {relocateMode && relocateMode.active && (
        <div className="flex items-center justify-between p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-xl font-bold animate-pulse">
          <div className="flex items-center gap-2 text-xs">
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>
              ПЕРЕМЕЩЕНИЕ: Нажмите на ряд, куда переставить паллеты из Ряда {relocateMode.sourceSection.rowId}
            </span>
          </div>
          <button
            onClick={relocateMode.onCancel}
            className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 min-h-[44px]"
          >
            Отмена
          </button>
        </div>
      )}

      {/* FEATURE BAR: ⚡ ОТМЕТИТЬ ПОСЛЕДНИЕ ДЕЙСТВИЯ (MARK RECENT ACTIONS) */}
      <div className="bg-slate-900 border-2 border-amber-500/40 p-3 rounded-2xl shadow-lg flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Toggle Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                setHighlightRecentActions((prev) => !prev);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black font-mono transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                highlightRecentActions
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {highlightRecentActions ? (
                <>
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>Отметить последние действия: ВКЛ</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Подсветка действий: ВЫКЛ</span>
                </>
              )}
            </button>

            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              (Выделяет цветной рамкой и бейджами ряды, где были выгрузки/завозы)
            </span>
          </div>

          {/* Controls: Count & Action Type */}
          {highlightRecentActions && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Count Limit Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <span className="text-[10px] text-slate-400 px-1 font-bold">Кол-во:</span>
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setRecentCountLimit(num);
                    }}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      recentCountLimit === num
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Action Type Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setRecentActionFilter('all')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    recentActionFilter === 'all' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setRecentActionFilter('unload')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    recentActionFilter === 'unload' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-amber-300'
                  }`}
                  title="Выгрузка с фур"
                >
                  <Truck className="w-3 h-3" />
                  <span className="hidden md:inline">Выгрузка</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecentActionFilter('pickup')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    recentActionFilter === 'pickup' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-emerald-300'
                  }`}
                  title="Завоз в цех"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden md:inline">В цех</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Recent Actions Jump Strip */}
        {highlightRecentActions && activeRecentLogs.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Быстрый переход:</span>
            </span>

            {activeRecentLogs.map((log, idx) => {
              const rank = idx + 1;
              let targetRow = log.rowId || log.targetRowId || '—';
              if (targetRow.startsWith('Ряд ')) targetRow = targetRow.replace('Ряд ', '').trim();

              const isPickup = log.action === 'pickup';
              const isUnload = log.action === 'unload';

              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => handleJumpToRow(targetRow)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                    isPickup
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                      : isUnload
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900'
                      : 'bg-blue-950/80 text-blue-300 border-blue-500/50 hover:bg-blue-900'
                  }`}
                >
                  <span className="font-black">#{rank}</span>
                  <span className="text-white font-black">Ряд {targetRow}</span>
                  <span className="opacity-75">({log.timestamp})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MOBILE PHONE OPTIMIZATION BAR: 12-SECTION JUMPER + COLUMN TOGGLE */}
      <div className="bg-slate-900/90 p-2.5 sm:p-3 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white uppercase">12 Секций склада:</span>
          </div>

          {/* COLUMN SWITCHER FOR MOBILE */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              title="1 колонка"
              onClick={() => setMobileCols(1)}
              className={`p-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mobileCols === 1
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="2 колонки"
              onClick={() => setMobileCols(2)}
              className={`p-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mobileCols === 2
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">2 кол</span>
            </button>
            <button
              type="button"
              title="3 колонки"
              onClick={() => setMobileCols(3)}
              className={`p-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mobileCols === 3
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="text-[10px]">3 кол</span>
            </button>
          </div>
        </div>

        {/* SECTION TABS SCROLLABLE BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar touch-pan-x">
          <button
            type="button"
            onClick={() => setActiveSectionFilter('all')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSectionFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Все 12 Секций ({rows.length})</span>
          </button>

          {SECTION_LETTERS.map((letter) => {
            const secRows = sectionsGroupMap.get(letter) || [];
            const isSelected = activeSectionFilter === letter;
            const hasOccupied = secRows.some((r) => r.sections.some((s) => s.currentPallets > 0));

            const totalCap = secRows.reduce((a, r) => a + r.maxPallets, 0);
            const totalOcc = secRows.reduce((a, r) => a + r.sections.reduce((sa, s) => sa + s.currentPallets, 0), 0);
            const occPercent = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveSectionFilter(letter);
                  const el = document.getElementById(`section-block-${letter}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl font-black font-mono transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                    : hasOccupied
                    ? 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>Секция {letter}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isSelected
                    ? 'bg-slate-950 text-amber-300'
                    : totalOcc > 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-900 text-emerald-400'
                }`}>
                  {totalOcc > 0 ? `${occPercent}%` : '0%'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render each Section (Секция A..L) */}
      {displayedSections.map(([sectionLetter, sectionRows]) => {
        const totalSectionCap = sectionRows.reduce((a, r) => a + r.maxPallets, 0);
        const totalSectionOcc = sectionRows.reduce(
          (a, r) => a + r.sections.reduce((sa, s) => sa + s.currentPallets, 0),
          0
        );
        const totalSectionFree = Math.max(0, totalSectionCap - totalSectionOcc);

        return (
          <div key={sectionLetter} id={`section-block-${sectionLetter}`} className="flex flex-col gap-2.5">
            {/* Section Header Banner */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-black text-sm border border-amber-500/30">
                  {sectionLetter}
                </span>
                <div>
                  <h3 className="font-mono text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    СЕКЦИЯ {sectionLetter} ({sectionRows.length} рядов: {sectionRows[0]?.id}–{sectionRows[sectionRows.length - 1]?.id})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-400">Занято: </span>
                <strong className="text-white font-bold">{totalSectionOcc}</strong>
                <span className="text-slate-500">/{totalSectionCap}</span>
                <span className="text-amber-400 font-bold">· Своб: {totalSectionFree}</span>
              </div>
            </div>

            {/* GRID OF ROWS INSIDE SECTION (2 или 3 колонки на телефоне) */}
            <div
              className={`grid gap-2.5 ${
                mobileCols === 1
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : mobileCols === 2
                  ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-3'
              }`}
            >
              {sectionRows.map((row) => {
                const totalOccupied = row.sections.reduce((acc, s) => acc + s.currentPallets, 0);
                const freePallets = Math.max(0, row.maxPallets - totalOccupied);
                const isRecommended = smartRecommendedRowId === row.id;
                const isEmpty = totalOccupied === 0;

                // Search match highlight
                const cleanQuery = searchQuery.trim().toLowerCase();
                const matchesQuery = cleanQuery.length > 0 && (
                  row.id.toLowerCase().includes(cleanQuery) ||
                  row.name.toLowerCase().includes(cleanQuery) ||
                  row.sections.some((s) =>
                    (s.batchNumber && s.batchNumber.toLowerCase().includes(cleanQuery)) ||
                    (s.bottleTypeName && s.bottleTypeName.toLowerCase().includes(cleanQuery)) ||
                    (s.vehiclePlate && s.vehiclePlate.toLowerCase().includes(cleanQuery))
                  )
                );

                // Compute traffic-light status based on most critical batch in this row
                const fifoStatus = getRowFifoStatus(row, rankedBatches);

                // Summarize batches in this row
                const batchesInRow = getBatchesInRow(row, rankedMap);

                // Unique brands present in this row
                const brandsInRow = Array.from(
                  new Set(batchesInRow.map((b) => b.bottleTypeName))
                );

                const primaryBatch = batchesInRow[0] || null;

                // Check if this row has a recent action recorded
                const recentActionInfo = recentActionsByRowMap.get(row.id);
                const isFocusedLog = focusedLogId && recentActionInfo && recentActionInfo.log.id === focusedLogId;

                // Action-based border ring class
                let recentActionRingClass = '';
                if (recentActionInfo) {
                  const act = recentActionInfo.log.action;
                  if (act === 'pickup') {
                    recentActionRingClass = 'ring-4 ring-emerald-400 border-emerald-400 shadow-xl shadow-emerald-500/20';
                  } else if (act === 'unload') {
                    recentActionRingClass = 'ring-4 ring-amber-400 border-amber-300 shadow-xl shadow-amber-500/20';
                  } else {
                    recentActionRingClass = 'ring-4 ring-blue-400 border-blue-300 shadow-xl shadow-blue-500/20';
                  }
                }

                return (
                  <div
                    key={row.id}
                    id={`row-${row.id}`}
                    onClick={() => {
                      if (relocateMode?.active) {
                        const freeSec = row.sections.find((s) => s.status === 'empty' || s.currentPallets < s.capacity);
                        if (freeSec) {
                          relocateMode.onTargetSelect(freeSec.id);
                        }
                      } else {
                        onRowClick(row);
                      }
                    }}
                    className={`p-2.5 sm:p-3.5 rounded-2xl transition-all border cursor-pointer group bg-slate-900 flex flex-col justify-between relative ${
                      isFocusedLog
                        ? 'ring-8 ring-amber-400 animate-pulse border-amber-300 bg-slate-800 shadow-2xl scale-102 z-10'
                        : recentActionInfo
                        ? recentActionRingClass
                        : matchesQuery
                        ? 'ring-4 ring-amber-400 border-amber-300 shadow-2xl scale-[1.02] bg-slate-800'
                        : fifoStatus.borderClass
                    } ${isRecommended ? 'ring-2 ring-amber-400 shadow-xl' : ''}`}
                  >
                    <div>
                      {/* RECENT ACTION BADGE TAG (If marked) */}
                      {recentActionInfo && (
                        <div className="mb-2 p-1.5 rounded-xl flex items-center justify-between gap-1 text-[10px] font-mono font-bold shadow-xs border bg-slate-950">
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black shrink-0 text-[9px]">
                              #{recentActionInfo.rank}
                            </span>
                            <span className="font-black text-amber-300 uppercase truncate">
                              {recentActionInfo.log.action === 'pickup' && '⚡ Завоз в цех'}
                              {recentActionInfo.log.action === 'unload' && '🚚 Выгрузка с фуры'}
                              {recentActionInfo.log.action === 'move' && '🔄 Перемещение'}
                            </span>
                          </div>
                          <span className="text-slate-400 font-bold shrink-0">
                            {recentActionInfo.log.timestamp}
                          </span>
                        </div>
                      )}

                      {/* Row Header Line */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Big ID Badge (A1..A7, B1..B7, etc.) */}
                          <div className={`flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl font-black text-base sm:text-lg font-mono border shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                            fifoStatus.urgency === 'critical'
                              ? 'bg-red-950/90 text-red-300 border-red-500 shadow-red-500/30'
                              : fifoStatus.urgency === 'warning'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                              : fifoStatus.urgency === 'fresh'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {row.id}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-black text-white font-mono truncate">
                              {row.name}
                            </h3>

                            {/* FIFO Status Badge */}
                            {!isEmpty && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-mono font-black uppercase ${fifoStatus.badgeClass}`}>
                                {fifoStatus.urgency === 'critical' && <Flame className="w-2.5 h-2.5 animate-pulse shrink-0" />}
                                {fifoStatus.urgency === 'warning' && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                                <span className="truncate">{fifoStatus.label}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pallet Stat Badge */}
                        <div className="text-right font-mono text-[10px] shrink-0 leading-tight">
                          <span className="text-slate-400">Занято: </span>
                          <strong className="text-white font-bold">{totalOccupied}</strong>
                          <span className="text-slate-500">/26</span>
                          <div className={`font-bold text-[9px] ${freePallets > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {freePallets > 0 ? `+${freePallets} своб` : 'Заполнен'}
                          </div>
                        </div>
                      </div>

                      {/* RECENT ACTION SUMMARY SUB-BANNER */}
                      {recentActionInfo && (
                        <div className="mt-1.5 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[10px] font-mono text-slate-300 leading-tight">
                          <div className="text-amber-400 font-bold truncate">
                            {recentActionInfo.log.batchNumber} ({recentActionInfo.log.palletsCount} пал.)
                          </div>
                          <div className="text-slate-400 text-[9px] truncate">
                            Водитель: {recentActionInfo.log.operatorName}
                          </div>
                        </div>
                      )}

                      {/* LARGE BATCH NUMBER DISPLAY */}
                      {primaryBatch ? (
                        <div className="mt-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                          <div className="text-[9px] font-mono uppercase text-slate-400 leading-none">Партия:</div>
                          <div className="text-lg sm:text-xl font-black font-mono text-amber-300 tracking-tight leading-snug truncate">
                            {primaryBatch.batchNumber}
                          </div>
                          <div className="text-[10px] font-bold text-white truncate leading-tight">
                            «{primaryBatch.bottleTypeName}»
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 p-1.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-[10px] font-mono text-emerald-400 font-bold">
                          Ряд свободен (26 мест)
                        </div>
                      )}

                      {/* 7 Sections Miniature Strip inside Row */}
                      <div className="mt-2 grid grid-cols-7 gap-0.5">
                        {row.sections.map((sec) => {
                          const isSecOccupied = sec.currentPallets > 0;
                          return (
                            <div
                              key={sec.id}
                              title={`С${sec.sectionNum}: ${isSecOccupied ? `${sec.currentPallets}/${sec.capacity}п` : 'Свободно'}`}
                              className={`py-0.5 rounded text-center flex flex-col justify-between min-h-[26px] ${
                                isSecOccupied
                                  ? 'bg-slate-800 border border-amber-500/40 text-amber-300 font-bold'
                                  : 'bg-slate-950 text-slate-600 border border-slate-800/60'
                              }`}
                            >
                              <span className="text-[7px] font-mono block leading-none text-slate-500">
                                С{sec.sectionNum}
                              </span>
                              <span className="text-[8px] font-mono font-black block leading-none">
                                {isSecOccupied ? `${sec.currentPallets}` : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dual Touch Buttons (Выгрузка с фуры и Завоз в цех) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Кнопка 1: Выгрузка с фуры / Догруз */}
                      {freePallets > 0 && (
                        <button
                          type="button"
                          onClick={() => onUnloadIntoRow(row)}
                          className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 ${
                            isEmpty
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEmpty ? 'Выгрузка' : `+${freePallets}`}</span>
                        </button>
                      )}

                      {/* Кнопка 2: Завоз в цех завода */}
                      {totalOccupied > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPlantFeedForRow) {
                              onOpenPlantFeedForRow(row);
                            } else {
                              onRowClick(row);
                            }
                          }}
                          className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border active:scale-95 ${
                            fifoStatus.urgency === 'critical'
                              ? 'bg-red-500 hover:bg-red-400 text-white font-black border-red-400 shadow-md shadow-red-500/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border-emerald-400'
                          }`}
                        >
                          <Factory className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                          <span>Завоз в цех</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Field Direction Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 text-[11px] font-mono text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
        <span>ВОРОТА №1 / ВЪЕЗД В ЦЕХ</span>
        <span className="text-slate-500">← Проезд между секциями A..L →</span>
        <span>ЮЖНЫЙ ВЪЕЗД</span>
      </div>
    </div>
  );
};
