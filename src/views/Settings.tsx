import React, { useState, useEffect } from 'react';
import { Fingerprint, Shield, Settings as SettingsIcon, KeyRound, Lock, X, LoaderCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isBiometricAvailable, authenticateBiometric, saveBiometricStoredToken, getBiometricStoredToken } from '../utils/biometrics';
import { getToken, changePassword, changeAuthCode, getUserDetails } from '../utils/api';
import ConfirmAuthModal from '../components/ConfirmAuthModal';

export default function Settings() {
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

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
    isBiometricAvailable().then(avail => setBioAvailable(avail));
    setBioEnabled(!!getBiometricStoredToken());
    
    // Auto-fill token if available
    const existingToken = getToken();
    if (existingToken) {
      setPToken(existingToken);
      setAToken(existingToken);
    }
  }, []);

  const handleToggleBio = async () => {
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (pNewPass !== pConfPass) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setPendingAction('password');
    setShowConfirmModal(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
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
        await changePassword({
          id: userId,
          userName: userName,
          password: "",
          newPassword: pNewPass,
          tokenCode: pToken,
          authorizationCode: pAuthCode
        });
        setSuccessMsg('Password updated successfully');
        setTimeout(() => setShowPassModal(false), 2000);
      } else if (pendingAction === 'authCode') {
        await changeAuthCode({
          id: userId,
          userName: userName,
          password: aPass,
          tokenCode: aToken,
          newAuthorizationCode: aNewAuth
        });
        setSuccessMsg('Authorization code updated successfully');
        setTimeout(() => setShowAuthModal(false), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-24 overflow-y-auto">
      <div className="p-5 flex flex-col gap-6 shrink-0 z-10 bg-slate-50">
        <div className="flex flex-col gap-1 mb-2">
          <h3 className="text-3xl font-black text-slate-800 flex items-center gap-2">
            <SettingsIcon size={28} className="text-blue-600" /> Settings
          </h3>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Manage your app preferences</p>
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
      </div>

      <AnimatePresence>
        {/* Pass Modal */}
        {showPassModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative"
            >
              <button onClick={() => setShowPassModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-rose-100"><Lock size={20} className="text-rose-600" /></div>
                <h2 className="text-lg font-black text-slate-900">Change Password</h2>
              </div>

              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle size={48} className="text-emerald-500 mb-4" />
                  <p className="font-bold text-emerald-600 text-center">{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Token</label>
                    <input type="text" required value={pToken} onChange={e => setPToken(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Session Token" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Authorization Code</label>
                    <input type="password" required maxLength={6} value={pAuthCode} onChange={e => setPAuthCode(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Current 6-digit Code" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">New Password</label>
                    <input type="password" required value={pNewPass} onChange={e => setPNewPass(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter new password" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Confirm Password</label>
                    <input type="password" required value={pConfPass} onChange={e => setPConfPass(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Confirm new password" />
                  </div>
                  
                  {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
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
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-indigo-100"><KeyRound size={20} className="text-indigo-600" /></div>
                <h2 className="text-lg font-black text-slate-900">Change Auth Code</h2>
              </div>

              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle size={48} className="text-emerald-500 mb-4" />
                  <p className="font-bold text-emerald-600 text-center">{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Token</label>
                    <input type="text" required value={aToken} onChange={e => setAToken(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Session Token" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Password</label>
                    <input type="password" required value={aPass} onChange={e => setAPass(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Current Account Password" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">New Auth Code</label>
                    <input type="password" required maxLength={6} value={aNewAuth} onChange={e => setANewAuth(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter new 6-digit code" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 ml-1">Confirm Auth Code</label>
                    <input type="password" required maxLength={6} value={aConfAuth} onChange={e => setAConfAuth(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Confirm new 6-digit code" />
                  </div>
                  
                  {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
                  
                  <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
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
