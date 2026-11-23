import React from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, PauseCircle, X } from 'lucide-react';
import { DemoSettings } from '../types/library';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  demoSettings: DemoSettings;
  onStartBooking: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  open,
  onClose,
  demoSettings,
  onStartBooking,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-paper-card p-6 sm:p-8 shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs text-ink-muted">UX 課堂互動原型導覽</p>
            <h2 id="guide-modal-title" className="mt-1 font-editorial text-2xl font-bold text-ink">
              閱覽室座位預約使用說明
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉使用說明"
            className="rounded-md p-2 text-ink-muted hover:bg-paper-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="font-editorial text-lg font-semibold text-ink">一、四步驟完成預約</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-moss">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>01. 選擇日期與時段</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  於月曆挑選預約日期，設定開始與結束時間。系統將自動排除已過時段與休館日。
                </p>
              </div>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-moss">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>02. 在 2D 平面圖選位</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  可切換 A、B、C 區並依「有插座」「靠窗」篩選，確認位置與設備後送出預約。
                </p>
              </div>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-moss">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>03. 模擬到館報到</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  前往「我的預約」可模擬到館報到；示範寬限為開始後{' '}
                  <span className="tabular-nums font-medium text-ink">
                    {demoSettings.checkInGraceMinutes}
                  </span>{' '}
                  分鐘內。
                </p>
              </div>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-moss">
                  <PauseCircle className="h-4 w-4" aria-hidden="true" />
                  <span>04. 暫時離座與釋出</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  暫時離座可保留座位{' '}
                  <span className="tabular-nums font-medium text-ink">
                    {demoSettings.tempAwayMinutes}
                  </span>{' '}
                  分鐘；提早離開請點選「結束使用」立即釋出空位。
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-line pt-5">
            <h3 className="font-editorial text-lg font-semibold text-ink">二、示範規則與課堂展示提醒</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
                <span>
                  同一位示範學生不可建立時間重疊的有效預約；欲測試不同時段衝突，可於預約頁選擇重疊小時觀察系統提示。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
                <span>
                  所有預約紀錄與示範規則（報到寬限、暫離期限）皆保存於瀏覽器 localStorage，可隨時透過右上角選單或頁尾「重設示範資料」還原初始狀態。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
                <span>
                  本原型內之座位配置、開放狀態與時間門檻皆為課堂 UX 示範資料，非國立臺北科技大學圖書館現行正式規章。
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper-muted"
          >
            關閉
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartBooking();
            }}
            className="rounded-md bg-moss px-5 py-2 text-sm font-medium text-white hover:bg-moss-hover"
          >
            開始預約座位
          </button>
        </div>
      </div>
    </div>
  );
};
