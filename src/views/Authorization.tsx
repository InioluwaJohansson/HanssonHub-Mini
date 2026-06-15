import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LoaderCircle, KeyRound, Delete, CheckCircle } from 'lucide-react';
import { verifyAuthCode } from '../utils/api';

export default function Authorization({ onSuccess, onFailMax }: { onSuccess: () => void, onFailMax: () => void }) {
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userDetailsStr = localStorage.getItem('user_details');
    if (userDetailsStr) {
      try {
        const userDetails = JSON.parse(userDetailsStr);
        setUserName(userDetails.userName || userDetails.UserName || 'User');
      } catch (e) {
        setUserName('User');
      }
    }
  }, []);

  const MAX_ATTEMPTS = 3;

  const handleKeypad = async (key: string) => {
    if (authLoading || success) return;
    if (key === 'backspace') {
      setAuthCode(prev => prev.slice(0, -1));
      setAuthError('');
    } else {
      if (authCode.length < 6) {
        const newCode = authCode + key;
        setAuthCode(newCode);
        if (newCode.length === 6) {
          setAuthLoading(true);
          setAuthError('');
          try {
            const res = await verifyAuthCode(newCode);
            const isVerified = typeof res === 'boolean' ? res : res?.status === true;
            
            if (isVerified) {
              setSuccess(true);
              setTimeout(() => onSuccess(), 1000);
            } else {
              setAuthError(typeof res === 'object' && res !== null && 'message' in res ? (res as any).message : 'Invalid authorization code');
              setAuthCode('');
              const newAttempts = attempts + 1;
              setAttempts(newAttempts);
              if (newAttempts >= MAX_ATTEMPTS) {
                setTimeout(() => onFailMax(), 1000);
              }
            }
          } catch (e) {
            setAuthError('Verification failed (Network/System Error)');
            setAuthCode('');
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
              setTimeout(() => onFailMax(), 1000);
            }
          } finally {
            setAuthLoading(false);
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden items-center px-6 pt-5 pb-5">
      <div className={`w-full h-full max-w-sm flex flex-col items-center`}>
        {/* Top Header - Icon at 20px from top already managed by pt-5 on parent */}
        <div className="flex flex-col items-center w-full">
          <div className={`flex items-center justify-center p-4 rounded-full mb-2 transition-colors ${success ? 'bg-emerald-100 text-emerald-600' : authError ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-900'}`}>
            {success ? <CheckCircle size={32} /> : <KeyRound size={32} />}
          </div>
          
          <h2 className="text-2xl font-black text-zinc-900 mb-2 whitespace-pre-wrap text-center">
            {`Welcome back,\n${userName}`}
          </h2>
          
          <p className="text-zinc-500 text-sm mb-4 text-center leading-relaxed">
            Please enter the 6-digit authorization code to access your dashboard.
          </p>
          <div className="h-6 flex items-center justify-center mb-2">
             {success ? (
               <p className="text-emerald-600 text-sm font-bold tracking-wide flex items-center gap-1">
                 <CheckCircle size={16} /> Verified successfully!
               </p>
             ) : authError ? (
               <p className="text-red-500 text-sm font-bold tracking-wide flex items-center gap-1">
                 <ShieldAlert size={16} /> {authError}
                 {attempts > 0 && attempts < MAX_ATTEMPTS && (
                   <span className="ml-1 opacity-80 font-medium">({MAX_ATTEMPTS - attempts} left)</span>
                 )}
               </p>
             ) : authLoading ? (
               <p className="text-zinc-500 text-sm font-bold italic flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin" /> Verifying...
               </p>
             ) : attempts > 0 ? (
               <p className="text-zinc-500 text-sm font-medium tracking-wide">
                 {MAX_ATTEMPTS - attempts} attempts remaining
               </p>
             ) : null}
          </div>
        </div>

        <div className="flex-1 w-full relative"></div>

        {/* Input & Keypad grouped at the bottom */}
        <div className="flex flex-col items-center w-full">
          <div className="flex gap-2 mb-[10px] -mt-[10px]">
            {[...Array(6)].map((_, index) => (
              <div 
                key={index} 
                className={`w-12 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-black transition-colors
                  ${success ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                    authCode.length === index ? 'border-zinc-900 bg-zinc-50' : 
                    authCode.length > index ? 'border-zinc-300 text-zinc-900' : 'border-zinc-100 text-zinc-300'}
                  ${authError ? 'border-red-500 text-red-600 bg-red-50' : ''}`}
              >
                {authCode[index] ? '•' : ''}
              </div>
            ))}
          </div>
          
          {/* Keypad with 10px top margin */}
          <div className="grid grid-cols-3 gap-3 w-full px-4 max-w-[280px] mx-auto mt-[10px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => handleKeypad(num.toString())} 
                className="h-16 w-16 mx-auto rounded-full border border-black bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center text-2xl font-bold transition-colors disabled:opacity-50"
                disabled={authLoading || success}
              >
                {num}
              </button>
            ))}
            <div className="h-16 w-16 mx-auto"></div>
            <button 
              onClick={() => handleKeypad('0')} 
              className="h-16 w-16 mx-auto rounded-full border border-black bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center text-2xl font-bold transition-colors disabled:opacity-50"
              disabled={authLoading || success}
            >
              0
            </button>
            <button 
              onClick={() => handleKeypad('backspace')} 
              className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors disabled:opacity-50"
              disabled={authLoading || success}
            >
              <Delete size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
