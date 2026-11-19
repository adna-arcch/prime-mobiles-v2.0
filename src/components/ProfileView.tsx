import React from 'react';
import {
  Building2,
  CalendarCheck,
  LogOut,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AppUser, AttendanceRecord, StoreSettings } from '../types';
import {
  formatDateTimeDisplay,
  getCurrentMonthString,
} from '../utils/formatters';

interface ProfileViewProps {
  currentUser: AppUser;
  attendance: AttendanceRecord[];
  settings: StoreSettings;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  attendance,
  settings,
  onLogout,
}) => {
  const currentMonth = getCurrentMonthString();
  const myMonthRecords = attendance.filter(
    (a) => a.staffId === currentUser.id && a.month === currentMonth
  );
  const myShop = myMonthRecords.filter((a) => a.workType === 'Shop Work').length;
  const myWfh = myMonthRecords.filter(
    (a) => a.workType === 'Work From Home'
  ).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Staff Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account details and monthly summary at {settings.businessName}.
        </p>
      </div>

      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {currentUser.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {currentUser.fullName}
            </h2>
            <p className="text-sm text-slate-500">
              @{currentUser.username} ·{' '}
              <span className="font-semibold text-emerald-700">
                {currentUser.role}
              </span>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Phone Number</div>
              <div className="font-semibold font-mono-num text-slate-900">
                {currentUser.phoneNumber}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Access Role</div>
              <div className="font-semibold text-slate-900">
                {currentUser.role} Permissions
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">This Month Attendance</div>
              <div className="font-semibold font-mono-num text-slate-900">
                {myMonthRecords.length} Days ({myShop} Shop · {myWfh} WFH)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500">Account Created</div>
              <div className="font-semibold font-mono-num text-slate-900">
                {formatDateTimeDisplay(currentUser.createdAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {settings.businessName} · {settings.phoneNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
