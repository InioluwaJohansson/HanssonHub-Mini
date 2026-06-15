import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, ShieldAlert, LoaderCircle, Delete } from 'lucide-react';
import { verifyAuthCode } from '../utils/api';

export default function ConfirmAuthModal({ onSuccess, onCancel }: { onSuccess: (code: string) => void, onCancel: () => void }) {
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleKeypad = async (key: string) => {
    if (authLoading) return;
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
              onSuccess(newCode);
            } else {
              setAuthError(typeof res === 'object' && res !== null && 'message' in res ? (res as any).message : 'Invalid authorization code');
              setAuthCode('');
            }
          } catch (e) {
            setAuthError('Verification failed');
            setAuthCode('');
          } finally {
            setAuthLoading(false);
          }
        }
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative border-2 ${authError ? 'border-red-400' : 'border-zinc-200'}`}
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
          <Delete size={20} />
        </button>
        <div className="flex items-center justify-center bg-zinc-100 p-3 rounded-full mb-4">
          <KeyRound size={24} className="text-zinc-700" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 mb-2">Confirm Action</h2>
        <p className="text-zinc-500 text-xs mb-6 text-center leading-relaxed">
          Please enter your 6-digit authorization code to confirm this action.
        </p>

        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5].map(index => (
            <div 
              key={index} 
              className={`w-10 h-12 border-2 rounded-xl flex items-center justify-center text-xl font-black transition-colors
                ${authCode.length === index ? 'border-zinc-900 bg-zinc-50' : 
                  authCode.length > index ? 'border-zinc-300 text-zinc-900' : 'border-zinc-100 text-zinc-300'}
                ${authError ? 'border-red-300' : ''}`}
            >
              {authCode[index] ? '•' : ''}
            </div>
          ))}
        </div>
        
        <div className="h-4 mb-4">
           {authError ? (
             <p className="text-red-500 text-xs font-bold w-full text-center tracking-wide flex items-center justify-center gap-1">
               <ShieldAlert size={14} /> {authError}
             </p>
           ) : authLoading ? (
             <p className="text-zinc-500 text-xs font-bold italic w-full text-center flex items-center justify-center gap-1">
                <LoaderCircle size={12} className="animate-spin" /> Verifying...
             </p>
           ) : null}
        </div>
        
        <div className="grid grid-cols-3 gap-3 w-full px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => handleKeypad(num.toString())} 
              className="h-12 w-12 mx-auto rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 flex items-center justify-center text-xl font-bold transition-colors disabled:opacity-50"
              disabled={authLoading}
            >
              {num}
            </button>
          ))}
          <div className="h-12 w-12 mx-auto"></div>
          <button 
            onClick={() => handleKeypad('0')} 
            className="h-12 w-12 mx-auto rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 flex items-center justify-center text-xl font-bold transition-colors disabled:opacity-50"
            disabled={authLoading}
          >
            0
          </button>
          <button 
            onClick={() => handleKeypad('backspace')} 
            className="h-12 w-12 mx-auto sm:ml-auto rounded-full border border-transparent bg-transparent hover:bg-zinc-50 active:bg-zinc-100 flex items-center justify-center text-zinc-600 transition-colors disabled:opacity-50"
            disabled={authLoading}
          >
            <Delete size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
