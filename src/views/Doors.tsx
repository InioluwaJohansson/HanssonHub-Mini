import { useState, useEffect } from 'react';
import { DoorOpen, DoorClosed, Lock, Unlock, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { getAllDoorsByDoorType } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';

type DoorData = {
  id: string;
  name: string;
  isLocked: boolean;
  isOpen: boolean;
};

export default function Doors() {
  const [doors, setDoors] = useState<DoorData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDoors = async () => {
      try {
        const response = await getAllDoorsByDoorType(3);
        if (response.status && response.data) {
          const mappedDoors = response.data.map((d: any, index: number) => ({
            id: String(d.id ?? d.Id ?? index),
            name: d.name ?? d.Name ?? `Door ${d.id ?? d.Id ?? index}`,
            isLocked: d.isLocked ?? true,
            isOpen: d.isOpen ?? false
          }));
          setDoors(mappedDoors);
        }
      } catch (err) {
        console.error("Failed to fetch doors", err);
      }
    };
    fetchDoors();

    const handleDoorCreated = (data: any) => {
       setDoors(prev => {
          const newDoor = { 
             id: String(data.id ?? data.Id), 
             name: data.doorName ?? data.DoorName, 
             isLocked: data.isLocked ?? data.IsLocked, 
             isOpen: data.isOpen ?? data.IsOpen 
          };
          if (prev.find(d => d.id === newDoor.id)) return prev;
          return [newDoor, ...prev];
       });
    };

    const handleDoorUpdated = (data: any) => {
       setDoors(prev => prev.map(d => String(d.id) === String(data.id ?? data.Id) ? { 
          ...d, 
          name: data.doorName ?? data.DoorName ?? d.name, 
          isLocked: data.isLocked ?? data.IsLocked ?? d.isLocked, 
          isOpen: data.isOpen ?? data.IsOpen ?? d.isOpen 
       } : d));
    };

    homeSecurityHubConnection.on("DoorCreated", handleDoorCreated);
    homeSecurityHubConnection.on("DoorUpdated", handleDoorUpdated);

    return () => {
       homeSecurityHubConnection.off("DoorCreated", handleDoorCreated);
       homeSecurityHubConnection.off("DoorUpdated", handleDoorUpdated);
    };
  }, []);

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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200 gap-4">
             <div className="p-4 bg-white rounded-full shadow-sm border border-zinc-100">
               <DoorClosed size={48} className="text-zinc-300" />
             </div>
             <div className="text-center">
               <p className="text-zinc-900 font-bold">No doors to viewyet</p>
               <p className="text-zinc-500 text-xs mt-1">There are no active door sensors registered.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
