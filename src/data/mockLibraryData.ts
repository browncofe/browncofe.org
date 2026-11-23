import { Booking, ClosedDayInfo, DemoSettings, SeatInfo, TimeSelection, ZoneInfo } from '../types/library';

export const SIMULATED_TODAY = '2026-11-23';
export const SIMULATED_NOW_HOUR = 14;
export const SIMULATED_NOW_MINUTE = 5;
export const SIMULATED_NOW_LABEL = '14:05';

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 22;

export const DEMO_STUDENT = {
  name: '王小明',
  studentId: '112340015',
  department: '互動設計系 示範帳號',
};

export const DEFAULT_DEMO_SETTINGS: DemoSettings = {
  checkInGraceMinutes: 15,
  tempAwayMinutes: 30,
};

export const DEFAULT_TIME_SELECTION: TimeSelection = {
  date: '2026-11-24',
  startHour: 14,
  endHour: 16,
};

export const CLOSED_DAYS: ClosedDayInfo[] = [
  { date: '2026-11-28', reason: '館舍清潔與消防演練休館' },
  { date: '2026-12-06', reason: '電力與空調年度保養休館' },
  { date: '2026-12-20', reason: '館藏盤點作業休館' },
];

export const ZONES: ZoneInfo[] = [
  {
    id: 'A',
    name: 'A 區',
    subtitle: '安靜閱讀',
    floorLabel: 'B1 自習室西側',
    status: 'open',
    totalSeats: 24,
    features: ['全區禁聲自習', '北側大片採光窗', '部分座位附插座'],
    description: '適合考前衝刺與長時段靜心研讀，請將手機調為靜音模式。',
  },
  {
    id: 'B',
    name: 'B 區',
    subtitle: '筆電使用',
    floorLabel: 'B1 自習室東側',
    status: 'open',
    totalSeats: 24,
    features: ['可使用筆電與滑鼠', '全席配備雙孔插座', '桌距寬敞'],
    description: '開放筆記型電腦與平板操作，每個座位均附獨立電源插座與閱讀燈。',
  },
  {
    id: 'C',
    name: 'C 區',
    subtitle: '靠窗閱讀',
    floorLabel: '2F 閱覽長廊',
    status: 'maintenance',
    totalSeats: 18,
    features: ['自然採光原木長桌', '獨立靠窗單人席', '低噪輕聲區'],
    description: '本區目前進行燈具與桌面插座迴路年度檢修，暫不開放座位預約。',
    maintenanceNote: '設備維護中，預計本週六恢復開放',
  },
];

function buildZoneASeats(): SeatInfo[] {
  const noPowerSet = new Set(['A-002', 'A-005', 'A-010', 'A-013', 'A-018', 'A-021']);
  const seats: SeatInfo[] = [];
  let num = 1;
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 6; col++) {
      const id = `A-${String(num).padStart(3, '0')}`;
      seats.push({
        id,
        zoneId: 'A',
        row,
        col,
        hasPower: !noPowerSet.has(id),
        hasWindow: row === 1, // North window wall is directly behind Row 1
      });
      num++;
    }
  }
  return seats;
}

function buildZoneBSeats(): SeatInfo[] {
  const seats: SeatInfo[] = [];
  let num = 1;
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 6; col++) {
      const id = `B-${String(num).padStart(3, '0')}`;
      seats.push({
        id,
        zoneId: 'B',
        row,
        col,
        hasPower: true, // Laptop zone: every desk has outlets
        hasWindow: row === 1 || col === 6, // North window + East side window
      });
      num++;
    }
  }
  return seats;
}

function buildZoneCSeats(): SeatInfo[] {
  const seats: SeatInfo[] = [];
  let num = 1;
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 6; col++) {
      const id = `C-${String(num).padStart(3, '0')}`;
      seats.push({
        id,
        zoneId: 'C',
        row,
        col,
        hasPower: col % 2 === 1 || row === 1,
        hasWindow: row === 1 || row === 2,
        isMaintenance: true,
      });
      num++;
    }
  }
  return seats;
}

export const ALL_SEATS: SeatInfo[] = [
  ...buildZoneASeats(),
  ...buildZoneBSeats(),
  ...buildZoneCSeats(),
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-demo-101',
    seatId: 'A-023',
    zoneId: 'A',
    date: '2026-11-23',
    startHour: 14,
    endHour: 16,
    status: 'pending',
    createdAt: '2026-11-23T13:42:00',
  },
  {
    id: 'bk-demo-102',
    seatId: 'B-012',
    zoneId: 'B',
    date: '2026-11-24',
    startHour: 10,
    endHour: 12,
    status: 'pending',
    createdAt: '2026-11-23T11:20:00',
  },
  {
    id: 'bk-demo-103',
    seatId: 'A-004',
    zoneId: 'A',
    date: '2026-11-20',
    startHour: 13,
    endHour: 17,
    status: 'completed',
    createdAt: '2026-11-19T21:10:00',
    checkedInAt: '2026-11-20 13:06',
    endedAt: '2026-11-20 16:48',
    statusNote: '已於使用結束前釋出座位',
  },
  {
    id: 'bk-demo-104',
    seatId: 'B-008',
    zoneId: 'B',
    date: '2026-11-19',
    startHour: 9,
    endHour: 11,
    status: 'cancelled',
    createdAt: '2026-11-18T18:05:00',
    endedAt: '2026-11-19 08:30',
    statusNote: '行程調整，已主動取消預約',
  },
  {
    id: 'bk-demo-105',
    seatId: 'A-014',
    zoneId: 'A',
    date: '2026-11-18',
    startHour: 18,
    endHour: 20,
    status: 'expired',
    createdAt: '2026-11-18T15:30:00',
    statusNote: '超過報到寬限時間，系統自動釋出',
  },
];
