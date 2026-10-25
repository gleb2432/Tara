/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { YardRow, BottleBatch, OperationLogEntry, YardSection } from '../types/terminal';

export const DEFAULT_BOTTLE_BRANDS: string[] = [
  'Бад (Bud)',
  'Эмеральда',
  'Балтика 0.5л',
  'Жигули Барное',
  'Козель Темный',
  'Хайнекен',
  'Бордо 0.75л',
  'Банка ТО-82 0.5л',
];

// 12 буквенных секций склада (A, B, C, D, E, F, G, H, I, J, K, L)
export const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Генератор 7 отсеков/мест для ряда (секции 1-6 по 4 паллеты, секция 7 на 2 паллеты = 26 паллет в ряду)
export function createSectionsForRow(rowId: string): YardSection[] {
  return Array.from({ length: 7 }, (_, idx) => {
    const secNum = idx + 1;
    const capacity = secNum === 7 ? 2 : 4;
    return {
      id: `${rowId}-${secNum}`,
      rowId,
      sectionNum: secNum,
      capacity,
      currentPallets: 0,
      batchId: null,
      batchNumber: null,
      bottleTypeName: null,
      manufactureDate: null,
      expiryDate: null,
      status: 'empty',
    };
  });
}

// Заполнение отсеков ряда
function fillRowSections(
  sections: YardSection[],
  fromSec: number,
  toSec: number,
  palletsPerSec: number,
  batchData: {
    batchId: string;
    batchNumber: string;
    bottleTypeName: string;
    manufactureDate: string;
    expiryDate: string;
    vehiclePlate?: string;
  }
) {
  for (let s = fromSec; s <= toSec && s <= sections.length; s++) {
    const idx = s - 1;
    const cap = sections[idx].capacity;
    const count = Math.min(cap, palletsPerSec);
    sections[idx] = {
      ...sections[idx],
      currentPallets: count,
      batchId: batchData.batchId,
      batchNumber: batchData.batchNumber,
      bottleTypeName: batchData.bottleTypeName,
      manufactureDate: batchData.manufactureDate,
      expiryDate: batchData.expiryDate,
      vehiclePlate: batchData.vehiclePlate,
      status: 'occupied',
    };
  }
}

// ---------------- НАЧАЛЬНЫЕ ДАННЫЕ ДЛЯ РЯДОВ ----------------

// Ряд A1: Бад (Bud) 26/26 (все 7 отсеков заняты 4 партиями)
const rowA1Sections = createSectionsForRow('A1');
fillRowSections(rowA1Sections, 1, 2, 4, {
  batchId: 'batch-bud-22',
  batchNumber: 'БАД-22/10',
  bottleTypeName: 'Бад (Bud)',
  manufactureDate: '2026-10-22',
  expiryDate: '2027-04-22',
  vehiclePlate: 'А 742 УЕ 777',
});
fillRowSections(rowA1Sections, 3, 4, 4, {
  batchId: 'batch-bud-23',
  batchNumber: 'БАД-23/10',
  bottleTypeName: 'Бад (Bud)',
  manufactureDate: '2026-10-23',
  expiryDate: '2027-04-23',
  vehiclePlate: 'А 742 УЕ 777',
});
fillRowSections(rowA1Sections, 5, 6, 4, {
  batchId: 'batch-bud-24',
  batchNumber: 'БАД-24/10',
  bottleTypeName: 'Бад (Bud)',
  manufactureDate: '2026-10-24',
  expiryDate: '2027-04-24',
  vehiclePlate: 'А 742 УЕ 777',
});
fillRowSections(rowA1Sections, 7, 7, 2, {
  batchId: 'batch-bud-25',
  batchNumber: 'БАД-25/10',
  bottleTypeName: 'Бад (Bud)',
  manufactureDate: '2026-10-25',
  expiryDate: '2027-04-25',
  vehiclePlate: 'А 742 УЕ 777',
});

