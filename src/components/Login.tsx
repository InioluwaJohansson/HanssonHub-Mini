import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, User, Lock, LogIn, Shield, LoaderCircle, Fingerprint, Delete, ShieldAlert, KeyRound } from 'lucide-react';
import { loginUser, saveToken, saveUserDetails, verifyAuthCode } from '../utils/api';
import { isBiometricAvailable, registerBiometric, authenticateBiometric, getBiometricStoredToken, saveBiometricStoredToken } from '../utils/biometrics';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasStoredBiometric, setHasStoredBiometric] = useState(false);
  
  const [showAuthCodeModal, setShowAuthCodeModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    isBiometricAvailable().then(available => {
      setBiometricAvailable(available);
      if (getBiometricStoredToken()) {
        setHasStoredBiometric(true);
      }
    });
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const success = await authenticateBiometric();
      if (success) {
        const t = getBiometricStoredToken();
        if (t) {
          saveToken(t);
          setShowAuthCodeModal(true);
          return;
        } else {
          setError('No stored token found for fingerprint.');
        }
      } else {
        setError('Fingerprint verification failed.');
      }
    } catch (e) {
      setError('Fingerprint verification error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsSubmitted(true);
    setError('');
    if (username && password) {
      setIsLoading(true);
      try {
        const response = await loginUser(username, password);
        if (response.status && response.token) {
          saveToken(response.token);
          if (response.data) {
            saveUserDetails(response.data);
          }
          
          if (biometricAvailable) {
             const success = await registerBiometric(username);
             if (success) {
                saveBiometricStoredToken(response.token);
             }
          }
          
          setShowAuthCodeModal(true);
        } else {
          setError(response.message || 'Login failed');
        }
      } catch (err) {
        setError('An error occurred during login');
      } finally {
        setIsLoading(false);
      }
    }
  };

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
            if (res?.status === false) {
              setAuthError(res.message || 'Invalid code');
              setAuthCode('');
            } else {
              onLogin();
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
    <div className="flex h-full w-full flex-col bg-white justify-center px-6">
      <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
        
        <div className="bg-white border border-zinc-200 p-8 shadow-2xl rounded-xl">
          <h1 className="text-3xl tracking-tight text-zinc-800 text-center mb-8 select-none flex justify-center items-center gap-3">
            <div className="p-2 border-2 border-black rounded-xl flex-shrink-0 bg-transparent flex items-center justify-center">
               <Shield size={22} className="text-black" strokeWidth={2.5} fill="transparent" />
            </div>
            <span>
              <span className="font-black text-black">H</span><span className="font-medium tracking-tighter text-zinc-800">ansson</span><span className="font-black text-black">H</span><span className="font-medium tracking-tighter text-zinc-800">ub</span>
            </span>
          </h1>
          <h2 className="text-xl font-bold mb-6 text-zinc-800 flex items-center gap-2">
            <LogIn size={24} className="text-zinc-600" /> Sign in
          </h2>
          <div className="space-y-7">
            {/* Username Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 peer-focus:text-black">
                <User size={14} className={`${error || (isSubmitted && !username) ? 'text-red-500' : username ? 'text-emerald-500' : 'text-zinc-400'}`} />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full py-2 bg-transparent border-b-2 focus:outline-none text-black rounded-none ${error || (isSubmitted && !username) ? 'border-red-500' : username ? 'border-emerald-500' : 'border-zinc-200'}`}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 peer-focus:text-black">
                <Lock size={14} className={`${error || (isSubmitted && !password) ? 'text-red-500' : password ? 'text-emerald-500' : 'text-zinc-400'}`} />
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full py-2 pr-8 bg-transparent border-b-2 focus:outline-none text-black rounded-none ${error || (isSubmitted && !password) ? 'border-red-500' : password ? 'border-emerald-500' : 'border-zinc-200'}`}
                />
                <div 
                  className="absolute right-0 cursor-pointer text-zinc-400 hover:text-black z-10 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 bg-transparent text-black py-3 font-bold text-sm tracking-widest border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${hasStoredBiometric ? 'w-[80%]' : 'w-full'}`}
              >
                {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} strokeWidth={2.5} />}
                {isLoading ? 'SIGNING IN...' : 'Sign in'}
              </button>
              
              {hasStoredBiometric && (
                <button
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                  title="Login with Fingerprint"
                  className="w-[20%] flex items-center justify-center bg-black text-white py-3 border-2 border-black rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Fingerprint size={24} />
                </button>
              )}
            </div>
            
            {error && (
              <p className="text-red-500 text-xs text-center font-bold tracking-wide">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Auth Code Modal */}
      <AnimatePresence>
        {showAuthCodeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative border-2 ${authError ? 'border-red-400' : 'border-zinc-200'}`}
            >
              <div className="flex items-center justify-center bg-zinc-100 p-3 rounded-full mb-4">
                <KeyRound size={24} className="text-zinc-700" />
              </div>
              <h2 className="text-xl font-black text-zinc-900 mb-2">Authorization Code</h2>
              <p className="text-zinc-500 text-xs mb-6 text-center leading-relaxed">
                Please enter the 6-digit authorization code to continue setting up your session.
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
