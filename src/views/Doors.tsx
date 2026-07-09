import { useState, useEffect } from 'react';
import { DoorOpen, DoorClosed, Lock, Unlock, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { getAllDoorsByDoorType, lockDoor, unlockDoor } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';

type DoorData = {
  id: string;
  doorId?: string;
  name: string;
  isLocked: boolean;
  isOpen: boolean;
  doorType?: any;
  type?: string;
};

const getDoorTypeString = (doorType: any) => {
  if (doorType === undefined || doorType === null) return "Main Door";
  const dt = String(doorType).trim();
  if (dt === "3" || dt.toLowerCase() === "maindoor" || dt.toLowerCase() === "main door") return "Main Door";
  if (dt === "2" || dt.toLowerCase() === "garagedoor" || dt.toLowerCase() === "garage door") return "Garage Door";
  if (dt === "1" || dt.toLowerCase() === "backdoor" || dt.toLowerCase() === "back door") return "Back Door";
  if (dt === "4" || dt.toLowerCase() === "gate") return "Gate";
  return `Type ${dt}`;
};

export default function Doors() {
  const [doors, setDoors] = useState<DoorData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (doors.length > 0) {
      (window as any).__cachedDoors = doors;
    }
  }, [doors]);

  useEffect(() => {
    const fetchDoors = async () => {
      try {
        const response = await getAllDoorsByDoorType(3);
        if (response.status && response.data) {
          const mappedDoors = response.data.map((d: any, index: number) => ({
            id: String(d.id ?? d.Id ?? index),
            doorId: String(d.doorId ?? d.DoorId ?? ''),
            name: d.doorName ?? d.DoorName ?? d.name ?? d.Name ?? `Door ${d.id ?? d.Id ?? index}`,
            isLocked: d.isLocked ?? d.IsLocked ?? true,
            isOpen: d.isOpen ?? d.IsOpen ?? false,
            doorType: d.doorType ?? d.DoorType,
            type: d.type ?? d.Type ?? getDoorTypeString(d.doorType ?? d.DoorType)
          }));
          setDoors(mappedDoors);
        }
      } catch (err) {
        console.error("Failed to fetch doors", err);
      }
    };

    if (Array.isArray((window as any).__cachedDoors) && (window as any).__cachedDoors.length > 0) {
      setDoors((window as any).__cachedDoors);
    } else {
      fetchDoors();
    }

    const handleDoorCreated = (data: any) => {
       setDoors(prev => {
          const doorIdVal = String(data.doorId ?? data.DoorId ?? '');
          const idVal = String(data.id ?? data.Id);
          const nameVal = data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? `Door ${idVal}`;
          const isLockedVal = data.isLocked ?? data.IsLocked ?? true;
          const isOpenVal = data.isOpen ?? data.IsOpen ?? false;
          const dtVal = data.doorType ?? data.DoorType;
          
          const newDoor: DoorData = { 
             id: idVal, 
             doorId: doorIdVal,
             name: nameVal, 
             isLocked: isLockedVal, 
             isOpen: isOpenVal,
             doorType: dtVal,
             type: data.type ?? data.Type ?? getDoorTypeString(dtVal)
          };
          if (prev.find(d => d.id === newDoor.id || (d.doorId && d.doorId === newDoor.id))) return prev;
          return [newDoor, ...prev];
       });
    };

    const handleDoorUpdated = (data: any) => {
       setDoors(prev => prev.map(d => {
         const targetId = String(data.id ?? data.Id);
         if (String(d.id) === targetId || (d.doorId && String(d.doorId) === targetId)) {
           const dtVal = data.doorType ?? data.DoorType ?? d.doorType;
           return { 
              ...d, 
              name: data.doorName ?? data.DoorName ?? data.name ?? data.Name ?? d.name, 
              isLocked: data.isLocked ?? data.IsLocked ?? d.isLocked, 
              isOpen: data.isOpen ?? data.IsOpen ?? d.isOpen,
              doorType: dtVal,
              type: data.type ?? data.Type ?? getDoorTypeString(dtVal)
           };
         }
         return d;
       }));
    };

    const handleDoorTriggered = (data: any) => {
       const triggeredId = String(data.id ?? data.Id);
       setDoors(prev => prev.map(d => {
         if (String(d.id) === triggeredId || (d.doorId && String(d.doorId) === triggeredId)) {
           return {
             ...d,
             isLocked: data.isLocked ?? data.IsLocked ?? d.isLocked,
             isOpen: data.isOpen ?? data.IsOpen ?? d.isOpen
           };
         }
         return d;
       }));
    };

    const handleDoorDeleted = (data: any) => {
       const deletedId = String(data.id ?? data.Id);
       const deletedDoorId = String(data.doorId ?? data.DoorId ?? '');
       setDoors(prev => prev.filter(d => 
         String(d.id) !== deletedId && 
         (!d.doorId || String(d.doorId) !== deletedId) &&
         (!deletedDoorId || (String(d.id) !== deletedDoorId && String(d.doorId) !== deletedDoorId))
       ));
    };

    homeSecurityHubConnection.on("DoorCreated", handleDoorCreated);
    homeSecurityHubConnection.on("DoorUpdated", handleDoorUpdated);
    homeSecurityHubConnection.on("DoorTriggered", handleDoorTriggered);
    homeSecurityHubConnection.on("DoorDeleted", handleDoorDeleted);

    return () => {
       homeSecurityHubConnection.off("DoorCreated", handleDoorCreated);
       homeSecurityHubConnection.off("DoorUpdated", handleDoorUpdated);
       homeSecurityHubConnection.off("DoorTriggered", handleDoorTriggered);
       homeSecurityHubConnection.off("DoorDeleted", handleDoorDeleted);
    };
  }, []);

  const toggleLock = async (id: string) => {
    try {
      await lockDoor(id);
      setDoors(prev => prev.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
    } catch (err) {
      console.error("Failed to toggle lock for door", id, err);
    }
  };

  const toggleOpen = async (id: string) => {
    try {
      await unlockDoor(id);
      setDoors(prev => prev.map(d => d.id === id ? { ...d, isOpen: !d.isOpen } : d));
    } catch (err) {
      console.error("Failed to toggle open/close for door", id, err);
    }
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
