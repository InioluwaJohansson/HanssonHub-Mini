import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, Activity, Trash2, Edit, Plus, CheckCircle, AlertCircle, Sparkles, HelpCircle, LoaderCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllActions, activateDeactivateAction } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';

interface Step {
  id?: number;
  Id?: number;
  stepId?: string;
  StepId?: string;
  stepName?: string;
  StepName?: string;
  stepDescription?: string;
  StepDescription?: string;
  stepActive?: boolean;
  StepActive?: boolean;
}

interface ActionData {
  id: number;
  Id?: number;
  actionId?: string;
  ActionId?: string;
  actionName?: string;
  ActionName?: string;
  actionDescription?: string;
  ActionDescription?: string;
  actionActive?: boolean;
  ActionActive?: boolean;
  getActionStepDtos?: Step[];
  GetActionStepDtos?: Step[];
}

export default function Actions() {
  const [actions, setActions] = useState<ActionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);
  const [triggeredActions, setTriggeredActions] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    if (actions.length > 0) {
      (window as any).__cachedActions = actions;
    }
  }, [actions]);
  
  // Internal toasts for SignalR events
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchActions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await getAllActions();
      // Handle various response wrappers
      const dataArray = response?.data ?? response?.Data ?? response?.result ?? response?.Result ?? response;
      if (Array.isArray(dataArray)) {
        setActions(dataArray);
        setError(null);
      } else if (response && typeof response === 'object') {
        // If it's single object or has another format
        const possibleArray = Object.values(response).find(val => Array.isArray(val));
        if (possibleArray) {
          setActions(possibleArray as ActionData[]);
          setError(null);
        } else {
          setActions([]);
        }
      } else {
        setActions([]);
      }
    } catch (err: any) {
      console.error('Failed to load actions:', err);
      setError('Could not retrieve security actions');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray((window as any).__cachedActions) && (window as any).__cachedActions.length > 0) {
      setActions((window as any).__cachedActions);
      setLoading(false);
    } else {
      fetchActions();
    }

    // SignalR listeners
    const handleActionTriggered = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      const name = data?.actionName ?? data?.ActionName ?? `Action #${actId}`;
      
      addToast(`Action "${name}" triggered!`, 'success');
      
      // Visual highlight effect
      if (actId) {
        setTriggeredActions(prev => ({ ...prev, [actId]: true }));
        setTimeout(() => {
          setTriggeredActions(prev => ({ ...prev, [actId]: false }));
        }, 3000);
      }
    };

    const handleActionCreated = (data: any) => {
      const name = data?.actionName ?? data?.ActionName ?? 'New Action';
      addToast(`New Action "${name}" created.`, 'info');
      fetchActions(false);
    };

    const handleActionUpdated = (data: any) => {
      const name = data?.actionName ?? data?.ActionName ?? 'Action';
      addToast(`Action "${name}" details updated.`, 'info');
      fetchActions(false);
    };

    const handleActionActivationChanged = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      const name = data?.actionName ?? data?.ActionName ?? 'Action';
      const isActive = data?.isActive ?? data?.IsActive ?? data?.actionActive ?? data?.ActionActive ?? false;
      
      addToast(`Action "${name}" is now ${isActive ? 'Active' : 'Inactive'}.`, 'info');
      
      setActions(prev => prev.map(act => {
        const currentId = act.id ?? act.Id;
        if (Number(currentId) === actId) {
          return {
            ...act,
            actionActive: isActive,
            ActionActive: isActive
          };
        }
        return act;
      }));
    };

    const handleActionDeleted = (data: any) => {
      const actId = Number(data?.actionId ?? data?.ActionId);
      const name = data?.actionName ?? data?.ActionName ?? 'Action';
      addToast(`Action "${name}" deleted.`, 'warn');
      
      setActions(prev => prev.filter(act => Number(act.id ?? act.Id) !== actId));
    };

    // Register listeners with homeSecurityHubConnection proxy
    homeSecurityHubConnection.on('ActionTriggered', handleActionTriggered);
    homeSecurityHubConnection.on('ActionCreated', handleActionCreated);
    homeSecurityHubConnection.on('ActionUpdated', handleActionUpdated);
    homeSecurityHubConnection.on('ActionActivationChanged', handleActionActivationChanged);
    homeSecurityHubConnection.on('ActionDeleted', handleActionDeleted);

    return () => {
      homeSecurityHubConnection.off('ActionTriggered', handleActionTriggered);
      homeSecurityHubConnection.off('ActionCreated', handleActionCreated);
      homeSecurityHubConnection.off('ActionUpdated', handleActionUpdated);
      homeSecurityHubConnection.off('ActionActivationChanged', handleActionActivationChanged);
      homeSecurityHubConnection.off('ActionDeleted', handleActionDeleted);
    };
  }, []);

  const handleToggleActive = async (action: ActionData, e: React.MouseEvent) => {
    e.stopPropagation();
    const actionId = action.id ?? action.Id;
    if (!actionId || togglingId !== null) return;

    setTogglingId(actionId);
    try {
      await activateDeactivateAction(actionId);
      
      // Toggle locally to give instant response
      setActions(prev => prev.map(act => {
        const currId = act.id ?? act.Id;
        if (currId === actionId) {
          const currentVal = act.actionActive ?? act.ActionActive ?? false;
          return {
            ...act,
            actionActive: !currentVal,
            ActionActive: !currentVal
          };
        }
        return act;
      }));
    } catch (err) {
      console.error('Failed to toggle action status:', err);
      addToast('Failed to change action status', 'warn');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredActions = actions.filter(act => {
    const name = (act.actionName ?? act.ActionName ?? '').toLowerCase();
    const desc = (act.actionDescription ?? act.ActionDescription ?? '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());
    
    const isActive = act.actionActive ?? act.ActionActive ?? false;
    if (filter === 'active') return matchesSearch && isActive;
    if (filter === 'inactive') return matchesSearch && !isActive;
    return matchesSearch;
  });

  return (
    <div className="p-5 flex flex-col gap-3 h-full overflow-y-auto relative pb-24">
      {/* View Header */}
      <div className="flex flex-col gap-1 mb-3">
        <h3 className="text-3xl font-black text-zinc-900 flex items-center gap-2">
          <Play size={32} className="text-indigo-600" /> Actions
        </h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">Automate and activate system-wide macros</p>
      </div>

      {/* Internal floating toasts */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-[340px] px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-3.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md pointer-events-auto ${
                toast.type === 'success'
                  ? 'bg-emerald-500/95 text-white border-emerald-400'
                  : toast.type === 'warn'
                  ? 'bg-rose-500/95 text-white border-rose-400'
                  : 'bg-zinc-900/95 text-white border-zinc-800'
              }`}
            >
              {toast.type === 'success' ? (
                <Sparkles size={16} className="shrink-0 text-amber-300 animate-pulse" />
              ) : toast.type === 'warn' ? (
                <AlertCircle size={16} className="shrink-0" />
              ) : (
                <Activity size={16} className="shrink-0 text-indigo-400" />
              )}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 mb-2 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search actions by name or steps..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b-2 border-zinc-200 focus:border-black rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 text-center py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${
                filter === tab 
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoaderCircle size={36} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading security macros...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-14 bg-rose-50 rounded-2xl border border-rose-100 gap-3 px-4 text-center">
            <AlertCircle size={36} className="text-rose-500" />
            <div>
              <p className="text-sm font-black text-rose-900">Failed to load actions</p>
              <p className="text-xs text-rose-600 mt-1">{error}</p>
            </div>
            <button 
              onClick={() => fetchActions()}
              className="text-xs font-extrabold text-white bg-rose-600 px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredActions.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {filteredActions.map(action => {
              const actId = action.id ?? action.Id ?? 0;
              const name = action.actionName ?? action.ActionName ?? `Action #${actId}`;
              const desc = action.actionDescription ?? action.ActionDescription ?? 'No description provided.';
              const isActive = action.actionActive ?? action.ActionActive ?? false;
              const steps = action.getActionStepDtos ?? action.GetActionStepDtos ?? [];
              const isToggling = togglingId === actId;
              const isExpanded = expandedActionId === actId;
              const isRecentlyTriggered = !!triggeredActions[actId];

              return (
                <div 
                  key={actId} 
                  className={`border flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                    isRecentlyTriggered 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                      : isActive 
                      ? 'border-indigo-100' 
                      : 'border-zinc-200'
                  }`}
                >
                  <div 
                    className="p-4 flex flex-col gap-1.5 select-none"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Play size={18} className={`${isActive ? 'text-indigo-600' : 'text-zinc-400'} shrink-0`} />
                          <p className="font-black text-zinc-900 text-base truncate">{name}</p>
                          {isRecentlyTriggered && (
                            <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md animate-pulse shrink-0">
                              Triggered!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle Active Button */}
                        <button 
                          onClick={(e) => handleToggleActive(action, e)}
                          disabled={isToggling}
                          className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none shrink-0 ${
                            isToggling ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isActive ? 'bg-indigo-600' : 'bg-zinc-300'
                          }`}
                        >
                          {isToggling ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <LoaderCircle size={14} className="animate-spin text-white" />
                            </div>
                          ) : (
                            <div 
                              className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${
                                isActive ? 'left-8' : 'left-1'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata summary (active step badge only) */}
                    <div className="flex items-center justify-end mt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200 gap-4">
            <div className="p-4 bg-white rounded-full shadow-sm border border-zinc-100">
              <Activity size={48} className="text-zinc-300" />
            </div>
            <div className="text-center px-4">
              <p className="text-zinc-900 font-bold">No actions found</p>
              <p className="text-zinc-500 text-xs mt-1">There are no macro actions matching your current filters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
