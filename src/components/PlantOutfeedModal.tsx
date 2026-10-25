/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FifoRankedBatch, YardRow } from '../types/terminal';
import { formatDateRu, getUrgencyStyles, getSectionItems } from '../utils/fifoUtils';
import { X, CheckCircle2, Factory, Flame, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface PlantOutfeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: YardRow[];
  rankedBatches: FifoRankedBatch[];
  onFeedToPlant: (batchId: string, count: number, rowId: string) => void;
}

export const PlantOutfeedModal: React.FC<PlantOutfeedModalProps> = ({
  isOpen,
  onClose,
  rows,
  rankedBatches,
  onFeedToPlant,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    rankedBatches[0]?.id || ''
  );
  const [feedCount, setFeedCount] = useState<number | string>(4);

  if (!isOpen) return null;

  const activeBatch = rankedBatches.find((b) => b.id === selectedBatchId) || rankedBatches[0] || null;

  // Find which row contains this batch
  const containingRow = activeBatch
    ? rows.find((r) =>
        r.sections.some((s) =>
          s.status === 'occupied' &&
          getSectionItems(s).some((it) => it.batchId === activeBatch.id)
        )
      )
    : null;

  const palletsInThisRow = containingRow && activeBatch
    ? containingRow.sections.reduce((sum, s) => {
        const matchingItem = getSectionItems(s).find((it) => it.batchId === activeBatch.id);
        return sum + (matchingItem ? matchingItem.palletsCount : 0);
      }, 0)
    : (activeBatch?.remainingPallets || 0);

  const handleSubmit = (countToFeed: number | string) => {
    if (!activeBatch || !containingRow) return;
    const parsed = typeof countToFeed === 'string' ? (parseInt(countToFeed) || 1) : countToFeed;
    const finalCount = Math.min(palletsInThisRow, Math.max(1, parsed));

    onFeedToPlant(activeBatch.id, finalCount, containingRow.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 my-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 font-black">
              <Factory className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-mono">
                  Завоз в цех (Подача со склада на розлив)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                  ОЧЕРЕДЬ FIFO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Завозите паллетные партии из ячеек склада прямо на розлив. Цех сразу увидит поступившую партию!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {rankedBatches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono text-sm">
            На складе нет паллет для завоза в цех. Сначала выполните «Выгрузку с фуры».
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {/* Step 1: List of candidate batches sorted by FIFO */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between mb-2">
                <span>1. Выберите партию для завоза в цех (строго по FIFO):</span>
                <span className="text-[11px] font-mono text-amber-400">
                  Старейшие сверху
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {rankedBatches.map((batch) => {
                  const isSelected = activeBatch?.id === batch.id;
                  const urgency = getUrgencyStyles(batch.urgency);
                  const rowWithBatch = rows.find((r) =>
                    r.sections.some((s) =>
                      getSectionItems(s).some((it) => it.batchId === batch.id)
                    )
                  );

                  return (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBatchId(batch.id);
                        setFeedCount(Math.min(4, batch.remainingPallets));
                      }}
                      className={`min-h-[52px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/60 shadow-lg'
                          : `${urgency.bg} ${urgency.border} hover:border-slate-600`
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {/* Large Batch Number */}
                          <span className="font-mono text-base font-black text-amber-300">
                            {batch.batchNumber}
                          </span>
                          <span className="text-xs font-bold text-white">
                            ({batch.bottleTypeName})
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase ${urgency.badge}`}>
                            FIFO #{batch.fifoRank}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                          <span className="text-emerald-300 font-bold">
                            Место: {rowWithBatch?.name || 'Ряд'}
                          </span>
                          <span>·</span>
                          <span>Изг: {formatDateRu(batch.manufactureDate)}</span>
                          <span>·</span>
                          <span>Остаток: <strong className="text-white">{batch.remainingPallets} пал.</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400 block">
                          {isSelected ? '✓ Выбрана' : 'Выбрать'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Feed Configuration with Large Batch display */}
            {activeBatch && containingRow && (
              <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-500/60 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                      Партия к завозу в цех:
                    </span>
                    {/* BOLD LARGE NUMBERS */}
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight block">
                      {activeBatch.batchNumber}
                    </span>
                    <span className="text-xs font-mono text-slate-300 mt-0.5 block">
                      Марка: <strong className="text-white">{activeBatch.bottleTypeName}</strong> · Из ряда: <strong className="text-emerald-300">{containingRow.name}</strong>
                    </span>
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs">
                    <span className="text-slate-400 block">Доступно в этом ряду:</span>
                    <span className="text-xl font-black text-white">{palletsInThisRow} пал.</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                    Количество паллет для завоза в цех:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 4].filter((n) => n <= palletsInThisRow).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSubmit(num)}
                        className="min-h-[44px] py-2 px-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl font-bold text-xs border border-slate-700 transition-transform active:scale-95 cursor-pointer text-center flex items-center justify-center"
                      >
                        {num} пал.
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleSubmit(palletsInThisRow)}
                      className="min-h-[44px] py-2 px-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer text-center flex items-center justify-center"
                    >
                      ВСЕ ({palletsInThisRow})
                    </button>
                  </div>
                </div>

                {/* Custom numeric input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    Свое число:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={palletsInThisRow}
                    value={feedCount}
                    onChange={(e) => setFeedCount(e.target.value)}
                    onBlur={() => {
                      if (!feedCount || Number(feedCount) < 1) {
                        setFeedCount(1);
                      }
                    }}
                    className="min-h-[44px] w-20 px-2 py-1 text-center font-mono font-black text-base bg-slate-900 border border-slate-700 rounded-xl text-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleSubmit(feedCount)}
                    className="min-h-[44px] flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Factory className="w-4 h-4 stroke-[2.5]" />
                    <span>Завезти {feedCount || 1} паллет в цех</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
