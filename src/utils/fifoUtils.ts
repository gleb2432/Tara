/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BottleBatch, FifoRankedBatch, FifoUrgency, YardRow, YardSection, YardSectionItem } from '../types/terminal';

export const REFERENCE_DATE = new Date('2026-10-24');

export function calculateDaysUntilExpiry(expiryDateStr: string): number {
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - REFERENCE_DATE.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFifoRanks(
  batches: BottleBatch[],
  selectedBrand?: string
): FifoRankedBatch[] {
  const activeBatches = batches.filter((b) => b.remainingPallets > 0);

  const filtered = selectedBrand && selectedBrand !== 'all'
    ? activeBatches.filter((b) => b.bottleTypeName.toLowerCase() === selectedBrand.toLowerCase())
    : activeBatches;

  // Сортировка по FIFO:
  // 1. Самый ранний срок годности
  // 2. Самая ранняя дата прихода
  const sorted = [...filtered].sort((a, b) => {
    const expA = new Date(a.expiryDate).getTime();
    const expB = new Date(b.expiryDate).getTime();
    if (expA !== expB) return expA - expB;
    return new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime();
  });

  const oldestByBrandMap = new Map<string, string>();
  activeBatches.forEach((b) => {
    const currentOldestId = oldestByBrandMap.get(b.bottleTypeName);
    if (!currentOldestId) {
      oldestByBrandMap.set(b.bottleTypeName, b.id);
    } else {
      const currentOldestBatch = activeBatches.find((x) => x.id === currentOldestId);
      if (currentOldestBatch && new Date(b.expiryDate).getTime() < new Date(currentOldestBatch.expiryDate).getTime()) {
        oldestByBrandMap.set(b.bottleTypeName, b.id);
      }
    }
  });

  return sorted.map((batch, index) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(batch.expiryDate);
    const fifoRank = index + 1;

    let urgency: FifoUrgency = 'normal';
    if (daysUntilExpiry <= 45 || fifoRank === 1) {
      urgency = 'critical';
    } else if (daysUntilExpiry <= 100 || fifoRank <= 3) {
      urgency = 'warning';
    } else if (daysUntilExpiry > 250) {
      urgency = 'fresh';
    }

    const isOldestInBrand = oldestByBrandMap.get(batch.bottleTypeName) === batch.id;
    const isOldestOverall = fifoRank === 1;

    return {
      ...batch,
      fifoRank,
      daysUntilExpiry,
      urgency,
      isOldestOverall,
      isOldestInBrand,
    };
  });
}

/**
 * УМНЫЙ ПОДБОР РЯДА ДЛЯ ДОГРУЗА ("подкидывать тот ряд"):
 * Если забирали не все паллеты и есть неполный ряд с такой же маркой — рекомендуем его!
 */
export function findSmartRowForBrand(
  rows: YardRow[],
  brandName: string,
  neededPallets: number
): { row: YardRow; freeSpace: number; existingPallets: number; freeSectionNames: string; reason: string } | null {
  if (!brandName || brandName.trim() === '') return null;

  const targetBrand = brandName.trim().toLowerCase();

  const candidateRows: Array<{
    row: YardRow;
    freeSpace: number;
    existingPallets: number;
    fitsFully: boolean;
    freeSectionNames: string;
  }> = [];

  rows.forEach((row) => {
    let occupied = 0;
    let existingPallets = 0;
    const freeSpotNums: number[] = [];

    row.sections.forEach((sec) => {
      occupied += sec.currentPallets;
      if (sec.bottleTypeName && sec.bottleTypeName.toLowerCase() === targetBrand) {
        existingPallets += sec.currentPallets;
      }
      if (sec.status === 'empty' || sec.currentPallets < sec.capacity) {
        freeSpotNums.push(sec.sectionNum);
      }
    });

    const freeSpace = Math.max(0, row.maxPallets - occupied);

    if (existingPallets > 0 && freeSpace > 0) {
      let freeRangeText = '';
      if (freeSpotNums.length > 0) {
        const minSpot = Math.min(...freeSpotNums);
        const maxSpot = Math.max(...freeSpotNums);
        freeRangeText = minSpot === maxSpot ? `секция ${minSpot}` : `секции ${minSpot}–${maxSpot}`;
      }

      candidateRows.push({
        row,
        freeSpace,
        existingPallets,
        fitsFully: freeSpace >= neededPallets,
        freeSectionNames: freeRangeText,
      });
    }
  });

  if (candidateRows.length === 0) return null;

  candidateRows.sort((a, b) => {
    if (a.fitsFully && !b.fitsFully) return -1;
    if (!a.fitsFully && b.fitsFully) return 1;
    return b.freeSpace - a.freeSpace;
  });

  const best = candidateRows[0];
  const reason = `В ${best.row.name} уже стоит «${brandName}» (${best.existingPallets} пал.). Свободны ${best.freeSectionNames} (${best.freeSpace} мест) — догрузите туда!`;

  return {
    row: best.row,
    freeSpace: best.freeSpace,
    existingPallets: best.existingPallets,
    freeSectionNames: best.freeSectionNames,
    reason,
  };
}

