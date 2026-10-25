/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OperationLogEntry } from '../types/terminal';
import { 
  ClipboardList, 
  Truck, 
  ArrowRightLeft, 
  CheckCircle2, 
  Download, 
  RotateCcw,
  User
} from 'lucide-react';

interface HistoryLogModalProps {
  logs: OperationLogEntry[];
  onResetData: () => void;
  onExportJson: () => void;
  onFocusActionOnMap?: (log: OperationLogEntry) => void;
}

export const HistoryLogModal: React.FC<HistoryLogModalProps> = ({
  logs,
  onResetData,
  onExportJson,
  onFocusActionOnMap,
}) => {
  const [filterAction, setFilterAction] = React.useState<string>('all');

  const filteredLogs = React.useMemo(() => {
    if (filterAction === 'all') return logs;
    return logs.filter((l) => l.action === filterAction);
  }, [logs, filterAction]);

  const getActionBadge = (action: OperationLogEntry['action']) => {
    switch (action) {
      case 'unload':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Truck className="w-3 h-3" />
            <span>Выгрузка с фуры</span>
          </span>
        );
      case 'pickup':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Завоз в цех</span>
          </span>
        );
      case 'move':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <ArrowRightLeft className="w-3 h-3" />
            <span>Перемещение ряда</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            Корректировка
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 text-amber-400 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Журнал операций терминала</h2>
            <p className="text-xs text-slate-400">
              История выгрузок с фур, завоза партий в цех и перемещений между рядами
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Экспорт данных</span>
          </button>
          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-lg border border-red-800/80 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс на демо</span>
          </button>
        </div>
      </div>

      {/* Action Type Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-mono text-slate-400 font-bold uppercase shrink-0">Фильтр:</span>
        <button
          onClick={() => setFilterAction('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterAction === 'all'
              ? 'bg-amber-400 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          Все действия ({logs.length})
        </button>
        <button
          onClick={() => setFilterAction('unload')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            filterAction === 'unload'
              ? 'bg-amber-400 text-slate-950 font-black'
              : 'bg-slate-900 text-amber-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Truck className="w-3 h-3" />
          <span>Выгрузка с фуры</span>
        </button>
        <button
          onClick={() => setFilterAction('pickup')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            filterAction === 'pickup'
              ? 'bg-emerald-400 text-slate-950 font-black'
              : 'bg-slate-900 text-emerald-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Завоз в цех</span>
        </button>
        <button
          onClick={() => setFilterAction('move')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            filterAction === 'move'
              ? 'bg-blue-400 text-slate-950 font-black'
              : 'bg-slate-900 text-blue-300 border border-slate-800 hover:bg-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span>Перемещение</span>
        </button>
      </div>

      {/* Logs Table / List */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3">
        {filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            История операций для данного фильтра пуста
          </p>
        ) : (
          filteredLogs.map((log) => {
            const hasRow = Boolean(log.rowId || log.targetRowId || log.sectionId);
            return (
              <div
                key={log.id}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-400 text-[11px] font-bold">{log.timestamp}</span>
                    {getActionBadge(log.action)}
                    <span className="font-mono font-bold text-amber-400">{log.batchNumber}</span>
                    {log.vehiclePlate && (
                      <span className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                        {log.vehiclePlate}
                      </span>
                    )}
                  </div>

                  <div className="text-white font-medium">
                    {log.bottleTypeName} ·{' '}
                    <strong className="text-amber-300 font-mono">{log.palletsCount} паллет</strong>
                  </div>

                  {log.notes && (
                    <p className="text-slate-400 text-[11px] italic">
                      {log.notes}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{log.operatorName}</span>
                  </div>

                  {(log.rowId || log.targetRowId) && (
                    <div className="font-mono text-[11px] text-amber-400 font-bold">
                      {log.targetRowId ? `Ряд ${log.rowId} → Ряд ${log.targetRowId}` : `Ряд ${log.rowId}`}
                    </div>
                  )}

                  {onFocusActionOnMap && hasRow && (
                    <button
                      type="button"
                      onClick={() => onFocusActionOnMap(log)}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-mono text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                    >
                      <span>🎯 Показать на карте</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
