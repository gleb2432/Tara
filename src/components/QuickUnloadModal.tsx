/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { YardRow } from '../types/terminal';
import { SECTION_LETTERS } from '../data/initialData';
import { findSmartRowForBrand } from '../utils/fifoUtils';
import { 
  X, 
  Check, 
  Sparkles, 
  Plus, 
  Minus,
  Trash2, 
  Truck, 
  Lock, 
  PenTool,
  Hash,
  Calendar,
  Layers
} from 'lucide-react';

export interface MultiBatchItem {
  id: string;
  manufactureDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  pallets: number | string;
}

interface QuickUnloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: YardRow[];
  initialRowId: string | null;
  initialSectionNum?: number | null;
  initialBrandName?: string | null;
  initialMode?: 'truck' | 'manual';
  knownBrands: string[];
  onConfirmMultiple: (data: {
    rowId: string;
    bottleTypeName: string;
    vehiclePlate: string;
    batches: Array<{
      manufactureDate: string;
      expiryDate: string;
      palletsCount: number;
    }>;
  }) => void;
  onConfirmManualPlacement: (data: {
    rowId: string;
    sectionNum: number;
    sectionId: string;
    bottleTypeName: string;
    palletsCount: number;
    manufactureDate: string;
    expiryDate: string;
    vehiclePlate: string;
    fillConsecutive: boolean;
  }) => void;
}