export function getUrgencyStyles(urgency?: FifoUrgency) {
  switch (urgency) {
    case 'critical':
      return {
        bg: 'bg-red-950/85',
        border: 'border-red-500 shadow-md shadow-red-500/30',
        text: 'text-red-300',
        badge: 'bg-red-500 text-white font-black',
        bar: 'bg-red-500',
        indicator: 'bg-red-500',
        label: 'Критический FIFO',
      };
    case 'warning':
      return {
        bg: 'bg-amber-950/75',
        border: 'border-amber-500/80 shadow-sm shadow-amber-500/20',
        text: 'text-amber-300',
        badge: 'bg-amber-500 text-slate-950 font-bold',
        bar: 'bg-amber-500',
        indicator: 'bg-amber-500',
        label: 'В очереди забора',
      };
    case 'normal':
      return {
        bg: 'bg-blue-950/50',
        border: 'border-blue-700/60',
        text: 'text-blue-300',
        badge: 'bg-blue-600/90 text-white',
        bar: 'bg-blue-500',
        indicator: 'bg-blue-400',
        label: 'Обычный срок',
      };
    case 'fresh':
      return {
        bg: 'bg-emerald-950/45',
        border: 'border-emerald-700/50',
        text: 'text-emerald-300',
        badge: 'bg-emerald-700 text-white',
        bar: 'bg-emerald-500',
        indicator: 'bg-emerald-400',
        label: 'Свежая партия',
      };
    default:
      return {
        bg: 'bg-slate-800',
        border: 'border-slate-700',
        text: 'text-slate-300',
        badge: 'bg-slate-700 text-white',
        bar: 'bg-slate-600',
        indicator: 'bg-slate-400',
        label: 'Партия',
      };
  }
}

