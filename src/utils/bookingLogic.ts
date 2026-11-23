import {
  ALL_SEATS,
  CLOSED_DAYS,
  SIMULATED_NOW_HOUR,
  SIMULATED_NOW_MINUTE,
  SIMULATED_TODAY,
  ZONES,
} from '../data/mockLibraryData';
import {
  Booking,
  BookingStatus,
  ClosedDayInfo,
  SeatInfo,
  SeatStatus,
  ZoneId,
  ZoneInfo,
} from '../types/library';

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['pending', 'in_use', 'temp_away'];

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatTimeRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)}–${formatHour(endHour)}`;
}

export function addMinutesToHour(hour: number, minutesToAdd: number): string {
  const totalMinutes = hour * 60 + minutesToAdd;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToClock(baseHour: number, baseMinute: number, minutesToAdd: number): string {
  const totalMinutes = baseHour * 60 + baseMinute + minutesToAdd;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAYS_TW = ['日', '一', '二', '三', '四', '五', '六'];

export function getWeekdayTW(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return WEEKDAYS_TW[dt.getDay()];
}

export function formatDateTW(dateStr: string, includeYear = true): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = getWeekdayTW(dateStr);
  if (includeYear) {
    return `${y} 年 ${m} 月 ${d} 日（${weekday}）`;
  }
  return `${m} 月 ${d} 日（${weekday}）`;
}

export function formatDateShortTW(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const weekday = getWeekdayTW(dateStr);
  return `${m} 月 ${d} 日 (${weekday})`;
}

export function getClosedDayInfo(dateStr: string): ClosedDayInfo | undefined {
  return CLOSED_DAYS.find((d) => d.date === dateStr);
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < SIMULATED_TODAY;
}

export function isDateDisabled(dateStr: string): { disabled: boolean; reason?: string } {
  if (isPastDate(dateStr)) {
    return { disabled: true, reason: '已過期日期無法預約' };
  }
  const closed = getClosedDayInfo(dateStr);
  if (closed) {
    return { disabled: true, reason: `休館日：${closed.reason}` };
  }
  return { disabled: false };
}

export function isStartHourPastForDate(dateStr: string, startHour: number): boolean {
  if (dateStr < SIMULATED_TODAY) return true;
  if (dateStr > SIMULATED_TODAY) return false;
  // On simulated today (14:05), any hour <= 14 has already started/passed
  return startHour <= SIMULATED_NOW_HOUR;
}

export function hasTimeOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function findOverlappingUserBooking(
  bookings: Booking[],
  date: string,
  startHour: number,
  endHour: number
): Booking | undefined {
  return bookings.find(
    (bk) =>
      ACTIVE_BOOKING_STATUSES.includes(bk.status) &&
      bk.date === date &&
      hasTimeOverlap(bk.startHour, bk.endHour, startHour, endHour)
  );
}

/**
 * Deterministic mock occupancy by other library patrons so seat statuses
 * stay consistent for any given (date, hour, seat) across navigations.
 */
function isBackgroundSeatOccupiedAtHour(seat: SeatInfo, date: string, hour: number): boolean {
  if (seat.isMaintenance) return false;

  // Keep A-023 and B-012 free in background so demo bookings/happy-path never collide weirdly
  if (date === '2026-11-23' && hour >= 14 && hour < 16 && seat.id === 'A-023') return false;
  if (date === '2026-11-24' && hour >= 10 && hour < 12 && seat.id === 'B-012') return false;
  if (date === '2026-11-24' && hour >= 14 && hour < 16 && seat.id === 'A-023') return false;

  // Specific realistic visual pattern for 2026-11-24 14:00-16:00 matching classroom demo
  if (date === '2026-11-24' && hour >= 14 && hour < 16 && seat.zoneId === 'A') {
    const occupiedA = new Set([
      'A-002', 'A-005', 'A-010', 'A-013', 'A-018', 'A-021',
      'A-006', 'A-011', 'A-016',
    ]);
    return occupiedA.has(seat.id);
  }

  const key = `${date}-${hour}-${seat.id}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  // Current afternoon tends to be busier (~62% in A, ~66% in B); future slots ~42%
  const isNowWindow = date === SIMULATED_TODAY && hour >= SIMULATED_NOW_HOUR && hour <= SIMULATED_NOW_HOUR + 1;
  const threshold = isNowWindow
    ? seat.zoneId === 'A'
      ? 62
      : 66
    : seat.zoneId === 'A'
      ? 38
      : 45;

  return hash % 100 < threshold;
}

