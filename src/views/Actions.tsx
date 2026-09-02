import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, Activity, Trash2, Edit, Plus, CheckCircle, AlertCircle, Sparkles, HelpCircle, LoaderCircle, ChevronLeft, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllActions, activateDeactivateAction } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';
import { triggerHaptic } from '../utils/haptics';
import { triggerAppNotification } from '../utils/notifications';

import { useData, ActionData, parseActionSignalRPayload } from '../context/DataContext';

interface ActionsProps {
  key?: React.Key;
  onBack?: () => void;
}

export default function Actions({ onBack }: ActionsProps) {
  const { actions, setActions, loading, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'name_desc' | 'status'>('default');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null);
  const [triggeredActions, setTriggeredActions] = useState<{ [id: number]: boolean }>({});
  
  // Internal toasts for SignalR events
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    // Local SignalR listeners for UI feedback and real-time state synchronization
    const handleActionTriggered = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      const actId = parsed.actionId;
      const name = parsed.actionName ?? (actId ? `Action #${actId}` : 'Action');
      
      if (actId && parsed.isActive !== undefined) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === actId) {
            return {
              ...act,
              actionActive: parsed.isActive!,
              ActionActive: parsed.isActive!,
              isActive: parsed.isActive!,
              IsActive: parsed.isActive!
            };
          }
          return act;
        }));
      }

      triggerHaptic('action');
      triggerAppNotification({
        title: name,
        message: 'Security action routine initiated',
        type: 'action',
        status: 'triggered',
        badge: 'Action'
      });
      addToast(`Action "${name}" triggered!`, 'success');
      
      // Visual highlight effect
      if (actId) {
        setTriggeredActions(prev => ({ ...prev, [actId]: true }));
        setTimeout(() => {
          setTriggeredActions(prev => ({ ...prev, [actId]: false }));
        }, 3000);
      }
    };

    const handleActionCreated = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      const name = parsed.actionName ?? 'New Action';
      addToast(`New Action "${name}" created.`, 'info');
      getAllActions().then(res => {
        const dataArray = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? res ?? [];
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          setActions(dataArray);
        }
      }).catch(e => console.warn(e));
    };

    const handleActionUpdated = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      if (parsed.actionId) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === parsed.actionId) {
            return {
              ...act,
              ...(parsed.isActive !== undefined ? {
                actionActive: parsed.isActive,
                ActionActive: parsed.isActive,
                isActive: parsed.isActive,
                IsActive: parsed.isActive
              } : {}),
              actionName: parsed.actionName ?? act.actionName ?? act.ActionName,
              ActionName: parsed.actionName ?? act.ActionName ?? act.actionName,
              actionDescription: parsed.actionDescription ?? act.actionDescription ?? act.ActionDescription,
              ActionDescription: parsed.actionDescription ?? act.ActionDescription ?? act.actionDescription
            };
          }
          return act;
        }));
      }
      const name = parsed.actionName ?? (parsed.actionId ? `Action #${parsed.actionId}` : 'Action');
      addToast(`Action "${name}" details updated.`, 'info');
    };

    const handleActionActivationChanged = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      const actId = parsed.actionId;
      if (actId && parsed.isActive !== undefined) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === actId) {
            return {
              ...act,
              actionActive: parsed.isActive!,
              ActionActive: parsed.isActive!,
              isActive: parsed.isActive!,
              IsActive: parsed.isActive!
            };
          }
          return act;
        }));
        const name = parsed.actionName ?? `Action #${actId}`;
        triggerAppNotification({
          title: name,
          message: parsed.isActive ? 'Security action enabled' : 'Security action disabled',
          type: 'action',
          status: parsed.isActive ? 'active' : 'inactive',
          badge: 'Action'
        });
        addToast(`Action "${name}" is now ${parsed.isActive ? 'Active' : 'Inactive'}.`, 'info');
      }
    };

    const handleActionDeleted = (...args: any[]) => {
      const parsed = parseActionSignalRPayload(...args);
      const actId = parsed.actionId;
      if (actId) {
        setActions(prev => prev.filter(act => Number(act.id ?? act.Id) !== actId));
      }
      const name = parsed.actionName ?? (actId ? `Action #${actId}` : 'Action');
      addToast(`Action "${name}" deleted.`, 'warn');
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
  }, [setActions]);

  const handleToggleActive = async (action: ActionData, e: React.MouseEvent) => {
    e.stopPropagation();
    const actionId = Number(action.id ?? action.Id);
    if (!actionId || isNaN(actionId) || togglingId !== null) return;

    const actionName = action.actionName ?? action.ActionName ?? `Action #${actionId}`;
    const currentlyActive = action.actionActive ?? action.ActionActive ?? false;

    triggerHaptic('medium');
    setTogglingId(actionId);
    try {
      // 1. Dispatch toggle request to the backend. Do NOT blindly invert local state.
      const response = await activateDeactivateAction(actionId);
      
      // 2. Parse response from server if it returned the authoritative boolean state
      const parsed = parseActionSignalRPayload(response);
      const nextActiveState = parsed.isActive !== undefined ? parsed.isActive : !currentlyActive;

      triggerAppNotification({
        title: actionName,
        message: nextActiveState ? 'Security action routine enabled' : 'Security action routine disabled',
        type: 'action',
        status: nextActiveState ? 'active' : 'inactive',
        badge: 'Action'
      });

      if (parsed.actionId === actionId && parsed.isActive !== undefined) {
        setActions(prev => prev.map(act => {
          const currId = Number(act.id ?? act.Id);
          if (currId === actionId) {
            return {
              ...act,
              actionActive: parsed.isActive!,
              ActionActive: parsed.isActive!,
              isActive: parsed.isActive!,
              IsActive: parsed.isActive!
            };
          }
          return act;
        }));
      } else {
        // Synchronize with database to ensure frontend state matches backend reality exactly
        const refreshed = await getAllActions();
        const dataArray = refreshed?.data ?? refreshed?.Data ?? refreshed?.result ?? refreshed?.Result ?? (Array.isArray(refreshed) ? refreshed : []);
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          setActions(dataArray);
        }
      }
      triggerHaptic('success');
    } catch (err) {
      console.error('Failed to toggle action status:', err);
      triggerHaptic('warning');
      addToast('Failed to change action status', 'warn');
    } finally {
      setTogglingId(null);
    }
  };

  const totalCount = actions.length;
  const activeCount = actions.filter(a => Boolean(a.actionActive ?? a.ActionActive)).length;

  const filteredAndSortedActions = actions
    .filter(act => {
      const name = (act.actionName ?? act.ActionName ?? '').toLowerCase();
      const desc = (act.actionDescription ?? act.ActionDescription ?? '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());
      
      const isActive = Boolean(act.actionActive ?? act.ActionActive ?? false);
      if (filterStatus === 'active') return matchesSearch && isActive;
      if (filterStatus === 'inactive') return matchesSearch && !isActive;
      return matchesSearch;
    })
    .sort((a, b) => {
      const nameA = (a.actionName ?? a.ActionName ?? '').toLowerCase();
      const nameB = (b.actionName ?? b.ActionName ?? '').toLowerCase();
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
      if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
      if (sortBy === 'status') {
        const aActive = (a.actionActive ?? a.ActionActive ?? false) ? 1 : 0;
        const bActive = (b.actionActive ?? b.ActionActive ?? false) ? 1 : 0;
        return bActive - aActive;
      }
      return 0;
    });

  return (
    <div className="p-5 flex flex-col gap-3 h-full overflow-y-auto relative pb-24">
      {/* View Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex flex-col">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Play size={26} className="text-indigo-600" /> Actions
          </h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Automate and activate system-wide macros</p>
        </div>
        {onBack && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
            aria-label="Go Back"
            title="Go Back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
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

      {/* Search & Styled Sort/Filter Dropdowns */}
      <div className="flex flex-col gap-2.5 mb-1 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            autoComplete="off"
            placeholder="Search actions by name or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-indigo-600 dark:focus:border-indigo-400 rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors text-zinc-900 dark:text-white"
          />
        </div>

        {/* Dropdown Filters (No segmented tab display) */}
        <div className="flex items-center gap-2">
          {/* Status Filter Dropdown */}
          <div className="relative flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors">
              <Filter size={14} className="text-zinc-400 shrink-0" />
              <select
                aria-label="Filter Actions by Status"
                value={filterStatus}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setFilterStatus(e.target.value as any);
                }}
                className="w-full bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">All Actions ({totalCount})</option>
                <option value="active" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Active Only ({activeCount})</option>
                <option value="inactive" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Disabled Only ({totalCount - activeCount})</option>
              </select>
              <ChevronDown size={14} className="text-zinc-400 pointer-events-none absolute right-2.5" />
            </div>
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors">
              <ArrowUpDown size={14} className="text-zinc-400 shrink-0" />
              <select
                aria-label="Sort Actions Order"
                value={sortBy}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSortBy(e.target.value as any);
                }}
                className="w-full bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="default" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Default Sort</option>
                <option value="name_asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (A – Z)</option>
                <option value="name_desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (Z – A)</option>
                <option value="status" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Active First</option>
              </select>
              <ChevronDown size={14} className="text-zinc-400 pointer-events-none absolute right-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoaderCircle size={36} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading security macros...</p>
          </div>
        ) : filteredAndSortedActions.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {filteredAndSortedActions.map(action => {
              const actId = action.id ?? action.Id ?? 0;
              const name = action.actionName ?? action.ActionName ?? `Action #${actId}`;
              const desc = action.actionDescription ?? action.ActionDescription ?? 'No description provided.';
              const isActive = action.actionActive ?? action.ActionActive ?? false;
              const isToggling = togglingId === actId;
              const isRecentlyTriggered = !!triggeredActions[actId];

              return (
                <div 
                  key={actId} 
                  className={`border flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                    isRecentlyTriggered 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                      : isActive 
                      ? 'border-indigo-100 dark:border-indigo-900/40' 
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div 
                    className="p-4 flex flex-col gap-1.5 select-none"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Play size={18} className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'} shrink-0`} />
                          <p className="font-black text-zinc-900 dark:text-white text-base truncate">{name}</p>
                          {isRecentlyTriggered && (
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md animate-pulse shrink-0">
                              Triggered!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle Active Button */}
                        <button 
                          onClick={(e) => handleToggleActive(action, e)}
                          disabled={isToggling}
                          aria-label={`Toggle ${name}`}
                          className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none shrink-0 ${
                            isToggling ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isActive ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
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

                    {/* Metadata summary */}
                    <div className="flex items-center justify-end mt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-700">
              <Activity size={48} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="text-center px-4">
              <p className="text-zinc-900 dark:text-white font-bold">No actions found</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">There are no macro actions matching your current filters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