// Ряд A2: Эмеральда в секциях 1-4 (16 пал.)
const rowA2Sections = createSectionsForRow('A2');
fillRowSections(rowA2Sections, 1, 4, 4, {
  batchId: 'batch-em-20',
  batchNumber: 'ЭМ-20/10',
  bottleTypeName: 'Эмеральда',
  manufactureDate: '2026-10-20',
  expiryDate: '2027-04-20',
  vehiclePlate: 'О 913 ВВ 190',
});

// Ряд A3: Бад от 18.10 в секциях 1-2 (8 пал.) - FIFO #1
const rowA3Sections = createSectionsForRow('A3');
fillRowSections(rowA3Sections, 1, 2, 4, {
  batchId: 'batch-bud-18',
  batchNumber: 'БАД-18/10',
  bottleTypeName: 'Бад (Bud)',
  manufactureDate: '2026-10-18',
  expiryDate: '2027-04-18',
  vehiclePlate: 'К 331 РТ 77',
});

// Ряд B1: Балтика 0.5л в секциях 1-3 (12 пал.)
const rowB1Sections = createSectionsForRow('B1');
fillRowSections(rowB1Sections, 1, 3, 4, {
  batchId: 'batch-balt-19',
  batchNumber: 'БАЛТ-19/10',
  bottleTypeName: 'Балтика 0.5л',
  manufactureDate: '2026-10-19',
  expiryDate: '2027-04-19',
  vehiclePlate: 'Е 552 КК 77',
});

// Ряд B2: Хайнекен в секциях 1-2 (8 пал.)
const rowB2Sections = createSectionsForRow('B2');
fillRowSections(rowB2Sections, 1, 2, 4, {
  batchId: 'batch-hein-21',
  batchNumber: 'ХАЙН-21/10',
  bottleTypeName: 'Хайнекен',
  manufactureDate: '2026-10-21',
  expiryDate: '2027-04-21',
  vehiclePlate: 'М 118 АА 77',
});

// Ряд C1: Жигули Барное в секциях 1-4 (16 пал.)
const rowC1Sections = createSectionsForRow('C1');
fillRowSections(rowC1Sections, 1, 4, 4, {
  batchId: 'batch-zhig-21',
  batchNumber: 'ЖИГ-21/10',
  bottleTypeName: 'Жигули Барное',
  manufactureDate: '2026-10-21',
  expiryDate: '2027-04-21',
  vehiclePlate: 'В 220 ТР 77',
});

// Ряд D1: Козель Темный в секциях 1-3 (12 пал.)
const rowD1Sections = createSectionsForRow('D1');
fillRowSections(rowD1Sections, 1, 3, 4, {
  batchId: 'batch-kozel-22',
  batchNumber: 'КОЗ-22/10',
  bottleTypeName: 'Козель Темный',
  manufactureDate: '2026-10-22',
  expiryDate: '2027-04-22',
  vehiclePlate: 'Р 404 НН 197',
});

// Создаем 12 СЕКЦИЙ (A, B, C, D, E, F, G, H, I, J, K, L), в каждой по 7 рядов (1..7)
export const INITIAL_YARD_ROWS: YardRow[] = SECTION_LETTERS.flatMap((letter) => {
  return Array.from({ length: 7 }, (_, i) => {
    const num = i + 1;
    const id = `${letter}${num}`;
    let sec = createSectionsForRow(id);
    let desc = `Пустой ряд ${id}. Свободно 26 мест.`;

    if (id === 'A1') {
      sec = rowA1Sections;
      desc = '4 партии Бада (22.10..25.10). Заполнен 26/26.';
    } else if (id === 'A2') {
      sec = rowA2Sections;
      desc = 'Эмеральда (16 пал). Свободно 10 мест под догруз.';
    } else if (id === 'A3') {
      sec = rowA3Sections;
      desc = 'Бад от 18.10 (8 пал). Критический FIFO! Свободно 18 мест.';
    } else if (id === 'B1') {
      sec = rowB1Sections;
      desc = 'Балтика 0.5л (12 пал). Свободно 14 мест под догруз.';
    } else if (id === 'B2') {
      sec = rowB2Sections;
      desc = 'Хайнекен (8 пал). Свободно 18 мест под догруз.';
    } else if (id === 'C1') {
      sec = rowC1Sections;
      desc = 'Жигули Барное (16 пал). Свободно 10 мест под догруз.';
    } else if (id === 'D1') {
      sec = rowD1Sections;
      desc = 'Козель Темный (12 пал). Свободно 14 мест под догруз.';
    }

    return {
      id,
      name: `Ряд ${id}`,
      sectionLetter: letter,
      rowNumber: num,
      maxPallets: 26,
      description: desc,
      sections: sec,
    };
  });
});