export const QuickUnloadModal: React.FC<QuickUnloadModalProps> = ({
  isOpen,
  onClose,
  rows,
  initialRowId,
  initialSectionNum,
  initialBrandName,
  initialMode = 'truck',
  knownBrands,
  onConfirmMultiple,
  onConfirmManualPlacement,
}) => {
  const [mode, setMode] = useState<'truck' | 'manual'>(initialMode);

  // Common / Row state
  const [selectedRowId, setSelectedRowId] = useState<string>(initialRowId || rows[0]?.id || '1');
  const [selectedSectionNum, setSelectedSectionNum] = useState<number | null>(initialSectionNum || null);
  const [brandName, setBrandName] = useState<string>(initialBrandName || 'Бад (Bud)');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultExpStr = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  })();

  // Total Truck Pallets state
  const [totalTruckPallets, setTotalTruckPallets] = useState<number | string>(26);

  // Multi-batch list for truck mode
  const [batchItems, setBatchItems] = useState<MultiBatchItem[]>([
    {
      id: 'sub-1',
      manufactureDate: todayStr,
      expiryDate: defaultExpStr,
      pallets: 26,
    },
  ]);

  // Manual Mode state: Row (1..12), Section (1..7), and ANY Pallet Quantity
  const [manualRowId, setManualRowId] = useState<string>(initialRowId || '1');
  const [manualSectionNum, setManualSectionNum] = useState<number>(initialSectionNum || 1);
  const [manualPallets, setManualPallets] = useState<number | string>(7);
  const [manualBrand, setManualBrand] = useState<string>(initialBrandName || 'Бад (Bud)');
  const [manualDate, setManualDate] = useState<string>(todayStr);
  const [manualExpiry, setManualExpiry] = useState<string>(defaultExpStr);
  const [manualPlate, setManualPlate] = useState<string>('');
  const [fillConsecutive, setFillConsecutive] = useState<boolean>(true);

  // Sync initial props
  useEffect(() => {
    if (initialRowId) {
      setSelectedRowId(initialRowId);
      setManualRowId(initialRowId);
    }
  }, [initialRowId]);

  useEffect(() => {
    if (initialSectionNum) {
      setSelectedSectionNum(initialSectionNum);
      setManualSectionNum(initialSectionNum);
    }
  }, [initialSectionNum]);

  useEffect(() => {
    if (initialBrandName) {
      setBrandName(initialBrandName);
      setManualBrand(initialBrandName);
    }
  }, [initialBrandName]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  // Evaluate row statuses according to warehouse rules:
  const rowEvaluations = useMemo(() => {
    const trimmedBrand = brandName.trim().toLowerCase();

    return rows.map((r) => {
      const occupied = r.sections.reduce((acc, s) => acc + s.currentPallets, 0);
      const free = Math.max(0, r.maxPallets - occupied);

      const brandsInRow = Array.from(
        new Set(
          r.sections
            .filter((s) => s.status === 'occupied' && s.bottleTypeName && s.currentPallets > 0)
            .map((s) => s.bottleTypeName!)
        )
      );

      let status: 'empty' | 'matching' | 'mismatch' | 'full' = 'empty';
      let isSelectable = false;
      let badgeLabel = '';
      let explanation = '';

      if (occupied === 0) {
        status = 'empty';
        isSelectable = true;
        badgeLabel = 'Пустой (26 мест)';
        explanation = 'Полностью пустой ряд — можно разгрузить любую марку (все 26 мест свободны)';
      } else if (free === 0) {
        status = 'full';
        isSelectable = false;
        badgeLabel = 'Заполнен (26/26)';
        explanation = 'Ряд полностью заполнен, свободных мест нет';
      } else if (
        brandsInRow.length > 0 &&
        brandsInRow.every((b) => b.trim().toLowerCase() === trimmedBrand)
      ) {
        status = 'matching';
        isSelectable = true;
        badgeLabel = `Догруз (та же марка, ${free} мест)`;
        explanation = `Стоит та же партия «${brandsInRow[0]}» (${occupied} пал.). Свободно ${free} мест под догруз!`;
      } else {
        status = 'mismatch';
        isSelectable = false;
        badgeLabel = `Занят: ${brandsInRow[0] || 'другой маркой'}`;
        explanation = `В ряду уже стоит другая марка «${brandsInRow.join(', ')}». Смешивание разных марок в одном ряду запрещено!`;
      }

      return {
        row: r,
        occupied,
        free,
        brandsInRow,
        status,
        isSelectable,
        badgeLabel,
        explanation,
      };
    });
  }, [rows, brandName]);

  // If the currently selected row is not selectable with the current brand, auto-switch to a valid one
  useEffect(() => {
    const currentEval = rowEvaluations.find((e) => e.row.id === selectedRowId);
    if (!currentEval || !currentEval.isSelectable) {
      const firstMatching = rowEvaluations.find((e) => e.status === 'matching');
      const firstEmpty = rowEvaluations.find((e) => e.status === 'empty');
      const fallback = firstMatching || firstEmpty;
      if (fallback) {
        setSelectedRowId(fallback.row.id);
        setManualRowId(fallback.row.id);
      }
    }
  }, [rowEvaluations, selectedRowId]);

  const currentRow = rows.find((r) => r.id === selectedRowId) || rows[0];
  const occupiedInCurrentRow = currentRow
    ? currentRow.sections.reduce((acc, s) => acc + s.currentPallets, 0)
    : 0;
  const freeInCurrentRow = currentRow ? Math.max(0, currentRow.maxPallets - occupiedInCurrentRow) : 0;

  const totalPalletsInTruck = batchItems.reduce(
    (acc, item) => acc + (typeof item.pallets === 'string' ? (parseInt(item.pallets) || 0) : item.pallets),
    0
  );

  const parsedTotalTruckPallets = typeof totalTruckPallets === 'string'
    ? (parseInt(totalTruckPallets) || 0)
    : totalTruckPallets;

  const smartRecommendation = findSmartRowForBrand(rows, brandName, totalPalletsInTruck || 26);

  // Section allocations simulation for the 7 sections of the row
  const sectionAllocations = useMemo(() => {
    if (!currentRow) return [];
    let remaining = totalPalletsInTruck;

    return currentRow.sections.map((sec) => {
      const isSecEmpty = sec.status === 'empty' || sec.currentPallets === 0;
      const freeSpace = isSecEmpty ? sec.capacity : Math.max(0, sec.capacity - sec.currentPallets);
      let willAdd = 0;
      if (remaining > 0 && freeSpace > 0) {
        willAdd = Math.min(freeSpace, remaining);
        remaining -= willAdd;
      }

      return {
        section: sec,
        willAdd,
        isTarget: selectedSectionNum === sec.sectionNum,
      };
    });
  }, [currentRow, totalPalletsInTruck, selectedSectionNum]);

  // Handler: Change total truck capacity via preset buttons (26, 20, 13) or custom input
  const handleSetTotalTruckVolume = (newTotal: number) => {
    setTotalTruckPallets(newTotal);

    // Auto-adjust sub-batches to sum to newTotal
    const count = batchItems.length;
    if (count === 1) {
      setBatchItems([
        {
          ...batchItems[0],
          pallets: newTotal,
        },
      ]);
    } else {
      const baseVal = Math.floor(newTotal / count);
      const remainder = newTotal % count;

      setBatchItems((prev) =>
        prev.map((item, idx) => ({
          ...item,
          pallets: idx === 0 ? baseVal + remainder : baseVal,
        }))
      );
    }
  };

  // Handler: Change number of sub-batches / dates in the truck (1 to 4)
  const handleSetSubBatchCount = (targetCount: number) => {
    if (targetCount < 1 || targetCount > 4) return;
    const currentCount = batchItems.length;
    const total = parsedTotalTruckPallets || 26;

    if (targetCount === currentCount) return;

    if (targetCount < currentCount) {
      // Reduce items
      const newItems = batchItems.slice(0, targetCount);
      const baseVal = Math.floor(total / targetCount);
      const remainder = total % targetCount;
      setBatchItems(
        newItems.map((item, idx) => ({
          ...item,
          pallets: idx === 0 ? baseVal + remainder : baseVal,
        }))
      );
    } else {
      // Expand items
      const newItems = [...batchItems];
      const baseVal = Math.floor(total / targetCount);
      const remainder = total % targetCount;

      for (let i = currentCount; i < targetCount; i++) {
        const lastDate = newItems[i - 1]?.manufactureDate || todayStr;
        const d = new Date(lastDate);
        d.setDate(d.getDate() - 1);
        const prevDateStr = d.toISOString().split('T')[0];

        const exp = new Date(prevDateStr);
        exp.setMonth(exp.getMonth() + 6);
        const expStr = exp.toISOString().split('T')[0];

        newItems.push({
          id: `sub-${Date.now()}-${i}`,
          manufactureDate: prevDateStr,
          expiryDate: expStr,
          pallets: baseVal,
        });
      }

      setBatchItems(
        newItems.map((item, idx) => ({
          ...item,
          pallets: idx === 0 ? baseVal + remainder : baseVal,
        }))
      );
    }
  };

  const handleAddSubBatch = () => {
    if (batchItems.length >= 4) return;
    const last = batchItems[batchItems.length - 1];
    
    let nextDate = todayStr;
    let nextExp = defaultExpStr;
    if (last) {
      const d = new Date(last.manufactureDate);
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().split('T')[0];

      const exp = new Date(last.expiryDate);
      exp.setDate(exp.getDate() + 1);
      nextExp = exp.toISOString().split('T')[0];
    }

    const availableSpace = Math.max(1, freeInCurrentRow - totalPalletsInTruck);
    const suggestedPallets = Math.min(6, availableSpace);

    setBatchItems((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        manufactureDate: nextDate,
        expiryDate: nextExp,
        pallets: suggestedPallets > 0 ? suggestedPallets : 4,
      },
    ]);
  };

  const handleRemoveSubBatch = (id: string) => {
    if (batchItems.length <= 1) return;
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateSubBatch = (id: string, field: keyof MultiBatchItem, value: any) => {
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'manufactureDate') {
            const d = new Date(value);
            d.setMonth(d.getMonth() + 6);
            updated.expiryDate = d.toISOString().split('T')[0];
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmitTruck = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand = brandName.trim() || 'Бутылка';

    onConfirmMultiple({
      rowId: selectedRowId,
      bottleTypeName: finalBrand,
      vehiclePlate: vehiclePlate.trim().toUpperCase() || 'БЕЗ НОМЕРА',
      batches: batchItems.map((b) => ({
        manufactureDate: b.manufactureDate,
        expiryDate: b.expiryDate,
        palletsCount: typeof b.pallets === 'string' ? (parseInt(b.pallets) || 1) : b.pallets,
      })),
    });

    onClose();
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand = manualBrand.trim() || 'Бутылка';
    const finalCount = typeof manualPallets === 'string' ? (parseInt(manualPallets) || 1) : manualPallets;

    onConfirmManualPlacement({
      rowId: manualRowId,
      sectionNum: manualSectionNum,
      sectionId: `${manualRowId}-${manualSectionNum}`,
      bottleTypeName: finalBrand,
      palletsCount: Math.max(1, finalCount),
      manufactureDate: manualDate,
      expiryDate: manualExpiry,
      vehiclePlate: manualPlate.trim().toUpperCase() || 'РУЧНОЙ ВВОД',
      fillConsecutive,
    });

    onClose();
  };

  const handleDateChangeManual = (newDate: string) => {
    setManualDate(newDate);
    const d = new Date(newDate);
    d.setMonth(d.getMonth() + 6);
    setManualExpiry(d.toISOString().split('T')[0]);
  };

  const firstEmptyRow = rowEvaluations.find((e) => e.status === 'empty');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 my-4 animate-in fade-in zoom-in-95">
        
        {/* Header & Mode Selector */}
        <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase bg-amber-500 text-slate-950">
                <Truck className="w-3.5 h-3.5" />
                <span>Меню 1: Выгрузка с фуры на склад</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                Секции A и B (по 26 пал.)
              </span>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('truck')}
              className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                mode === 'truck'
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-101'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>С фуры (26 пал.)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-101'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Ручной ввод</span>
            </button>
          </div>
        </div>

        {/* ===================== TAB 1: РАЗГРУЗКА МАШИНЫ ===================== */}
        {mode === 'truck' && (
          <div>
            <div className="mt-2.5 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white font-mono">
                Выгрузка с фуры в {currentRow?.name || `Ряд ${selectedRowId}`} · Свободно {freeInCurrentRow} из 26 мест
              </h2>
            </div>

            {/* Smart Matching Alert */}
            {smartRecommendation && smartRecommendation.row.id !== selectedRowId && (
              <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black text-amber-300 uppercase block">
                      НЕПОЛНЫЙ РЯД С МАРКОЙ «{brandName}»
                    </span>
                    <p className="text-[11px] text-slate-200">
                      {smartRecommendation.reason}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRowId(smartRecommendation.row.id);
                    setManualRowId(smartRecommendation.row.id);
                  }}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  ➔ Догрузить в {smartRecommendation.row.name}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitTruck} className="mt-3 flex flex-col gap-3">
              {/* 1. МАРКА БУТЫЛКИ */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Марка бутылки:
                </label>
                <input
                  type="text"
                  placeholder="напр: Бад, Эмеральда, Балтика..."
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value);
                    setManualBrand(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 text-sm font-bold bg-slate-950 border-2 border-amber-500/80 rounded-xl text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  required
                />
                <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
                  {knownBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        setBrandName(brand);
                        setManualBrand(brand);
                      }}
                      className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        brandName.toLowerCase() === brand.toLowerCase()
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. МАТРИЦА РЯДОВ ДЛЯ ТЕЛЕФОНА (Секция A и Секция B) */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                <label className="text-xs font-bold text-amber-300 uppercase flex items-center justify-between">
                  <span>Шаг 1: Выберите Ряд (12 Секций):</span>
                  <span className="text-[11px] font-mono text-slate-400">Вместимость ряда 26 пал.</span>
                </label>

                {/* Sub-groups for sections */}
                {SECTION_LETTERS.map((letter) => {
                  const secRows = rowEvaluations.filter((ev) => (ev.row.sectionLetter || ev.row.id.charAt(0)) === letter);
                  if (secRows.length === 0) return null;

                  return (
                    <div key={letter} className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Секция {letter}:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                        {secRows.map((evalItem) => {
                          const { row: r, free, status, isSelectable } = evalItem;
                          const isSelected = selectedRowId === r.id;

                          let cardStyle = '';
                          if (isSelected) {
                            cardStyle = 'bg-amber-400 text-slate-950 border-amber-400 font-black ring-2 ring-amber-400';
                          } else if (status === 'matching') {
                            cardStyle = 'bg-amber-950/40 text-amber-200 border-amber-500/80';
                          } else if (status === 'empty') {
                            cardStyle = 'bg-slate-900 text-slate-200 border-slate-700';
                          } else {
                            cardStyle = 'bg-slate-950/60 text-slate-600 border-slate-800 opacity-40';
                          }

                          return (
                            <button
                              key={r.id}
                              type="button"
                              disabled={!isSelectable}
                              onClick={() => {
                                if (isSelectable) {
                                  setSelectedRowId(r.id);
                                  setManualRowId(r.id);
                                }
                              }}
                              className={`min-h-[46px] p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${cardStyle}`}
                            >
                              <span className="font-mono text-xs font-black block">
                                {r.id}
                              </span>
                              <span className="text-[9px] font-mono block">
                                {status === 'empty' ? '26п' : status === 'matching' ? `+${free}` : 'занят'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Any custom sections */}
                {rowEvaluations.filter((ev) => !['A', 'B'].includes(ev.row.sectionLetter || ev.row.id.charAt(0))).length > 0 && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Другие секции:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {rowEvaluations
                        .filter((ev) => !['A', 'B'].includes(ev.row.sectionLetter || ev.row.id.charAt(0)))
                        .map((evalItem) => {
                          const { row: r, free, status, isSelectable } = evalItem;
                          const isSelected = selectedRowId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              disabled={!isSelectable}
                              onClick={() => {
                                if (isSelectable) {
                                  setSelectedRowId(r.id);
                                  setManualRowId(r.id);
                                }
                              }}
                              className={`min-h-[46px] p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-slate-200'
                              }`}
                            >
                              <span className="font-mono text-xs font-black block">{r.id}</span>
                              <span className="text-[9px] font-mono block">{status === 'empty' ? '26п' : `+${free}`}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. НАГЛЯДНЫЕ 7 СЕКЦИЙ ВЫБРАННОГО РЯДА */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 uppercase">
                    Секции Ряда {selectedRowId} (всего 7 секций):
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Занято: {occupiedInCurrentRow}/26п
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {sectionAllocations.map(({ section: sec, willAdd }) => {
                    const isSecOccupied = sec.currentPallets > 0;
                    return (
                      <div
                        key={sec.id}
                        className={`p-1 rounded-lg border text-center flex flex-col justify-between min-h-[44px] ${
                          willAdd > 0
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black animate-pulse'
                            : isSecOccupied
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        <span className="text-[9px] font-mono block">С{sec.sectionNum}</span>
                        <span className="text-[10px] font-mono font-black block">
                          {willAdd > 0 ? `+${willAdd}` : isSecOccupied ? `${sec.currentPallets}п` : 'пуст'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. ОБЩИЙ ОБЪЕМ МАШИНЫ (КНОПКИ 26п, 20п, 13п + ПОЛЕ СВОЕ ЧИСЛО) */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border-2 border-amber-500/80 flex flex-col gap-2.5">
                <label className="text-xs font-black text-amber-300 uppercase flex items-center justify-between">
                  <span>3. Общий объем паллет в машине:</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Доступно в {selectedRowId}: {freeInCurrentRow}п
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetTotalTruckVolume(26)}
                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                      parsedTotalTruckPallets === 26
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-102'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    🚚 26 паллет
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTotalTruckVolume(20)}
                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                      parsedTotalTruckPallets === 20
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-102'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    🚚 20 паллет
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTotalTruckVolume(13)}
                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                      parsedTotalTruckPallets === 13
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-102'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    🚚 13 паллет
                  </button>

                  {/* Свое число паллет */}
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-700 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400 font-bold px-1">Свое число:</span>
                    <input
                      type="number"
                      min="1"
                      max="26"
                      value={totalTruckPallets}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTotalTruckPallets(val);
                        const num = parseInt(val) || 0;
                        if (num > 0) {
                          handleSetTotalTruckVolume(num);
                        }
                      }}
                      className="w-16 px-2 py-1 text-center font-mono font-black text-base bg-slate-950 border border-slate-700 rounded-lg text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* 4. КОЛИЧЕСТВО ПАРТИЙ В МАШИНЕ (1, 2, 3, 4 ПАРТИИ) */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                <label className="text-xs font-bold text-amber-300 uppercase flex items-center justify-between">
                  <span>4. Сколько разных партий/дат в фуре:</span>
                  <span className="text-[11px] font-mono text-slate-400">Выбрано: {batchItems.length}</span>
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((count) => {
                    const isSelected = batchItems.length === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleSetSubBatchCount(count)}
                        className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-102'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {count} {count === 1 ? 'партия' : count < 5 ? 'партии' : 'партий'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. РУЧНОЙ ВВОД ПАЛЛЕТ ДЛЯ КАЖДОЙ ДАТЫ С КНОПКАМИ + И - */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 uppercase">
                    5. Даты выработки и количество паллет:
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Укажите дату и паллеты (кнопками «-» / «+» или вручную)
                  </span>
                </div>

                {/* Quick preset balance chips for 2 batches (e.g. 15+11, 16+10, 13+13, 18+8) */}
                {batchItems.length === 2 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase shrink-0">
                      Быстрый выбор 2 партий:
                    </span>
                    {[
                      [15, 11],
                      [16, 10],
                      [13, 13],
                      [18, 8],
                      [20, 6],
                      [14, 12],
                      [17, 9],
                    ].map(([p1, p2]) => {
                      const currentP1 = Number(batchItems[0]?.pallets);
                      const currentP2 = Number(batchItems[1]?.pallets);
                      const isSelected =
                        (currentP1 === p1 && currentP2 === p2) ||
                        (currentP1 === p2 && currentP2 === p1);

                      return (
                        <button
                          key={`${p1}-${p2}`}
                          type="button"
                          onClick={() => {
                            setBatchItems((prev) => [
                              { ...prev[0], pallets: p1 },
                              { ...prev[1], pallets: p2 },
                            ]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {p1}п + {p2}п
                        </button>
                      );
                    })}
                  </div>
                )}

                {batchItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-xs shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Дата изготовления:</span>
                        <input
                          type="date"
                          value={item.manufactureDate}
                          onChange={(e) => updateSubBatch(item.id, 'manufactureDate', e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {/* TOUCH STEPPER: MINUS / INPUT / PLUS */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-300 shrink-0">Паллет:</span>
                        <div className="flex items-center bg-slate-950 rounded-xl border-2 border-amber-400/80 p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof item.pallets === 'string' ? (parseInt(item.pallets) || 1) : item.pallets;
                              updateSubBatch(item.id, 'pallets', Math.max(1, cur - 1));
                            }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-300 font-black rounded-lg transition-transform active:scale-95 cursor-pointer"
                            title="Уменьшить на 1 паллету"
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max="26"
                            value={item.pallets}
                            onChange={(e) => updateSubBatch(item.id, 'pallets', e.target.value)}
                            onBlur={() => {
                              if (!item.pallets || Number(item.pallets) < 1) {
                                updateSubBatch(item.id, 'pallets', 1);
                              }
                            }}
                            className="w-16 py-1 text-center font-mono font-black text-lg bg-transparent text-amber-300 focus:outline-none"
                            required
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof item.pallets === 'string' ? (parseInt(item.pallets) || 1) : item.pallets;
                              updateSubBatch(item.id, 'pallets', Math.min(26, cur + 1));
                            }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-300 font-black rounded-lg transition-transform active:scale-95 cursor-pointer"
                            title="Увеличить на 1 паллету"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      {batchItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (batchItems.length > 1) {
                              setBatchItems((prev) => prev.filter((it) => it.id !== item.id));
                            }
                          }}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Удалить партию"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Итоговая сверка суммы партий с объемом машины */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                  totalPalletsInTruck === parsedTotalTruckPallets
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                }`}>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Итого по партиям: {totalPalletsInTruck} из {parsedTotalTruckPallets} паллет</span>
                  </div>
                  {totalPalletsInTruck === parsedTotalTruckPallets ? (
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                      ✓ Совпадает
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      Разница: {parsedTotalTruckPallets - totalPalletsInTruck} пал.
                    </span>
                  )}
                </div>
              </div>

              {/* 6. НАГЛЯДНОЕ РАСПРЕДЕЛЕНИЕ ПО 7 СЕКЦИЯМ ВЫБРАННОГО РЯДА */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 uppercase">
                    Заполнение 7 секций ряда {selectedRowId}:
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Занято: {occupiedInCurrentRow}/26п
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {sectionAllocations.map(({ section: sec, willAdd }) => {
                    const isSecOccupied = sec.currentPallets > 0;
                    return (
                      <div
                        key={sec.id}
                        className={`p-1 rounded-lg border text-center flex flex-col justify-between min-h-[44px] ${
                          willAdd > 0
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black animate-pulse'
                            : isSecOccupied
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        <span className="text-[9px] font-mono block">С{sec.sectionNum}</span>
                        <span className="text-[10px] font-mono font-black block">
                          {willAdd > 0 ? `+${willAdd}` : isSecOccupied ? `${sec.currentPallets}п` : 'пуст'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={totalPalletsInTruck <= 0 || totalPalletsInTruck > freeInCurrentRow}
                className="w-full min-h-[52px] py-3.5 text-sm sm:text-base font-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-30 text-slate-950 rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 mt-1"
              >
                <Check className="w-6 h-6 stroke-[3]" />
                <span>
                  РАЗГРУЗИТЬ {totalPalletsInTruck} ПАЛЛЕТ В РЯД {selectedRowId}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* ===================== TAB 2: РУЧНОЙ ВВОД ===================== */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmitManual} className="mt-3 flex flex-col gap-3">
            {/* 1. ВЫБОР РЯДА (12 Секций) */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1.5">
                1. Выберите Ряд (12 Секций):
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {rows.map((r) => {
                  const occupied = r.sections.reduce((acc, s) => acc + s.currentPallets, 0);
                  const isSelected = manualRowId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setManualRowId(r.id);
                        setSelectedRowId(r.id);
                      }}
                      className={`min-h-[44px] py-1.5 px-1 rounded-xl font-mono text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400'
                          : 'bg-slate-900 text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span className="text-xs font-black block">Ряд {r.id}</span>
                      <span className="text-[9px] block opacity-75">{occupied}/26п</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ВЫБОР СЕКЦИИ (1–7) */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1.5">
                2. Выберите начальную секцию (1–7):
              </label>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const isSelected = manualSectionNum === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setManualSectionNum(num)}
                      className={`min-h-[44px] py-2 rounded-xl font-mono text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400'
                          : 'bg-slate-900 text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span className="text-xs font-black block">С{num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ВВОД КОЛИЧЕСТВА ПАЛЛЕТ БЕЗ ЗАЛИПАНИЯ 1 */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border-2 border-amber-500/70">
              <label className="text-xs font-black text-amber-300 uppercase block mb-1">
                3. Введите любое количество паллет:
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="26"
                  value={manualPallets}
                  onChange={(e) => setManualPallets(e.target.value)}
                  onBlur={() => {
                    if (!manualPallets || Number(manualPallets) < 1) {
                      setManualPallets(1);
                    }
                  }}
                  className="w-28 px-3 py-2 text-xl font-black bg-slate-900 border-2 border-amber-400 rounded-xl text-amber-300 font-mono text-center"
                  required
                />

                <div className="flex flex-wrap items-center gap-1">
                  {[1, 2, 4, 7, 13, 26].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setManualPallets(count)}
                      className={`min-h-[44px] min-w-[40px] px-2 py-1 rounded-xl text-xs font-mono font-bold border ${
                        Number(manualPallets) === count
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-200 border-slate-700'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. МАРКА БУТЫЛКИ */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <label className="block text-xs font-bold text-amber-300 uppercase mb-1">
                4. Марка бутылки:
              </label>
              <input
                type="text"
                placeholder="напр: Бад, Эмеральда, Балтика..."
                value={manualBrand}
                onChange={(e) => setManualBrand(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-bold bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-mono"
                required
              />
            </div>

            {/* 5. ДАТА ВАРКИ */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                5. Дата изготовления (варка):
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => handleDateChangeManual(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-mono"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full min-h-[48px] py-3 text-sm font-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>
                ПОСТАВИТЬ {manualPallets || 1} ПАЛЛЕТ «{manualBrand}» В РЯД {manualRowId}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
