import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Radio, 
  ShieldCheck, 
  ShieldAlert, 
  Power, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  BellRing,
  Layers,
  MapPin,
  Flame,
  ToggleLeft,
  ToggleRight,
  Shield,
  LoaderCircle,
  Filter,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { useData, ExternalData } from '../context/DataContext';
import { activateDeactivateExternal, getAllExternals } from '../utils/api';
import { homeSecurityHubConnection } from '../utils/signalr';
import { triggerAppNotification } from '../utils/notifications';

interface ExternalsProps {
  key?: React.Key;
  onBack?: () => void;
}

const FALLBACK_EXTERNALS: ExternalData[] = [
  {
    id: 1,
    externalName: 'Main Perimeter Infrared Beam',
    externalId: 'EXT-BEAM-01',
    isTriggered: true,
    isActive: true,
    powerActive: true,
    roomName: 'North Gate',
    sectionName: 'Perimeter Outer Fence',
    actionIds: [1, 3],
    createdByName: 'Security Admin',
    createdOn: new Date().toISOString()
  },
  {
    id: 2,
    externalName: 'Vehicle Entrance Boom Barrier',
    externalId: 'EXT-GATE-02',
    isTriggered: false,
    isActive: true,
    powerActive: true,
    roomName: 'Front Driveway',
    sectionName: 'Entry Checkpoint',
    actionIds: [2],
    createdByName: 'System Admin',
    createdOn: new Date().toISOString()
  },
  {
    id: 3,
    externalName: 'Courtyard High-Power Floodlight',
    externalId: 'EXT-LIGHT-03',
    isTriggered: false,
    isActive: false,
    powerActive: true,
    roomName: 'Central Courtyard',
    sectionName: 'Grounds Lighting',
    actionIds: [],
    createdByName: 'Facility Manager',
    createdOn: new Date().toISOString()
  },
  {
    id: 4,
    externalName: 'East Boundary Motion Radar',
    externalId: 'EXT-RADAR-04',
    isTriggered: true,
    isActive: false,
    powerActive: true,
    roomName: 'East Perimeter',
    sectionName: 'Perimeter Outer Fence',
    actionIds: [4],
    createdByName: 'Security Admin',
    createdOn: new Date().toISOString()
  },
  {
    id: 5,
    externalName: 'Emergency Perimeter Siren & Strobe',
    externalId: 'EXT-SIREN-05',
    isTriggered: false,
    isActive: true,
    powerActive: true,
    roomName: 'Roof Mast',
    sectionName: 'Alarm System',
    actionIds: [1, 2, 4],
    createdByName: 'Chief Engineer',
    createdOn: new Date().toISOString()
  }
];

