import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  PauseCircle,
  Play,
  Plug,
  SlidersHorizontal,
  Sun,
  XCircle,
} from 'lucide-react';
import { ALL_SEATS, ZONES } from '../data/mockLibraryData';
import { Booking, DemoSettings } from '../types/library';
import {
  formatDateShortTW,
  formatMinutesAsHMS,
  formatTimeRange,
  getBookingStatusMeta,
  getCheckInDeadlineLabel,
  getEstimatedRemainingUseMinutes,
} from '../utils/bookingLogic';
import { ConfirmDialog } from './ConfirmDialog';

export type BookingTabId = 'pending' | 'active' | 'history';

interface MyBookingsPageProps {
  bookings: Booking[];
  activeTab: BookingTabId;
  onChangeTab: (tab: BookingTabId) => void;
  demoSettings: DemoSettings;
  onUpdateDemoSettings: (next: DemoSettings) => void;
  onCheckIn: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onTempAway: (bookingId: string) => void;
  onReturnToSeat: (bookingId: string) => void;
  onEndUse: (bookingId: string) => void;
  onGoToBook: () => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  bookings,
  activeTab,
  onChangeTab,
  demoSettings,
  onUpdateDemoSettings,
  onCheckIn,
  onCancelBooking,
  onTempAway,
  onReturnToSeat,
  onEndUse,
  onGoToBook,
}) => {
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter(
    (b) => b.status === 'in_use' || b.status === 'temp_away'
  );
  const historyBookings = bookings.filter((b) =>
    ['completed', 'cancelled', 'expired'].includes(b.status)
  );

  const [showSettings, setShowSettings] = useState(false);

  const [pendingActionConfirm, setPendingActionConfirm] = useState<{
    type: 'cancel' | 'end';
    booking: Booking;
  } | null>(null);

  const currentList =
    activeTab === 'pending'
      ? pendingBookings
      : activeTab === 'active'
      ? activeBookings
      : historyBookings;

  return (
    <div className="space-y-8">
      {/* Page Header & Adjustable Demo Settings Toggle */}
      <section className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-editorial text-3xl font-bold text-ink">我的預約</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            管理待報到、使用中與歷史預約紀錄，並可於課堂展示中模擬報到與離座流程。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          aria-expanded={showSettings}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            showSettings
              ? 'border-moss bg-moss-tint text-moss'
              : 'border-line bg-paper-card text-ink hover:bg-paper-muted'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span>示範規則設定</span>
        </button>
      </section>

      {/* Adjustable Demo Rules Panel */}
      {showSettings && (
        <section
          aria-label="可調整之示範規則設定"
          className="rounded-xl border border-moss-border bg-paper-card p-5 space-y-4"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b border-line pb-3">
            <div>
              <h2 className="font-editorial text-lg font-bold text-ink">
                可調整示範規則參數
              </h2>
              <p className="text-xs text-ink-muted">
                以下報到與暫離期限為課堂展示用之可調整示範設定，並非北科大圖書館現行正式規章。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="grace-minutes-select"
                className="block text-xs font-semibold text-ink mb-1.5"
              >
                報到寬限期限（預約開始後）
              </label>
              <select
                id="grace-minutes-select"
                value={demoSettings.checkInGraceMinutes}
                onChange={(e) =>
                  onUpdateDemoSettings({
                    ...demoSettings,
                    checkInGraceMinutes: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-line-strong bg-paper px-3.5 py-2 text-sm font-medium text-ink tabular-nums"
              >
                <option value={10}>10 分鐘（嚴格示範）</option>
                <option value={15}>15 分鐘（預設示範）</option>
                <option value={20}>20 分鐘（寬鬆示範）</option>
                <option value={30}>30 分鐘（彈性示範）</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="temp-away-select"
                className="block text-xs font-semibold text-ink mb-1.5"
              >
                暫時離座保留期限
              </label>
              <select
                id="temp-away-select"
                value={demoSettings.tempAwayMinutes}
                onChange={(e) =>
                  onUpdateDemoSettings({
                    ...demoSettings,
                    tempAwayMinutes: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-line-strong bg-paper px-3.5 py-2 text-sm font-medium text-ink tabular-nums"
              >
                <option value={15}>15 分鐘</option>
                <option value={30}>30 分鐘（預設示範）</option>
                <option value={45}>45 分鐘</option>
                <option value={60}>60 分鐘</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="預約狀態分類"
        className="flex items-center gap-6 border-b border-line"
      >
        {(
          [
            { id: 'pending', label: '待報到', count: pendingBookings.length },
            { id: 'active', label: '使用中', count: activeBookings.length },
            { id: 'history', label: '歷史紀錄', count: historyBookings.length },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChangeTab(tab.id)}
              className={`relative pb-3 text-base font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                isActive
                  ? 'text-moss font-semibold border-b-2 border-moss -mb-px'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-sm opacity-80">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Content + Right Side Rules Guide */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="space-y-4 lg:col-span-8">
          {currentList.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper-card px-6 py-12 text-center">
              <p className="font-editorial text-xl font-bold text-ink">
                目前沒有「
                {activeTab === 'pending'
                  ? '待報到'
                  : activeTab === 'active'
                  ? '使用中'
                  : '歷史紀錄'}
                」的預約
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {activeTab === 'pending'
                  ? '您目前沒有等待報到的預約，可立即挑選日期與時段預訂座位。'
                  : activeTab === 'active'
                  ? '若您已有待報到預約，可切換至「待報到」分頁進行模擬到館報到。'
                  : '完成使用、主動取消或逾時釋出的預約將會記錄於此。'}
              </p>
              <button
                type="button"
                onClick={onGoToBook}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap"
              >
                立即預約
              </button>
            </div>
          ) : (
            currentList.map((booking) => {
              const zone = ZONES.find((z) => z.id === booking.zoneId);
              const seat = ALL_SEATS.find((s) => s.id === booking.seatId);
              const statusMeta = getBookingStatusMeta(booking.status);
              const checkInDeadline = getCheckInDeadlineLabel(
                booking,
                demoSettings.checkInGraceMinutes
              );
              const remainingMins = getEstimatedRemainingUseMinutes(booking);

              return (
                <article
                  key={booking.id}
                  className="rounded-xl border border-line bg-paper-card p-6 transition-colors hover:border-line-strong"
                >
                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    {/* Seat & Metadata */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                        >
                          <span aria-hidden="true">{statusMeta.symbol}</span>
                          <span>{statusMeta.label}</span>
                        </span>
                        <span className="text-xs text-ink-muted">
                          {zone?.name} · {zone?.subtitle}
                        </span>
                        {seat && (
                          <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
                            {seat.hasPower && (
                              <span className="inline-flex items-center gap-1">
                                <Plug className="h-3 w-3 text-moss" aria-hidden="true" />
                                有插座
                              </span>
                            )}
                            {seat.hasWindow && (
                              <span className="inline-flex items-center gap-1">
                                <Sun className="h-3 w-3 text-ochre" aria-hidden="true" />
                                靠窗
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="font-editorial text-3xl font-bold text-ink tabular-nums">
                        {booking.seatId}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-moss" aria-hidden="true" />
                          {formatDateShortTW(booking.date)}{' '}
                          {formatTimeRange(booking.startHour, booking.endHour)}
                        </span>
                      </div>

                      {booking.statusNote && (
                        <p className="text-xs text-ink-muted">{booking.statusNote}</p>
                      )}
                    </div>

                    {/* Middle Deadline / Timer Box */}
                    {booking.status === 'pending' && (
                      <div className="rounded-lg border border-ochre-border bg-ochre-tint/55 px-5 py-3 text-center shrink-0">
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ochre">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>報到期限</span>
                        </p>
                        <p className="mt-1 font-editorial text-2xl font-bold text-ochre tabular-nums">
                          {checkInDeadline} 前
                        </p>
                      </div>
                    )}

                    {booking.status === 'in_use' && (
                      <div className="rounded-lg border border-line bg-paper px-5 py-3 text-center shrink-0">
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                          <Clock className="h-3.5 w-3.5 text-moss" aria-hidden="true" />
                          <span>剩餘使用時間</span>
                        </p>
                        <p className="mt-1 font-editorial text-2xl font-bold text-ink tabular-nums">
                          {formatMinutesAsHMS(remainingMins)}
                        </p>
                      </div>
                    )}

                    {booking.status === 'temp_away' && (
                      <div className="rounded-lg border border-ochre-border bg-ochre-tint/70 px-5 py-3 text-center shrink-0">
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ochre">
                          <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>返回座位期限（保留中）</span>
                        </p>
                        <p className="mt-1 font-editorial text-2xl font-bold text-ochre tabular-nums">
                          {booking.tempAwayReturnBy ?? '--:--'} 前
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[168px] shrink-0">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onCheckIn(booking.id);
                              onChangeTab('active');
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>模擬到館報到</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingActionConfirm({ type: 'cancel', booking })
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-paper-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap"
                          >
                            <XCircle className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                            <span>取消預約</span>
                          </button>
                        </>
                      )}

                      {booking.status === 'in_use' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onTempAway(booking.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap"
                          >
                            <PauseCircle className="h-4 w-4" aria-hidden="true" />
                            <span>暫時離座</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingActionConfirm({ type: 'end', booking })
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-paper-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap"
                          >
                            <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                            <span>結束使用</span>
                          </button>
                        </>
                      )}

                      {booking.status === 'temp_away' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onReturnToSeat(booking.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-hover whitespace-nowrap"
                          >
                            <Play className="h-4 w-4" aria-hidden="true" />
                            <span>返回座位</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingActionConfirm({ type: 'end', booking })
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-paper-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap"
                          >
                            <LogOut className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                            <span>結束使用</span>
                          </button>
                        </>
                      )}

                      {['completed', 'cancelled', 'expired'].includes(booking.status) && (
                        <button
                          type="button"
                          onClick={onGoToBook}
                          className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-4 py-2 text-xs font-medium text-moss transition-colors hover:bg-moss-tint/50 whitespace-nowrap"
                        >
                          再次預約其他時段
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Clear Operational Reminders */}
        <aside className="rounded-xl border border-line bg-paper-card p-6 lg:col-span-4 space-y-4">
          <h2 className="font-editorial text-xl font-bold text-ink border-b border-line pb-3">
            操作提醒
          </h2>
          <dl className="divide-y divide-line text-sm">
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-moss">暫時離座（保留座位）</dt>
              <dd className="text-xs leading-relaxed text-ink-muted">
                短暫離開閱覽室時使用，系統將為您保留座位{' '}
                <span className="font-semibold text-ink tabular-nums">
                  {demoSettings.tempAwayMinutes} 分鐘
                </span>
                ，期間其他同學無法預約此席位，畫面將顯示返回期限。
              </dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-ink">結束使用（釋出座位）</dt>
              <dd className="text-xs leading-relaxed text-ink-muted">
                提早離開且不再返回時請點選「結束使用」，座位將立即釋出並更新各區剩餘空位數。
              </dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className="font-semibold text-ochre">取消預約</dt>
              <dd className="text-xs leading-relaxed text-ink-muted">
                適用於尚未報到的預約；取消後將即時釋出該時段座位並記錄於歷史紀錄。
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {/* Confirmation Dialog for Cancel Booking / End Use */}
      <ConfirmDialog
        open={Boolean(pendingActionConfirm)}
        variant="danger"
        title={
          pendingActionConfirm?.type === 'cancel'
            ? '確定要取消這筆預約嗎？'
            : '確定要提前結束使用嗎？'
        }
        description={
          pendingActionConfirm?.type === 'cancel'
            ? '取消預約後，系統將立即釋出此座位給其他同學預約，且此操作無法復原。'
            : '結束使用將立即釋出您的座位（與「暫時離座」保留座位不同），確定離開請確認送出。'
        }
        detailLines={
          pendingActionConfirm
            ? [
                `座號：${pendingActionConfirm.booking.seatId}`,
                `時間：${formatDateShortTW(pendingActionConfirm.booking.date)} ${formatTimeRange(
                  pendingActionConfirm.booking.startHour,
                  pendingActionConfirm.booking.endHour
                )}`,
              ]
            : undefined
        }
        confirmLabel={
          pendingActionConfirm?.type === 'cancel' ? '確定取消預約' : '確定結束並釋出'
        }
        cancelLabel="返回保留"
        onCancel={() => setPendingActionConfirm(null)}
        onConfirm={() => {
          if (!pendingActionConfirm) return;
          if (pendingActionConfirm.type === 'cancel') {
            onCancelBooking(pendingActionConfirm.booking.id);
          } else {
            onEndUse(pendingActionConfirm.booking.id);
          }
          setPendingActionConfirm(null);
        }}
      />
    </div>
  );
};
