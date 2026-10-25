/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BottleBatch, 
  YardRow, 
  YardSection, 
  YardSectionItem,
  OperationLogEntry,
  PlantFeedEvent 
} from './types/terminal';
import { 
  DEFAULT_BOTTLE_BRANDS, 
  INITIAL_YARD_ROWS, 
  INITIAL_BATCHES, 
  INITIAL_LOGS 
} from './data/initialData';
import { calculateFifoRanks, findSmartRowForBrand, getSectionItems } from './utils/fifoUtils';
import { Header } from './components/Header';
import { DriverTopBar } from './components/DriverTopBar';
import { YardMap } from './components/YardMap';
import { QuickUnloadModal } from './components/QuickUnloadModal';
import { QuickCellActionModal } from './components/QuickCellActionModal';
import { PlantOutfeedModal } from './components/PlantOutfeedModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { FifoQueueSidebar } from './components/FifoQueueSidebar';
import { HistoryLogModal } from './components/HistoryLogModal';
import { RowCapacityOverview } from './components/RowCapacityOverview';
import { soundEffects } from './utils/audio';
import { Check, Factory, X, Bell } from 'lucide-react';

const STORAGE_KEYS = {
  BATCHES: 'terminal_12sections_batches_v7',
  ROWS: 'terminal_12sections_rows_v7',
  LOGS: 'terminal_12sections_logs_v7',
  BRANDS: 'terminal_12sections_brands_v7',
  PLANT_FEED: 'terminal_12sections_plant_feed_v7',
};

