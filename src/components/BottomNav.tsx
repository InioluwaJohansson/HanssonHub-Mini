import { LayoutDashboard, Building2, MessageCircle, FileText } from 'lucide-react';
import { getUserDetails } from '../utils/api';
import { triggerHaptic } from '../utils/haptics';

export type ViewType = 'dashboard' | 'facilities' | 'cameras' | 'doors' | 'actions' | 'externals' | 'chats' | 'logs' | 'settings';

type NavItemProps = {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  activeColorClass: string;
};

function NavItem({ icon: Icon, label, active, onClick, activeColorClass }: NavItemProps) {
  return (
    <button 
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-95 ${
        active ? activeColorClass : 'text-zinc-400 hover:text-zinc-600'
      }`}
    >
      <div className={`p-1.5 rounded-full transition-colors ${active ? activeColorClass.replace('text-', 'bg-').replace('600', '50') : ''}`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[8px] font-bold uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

export function BottomNav({ currentView, setView }: { currentView: ViewType, setView: (v: ViewType) => void }) {
  const userDetails = getUserDetails();
  const userRole = String(userDetails?.RoleName || userDetails?.roleName || userDetails?.role || userDetails?.Role || '');
  const canViewLogs = userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'wife';

  const isFacilitiesActive = currentView === 'facilities' || 
    currentView === 'cameras' || 
    currentView === 'doors' || 
    currentView === 'actions' || 
    currentView === 'externals';

  return (
    <nav className="h-[72px] border-t border-black bg-white flex items-center justify-around px-2 pb-safe z-40 relative shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <NavItem 
        icon={LayoutDashboard} 
        label="Home" 
        activeColorClass="text-blue-600"
        active={currentView === 'dashboard'} 
        onClick={() => setView('dashboard')} 
      />
      <NavItem 
        icon={Building2} 
        label="Facilities" 
        activeColorClass="text-purple-600"
        active={isFacilitiesActive} 
        onClick={() => setView('facilities')} 
      />
      <NavItem 
        icon={MessageCircle} 
        label="Chats" 
        activeColorClass="text-emerald-600"
        active={currentView === 'chats'} 
        onClick={() => setView('chats')} 
      />
      {canViewLogs && (
        <NavItem 
          icon={FileText} 
          label="Logs" 
          activeColorClass="text-rose-600"
          active={currentView === 'logs'} 
          onClick={() => setView('logs')} 
        />
      )}
    </nav>
  );
}