export function formatDateRu(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const months = [
      'янв', 'фев', 'мар', 'апр', 'май', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export interface RowFifoStatus {
  urgency: 'critical' | 'warning' | 'fresh' | 'empty';
  label: string;
  badgeClass: string;
  barClass: string;
  borderClass: string;
  glowClass: string;
  minDays?: number;
  oldestBatchNumber?: string;
  fifoRank?: number;
}

/**
 * Получить список партий (элементов) в секции с поддержкой старой и новой структуры.
 */
export function getSectionItems(sec: YardSection): YardSectionItem[] {
  if (sec.items && sec.items.length > 0) {
    return sec.items;
  }
  if (sec.batchId && sec.currentPallets > 0) {
    return [
      {
        batchId: sec.batchId,
        batchNumber: sec.batchNumber || 'ПАРТИЯ',
        bottleTypeName: sec.bottleTypeName || 'Бутылка',
        manufactureDate: sec.manufactureDate || '',
        expiryDate: sec.expiryDate || '',
        vehiclePlate: sec.vehiclePlate,
        palletsCount: sec.currentPallets,
      },
    ];
  }
  return [];
}

/**
 * Получить сводку всех уникальных партий с точным суммированием паллет в ряду.
 */
export function getBatchesInRow(
  row: YardRow,
  rankedMap?: Map<string, FifoRankedBatch>
) {
  const batchMap = new Map<
    string,
    {
      batchId: string;
      batchNumber: string;
      bottleTypeName: string;
      manufactureDate?: string | null;
      expiryDate?: string | null;
      vehiclePlate?: string;
      palletsCount: number;
    }
  >();

  row.sections.forEach((sec) => {
    const items = getSectionItems(sec);
    items.forEach((item) => {
      const existing = batchMap.get(item.batchId);
      if (existing) {
        existing.palletsCount += item.palletsCount;
      } else {
        batchMap.set(item.batchId, {
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          bottleTypeName: item.bottleTypeName,
          manufactureDate: item.manufactureDate,
          expiryDate: item.expiryDate,
          vehiclePlate: item.vehiclePlate,
          palletsCount: item.palletsCount,
        });
      }
    });
  });

  return Array.from(batchMap.values()).map((b) => ({
    ...b,
    ranked: rankedMap?.get(b.batchId),
  }));
}

/**
 * Определение светофорного статуса ряда (зеленый / желтый / красный)
 * по самой срочной партии в ряду.
 */
export function getRowFifoStatus(row: YardRow, rankedBatches: FifoRankedBatch[]): RowFifoStatus {
  const occupied = row.sections.reduce((acc, s) => acc + s.currentPallets, 0);

  if (occupied === 0) {
    return {
      urgency: 'empty',
      label: 'Пустой (26 мест)',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      barClass: 'bg-emerald-500',
      borderClass: 'border-slate-800 hover:border-emerald-500/50',
      glowClass: '',
    };
  }

  // Find all batches present in this row
  const batchesInRow = getBatchesInRow(row);
  const rowBatchIds = batchesInRow.map((b) => b.batchId);

  const matchedBatches = rankedBatches.filter((b) => rowBatchIds.includes(b.id));

  // If no ranked batches found (e.g. fresh custom batch)
  if (matchedBatches.length === 0) {
    return {
      urgency: 'fresh',
      label: 'Свежая партия',
      badgeClass: 'bg-emerald-600 text-white font-bold',
      barClass: 'bg-emerald-500',
      borderClass: 'border-emerald-600/80 hover:border-emerald-500',
      glowClass: '',
    };
  }

  // Sort batches by urgency: critical > warning > normal > fresh, then by fifoRank
  const sorted = [...matchedBatches].sort((a, b) => {
    const priority = { critical: 4, warning: 3, normal: 2, fresh: 1 };
    const prioDiff = (priority[b.urgency] || 0) - (priority[a.urgency] || 0);
    if (prioDiff !== 0) return prioDiff;
    return a.fifoRank - b.fifoRank;
  });

  const mostUrgent = sorted[0];

  if (mostUrgent.urgency === 'critical' || mostUrgent.fifoRank === 1) {
    return {
      urgency: 'critical',
      label: mostUrgent.fifoRank === 1 ? 'FIFO #1 (Старейшая)' : 'Критический FIFO',
      badgeClass: 'bg-red-500 text-white font-black animate-pulse shadow-sm shadow-red-500/40',
      barClass: 'bg-red-500',
      borderClass: 'border-red-500 ring-2 ring-red-500/60 shadow-lg shadow-red-950/60',
      glowClass: 'shadow-red-500/20',
      minDays: mostUrgent.daysUntilExpiry,
      oldestBatchNumber: mostUrgent.batchNumber,
      fifoRank: mostUrgent.fifoRank,
    };
  }

  if (mostUrgent.urgency === 'warning' || mostUrgent.fifoRank <= 3) {
    return {
      urgency: 'warning',
      label: `В очереди (FIFO #${mostUrgent.fifoRank})`,
      badgeClass: 'bg-amber-400 text-slate-950 font-black shadow-sm',
      barClass: 'bg-amber-400',
      borderClass: 'border-amber-400 ring-1 ring-amber-400/50 shadow-md shadow-amber-950/40',
      glowClass: 'shadow-amber-500/10',
      minDays: mostUrgent.daysUntilExpiry,
      oldestBatchNumber: mostUrgent.batchNumber,
      fifoRank: mostUrgent.fifoRank,
    };
  }

  return {
    urgency: 'fresh',
    label: 'Свежая партия',
    badgeClass: 'bg-emerald-600 text-white font-bold',
    barClass: 'bg-emerald-500',
    borderClass: 'border-emerald-600/80 hover:border-emerald-500',
    glowClass: '',
    minDays: mostUrgent.daysUntilExpiry,
    oldestBatchNumber: mostUrgent.batchNumber,
    fifoRank: mostUrgent.fifoRank,
  };
}
