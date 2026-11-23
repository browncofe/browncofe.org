import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wrench,
} from 'lucide-react';
import {
  CLOSING_HOUR,
  OPENING_HOUR,
  SIMULATED_NOW_LABEL,
  SIMULATED_TODAY,
  ZONES,
} from '../data/mockLibraryData';
import { Booking, TimeSelection } from '../types/library';
import {
  findOverlappingUserBooking,
  formatDateShortTW,
  formatDateTW,
  formatHour,
  formatTimeRange,
  getClosedDayInfo,
  getWeekdayTW,
  getZoneAvailabilityForSlot,
  isDateDisabled,
  isPastDate,
  isStartHourPastForDate,
} from '../utils/bookingLogic';

interface CalendarPageProps {
  timeSelection: TimeSelection;
  onChangeTimeSelection: (next: TimeSelection) => void;
  bookings: Booking[];
  onProceedToSeatMap: () => void;
}

const AVAILABLE_MONTHS = [
  { year: 2026, month: 11, label: '2026 年 11 月' },
  { year: 2026, month: 12, label: '2026 年 12 月' },
];

export const CalendarPage: React.FC<CalendarPageProps> = ({
  timeSelection,
  onChangeTimeSelection,
  bookings,
  onProceedToSeatMap,
}) => {
  const initialMonthIdx = timeSelection.date.startsWith('2026-12') ? 1 : 0;
  const [monthIndex, setMonthIndex] = useState(initialMonthIdx);
  const [disabledFeedback, setDisabledFeedback] = useState<string | null>(null);

  const activeMonth = AVAILABLE_MONTHS[monthIndex];

  // Build calendar grid starting Monday
  const calendarDays = useMemo(() => {
    const { year, month } = activeMonth;
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: ({ day: number; dateStr: string } | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [activeMonth]);

  const startHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
      hours.push(h);
    }
    return hours;
  }, []);

  const endHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = timeSelection.startHour + 1; h <= CLOSING_HOUR; h++) {
      hours.push(h);
    }
    return hours;
  }, [timeSelection.startHour]);

  const handleSelectDate = (dateStr: string) => {
    const check = isDateDisabled(dateStr);
    if (check.disabled) {
      setDisabledFeedback(`${formatDateShortTW(dateStr)} 無法選擇：${check.reason}`);
      return;
    }
    setDisabledFeedback(null);

    // Ensure start/end hours remain valid if user switched to SIMULATED_TODAY
    let nextStart = timeSelection.startHour;
    let nextEnd = timeSelection.endHour;
    if (isStartHourPastForDate(dateStr, nextStart)) {
      const firstValidStart = startHours.find((h) => !isStartHourPastForDate(dateStr, h)) ?? 15;
      nextStart = firstValidStart;
      nextEnd = Math.min(CLOSING_HOUR, Math.max(nextEnd, nextStart + 1));
      if (nextEnd <= nextStart) {
        nextEnd = Math.min(CLOSING_HOUR, nextStart + 2);
      }
    }

    onChangeTimeSelection({
      date: dateStr,
      startHour: nextStart,
      endHour: nextEnd,
    });
  };

  const handleStartHourChange = (nextStart: number) => {
    const nextEnd =
      timeSelection.endHour <= nextStart
        ? Math.min(CLOSING_HOUR, nextStart + 1)
        : timeSelection.endHour;
    onChangeTimeSelection({
      ...timeSelection,
      startHour: nextStart,
      endHour: nextEnd,
    });
  };

  const handleEndHourChange = (nextEnd: number) => {
    if (nextEnd <= timeSelection.startHour) return;
    onChangeTimeSelection({
      ...timeSelection,
      endHour: nextEnd,
    });
  };

  const durationHours = timeSelection.endHour - timeSelection.startHour;
  const overlappingBooking = findOverlappingUserBooking(
    bookings,
    timeSelection.date,
    timeSelection.startHour,
    timeSelection.endHour
  );

  const slotZoneStats = ZONES.map((z) =>
    getZoneAvailabilityForSlot(
      z.id,
      timeSelection.date,
      timeSelection.startHour,
      timeSelection.endHour,
      bookings
    )
  );

  const isTimeValid =
    !isDateDisabled(timeSelection.date).disabled &&
    !isStartHourPastForDate(timeSelection.date, timeSelection.startHour) &&
    timeSelection.endHour > timeSelection.startHour;

  return (
    <div className="space-y-8">
      {/* Header + 3-step indicator */}
      <section className="flex flex-col justify-between gap-4 border-b border-line pb-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="font-editorial text-3xl font-bold text-ink">安排你的閱讀時間</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            開館時間每日 08:00–22:00；請先決定日期與使用時段，再挑選座位。
          </p>
        </div>

        {/* 3-Step indicator */}
        <ol className="flex items-center gap-2 sm:gap-4 text-sm whitespace-nowrap shrink-0">
          <li className="flex items-center gap-2 font-medium text-moss">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss text-xs font-bold text-white tabular-nums">
              1
            </span>
            <span>選擇時間</span>
          </li>
          <span className="h-px w-6 bg-line-strong sm:w-10" aria-hidden="true" />
          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-paper-card text-xs font-medium tabular-nums">
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

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Calendar + Time Selectors */}
        <div className="space-y-6 rounded-xl border border-line bg-paper-card p-6 lg:col-span-7">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-xl font-bold text-ink">選擇日期</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                disabled={monthIndex === 0}
                aria-label="上一個月"
                className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink transition-colors hover:bg-paper-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[116px] text-center font-editorial text-lg font-bold text-ink tabular-nums">
                {activeMonth.label}
              </span>
              <button
                type="button"
                onClick={() => setMonthIndex((i) => Math.min(AVAILABLE_MONTHS.length - 1, i + 1))}
                disabled={monthIndex === AVAILABLE_MONTHS.length - 1}
                aria-label="下一個月"
                className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink transition-colors hover:bg-paper-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-7 border-b border-line bg-paper-muted/70 text-center text-xs font-semibold text-ink-muted">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <div key={w} className="py-2.5">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-line bg-paper-card">
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-14 bg-paper/50 sm:h-16" />;
                }

                const { day, dateStr } = cell;
                const closedInfo = getClosedDayInfo(dateStr);
                const past = isPastDate(dateStr);
                const disabled = past || Boolean(closedInfo);
                const isSelected = timeSelection.date === dateStr;
                const isToday = dateStr === SIMULATED_TODAY;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleSelectDate(dateStr)}
                    aria-disabled={disabled}
                    aria-pressed={isSelected}
                    title={
                      closedInfo
                        ? `休館日：${closedInfo.reason}`
                        : past
                        ? '已過期日期無法預約'
                        : formatDateTW(dateStr)
                    }
                    className={`relative flex h-14 flex-col items-center justify-center p-1 text-sm transition-colors sm:h-16 ${
                      isSelected
                        ? 'bg-moss text-white font-bold'
                        : disabled
                        ? 'bg-paper-muted/60 text-ink-subtle cursor-not-allowed'
                        : 'text-ink hover:bg-moss-tint/50 font-medium'
                    }`}
                  >
                    <span className="tabular-nums">{day}</span>
                    {isToday && !isSelected && (
                      <span className="mt-0.5 text-[10px] font-medium text-moss">今天</span>
                    )}
                    {isToday && isSelected && (
                      <span className="mt-0.5 text-[10px] font-medium text-white/90">今天</span>
                    )}
                    {closedInfo && (
                      <span className="mt-0.5 text-[10px] text-ochre font-medium">休館</span>
                    )}
                    {!closedInfo && past && (
                      <span className="mt-0.5 text-[10px] text-ink-subtle">已過期</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <span>灰色日期為已過期或示範休館日（休館日：11/28、12/06、12/20）</span>
            {disabledFeedback && (
              <span className="font-medium text-ochre" role="status">
                {disabledFeedback}
              </span>
            )}
          </div>

          {/* Time Slot Selectors */}
          <div className="border-t border-line pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-editorial text-xl font-bold text-ink">選擇時段</h2>
              {timeSelection.date === SIMULATED_TODAY && (
                <span className="text-xs text-ink-muted tabular-nums">
                  今日模擬時間為 {SIMULATED_NOW_LABEL}，已過時段不可選取
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
              <div>
                <label
                  htmlFor="start-hour-select"
                  className="block text-xs font-medium text-ink-muted mb-1.5"
                >
                  開始時間
                </label>
                <select
                  id="start-hour-select"
                  value={timeSelection.startHour}
                  onChange={(e) => handleStartHourChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-line-strong bg-paper px-3.5 py-2.5 text-sm font-medium text-ink tabular-nums"
                >
                  {startHours.map((h) => {
                    const pastSlot = isStartHourPastForDate(timeSelection.date, h);
                    return (
                      <option key={h} value={h} disabled={pastSlot}>
                        {formatHour(h)} {pastSlot ? '（已過時段）' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="end-hour-select"
                  className="block text-xs font-medium text-ink-muted mb-1.5"
                >
                  結束時間
                </label>
                <select
                  id="end-hour-select"
                  value={timeSelection.endHour}
                  onChange={(e) => handleEndHourChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-line-strong bg-paper px-3.5 py-2.5 text-sm font-medium text-ink tabular-nums"
                >
                  {endHours.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-ochre-border bg-ochre-tint/70 px-4 py-2.5 sm:justify-center">
                <span className="text-xs text-ochre sm:hidden">預約總時長</span>
                <span className="text-sm font-bold text-ochre tabular-nums">
                  共 {durationHours} 小時
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary & Zone Availability for Selected Slot */}
        <aside className="space-y-5 rounded-xl border border-line bg-paper-card p-6 lg:col-span-5">
          <h2 className="font-editorial text-xl font-bold text-ink border-b border-line pb-3">
            預約時間摘要
          </h2>

          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="flex items-center gap-2 text-ink-muted">
                <CalendarIcon className="h-4 w-4 text-moss" aria-hidden="true" />
                <span>預約日期</span>
              </dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatDateTW(timeSelection.date)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="flex items-center gap-2 text-ink-muted">
                <Clock className="h-4 w-4 text-moss" aria-hidden="true" />
                <span>使用時段</span>
              </dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatTimeRange(timeSelection.startHour, timeSelection.endHour)}（星期
                {getWeekdayTW(timeSelection.date)}）
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-ink-muted">預約總時長</dt>
              <dd className="font-bold text-moss tabular-nums">{durationHours} 小時</dd>
            </div>
          </dl>

          {/* Overlap Warning */}
          {overlappingBooking && (
            <div
              role="alert"
              className="rounded-lg border border-ochre-border bg-ochre-tint/75 p-4 text-sm text-ink"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ochre" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ochre">此時間與您現有的預約重疊</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted tabular-nums">
                    您已預約 {overlappingBooking.seatId}（
                    {formatDateShortTW(overlappingBooking.date)}{' '}
                    {formatTimeRange(overlappingBooking.startHour, overlappingBooking.endHour)}
                    ）。同一使用者不可建立時間重疊的有效預約，建議調整時段。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Zone Availability Preview for Selected Slot */}
          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">此時段各區可預約座位</h3>
            <div className="mt-3 space-y-2.5">
              {slotZoneStats.map(({ zone, availableCount, totalCount, isMaintenance }) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-semibold text-ink">{zone.name}</span>
                    <span className="ml-2 text-xs text-ink-muted">{zone.subtitle}</span>
                  </div>
                  {isMaintenance ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-700">
                      <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>維護中（暫不開放）</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-moss tabular-nums">
                      {availableCount} / {totalCount} 席可預約
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={!isTimeValid}
              onClick={onProceedToSeatMap}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-moss px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-moss-hover disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <span>選擇座位</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-2.5 text-center text-xs text-ink-muted">
              下一步：於 2D 座位平面圖挑選座位與設備條件
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
