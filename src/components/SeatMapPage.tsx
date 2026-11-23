import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Maximize2,
  Plug,
  RotateCcw,
  Sun,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ALL_SEATS, ZONES } from '../data/mockLibraryData';
import {
  Booking,
  DemoSettings,
  PageId,
  SeatInfo,
  SeatStatus,
  TimeSelection,
  ZoneId,
} from '../types/library';
import {
  addMinutesToHour,
  computeSeatStatus,
  findOverlappingUserBooking,
  formatDateShortTW,
  formatDateTW,
  formatTimeRange,
  getZoneAvailabilityForSlot,
  isDateDisabled,
  isStartHourPastForDate,
} from '../utils/bookingLogic';

interface SeatMapPageProps {
  activeZoneId: ZoneId;
  onChangeZone: (zoneId: ZoneId) => void;
  timeSelection: TimeSelection;
  selectedSeatId: string | null;
  onSelectSeat: (seatId: string | null) => void;
  seatInvalidNotice: string | null;
  onClearSeatInvalidNotice: () => void;
  bookings: Booking[];
  demoSettings: DemoSettings;
  onConfirmCreateBooking: (seat: SeatInfo) => Booking;
  onNavigate: (page: PageId) => void;
  onViewMyBookings: () => void;
}

export const SeatMapPage: React.FC<SeatMapPageProps> = ({
  activeZoneId,
  onChangeZone,
  timeSelection,
  selectedSeatId,
  onSelectSeat,
  seatInvalidNotice,
  onClearSeatInvalidNotice,
  bookings,
  demoSettings,
  onConfirmCreateBooking,
  onNavigate,
  onViewMyBookings,
}) => {
  const [filterPower, setFilterPower] = useState(false);
  const [filterWindow, setFilterWindow] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const activeZone = ZONES.find((z) => z.id === activeZoneId)!;
  const zoneSeats = useMemo(
    () => ALL_SEATS.filter((s) => s.zoneId === activeZoneId),
    [activeZoneId]
  );

  const durationHours = timeSelection.endHour - timeSelection.startHour;
  const dateCheck = isDateDisabled(timeSelection.date);
  const slotInPast = isStartHourPastForDate(timeSelection.date, timeSelection.startHour);
  const isSlotInvalid = dateCheck.disabled || slotInPast || durationHours <= 0;

  const overlappingBooking = findOverlappingUserBooking(
    bookings,
    timeSelection.date,
    timeSelection.startHour,
    timeSelection.endHour
  );

  const zoneSummaries = ZONES.map((z) =>
    getZoneAvailabilityForSlot(
      z.id,
      timeSelection.date,
      timeSelection.startHour,
      timeSelection.endHour,
      bookings
    )
  );

  const seatStatusMap = useMemo(() => {
    const map = new Map<string, SeatStatus>();
    for (const seat of zoneSeats) {
      map.set(
        seat.id,
        computeSeatStatus(
          seat,
          activeZone,
          timeSelection.date,
          timeSelection.startHour,
          timeSelection.endHour,
          bookings,
          selectedSeatId
        )
      );
    }
    return map;
  }, [
    zoneSeats,
    activeZone,
    timeSelection.date,
    timeSelection.startHour,
    timeSelection.endHour,
    bookings,
    selectedSeatId,
  ]);

  const matchingAvailableCount = useMemo(() => {
    let count = 0;
    for (const seat of zoneSeats) {
      const status = seatStatusMap.get(seat.id);
      if (status !== 'available' && status !== 'selected') continue;
      if (filterPower && !seat.hasPower) continue;
      if (filterWindow && !seat.hasWindow) continue;
      count++;
    }
    return count;
  }, [zoneSeats, seatStatusMap, filterPower, filterWindow]);

  const selectedSeat = useMemo(
    () => ALL_SEATS.find((s) => s.id === selectedSeatId) ?? null,
    [selectedSeatId]
  );

  const selectedSeatZone = selectedSeat
    ? ZONES.find((z) => z.id === selectedSeat.zoneId) ?? null
    : null;

  const selectedSeatStatus: SeatStatus | null = useMemo(() => {
    if (!selectedSeat || !selectedSeatZone) return null;
    return computeSeatStatus(
      selectedSeat,
      selectedSeatZone,
      timeSelection.date,
      timeSelection.startHour,
      timeSelection.endHour,
      bookings,
      selectedSeatId
    );
  }, [
    selectedSeat,
    selectedSeatZone,
    timeSelection.date,
    timeSelection.startHour,
    timeSelection.endHour,
    bookings,
    selectedSeatId,
  ]);

  // Group seats by row -> 3 desk pairs per row (cols 1-2, 3-4, 5-6) with vertical aisles between pairs
  const rows = useMemo(() => {
    const maxRow = Math.max(...zoneSeats.map((s) => s.row));
    const result: { rowNum: number; pairs: [SeatInfo, SeatInfo][] }[] = [];
    for (let r = 1; r <= maxRow; r++) {
      const rowSeats = zoneSeats
        .filter((s) => s.row === r)
        .sort((a, b) => a.col - b.col);
      const pairs: [SeatInfo, SeatInfo][] = [];
      for (let i = 0; i < rowSeats.length; i += 2) {
        if (rowSeats[i] && rowSeats[i + 1]) {
          pairs.push([rowSeats[i], rowSeats[i + 1]]);
        }
      }
      result.push({ rowNum: r, pairs });
    }
    return result;
  }, [zoneSeats]);

  const handleSeatClick = (seat: SeatInfo, status: SeatStatus) => {
    if (status === 'unavailable' || status === 'maintenance') return;
    onClearSeatInvalidNotice();
    if (selectedSeatId === seat.id) {
      onSelectSeat(null);
    } else {
      onSelectSeat(seat.id);
    }
  };

  const handleFinalConfirm = () => {
    if (!selectedSeat || overlappingBooking || isSlotInvalid) return;
    const created = onConfirmCreateBooking(selectedSeat);
    setShowConfirmModal(false);
    setCompletedBooking(created);
  };

  const canBookSelectedSeat =
    Boolean(selectedSeat) &&
    (selectedSeatStatus === 'selected' || selectedSeatStatus === 'available') &&
    !overlappingBooking &&
    !isSlotInvalid;

  return (
    <div className="space-y-6">
      {/* Page Title & 3-Step Indicator */}
      <section className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-center">
        <div>
          <h1 className="font-editorial text-3xl font-bold text-ink">選一個適合你的座位</h1>
          <p className="mt-1 text-sm text-ink-muted">
            點選平面圖中的可用座位，檢視設備配置後送出預約。
          </p>
        </div>

        <ol className="flex items-center gap-2 sm:gap-4 text-sm whitespace-nowrap shrink-0">
          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-moss-border bg-moss-tint text-xs font-bold text-moss tabular-nums">
              ✓
            </span>
            <span>選擇時間</span>
          </li>
          <span className="h-px w-6 bg-moss/40 sm:w-10" aria-hidden="true" />
          <li className="flex items-center gap-2 font-medium text-moss">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss text-xs font-bold text-white tabular-nums">
              2
            </span>
            <span>選擇座位</span>
          </li>
          <span className="h-px w-6 bg-line-strong sm:w-10" aria-hidden="true" />
          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-paper-card text-xs font-medium tabular-nums">
              3
            </span>
            <span>確認預約</span>
          </li>
        </ol>
      </section>

      {/* Selected Time Context Bar */}
      <section className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-paper-card px-5 py-3.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink tabular-nums">
          <span className="inline-flex items-center gap-2 font-medium">
            <Calendar className="h-4 w-4 text-moss" aria-hidden="true" />
            {formatDateShortTW(timeSelection.date)}{' '}
            {formatTimeRange(timeSelection.startHour, timeSelection.endHour)}
          </span>
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <Clock className="h-4 w-4 text-moss" aria-hidden="true" />
            共 {durationHours} 小時
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('calendar')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-moss underline underline-offset-4 hover:text-moss-hover whitespace-nowrap shrink-0"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          <span>修改日期或時間</span>
        </button>
      </section>

      {/* Notices: Invalid seat after time change, invalid time, or overlap conflict */}
      {seatInvalidNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-ochre-border bg-ochre-tint/70 px-4 py-3 text-sm text-ink"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-ochre" aria-hidden="true" />
            <span>{seatInvalidNotice}</span>
          </div>
          <button
            type="button"
            onClick={onClearSeatInvalidNotice}
            aria-label="關閉提示"
            className="rounded p-1 text-ink-muted hover:bg-paper/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isSlotInvalid && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ochre-border bg-ochre-tint/75 px-4 py-3 text-sm text-ink"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-ochre" aria-hidden="true" />
            <span>
              目前選定之時段無效（{dateCheck.reason ?? '已過期或時間不合法'}），請先返回調整預約時間。
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="rounded-md bg-moss px-3 py-1.5 text-xs font-medium text-white hover:bg-moss-hover whitespace-nowrap"
          >
            前往修改時間
          </button>
        </div>
      )}

      {overlappingBooking && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ochre-border bg-ochre-tint/80 px-4 py-3.5 text-sm text-ink"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ochre" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ochre">
                此時段與您既有的有效預約重疊（不可重複預約）
              </p>
              <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                衝突預約：{overlappingBooking.seatId} · {formatDateShortTW(overlappingBooking.date)}{' '}
                {formatTimeRange(overlappingBooking.startHour, overlappingBooking.endHour)}。請先修改時段，或前往我的預約取消原預約。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="rounded-md border border-line-strong bg-paper-card px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper-muted whitespace-nowrap"
            >
              修改時段
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bookings')}
              className="rounded-md bg-moss px-3 py-1.5 text-xs font-medium text-white hover:bg-moss-hover whitespace-nowrap"
            >
              查看我的預約
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout: 2D Map (Left 8 cols) + Seat Info Panel (Right 4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Zone Tabs + Filters + 2D Floor Plan */}
        <div className="space-y-4 rounded-xl border border-line bg-paper-card p-5 sm:p-6 lg:col-span-8">
          {/* Top toolbar: Zone Switcher & Floor Label */}
          <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-editorial text-xl font-bold text-ink">
                {activeZone.floorLabel} · {activeZone.name}
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">{activeZone.description}</p>
            </div>

            {/* A / B / C Zone Tabs */}
            <div
              role="tablist"
              aria-label="閱覽區域切換"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-paper p-1 self-start sm:self-auto"
            >
              {zoneSummaries.map(({ zone, availableCount, isMaintenance }) => {
                const isActive = zone.id === activeZoneId;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChangeZone(zone.id)}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      isActive
                        ? 'bg-moss text-white'
                        : 'text-ink-muted hover:text-ink hover:bg-paper-muted/70'
                    }`}
                  >
                    {zone.name}
                    {isMaintenance ? ' (維護)' : ` (${availableCount})`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment Filter Bar & Zoom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium text-ink-muted">設備篩選：</span>
              <button
                type="button"
                aria-pressed={filterPower}
                onClick={() => setFilterPower((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterPower
                    ? 'border-moss bg-moss-tint text-moss'
                    : 'border-line bg-paper text-ink-muted hover:text-ink hover:border-line-strong'
                }`}
              >
                <Plug className="h-3.5 w-3.5" aria-hidden="true" />
                <span>有插座</span>
              </button>

              <button
                type="button"
                aria-pressed={filterWindow}
                onClick={() => setFilterWindow((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterWindow
                    ? 'border-moss bg-moss-tint text-moss'
                    : 'border-line bg-paper text-ink-muted hover:text-ink hover:border-line-strong'
                }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>靠窗</span>
              </button>

              {(filterPower || filterWindow) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPower(false);
                    setFilterWindow(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-ink-muted underline underline-offset-2 hover:text-ink whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>清除條件</span>
                </button>
              )}

              {activeZone.status === 'open' && (
                <span className="text-xs text-ink-muted tabular-nums">
                  符合條件可預約：{matchingAvailableCount} 席
                </span>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.85, Number((z - 0.15).toFixed(2))))}
                disabled={zoomLevel <= 0.85}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink hover:bg-paper-muted disabled:opacity-40 whitespace-nowrap"
              >
                <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>縮小</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink-muted hover:bg-paper-muted tabular-nums whitespace-nowrap"
                title="重設縮放比例"
              >
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                <span>{Math.round(zoomLevel * 100)}%</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.15, Number((z + 0.15).toFixed(2))))}
                disabled={zoomLevel >= 1.15}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink hover:bg-paper-muted disabled:opacity-40 whitespace-nowrap"
              >
                <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>放大</span>
              </button>
            </div>
          </div>

          {/* Maintenance notice for Zone C */}
          {activeZone.status === 'maintenance' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-stone-300 bg-stone-200/55 px-4 py-3 text-sm text-stone-800">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-stone-700" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {activeZone.name}目前為「維護中」，暫停開放選位
                </p>
                <p className="mt-0.5 text-xs text-stone-600">
                  {activeZone.maintenanceNote}。此區域非座位已滿，請改至 A 區或 B 區選位。
                </p>
              </div>
            </div>
          )}

          {/* Architectural 2D Floor Plan */}
          <div className="overflow-x-auto rounded-xl border border-line bg-paper p-3 sm:p-5">
            <div
              className="mx-auto min-w-[600px] transition-transform duration-150 origin-top-left"
              style={{ transform: `scale(${zoomLevel})`, width: zoomLevel > 1 ? `${100 / zoomLevel}%` : '100%' }}
            >
              {/* Outer Architectural Wall Frame */}
              <div className="relative rounded-lg border-2 border-[#a8a293] bg-[#faf7f0] px-6 pt-8 pb-6">
                {/* North Wall: Windows (窗戶) */}
                <div className="absolute inset-x-10 -top-2.5 flex items-center justify-between gap-2">
                  <div className="h-2.5 flex-1 rounded-sm border border-[#7ea8be] bg-[#d4e7f0]" />
                  <span className="rounded border border-[#7ea8be] bg-[#ebf4f8] px-3 py-0.5 text-xs font-semibold text-[#315b70] whitespace-nowrap">
                    北側採光窗戶
                  </span>
                  <div className="h-2.5 flex-1 rounded-sm border border-[#7ea8be] bg-[#d4e7f0]" />
                </div>

                {/* East Wall: Window for Zone B (matches hasWindow for col 6 in Zone B) */}
                {activeZoneId === 'B' && (
                  <div className="absolute inset-y-12 -right-2.5 flex flex-col items-center justify-center gap-1">
                    <div className="w-2.5 flex-1 rounded-sm border border-[#7ea8be] bg-[#d4e7f0]" />
                    <span className="rounded border border-[#7ea8be] bg-[#ebf4f8] px-1 py-1.5 text-[10px] font-semibold text-[#315b70] [writing-mode:vertical-rl]">
                      東側窗戶
                    </span>
                    <div className="w-2.5 flex-1 rounded-sm border border-[#7ea8be] bg-[#d4e7f0]" />
                  </div>
                )}

                {/* Structural Pillars on West & East Walls */}
                <div
                  className="absolute top-12 -left-2 h-8 w-3.5 rounded-xs border border-[#a8a293] bg-[#e2dccd]"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-14 -left-2 h-8 w-3.5 rounded-xs border border-[#a8a293] bg-[#e2dccd]"
                  aria-hidden="true"
                />
                {activeZoneId !== 'B' && (
                  <>
                    <div
                      className="absolute top-12 -right-2 h-8 w-3.5 rounded-xs border border-[#a8a293] bg-[#e2dccd]"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute bottom-14 -right-2 h-8 w-3.5 rounded-xs border border-[#a8a293] bg-[#e2dccd]"
                      aria-hidden="true"
                    />
                  </>
                )}

                {/* Desk Rows & Aisles */}
                <div className="space-y-4">
                  {rows.map(({ rowNum, pairs }, rowIdx) => (
                    <React.Fragment key={rowNum}>
                      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] items-center gap-1">
                        {pairs.map((pair, pairIdx) => (
                          <React.Fragment key={`${rowNum}-${pairIdx}`}>
                            {/* Shared Wooden Study Desk Unit for 2 seats */}
                            <div className="rounded-md border border-[#d6cdb8] bg-[#efe7d6]/65 p-1.5">
                              <div className="grid grid-cols-2 gap-1.5">
                                {pair.map((seat) => {
                                  const status = seatStatusMap.get(seat.id) ?? 'unavailable';
                                  const matchesFilter =
                                    (!filterPower || seat.hasPower) &&
                                    (!filterWindow || seat.hasWindow);
                                  const isDisabled =
                                    status === 'unavailable' || status === 'maintenance';

                                  let seatStyle = '';
                                  let symbol = '';
                                  let statusText = '';

                                  switch (status) {
                                    case 'selected':
                                      seatStyle =
                                        'border-moss bg-moss text-white shadow-xs ring-2 ring-moss/30';
                                      symbol = '✓';
                                      statusText = '已選取';
                                      break;
                                    case 'available':
                                      seatStyle =
                                        'border-moss-border bg-moss-tint text-ink hover:border-moss hover:bg-[#dce8d4] cursor-pointer';
                                      symbol = '○';
                                      statusText = '可預約';
                                      break;
                                    case 'unavailable':
                                      seatStyle =
                                        'border-[#cfc9bb] bg-[#e5e1d7] text-ink-muted cursor-not-allowed';
                                      symbol = '×';
                                      statusText = '不可預約';
                                      break;
                                    case 'maintenance':
                                      seatStyle =
                                        'border-stone-300 bg-stone-200/80 text-stone-600 cursor-not-allowed';
                                      symbol = '—';
                                      statusText = '維護中';
                                      break;
                                  }

                                  const dimClass =
                                    (filterPower || filterWindow) &&
                                    !matchesFilter &&
                                    status !== 'selected'
                                      ? 'opacity-30'
                                      : '';

                                  return (
                                    <button
                                      key={seat.id}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => handleSeatClick(seat, status)}
                                      aria-label={`${seat.id}，${statusText}，${
                                        seat.hasPower ? '有插座' : '無插座'
                                      }，${seat.hasWindow ? '靠窗' : '非靠窗'}`}
                                      aria-pressed={status === 'selected'}
                                      className={`group relative flex flex-col items-center justify-center rounded border px-1.5 py-2 text-center transition-all ${seatStyle} ${dimClass}`}
                                    >
                                      {/* Equipment micro-icons matching actual seat attributes */}
                                      <div className="flex items-center justify-between w-full px-0.5 mb-0.5 text-[10px]">
                                        <span className="font-bold leading-none" aria-hidden="true">
                                          {symbol}
                                        </span>
                                        <span className="flex items-center gap-0.5" aria-hidden="true">
                                          {seat.hasPower && (
                                            <Plug
                                              className={`h-2.5 w-2.5 ${
                                                status === 'selected'
                                                  ? 'text-white/90'
                                                  : 'text-moss'
                                              }`}
                                            />
                                          )}
                                          {seat.hasWindow && (
                                            <Sun
                                              className={`h-2.5 w-2.5 ${
                                                status === 'selected'
                                                  ? 'text-white/90'
                                                  : 'text-ochre'
                                              }`}
                                            />
                                          )}
                                        </span>
                                      </div>

                                      <span className="text-xs font-bold tracking-tight tabular-nums leading-tight">
                                        {seat.id}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Vertical Aisle between desk columns */}
                            {pairIdx < pairs.length - 1 && (
                              <div className="flex h-full items-center justify-center">
                                {rowIdx === 1 && (
                                  <span className="text-[10px] tracking-widest text-ink-subtle [writing-mode:vertical-rl]">
                                    走道
                                  </span>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Horizontal Aisle label between middle rows */}
                      {rowIdx === 1 && (
                        <div className="flex items-center justify-center gap-3 py-0.5 text-[11px] text-ink-subtle">
                          <span className="h-px flex-1 border-t border-dashed border-line-strong" />
                          <span>中央走道</span>
                          <span className="h-px flex-1 border-t border-dashed border-line-strong" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* South Wall: Entrance (入口) & Service Desk (服務櫃檯) */}
                <div className="mt-7 flex items-end justify-between border-t border-dashed border-line-strong pt-4">
                  {/* Entrance Door Diagram */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-end gap-0.5 rounded-t-md border border-b-0 border-[#8f897a] bg-paper px-3 py-1.5">
                      <span className="text-xs font-semibold text-ink">入口 / 刷卡閘門</span>
                    </div>
                  </div>

                  <span className="text-[11px] text-ink-subtle">主通道</span>

                  {/* Service Counter */}
                  <div className="rounded-md border border-ochre-border bg-ochre-tint px-6 py-2 text-center">
                    <span className="text-xs font-semibold text-ochre">服務櫃檯</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Equipment Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-3 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-moss-border bg-moss-tint text-[11px] font-bold text-moss">
                  ○
                </span>
                <span>可預約</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#cfc9bb] bg-[#e5e1d7] text-[11px] font-bold text-ink-muted">
                  ×
                </span>
                <span>不可預約</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-moss bg-moss text-[11px] font-bold text-white">
                  ✓
                </span>
                <span>已選取</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-stone-300 bg-stone-200 text-[11px] font-bold text-stone-600">
                  —
                </span>
                <span>維護中</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Plug className="h-3.5 w-3.5 text-moss" aria-hidden="true" />
                <span>有插座</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-ochre" aria-hidden="true" />
                <span>靠窗</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Selected Seat Information Panel */}
        <aside className="rounded-xl border border-line bg-paper-card p-6 lg:col-span-4 space-y-5">
          <h2 className="font-editorial text-xl font-bold text-ink border-b border-line pb-3">
            座位資訊
          </h2>

          {selectedSeat && selectedSeatZone ? (
            <>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-editorial text-3xl font-bold text-moss tabular-nums">
                    {selectedSeat.id}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded border border-moss-border bg-moss-tint px-2 py-0.5 text-xs font-medium text-moss">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    已選取
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {selectedSeatZone.name} · {selectedSeatZone.subtitle}（{selectedSeatZone.floorLabel}）
                </p>
              </div>

              <dl className="divide-y divide-line text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-muted">插座設備</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <Plug
                      className={`h-4 w-4 ${selectedSeat.hasPower ? 'text-moss' : 'text-ink-subtle'}`}
                      aria-hidden="true"
                    />
                    <span>{selectedSeat.hasPower ? '有插座' : '無插座'}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-muted">靠窗情況</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <Sun
                      className={`h-4 w-4 ${selectedSeat.hasWindow ? 'text-ochre' : 'text-ink-subtle'}`}
                      aria-hidden="true"
                    />
                    <span>{selectedSeat.hasWindow ? '靠窗席位' : '非靠窗席位'}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-muted">預約日期</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {formatDateTW(timeSelection.date)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-muted">預約時段</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {formatTimeRange(timeSelection.startHour, timeSelection.endHour)}（共{' '}
                    {durationHours} 小時）
                  </dd>
                </div>
              </dl>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={!canBookSelectedSeat}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full rounded-lg bg-moss px-5 py-3 text-base font-medium text-white transition-colors hover:bg-moss-hover disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  確認預約
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSeat(null)}
                  className="w-full rounded-lg border border-line bg-paper-card px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap"
                >
                  重新選擇
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="font-editorial text-lg font-semibold text-ink">尚未選取座位</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                {activeZone.status === 'maintenance'
                  ? `${activeZone.name}目前設備維護中，請切換至 A 區或 B 區挑選可預約座位。`
                  : '請點選左側平面圖中標示「○ 可預約」的座位，此處將顯示完整座位與設備資訊。'}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedSeat && selectedSeatZone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-paper-card p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
              <div>
                <p className="text-xs text-moss font-medium">步驟 3 / 3 · 最終確認</p>
                <h3 id="booking-confirm-title" className="mt-0.5 font-editorial text-2xl font-bold text-ink">
                  確認預約摘要
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                aria-label="關閉確認視窗"
                className="rounded-md p-1.5 text-ink-muted hover:bg-paper-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-4 divide-y divide-line text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-ink-muted">座號與區域</dt>
                <dd className="font-bold text-ink tabular-nums">
                  {selectedSeat.id}（{selectedSeatZone.name} · {selectedSeatZone.subtitle}）
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-ink-muted">座位設備</dt>
                <dd className="font-medium text-ink">
                  {selectedSeat.hasPower ? '有插座' : '無插座'} ·{' '}
                  {selectedSeat.hasWindow ? '靠窗' : '非靠窗'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-ink-muted">預約日期</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatDateTW(timeSelection.date)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-ink-muted">使用時段</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatTimeRange(timeSelection.startHour, timeSelection.endHour)}（共{' '}
                  {durationHours} 小時）
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-ink-muted">示範報到期限</dt>
                <dd className="font-semibold text-ochre tabular-nums">
                  當日{' '}
                  {addMinutesToHour(
                    timeSelection.startHour,
                    demoSettings.checkInGraceMinutes
                  )}{' '}
                  前
                </dd>
              </div>
            </dl>

            <p className="mt-4 rounded-lg bg-paper p-3 text-xs leading-relaxed text-ink-muted">
              預約成立後將為「待報到」狀態，請於開始後 {demoSettings.checkInGraceMinutes}{' '}
              分鐘內完成報到；若無法前往，請提前取消以釋出座位。
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-md border border-line bg-paper-card px-4 py-2 text-sm font-medium text-ink hover:bg-paper-muted whitespace-nowrap"
              >
                返回檢查
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                className="rounded-md bg-moss px-5 py-2 text-sm font-medium text-white hover:bg-moss-hover whitespace-nowrap"
              >
                確認送出預約
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Success Modal */}
      {completedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-paper-card p-6 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-tint text-moss">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium text-moss">預約成立</p>
                <h3 id="booking-success-title" className="font-editorial text-2xl font-bold text-ink">
                  座位預約完成
                </h3>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-line bg-paper p-4 space-y-1.5 text-sm tabular-nums">
              <p className="font-editorial text-2xl font-bold text-moss">
                {completedBooking.seatId}
              </p>
              <p className="text-ink">
                {formatDateTW(completedBooking.date)}{' '}
                {formatTimeRange(completedBooking.startHour, completedBooking.endHour)}
              </p>
              <p className="text-xs text-ochre font-medium">
                報到期限：請於{' '}
                {addMinutesToHour(
                  completedBooking.startHour,
                  demoSettings.checkInGraceMinutes
                )}{' '}
                前完成到館報到
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCompletedBooking(null);
                  onNavigate('dashboard');
                }}
                className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper-muted whitespace-nowrap"
              >
                返回座位總覽
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedBooking(null);
                  onViewMyBookings();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-moss px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-hover whitespace-nowrap"
              >
                <span>查看我的預約</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
