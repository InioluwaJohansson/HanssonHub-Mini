import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, User, Lock, LogIn, Shield } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleLogin = () => {
    setIsSubmitted(true);
    if (username && password) {
      onLogin();
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
            <div className="relative w-full flex items-center group">
              <User size={18} className={`absolute left-0 transition-colors ${isSubmitted && !username ? 'text-red-500' : 'text-zinc-400 group-focus-within:text-black'}`} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full py-2 pl-8 bg-transparent border-b-2 focus:outline-none placeholder-zinc-400 text-black rounded-none peer ${isSubmitted && !username ? 'border-red-500' : 'border-zinc-200'}`}
              />
              <div className={`absolute bottom-0 left-0 h-[2px] w-0 peer-focus:w-full transition-all duration-300 ${isSubmitted && !username ? 'bg-red-500' : 'bg-black'}`}></div>
            </div>

            {/* Password Input */}
            <div className="relative flex items-center w-full group">
              <Lock size={18} className={`absolute left-0 transition-colors ${isSubmitted && !password ? 'text-red-500' : 'text-zinc-400 group-focus-within:text-black'}`} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2 pl-8 pr-8 bg-transparent border-b-2 focus:outline-none placeholder-zinc-400 text-black rounded-none peer ${isSubmitted && !password ? 'border-red-500' : 'border-zinc-200'}`}
              />
              <div 
                className="absolute right-0 cursor-pointer text-zinc-400 hover:text-black z-10 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
              <div className={`absolute bottom-0 left-0 h-[2px] w-0 peer-focus:w-full transition-all duration-300 ${isSubmitted && !password ? 'bg-red-500' : 'bg-black'}`}></div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 bg-transparent text-black py-3 font-bold text-sm tracking-widest mt-4 border-2 border-black rounded-md"
            >
              <LogIn size={18} strokeWidth={2.5} />
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
