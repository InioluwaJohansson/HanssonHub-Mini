import { useState, useEffect } from 'react';
import Splash from './components/Splash';
import Login from './components/Login';
import { Header } from './components/Header';
import { BottomNav, ViewType } from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Doors from './views/Doors';
import Cameras from './views/Cameras';
import Chats from './views/Chats';
import { startHomeSecurityHub, startChatHub, homeSecurityHubConnection, chatHubConnection } from './utils/signalr';

import Logs from './views/Logs';

type AppState = 'splash' | 'login' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    if (appState === 'app') {
      startHomeSecurityHub();
      startChatHub();
    } else {
      homeSecurityHubConnection.stop();
      chatHubConnection.stop();
    }
  }, [appState]);

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans tracking-normal overflow-hidden select-none">
      {/* Mobile Shell Wrapper with landscape support */}
      <div className="w-full h-[100dvh] md:w-full md:h-full landscape:w-full landscape:h-[100dvh] landscape:max-w-full landscape:max-h-full landscape:rounded-none landscape:border-none sm:w-[375px] sm:h-[667px] sm:max-h-[90vh] bg-white sm:rounded-[3rem] sm:shadow-[0_32px_64px_rgba(0,0,0,0.15)] overflow-hidden relative sm:border-[8px] sm:border-zinc-900 flex flex-col transition-all duration-300">
        
        {appState === 'splash' && (
          <Splash onComplete={() => setAppState('login')} />
        )}

        {appState === 'login' && (
          <Login onLogin={() => setAppState('app')} />
        )}

        {appState === 'app' && (
          <div className="flex flex-col h-full bg-white relative w-full overflow-hidden">
            <Header onLogout={() => setAppState('login')} />
            
            <main className="flex-1 overflow-x-hidden overflow-y-auto relative w-full touch-pan-y">
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'doors' && <Doors />}
              {currentView === 'cameras' && <Cameras />}
              {currentView === 'chats' && <Chats onChatActive={(active) => setNavHidden(active)} />}
              {currentView === 'logs' && <Logs />}
            </main>
            
            {!navHidden && <BottomNav currentView={currentView} setView={setCurrentView} />}
          </div>
        )}

      </div>
    </div>
  );
}
