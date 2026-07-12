import { useState } from 'react';
import { DoorOpen, DoorClosed, Lock, Unlock, Search, LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { lockDoor, unlockDoor } from '../utils/api';
import { useData } from '../context/DataContext';

export default function Doors() {
  const { doors, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const toggleLock = async (id: string) => {
    try {
      await lockDoor(id);
    } catch (err) {
      console.error("Failed to toggle lock for door", id, err);
    }
  };

  const toggleOpen = async (id: string) => {
    try {
      await unlockDoor(id);
    } catch (err) {
      console.error("Failed to toggle open/close for door", id, err);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex flex-col gap-3 min-h-[400px] justify-center items-center">
        <LoaderCircle size={36} className="animate-spin text-amber-500" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Loading Doors...</p>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex flex-col gap-1 mb-3">
        <h3 className="text-3xl font-black text-zinc-900 flex items-center gap-2"><DoorClosed size={32} className="text-amber-500" /> Doors</h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">Manage secure access points</p>
      </div>
      
      <div className="relative mb-2">
        <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search doors by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b-2 border-zinc-200 focus:border-black rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-4">
        {doors.length > 0 ? (
          doors.filter(door => door.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(door => (
            <div key={door.id} className="border border-zinc-200 p-5 flex flex-col gap-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-black text-zinc-900 text-base">{door.name}</p>
                  <p className="text-xs text-zinc-400 font-bold tracking-tight mt-0.5">Type: {door.type || `Type ${door.doorType ?? '3'}`}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest inline-block px-2 py-1 mt-2.5 rounded-md ${
                    door.isLocked 
                      ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                      : door.isOpen 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {door.isLocked ? 'Locked' : door.isOpen ? 'Open' : 'Closed'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => toggleLock(door.id)}
                    className="p-1.5 flex items-center justify-center transition-all duration-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800"
                    title={door.isLocked ? "Unlock Door" : "Lock Door"}
                  >
                    {door.isLocked ? <Unlock size={18} className="text-zinc-400" /> : <Lock size={18} className="text-red-500" />}
                  </button>

                  <button 
                    onClick={() => toggleOpen(door.id)}
                    disabled={door.isLocked}
                    className={`p-1.5 flex items-center justify-center transition-all duration-200 rounded-lg ${
                      door.isLocked 
                        ? 'text-zinc-200 dark:text-zinc-700 cursor-not-allowed opacity-40' 
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={door.isOpen ? "Close Door" : "Open Door"}
                  >
                    {door.isOpen ? <DoorOpen size={18} className="text-emerald-500" /> : <DoorClosed size={18} className="text-zinc-400" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200 gap-4">
             <div className="p-4 bg-white rounded-full shadow-sm border border-zinc-100">
                <DoorClosed size={48} className="text-zinc-300" />
             </div>
             <div className="text-center">
                <p className="text-zinc-900 font-bold">No doors to view yet</p>
                <p className="text-zinc-500 text-xs mt-1">There are no active door sensors registered.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
