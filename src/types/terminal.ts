/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FifoUrgency = 'critical' | 'warning' | 'normal' | 'fresh';

export interface YardSectionItem {
  batchId: string;
  batchNumber: string;
  bottleTypeName: string;
  manufactureDate: string;
  expiryDate: string;
  vehiclePlate?: string;
  palletsCount: number;
}

export interface YardSection {
  id: string; // e.g. "1-1", "1-2" .. "12-7"
  rowId: string; // "1", "2", ..., "12"
  sectionNum: number; // 1..7
  capacity: number; // Вместимость секции (обычно 4 паллеты, секция 7 на 2 паллеты = 26 в ряду)
  currentPallets: number;
  items?: YardSectionItem[]; // Поддержка нескольких партий в одной секции
  batchId: string | null;
  batchNumber: string | null;
  bottleTypeName: string | null;
  manufactureDate: string | null; // Дата изготовления (напр: 2026-10-22)
  expiryDate: string | null;
  vehiclePlate?: string;
  status: 'empty' | 'occupied';
}

export interface YardRow {
  id: string; // e.g. "A1", "A2" ... "B1", "B2"
  name: string; // "Ряд A1", "Ряд B2"
  sectionLetter: string; // 'A' | 'B' | etc.
  rowNumber: number; // 1, 2, ...
  maxPallets: number; // 26 паллет
  description?: string;
  sections: YardSection[]; // 7 отсеков в ряду
}

export interface PlantFeedEvent {
  id: string;
  timestamp: string;
  batchNumber: string;
  bottleTypeName: string;
  palletsCount: number;
  sourceRowId: string;
  sourceRowName: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
}

export interface BottleBatch {
  id: string;
  batchNumber: string;
  bottleTypeName: string;
  supplier: string;
  vehiclePlate: string;
  manufactureDate: string; // Дата выработки
  expiryDate: string;
  arrivalDate: string;
  totalPallets: number;
  remainingPallets: number;
  sectionIds: string[]; // Список секций (напр: ["Ряд A1"])
  notes?: string;
}

export interface FifoRankedBatch extends BottleBatch {
  fifoRank: number;
  daysUntilExpiry: number;
  urgency: FifoUrgency;
  isOldestOverall: boolean;
  isOldestInBrand: boolean;
}

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  action: 'unload' | 'pickup' | 'move' | 'topup' | 'manual_place';
  batchNumber: string;
  bottleTypeName: string;
  vehiclePlate?: string;
  sectionId?: string;
  rowId?: string;
  targetSectionId?: string;
  targetRowId?: string;
  palletsCount: number;
  operatorName: string;
  notes?: string;
}
