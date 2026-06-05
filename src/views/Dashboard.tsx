import { useState, useEffect } from 'react';
import { Camera, ShieldCheck, DoorClosed, AlertCircle, LayoutDashboard, FileText } from 'lucide-react';
import { GetLogDto, generateMockLogs } from '../utils/mockData';

export default function Dashboard() {
  const [recentLogs, setRecentLogs] = useState<GetLogDto[]>([]);
  
  useEffect(() => {
    // Take first 10 for dashboard preview
    setRecentLogs(generateMockLogs(0, 10));
  }, []);

  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex flex-col gap-1 mb-2">
        <h3 className="text-3xl font-black text-zinc-800 flex items-center gap-2"><LayoutDashboard size={28} /> Dashboard</h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">System overview and recent activity</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <div className="border border-indigo-100 p-4 bg-indigo-50/50 flex items-center justify-between rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 rounded-xl">
              <Camera size={24} />
            </div>
            <div>
              <p className="font-bold text-indigo-950 tracking-tight">Cameras</p>
              <p className="text-xs text-indigo-600 font-medium tracking-tight mt-0.5">4 Online</p>
            </div>
          </div>
        </div>

        <div className="border border-emerald-100 p-4 bg-emerald-50/50 flex items-center justify-between rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-bold text-emerald-950 tracking-tight">Security</p>
              <p className="text-xs text-emerald-600 font-medium tracking-tight mt-0.5">All Secure</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
           <FileText size={14} /> Recent Logs
        </h3>
        
        <div className="flex flex-col gap-3">
          {recentLogs.map((log) => (
            <div key={log.Id} className="flex flex-col">
              <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex items-center gap-3 mb-2 pb-2 border-b border-zinc-50">
                  <img 
                    src={log.GetPersonDto.GetPersonDetailsDto.ImageUrl} 
                    alt="" 
                    className="w-7 h-7 rounded-full border border-zinc-200 flex-shrink-0 object-cover" 
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <p className="font-bold text-zinc-900 text-xs">{log.GetPersonDto.GetPersonDetailsDto.FirstName} {log.GetPersonDto.GetPersonDetailsDto.LastName}</p>
                    <p className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 tracking-wider uppercase">{log.ActionType}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 font-medium">{log.LogDetails}</p>
                <div className="mt-2 flex justify-end">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-right">
                     {new Date(log.TimeOfAction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
