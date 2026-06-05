import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, X, Activity, Clock, Info } from 'lucide-react';
import { GetLogDto, generateMockLogs } from '../utils/mockData';

export default function Logs() {
  const [logs, setLogs] = useState<GetLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<GetLogDto | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);
  
  const loadMoreLogs = useCallback(() => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setLogs(prev => {
        const currentIds = new Set(prev.map(l => l.Id));
        const newBatch = generateMockLogs(page * 50, 50);
        const filteredNewBatch = newBatch.filter(l => !currentIds.has(l.Id));
        return [...prev, ...filteredNewBatch];
      });
      setPage(p => p + 1);
      setLoading(false);
      isLoadingRef.current = false;
      if (page >= 10) setHasMore(false); // Cap mock data at 500
    }, 500);
  }, [page, hasMore]);

  useEffect(() => {
    loadMoreLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastLogElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreLogs();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMoreLogs]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-5 pb-2 shrink-0 flex flex-col gap-1">
        <h3 className="text-3xl font-black text-slate-800 flex items-center gap-2"><FileText size={28} /> Logs</h3>
        <p className="text-xs text-slate-500 font-medium tracking-wide">System activity and access history</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 pb-5 mt-2 space-y-3 relative">
        {logs.map((log, index) => {
          const isLast = index === logs.length - 1;
          const dateStr = new Date(log.TimeOfAction).toLocaleDateString();
          return (
            <div 
              ref={isLast ? lastLogElementRef : null}
              key={log.Id} 
              className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-center gap-4"
              onClick={() => setSelectedLog(log)}
            >
              <img src={log.GetPersonDto.GetPersonDetailsDto.ImageUrl} alt="" className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-slate-900 truncate">{log.GetPersonDto.GetPersonDetailsDto.FirstName} {log.GetPersonDto.GetPersonDetailsDto.LastName}</p>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0 ml-2 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(log.TimeOfAction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-1">{log.ActionType}</p>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="py-4 text-center pb-8">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin"></div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                  <img src={selectedLog.GetPersonDto.GetPersonDetailsDto.ImageUrl} alt="" className="w-16 h-16 rounded-full border-2 border-slate-200 shadow-sm object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Activity size={12} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">{selectedLog.GetPersonDto.GetPersonDetailsDto.FirstName} {selectedLog.GetPersonDto.GetPersonDetailsDto.LastName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-md">@{selectedLog.GetPersonDto.GetUserDto.UserName} • {selectedLog.GetPersonDto.GetUserDto.RoleName}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 flex items-start gap-3">
                  <div className="mt-0.5"><Activity size={16} className="text-indigo-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Action Executed</p>
                    <p className="text-sm font-bold text-indigo-950">{selectedLog.ActionType}</p>
                  </div>
                </div>
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-100 flex items-start gap-3">
                  <div className="mt-0.5"><Clock size={16} className="text-sky-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">Timestamp</p>
                    <p className="text-sm font-medium text-sky-950">{new Date(selectedLog.TimeOfAction).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-100 flex items-start gap-3">
                  <div className="mt-0.5"><Info size={16} className="text-amber-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">System Message</p>
                    <p className="text-sm text-amber-950 italic">{selectedLog.LogDetails}</p>
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
