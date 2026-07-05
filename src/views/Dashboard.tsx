import { useEffect } from 'react';
import { Camera, ShieldCheck, FileText, LayoutDashboard } from 'lucide-react';
import { useLogs } from '../context/LogsContext';
import { motion } from 'motion/react';
import { getImageUrl } from '../utils/api';

export default function Dashboard() {
  const { logs, fetchLogs } = useLogs();
  
  useEffect(() => {
    if (logs.length === 0) {
      fetchLogs();
    }
  }, [logs.length, fetchLogs]);

  // Take first 10 for dashboard preview
  const recentLogs = logs.slice(0, 10);

  return (
    <div className="p-5 flex flex-col gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-1 mb-2">
        <h3 className="text-3xl font-black text-zinc-800 flex items-center gap-2"><LayoutDashboard size={28} /> Dashboard</h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">System overview and recent activity</p>
      </motion.div>
      
      <div className="grid grid-cols-1 gap-3">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border border-indigo-100 p-4 bg-indigo-50/50 flex items-center justify-between rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 rounded-xl">
              <Camera size={24} />
            </div>
            <div>
              <p className="font-bold text-indigo-950 tracking-tight">Cameras</p>
              <p className="text-xs text-indigo-600 font-medium tracking-tight mt-0.5">4 Online</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border border-emerald-100 p-4 bg-emerald-50/50 flex items-center justify-between rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-bold text-emerald-950 tracking-tight">Security</p>
              <p className="text-xs text-emerald-600 font-medium tracking-tight mt-0.5">All Secure</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="mt-4 text-left">
        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
           <FileText size={14} /> Recent Logs
        </h3>
        
        {logs.length === 0 ? (
          <div className="flex justify-center items-center py-10 gap-1.5">
            <motion.div className="w-2 h-2 rounded-full bg-indigo-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
            <motion.div className="w-2 h-2 rounded-full bg-indigo-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
            <motion.div className="w-2 h-2 rounded-full bg-indigo-500" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
          {recentLogs.map((log, index) => (
            <div key={log.Id ?? (log as any).id ?? index} className="flex flex-col">
              <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex items-center gap-3 mb-2 pb-2 border-b border-zinc-50">
                  {(() => {
                    const imageUrl = log.GetPersonDto?.GetPersonDetailsDto?.ImageUrl || (log as any).getPersonDto?.getPersonDetailsDto?.imageUrl;
                    const firstName = log.GetPersonDto?.GetPersonDetailsDto?.FirstName || (log as any).getPersonDto?.getPersonDetailsDto?.firstName || '?';
                    return imageUrl ? (
                      <img 
                        src={getImageUrl(imageUrl)} 
                        alt="" 
                        className="w-7 h-7 rounded-full border border-zinc-200 flex-shrink-0 object-cover" 
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-zinc-200 flex-shrink-0 bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] uppercase">
                        {firstName.charAt(0)}
                      </div>
                    );
                  })()}
                  <div className="flex-1 flex justify-between items-center">
                    <p className="font-bold text-zinc-900 text-xs">{log.GetPersonDto?.GetPersonDetailsDto?.FirstName || (log as any).getPersonDto?.getPersonDetailsDto?.firstName} {log.GetPersonDto?.GetPersonDetailsDto?.LastName || (log as any).getPersonDto?.getPersonDetailsDto?.lastName}</p>
                    <p className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 tracking-wider uppercase">{log.ActionType || (log as any).actionType}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 font-medium">{log.LogDetails || (log as any).logDetails}</p>
                <div className="mt-2 flex justify-end">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-right">
                     {new Date(log.TimeOfAction || (log as any).timeOfAction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </motion.div>
    </div>
  );
}
