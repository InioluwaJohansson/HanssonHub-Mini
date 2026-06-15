import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, X, Activity, Clock, Info, Calendar, Search } from 'lucide-react';
import { GetLogDto } from '../utils/mockData';
import { useLogs } from '../context/LogsContext';
import { motion } from 'motion/react';

export default function Logs() {
  const { logs, hasMore, loading, fetchLogs, fetchLogsByDate, clearLogs } = useLogs();
  const [selectedLog, setSelectedLog] = useState<GetLogDto | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const observer = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (logs.length === 0 && !startDate && !endDate) {
      fetchLogs();
    }
  }, [logs.length, fetchLogs, startDate, endDate]);

  const handleSearch = () => {
    if (startDate && endDate) {
      // API example: startDate=01-01-2008&endDate=12-02-2019
      // format dates from yyyy-mm-dd to dd-mm-yyyy or as needed
      const formatDate = (d: string) => {
        const [y, m, d_] = d.split('-');
        return `${d_}-${m}-${y}`;
      };
      
      fetchLogsByDate(formatDate(startDate), formatDate(endDate), true);
    } else {
      fetchLogs(true);
    }
  };

  const lastLogElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        if (startDate && endDate) {
            const formatDate = (d: string) => {
                const [y, m, d_] = d.split('-');
                return `${d_}-${m}-${y}`;
              };
           fetchLogsByDate(formatDate(startDate), formatDate(endDate), false);
        } else {
           fetchLogs();
        }
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchLogs, fetchLogsByDate, startDate, endDate]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-5 pb-2 shrink-0 flex flex-col gap-1">
        <h3 className="text-3xl font-black text-slate-800 flex items-center gap-2"><FileText size={28} /> Logs</h3>
        <p className="text-xs text-slate-500 font-medium tracking-wide">System activity and access history</p>
      </div>

      <div className="px-5 py-3 shrink-0 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              placeholder="Start Date"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              placeholder="End Date"
            />
          </div>
        </div>
        <button 
          onClick={handleSearch}
          className="w-full py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Search size={14} /> Filter Activity
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 pb-5 mt-2 space-y-3 relative">
        {logs.map((log, index) => {
          const isLast = index === logs.length - 1;
          return (
            <motion.div 
              ref={isLast ? lastLogElementRef as any : null}
              key={log.Id ?? log.id ?? index}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-center gap-4"
              onClick={() => setSelectedLog(log)}
            >
              <img src={log.GetPersonDto?.GetPersonDetailsDto?.ImageUrl || (log as any).getPersonDto?.getPersonDetailsDto?.imageUrl || 'https://i.pravatar.cc/150'} alt="" className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-slate-900 truncate">{log.GetPersonDto?.GetPersonDetailsDto?.FirstName || (log as any).getPersonDto?.getPersonDetailsDto?.firstName} {log.GetPersonDto?.GetPersonDetailsDto?.LastName || (log as any).getPersonDto?.getPersonDetailsDto?.lastName}</p>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0 ml-2 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(log.TimeOfAction || (log as any).timeOfAction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-1">{log.ActionType || (log as any).actionType}</p>
              </div>
            </motion.div>
          );
        })}
        {loading && (
          <div className="py-4 text-center pb-8">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin"></div>
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 gap-4">
             <div className="p-4 bg-slate-50 rounded-full shadow-sm border border-slate-100">
               <FileText size={48} className="text-slate-300" />
             </div>
             <div className="text-center px-6">
               <p className="text-slate-900 font-bold">No activity logs</p>
               <p className="text-slate-500 text-xs mt-1">There are no records matching your criteria currently.</p>
             </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedLog(null)}>
          <div 
            className="bg-white w-full max-w-sm rounded-[1.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
               <h3 className="font-black text-lg text-slate-800 tracking-tight flex items-center gap-2"><FileText size={18} className="text-slate-600" /> Log Details</h3>
               <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors focus:outline-none">
                 <X size={20} />
               </button>
            </header>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="relative">
                  <img src={selectedLog.GetPersonDto?.GetPersonDetailsDto?.ImageUrl || (selectedLog as any).getPersonDto?.getPersonDetailsDto?.imageUrl || 'https://i.pravatar.cc/150'} alt="" className="w-16 h-16 rounded-full border-2 border-slate-200 shadow-sm object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Activity size={12} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">{selectedLog.GetPersonDto?.GetPersonDetailsDto?.FirstName || (selectedLog as any).getPersonDto?.getPersonDetailsDto?.firstName} {selectedLog.GetPersonDto?.GetPersonDetailsDto?.LastName || (selectedLog as any).getPersonDto?.getPersonDetailsDto?.lastName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-md">@{selectedLog.GetPersonDto?.GetUserDto?.UserName || (selectedLog as any).getPersonDto?.getUserDto?.userName} • {selectedLog.GetPersonDto?.GetUserDto?.RoleName || (selectedLog as any).getPersonDto?.getUserDto?.roleName}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 flex items-start gap-3">
                  <div className="mt-0.5"><Activity size={16} className="text-indigo-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Action Executed</p>
                    <p className="text-sm font-bold text-indigo-950">{selectedLog.ActionType || (selectedLog as any).actionType}</p>
                  </div>
                </div>
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-100 flex items-start gap-3">
                  <div className="mt-0.5"><Clock size={16} className="text-sky-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">Timestamp</p>
                    <p className="text-sm font-medium text-sky-950">{new Date(selectedLog.TimeOfAction || (selectedLog as any).timeOfAction).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-100 flex items-start gap-3">
                  <div className="mt-0.5"><Info size={16} className="text-amber-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">System Message</p>
                    <p className="text-sm text-amber-950 font-medium">{selectedLog.LogDetails || (selectedLog as any).logDetails}</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
