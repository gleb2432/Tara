/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { YardRow, FifoRankedBatch } from '../types/terminal';
import { getRowFifoStatus } from '../utils/fifoUtils';
import { BarChart3, Warehouse, ArrowDownToLine } from 'lucide-react';

interface RowCapacityOverviewProps {
  rows: YardRow[];
  rankedBatches: FifoRankedBatch[];
  selectedBrandFilter: string;
  onSelectRowForUnload: (rowId: string, existingBrand?: string | null) => void;
  onScrollToRow?: (rowId: string) => void;
}

export const RowCapacityOverview: React.FC<RowCapacityOverviewProps> = ({
  rows,
  rankedBatches,
  selectedBrandFilter,
  onSelectRowForUnload,
  onScrollToRow,
}) => {
  const totalMax = rows.reduce((acc, r) => acc + r.maxPallets, 0);
  const totalOccupied = rows.reduce(
    (acc, r) => acc + r.sections.reduce((sAcc, s) => sAcc + s.currentPallets, 0),
    0
  );
  const totalFree = Math.max(0, totalMax - totalOccupied);
  const overallPercent = totalMax > 0 ? Math.round((totalOccupied / totalMax) * 100) : 0;

  const emptyRows = rows.filter((r) =>
    r.sections.every((s) => s.status === 'empty' || s.currentPallets === 0)
  );

  // Group rows by Section letter (A, B, ...)
  const sectionsGroupMap = new Map<string, YardRow[]>();
  rows.forEach((r) => {
    const letter = r.sectionLetter || r.id.charAt(0) || 'A';
    if (!sectionsGroupMap.has(letter)) {
      sectionsGroupMap.set(letter, []);
    }
    sectionsGroupMap.get(letter)!.push(r);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-xl flex flex-col gap-3.5">
      {/* Top Header with Live Statistics & FIFO Color Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide font-mono">
                12 Секций (A–L, {rows.length} рядов) · FIFO Монитор
              </h3>
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            {/* Traffic-light legend */}
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Красный: критический FIFO
              </span>
              <span className="flex items-center gap-1 text-amber-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Желтый: очередь
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Свежая
              </span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats Badges */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Занято:</span>
            <span className="font-bold text-white">
              {totalOccupied} / {totalMax}
            </span>
            <span className="text-amber-400 font-black">({overallPercent}%)</span>
          </div>

          <div className="flex px-2.5 py-1 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 font-bold items-center gap-1 text-[11px]">
            <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
            <span>Свободно: {emptyRows.length} из {rows.length}</span>
          </div>
        </div>
      </div>

      {/* Grouped by Section (Section A, Section B, ...) */}
      <div className="flex flex-col gap-3">
        {Array.from(sectionsGroupMap.entries()).map(([sectionLetter, sectionRows]) => {
          const secCap = sectionRows.reduce((a, r) => a + r.maxPallets, 0);
          const secOcc = sectionRows.reduce(
            (a, r) => a + r.sections.reduce((sa, s) => sa + s.currentPallets, 0),
            0
          );
          const secPercent = secCap > 0 ? Math.round((secOcc / secCap) * 100) : 0;

          return (
            <div key={sectionLetter} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 text-xs font-mono">
                <span className="font-black text-amber-400 uppercase tracking-wider">
                  СЕКЦИЯ {sectionLetter} ({sectionRows.map((r) => r.id).join(', ')})
                </span>
                <span className="text-slate-400 text-[11px]">
                  Занято: <strong className="text-white">{secOcc}</strong>/{secCap} пал. ({secPercent}%)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {sectionRows.map((row) => {
                  const occupied = row.sections.reduce((acc, s) => acc + s.currentPallets, 0);
                  const free = Math.max(0, row.maxPallets - occupied);
                  const percent = Math.min(100, Math.round((occupied / row.maxPallets) * 100));

                  const brandsInRow = Array.from(
                    new Set(
                      row.sections
                        .filter((s) => s.status === 'occupied' && s.bottleTypeName && s.currentPallets > 0)
                        .map((s) => s.bottleTypeName!)
                    )
                  );

                  const isEmpty = occupied === 0;
                  const isFull = free === 0;
                  const isMatchingFilter =
                    selectedBrandFilter !== 'all' &&
                    brandsInRow.some((b) => b.toLowerCase() === selectedBrandFilter.toLowerCase());

                  const fifoStatus = getRowFifoStatus(row, rankedBatches);

                  return (
                    <div
                      key={row.id}
                      onClick={() => onScrollToRow && onScrollToRow(row.id)}
                      className={`group p-2.5 rounded-2xl bg-slate-950 transition-all flex flex-col justify-between min-h-[92px] relative cursor-pointer border ${fifoStatus.borderClass} ${
                        isMatchingFilter ? 'ring-2 ring-amber-400 shadow-md' : ''
                      }`}
                    >
                      {/* Row number & status */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-black text-white">
                          Ряд {row.id}
                        </span>

                        <span
                          className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded leading-tight ${fifoStatus.badgeClass}`}
                        >
                          {percent}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="my-1 space-y-0.5">
                        <div className="relative w-full h-2.5 bg-slate-900 rounded-md overflow-hidden border border-slate-800 flex">
                          <div
                            style={{ width: `${percent}%` }}
                            className={`h-full transition-all duration-500 rounded-xs ${fifoStatus.barClass}`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="font-bold text-white">{occupied}п</span>
                          <span className={free > 0 ? 'text-amber-400' : 'text-slate-600'}>
                            {free > 0 ? `+${free}` : 'полн'}
                          </span>
                        </div>
                      </div>

                      {/* Touch button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRowForUnload(row.id, brandsInRow[0] || null);
                        }}
                        disabled={isFull}
                        className={`w-full min-h-[28px] py-1 px-1 rounded-lg text-[9px] font-bold font-mono transition-all flex items-center justify-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isEmpty
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : isMatchingFilter
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <ArrowDownToLine className="w-2.5 h-2.5 shrink-0" />
                        <span>{isEmpty ? '26п' : isFull ? '—' : `+${free}`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
