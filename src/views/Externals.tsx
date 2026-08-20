import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Radio, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Sun, 
  Moon, 
  Lock, 
  Unlock, 
  Power, 
  Sliders, 
  Activity, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  BellRing
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface ExternalsProps {
  key?: React.Key;
  onBack?: () => void;
}

interface ExternalDevice {
  id: string;
  name: string;
  category: 'gates' | 'lighting' | 'sensors' | 'relays';
  type: string;
  status: 'active' | 'inactive' | 'open' | 'closed' | 'locked' | 'armed' | 'triggered';
  isOn?: boolean;
  isLocked?: boolean;
  value?: string;
  battery?: number;
  lastActivity?: string;
  location: string;
}

const INITIAL_DEVICES: ExternalDevice[] = [
  {
    id: 'ext-gate-1',
    name: 'Main Driveway Gate',
    category: 'gates',
    type: 'Motorized Sliding Gate',
    status: 'closed',
    isLocked: true,
    isOn: false,
    value: 'Closed & Locked',
    battery: 100,
    lastActivity: '2 mins ago',
    location: 'Front Entrance'
  },
  {
    id: 'ext-gate-2',
    name: 'Pedestrian Turnstile',
    category: 'gates',
    type: 'Electronic Access Gate',
    status: 'locked',
    isLocked: true,
    isOn: true,
    value: 'RFID Reader Active',
    battery: 98,
    lastActivity: '12 mins ago',
    location: 'East Walkway'
  },
  {
    id: 'ext-gate-3',
    name: 'North Service Barrier',
    category: 'gates',
    type: 'Automatic Boom Barrier',
    status: 'closed',
    isLocked: true,
    isOn: false,
    value: 'Auto-Close Enabled',
    battery: 95,
    lastActivity: '1 hour ago',
    location: 'North Perimeter'
  },
  {
    id: 'ext-light-1',
    name: 'Perimeter Floodlights',
    category: 'lighting',
    type: 'High-Output LED 8000lm',
    status: 'active',
    isOn: true,
    value: 'Auto Motion Mode',
    lastActivity: 'Active',
    location: 'Outer Perimeter Fence'
  },
  {
    id: 'ext-light-2',
    name: 'Driveway Courtyard Lights',
    category: 'lighting',
    type: 'Pathway Illumination',
    status: 'active',
    isOn: false,
    value: 'Scheduled (Dusk-Dawn)',
    lastActivity: 'Off',
    location: 'Driveway & Entry'
  },
  {
    id: 'ext-light-3',
    name: 'Backyard Spotlights',
    category: 'lighting',
    type: 'Security Dual Floodlight',
    status: 'active',
    isOn: false,
    value: 'PIR Motion Armed',
    lastActivity: 'Off',
    location: 'Rear Yard'
  },
  {
    id: 'ext-sensor-1',
    name: 'Boundary Infrared Beam',
    category: 'sensors',
    type: 'Dual Photoelectric Beam',
    status: 'armed',
    isOn: true,
    value: 'Perimeter Clear',
    battery: 92,
    lastActivity: 'Normal',
    location: 'North & East Boundary'
  },
  {
    id: 'ext-sensor-2',
    name: 'External Weather Station',
    category: 'sensors',
    type: 'Solar Weather Unit',
    status: 'active',
    isOn: true,
    value: '22°C • 48% RH • 8 km/h NW',
    battery: 99,
    lastActivity: 'Just now',
    location: 'Roof Mast'
  },
  {
    id: 'ext-sensor-3',
    name: 'Perimeter Siren & Strobe',
    category: 'sensors',
    type: '115dB High Siren',
    status: 'armed',
    isOn: true,
    value: 'Armed & Ready',
    battery: 100,
    lastActivity: 'Self-test Passed',
    location: 'Main Tower'
  },
  {
    id: 'ext-relay-1',
    name: 'Outdoor Power Socket Relay',
    category: 'relays',
    type: '16A Smart Relay',
    status: 'active',
    isOn: false,
    value: 'Off',
    lastActivity: 'Idle',
    location: 'Pool & Garden Area'
  },
  {
    id: 'ext-relay-2',
    name: 'External Intercom Unit',
    category: 'relays',
    type: '2-Way HD Video Callbox',
    status: 'active',
    isOn: true,
    value: 'Online • SIP Ready',
    lastActivity: 'Standby',
    location: 'Gate Post'
  }
];