export default function App() {
  const [rows, setRows] = useState<YardRow[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROWS);
    if (saved) {
      try {
        const parsed: YardRow[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 20 && parsed[0]?.id === 'A1') {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_YARD_ROWS;
  });

  const [batches, setBatches] = useState<BottleBatch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BATCHES);
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [logs, setLogs] = useState<OperationLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [knownBrands, setKnownBrands] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANDS);
    return saved ? JSON.parse(saved) : DEFAULT_BOTTLE_BRANDS;
  });

  // Active batch at plant notification
  const [activePlantFeed, setActivePlantFeed] = useState<PlantFeedEvent | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLANT_FEED);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      id: 'feed-init',
      timestamp: '14:15',
      batchNumber: 'БАД-18/10',
      bottleTypeName: 'Бад (Bud)',
      palletsCount: 8,
      sourceRowId: 'A3',
      sourceRowName: 'Ряд A3',
      manufactureDate: '2026-10-18',
      expiryDate: '2027-04-18',
    };
  });

  // UI Navigation & Search State
  const [currentTab, setCurrentTab] = useState<'map' | 'queue' | 'logs'>('map');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(null);
  const [focusedLogId, setFocusedLogId] = useState<string | null>(null);

  const handleFocusActionOnMap = (log: OperationLogEntry) => {
    soundEffects.playSuccess();
    setFocusedLogId(log.id);
    setCurrentTab('map');

    let targetRowId = log.rowId || log.targetRowId || '';
    if (targetRowId.startsWith('Ряд ')) {
      targetRowId = targetRowId.replace('Ряд ', '').trim();
    }

    if (targetRowId) {
      showToast(`⚡ Отмечено последнее действие в Ряду ${targetRowId}!`);
      setTimeout(() => {
        const el = document.getElementById(`row-${targetRowId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }

    // Clear intense focus pulse after 5 seconds
    setTimeout(() => {
      setFocusedLogId(null);
    }, 5000);
  };

  // Modals
  const [inboundModalState, setInboundModalState] = useState<{
    isOpen: boolean;
    initialRowId: string | null;
    initialSectionNum?: number | null;
    initialBrandName?: string | null;
    initialMode?: 'truck' | 'manual';
  }>({
    isOpen: false,
    initialRowId: null,
    initialSectionNum: null,
    initialBrandName: null,
    initialMode: 'truck',
  });

  const [plantOutfeedModalOpen, setPlantOutfeedModalOpen] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);

  const [rowActionModal, setRowActionModal] = useState<{
    isOpen: boolean;
    row: YardRow | null;
  }>({
    isOpen: false,
    row: null,
  });

  const [relocateState, setRelocateState] = useState<{
    active: boolean;
    sourceSection: YardSection;
  } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROWS, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(knownBrands));
  }, [knownBrands]);

  useEffect(() => {
    if (activePlantFeed) {
      localStorage.setItem(STORAGE_KEYS.PLANT_FEED, JSON.stringify(activePlantFeed));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PLANT_FEED);
    }
  }, [activePlantFeed]);

  // FIFO Ranks
  const rankedBatches = useMemo(() => {
    return calculateFifoRanks(batches, selectedBrandFilter);
  }, [batches, selectedBrandFilter]);

  // Available brands currently on the field
  const availableBrands = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      r.sections.forEach((s) => {
        if (s.status === 'occupied' && s.bottleTypeName && s.currentPallets > 0) {
          map.set(s.bottleTypeName, (map.get(s.bottleTypeName) || 0) + s.currentPallets);
        }
      });
    });

    return Array.from(map.entries()).map(([name, totalPallets]) => ({
      name,
      totalPallets,
    }));
  }, [rows]);

  const totalPallets = useMemo(() => {
    return rows.reduce(
      (acc, r) => acc + r.sections.reduce((sAcc, s) => sAcc + s.currentPallets, 0),
      0
    );
  }, [rows]);

  // Smart matching recommendation for selected brand ("подкидывать тот ряд")
  const smartRecommendation = useMemo(() => {
    if (selectedBrandFilter === 'all') return null;
    return findSmartRowForBrand(rows, selectedBrandFilter, 8);
  }, [rows, selectedBrandFilter]);

  // Handler: Pick pallets (partial or full) and feed plant
  const handlePickPallets = (batchId: string, count: number, customTargetRowId?: string) => {
    const batch = batches.find((b) => b.id === batchId);
    let actualDeduct = 0;
    let targetRowDisplay = '';
    let targetRowFound: YardRow | null = null;

    setRows((prevRows) => {
      let remainingToDeduct = count;

      return prevRows.map((row) => {
        if (customTargetRowId && row.id !== customTargetRowId) {
          return row;
        }

        const updatedSections = row.sections.map((sec) => {
          const secItems = getSectionItems(sec);
          const targetItemIndex = secItems.findIndex((it) => it.batchId === batchId);

          if (targetItemIndex >= 0 && remainingToDeduct > 0) {
            const targetItem = secItems[targetItemIndex];
            const deductHere = Math.min(targetItem.palletsCount, remainingToDeduct);
            actualDeduct += deductHere;
            remainingToDeduct -= deductHere;
            targetRowDisplay = row.name;
            targetRowFound = row;

            const updatedItems = secItems
              .map((it, idx) => {
                if (idx === targetItemIndex) {
                  return { ...it, palletsCount: it.palletsCount - deductHere };
                }
                return it;
              })
              .filter((it) => it.palletsCount > 0);

            const newTotal = updatedItems.reduce((acc, it) => acc + it.palletsCount, 0);

            return {
              ...sec,
              items: updatedItems,
              currentPallets: newTotal,
              batchId: updatedItems[0]?.batchId || null,
              batchNumber: updatedItems[0]?.batchNumber || null,
              bottleTypeName: updatedItems[0]?.bottleTypeName || null,
              manufactureDate: updatedItems[0]?.manufactureDate || null,
              expiryDate: updatedItems[0]?.expiryDate || null,
              vehiclePlate: updatedItems[0]?.vehiclePlate,
              status: newTotal === 0 ? ('empty' as const) : ('occupied' as const),
            };
          }
          return sec;
        });

        return { ...row, sections: updatedSections };
      });
    });

    // Deduct from batches
    setBatches((prevBatches) =>
      prevBatches
        .map((b) => {
          if (b.id === batchId) {
            const newRem = Math.max(0, b.remainingPallets - (actualDeduct || count));
            return {
              ...b,
              remainingPallets: newRem,
            };
          }
          return b;
        })
        .filter((b) => b.remainingPallets > 0)
    );

    const brandName = batch?.bottleTypeName || 'Бутылка';
    const batchNum = batch?.batchNumber || 'ПАРТИЯ';
    const finalDeduct = actualDeduct || count;
    const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Instantly notify factory with the new batch!
    const feedEvent: PlantFeedEvent = {
      id: `feed-${Date.now()}`,
      timestamp: nowTime,
      batchNumber: batchNum,
      bottleTypeName: brandName,
      palletsCount: finalDeduct,
      sourceRowId: targetRowFound ? (targetRowFound as YardRow).id : (customTargetRowId || 'Склад'),
      sourceRowName: targetRowDisplay || `Ряд ${customTargetRowId || ''}`,
      manufactureDate: batch?.manufactureDate,
      expiryDate: batch?.expiryDate,
    };
    setActivePlantFeed(feedEvent);

    // Audit log
    const newLog: OperationLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: nowTime,
      action: 'pickup',
      batchNumber: batchNum,
      bottleTypeName: brandName,
      sectionId: targetRowDisplay || 'Ряд',
      rowId: targetRowDisplay || '—',
      palletsCount: finalDeduct,
      operatorName: 'Водитель погрузчика',
      notes: `Завоз в цех: Партия ${batchNum} (${finalDeduct} пал.) из ${targetRowDisplay} завезена на розлив!`,
    };
    setLogs((prev) => [newLog, ...prev]);

    showToast(`Завоз в цех: Принята партия ${batchNum} (${finalDeduct} пал.) из ${targetRowDisplay || 'ряда'}!`);
    soundEffects.playSuccess();
  };

  // Handler: Unload into Row (Выгрузка с фуры 1..4 партий)
  const handleUnloadConfirmMultiple = (data: {
    rowId: string;
    bottleTypeName: string;
    vehiclePlate: string;
    batches: Array<{
      manufactureDate: string;
      expiryDate: string;
      palletsCount: number;
    }>;
  }) => {
    const targetRow = rows.find((r) => r.id === data.rowId);
    if (!targetRow) return;

    const updatedRows = [...rows];
    const rowIndex = updatedRows.findIndex((r) => r.id === data.rowId);
    const rowSections = [...updatedRows[rowIndex].sections];

    const newBatches: BottleBatch[] = [];
    let totalAdded = 0;

    data.batches.forEach((bItem, idx) => {
      const newId = `batch-${Date.now()}-${idx}`;
      const batchNumber = `ПТ-${bItem.manufactureDate.slice(5).replace('-', '/')}-${Math.floor(10 + Math.random() * 90)}`;
      let remainingForSubBatch = bItem.palletsCount;

      for (let i = 0; i < rowSections.length && remainingForSubBatch > 0; i++) {
        const sec = rowSections[i];
        const secItems = getSectionItems(sec);
        const usedInSec = secItems.reduce((acc, it) => acc + it.palletsCount, 0);
        const freeInSec = Math.max(0, sec.capacity - usedInSec);

        if (freeInSec > 0) {
          const toAdd = Math.min(freeInSec, remainingForSubBatch);
          const newItem: YardSectionItem = {
            batchId: newId,
            batchNumber,
            bottleTypeName: data.bottleTypeName,
            manufactureDate: bItem.manufactureDate,
            expiryDate: bItem.expiryDate,
            vehiclePlate: data.vehiclePlate,
            palletsCount: toAdd,
          };

          const updatedItems = [...secItems, newItem];
          const newTotal = usedInSec + toAdd;

          rowSections[i] = {
            ...sec,
            items: updatedItems,
            currentPallets: newTotal,
            batchId: updatedItems[0]?.batchId || newId,
            batchNumber: updatedItems[0]?.batchNumber || batchNumber,
            bottleTypeName: updatedItems[0]?.bottleTypeName || data.bottleTypeName,
            manufactureDate: updatedItems[0]?.manufactureDate || bItem.manufactureDate,
            expiryDate: updatedItems[0]?.expiryDate || bItem.expiryDate,
            vehiclePlate: updatedItems[0]?.vehiclePlate || data.vehiclePlate,
            status: 'occupied',
          };

          remainingForSubBatch -= toAdd;
        }
      }

      newBatches.push({
        id: newId,
        batchNumber,
        bottleTypeName: data.bottleTypeName,
        supplier: 'Стеклозавод',
        vehiclePlate: data.vehiclePlate,
        manufactureDate: bItem.manufactureDate,
        expiryDate: bItem.expiryDate,
        arrivalDate: new Date().toISOString(),
        totalPallets: bItem.palletsCount,
        remainingPallets: bItem.palletsCount,
        sectionIds: [`${targetRow.name}`],
        notes: `Партия от ${bItem.manufactureDate} в ${targetRow.name} (${bItem.palletsCount} пал.)`,
      });

      totalAdded += bItem.palletsCount;
    });

    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      sections: rowSections,
    };

    setRows(updatedRows);
    setBatches((prev) => [...newBatches, ...prev]);

    if (!knownBrands.some((kb) => kb.toLowerCase() === data.bottleTypeName.toLowerCase())) {
      setKnownBrands((prev) => [data.bottleTypeName, ...prev]);
    }

    const newLog: OperationLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      action: 'unload',
      batchNumber: `ПАРТИИ (${data.batches.length} дат)`,
      bottleTypeName: data.bottleTypeName,
      vehiclePlate: data.vehiclePlate,
      sectionId: `${targetRow.name}`,
      rowId: data.rowId,
      palletsCount: totalAdded,
      operatorName: 'Водитель погрузчика',
      notes: `Выгрузка с фуры: Принята машина «${data.bottleTypeName}» в ${targetRow.name} (${totalAdded} пал.)`,
    };
    setLogs((prev) => [newLog, ...prev]);

    showToast(`Выгрузка с фуры: Принято ${totalAdded} паллет «${data.bottleTypeName}» в ${targetRow.name}!`);
    soundEffects.playSuccess();
  };

  // Handler: Manual placement
  const handleManualPlacement = (data: {
    rowId: string;
    sectionNum: number;
    sectionId: string;
    bottleTypeName: string;
    palletsCount: number;
    manufactureDate: string;
    expiryDate: string;
    vehiclePlate: string;
    fillConsecutive: boolean;
  }) => {
    const targetRow = rows.find((r) => r.id === data.rowId);
    if (!targetRow) return;

    const updatedRows = [...rows];
    const rowIndex = updatedRows.findIndex((r) => r.id === data.rowId);
    const rowSections = [...updatedRows[rowIndex].sections];

    const newId = `batch-${Date.now()}-man`;
    const batchNumber = `ПТ-РУЧ-${data.manufactureDate.slice(5).replace('-', '/')}-${Math.floor(100 + Math.random() * 900)}`;

    let remainingToPlace = data.palletsCount;
    const startIdx = Math.max(0, data.sectionNum - 1);

    const placeInSec = (i: number) => {
      const sec = rowSections[i];
      const secItems = getSectionItems(sec);
      const usedInSec = secItems.reduce((acc, it) => acc + it.palletsCount, 0);
      const freeInSec = Math.max(0, sec.capacity - usedInSec);

      if (freeInSec > 0 && remainingToPlace > 0) {
        const toAdd = Math.min(freeInSec, remainingToPlace);
        const newItem: YardSectionItem = {
          batchId: newId,
          batchNumber,
          bottleTypeName: data.bottleTypeName,
          manufactureDate: data.manufactureDate,
          expiryDate: data.expiryDate,
          vehiclePlate: data.vehiclePlate,
          palletsCount: toAdd,
        };

        const updatedItems = [...secItems, newItem];
        const newTotal = usedInSec + toAdd;

        rowSections[i] = {
          ...sec,
          items: updatedItems,
          currentPallets: newTotal,
          batchId: updatedItems[0]?.batchId || newId,
          batchNumber: updatedItems[0]?.batchNumber || batchNumber,
          bottleTypeName: updatedItems[0]?.bottleTypeName || data.bottleTypeName,
          manufactureDate: updatedItems[0]?.manufactureDate || data.manufactureDate,
          expiryDate: updatedItems[0]?.expiryDate || data.expiryDate,
          vehiclePlate: updatedItems[0]?.vehiclePlate || data.vehiclePlate,
          status: 'occupied',
        };
        remainingToPlace -= toAdd;
      }
    };

    for (let i = startIdx; i < rowSections.length && remainingToPlace > 0; i++) {
      placeInSec(i);
    }

    for (let i = 0; i < startIdx && remainingToPlace > 0; i++) {
      placeInSec(i);
    }

    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      sections: rowSections,
    };

    const placedCount = data.palletsCount - remainingToPlace;

    const newBatch: BottleBatch = {
      id: newId,
      batchNumber,
      bottleTypeName: data.bottleTypeName,
      supplier: 'Ручной ввод',
      vehiclePlate: data.vehiclePlate,
      manufactureDate: data.manufactureDate,
      expiryDate: data.expiryDate,
      arrivalDate: new Date().toISOString(),
      totalPallets: placedCount,
      remainingPallets: placedCount,
      sectionIds: [`${targetRow.name}`],
      notes: `Ручной ввод ${placedCount} паллет «${data.bottleTypeName}» в ${targetRow.name}`,
    };

    setRows(updatedRows);
    setBatches((prev) => [newBatch, ...prev]);

    if (!knownBrands.some((kb) => kb.toLowerCase() === data.bottleTypeName.toLowerCase())) {
      setKnownBrands((prev) => [data.bottleTypeName, ...prev]);
    }

    const newLog: OperationLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      action: 'manual_place',
      batchNumber,
      bottleTypeName: data.bottleTypeName,
      vehiclePlate: data.vehiclePlate,
      sectionId: `${targetRow.name}`,
      rowId: data.rowId,
      palletsCount: placedCount,
      operatorName: 'Водитель погрузчика',
      notes: `Ручной ввод: ${placedCount} пал. «${data.bottleTypeName}» в ${targetRow.name}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    showToast(`Поставлено ${placedCount} паллет «${data.bottleTypeName}» в ${targetRow.name}!`);
    soundEffects.playSuccess();
  };

  // Handler: Clear entire row
  const handleClearRow = (rowId: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === rowId) {
          const clearedSecs = r.sections.map((s) => ({
            ...s,
            items: [],
            currentPallets: 0,
            batchId: null,
            batchNumber: null,
            bottleTypeName: null,
            manufactureDate: null,
            expiryDate: null,
            vehiclePlate: undefined,
            status: 'empty' as const,
          }));
          return { ...r, sections: clearedSecs };
        }
        return r;
      })
    );

    showToast(`Ряд ${rowId} полностью освобожден.`);
    soundEffects.playWarning();
  };

  // Handler: Admin Add Row
  const handleAddRow = (newRow: YardRow) => {
    setRows((prev) => [...prev, newRow]);
    showToast(`Добавлен новый ${newRow.name} (26 мест) в Секцию ${newRow.sectionLetter}!`);
  };

  // Handler: Admin Delete Row
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    showToast(`Ряд ${rowId} удален со склада.`);
  };

  // Reset demo
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEYS.BATCHES);
    localStorage.removeItem(STORAGE_KEYS.ROWS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.BRANDS);
    localStorage.removeItem(STORAGE_KEYS.PLANT_FEED);
    setRows(INITIAL_YARD_ROWS);
    setBatches(INITIAL_BATCHES);
    setLogs(INITIAL_LOGS);
    setKnownBrands(DEFAULT_BOTTLE_BRANDS);
    setSelectedBrandFilter('all');
    showToast('Данные сброшены к 12 секциям (A–L по 7 рядов)');
  };

  // Export JSON
  const handleExportJson = () => {
    const data = { timestamp: new Date().toISOString(), rows, batches, logs, knownBrands, activePlantFeed };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-12sections-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header with 2 Distinct Menus: 1. Завоз фуры and 2. Выгрузка в цех, plus Admin */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenInboundUnload={() => {
          const emptyRow = rows.find((r) =>
            r.sections.every((s) => s.status === 'empty' || s.currentPallets === 0)
          );
          setInboundModalState({
            isOpen: true,
            initialRowId: emptyRow?.id || 'A4',
            initialSectionNum: 1,
            initialBrandName: selectedBrandFilter !== 'all' ? selectedBrandFilter : 'Бад (Bud)',
            initialMode: 'truck',
          });
        }}
        onOpenPlantOutfeed={() => {
          setPlantOutfeedModalOpen(true);
        }}
        onOpenAdmin={() => {
          setAdminModalOpen(true);
        }}
        totalPallets={totalPallets}
      />

      {/* Main Cockpit */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col gap-3.5">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* FACTORY INFEED BANNER (Сразу видно на заводе, какая партия поступила) */}
        {activePlantFeed && (
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-400 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 font-black shrink-0 shadow-lg shadow-emerald-500/20">
                <Factory className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                    ЗАВЕЗЕНО В ЦЕХ (НА РОЗЛИВ)
                  </span>
                  <span className="text-xs font-mono text-emerald-300">
                    в {activePlantFeed.timestamp}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
                    {activePlantFeed.batchNumber}
                  </span>
                  <span className="text-sm font-bold text-white">
                    «{activePlantFeed.bottleTypeName}»
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    · {activePlantFeed.palletsCount} пал. из {activePlantFeed.sourceRowName}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivePlantFeed(null)}
              className="self-end sm:self-center px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Скрыть</span>
            </button>
          </div>
        )}

        {/* 1. DYNAMIC BRAND FILTER & SEARCH BAR */}
        <DriverTopBar
          selectedBrandFilter={selectedBrandFilter}
          onBrandFilterChange={(brand) => setSelectedBrandFilter(brand)}
          availableBrands={availableBrands}
          searchQuery={searchQuery}
          onSearchQueryChange={(q) => setSearchQuery(q)}
        />

        {/* 2. TAB 1: СХЕМА СЕКЦИЙ (12 Секций A–L) */}
        {currentTab === 'map' && (
          <>
            {/* Real-time row occupancy by Section */}
            <RowCapacityOverview
              rows={rows}
              rankedBatches={rankedBatches}
              selectedBrandFilter={selectedBrandFilter}
              onSelectRowForUnload={(rowId, existingBrand) => {
                setInboundModalState({
                  isOpen: true,
                  initialRowId: rowId,
                  initialSectionNum: 1,
                  initialBrandName:
                    existingBrand ||
                    (selectedBrandFilter !== 'all' ? selectedBrandFilter : 'Бад (Bud)'),
                  initialMode: 'truck',
                });
              }}
              onScrollToRow={(rowId) => {
                const el = document.getElementById(`row-${rowId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />

            <YardMap
              rows={rows}
              rankedBatches={rankedBatches}
              selectedBrandFilter={selectedBrandFilter}
              smartRecommendedRowId={smartRecommendation ? smartRecommendation.row.id : null}
              searchQuery={searchQuery}
              logs={logs}
              focusedLogId={focusedLogId}
              onUnloadIntoRow={(targetRow) => {
                const existingBrand =
                  targetRow.sections.find(
                    (s) => s.status === 'occupied' && s.bottleTypeName
                  )?.bottleTypeName || null;

                const isRowEmpty = targetRow.sections.every(
                  (s) => s.status === 'empty' || s.currentPallets === 0
                );

                setInboundModalState({
                  isOpen: true,
                  initialRowId: targetRow.id,
                  initialSectionNum: 1,
                  initialBrandName:
                    existingBrand ||
                    (selectedBrandFilter !== 'all' ? selectedBrandFilter : 'Бад (Bud)'),
                  initialMode: isRowEmpty ? 'truck' : 'manual',
                });
              }}
              onRowClick={(targetRow) => {
                setRowActionModal({
                  isOpen: true,
                  row: targetRow,
                });
              }}
              onOpenPlantFeedForRow={(targetRow) => {
                setPlantOutfeedModalOpen(true);
              }}
              relocateMode={
                relocateState
                  ? {
                      active: true,
                      sourceSection: relocateState.sourceSection,
                      onTargetSelect: () => setRelocateState(null),
                      onCancel: () => setRelocateState(null),
                    }
                  : undefined
              }
            />
          </>
        )}

        {/* 3. TAB 2: FIFO QUEUE */}
        {currentTab === 'queue' && (
          <div className="max-w-3xl mx-auto w-full">
            <FifoQueueSidebar
              rankedBatches={rankedBatches}
              highlightedBatchId={highlightedBatchId}
              onSelectBatchId={(bId) => {
                setHighlightedBatchId(bId);
                setCurrentTab('map');
              }}
              onQuickPick={(bId, count) => handlePickPallets(bId, count)}
            />
          </div>
        )}

        {/* 4. TAB 3: SHIFT LOGS */}
        {currentTab === 'logs' && (
          <HistoryLogModal
            logs={logs}
            onResetData={handleReset}
            onExportJson={handleExportJson}
            onFocusActionOnMap={handleFocusActionOnMap}
          />
        )}
      </main>

      {/* МЕНЮ 1: Завоз фуры на поле (Разгрузка / Догруз) */}
      <QuickUnloadModal
        isOpen={inboundModalState.isOpen}
        onClose={() =>
          setInboundModalState({
            isOpen: false,
            initialRowId: null,
            initialSectionNum: null,
            initialBrandName: null,
            initialMode: 'truck',
          })
        }
        rows={rows}
        initialRowId={inboundModalState.initialRowId}
        initialSectionNum={inboundModalState.initialSectionNum}
        initialBrandName={inboundModalState.initialBrandName}
        initialMode={inboundModalState.initialMode}
        knownBrands={knownBrands}
        onConfirmMultiple={handleUnloadConfirmMultiple}
        onConfirmManualPlacement={handleManualPlacement}
      />

      {/* МЕНЮ 2: Выгрузка в цех завода (Подача по FIFO) */}
      <PlantOutfeedModal
        isOpen={plantOutfeedModalOpen}
        onClose={() => setPlantOutfeedModalOpen(false)}
        rows={rows}
        rankedBatches={rankedBatches}
        onFeedToPlant={(batchId, count, rowId) => {
          handlePickPallets(batchId, count, rowId);
        }}
      />

      {/* МЕНЮ 3: Панель Администратора (пароль admin2026, добавление рядов, экспорт CSV/JSON) */}
      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        rows={rows}
        batches={batches}
        rankedBatches={rankedBatches}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        onClearRow={handleClearRow}
      />

      {/* Модальное окно действий с рядом */}
      <QuickCellActionModal
        isOpen={rowActionModal.isOpen}
        onClose={() => setRowActionModal({ isOpen: false, row: null })}
        row={rowActionModal.row}
        rankedBatches={rankedBatches}
        onPick={(batchId, count) => {
          handlePickPallets(batchId, count, rowActionModal.row?.id);
        }}
        onStartMove={(rowToMove) => {
          const sampleSec = rowToMove.sections.find((s) => s.status === 'occupied' && s.currentPallets > 0);
          if (sampleSec) {
            setRelocateState({
              active: true,
              sourceSection: sampleSec,
            });
            setCurrentTab('map');
          }
        }}
        onClear={(rowIdToClear) => {
          handleClearRow(rowIdToClear);
        }}
        onOpenUnloadForRow={(rowIdToUnload) => {
          const targetRow = rows.find((r) => r.id === rowIdToUnload);
          const existingBrand =
            targetRow?.sections.find(
              (s) => s.status === 'occupied' && s.bottleTypeName
            )?.bottleTypeName || null;

          const isRowEmpty = targetRow?.sections.every(
            (s) => s.status === 'empty' || s.currentPallets === 0
          );

          setInboundModalState({
            isOpen: true,
            initialRowId: rowIdToUnload,
            initialSectionNum: 1,
            initialBrandName:
              existingBrand ||
              (selectedBrandFilter !== 'all' ? selectedBrandFilter : 'Бад (Bud)'),
            initialMode: isRowEmpty ? 'truck' : 'manual',
          });
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 py-3 text-center text-xs text-slate-500 font-mono">
        Терминал стеклотары · 12 Секций (A–L, по 7 рядов) · Режим карщика и розлива завода
      </footer>
    </div>
  );
}
