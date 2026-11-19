import React from 'react';
import { AlertTriangle, Bell, CheckCircle2, Package, X } from 'lucide-react';
import { StockNotification, UserRole } from '../types';
import { formatDateTimeDisplay } from '../utils/formatters';

interface NotificationsDrawerProps {
  open: boolean;
  notifications: StockNotification[];
  userRole: UserRole;
  onClose: () => void;
  onDismiss: (notificationId: string) => void;
  onGoToProducts: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  notifications,
  userRole,
  onClose,
  onDismiss,
  onGoToProducts,
}) => {
  if (!open) return null;

  const activeAlerts = notifications.filter((n) => !n.dismissed);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Stock Notifications
              </h2>
              <p className="text-xs text-slate-500">
                {activeAlerts.length} active alert{activeAlerts.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                All stock levels look healthy
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Low stock alerts appear here automatically when inventory drops below the limit.
              </p>
            </div>
          ) : (
            activeAlerts.map((item) => {
              const isOut = item.severity === 'OUT_OF_STOCK';
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    isOut
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isOut ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isOut
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-400 text-amber-950'
                            }`}
                          >
                            {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono-num">
                            {formatDateTimeDisplay(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-slate-900">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {userRole === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => onDismiss(item.id)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors shrink-0"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToProducts();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            <Package className="w-4 h-4" />
            View Products &amp; Stock
          </button>
        </div>
      </div>
    </div>
  );
};
