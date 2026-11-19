import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Home,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { AppUser, AttendanceRecord, WorkType } from '../types';
import { markDailyAttendance } from '../services/firestoreService';
import { getCurrentMonthString, getTodayDateString } from '../utils/formatters';

interface AttendanceViewProps {
  currentUser: AppUser;
  users: AppUser[];
  attendance: AttendanceRecord[];
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  users,
  attendance,
  onToast,
}) => {
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('Shop Work');
  const [marking, setMarking] = useState(false);

  const [monthFilter, setMonthFilter] = useState<string>(getCurrentMonthString());
  const [staffFilter, setStaffFilter] = useState<string>('');

  const todayDate = getTodayDateString();
  const currentMonth = getCurrentMonthString();

  const myTodayRecord = attendance.find(
    (a) => a.staffId === currentUser.id && a.date === todayDate
  );

  const myCurrentMonthRecords = attendance.filter(
    (a) => a.staffId === currentUser.id && a.month === currentMonth
  );
  const myShopCount = myCurrentMonthRecords.filter(
    (a) => a.workType === 'Shop Work'
  ).length;
  const myWfhCount = myCurrentMonthRecords.filter(
    (a) => a.workType === 'Work From Home'
  ).length;

  const handleMark = async () => {
    if (myTodayRecord) return;
    setMarking(true);
    try {
      await markDailyAttendance(currentUser, selectedWorkType);
      onToast(`Today's attendance marked: ${selectedWorkType}`, 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Unable to mark attendance',
        'error'
      );
    } finally {
      setMarking(false);
    }
  };

  // Monthly breakdown per staff member (for Admin summary and Staff own view)
  const staffMonthlySummaries = useMemo(() => {
    const targetUsers =
      currentUser.role === 'Admin'
        ? users.filter((u) =>
            staffFilter.trim()
              ? u.fullName.toLowerCase().includes(staffFilter.trim().toLowerCase()) ||
                u.username.toLowerCase().includes(staffFilter.trim().toLowerCase())
              : true
          )
        : [currentUser];

    return targetUsers.map((u) => {
      const records = attendance.filter(
        (a) =>
          a.staffId === u.id && (monthFilter ? a.month === monthFilter : true)
      );
      const shopDays = records.filter((r) => r.workType === 'Shop Work').length;
      const wfhDays = records.filter(
        (r) => r.workType === 'Work From Home'
      ).length;
      return {
        user: u,
        totalDays: records.length,
        shopDays,
        wfhDays,
      };
    });
  }, [attendance, currentUser, monthFilter, staffFilter, users]);

  const filteredTableRecords = useMemo(() => {
    return attendance
      .filter((record) => {
        if (currentUser.role !== 'Admin' && record.staffId !== currentUser.id) {
          return false;
        }
        if (monthFilter && record.month !== monthFilter) {
          return false;
        }
        if (
          currentUser.role === 'Admin' &&
          staffFilter.trim() &&
          !record.staffName
            .toLowerCase()
            .includes(staffFilter.trim().toLowerCase()) &&
          !record.staffUsername
            .toLowerCase()
            .includes(staffFilter.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [attendance, currentUser, monthFilter, staffFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This Month:{' '}
            <span className="font-semibold text-slate-900 font-mono-num">
              {myCurrentMonthRecords.length} Days
            </span>{' '}
            - <span className="font-mono-num">{myShopCount} Days Shop</span>,{' '}
            <span className="font-mono-num">{myWfhCount} Days WFH</span>
          </p>
        </div>
      </div>

      {/* Mark Today Attendance Box */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              Mark Today&apos;s Attendance ({todayDate})
            </h2>
            <p className="text-sm text-slate-500">
              Choose Shop Work or Work From Home. Each staff member can submit once per day.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label
              className={`min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-sm font-semibold whitespace-nowrap ${
                myTodayRecord
                  ? myTodayRecord.workType === 'Shop Work'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : selectedWorkType === 'Shop Work'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
              }`}
            >
              <input
                type="radio"
                name="attendance-work-type"
                value="Shop Work"
                disabled={Boolean(myTodayRecord)}
                checked={
                  myTodayRecord
                    ? myTodayRecord.workType === 'Shop Work'
                    : selectedWorkType === 'Shop Work'
                }
                onChange={() => setSelectedWorkType('Shop Work')}
                className="w-4 h-4 accent-emerald-700"
              />
              <Building2 className="w-4 h-4 text-emerald-700" />
              Shop Work
            </label>

            <label
              className={`min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer text-sm font-semibold whitespace-nowrap ${
                myTodayRecord
                  ? myTodayRecord.workType === 'Work From Home'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : selectedWorkType === 'Work From Home'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
              }`}
            >
              <input
                type="radio"
                name="attendance-work-type"
                value="Work From Home"
                disabled={Boolean(myTodayRecord)}
                checked={
                  myTodayRecord
                    ? myTodayRecord.workType === 'Work From Home'
                    : selectedWorkType === 'Work From Home'
                }
                onChange={() => setSelectedWorkType('Work From Home')}
                className="w-4 h-4 accent-emerald-700"
              />
              <Home className="w-4 h-4 text-emerald-700" />
              Work From Home
            </label>

            {myTodayRecord ? (
              <button
                type="button"
                disabled
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-not-allowed whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Already Marked Today
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMark}
                disabled={marking}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-70"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    Mark Today&apos;s Attendance
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters + Monthly Per-Staff Summary */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {currentUser.role === 'Admin'
                ? 'All Staff Monthly Summary & Logs'
                : 'My Attendance History'}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="Filter by month"
                className="min-h-[42px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-mono-num focus:outline-none focus:border-emerald-600"
              />
            </div>

            {currentUser.role === 'Admin' && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  placeholder="Filter by staff name..."
                  className="min-h-[42px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Per-Staff Monthly Summary Cards */}
        {staffMonthlySummaries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffMonthlySummaries.map((item) => (
              <div
                key={item.user.id}
                className="p-4 rounded-xl bg-[#F6FAF7] border border-emerald-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {item.user.fullName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {item.user.role}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 font-mono-num">
                  This Month: <strong className="text-slate-900">{item.totalDays} Days</strong> —{' '}
                  {item.shopDays} Days Shop, {item.wfhDays} Days WFH
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Attendance Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Staff Name</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Time</th>
                <th className="py-3">Work Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTableRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No attendance records found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTableRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">
                        {rec.staffName}
                      </div>
                      <div className="text-xs text-slate-500">
                        @{rec.staffUsername}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono-num text-slate-800">
                      {rec.date}
                    </td>
                    <td className="py-3 pr-4 font-mono-num text-slate-600">
                      {rec.time}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          rec.workType === 'Shop Work'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-sky-100 text-sky-900'
                        }`}
                      >
                        {rec.workType === 'Shop Work' ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <Home className="w-3.5 h-3.5" />
                        )}
                        {rec.workType}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
