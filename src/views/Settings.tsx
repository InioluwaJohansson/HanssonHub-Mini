import React, { useState, useEffect } from 'react';
import { Fingerprint, Shield, Settings as SettingsIcon, KeyRound, Lock, X, LoaderCircle, CheckCircle, Moon, Sun, Globe, Check, Bell, ChevronLeft, Palette, Copy, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isBiometricAvailable, authenticateBiometric, saveBiometricStoredToken, getBiometricStoredToken } from '../utils/biometrics';
import { getToken, changePassword, changeAuthCode, getUserDetails, getBaseUrl, saveBaseUrl, api } from '../utils/api';
import { rebuildHubConnections } from '../utils/signalr';
import ConfirmAuthModal from '../components/ConfirmAuthModal';
import { triggerHaptic } from '../utils/haptics';

export default function Settings({ onBack }: { onBack?: () => void, key?: string | React.Key }) {
  const userDetails = getUserDetails();
  const isOwner = String(userDetails?.RoleName || userDetails?.roleName || userDetails?.role || userDetails?.Role || '').toLowerCase() === 'owner';

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [darkEnabled, setDarkEnabled] = useState(() => {
    return localStorage.getItem('app_theme') === 'dark';
  });
  const [syncWithOs, setSyncWithOs] = useState(() => {
    return localStorage.getItem('app_theme_sync') === 'true';
  });

  const [apiUrl, setApiUrl] = useState(() => getBaseUrl());
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [generatedTokenString, setGeneratedTokenString] = useState<string | null>(null);
  const [tokenExpiryTime, setTokenExpiryTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!tokenExpiryTime) {
      setTimeLeft('');
      return;
    }
    const expiryDate = new Date(tokenExpiryTime).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryDate - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenExpiryTime]);

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const response = await api.post('/User/GenerateToken', '', {
        headers: {
          'accept': '*/*'
        }
      });
      
      let tokenCode = typeof response.data === 'string' ? response.data : String(response.data);
      let expiry = '';
      
      if (response.data && typeof response.data === 'object') {
        const data = response.data.Data || response.data.data || response.data.Result || response.data.result || response.data;
        if (data.TokenCode || data.tokenCode) {
          tokenCode = data.TokenCode || data.tokenCode;
          expiry = data.ExpiryTime || data.expiryTime || '';
        }
      }
      
      setGeneratedTokenString(tokenCode);
      setTokenExpiryTime(expiry);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyToken = async () => {
    if (generatedTokenString) {
      await navigator.clipboard.writeText(generatedTokenString);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 3000);
    }
  };

  const themeColors = [
    { name: 'Crimson', hex: '#E6194B' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Coral', hex: '#F97316' },
    { name: 'Orange', hex: '#FF8C00' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'Lime', hex: '#84CC16' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Sea Green', hex: '#2E8B57' },
    { name: 'Teal', hex: '#14B8A6' },
    { name: 'Cyan', hex: '#06B6D4' },
    { name: 'Sky', hex: '#0EA5E9' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Royal Blue', hex: '#1D4ED8' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Purple', hex: '#A855F7' },
    { name: 'Fuchsia', hex: '#D946EF' },
    { name: 'Orchid', hex: '#DA70D6' },
    { name: 'Plum', hex: '#DDA0DD' },
    { name: 'Pink', hex: '#EC4899' },
    { name: 'Rose', hex: '#F43F5E' }
  ];

  const [selectedThemeColor, setSelectedThemeColor] = useState(() => {
    return localStorage.getItem('chat_theme_color') || '#00A884';
  });

  const handleSelectThemeColor = (color: string) => {
    setSelectedThemeColor(color);
    localStorage.setItem('chat_theme_color', color);
    window.dispatchEvent(new Event('storage'));
  };

  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('alerts_enabled') !== 'false');
  const [soundsEnabled, setSoundsEnabled] = useState(() => localStorage.getItem('sounds_enabled') !== 'false');

  const handleToggleDarkTheme = () => {
    const nextTheme = !darkEnabled ? 'dark' : 'light';
    setDarkEnabled(!darkEnabled);
    localStorage.setItem('app_theme', nextTheme);
    // Disable OS sync if user manually overrides theme
    if (syncWithOs) {
      setSyncWithOs(false);
      localStorage.setItem('app_theme_sync', 'false');
      window.dispatchEvent(new Event('theme_sync_changed'));
    }
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleToggleSyncWithOs = () => {
    const nextSync = !syncWithOs;
    setSyncWithOs(nextSync);
    localStorage.setItem('app_theme_sync', String(nextSync));
    
    if (nextSync) {
      const isOsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkEnabled(isOsDark);
      localStorage.setItem('app_theme', isOsDark ? 'dark' : 'light');
      if (isOsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    window.dispatchEvent(new Event('theme_sync_changed'));
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem('alerts_enabled', String(next));
  };

  const toggleSounds = () => {
    const next = !soundsEnabled;
    setSoundsEnabled(next);
    localStorage.setItem('sounds_enabled', String(next));
  };

  // Modals
  const [showPassModal, setShowPassModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'password' | 'authCode' | null>(null);

  // Password Form
  const [pToken, setPToken] = useState('');
  const [pAuthCode, setPAuthCode] = useState('');
  const [pNewPass, setPNewPass] = useState('');
  const [pConfPass, setPConfPass] = useState('');
  
  // Auth Form
  const [aToken, setAToken] = useState('');
  const [aPass, setAPass] = useState('');
  const [aNewAuth, setANewAuth] = useState('');
  const [aConfAuth, setAConfAuth] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    isBiometricAvailable().then(avail => setBioAvailable(true));
    setBioEnabled(!!getBiometricStoredToken());
  }, []);

  const handleToggleBio = async () => {
    triggerHaptic('heavy');
    if (bioEnabled) {
      saveBiometricStoredToken('');
      setBioEnabled(false);
    } else {
      const success = await authenticateBiometric();
      if (success) {
        const token = getToken();
        if (token) {
          saveBiometricStoredToken(token);
          setBioEnabled(true);
        }
      }
    }
  };

  const [pAttempted, setPAttempted] = useState(false);
  const [aAttempted, setAAttempted] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPAttempted(true);
    setErrorMsg('');
    if (!pToken || !pAuthCode || !pNewPass || !pConfPass) {
        return;
    }
    if (pNewPass !== pConfPass) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setPendingAction('password');
    setShowConfirmModal(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAAttempted(true);
    setErrorMsg('');
    if (!aToken || !aPass || !aNewAuth || !aConfAuth) {
        return;
    }
    if (aNewAuth !== aConfAuth) {
      setErrorMsg('Authorization codes do not match');
      return;
    }
    setPendingAction('authCode');
    setShowConfirmModal(true);
  };

  const executePendingAction = async (confirmedAuthCode: string) => {
    setShowConfirmModal(false);
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const userDetails = getUserDetails();
    const userId = userDetails?.id || userDetails?.Id || 0;
    const userName = userDetails?.userName || userDetails?.UserName || 'string';

    try {
      if (pendingAction === 'password') {
        const res = await changePassword({
          id: userId,
          userName: userName,
          password: "",
          newPassword: pNewPass,
          tokenCode: pToken,
          authorizationCode: pAuthCode
        });
        if (res && res.status === true) {
            setSuccessMsg(res.message || 'Password updated successfully');
            setTimeout(() => setShowPassModal(false), 2000);
        } else {
            setErrorMsg(res?.message || 'Action failed. Please try again.');
        }
      } else if (pendingAction === 'authCode') {
        const res = await changeAuthCode({
          id: userId,
          userName: userName,
          password: aPass,
          tokenCode: aToken,
          newAuthorizationCode: aNewAuth
        });
        if (res && res.status === true) {
            setSuccessMsg(res.message || 'Authorization code updated successfully');
            setTimeout(() => setShowAuthModal(false), 2000);
        } else {
            setErrorMsg(res?.message || 'Action failed. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-6 overflow-y-auto">
      <div className="p-5 flex flex-col gap-6 shrink-0 z-10 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <SettingsIcon size={28} className="text-blue-600" /> Settings
            </h3>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Manage your app preferences</p>
          </div>
          {onBack && (
            <button onClick={onBack} className="p-3 rounded-full hover:bg-slate-200 text-slate-600 transition-colors" title="Go Back">
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        
        {/* Notifications Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
              <Bell size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Notification Management</p>
              <p className="text-xs text-slate-500">Enable alerts for all security events</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-1 px-1">
            <span className="text-xs font-bold text-slate-700">Push Notifications</span>
            <button 
              onClick={toggleNotifications}
              className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 px-1">
            <span className="text-xs font-bold text-slate-700">Sound Effects</span>
            <button 
              onClick={toggleSounds}
              className={`w-12 h-6 rounded-full transition-colors relative ${soundsEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${soundsEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Dark Theme Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full transition-colors ${darkEnabled ? 'bg-slate-800' : 'bg-slate-100'}`}>
                {darkEnabled ? (
                  <Moon size={24} className="text-amber-400" />
                ) : (
                  <Sun size={24} className="text-amber-500" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Dark Theme</p>
                <p className="text-xs text-slate-500">Switch between dark and light themes</p>
              </div>
            </div>
            <div>
              <button 
                onClick={handleToggleDarkTheme}
                className={`w-12 h-6 rounded-full transition-colors relative ${darkEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full transition-colors ${syncWithOs ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <Globe size={24} className={syncWithOs ? "text-indigo-600" : "text-slate-400"} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Sync with OS Theme</p>
                <p className="text-xs text-slate-500">Automatically match system appearance</p>
              </div>
            </div>
            <div>
              <button 
                onClick={handleToggleSyncWithOs}
                className={`w-12 h-6 rounded-full transition-colors relative ${syncWithOs ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${syncWithOs ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full transition-colors ${bioEnabled ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Fingerprint size={24} className={bioEnabled ? 'text-blue-600' : 'text-slate-400'} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Fingerprint Login</p>
              <p className="text-xs text-slate-500">Use biometric auth to login quickly</p>
            </div>
          </div>
          <div>
            <button 
              disabled={!bioAvailable}
              onClick={handleToggleBio}
              className={`w-12 h-6 rounded-full transition-colors relative ${bioEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${bioEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Change Auth Code Card */}
        <button 
          onClick={() => { setShowAuthModal(true); setErrorMsg(''); setSuccessMsg(''); }}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-100">
              <KeyRound size={24} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm">Change Auth Code</p>
              <p className="text-xs text-slate-500">Update your 6-digit PIN code</p>
            </div>
          </div>
        </button>

        {/* Change Password Card */}
        <button 
          onClick={() => { setShowPassModal(true); setErrorMsg(''); setSuccessMsg(''); }}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-rose-100">
              <Lock size={24} className="text-rose-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm">Change Password</p>
              <p className="text-xs text-slate-500">Update your account password</p>
            </div>
          </div>
        </button>

        {/* Chat Theme Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <Palette size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Chat Bubble Theme</p>
              <p className="text-xs text-slate-500">Select a color theme for your chat accents and send buttons</p>
            </div>
          </div>
          
          {/* Bubble Preview */}
          <div className="bg-slate-150 dark:bg-zinc-900 p-4 rounded-xl flex flex-col gap-2 border border-slate-200/50">
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 p-2.5 rounded-lg rounded-tl-none max-w-[80%] text-xs font-medium shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                Hey! Which color theme do you prefer?
              </div>
            </div>
            <div className="flex justify-end">
              <div 
                style={{ backgroundColor: selectedThemeColor }}
                className="text-white p-2.5 rounded-lg rounded-tr-none max-w-[80%] text-xs font-semibold shadow-sm transition-all duration-300"
              >
                I really love this custom accent color! 😍
              </div>
            </div>
          </div>

          {/* Color Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 mt-1">
            {themeColors.map((color) => {
              const isSelected = selectedThemeColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.name}
                  onClick={() => handleSelectThemeColor(color.hex)}
                  style={{ backgroundColor: color.hex }}
                  className={`w-9 h-9 rounded-full relative transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer border-2 ${
                    isSelected ? 'border-slate-800 dark:border-white ring-2 ring-indigo-500/50 scale-105 shadow-md' : 'border-transparent shadow-sm'
                  }`}
                  title={color.name}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-bold text-sm">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Token Card for Owners */}
        {isOwner && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col gap-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <KeyRound size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Generate Token</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Create a new access token</p>
              </div>
            </div>
            
            {generatedTokenString && (
              <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-mono text-slate-600 dark:text-zinc-300 break-all overflow-hidden line-clamp-2">
                    {generatedTokenString}
                  </p>
                  <button 
                    onClick={handleCopyToken}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors shrink-0"
                  >
                    {tokenCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
                {timeLeft && (
                  <div className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md w-fit">
                    <Clock size={12} />
                    <span>Expires in: {timeLeft}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className={`w-full font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all ${
                generatingToken
                  ? 'bg-slate-100 dark:bg-zinc-700 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-[0.98]'
              }`}
            >
              {generatingToken ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  {generatedTokenString ? 'Generate New Token' : 'Generate Token'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Password Modal */}
        {showPassModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative"
            >
              <button onClick={() => setShowPassModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/60"><Lock size={20} className="text-rose-600 dark:text-rose-400" /></div>
                <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">Change Password</h2>
              </div>

              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle size={48} className="text-emerald-500 mb-4" />
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-center">{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Token</label>
                    <input type="text" value={pToken} onChange={e => setPToken(e.target.value)} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${pAttempted && !pToken ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Session Token" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Authorization Code</label>
                    <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pAuthCode} onChange={e => setPAuthCode(e.target.value.replace(/\D/g, ''))} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${pAttempted && !pAuthCode ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Current 6-digit Code" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">New Password</label>
                    <input type="password" value={pNewPass} onChange={e => setPNewPass(e.target.value)} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${pAttempted && !pNewPass ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Enter new password" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Confirm Password</label>
                    <input type="password" value={pConfPass} onChange={e => setPConfPass(e.target.value)} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${pAttempted && !pConfPass ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Confirm new password" />
                  </div>
                  
                  {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
                    {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Submit'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* Auth Code Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-950/60"><KeyRound size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
                <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">Change Authorization Code</h2>
              </div>

              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle size={48} className="text-emerald-500 mb-4" />
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-center">{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} noValidate className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Token</label>
                    <input type="text" value={aToken} onChange={e => setAToken(e.target.value)} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${aAttempted && !aToken ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Session Token" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Password</label>
                    <input type="password" value={aPass} onChange={e => setAPass(e.target.value)} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${aAttempted && !aPass ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Current Account Password" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">New Authorization Code</label>
                    <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={aNewAuth} onChange={e => setANewAuth(e.target.value.replace(/\D/g, ''))} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${aAttempted && !aNewAuth ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Enter new 6-digit code" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 ml-1">Confirm Authorization Code</label>
                    <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={aConfAuth} onChange={e => setAConfAuth(e.target.value.replace(/\D/g, ''))} className={`w-full mt-1 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border ${aAttempted && !aConfAuth ? 'border-red-500' : 'border-slate-200 dark:border-zinc-700'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`} placeholder="Confirm new 6-digit code" />
                  </div>
                  
                  {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
                    {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Submit'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Auth Modal Triggered by Submit */}
      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmAuthModal 
            onSuccess={executePendingAction} 
            onCancel={() => { setShowConfirmModal(false); setPendingAction(null); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