export const INITIAL_BATCHES: BottleBatch[] = [
  {
    id: 'batch-bud-18',
    batchNumber: 'БАД-18/10',
    bottleTypeName: 'Бад (Bud)',
    supplier: 'Часцовский СЗ',
    vehiclePlate: 'К 331 РТ 77',
    manufactureDate: '2026-10-18',
    expiryDate: '2027-04-18', // FIFO #1
    arrivalDate: '2026-10-20T09:20',
    totalPallets: 8,
    remainingPallets: 8,
    sectionIds: ['Ряд A3'],
    notes: 'Старейшая партия Бад от 18.10 в Ряду A3. Свободно 18 мест под догруз!',
  },
  {
    id: 'batch-balt-19',
    batchNumber: 'БАЛТ-19/10',
    bottleTypeName: 'Балтика 0.5л',
    supplier: 'Балтика Стекло',
    vehiclePlate: 'Е 552 КК 77',
    manufactureDate: '2026-10-19',
    expiryDate: '2027-04-19', // FIFO #2
    arrivalDate: '2026-10-21T10:00',
    totalPallets: 12,
    remainingPallets: 12,
    sectionIds: ['Ряд B1'],
    notes: 'Балтика 0.5л от 19.10 в Ряду B1. Свободно 14 мест под догруз!',
  },
  {
    id: 'batch-em-20',
    batchNumber: 'ЭМ-20/10',
    bottleTypeName: 'Эмеральда',
    supplier: 'Русджам Покровский',
    vehiclePlate: 'О 913 ВВ 190',
    manufactureDate: '2026-10-20',
    expiryDate: '2027-04-20',
    arrivalDate: '2026-10-23T11:45',
    totalPallets: 16,
    remainingPallets: 16,
    sectionIds: ['Ряд A2'],
    notes: 'Эмеральда от 20.10 в Ряду A2. Свободно 10 мест под догруз!',
  },
  {
    id: 'batch-hein-21',
    batchNumber: 'ХАЙН-21/10',
    bottleTypeName: 'Хайнекен',
    supplier: 'Стеклозавод Волга',
    vehiclePlate: 'М 118 АА 77',
    manufactureDate: '2026-10-21',
    expiryDate: '2027-04-21',
    arrivalDate: '2026-10-23T16:00',
    totalPallets: 8,
    remainingPallets: 8,
    sectionIds: ['Ряд B2'],
    notes: 'Хайнекен от 21.10 в Ряду B2. Свободно 18 мест!',
  },
  {
    id: 'batch-zhig-21',
    batchNumber: 'ЖИГ-21/10',
    bottleTypeName: 'Жигули Барное',
    supplier: 'МПК Завод',
    vehiclePlate: 'В 220 ТР 77',
    manufactureDate: '2026-10-21',
    expiryDate: '2027-04-21',
    arrivalDate: '2026-10-23T17:30',
    totalPallets: 16,
    remainingPallets: 16,
    sectionIds: ['Ряд C1'],
    notes: 'Жигули Барное в Ряду C1',
  },
  {
    id: 'batch-kozel-22',
    batchNumber: 'КОЗ-22/10',
    bottleTypeName: 'Козель Темный',
    supplier: 'Калуга Стекло',
    vehiclePlate: 'Р 404 НН 197',
    manufactureDate: '2026-10-22',
    expiryDate: '2027-04-22',
    arrivalDate: '2026-10-24T07:10',
    totalPallets: 12,
    remainingPallets: 12,
    sectionIds: ['Ряд D1'],
    notes: 'Козель Темный в Ряду D1',
  },
  {
    id: 'batch-bud-22',
    batchNumber: 'БАД-22/10',
    bottleTypeName: 'Бад (Bud)',
    supplier: 'Сибирь Стекло',
    vehiclePlate: 'А 742 УЕ 777',
    manufactureDate: '2026-10-22',
    expiryDate: '2027-04-22',
    arrivalDate: '2026-10-24T08:00',
    totalPallets: 8,
    remainingPallets: 8,
    sectionIds: ['Ряд A1'],
    notes: 'Партия Бад от 22.10 в Ряду A1',
  },
  {
    id: 'batch-bud-23',
    batchNumber: 'БАД-23/10',
    bottleTypeName: 'Бад (Bud)',
    supplier: 'Сибирь Стекло',
    vehiclePlate: 'А 742 УЕ 777',
    manufactureDate: '2026-10-23',
    expiryDate: '2027-04-23',
    arrivalDate: '2026-10-24T08:15',
    totalPallets: 8,
    remainingPallets: 8,
    sectionIds: ['Ряд A1'],
    notes: 'Партия Бад от 23.10 в Ряду A1',
  },
  {
    id: 'batch-bud-24',
    batchNumber: 'БАД-24/10',
    bottleTypeName: 'Бад (Bud)',
    supplier: 'Сибирь Стекло',
    vehiclePlate: 'А 742 УЕ 777',
    manufactureDate: '2026-10-24',
    expiryDate: '2027-04-24',
    arrivalDate: '2026-10-24T08:30',
    totalPallets: 8,
    remainingPallets: 8,
    sectionIds: ['Ряд A1'],
    notes: 'Партия Бад от 24.10 в Ряду A1',
  },
  {
    id: 'batch-bud-25',
    batchNumber: 'БАД-25/10',
    bottleTypeName: 'Бад (Bud)',
    supplier: 'Сибирь Стекло',
    vehiclePlate: 'А 742 УЕ 777',
    manufactureDate: '2026-10-25',
    expiryDate: '2027-04-25',
    arrivalDate: '2026-10-24T08:45',
    totalPallets: 2,
    remainingPallets: 2,
    sectionIds: ['Ряд A1'],
    notes: 'Партия Бад от 25.10 в Ряду A1',
  },
];

export const INITIAL_LOGS: OperationLogEntry[] = [
  {
    id: 'log-01',
    timestamp: '2026-10-24 14:15',
    action: 'pickup',
    batchNumber: 'БАД-18/10',
    bottleTypeName: 'Бад (Bud)',
    sectionId: 'Ряд A3',
    rowId: 'A3',
    palletsCount: 8,
    operatorName: 'Водитель погрузчика',
    notes: 'Забрали 8 паллет Бада от 18.10 из Ряда A3 на розлив. Подано в цех завода.',
  },
  {
    id: 'log-02',
    timestamp: '2026-10-24 09:00',
    action: 'unload',
    batchNumber: 'БАД-22..25/10',
    bottleTypeName: 'Бад (Bud)',
    vehiclePlate: 'А 742 УЕ 777',
    sectionId: 'Ряд A1',
    rowId: 'A1',
    palletsCount: 26,
    operatorName: 'Водитель погрузчика',
    notes: 'Разгружена машина Бад: 4 партии в Ряд A1.',
  },
];
