import { useEffect, useState } from 'react';
import { Camera, ShieldCheck, ShieldAlert, FileText, LayoutDashboard, DoorClosed, Play, Pause, LoaderCircle } from 'lucide-react';
import { useLogs } from '../context/LogsContext';
import { useData } from '../context/DataContext';
import { motion } from 'motion/react';
import { getImageUrl, activateDeactivateAction } from '../utils/api';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Dashboard() {
  const { logs, fetchLogs } = useLogs();
  const { doors, cameras, actions, loading, setActions } = useData();
  const [togglingActionId, setTogglingActionId] = useState<number | null>(null);
  
  useEffect(() => {
    if (logs.length === 0) {
      fetchLogs();
    }
  }, [logs.length, fetchLogs]);

  const handleToggleAction = async (actionId: number) => {
    if (togglingActionId !== null) return;
    setTogglingActionId(actionId);
    try {
      await activateDeactivateAction(actionId);
      setActions(prev => prev.map(act => {
        const id = act.id ?? act.Id;
        if (id === actionId) {
          const current = act.actionActive ?? act.ActionActive ?? false;
          return { ...act, actionActive: !current, ActionActive: !current };
        }
        return act;
      }));
    } catch (err) {
      console.error("Failed to toggle action from dashboard", err);
    } finally {
      setTogglingActionId(null);
    }
  };

  // State checks
  const allDoorsLocked = doors.length > 0 && doors.every(d => d.isLocked);
  const recentLogs = logs.slice(0, 5);

  if (loading) {
    return (
      <div className="p-5 flex flex-col gap-3 min-h-[400px] justify-center items-center">
        <LoaderCircle size={36} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Loading Dashboard Overview...</p>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-1 mb-2">
        <h3 className="text-3xl font-black text-zinc-800 flex items-center gap-2"><LayoutDashboard size={28} /> Dashboard</h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">System overview and recent activity</p>
      </motion.div>
      
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Card 1: Security Card (MUST be above Cameras card) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`border p-4 flex items-center justify-between rounded-xl shadow-sm transition-colors duration-300 ${
            allDoorsLocked 
              ? 'border-emerald-100 bg-emerald-50/50 text-emerald-950' 
              : 'border-amber-100 bg-amber-50/50 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 bg-white shadow-sm flex items-center justify-center rounded-xl border ${
              allDoorsLocked ? 'border-emerald-100 text-emerald-600' : 'border-amber-100 text-amber-600'
            }`}>
              {allDoorsLocked ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <p className="font-bold tracking-tight">Security</p>
              <p className={`text-xs font-bold tracking-tight mt-0.5 ${allDoorsLocked ? 'text-emerald-600' : 'text-amber-600'}`}>
                {allDoorsLocked ? 'All Secure' : 'Attention Required'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md transition-colors duration-300 ${
            allDoorsLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {allDoorsLocked ? 'Secured' : 'Doors Unlocked'}
          </span>
        </motion.div>

        {/* Card 2: Cameras Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border border-indigo-100 p-4 bg-indigo-50/50 flex items-center justify-between rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 rounded-xl">
              <Camera size={24} />
            </div>
            <div>
              <p className="font-bold text-indigo-950 tracking-tight">Cameras</p>
              <p className="text-xs text-indigo-600 font-medium tracking-tight mt-0.5">
                {cameras.length} {cameras.length === 1 ? 'Camera' : 'Cameras'} Online
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-md">
            Live
          </span>
        </motion.div>

        {/* Card 3: Doors Count Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, delay: 0.3 }}
          className="border border-purple-100 p-4 bg-purple-50/50 flex items-center justify-between rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white shadow-sm border border-purple-100 flex items-center justify-center text-purple-600 rounded-xl">
              <DoorClosed size={24} />
            </div>
            <div>
              <p className="font-bold text-purple-950 tracking-tight">Doors</p>
              <p className="text-xs text-purple-600 font-medium tracking-tight mt-0.5">
                {doors.length} {doors.length === 1 ? 'Door' : 'Doors'} Connected
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md">
            {doors.filter(d => !d.isLocked).length} Unlocked
          </span>
        </motion.div>
      </div>

      {/* Quick Actions Component (Displays at least 2 actions side-by-side) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.4 }} 
        className="mt-4 text-left"
      >
        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
           <Play size={14} /> Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {actions.slice(0, 2).map((action, idx) => {
            const actId = action.id ?? action.Id;
            const name = action.actionName ?? action.ActionName ?? `Action #${actId}`;
            const isActive = action.actionActive ?? action.ActionActive ?? false;
            const isToggling = togglingActionId === actId;
            
            return (
              <div 
                key={actId ?? idx} 
                className={`border p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-200 ${
                  isActive 
                    ? 'border-indigo-100 dark:border-indigo-950 ring-1 ring-indigo-50 dark:ring-indigo-950/30' 
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black text-zinc-800 dark:text-zinc-100 text-sm truncate">{name}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                    {action.actionDescription ?? action.ActionDescription ?? "Automation macro"}
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <button 
                    onClick={() => handleToggleAction(actId)}
                    disabled={isToggling}
                    className={`p-2 flex items-center justify-center rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60' 
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {isToggling ? (
                      <LoaderCircle size={18} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : isActive ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          
          {/* Fallback to show mock templates if fewer than 2 actions exist in the database */}
          {actions.length < 2 && Array.from({ length: 2 - actions.length }).map((_, i) => (
            <div 
              key={`mock-${i}`} 
              className="border border-dashed border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl flex flex-col justify-center items-center gap-1.5 py-6"
            >
              <Play size={18} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">
                Action Spot Available
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Logs Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="mt-4 text-left">
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
                          referrerPolicy="no-referrer"
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
                       {formatRelativeTime(log.TimeOfAction || (log as any).timeOfAction)}
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
