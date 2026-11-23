import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { CalendarPage } from './components/CalendarPage';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DashboardPage } from './components/DashboardPage';
import { GuideModal } from './components/GuideModal';
import { Header } from './components/Header';
import { BookingTabId, MyBookingsPage } from './components/MyBookingsPage';
import { SeatMapPage } from './components/SeatMapPage';
import {
  ALL_SEATS,
  DEFAULT_DEMO_SETTINGS,
  DEFAULT_TIME_SELECTION,
  INITIAL_BOOKINGS,
  SIMULATED_NOW_HOUR,
  SIMULATED_NOW_LABEL,
  SIMULATED_NOW_MINUTE,
  SIMULATED_TODAY,
  ZONES,
} from './data/mockLibraryData';
import {
  Booking,
  DemoSettings,
  PageId,
  SeatInfo,
  TimeSelection,
  ZoneId,
} from './types/library';
import {
  ACTIVE_BOOKING_STATUSES,
  addMinutesToClock,
  computeSeatStatus,
} from './utils/bookingLogic';

const STORAGE_KEYS = {
  BOOKINGS: 'ntut_lib_demo_bookings_v1',
  SETTINGS: 'ntut_lib_demo_settings_v1',
  TIME: 'ntut_lib_demo_time_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>(() =>
    readStorage<Booking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS)
  );
  const [demoSettings, setDemoSettings] = useState<DemoSettings>(() =>
    readStorage<DemoSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_DEMO_SETTINGS)
  );
  const [timeSelection, setTimeSelection] = useState<TimeSelection>(() =>
    readStorage<TimeSelection>(STORAGE_KEYS.TIME, DEFAULT_TIME_SELECTION)
  );

  const [activeZoneId, setActiveZoneId] = useState<ZoneId>('A');
  const [bookingTab, setBookingTab] = useState<BookingTabId>('pending');
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [seatInvalidNotice, setSeatInvalidNotice] = useState<string | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>(
    `${SIMULATED_TODAY.replace(/-/g, '/')} ${SIMULATED_NOW_LABEL}`
  );
  const [showGuide, setShowGuide] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(demoSettings));
    } catch {
      // Ignore storage quota errors
    }
  }, [demoSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.TIME, JSON.stringify(timeSelection));
    } catch {
      // Ignore storage quota errors
    }
  }, [timeSelection]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const activeBookingCount = useMemo(
    () => bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
    [bookings]
  );

  const validateSelectedSeatForTime = (nextTime: TimeSelection, currentBookings: Booking[]) => {
    if (!selectedSeatId) return;
    const seat = ALL_SEATS.find((s) => s.id === selectedSeatId);
    const zone = seat ? ZONES.find((z) => z.id === seat.zoneId) : null;
    if (!seat || !zone) {
      setSelectedSeatId(null);
      return;
    }
    const status = computeSeatStatus(
      seat,
      zone,
      nextTime.date,
      nextTime.startHour,
      nextTime.endHour,
      currentBookings,
      null
    );
    if (status !== 'available') {
      setSelectedSeatId(null);
      setSeatInvalidNotice(
        `您先前選取的座位 ${seat.id} 於新時段已不可預約，請重新挑選其他可用座位。`
      );
    } else {
      setSeatInvalidNotice(null);
    }
  };

  const handleChangeTimeSelection = (nextTime: TimeSelection) => {
    setTimeSelection(nextTime);
    validateSelectedSeatForTime(nextTime, bookings);
  };

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectZone = (zoneId: ZoneId, mode: 'current' | 'selected') => {
    setActiveZoneId(zoneId);
    if (mode === 'current') {
      const todayNextSlot: TimeSelection = {
        date: SIMULATED_TODAY,
        startHour: SIMULATED_NOW_HOUR + 1,
        endHour: SIMULATED_NOW_HOUR + 3,
      };
      setTimeSelection(todayNextSlot);
      validateSelectedSeatForTime(todayNextSlot, bookings);
    }
    handleNavigate('seatmap');
  };

  const handleRefreshData = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setLastUpdatedLabel(`${SIMULATED_TODAY.replace(/-/g, '/')} ${hh}:${mm}:${ss}`);
    setToastMessage('已更新各區即時座位狀態');
  };

  const handleCreateBooking = (seat: SeatInfo): Booking => {
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      seatId: seat.id,
      zoneId: seat.zoneId,
      date: timeSelection.date,
      startHour: timeSelection.startHour,
      endHour: timeSelection.endHour,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setBookings((prev) => [newBooking, ...prev]);
    setSelectedSeatId(null);
    setSeatInvalidNotice(null);
    setToastMessage(`已為您建立 ${seat.id} 的座位預約`);
    return newBooking;
  };

  const handleCheckIn = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === bookingId
          ? {
              ...bk,
              status: 'in_use',
              checkedInAt: `${SIMULATED_TODAY} ${SIMULATED_NOW_LABEL}`,
              statusNote: `已於模擬時間 ${SIMULATED_NOW_LABEL} 完成到館報到`,
            }
          : bk
      )
    );
    setToastMessage('模擬報到成功，座位已進入「使用中」狀態');
  };

  const handleTempAway = (bookingId: string) => {
    const returnBy = addMinutesToClock(
      SIMULATED_NOW_HOUR,
      SIMULATED_NOW_MINUTE,
      demoSettings.tempAwayMinutes
    );
    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === bookingId
          ? {
              ...bk,
              status: 'temp_away',
              tempAwayStartedAt: SIMULATED_NOW_LABEL,
              tempAwayReturnBy: returnBy,
              statusNote: `暫時離座保留中，請於 ${returnBy} 前返回座位`,
            }
          : bk
      )
    );
    setToastMessage(`已切換為「暫離中」，座位將保留至 ${returnBy}`);
  };

  const handleReturnToSeat = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === bookingId
          ? {
              ...bk,
              status: 'in_use',
              tempAwayStartedAt: undefined,
              tempAwayReturnBy: undefined,
              statusNote: '已返回座位，繼續使用中',
            }
          : bk
      )
    );
    setToastMessage('歡迎回來！座位已恢復為「使用中」');
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === bookingId
          ? {
              ...bk,
              status: 'cancelled',
              endedAt: `${SIMULATED_TODAY} ${SIMULATED_NOW_LABEL}`,
              statusNote: '已主動取消預約，座位已釋出',
            }
          : bk
      )
    );
    setToastMessage('已取消預約並即時釋出該時段座位');
  };

  const handleEndUse = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((bk) =>
        bk.id === bookingId
          ? {
              ...bk,
              status: 'completed',
              endedAt: `${SIMULATED_TODAY} ${SIMULATED_NOW_LABEL}`,
              tempAwayReturnBy: undefined,
              statusNote: '已結束使用並釋出座位',
            }
          : bk
      )
    );
    setToastMessage('已結束使用並立即釋出座位');
  };

  const handleResetDemo = () => {
    setBookings(INITIAL_BOOKINGS);
    setDemoSettings(DEFAULT_DEMO_SETTINGS);
    setTimeSelection(DEFAULT_TIME_SELECTION);
    setActiveZoneId('A');
    setSelectedSeatId(null);
    setSeatInvalidNotice(null);
    setLastUpdatedLabel(`${SIMULATED_TODAY.replace(/-/g, '/')} ${SIMULATED_NOW_LABEL}`);
    setShowResetConfirm(false);
    setToastMessage('已還原所有示範預約與規則設定');
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        activeBookingCount={activeBookingCount}
        onOpenGuide={() => setShowGuide(true)}
        onRequestResetDemo={() => setShowResetConfirm(true)}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        {currentPage === 'dashboard' && (
          <DashboardPage
            bookings={bookings}
            timeSelection={timeSelection}
            demoSettings={demoSettings}
            lastUpdatedLabel={lastUpdatedLabel}
            onRefresh={handleRefreshData}
            onNavigate={handleNavigate}
            onManageLatestBooking={(status) => {
              if (status === 'pending') setBookingTab('pending');
              else if (status === 'in_use' || status === 'temp_away') setBookingTab('active');
              else setBookingTab('history');
              handleNavigate('bookings');
            }}
            onInspectZone={handleInspectZone}
          />
        )}

        {currentPage === 'calendar' && (
          <CalendarPage
            timeSelection={timeSelection}
            onChangeTimeSelection={handleChangeTimeSelection}
            bookings={bookings}
            onProceedToSeatMap={() => handleNavigate('seatmap')}
          />
        )}

        {currentPage === 'seatmap' && (
          <SeatMapPage
            activeZoneId={activeZoneId}
            onChangeZone={(zoneId) => {
              setActiveZoneId(zoneId);
              if (selectedSeatId && !selectedSeatId.startsWith(`${zoneId}-`)) {
                setSelectedSeatId(null);
              }
            }}
            timeSelection={timeSelection}
            selectedSeatId={selectedSeatId}
            onSelectSeat={setSelectedSeatId}
            seatInvalidNotice={seatInvalidNotice}
            onClearSeatInvalidNotice={() => setSeatInvalidNotice(null)}
            bookings={bookings}
            demoSettings={demoSettings}
            onConfirmCreateBooking={handleCreateBooking}
            onNavigate={handleNavigate}
            onViewMyBookings={() => {
              setBookingTab('pending');
              handleNavigate('bookings');
            }}
          />
        )}

        {currentPage === 'bookings' && (
          <MyBookingsPage
            bookings={bookings}
            activeTab={bookingTab}
            onChangeTab={setBookingTab}
            demoSettings={demoSettings}
            onUpdateDemoSettings={setDemoSettings}
            onCheckIn={handleCheckIn}
            onCancelBooking={handleCancelBooking}
            onTempAway={handleTempAway}
            onReturnToSeat={handleReturnToSeat}
            onEndUse={handleEndUse}
            onGoToBook={() => handleNavigate('calendar')}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-line bg-paper-card/60">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-muted sm:flex-row sm:px-8 lg:px-12">
          <p className="font-medium text-ink-muted">
            課堂設計原型｜座位與規則皆為示範資料
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="underline underline-offset-4 hover:text-ink whitespace-nowrap"
            >
              操作說明
            </button>
            <span className="text-line-strong" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 font-medium text-ochre hover:underline underline-offset-4 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>重設示範資料</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-lg border border-moss-border bg-paper-card px-4 py-3 text-sm font-medium text-ink shadow-md"
        >
          <CheckCircle2 className="h-4 w-4 text-moss shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        demoSettings={demoSettings}
        onStartBooking={() => handleNavigate('calendar')}
      />

      <ConfirmDialog
        open={showResetConfirm}
        variant="danger"
        title="確定要重設示範資料嗎？"
        description="這將會清空您剛建立或修改的示範預約與規則設定，並恢復為課堂展示初始資料。"
        confirmLabel="確定重設"
        cancelLabel="保留目前資料"
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleResetDemo}
      />
    </div>
  );
}
