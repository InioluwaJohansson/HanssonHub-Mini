import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Shield, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewType } from './BottomNav';
import { getUserDetails, getImageUrl, getStoredAppNamesList } from '../utils/api';

export function Header({ onLogout, setView }: { onLogout: () => void, setView: (v: ViewType) => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = getUserDetails();
  const name = user?.fullName || user?.FullName || user?.userName || user?.UserName || 'User';
  const userId = user?.id || user?.Id;

  let image = user?.profileImageUrl || user?.ProfileImageUrl || user?.imageUrl || user?.ImageUrl;
  if (!image && userId) {
    const appNames = getStoredAppNamesList();
    if (appNames) {
      const possibleArrays = [
        appNames,
        appNames.personIdNames,
        appNames.PersonIdNames,
        appNames.personNamesId,
        appNames.PersonNamesId,
        appNames.result?.personIdNames,
        appNames.result?.PersonIdNames,
        appNames.result?.personNamesId,
        appNames.result?.PersonNamesId,
        appNames.Result?.personIdNames,
        appNames.Result?.PersonIdNames,
        appNames.Result?.personNamesId,
        appNames.Result?.PersonNamesId,
      ];
      const list = possibleArrays.find(arr => Array.isArray(arr));
      if (Array.isArray(list)) {
        const matchingPerson = list.find(ap => Number(ap.id || ap.Id) === Number(userId));
        if (matchingPerson) {
          image = matchingPerson.imageUrl || matchingPerson.ImageUrl;
        }
      }
    }
  }

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
          className="w-8 h-8 rounded-full bg-[#3b82f6] text-white overflow-hidden border border-black flex justify-center items-center focus:outline-none transition-all hover:bg-blue-600 shadow-sm"
        >
          {image ? (
            <img src={getImageUrl(image)} alt="User profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-extrabold text-sm uppercase self-center tracking-tighter">
              {name.charAt(0)}
            </span>
          )}
        </button>

        <AnimatePresence>
          {dropdownOpen && (
             <motion.div
               initial={{ opacity: 0, y: -5, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -5, scale: 0.95 }}
               transition={{ duration: 0.15 }}
               className="absolute top-12 right-0 w-44 bg-white shadow-xl border-2 border-zinc-200 z-50 rounded-xl overflow-hidden"
             >
               <button 
                 onClick={() => {
                   setDropdownOpen(false);
                   setView('settings');
                 }}
                 className="w-full text-left px-4 py-3.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 uppercase tracking-widest transition-colors flex items-center gap-3 border-b-2 border-zinc-100"
               >
                 <Settings size={16} /> SETTINGS
               </button>
               <button 
                 onClick={() => {
                   setDropdownOpen(false);
                   onLogout();
                 }}
                 className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-600 hover:bg-red-50 uppercase tracking-widest transition-colors flex items-center gap-3"
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
