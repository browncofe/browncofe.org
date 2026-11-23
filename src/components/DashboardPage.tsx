import React from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  PauseCircle,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { SIMULATED_NOW_LABEL, SIMULATED_TODAY, ZONES } from '../data/mockLibraryData';
import { Booking, DemoSettings, PageId, TimeSelection, ZoneId } from '../types/library';
import {
  formatDateShortTW,
  formatDateTW,
  formatTimeRange,
  getBookingStatusMeta,
  getCheckInDeadlineLabel,
  getCurrentZoneAvailability,
  getZoneAvailabilityForSlot,
} from '../utils/bookingLogic';

interface DashboardPageProps {
  bookings: Booking[];
  timeSelection: TimeSelection;
  demoSettings: DemoSettings;
  lastUpdatedLabel: string;
  onRefresh: () => void;
  onNavigate: (page: PageId) => void;
  onManageLatestBooking: (status: Booking['status']) => void;
  onInspectZone: (zoneId: ZoneId, mode: 'current' | 'selected') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  bookings,
  timeSelection,
  demoSettings,
  lastUpdatedLabel,
  onRefresh,
  onNavigate,
  onManageLatestBooking,
  onInspectZone,
}) => {
  // Most relevant recent booking: prioritize active bookings (in_use / temp_away / pending), then most recent history
  const sortedBookings = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activePriority = sortedBookings.find((b) =>
    ['in_use', 'temp_away', 'pending'].includes(b.status)
  );
  const latestBooking = activePriority ?? sortedBookings[0] ?? null;

  const currentZoneStats = ZONES.map((z) => getCurrentZoneAvailability(z.id, bookings));
  const selectedSlotStats = ZONES.map((z) =>
    getZoneAvailabilityForSlot(
      z.id,
      timeSelection.date,
      timeSelection.startHour,
      timeSelection.endHour,
      bookings
    )
  );

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="flex flex-col justify-between gap-6 border-b border-line pb-8 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wider text-moss">
            國立臺北科技大學圖書館 · 閱覽空間導覽
          </p>
          <h1 className="mt-2 font-editorial text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            找到適合你的閱讀角落
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            先檢視各區即時空位與環境特色，再依你的研讀時程預約專屬座位。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="inline-flex items-center gap-2.5 rounded-lg bg-moss px-6 py-3.5 text-base font-medium text-white shadow-xs transition-colors hover:bg-moss-hover whitespace-nowrap shrink-0"
          >
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <span>預約座位</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Date & Refresh Metadata Strip */}
      <section aria-labelledby="current-status-heading" className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="current-status-heading" className="font-editorial text-2xl font-bold text-ink">
              目前即時空位
            </h2>
            <span className="text-sm text-ink-muted tabular-nums">
              {formatDateTW(SIMULATED_TODAY)} · 模擬目前時間 {SIMULATED_NOW_LABEL}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="tabular-nums">資料更新時間：{lastUpdatedLabel}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-card px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 text-moss" aria-hidden="true" />
              <span>重新整理</span>
            </button>
          </div>
        </div>

        {/* 3 Zone Summary Cards: Current Immediate Availability */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {currentZoneStats.map(({ zone, availableCount, totalCount, occupiedCount, isMaintenance }) => {
            const occupancyRate =
              totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

            return (
              <article
                key={zone.id}
                className="flex flex-col justify-between rounded-xl border border-line bg-paper-card p-6 transition-colors hover:border-line-strong"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-editorial text-xl font-bold text-ink">
                        {zone.name}
                        <span className="mx-2 text-line-strong font-normal">|</span>
                        <span className="text-base font-medium text-ink-muted">
                          {zone.subtitle}
                        </span>
                      </h3>
                      <p className="mt-1 text-xs text-ink-subtle">{zone.floorLabel}</p>
                    </div>

                    {isMaintenance ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-stone-200/70 px-2.5 py-1 text-xs font-medium text-stone-700 whitespace-nowrap shrink-0">
                        <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>維護中</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-moss-border bg-moss-tint px-2.5 py-1 text-xs font-medium text-moss whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>開放中</span>
                      </span>
                    )}
                  </div>

                  {/* Seat count or maintenance notice */}
                  <div className="mt-5 border-t border-line pt-4">
                    {isMaintenance ? (
                      <div className="space-y-1.5">
                        <p className="font-editorial text-2xl font-bold text-stone-700">
                          暫停開放預約
                        </p>
                        <p className="text-sm leading-relaxed text-ink-muted">
                          {zone.maintenanceNote ?? '區域設備維護中，目前不計入可用空位。'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline justify-between gap-3">
                          <div>
                            <span className="font-editorial text-3xl font-bold text-moss tabular-nums">
                              {availableCount}
                            </span>
                            <span className="ml-1.5 text-sm text-ink-muted tabular-nums">
                              / {totalCount} 席目前空位
                            </span>
                          </div>
                          <span className="text-xs text-ink-muted tabular-nums">
                            使用率 {occupancyRate}%
                          </span>
                        </div>
                        <div
                          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-paper-muted"
                          role="progressbar"
                          aria-valuenow={occupancyRate}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${zone.name} 目前使用率 ${occupancyRate}%`}
                        >
                          <div
                            className="h-full rounded-full bg-moss/80 transition-all duration-200"
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Environmental features (unboxed text with middot separators) */}
                  <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                    {zone.features.join(' · ')}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => onInspectZone(zone.id, 'current')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-moss transition-colors hover:text-moss-hover whitespace-nowrap shrink-0"
                  >
                    <span>{isMaintenance ? '檢視維護平面圖' : '查看座位平面圖'}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Clear distinction: Selected Reservation Time Slot Availability */}
      <section
        aria-labelledby="slot-availability-heading"
        className="rounded-xl border border-line bg-paper-card p-6"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id="slot-availability-heading" className="font-editorial text-xl font-bold text-ink">
                指定時段可預約座位
              </h2>
              <span className="text-sm font-medium text-moss tabular-nums">
                {formatDateShortTW(timeSelection.date)}{' '}
                {formatTimeRange(timeSelection.startHour, timeSelection.endHour)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              與上方「目前即時空位」不同，此處顯示您所指定未來預約時段之各區可預訂席數。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap shrink-0"
            >
              調整日期與時段
            </button>
            <button
              type="button"
              onClick={() => onInspectZone('A', 'selected')}
              className="inline-flex items-center gap-1.5 rounded-md bg-moss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap shrink-0"
            >
              <span>前往此時段選位</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {selectedSlotStats.map(({ zone, availableCount, totalCount, isMaintenance }) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => onInspectZone(zone.id, 'selected')}
              className="flex items-center justify-between rounded-lg border border-line bg-paper px-4 py-3.5 text-left transition-colors hover:border-moss-border hover:bg-moss-tint/35"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {zone.name} · {zone.subtitle}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {isMaintenance ? '設備維護中，無法預約' : '點選直接查看該區座位'}
                </p>
              </div>
              <div className="text-right shrink-0">
                {isMaintenance ? (
                  <span className="text-xs font-medium text-stone-700">維護中</span>
                ) : (
                  <p className="font-editorial text-xl font-bold text-moss tabular-nums">
                    {availableCount}
                    <span className="ml-1 text-xs font-sans font-normal text-ink-muted">
                      / {totalCount} 席
                    </span>
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom 2-column grid: Latest Booking + Demo Rules Reminder */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Latest Booking */}
        <div className="rounded-xl border border-line bg-paper-card p-6 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-editorial text-xl font-bold text-ink">最近一筆預約</h2>
              <button
                type="button"
                onClick={() => onNavigate('bookings')}
                className="text-sm font-medium text-moss hover:text-moss-hover whitespace-nowrap shrink-0"
              >
                全部預約紀錄 →
              </button>
            </div>

            {latestBooking ? (
              (() => {
                const statusMeta = getBookingStatusMeta(latestBooking.status);
                const zoneInfo = ZONES.find((z) => z.id === latestBooking.zoneId);
                const checkInDeadline = getCheckInDeadlineLabel(
                  latestBooking,
                  demoSettings.checkInGraceMinutes
                );

                return (
                  <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                        >
                          <span aria-hidden="true">{statusMeta.symbol}</span>
                          <span>{statusMeta.label}</span>
                        </span>
                        <span className="text-xs text-ink-muted">
                          {zoneInfo?.name} · {zoneInfo?.subtitle}
                        </span>
                      </div>
                      <p className="font-editorial text-3xl font-bold text-ink tabular-nums">
                        {latestBooking.seatId}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-moss" aria-hidden="true" />
                          {formatDateShortTW(latestBooking.date)}{' '}
                          {formatTimeRange(latestBooking.startHour, latestBooking.endHour)}
                        </span>
                        {latestBooking.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-ochre font-medium">
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            請於 {checkInDeadline} 前報到
                          </span>
                        )}
                        {latestBooking.status === 'temp_away' && latestBooking.tempAwayReturnBy && (
                          <span className="inline-flex items-center gap-1.5 text-ochre font-medium">
                            <PauseCircle className="h-4 w-4" aria-hidden="true" />
                            請於 {latestBooking.tempAwayReturnBy} 前返回座位
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onManageLatestBooking(latestBooking.status)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap shrink-0"
                    >
                      <span>管理此預約</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="text-sm text-ink-muted">
                  目前尚無任何預約紀錄，立即挑選時間與座位吧。
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-moss-hover whitespace-nowrap shrink-0"
                >
                  立即預約
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Usage Reminders */}
        <div className="rounded-xl border border-line bg-paper-card p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-editorial text-xl font-bold text-ink">使用提醒（示範規則）</h2>
            <button
              type="button"
              onClick={() => onNavigate('bookings')}
              className="text-xs font-medium text-ink-muted underline underline-offset-4 hover:text-ink whitespace-nowrap shrink-0"
            >
              調整示範期限
            </button>
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="py-2.5 flex gap-3">
              <dt className="w-20 shrink-0 font-semibold text-ink">到館報到</dt>
              <dd className="text-ink-muted leading-relaxed">
                請於預約開始後{' '}
                <span className="font-semibold text-ink tabular-nums">
                  {demoSettings.checkInGraceMinutes} 分鐘
                </span>
                內完成報到，逾時將自動釋出座位。
              </dd>
            </div>
            <div className="py-2.5 flex gap-3">
              <dt className="w-20 shrink-0 font-semibold text-ink">暫時離座</dt>
              <dd className="text-ink-muted leading-relaxed">
                短暫離開可保留座位{' '}
                <span className="font-semibold text-ink tabular-nums">
                  {demoSettings.tempAwayMinutes} 分鐘
                </span>
                ，請於返回期限前回到座位。
              </dd>
            </div>
            <div className="py-2.5 flex gap-3">
              <dt className="w-20 shrink-0 font-semibold text-ink">結束釋放</dt>
              <dd className="text-ink-muted leading-relaxed">
                若提前離開請點選「結束使用」，系統將立即釋出座位供其他同學預約。
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
};
