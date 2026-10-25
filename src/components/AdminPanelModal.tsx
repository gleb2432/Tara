/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { YardRow, BottleBatch, FifoRankedBatch } from '../types/terminal';
import { createSectionsForRow } from '../data/initialData';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  Download, 
  Plus, 
  FileSpreadsheet, 
  FileCode, 
  Warehouse, 
  Layers, 
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: YardRow[];
  batches: BottleBatch[];
  rankedBatches: FifoRankedBatch[];
  onAddRow: (newRow: YardRow) => void;
  onDeleteRow: (rowId: string) => void;
  onClearRow: (rowId: string) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  rows,
  batches,
  rankedBatches,
  onAddRow,
  onDeleteRow,
  onClearRow,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  // New row form state
  const [targetSection, setTargetSection] = useState<'A' | 'B' | 'custom'>('A');
  const [customSectionLetter, setCustomSectionLetter] = useState('C');
  const [newRowNumber, setNewRowNumber] = useState<number>(8);
  const [newRowDescription, setNewRowDescription] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'admin2026') {
      setIsAuthenticated(true);
      setAuthError(false);
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  };

  // Group rows by section letter
  const sectionsMap = new Map<string, YardRow[]>();
  rows.forEach((r) => {
    const letter = r.sectionLetter || r.id.charAt(0) || 'A';
    if (!sectionsMap.has(letter)) {
      sectionsMap.set(letter, []);
    }
    sectionsMap.get(letter)!.push(r);
  });

  const totalCapacity = rows.reduce((acc, r) => acc + r.maxPallets, 0);
  const totalOccupied = rows.reduce(
    (acc, r) => acc + r.sections.reduce((sAcc, s) => sAcc + s.currentPallets, 0),
    0
  );
  const totalFree = Math.max(0, totalCapacity - totalOccupied);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Breakdown by brand
  const brandStatsMap = new Map<string, { pallets: number; rows: Set<string> }>();
  rows.forEach((r) => {
    r.sections.forEach((s) => {
      if (s.status === 'occupied' && s.bottleTypeName && s.currentPallets > 0) {
        if (!brandStatsMap.has(s.bottleTypeName)) {
          brandStatsMap.set(s.bottleTypeName, { pallets: 0, rows: new Set() });
        }
        const b = brandStatsMap.get(s.bottleTypeName)!;
        b.pallets += s.currentPallets;
        b.rows.add(r.name);
      }
    });
  });

  // 1. Export CSV formatted for Excel with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = [
      'Секция',
      'Ряд',
      'Вместимость (паллет)',
      'Занято (паллет)',
      'Свободно (паллет)',
      'Заполнение (%)',
      'Марка бутылки',
      'Номер партии',
      'Дата выработки',
      'Срок годности',
      'FIFO ранг',
      'Статус срока',
      'Автомобиль',
    ];

    const lines: string[] = [];
    lines.push(headers.join(';'));

    rows.forEach((r) => {
      const occupiedInRow = r.sections.reduce((acc, s) => acc + s.currentPallets, 0);
      const freeInRow = Math.max(0, r.maxPallets - occupiedInRow);
      const percent = Math.round((occupiedInRow / r.maxPallets) * 100);

      // Collect distinct batches in this row
      const batchesInRow = Array.from(
        new Set(r.sections.filter((s) => s.batchId && s.currentPallets > 0).map((s) => s.batchId!))
      );

      if (batchesInRow.length === 0) {
        // Empty row line
        lines.push(
          [
            `Секция ${r.sectionLetter || 'A'}`,
            `"${r.name}"`,
            r.maxPallets,
            0,
            r.maxPallets,
            '0%',
            'СВОБОДЕН',
            '—',
            '—',
            '—',
            '—',
            'Свободен',
            '—',
          ].join(';')
        );
      } else {
        batchesInRow.forEach((bId) => {
          const sampleSec = r.sections.find((s) => s.batchId === bId);
          const count = r.sections
            .filter((s) => s.batchId === bId)
            .reduce((acc, s) => acc + s.currentPallets, 0);
          const ranked = rankedBatches.find((rb) => rb.id === bId);

          lines.push(
            [
              `Секция ${r.sectionLetter || 'A'}`,
              `"${r.name}"`,
              r.maxPallets,
              count,
              freeInRow,
              `${percent}%`,
              `"${sampleSec?.bottleTypeName || 'Бутылка'}"`,
              `"${sampleSec?.batchNumber || 'ПАРТИЯ'}"`,
              sampleSec?.manufactureDate || '—',
              sampleSec?.expiryDate || '—',
              ranked ? `#${ranked.fifoRank}` : '—',
              ranked ? (ranked.urgency === 'critical' ? 'Критический FIFO' : ranked.urgency === 'warning' ? 'Очередь' : 'Свежая') : 'Норма',
              `"${sampleSec?.vehiclePlate || '—'}"`,
            ].join(';')
          );
        });
      }
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminal_stat_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. Export full JSON
  const handleExportJson = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      reportName: 'Сводный отчет терминала открытого хранения стеклотары',
      summary: {
        totalRows: rows.length,
        totalCapacity,
        totalOccupied,
        totalFree,
        occupancyPercent: `${occupancyPercent}%`,
      },
      rows,
      batches,
      rankedBatches,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminal_database_dump_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. Add new row to section
  const handleCreateRow = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLetter = (targetSection === 'custom' ? customSectionLetter : targetSection).trim().toUpperCase() || 'A';
    const finalNumber = Number(newRowNumber) || 1;
    const finalId = `${finalLetter}${finalNumber}`;

    if (rows.some((r) => r.id.toLowerCase() === finalId.toLowerCase())) {
      alert(`Ряд с идентификатором ${finalId} уже существует на складе!`);
      return;
    }

    const newRow: YardRow = {
      id: finalId,
      name: `Ряд ${finalId}`,
      sectionLetter: finalLetter,
      rowNumber: finalNumber,
      maxPallets: 26,
      description: newRowDescription.trim() || `Добавлен администратором в Секцию ${finalLetter}`,
      sections: createSectionsForRow(finalId),
    };

    onAddRow(newRow);
    setNewRowDescription('');
    setNewRowNumber((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 my-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white font-mono flex items-center gap-2">
                <span>Панель Администратора</span>
                {isAuthenticated && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ДОСТУП РАЗРЕШЕН
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Управление секциями A и B, добавление рядов и экспорт полной статистики
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

        {/* ===================== AUTH SCREEN ===================== */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="py-8 flex flex-col items-center justify-center gap-4 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Требуется пароль администратора</h3>
              <p className="text-xs text-slate-400 mt-1">
                Для настройки структуры рядов и скачивания отчетов введите установленный пароль
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              <input
                type="password"
                placeholder="Введите пароль..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(false);
                }}
                className={`w-full px-4 py-3 text-center text-lg font-mono font-black bg-slate-950 border-2 rounded-2xl text-amber-300 focus:outline-none ${
                  authError
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-slate-700 focus:border-amber-400'
                }`}
                autoFocus
              />

              {authError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>Неверный пароль. Попробуйте еще раз.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] py-3 text-sm font-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Войти в админ-панель</span>
            </button>
          </form>
        ) : (
          /* ===================== AUTHENTICATED ADMIN DASHBOARD ===================== */
          <div className="mt-4 flex flex-col gap-5">
            {/* 1. Сводная статистика склада */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4" />
                  <span>Сводные показатели терминала</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Всего рядов: <strong>{rows.length}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Вместимость</span>
                  <span className="text-base font-black text-white font-mono">{totalCapacity} пал.</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Занято</span>
                  <span className="text-base font-black text-amber-400 font-mono">{totalOccupied} пал.</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Свободно</span>
                  <span className="text-base font-black text-emerald-400 font-mono">{totalFree} мест</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Загрузка</span>
                  <span className="text-base font-black text-white font-mono">{occupancyPercent}%</span>
                </div>
              </div>

              {/* Breakdown by sections */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                {Array.from(sectionsMap.entries()).map(([letter, secRows]) => {
                  const secCapacity = secRows.reduce((a, r) => a + r.maxPallets, 0);
                  const secOccupied = secRows.reduce(
                    (a, r) => a + r.sections.reduce((sa, s) => sa + s.currentPallets, 0),
                    0
                  );
                  return (
                    <div key={letter} className="p-2 bg-slate-900 rounded-xl text-xs font-mono flex items-center justify-between">
                      <span className="font-bold text-white">Секция {letter} ({secRows.length} ряд.):</span>
                      <span className="text-amber-300 font-bold">{secOccupied} / {secCapacity} пал.</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Кнопки выкачивания полной статистики (Excel / CSV и JSON) */}
            <div className="p-4 bg-slate-950 rounded-2xl border-2 border-amber-500/50 flex flex-col gap-2.5">
              <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                <span>Выкачать полную статистику склада</span>
              </span>
              <p className="text-xs text-slate-400">
                Экспорт детализированного отчета со всеми рядами, номерами партий, датами изготовления и сроками годности.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="min-h-[44px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                  <span>Скачать Excel / CSV (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>Скачать JSON-дамп (.json)</span>
                </button>
              </div>
            </div>

            {/* 3. Добавление нового ряда в секции */}
            <form onSubmit={handleCreateRow} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Добавить новый ряд на склад</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Выбор секции */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Секция:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSection('A');
                        const curCount = sectionsMap.get('A')?.length || 7;
                        setNewRowNumber(curCount + 1);
                      }}
                      className={`min-h-[40px] py-1 text-xs font-bold font-mono rounded-lg border ${
                        targetSection === 'A'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      Секция A
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSection('B');
                        const curCount = sectionsMap.get('B')?.length || 7;
                        setNewRowNumber(curCount + 1);
                      }}
                      className={`min-h-[40px] py-1 text-xs font-bold font-mono rounded-lg border ${
                        targetSection === 'B'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      Секция B
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetSection('custom')}
                      className={`min-h-[40px] py-1 text-xs font-bold font-mono rounded-lg border ${
                        targetSection === 'custom'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      Другая
                    </button>
                  </div>
                </div>

                {/* Номер ряда */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Номер ряда:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={newRowNumber}
                    onChange={(e) => setNewRowNumber(parseInt(e.target.value) || 1)}
                    className="min-h-[40px] w-full px-3 py-1.5 text-center font-mono font-black text-sm bg-slate-900 border border-slate-700 rounded-lg text-amber-300"
                    required
                  />
                </div>

                {/* Итоговый идентификатор */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Идентификатор ряда:
                  </label>
                  <div className="min-h-[40px] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center font-mono font-black text-amber-400 text-sm">
                    {targetSection === 'custom' ? customSectionLetter : targetSection}{newRowNumber} (26 пал.)
                  </div>
                </div>
              </div>

              {targetSection === 'custom' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Буква новой секции (напр: C, D):
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={customSectionLetter}
                    onChange={(e) => setCustomSectionLetter(e.target.value.toUpperCase())}
                    className="min-h-[40px] w-32 px-3 py-1.5 text-center font-mono font-black text-sm bg-slate-900 border border-slate-700 rounded-lg text-amber-300"
                    placeholder="C"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Примечание к ряду (необязательно):
                </label>
                <input
                  type="text"
                  placeholder="напр: Новый расширенный ряд 26 мест"
                  value={newRowDescription}
                  onChange={(e) => setNewRowDescription(e.target.value)}
                  className="min-h-[40px] w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 mt-1"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Добавить Ряд {targetSection === 'custom' ? customSectionLetter : targetSection}{newRowNumber} (26 мест)</span>
              </button>
            </form>

            {/* 4. Текущий список всех рядов с опцией очистки/удаления */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
                Все ряды на складе ({rows.length} шт.):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {rows.map((r) => {
                  const occ = r.sections.reduce((a, s) => a + s.currentPallets, 0);
                  const isCustom = !['A1','A2','A3','A4','A5','A6','A7','B1','B2','B3','B4','B5','B6','B7'].includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-white block">{r.name}</span>
                        <span className="text-[10px] text-slate-400">{occ}/26 пал.</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {occ > 0 && (
                          <button
                            type="button"
                            onClick={() => onClearRow(r.id)}
                            title={`Очистить ряд ${r.id}`}
                            className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCustom && occ === 0 && (
                          <button
                            type="button"
                            onClick={() => onDeleteRow(r.id)}
                            title={`Удалить ряд ${r.id}`}
                            className="p-1 text-red-400 hover:text-red-300 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Выйти из режима админа
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
