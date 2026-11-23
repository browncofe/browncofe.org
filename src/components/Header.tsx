import React, { useState } from 'react';
import { BookOpen, ChevronDown, HelpCircle, RotateCcw, User } from 'lucide-react';
import { DEMO_STUDENT } from '../data/mockLibraryData';
import { PageId } from '../types/library';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  activeBookingCount: number;
  onOpenGuide: () => void;
  onRequestResetDemo: () => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: '座位總覽' },
  { id: 'calendar', label: '日期與時段' },
  { id: 'seatmap', label: '座位選擇' },
  { id: 'bookings', label: '我的預約' },
];

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  activeBookingCount,
  onOpenGuide,
  onRequestResetDemo,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-8 lg:px-12">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-moss-border bg-moss-tint text-moss transition-colors group-hover:bg-moss group-hover:text-white">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-editorial text-lg font-bold tracking-tight text-ink sm:text-xl">
            北科大圖書館座位預約
          </span>
        </button>

        {/* Zone 2: 4 page navigation links (Desktop) */}
        <nav aria-label="主要導覽" className="hidden md:flex items-center gap-1 lg:gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-moss text-white'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-muted/70'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{item.label}</span>
                {item.id === 'bookings' && activeBookingCount > 0 && (
                  <span
                    className={`ml-1.5 tabular-nums text-xs ${
                      isActive ? 'text-white/90' : 'text-moss font-semibold'
                    }`}
                  >
                    ({activeBookingCount})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Utility & Account actions */}
        <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-paper-muted/70 hover:text-ink whitespace-nowrap shrink-0"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">使用說明</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-paper-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-paper-muted/50 whitespace-nowrap shrink-0"
            >
              <User className="h-4 w-4 text-moss" aria-hidden="true" />
              <span className="hidden sm:inline">{DEMO_STUDENT.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-line bg-paper-card p-4 shadow-sm">
                  <div className="border-b border-line pb-3">
                    <p className="font-editorial text-base font-semibold text-ink">
                      {DEMO_STUDENT.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                      學號 {DEMO_STUDENT.studentId} · {DEMO_STUDENT.department}
                    </p>
                  </div>
                  <div className="pt-3 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigate('bookings');
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-paper-muted"
                    >
                      <span>查看我的預約</span>
                      <span className="tabular-nums text-xs text-moss font-medium">
                        {activeBookingCount} 筆進行中
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onRequestResetDemo();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ochre transition-colors hover:bg-ochre-tint/50"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>重設示範資料</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav
        aria-label="行動版頁面導覽"
        className="flex md:hidden border-t border-line bg-paper-card px-2 py-1.5 overflow-x-auto gap-1"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex-1 min-w-[76px] rounded-md px-2.5 py-2 text-center text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-moss text-white'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-muted/60'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
              {item.id === 'bookings' && activeBookingCount > 0 ? ` (${activeBookingCount})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
