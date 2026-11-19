import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Smartphone,
  User,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { AppUser } from '../types';
import {
  loginUserAccount,
  registerUserAccount,
} from '../services/firestoreService';

interface AuthScreenProps {
  businessName: string;
  isOnline: boolean;
  onAuthSuccess: (user: AppUser, successBanner?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  businessName,
  isOnline,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login fields — always start EMPTY
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields — always start EMPTY
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginUsername.trim() || !loginPassword) {
      setErrorMsg('All fields required');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUserAccount({
        username: loginUsername,
        password: loginPassword,
      });
      onAuthSuccess(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to login. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = regFullName.trim();
    const trimmedUser = regUsername.trim();
    const trimmedPhone = regPhone.trim();

    if (!trimmedName || !trimmedUser || !trimmedPhone || !regPassword) {
      setErrorMsg('All fields required');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      const createdUser = await registerUserAccount({
        fullName: trimmedName,
        username: trimmedUser,
        phoneNumber: trimmedPhone,
        password: regPassword,
      });
      onAuthSuccess(createdUser, 'Account Created Successfully');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to create account. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FAF7] flex flex-col justify-between">
      {/* Top minimal bar */}
      <header className="w-full border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight whitespace-nowrap">
              {businessName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span>{isOnline ? 'Online - Synced' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {/* Main split workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left brand panel */}
          <div className="lg:col-span-5 bg-emerald-900 text-white rounded-3xl p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-200 tracking-wide">
                Wholesale Bazaar Operations
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance">
                {businessName} Staff &amp; Stock Portal
              </h1>
              <p className="mt-4 text-sm text-emerald-100/90 leading-relaxed">
                Real-time cloud workspace for wholesale staff attendance, live
                product inventory, low-stock alerts, and order deliveries.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-800/80 space-y-3 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <span>
                  First registered account becomes <strong className="text-white">Admin</strong> automatically. Additional team members join as <strong className="text-white">Staff</strong>.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <span>
                  Instant live sync across mobile and desktop via Firebase Firestore.
                </span>
              </div>
            </div>
          </div>

          {/* Right auth card */}
          <div className="lg:col-span-7 bg-white border border-emerald-100 rounded-3xl p-6 sm:p-9 shadow-xs flex flex-col justify-center">
            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-emerald-50/80 border border-emerald-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Sign in to your account
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter your registered username and password.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="off"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Ex: primemobiles"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="off"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-semibold px-4 py-3 transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Login to Dashboard
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create Staff / Admin Account
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Account details are saved directly to Firebase Firestore.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-fullname"
                      type="text"
                      autoComplete="off"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Ex: Prime Mobiles"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-username"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Username (Unique)
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      autoComplete="off"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Ex: primemobiles"
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-phone"
                        type="tel"
                        autoComplete="off"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="Ex: +94 77 123 4567"
                        className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password (minimum 4 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-semibold px-4 py-3 transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
