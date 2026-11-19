import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building,
  Loader2,
  Percent,
  Save,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { AppUser, Product, StoreSettings, UserRole } from '../types';
import {
  deleteAllProductsAndNotifications,
  registerUserAccount,
  removeUserAccount,
  updateStoreSettingsRecord,
  updateUserRoleOrInfo,
} from '../services/firestoreService';
import { formatDateTimeDisplay } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface SettingsViewProps {
  currentUser: AppUser;
  users: AppUser[];
  products: Product[];
  settings: StoreSettings;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  users,
  products,
  settings,
  onToast,
}) => {
  // Strict RBAC guard
  if (currentUser.role !== 'Admin') {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Access Denied - Admin Only
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Only Admin accounts can view or change Prime Mobiles business settings,
          staff roles, discounts, or low-stock limits.
        </p>
      </div>
    );
  }

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber);
  const [lowStockLimit, setLowStockLimit] = useState(String(settings.lowStockLimit));
  const [discountActive, setDiscountActive] = useState(settings.discountActive);
  const [discountTitle, setDiscountTitle] = useState(settings.discountTitle);
  const [discountPercent, setDiscountPercent] = useState(
    String(settings.discountPercent)
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Add Staff form inside Admin settings
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffFullName, setStaffFullName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('Staff');
  const [addingStaff, setAddingStaff] = useState(false);

  // Confirmations
  const [staffToRemove, setStaffToRemove] = useState<AppUser | null>(null);
  const [removingStaff, setRemovingStaff] = useState(false);

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    setBusinessName(settings.businessName);
    setPhoneNumber(settings.phoneNumber);
    setLowStockLimit(String(settings.lowStockLimit));
    setDiscountActive(settings.discountActive);
    setDiscountTitle(settings.discountTitle);
    setDiscountPercent(String(settings.discountPercent));
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = Math.floor(Number(lowStockLimit));
    const discountNum = Number(discountPercent);

    if (!businessName.trim() || !phoneNumber.trim()) {
      onToast('Business Name and Phone Number are required', 'error');
      return;
    }
    if (Number.isNaN(limitNum) || limitNum < 1) {
      onToast('Low Stock Limit must be at least 1', 'error');
      return;
    }
    if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      onToast('Discount percentage must be between 0 and 100', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      await updateStoreSettingsRecord(
        {
          businessName: businessName.trim(),
          phoneNumber: phoneNumber.trim(),
          lowStockLimit: limitNum,
          discountActive,
          discountTitle: discountTitle.trim(),
          discountPercent: discountNum,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.fullName,
        },
        products
      );
      onToast('Settings saved and synced online', 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to save settings',
        'error'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleUserRole = async (target: AppUser) => {
    if (target.id === currentUser.id) {
      onToast('You cannot demote your own active Admin account', 'error');
      return;
    }
    const nextRole: UserRole = target.role === 'Admin' ? 'Staff' : 'Admin';
    try {
      await updateUserRoleOrInfo(target.id, { role: nextRole });
      onToast(`${target.fullName} changed to ${nextRole}`, 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  };

  const handleConfirmRemoveStaff = async () => {
    if (!staffToRemove) return;
    setRemovingStaff(true);
    try {
      await removeUserAccount(staffToRemove.id);
      setStaffToRemove(null);
      onToast('Staff account removed', 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to remove staff',
        'error'
      );
    } finally {
      setRemovingStaff(false);
    }
  };

  const handleAdminAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStaff(true);
    try {
      await registerUserAccount({
        fullName: staffFullName,
        username: staffUsername,
        phoneNumber: staffPhone,
        password: staffPassword,
        forceRole: staffRole,
      });
      setStaffFullName('');
      setStaffUsername('');
      setStaffPhone('');
      setStaffPassword('');
      setStaffRole('Staff');
      setShowAddStaff(false);
      onToast('New staff account added to Firestore', 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to add staff member',
        'error'
      );
    } finally {
      setAddingStaff(false);
    }
  };

  const handleDeleteAllProducts = async () => {
    setDeletingAll(true);
    try {
      await deleteAllProductsAndNotifications();
      setConfirmDeleteAll(false);
      onToast('All products deleted from Firestore', 'success');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to delete all products',
        'error'
      );
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Admin Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure business details, low-stock threshold, storewide discounts, and staff permissions.
        </p>
      </div>

      {/* Business, Low Stock Limit, Discount Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Building className="w-4 h-4 text-emerald-700" />
              Business Details
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Alert Limit (default 5)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={lowStockLimit}
                onChange={(e) => setLowStockLimit(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Triggers a Low Stock notification whenever approved stock goes below this number.
              </p>
            </div>
          </div>

          {/* Discount / Offer Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Percent className="w-4 h-4 text-emerald-700" />
              Discount / Offer Settings
            </div>

            <label className="min-h-[44px] flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-[#F6FAF7] cursor-pointer">
              <input
                type="checkbox"
                checked={discountActive}
                onChange={(e) => setDiscountActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              <span className="text-sm font-semibold text-slate-900">
                Enable Storewide Wholesale Discount
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offer / Discount Title
              </label>
              <input
                type="text"
                value={discountTitle}
                onChange={(e) => setDiscountTitle(e.target.value)}
                placeholder="Ex: Wholesale Seasonal Offer"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Manage Staff Section */}
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Manage Staff ({users.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAddStaff((v) => !v)}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            {showAddStaff ? 'Close Add Staff Form' : 'Add Staff Account'}
          </button>
        </div>

        {showAddStaff && (
          <form
            onSubmit={handleAdminAddStaff}
            className="p-4 rounded-xl bg-[#F6FAF7] border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={staffFullName}
                onChange={(e) => setStaffFullName(e.target.value)}
                placeholder="Ex: Kasun Perera"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value)}
                placeholder="Ex: kasun"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                placeholder="Ex: +94 77 123 4567"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Min 4 chars"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as UserRole)}
                className="min-h-[42px] px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={addingStaff}
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-70"
              >
                {addingStaff ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Staff Member</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Registered</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">
                        {u.fullName} {isSelf && '(You)'}
                      </div>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono-num text-slate-700">
                      {u.phoneNumber}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          u.role === 'Admin'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono-num text-slate-500">
                      {formatDateTimeDisplay(u.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleToggleUserRole(u)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 whitespace-nowrap"
                        >
                          Make {u.role === 'Admin' ? 'Staff' : 'Admin'}
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setStaffToRemove(u)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 disabled:opacity-40 whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Delete All Products */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Delete All Products
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Permanently remove all {products.length} product{products.length === 1 ? '' : 's'} and stock alerts from Firestore.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={products.length === 0}
          onClick={() => setConfirmDeleteAll(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4" />
          Delete All Products
        </button>
      </div>

      <ConfirmModal
        open={Boolean(staffToRemove)}
        title="Remove Staff Account"
        message={
          staffToRemove
            ? `Are you sure? "${staffToRemove.fullName}" (@${staffToRemove.username}) will lose access immediately.`
            : ''
        }
        confirmLabel="Yes, Remove"
        loading={removingStaff}
        onConfirm={handleConfirmRemoveStaff}
        onCancel={() => setStaffToRemove(null)}
      />

      <ConfirmModal
        open={confirmDeleteAll}
        title="Delete All Products"
        message={`Are you sure? This will permanently delete all ${products.length} products and active stock notifications from Firestore.`}
        confirmLabel="Yes, Delete All"
        loading={deletingAll}
        onConfirm={handleDeleteAllProducts}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
};
