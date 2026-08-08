import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, LogIn, Shield, LoaderCircle, Fingerprint } from 'lucide-react';
import { loginUser, saveToken, saveUserDetails, getAppNamesIdList, saveAppNamesList } from '../utils/api';
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
          
          // Fetch App names immediately after login
          try {
             const appNamesData = await getAppNamesIdList();
             if (appNamesData) {
               saveAppNamesList(appNamesData);
             }
          } catch(e) { console.error("Failed to fetch app names id list"); }

          onLogin();
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
        const status = response?.status ?? response?.Status;
        const token = response?.token ?? response?.Token;
        if (status && token) {
          saveToken(token);
          const userDetails = response?.data ?? response?.Data;
          if (userDetails) {
            const userImg = response?.imageUrl ?? response?.ImageUrl;
            if (userImg) {
              userDetails.imageUrl = userImg;
              userDetails.ImageUrl = userImg;
              userDetails.profileImageUrl = userImg;
              userDetails.ProfileImageUrl = userImg;
            }
            saveUserDetails(userDetails);
          }
          
          if (biometricAvailable) {
             const success = await registerBiometric(username);
             if (success) {
                saveBiometricStoredToken(token);
             }
          }
          
          // Fetch App names immediately after login
          try {
             const appNamesData = await getAppNamesIdList();
             if (appNamesData) {
               saveAppNamesList(appNamesData);
             }
          } catch(e) { console.error("Failed to fetch app names id list"); }
          
          onLogin();
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

  return (
    <div className="flex h-full w-full flex-col bg-zinc-50 dark:bg-zinc-950 justify-center px-6">
      <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl rounded-xl">
          <h1 className="text-3xl tracking-tight text-zinc-900 dark:text-zinc-100 text-center mb-8 select-none flex justify-center items-center gap-3">
            <div className="p-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-xl flex-shrink-0 bg-transparent flex items-center justify-center">
               <Shield size={22} className="text-zinc-900 dark:text-zinc-100" strokeWidth={2.5} fill="transparent" />
            </div>
            <span>
              <span className="font-black text-zinc-900 dark:text-white">H</span><span className="font-medium tracking-tighter text-zinc-800 dark:text-zinc-300">ansson</span><span className="font-black text-zinc-900 dark:text-white">H</span><span className="font-medium tracking-tighter text-zinc-800 dark:text-zinc-300">ub</span>
            </span>
          </h1>
          <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <LogIn size={24} className="text-zinc-500 dark:text-zinc-400" /> Sign in
          </h2>
          <div className="space-y-7">
            {/* Username Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 peer-focus:text-black dark:peer-focus:text-white">
                <User size={14} className={`${error || (isSubmitted && !username) ? 'text-red-500' : username ? 'text-emerald-500' : 'text-zinc-400'}`} />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full py-2 bg-transparent border-b-2 focus:outline-none text-zinc-900 dark:text-zinc-100 rounded-none ${error || (isSubmitted && !username) ? 'border-red-500' : username ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'}`}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 peer-focus:text-black dark:peer-focus:text-white">
                <Lock size={14} className={`${error || (isSubmitted && !password) ? 'text-red-500' : password ? 'text-emerald-500' : 'text-zinc-400'}`} />
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full py-2 pr-8 bg-transparent border-b-2 focus:outline-none text-zinc-900 dark:text-zinc-100 rounded-none ${error || (isSubmitted && !password) ? 'border-red-500' : password ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'}`}
                />
                <div 
                  className="absolute right-0 cursor-pointer text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 z-10 transition-colors"
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
                className={`flex items-center justify-center gap-2 bg-transparent text-zinc-900 dark:text-zinc-100 py-3 font-bold text-sm tracking-widest border-2 border-zinc-900 dark:border-zinc-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${hasStoredBiometric ? 'w-[80%]' : 'w-full'}`}
              >
                {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} strokeWidth={2.5} />}
                {isLoading ? 'SIGNING IN...' : 'Sign in'}
              </button>
              
              {hasStoredBiometric && (
                <button
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                  title="Login with Fingerprint"
                  className="w-[20%] flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 py-3 border-2 border-zinc-900 dark:border-zinc-100 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
