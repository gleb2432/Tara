/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { YardRow, FifoRankedBatch } from '../types/terminal';
import { formatDateRu, getUrgencyStyles, getBatchesInRow } from '../utils/fifoUtils';
import { X, CheckCircle, ArrowRightLeft, Trash2, Plus, ArrowDownToLine, Flame } from 'lucide-react';

interface RowActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: YardRow | null;
  rankedBatches: FifoRankedBatch[];
  onPick: (batchId: string, count: number) => void;
  onStartMove: (row: YardRow) => void;
  onClear: (rowId: string) => void;
  onOpenUnloadForRow?: (rowId: string) => void;
}

export const QuickCellActionModal: React.FC<RowActionModalProps> = ({
  isOpen,
  onClose,
  row,
  rankedBatches,
  onPick,
  onStartMove,
  onClear,
  onOpenUnloadForRow,
}) => {
  const [pickCount, setPickCount] = useState<number | string>(4);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const rankedMap = new Map<string, FifoRankedBatch>();
  rankedBatches.forEach((rb) => rankedMap.set(rb.id, rb));

  // Compute batches in this row
  const batchesInRow = React.useMemo(() => {
    if (!row) return [];
    return getBatchesInRow(row, rankedMap);
  }, [row, rankedBatches]);

  const activeBatch = batchesInRow.find((b) => b.batchId === selectedBatchId) || batchesInRow[0] || null;

  useEffect(() => {
    if (batchesInRow.length > 0) {
      setSelectedBatchId(batchesInRow[0].batchId);
      setPickCount(Math.min(4, batchesInRow[0].palletsCount));
    }
    setShowConfirmClear(false);
  }, [row, isOpen]);

  if (!isOpen || !row) return null;

  const totalOccupied = row.sections.reduce((acc, s) => acc + s.currentPallets, 0);
  const freePallets = Math.max(0, row.maxPallets - totalOccupied);

  const handlePickSubmit = (countToPick: number | string) => {
    if (!activeBatch) return;
    const parsed = typeof countToPick === 'string' ? (parseInt(countToPick) || 1) : countToPick;
    const finalCount = Math.min(activeBatch.palletsCount, Math.max(1, parsed));
    onPick(activeBatch.batchId, finalCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 animate-in fade-in zoom-in-95 my-3">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-800 text-amber-400 font-black text-xl font-mono border border-slate-700 shrink-0">
              {row.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white font-mono">
                  {row.name}
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {totalOccupied} / 26 пал.
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {freePallets > 0 ? `Свободно ${freePallets} из 26 мест` : 'Ряд полностью заполнен (26/26)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 7 Sections Strip preview of this row */}
        <div className="mt-3 p-2.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="font-bold text-amber-300 uppercase">Секции ряда (1–7):</span>
            <span>{totalOccupied} / 26 пал.</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {row.sections.map((sec) => {
              const isOccupied = sec.currentPallets > 0;
              return (
                <div
                  key={sec.id}
                  className={`p-1 rounded-lg border text-center flex flex-col justify-between min-h-[40px] ${
                    isOccupied
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="text-[9px] font-mono block">С{sec.sectionNum}</span>
                  <span className="text-[10px] font-mono font-black block">
                    {isOccupied ? `${sec.currentPallets}п` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3.5">
          {/* Batches in this row */}
          {batchesInRow.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>Партии в {row.name} ({batchesInRow.length}):</span>
                <span className="text-[11px] text-amber-400 font-mono">
                  Выберите партию для забора
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {batchesInRow.map((b) => {
                  const isSelected = activeBatch?.batchId === b.batchId;
                  const urgency = getUrgencyStyles(b.ranked?.urgency);

                  return (
                    <button
                      key={b.batchId}
                      type="button"
                      onClick={() => {
                        setSelectedBatchId(b.batchId);
                        setPickCount(Math.min(4, b.palletsCount));
                      }}
                      className={`min-h-[50px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/60 shadow-md'
                          : `${urgency.bg} ${urgency.border} hover:border-slate-600`
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {/* LARGE BATCH NUMBER */}
                          <span className="font-mono text-base sm:text-lg font-black text-amber-300">
                            {b.batchNumber}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {b.bottleTypeName}
                          </span>
                          {b.ranked && (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase ${urgency.badge}`}>
                              FIFO #{b.ranked.fifoRank}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                          {b.manufactureDate && (
                            <span className="text-emerald-300">
                              Изг: {formatDateRu(b.manufactureDate)}
                            </span>
                          )}
                          <span>·</span>
                          <span>до {b.expiryDate ? formatDateRu(b.expiryDate) : '—'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-amber-400 font-mono block">
                          {b.palletsCount} пал.
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isSelected ? '✓ Выбрана' : 'Выбрать'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action 1: Завезти паллеты в цех */}
              {activeBatch && (
                <div className="mt-1 p-3.5 bg-slate-950 rounded-2xl border-2 border-emerald-500/50 flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Партия к завозу в цех:</span>
                      {/* HUGE BATCH NUMBER */}
                      <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 block">
                        {activeBatch.batchNumber}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Остаток: {activeBatch.palletsCount} пал.
                    </span>
                  </div>

                  {/* Fast presets with min-h-[44px] */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 4].filter((n) => n <= activeBatch.palletsCount).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handlePickSubmit(num)}
                        className="min-h-[44px] py-2 px-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 transition-transform active:scale-95 cursor-pointer text-center flex items-center justify-center"
                      >
                        {num} пал.
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => handlePickSubmit(activeBatch.palletsCount)}
                      className="min-h-[44px] py-2 px-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer text-center flex items-center justify-center"
                    >
                      ВСЕ ({activeBatch.palletsCount})
                    </button>
                  </div>

                  {/* Manual numeric input for arbitrary count with min-h-[44px] */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      Число:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={activeBatch.palletsCount}
                      value={pickCount}
                      onChange={(e) => setPickCount(e.target.value)}
                      onBlur={() => {
                        if (pickCount === '' || Number(pickCount) < 1) {
                          setPickCount(1);
                        }
                      }}
                      className="min-h-[44px] w-20 px-2 py-1 text-center font-mono font-black text-base bg-slate-900 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handlePickSubmit(pickCount)}
                      className="min-h-[44px] flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm cursor-pointer shadow transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Завезти {pickCount || 1} пал. в цех</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center flex flex-col items-center gap-3">
              <span className="text-sm font-bold text-slate-300">
                {row.name} полностью пустой
              </span>
              <p className="text-xs text-slate-400 max-w-xs font-mono">
                Все 7 секций (26 мест) свободны. Можно выгрузить с фуры полную машину любой марки.
              </p>
            </div>
          )}

          {/* Action 2: Выгрузка с фуры / Догрузить with min-h-[48px] */}
          {freePallets > 0 && onOpenUnloadForRow && (
            <button
              type="button"
              onClick={() => {
                onOpenUnloadForRow(row.id);
                onClose();
              }}
              className="min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer shadow-md"
            >
              <ArrowDownToLine className="w-5 h-5 stroke-[3]" />
              <span>
                {totalOccupied === 0 ? 'Выгрузить с фуры в этот ряд (26 пал.)' : `Догрузить с фуры в этот ряд (${freePallets} мест)`}
              </span>
            </button>
          )}

          {/* Action 3: Очистить ряд */}
          {totalOccupied > 0 && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              {!showConfirmClear ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="min-h-[44px] text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-950/40 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Освободить {row.name}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-xs text-red-300">Очистить {row.name}?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClear(row.id);
                        onClose();
                      }}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 cursor-pointer"
                    >
                      Да, очистить
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmClear(false)}
                      className="min-h-[44px] px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