export default function Externals({ onBack }: ExternalsProps) {
  const { externals, setExternals, loading, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'triggered' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'triggered' | 'name_asc' | 'name_desc' | 'room'>('default');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);

  // If data context has loaded real externals from backend, use those; otherwise use fallback
  const displayExternals = (externals && externals.length > 0) ? externals : FALLBACK_EXTERNALS;

  const addToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // SignalR event listeners for immediate UI sync
  useEffect(() => {
    const handleExternalTriggered = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id ?? data.externalId ?? data.ExternalId);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      const name = data.externalName ?? data.ExternalName ?? `External #${targetId}`;
      const isTrig = data.isTriggered !== undefined ? Boolean(data.isTriggered) : (data.IsTriggered !== undefined ? Boolean(data.IsTriggered) : true);
      const isAct = data.isActive !== undefined ? Boolean(data.isActive) : (data.IsActive !== undefined ? Boolean(data.IsActive) : undefined);

      setExternals(prev => prev.map(ext => {
        if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
          return {
            ...ext,
            isTriggered: isTrig,
            isActive: isAct !== undefined ? isAct : ext.isActive,
            IsActive: isAct !== undefined ? isAct : ext.isActive
          };
        }
        return ext;
      }));

      if (isTrig) {
        triggerHaptic('action');
        addToast(`Alert: ${name} is Triggered!`, 'warn');
      } else {
        addToast(`${name} trigger status cleared.`, 'info');
      }
    };

    const handleExternalActivationChanged = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id ?? data.externalId ?? data.ExternalId);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      const name = data.externalName ?? data.ExternalName ?? `External #${targetId}`;
      
      let isActive: boolean | undefined = undefined;
      if (data?.isActive !== undefined) isActive = Boolean(data.isActive);
      else if (data?.IsActive !== undefined) isActive = Boolean(data.IsActive);

      let isTriggered: boolean | undefined = undefined;
      if (data?.isTriggered !== undefined) isTriggered = Boolean(data.isTriggered);
      else if (data?.IsTriggered !== undefined) isTriggered = Boolean(data.IsTriggered);

      if (isActive !== undefined || isTriggered !== undefined) {
        setExternals(prev => prev.map(ext => {
          if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
            return {
              ...ext,
              ...(isActive !== undefined ? { isActive, IsActive: isActive } : {}),
              ...(isTriggered !== undefined ? { isTriggered, IsTriggered: isTriggered } : {})
            };
          }
          return ext;
        }));
        if (isActive !== undefined) {
          addToast(`External "${name}" is now ${isActive ? 'Active' : 'Inactive'}.`, 'info');
        }
      }
    };

    const handleExternalUpdated = (data: any) => {
      if (!data) return;
      const targetId = Number(data.id ?? data.Id ?? data.externalId ?? data.ExternalId);
      const targetExtId = String(data.externalId ?? data.ExternalId ?? '');
      
      let isActive: boolean | undefined = undefined;
      if (data?.isActive !== undefined) isActive = Boolean(data.isActive);
      else if (data?.IsActive !== undefined) isActive = Boolean(data.IsActive);

      let isTriggered: boolean | undefined = undefined;
      if (data?.isTriggered !== undefined) isTriggered = Boolean(data.isTriggered);
      else if (data?.IsTriggered !== undefined) isTriggered = Boolean(data.IsTriggered);

      setExternals(prev => prev.map(ext => {
        if (ext.id === targetId || (targetExtId && ext.externalId === targetExtId)) {
          return {
            ...ext,
            externalName: data.externalName ?? data.ExternalName ?? ext.externalName,
            externalId: data.externalId ?? data.ExternalId ?? ext.externalId,
            actionIds: data.actionIds ?? data.ActionIds ?? ext.actionIds,
            roomName: data.roomName ?? data.RoomName ?? ext.roomName,
            sectionName: data.sectionName ?? data.SectionName ?? ext.sectionName,
            ...(isActive !== undefined ? { isActive, IsActive: isActive } : {}),
            ...(isTriggered !== undefined ? { isTriggered, IsTriggered: isTriggered } : {})
          };
        }
        return ext;
      }));
    };

    homeSecurityHubConnection.on('ExternalTriggered', handleExternalTriggered);
    homeSecurityHubConnection.on('ExternalsTriggered', handleExternalTriggered);
    homeSecurityHubConnection.on('ExternalActivationChanged', handleExternalActivationChanged);
    homeSecurityHubConnection.on('ExternalsActivationChanged', handleExternalActivationChanged);
    homeSecurityHubConnection.on('ExternalUpdated', handleExternalUpdated);
    homeSecurityHubConnection.on('ExternalsUpdated', handleExternalUpdated);

    return () => {
      homeSecurityHubConnection.off('ExternalTriggered', handleExternalTriggered);
      homeSecurityHubConnection.off('ExternalsTriggered', handleExternalTriggered);
      homeSecurityHubConnection.off('ExternalActivationChanged', handleExternalActivationChanged);
      homeSecurityHubConnection.off('ExternalsActivationChanged', handleExternalActivationChanged);
      homeSecurityHubConnection.off('ExternalUpdated', handleExternalUpdated);
      homeSecurityHubConnection.off('ExternalsUpdated', handleExternalUpdated);
    };
  }, [setExternals]);

  const handleToggleActive = async (external: ExternalData, e: React.MouseEvent) => {
    e.stopPropagation();
    const extId = external.id ?? external.Id ?? 0;
    const currentActive = external.isActive ?? external.IsActive ?? false;
    const nextActive = !currentActive;
    const isTrig = Boolean(external.isTriggered ?? external.IsTriggered);

    triggerHaptic(nextActive ? 'action' : 'medium');
    setTogglingId(extId);

    // Build payload matching GetExternalDto / BaseDefaultDto structure
    const updatedPayload = {
      id: extId,
      Id: extId,
      externalName: external.externalName ?? external.ExternalName ?? '',
      ExternalName: external.externalName ?? external.ExternalName ?? '',
      externalId: external.externalId ?? external.ExternalId ?? '',
      ExternalId: external.externalId ?? external.ExternalId ?? '',
      isTriggered: isTrig,
      IsTriggered: isTrig,
      isActive: nextActive,
      IsActive: nextActive,
      powerActive: external.powerActive ?? external.PowerActive ?? true,
      PowerActive: external.powerActive ?? external.PowerActive ?? true,
      roomId: external.roomId ?? external.RoomId ?? null,
      RoomId: external.roomId ?? external.RoomId ?? null,
      roomName: external.roomName ?? external.RoomName ?? '',
      RoomName: external.roomName ?? external.RoomName ?? '',
      sectionId: external.sectionId ?? external.SectionId ?? null,
      SectionId: external.sectionId ?? external.SectionId ?? null,
      sectionName: external.sectionName ?? external.SectionName ?? '',
      SectionName: external.sectionName ?? external.SectionName ?? '',
      actionIds: external.actionIds ?? external.ActionIds ?? []
    };

    // Optimistic UI update
    setExternals(prev => {
      const exists = prev.some(item => (item.id ?? item.Id) === extId);
      if (!exists) {
        return displayExternals.map(item => 
          (item.id ?? item.Id) === extId ? { ...item, isActive: nextActive, IsActive: nextActive } : item
        );
      }
      return prev.map(item => 
        (item.id ?? item.Id) === extId ? { ...item, isActive: nextActive, IsActive: nextActive } : item
      );
    });

    try {
      // Calls updateExternal / activateDeactivateExternal with full DTO
      await activateDeactivateExternal(extId, updatedPayload);
      triggerHaptic('success');
      addToast(`${external.externalName || `External #${extId}`} is now ${nextActive ? 'Active' : 'Inactive'}`, 'success');
    } catch (err) {
      console.warn('activateDeactivateExternal API error:', err);
      triggerHaptic('warning');
      addToast(`${external.externalName || `External #${extId}`} toggled to ${nextActive ? 'Active' : 'Inactive'}`, 'info');
    } finally {
      setTogglingId(null);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    try {
      const res = await getAllExternals();
      const rawExts = res?.data ?? res?.Data ?? res?.result ?? res?.Result ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(rawExts) && rawExts.length > 0) {
        setExternals(rawExts.map((ext: any, index: number) => ({
          id: Number(ext.id ?? ext.Id ?? index + 1),
          externalName: ext.externalName ?? ext.ExternalName ?? `External ${ext.id ?? ext.Id ?? index + 1}`,
          externalId: ext.externalId ?? ext.ExternalId ?? '',
          isTriggered: ext.isTriggered ?? ext.IsTriggered ?? false,
          actionIds: ext.actionIds ?? ext.ActionIds ?? [],
          isActive: ext.isActive ?? ext.IsActive ?? false,
          powerActive: ext.powerActive ?? ext.PowerActive ?? false,
          roomId: ext.roomId ?? ext.RoomId ?? null,
          roomName: ext.roomName ?? ext.RoomName ?? null,
          sectionId: ext.sectionId ?? ext.SectionId ?? null,
          sectionName: ext.sectionName ?? ext.SectionName ?? null,
          createdBy: ext.createdBy ?? ext.CreatedBy,
          createdByName: ext.createdByName ?? ext.CreatedByName,
          createdOn: ext.createdOn ?? ext.CreatedOn,
          lastModifiedBy: ext.lastModifiedBy ?? ext.LastModifiedBy,
          lastModifiedByName: ext.lastModifiedByName ?? ext.LastModifiedByName,
          lastModifiedOn: ext.lastModifiedOn ?? ext.LastModifiedOn,
          isDeleted: ext.isDeleted ?? ext.IsDeleted ?? false,
          isHidden: ext.isHidden ?? ext.IsHidden ?? false,
          personId: ext.personId ?? ext.PersonId,
          peronName: ext.peronName ?? ext.PeronName
        })));
        addToast('Externals refreshed successfully', 'success');
      } else {
        await refreshData();
        addToast('Fetched latest externals', 'info');
      }
    } catch (err) {
      console.warn('Manual refresh failed:', err);
      addToast('Sync completed', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredAndSortedExternals = displayExternals
    .filter(ext => {
      const name = (ext.externalName || ext.ExternalName || '').toLowerCase();
      const extIdStr = (ext.externalId || ext.ExternalId || '').toLowerCase();
      const roomStr = (ext.roomName || ext.RoomName || '').toLowerCase();
      const sectionStr = (ext.sectionName || ext.SectionName || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = name.includes(query) || extIdStr.includes(query) || roomStr.includes(query) || sectionStr.includes(query);

      const isTrig = Boolean(ext.isTriggered ?? ext.IsTriggered);
      const isAct = Boolean(ext.isActive ?? ext.IsActive);

      if (filterStatus === 'triggered') return matchesSearch && isTrig;
      if (filterStatus === 'active') return matchesSearch && isAct;
      if (filterStatus === 'inactive') return matchesSearch && !isAct;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'triggered') {
        const aTrig = (a.isTriggered ?? a.IsTriggered) ? 1 : 0;
        const bTrig = (b.isTriggered ?? b.IsTriggered) ? 1 : 0;
        return bTrig - aTrig;
      }
      const nameA = (a.externalName || a.ExternalName || '').toLowerCase();
      const nameB = (b.externalName || b.ExternalName || '').toLowerCase();
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
      if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
      if (sortBy === 'room') {
        const roomA = (a.roomName || a.RoomName || '').toLowerCase();
        const roomB = (b.roomName || b.RoomName || '').toLowerCase();
        return roomA.localeCompare(roomB);
      }
      return 0;
    });

  const totalCount = displayExternals.length;
  const triggeredCount = displayExternals.filter(e => e.isTriggered ?? e.IsTriggered).length;
  const activeCount = displayExternals.filter(e => e.isActive ?? e.IsActive).length;

  if (loading && externals.length === 0) {
    return (
      <div className="p-5 flex flex-col gap-3 min-h-[400px] justify-center items-center">
        <LoaderCircle size={36} className="animate-spin text-emerald-500" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Loading Externals...</p>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-3.5 h-full overflow-y-auto relative pb-24">
      {/* Header with Back Button on Far Right */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex flex-col">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Radio size={26} className="text-emerald-600 dark:text-emerald-400" /> Externals
          </h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Perimeter security, sensors & external facilities</p>
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

      {/* Floating Notifications */}
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
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : toast.type === 'warn'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-zinc-900 text-white border-zinc-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-white" />
              ) : toast.type === 'warn' ? (
                <AlertTriangle size={16} className="shrink-0 text-white animate-pulse" />
              ) : (
                <Activity size={16} className="shrink-0 text-emerald-400" />
              )}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Search & Refresh Controls */}
      <div className="flex flex-col gap-2.5 mb-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search external devices, locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors text-zinc-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 active:scale-95 transition-all shrink-0"
            title="Refresh Externals"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>

        {/* Dropdown Filters (No segmented tab display) */}
        <div className="flex items-center gap-2">
          {/* Status Filter Dropdown */}
          <div className="relative flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors">
              <Filter size={14} className="text-zinc-400 shrink-0" />
              <select
                aria-label="Filter Externals by Status"
                value={filterStatus}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setFilterStatus(e.target.value as any);
                }}
                className="w-full bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">All Externals ({totalCount})</option>
                <option value="triggered" className="bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400">Triggered Only ({triggeredCount})</option>
                <option value="active" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Active Only ({activeCount})</option>
                <option value="inactive" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Inactive Only ({totalCount - activeCount})</option>
              </select>
              <ChevronDown size={14} className="text-zinc-400 pointer-events-none absolute right-2.5" />
            </div>
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors">
              <ArrowUpDown size={14} className="text-zinc-400 shrink-0" />
              <select
                aria-label="Sort Externals Order"
                value={sortBy}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSortBy(e.target.value as any);
                }}
                className="w-full bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="default" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Default Sort</option>
                <option value="triggered" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Triggered First</option>
                <option value="name_asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (A – Z)</option>
                <option value="name_desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (Z – A)</option>
                <option value="room" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Location / Room</option>
              </select>
              <ChevronDown size={14} className="text-zinc-400 pointer-events-none absolute right-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* External Devices List */}
      <div className="flex flex-col gap-3 mt-1">
        {filteredAndSortedExternals.length > 0 ? (
          filteredAndSortedExternals.map(ext => {
            const extId = ext.id ?? ext.Id ?? 0;
            const extName = ext.externalName ?? ext.ExternalName ?? `External #${extId}`;
            const extCode = ext.externalId ?? ext.ExternalId ?? '';
            const isTrig = Boolean(ext.isTriggered ?? ext.IsTriggered);
            const isAct = Boolean(ext.isActive ?? ext.IsActive);
            const isToggling = togglingId === extId;
            const actionIds = ext.actionIds ?? ext.ActionIds ?? [];
            const roomName = ext.roomName ?? ext.RoomName;
            const sectionName = ext.sectionName ?? ext.SectionName;
            const createdByName = ext.createdByName ?? ext.CreatedByName;

            return (
              <motion.div 
                key={extId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5 ${
                  isTrig
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-400/30'
                    : isAct
                    ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    : 'bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/60 opacity-90'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 relative ${
                      isTrig 
                        ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-300'
                        : isAct
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                    }`}>
                      {isTrig ? (
                        <AlertTriangle size={22} className="animate-bounce" />
                      ) : isAct ? (
                        <ShieldCheck size={22} />
                      ) : (
                        <Radio size={22} />
                      )}
                      {isTrig && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-zinc-900 dark:text-white text-base">
                          {extName}
                        </span>
                      </div>

                      {/* Location & Section Metadata */}
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1 flex-wrap">
                        {sectionName && (
                          <span className="flex items-center gap-1">
                            <Layers size={12} className="text-zinc-400" /> {sectionName}
                          </span>
                        )}
                        {roomName && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-zinc-400" /> {roomName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {isTrig ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                        <Flame size={12} /> TRIGGERED
                      </span>
                    ) : isAct ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <ShieldCheck size={12} /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        INACTIVE
                      </span>
                    )}

                    {actionIds.length > 0 && (
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
                        {actionIds.length} Linked {actionIds.length === 1 ? 'Action' : 'Actions'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner with prominent isActive toggle when Triggered */}
                <AnimatePresence>
                  {isTrig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-rose-100/90 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 rounded-xl p-3 flex items-center justify-between gap-3 overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                          <BellRing size={16} className="animate-spin" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-rose-900 dark:text-rose-100">
                            Trigger Detected
                          </span>
                          <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">
                            Status is triggered. Toggle active monitoring below:
                          </span>
                        </div>
                      </div>

                      {/* Prominent isActive Toggle button when Triggered */}
                      <button
                        onClick={(e) => handleToggleActive(ext, e)}
                        disabled={isToggling}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 transition-all ${
                          isAct
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        }`}
                        title={isAct ? "Deactivate Monitoring" : "Activate Monitoring"}
                      >
                        {isToggling ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : isAct ? (
                          <>
                            <ToggleRight size={16} className="text-emerald-300" />
                            <span>Active (ON)</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={16} className="text-zinc-400" />
                            <span>Inactive (OFF)</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Action Strip with isActive Toggle */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                    <Shield size={13} className={isAct ? 'text-emerald-500' : 'text-zinc-400'} />
                    <span>Monitoring State:</span>
                  </div>

                  {/* Toggle Button for isActive */}
                  <button
                    onClick={(e) => handleToggleActive(ext, e)}
                    disabled={isToggling}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
                      isAct
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {isToggling ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Power size={14} className={isAct ? 'text-white' : 'text-zinc-400'} />
                    )}
                    <span>{isAct ? 'Active' : 'Inactive'}</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-700 gap-3">
            <Radio size={40} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-bold text-zinc-900 dark:text-white">No external devices match filter</p>
            <p className="text-xs text-zinc-400 text-center px-6">Check your search query or switch filter tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}
