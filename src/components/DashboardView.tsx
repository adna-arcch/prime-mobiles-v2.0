import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Home,
  Loader2,
  Package,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import {
  AppUser,
  AttendanceRecord,
  DeliveryOrder,
  NavTab,
  Product,
  StoreSettings,
  WorkType,
} from '../types';
import { markDailyAttendance } from '../services/firestoreService';
import {
  formatCurrencyRs,
  getCurrentMonthString,
  getTodayDateString,
} from '../utils/formatters';

interface DashboardViewProps {
  currentUser: AppUser;
  users: AppUser[];
  products: Product[];
  attendance: AttendanceRecord[];
  orders: DeliveryOrder[];
  settings: StoreSettings;
  onNavigate: (tab: NavTab) => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  users,
  products,
  attendance,
  orders,
  settings,
  onNavigate,
  onToast,
}) => {
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('Shop Work');
  const [markingAttendance, setMarkingAttendance] = useState(false);

  const todayDate = getTodayDateString();
  const currentMonth = getCurrentMonthString();

  const todayRecords = attendance.filter((a) => a.date === todayDate);
  const myTodayRecord = todayRecords.find((a) => a.staffId === currentUser.id);
  const todayShopCount = todayRecords.filter((a) => a.workType === 'Shop Work').length;
  const todayWfhCount = todayRecords.filter((a) => a.workType === 'Work From Home').length;

  const myMonthRecords = attendance.filter(
    (a) => a.staffId === currentUser.id && a.month === currentMonth
  );
  const myMonthShop = myMonthRecords.filter((a) => a.workType === 'Shop Work').length;
  const myMonthWfh = myMonthRecords.filter((a) => a.workType === 'Work From Home').length;

  const approvedProducts = products.filter((p) => p.approvalStatus === 'Approved');
  const pendingProducts = products.filter((p) => p.approvalStatus === 'Pending Approval');
  const lowOrOutProducts = approvedProducts.filter(
    (p) => p.stockQuantity === 0 || p.stockQuantity < settings.lowStockLimit
  );

  const handleMarkAttendance = async () => {
    if (myTodayRecord) return;
    setMarkingAttendance(true);
    try {
      await markDailyAttendance(currentUser, selectedWorkType);
      onToast(`Attendance marked as ${selectedWorkType}`, 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to mark attendance',
        'error'
      );
    } finally {
      setMarkingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            {settings.businessName} · {currentUser.role} Workspace
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Welcome back, {currentUser.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This Month: <span className="font-semibold text-slate-800 font-mono-num">{myMonthRecords.length} Days</span> —{' '}
            <span className="font-mono-num">{myMonthShop} Days Shop</span>,{' '}
            <span className="font-mono-num">{myMonthWfh} Days WFH</span>
          </p>
        </div>

        {settings.discountActive && settings.discountPercent > 0 && (
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold self-start sm:self-auto">
            <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {settings.discountTitle || 'Wholesale Offer'}: {settings.discountPercent}% OFF active
            </span>
          </div>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Staff */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Registered Staff
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-mono-num">
              {users.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {users.filter((u) => u.role === 'Admin').length} Admin ·{' '}
              {users.filter((u) => u.role === 'Staff').length} Staff
            </p>
          </div>
        </div>

        {/* Card 2: Today Attendance */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Today Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-mono-num">
              {todayRecords.length}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-mono-num">
              {todayShopCount} Shop · {todayWfhCount} WFH ({todayDate})
            </p>
          </div>
        </div>

        {/* Card 3: Total Products */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Total Products
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-mono-num">
              {products.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {approvedProducts.length} Approved · {pendingProducts.length} Pending
            </p>
          </div>
        </div>

        {/* Card 4: Low / Out of Stock Items */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Low / Out of Stock Items
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                lowOrOutProducts.length > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-mono-num">
              {lowOrOutProducts.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Limit set below <span className="font-mono-num font-semibold">{settings.lowStockLimit}</span> units
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action + Low Stock List Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Big Mark Today's Attendance Card */}
        <div className="lg:col-span-6 bg-white border border-emerald-100 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Daily Staff Attendance
              </h2>
              <span className="text-xs font-medium text-slate-500 font-mono-num">
                {todayDate}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Select your work location for today. Attendance can only be marked once per day.
            </p>

            {/* Radio selection */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`min-h-[56px] flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  myTodayRecord
                    ? myTodayRecord.workType === 'Shop Work'
                      ? 'border-emerald-600 bg-emerald-50/70'
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : selectedWorkType === 'Shop Work'
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard-work-type"
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
                <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Shop Work
                  </div>
                  <div className="text-xs text-slate-500">On-site at Prime Mobiles</div>
                </div>
              </label>

              <label
                className={`min-h-[56px] flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  myTodayRecord
                    ? myTodayRecord.workType === 'Work From Home'
                      ? 'border-emerald-600 bg-emerald-50/70'
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : selectedWorkType === 'Work From Home'
                      ? 'border-emerald-600 bg-emerald-50/60'
                      : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard-work-type"
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
                <Home className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Work From Home
                  </div>
                  <div className="text-xs text-slate-500">Remote wholesale support</div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6">
            {myTodayRecord ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled
                  className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-100 text-emerald-900 text-sm font-semibold px-5 py-3 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  Already Marked Today ({myTodayRecord.workType} · {myTodayRecord.time})
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleMarkAttendance}
                disabled={markingAttendance}
                className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-semibold px-5 py-3 transition-all disabled:opacity-70"
              >
                {markingAttendance ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Attendance...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5" />
                    Mark Today&apos;s Attendance
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Low / Out of Stock Items List Card */}
        <div className="lg:col-span-6 bg-white border border-emerald-100 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Low / Out of Stock Items
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
              >
                Manage Inventory
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lowOrOutProducts.length === 0 ? (
              <div className="mt-6 py-8 text-center rounded-xl bg-emerald-50/50 border border-emerald-100">
                <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900">
                  {products.length === 0
                    ? 'No products added yet'
                    : 'All approved products are well stocked'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {products.length === 0
                    ? 'Add wholesale products from the Products page to begin tracking stock.'
                    : `Every item has at least ${settings.lowStockLimit} units in stock.`}
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {lowOrOutProducts.map((item) => {
                  const isOut = item.stockQuantity === 0;
                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.category} · Selling {formatCurrencyRs(item.sellingPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold font-mono-num text-slate-900">
                          {item.stockQuantity} left
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isOut
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-400 text-amber-950'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {currentUser.role === 'Admin' && pendingProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-amber-800">
                {pendingProducts.length} staff-submitted product{pendingProducts.length === 1 ? '' : 's'} waiting for approval
              </span>
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Review Pending
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deliveries / Orders Snapshot */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Wholesale Deliveries &amp; Orders
              </h2>
              <p className="text-xs text-slate-500">
                {orders.length} total order{orders.length === 1 ? '' : 's'} logged
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Mark Delivery / Order
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            No deliveries or orders logged yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Customer / Shop</th>
                  <th className="py-2.5 pr-4">Product</th>
                  <th className="py-2.5 pr-4 text-right">Qty</th>
                  <th className="py-2.5 pr-4 text-right">Total</th>
                  <th className="py-2.5 pr-4">Logged By</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      {ord.customerName}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">{ord.productName}</td>
                    <td className="py-2.5 pr-4 text-right font-mono-num">
                      {ord.quantity}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono-num font-semibold text-slate-900">
                      {formatCurrencyRs(ord.totalAmount)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{ord.markedBy}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