export function isSeatOccupiedByUser(
  seatId: string,
  date: string,
  startHour: number,
  endHour: number,
  userBookings: Booking[]
): boolean {
  return userBookings.some(
    (bk) =>
      ACTIVE_BOOKING_STATUSES.includes(bk.status) &&
      bk.seatId === seatId &&
      bk.date === date &&
      hasTimeOverlap(bk.startHour, bk.endHour, startHour, endHour)
  );
}

export function computeSeatStatus(
  seat: SeatInfo,
  zone: ZoneInfo,
  date: string,
  startHour: number,
  endHour: number,
  userBookings: Booking[],
  selectedSeatId: string | null
): SeatStatus {
  if (zone.status === 'maintenance' || seat.isMaintenance) {
    return 'maintenance';
  }

  if (isSeatOccupiedByUser(seat.id, date, startHour, endHour, userBookings)) {
    return 'unavailable';
  }

  for (let h = startHour; h < endHour; h++) {
    if (isBackgroundSeatOccupiedAtHour(seat, date, h)) {
      return 'unavailable';
    }
  }

  if (selectedSeatId === seat.id) {
    return 'selected';
  }

  return 'available';
}

export interface ZoneAvailabilitySummary {
  zone: ZoneInfo;
  availableCount: number;
  totalCount: number;
  occupiedCount: number;
  isMaintenance: boolean;
}

export function getZoneAvailabilityForSlot(
  zoneId: ZoneId,
  date: string,
  startHour: number,
  endHour: number,
  userBookings: Booking[]
): ZoneAvailabilitySummary {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const seats = ALL_SEATS.filter((s) => s.zoneId === zoneId);

  if (zone.status === 'maintenance') {
    return {
      zone,
      availableCount: 0,
      totalCount: zone.totalSeats,
      occupiedCount: 0,
      isMaintenance: true,
    };
  }

  let availableCount = 0;
  for (const seat of seats) {
    const status = computeSeatStatus(seat, zone, date, startHour, endHour, userBookings, null);
    if (status === 'available') {
      availableCount++;
    }
  }

  return {
    zone,
    availableCount,
    totalCount: seats.length,
    occupiedCount: seats.length - availableCount,
    isMaintenance: false,
  };
}

export function getCurrentZoneAvailability(
  zoneId: ZoneId,
  userBookings: Booking[]
): ZoneAvailabilitySummary {
  return getZoneAvailabilityForSlot(
    zoneId,
    SIMULATED_TODAY,
    SIMULATED_NOW_HOUR,
    SIMULATED_NOW_HOUR + 1,
    userBookings
  );
}

export function getCheckInDeadlineLabel(booking: Booking, checkInGraceMinutes: number): string {
  return addMinutesToHour(booking.startHour, checkInGraceMinutes);
}

export function getEstimatedRemainingUseMinutes(booking: Booking): number {
  const endMinutes = booking.endHour * 60;
  const currentMinutes = SIMULATED_NOW_HOUR * 60 + SIMULATED_NOW_MINUTE;
  if (booking.date === SIMULATED_TODAY) {
    return Math.max(0, endMinutes - currentMinutes);
  }
  return (booking.endHour - booking.startHour) * 60;
}

export function formatMinutesAsHMS(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function getBookingStatusMeta(status: BookingStatus): {
  label: string;
  symbol: string;
  className: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: '待報到',
        symbol: '◷',
        className: 'bg-ochre-tint text-ochre border border-ochre-border',
      };
    case 'in_use':
      return {
        label: '使用中',
        symbol: '●',
        className: 'bg-moss-tint text-moss border border-moss-border',
      };
    case 'temp_away':
      return {
        label: '暫離中',
        symbol: '⏸',
        className: 'bg-ochre-tint text-ochre border border-ochre-border',
      };
    case 'completed':
      return {
        label: '已完成',
        symbol: '✓',
        className: 'bg-paper-muted text-ink-muted border border-line',
      };
    case 'cancelled':
      return {
        label: '已取消',
        symbol: '✕',
        className: 'bg-paper-muted text-ink-muted border border-line',
      };
    case 'expired':
      return {
        label: '已逾時',
        symbol: '!',
        className: 'bg-stone-200/80 text-stone-700 border border-stone-300',
      };
  }
}
