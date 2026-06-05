import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Header({ onLogout }: { onLogout: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white shrink-0 relative z-40 shadow-[0_4px_0_0_#000]">
      <div className="text-xl text-zinc-900 select-none flex items-center tracking-tight gap-2.5">
        <Shield size={20} className="text-black" strokeWidth={2.5} fill="transparent" />
        <span><span className="font-black text-black">H</span><span className="font-bold tracking-tighter">ansson</span><span className="font-black text-black">H</span><span className="font-bold tracking-tighter">ub</span></span>
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden border border-black flex justify-center items-center focus:outline-none transition-all hover:bg-zinc-300"
        >
          <User size={16} className="text-zinc-800" />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
             <motion.div
               initial={{ opacity: 0, y: -5, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -5, scale: 0.95 }}
               transition={{ duration: 0.15 }}
               className="absolute top-12 right-0 w-40 bg-zinc-900 shadow-2xl border border-zinc-800 z-50 rounded-xl overflow-hidden"
             >
               <button 
                 onClick={() => {
                   setDropdownOpen(false);
                   onLogout();
                 }}
                 className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-400 hover:bg-zinc-800 uppercase tracking-widest transition-colors flex items-center gap-3"
               >
                 <LogOut size={16} /> LOGOUT
               </button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
