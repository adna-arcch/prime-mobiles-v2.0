import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Smartphone,
  User as UserIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './firebase';
import {
  AppUser,
  AttendanceRecord,
  DeliveryOrder,
  NavTab,
  Product,
  StockNotification,
  StoreSettings,
} from './types';
import {
  DEFAULT_STORE_SETTINGS,
  dismissNotification,
} from './services/firestoreService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { ProductsView } from './components/ProductsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { NotificationsDrawer } from './components/NotificationsDrawer';

const SESSION_STORAGE_KEY = 'prime_mobiles_logged_in_user';

function readStoredUser(): AppUser | null {
  try {
    const raw =
      sessionStorage.getItem(SESSION_STORAGE_KEY) ||
      localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (parsed && parsed.id && parsed.username) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persistUser(user: AppUser | null): void {
  if (user) {
    const serialized = JSON.stringify(user);
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function PrimeMobilesApp() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() =>
    readStoredUser()
  );
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(false);

  // Real-time Firestore collections (100% empty until real data is saved)
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(
    DEFAULT_STORE_SETTINGS
  );

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Verify Firestore connection on boot
  useEffect(() => {
    let mounted = true;
    testConnection().then((ok) => {
      if (mounted) setIsOnline(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Attach real-time Firestore listeners
  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(1000)),
      (snap) => {
        setIsOnline(true);
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as AppUser)
        );
        setUsers(list);
        setUsersLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), limit(1000)),
      (snap) => {
        setIsOnline(true);
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    const unsubAttendance = onSnapshot(
      query(collection(db, 'attendance'), limit(1000)),
      (snap) => {
        setAttendance(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), limit(500)),
      (snap) => {
        setNotifications(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as StockNotification)
          )
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), limit(1000)),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as DeliveryOrder)
        );
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setOrders(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'storeConfig'),
      (snap) => {
        if (snap.exists()) {
          setSettings({
            id: snap.id,
            ...(snap.data() as Omit<StoreSettings, 'id'>),
          });
        } else {
          setSettings(DEFAULT_STORE_SETTINGS);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/storeConfig');
      }
    );

    return () => {
      unsubUsers();
      unsubProducts();
      unsubAttendance();
      unsubNotifications();
      unsubOrders();
      unsubSettings();
    };
  }, []);

  // Keep logged-in user synced with Firestore role/removal updates
  useEffect(() => {
    if (!usersLoaded || !currentUser) return;
    const liveMatch = users.find((u) => u.id === currentUser.id);
    if (!liveMatch) {
      // Account was removed by Admin
      persistUser(null);
      setCurrentUser(null);
      setActiveTab('dashboard');
      return;
    }
    if (
      liveMatch.role !== currentUser.role ||
      liveMatch.fullName !== currentUser.fullName ||
      liveMatch.phoneNumber !== currentUser.phoneNumber
    ) {
      persistUser(liveMatch);
      setCurrentUser(liveMatch);
    }
  }, [users, usersLoaded, currentUser]);

  // Support #settings hash detection so if a Staff user tries opening Admin page directly, Access Denied displays
  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === '#settings') {
        setActiveTab('settings');
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleAuthSuccess = (user: AppUser, successBanner?: string) => {
    persistUser(user);
    setCurrentUser(user);
    setActiveTab('dashboard');
    if (successBanner) {
      showToast(successBanner, 'success');
    }
  };

  const handleLogout = () => {
    persistUser(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      await dismissNotification(notificationId);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Unable to dismiss alert',
        'error'
      );
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        businessName={settings.businessName}
        isOnline={isOnline}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  const isAdmin = currentUser.role === 'Admin';
  const activeAlertsCount = notifications.filter((n) => !n.dismissed).length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      id: 'products',
      label: 'Products',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon className="w-5 h-5" />,
    },
    ...(isAdmin
      ? [
          {
            id: 'settings' as NavTab,
            label: 'Settings',
            icon: <Settings className="w-5 h-5" />,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F6FAF7] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-emerald-100 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-emerald-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight truncate">
            {settings.businessName}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-100 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-[#F6FAF7] border border-emerald-100">
            <div className="text-xs font-bold text-slate-900 truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[11px] text-slate-500">
              @{currentUser.username} · {currentUser.role}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (3-zone contract) */}
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-emerald-100 px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Brand on mobile, breadcrumb/context on desktop */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="lg:hidden font-bold text-slate-900 truncate">
              {settings.businessName}
            </span>
            <span className="hidden lg:inline text-sm font-semibold text-slate-700 capitalize">
              {activeTab}
            </span>
          </div>

          {/* Right: Live Sync Status + Notification Bell + Mobile Logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              <span>{isOnline ? 'Online - Synced' : 'Connecting...'}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 transition-colors"
              aria-label="Open stock notifications"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono-num flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toast && (
          <div className="px-4 sm:px-6 pt-4 max-w-7xl w-full mx-auto">
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-500 hover:text-slate-800"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active View */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              users={users}
              products={products}
              attendance={attendance}
              orders={orders}
              settings={settings}
              onNavigate={setActiveTab}
              onToast={showToast}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              currentUser={currentUser}
              users={users}
              attendance={attendance}
              onToast={showToast}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              currentUser={currentUser}
              products={products}
              orders={orders}
              settings={settings}
              onToast={showToast}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              attendance={attendance}
              settings={settings}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              users={users}
              products={products}
              settings={settings}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-emerald-100 h-16 px-1"
        aria-label="Mobile Navigation"
      >
        <div
          className={`grid h-full items-center ${
            isAdmin ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        open={notificationsOpen}
        notifications={notifications}
        userRole={currentUser.role}
        onClose={() => setNotificationsOpen(false)}
        onDismiss={handleDismissNotification}
        onGoToProducts={() => setActiveTab('products')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PrimeMobilesApp />
    </ErrorBoundary>
  );
}
