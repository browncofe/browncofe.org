import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  detailLines?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  detailLines,
  confirmLabel,
  cancelLabel = '再想想',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-paper-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {variant === 'danger' && (
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ochre-tint text-ochre shrink-0">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <h3 id="confirm-dialog-title" className="font-editorial text-xl font-semibold text-ink">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="關閉視窗"
            className="rounded-md p-1.5 text-ink-muted hover:bg-paper-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>

        {detailLines && detailLines.length > 0 && (
          <div className="mt-4 border-t border-b border-line py-3 space-y-1.5 text-sm text-ink">
            {detailLines.map((line, idx) => (
              <p key={idx} className="tabular-nums">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line bg-paper-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-muted whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-5 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 ${
              variant === 'danger'
                ? 'bg-[#8f3f2d] hover:bg-[#753223]'
                : 'bg-moss hover:bg-moss-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