export default function Externals({ onBack }: ExternalsProps) {
  const [devices, setDevices] = useState<ExternalDevice[]>(() => {
    const saved = localStorage.getItem('hanssonhub_external_devices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DEVICES;
      }
    }
    return INITIAL_DEVICES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'gates' | 'lighting' | 'sensors' | 'relays'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);

  useEffect(() => {
    localStorage.setItem('hanssonhub_external_devices', JSON.stringify(devices));
  }, [devices]);

  const addToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleToggleGateLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    setTogglingId(id);

    setTimeout(() => {
      setDevices(prev => prev.map(dev => {
        if (dev.id === id) {
          const nextLocked = !dev.isLocked;
          triggerHaptic(nextLocked ? 'lock' : 'unlock');
          addToast(`${dev.name} is now ${nextLocked ? 'Locked' : 'Unlocked'}`, 'success');
          return {
            ...dev,
            isLocked: nextLocked,
            status: nextLocked ? 'locked' : (dev.isOn ? 'open' : 'closed'),
            value: nextLocked ? 'Locked & Secured' : (dev.isOn ? 'Open' : 'Closed (Unlocked)')
          };
        }
        return dev;
      }));
      setTogglingId(null);
    }, 350);
  };

  const handleToggleGateOpen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('action');
    setTogglingId(id);

    setTimeout(() => {
      setDevices(prev => prev.map(dev => {
        if (dev.id === id) {
          const nextOpen = !dev.isOn;
          triggerHaptic('success');
          addToast(`${dev.name} ${nextOpen ? 'Opened' : 'Closed'}`, 'success');
          return {
            ...dev,
            isOn: nextOpen,
            status: nextOpen ? 'open' : 'closed',
            value: nextOpen ? 'Gate Open' : 'Gate Closed'
          };
        }
        return dev;
      }));
      setTogglingId(null);
    }, 450);
  };

  const handleTogglePower = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    setTogglingId(id);

    setTimeout(() => {
      setDevices(prev => prev.map(dev => {
        if (dev.id === id) {
          const nextState = !dev.isOn;
          triggerHaptic('success');
          addToast(`${dev.name} turned ${nextState ? 'ON' : 'OFF'}`, 'success');
          return {
            ...dev,
            isOn: nextState,
            status: nextState ? 'active' : 'inactive',
            value: nextState ? 'Active / Output ON' : 'Off / Standby'
          };
        }
        return dev;
      }));
      setTogglingId(null);
    }, 250);
  };

  const handleTestSiren = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('warning');
    addToast('Perimeter Siren test strobe pulse triggered (3s)', 'warn');
  };

  const filteredDevices = devices.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dev.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dev.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || dev.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const armedSensorsCount = devices.filter(d => d.category === 'sensors' && d.status === 'armed').length;
  const gatesCount = devices.filter(d => d.category === 'gates').length;
  const activeLightsCount = devices.filter(d => d.category === 'lighting' && d.isOn).length;

  return (
    <div className="p-5 flex flex-col gap-3 h-full overflow-y-auto relative pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {onBack && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            className="p-2 -ml-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all flex items-center gap-1 font-bold text-xs shrink-0 shadow-sm border border-zinc-200/60 dark:border-zinc-700"
            aria-label="Back to Facilities"
            title="Back to Facilities"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex flex-col">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Radio size={26} className="text-emerald-600" /> Externals
          </h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Perimeter gates, outdoor lighting & external sensors</p>
        </div>
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
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : toast.type === 'warn'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-zinc-900 text-white border-zinc-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-white" />
              ) : toast.type === 'warn' ? (
                <AlertTriangle size={16} className="shrink-0 text-white" />
              ) : (
                <Activity size={16} className="shrink-0 text-emerald-400" />
              )}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-2.5 mb-1">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 p-3 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Perimeter</span>
          <span className="text-base font-black text-emerald-900 dark:text-emerald-200 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" /> Armed
          </span>
          <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold mt-0.5">{armedSensorsCount} Active Beams</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-3 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Gates</span>
          <span className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
            {gatesCount} Access Pts
          </span>
          <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">All Monitored</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 p-3 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Floodlights</span>
          <span className="text-base font-black text-amber-900 dark:text-amber-200 mt-0.5 flex items-center gap-1">
            <Sun size={16} className="text-amber-600" /> {activeLightsCount} ON
          </span>
          <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-semibold mt-0.5">PIR Motion Ready</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative my-1">
        <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input 
          type="text" 
          autoComplete="off"
          placeholder="Search gates, floodlights, sensors..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-black dark:focus:border-white rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors text-zinc-900 dark:text-white"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        {[
          { key: 'all', label: 'All Externals' },
          { key: 'gates', label: 'Gates & Entry' },
          { key: 'lighting', label: 'Perimeter Lights' },
          { key: 'sensors', label: 'Sensors & Alarms' },
          { key: 'relays', label: 'Relays & Audio' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab(tab.key as any);
            }}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Devices List */}
      <div className="flex flex-col gap-3 mt-1">
        {filteredDevices.length > 0 ? (
          filteredDevices.map(dev => {
            const isToggling = togglingId === dev.id;

            return (
              <div 
                key={dev.id}
                className="border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      dev.category === 'gates' 
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 text-amber-600'
                        : dev.category === 'lighting'
                        ? 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 text-yellow-600'
                        : dev.category === 'sensors'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-600'
                        : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 text-indigo-600'
                    }`}>
                      {dev.category === 'gates' && <Lock size={20} />}
                      {dev.category === 'lighting' && <Sun size={20} />}
                      {dev.category === 'sensors' && <ShieldCheck size={20} />}
                      {dev.category === 'relays' && <Zap size={20} />}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-black text-zinc-900 dark:text-white text-sm">{dev.name}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold">{dev.type} • {dev.location}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          dev.isLocked
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                            : dev.isOn
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {dev.value}
                        </span>
                        {dev.battery !== undefined && (
                          <span className="text-[10px] text-zinc-400 font-bold">
                            🔋 {dev.battery}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions depending on category */}
                  <div className="flex items-center gap-1.5">
                    {dev.category === 'gates' && (
                      <>
                        <button
                          onClick={(e) => handleToggleGateLock(dev.id, e)}
                          disabled={isToggling}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 active:scale-95 transition-all"
                          title={dev.isLocked ? "Unlock Gate" : "Lock Gate"}
                        >
                          {dev.isLocked ? <Unlock size={17} className="text-zinc-400" /> : <Lock size={17} className="text-amber-500" />}
                        </button>

                        <button
                          onClick={(e) => handleToggleGateOpen(dev.id, e)}
                          disabled={isToggling || dev.isLocked}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm ${
                            dev.isLocked
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50'
                              : dev.isOn
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {dev.isOn ? 'Close' : 'Open'}
                        </button>
                      </>
                    )}

                    {dev.category === 'lighting' && (
                      <button
                        onClick={(e) => handleTogglePower(dev.id, e)}
                        disabled={isToggling}
                        className={`p-2.5 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                          dev.isOn
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                        }`}
                        title={dev.isOn ? "Turn Off" : "Turn On"}
                      >
                        <Power size={18} />
                      </button>
                    )}

                    {dev.category === 'sensors' && dev.id === 'ext-sensor-3' && (
                      <button
                        onClick={(e) => handleTestSiren(dev.id, e)}
                        className="px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 active:scale-95 transition-all flex items-center gap-1"
                        title="Test Strobe Pulse"
                      >
                        <BellRing size={14} /> Test
                      </button>
                    )}

                    {dev.category === 'relays' && (
                      <button
                        onClick={(e) => handleTogglePower(dev.id, e)}
                        disabled={isToggling}
                        className={`p-2.5 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                          dev.isOn
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                        }`}
                        title={dev.isOn ? "Switch Relay Off" : "Switch Relay On"}
                      >
                        <Power size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-700 gap-3">
            <Radio size={40} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-bold text-zinc-900 dark:text-white">No external devices match filter</p>
            <p className="text-xs text-zinc-400 text-center px-6">Check your search query or switch filter category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
