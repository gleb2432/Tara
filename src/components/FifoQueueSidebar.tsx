/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FifoRankedBatch } from '../types/terminal';
import { formatDateRu, getUrgencyStyles } from '../utils/fifoUtils';
import { 
  Flame, 
  MapPin, 
  ArrowRight, 
  Calendar, 
  Layers, 
  Truck,
  CheckCircle2
} from 'lucide-react';

interface FifoQueueSidebarProps {
  rankedBatches: FifoRankedBatch[];
  highlightedBatchId: string | null;
  onSelectBatchId: (batchId: string) => void;
  onQuickPick: (batchId: string, palletsCount: number) => void;
}

export const FifoQueueSidebar: React.FC<FifoQueueSidebarProps> = ({
  rankedBatches,
  highlightedBatchId,
  onSelectBatchId,
  onQuickPick,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Очередь забора по FIFO</h3>
            <p className="text-[11px] text-slate-400">
              Сортировка по возрастанию срока годности (сначала старые)
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 text-amber-400 rounded-lg border border-slate-700">
          {rankedBatches.length} партий
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {rankedBatches.map((batch) => {
          const isSelected = highlightedBatchId === batch.id;
          const styles = getUrgencyStyles(batch.urgency);

          return (
            <div
              key={batch.id}
              onClick={() => onSelectBatchId(batch.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                  : `${styles.bg} ${styles.border} hover:border-slate-600`
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold uppercase rounded ${
                      styles.badge
                    } ${batch.fifoRank === 1 ? 'animate-pulse' : ''}`}
                  >
                    FIFO #{batch.fifoRank}
                  </span>
                  {batch.isOldestOverall && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                      ★ САМАЯ СТАРАЯ
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-red-300">
                    до {formatDateRu(batch.expiryDate)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {batch.daysUntilExpiry} дн.
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                {/* LARGE BATCH NUMBER */}
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
                  {batch.batchNumber}
                </span>
                <span className="text-sm font-bold text-white">
                  {batch.bottleTypeName}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-white/10 font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Секции:{' '}
                    <strong className="text-amber-400 font-bold">
                      {batch.sectionIds && batch.sectionIds.length > 0
                        ? batch.sectionIds.join(', ')
                        : 'Не назначено'}
                    </strong>
                    {batch.manufactureDate && (
                      <span className="text-slate-400 ml-1">
                        (изг: {formatDateRu(batch.manufactureDate).slice(0, 6)})
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-slate-300">
                  Остаток:{' '}
                  <strong className="text-white font-bold">{batch.remainingPallets}</strong> /{' '}
                  {batch.totalPallets} пал
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBatchId(batch.id);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Подсветить на схеме поля</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickPick(batch.id, Math.min(4, batch.remainingPallets));
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Взять 4 пал.</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
