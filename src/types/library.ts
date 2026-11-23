export type PageId = 'dashboard' | 'calendar' | 'seatmap' | 'bookings';

export type ZoneId = 'A' | 'B' | 'C';

export type ZoneStatus = 'open' | 'maintenance';

export type SeatStatus = 'available' | 'unavailable' | 'selected' | 'maintenance';

export type BookingStatus =
  | 'pending'
  | 'in_use'
  | 'temp_away'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  subtitle: string;
  floorLabel: string;
  status: ZoneStatus;
  totalSeats: number;
  features: string[];
  description: string;
  maintenanceNote?: string;
}

export interface SeatInfo {
  id: string;
  zoneId: ZoneId;
  row: number;
  col: number;
  hasPower: boolean;
  hasWindow: boolean;
  isMaintenance?: boolean;
}

export interface Booking {
  id: string;
  seatId: string;
  zoneId: ZoneId;
  date: string; // YYYY-MM-DD
  startHour: number; // 8..21
  endHour: number; // 9..22
  status: BookingStatus;
  createdAt: string;
  checkedInAt?: string;
  tempAwayStartedAt?: string;
  tempAwayReturnBy?: string; // HH:mm
  endedAt?: string;
  statusNote?: string;
}

export interface TimeSelection {
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
}

export interface DemoSettings {
  checkInGraceMinutes: number;
  tempAwayMinutes: number;
}

export interface ClosedDayInfo {
  date: string;
  reason: string;
}
