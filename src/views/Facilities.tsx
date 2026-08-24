import React from 'react';
import { 
  Building2, 
  Video, 
  DoorClosed, 
  Play, 
  Radio, 
  ChevronRight, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Sun, 
  Lock, 
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import { ViewType } from '../components/BottomNav';
import { triggerHaptic } from '../utils/haptics';

interface FacilitiesProps {
  key?: React.Key;
  onNavigate: (view: ViewType) => void;
}

export default function Facilities({ onNavigate }: FacilitiesProps) {
  const { doors, cameras, actions, externals } = useData();

  const allDoorsLocked = doors.length > 0 && doors.every(d => d.isLocked);
  const activeActionsCount = actions.filter(a => a.actionActive ?? a.ActionActive ?? a.isActive ?? a.IsActive ?? false).length;
  const triggeredExternalsCount = externals.filter(e => e.isTriggered ?? e.IsTriggered).length;
  const activeExternalsCount = externals.filter(e => e.isActive ?? e.IsActive).length;

  const handleCardClick = (view: ViewType) => {
    triggerHaptic('medium');
    onNavigate(view);
  };

  const facilityModules = [
    {
      id: 'cameras',
      title: 'Cameras & Surveillance',
      badge: `${cameras.length} Active`,
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: Video,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
      description: 'Live RTSP/HLS video streams, high-definition camera feeds, PTZ controls, and saved motion recordings.',
      stats: [
        { label: 'Cameras Online', value: cameras.length }
      ]
    },
    {
      id: 'doors',
      title: 'Doors & Access Control',
      badge: `${doors.filter(d => d.isLocked).length}/${doors.length} Locked`,
      badgeColor: allDoorsLocked 
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: DoorClosed,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      description: 'Remote lock/unlock operations, door sensor telemetry, physical security zones, and entryway states.',
      stats: [
        { label: 'Total Access Pts', value: doors.length }
      ]
    },
    {
      id: 'actions',
      title: 'Automations & Actions',
      badge: `${activeActionsCount} Active Macros`,
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      icon: Play,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      description: 'Trigger automated routines, emergency responses, multi-step macros, and security sequences.',
      stats: [
        { label: 'Configured Routines', value: actions.length }
      ]
    },
    {
      id: 'externals',
      title: 'External Facilities',
      badge: triggeredExternalsCount > 0
        ? `${triggeredExternalsCount} Triggered!`
        : `${activeExternalsCount > 0 ? `${activeExternalsCount} Active` : 'Perimeter Armed'}`,
      badgeColor: triggeredExternalsCount > 0
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: Radio,
      iconColor: triggeredExternalsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      iconBg: triggeredExternalsCount > 0 
        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
        : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      description: 'Motorized vehicle gates, outdoor perimeter lighting, infrared boundary sensors, and external relays.',
      stats: [
        { label: 'Total Externals', value: externals.length > 0 ? externals.length : '5 Devices' },
        { label: 'Alert State', value: triggeredExternalsCount > 0 ? `${triggeredExternalsCount} Triggered` : 'All Clear' }
      ]
    }
  ];

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-1">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Building2 size={30} className="text-purple-600" /> Facilities
        </h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide">
          Manage hardware subsystems, surveillance, entryways, and external perimeters
        </p>
      </div>

      {/* Facilities Overview Status Card */}
      <div className="border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100/60 dark:from-zinc-900 dark:to-zinc-800/50 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-sm font-black text-zinc-900 dark:text-white">Facility Infrastructure</p>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              4 Subsystems Integrated & Operational
            </p>
          </div>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="flex flex-col gap-3.5">
        {facilityModules.map((mod, idx) => {
          const Icon = mod.icon;

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              onClick={() => handleCardClick(mod.id as ViewType)}
              className="border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${mod.iconBg} ${mod.iconColor}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 dark:text-white text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {mod.title}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 inline-block ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/80 group-hover:text-purple-600 dark:group-hover:text-purple-300 text-zinc-400 flex items-center justify-center transition-colors shrink-0">
                  <ChevronRight size={18} />
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                {mod.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-400">
                <div className="flex items-center gap-3">
                  {mod.stats.map((stat, sIdx) => (
                    <span key={sIdx} className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-400 font-normal">{stat.label}:</span> {stat.value}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
