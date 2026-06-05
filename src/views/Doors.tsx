import { useState } from 'react';
import { DoorOpen, DoorClosed, Lock, Unlock } from 'lucide-react';
import { motion } from 'motion/react';

type DoorData = {
  id: string;
  name: string;
  isLocked: boolean;
  isOpen: boolean;
};

const initialDoors: DoorData[] = [
  { id: '1', name: 'Front Entrance', isLocked: true, isOpen: false },
  { id: '2', name: 'Backyard Gate', isLocked: true, isOpen: false },
  { id: '3', name: 'Garage Door', isLocked: false, isOpen: true },
];

export default function Doors() {
  const [doors, setDoors] = useState<DoorData[]>(initialDoors);

  const toggleLock = (id: string) => {
    setDoors(doors.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
  };

  const toggleOpen = (id: string) => {
    setDoors(doors.map(d => d.id === id ? { ...d, isOpen: !d.isOpen } : d));
  };

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex flex-col gap-1 mb-3">
        <h3 className="text-3xl font-black text-zinc-900 flex items-center gap-2"><DoorClosed size={32} className="text-amber-500" /> Doors</h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">Manage secure access points</p>
      </div>
      
      <div className="flex flex-col gap-4">
        {doors.map(door => (
          <div key={door.id} className={`border p-5 flex flex-col gap-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${door.isLocked && !door.isOpen ? 'border-amber-100' : 'border-red-200'}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${door.isLocked && !door.isOpen ? 'bg-amber-400' : 'bg-red-500'}`}></div>
            <div className="flex justify-between items-center pl-2">
              <div>
                <p className="font-black text-zinc-900 text-base">{door.name}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest inline-block px-2 py-1 mt-1.5 rounded-md ${door.isLocked ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {door.isLocked ? 'Locked' : 'Unlocked'} & {door.isOpen ? 'Open' : 'Closed'}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleLock(door.id)}
                  className={`p-3 flex items-center justify-center transition-all duration-200 rounded-xl border ${door.isLocked ? 'border-amber-500 text-amber-600 bg-transparent' : 'border-red-500 text-red-600 bg-transparent'}`}
                >
                  {door.isLocked ? <Lock size={22} /> : <Unlock size={22} />}
                </button>

                <button 
                  onClick={() => toggleOpen(door.id)}
                  className={`p-3 flex items-center justify-center transition-all duration-200 rounded-xl border ${door.isOpen ? 'border-zinc-300 text-zinc-600 bg-transparent' : 'border-emerald-500 text-emerald-600 bg-transparent'}`}
                >
                  {door.isOpen ? <DoorOpen size={22} /> : <DoorClosed size={22} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
