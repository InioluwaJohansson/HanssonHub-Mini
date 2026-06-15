import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Splash from './components/Splash';
import Login from './components/Login';
import Authorization from './views/Authorization';
import { Header } from './components/Header';
import { BottomNav, ViewType } from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Doors from './views/Doors';
import Cameras from './views/Cameras';
import Chats from './views/Chats';
import Settings from './views/Settings';
import { startHomeSecurityHub, startChatHub, homeSecurityHubConnection, chatHubConnection } from './utils/signalr';
import { LoaderCircle } from 'lucide-react';

import Logs from './views/Logs';

type AppState = 'splash' | 'login' | 'auth' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [transitionDir, setTransitionDir] = useState(1); // 1 for left (forward), -1 for right (backward)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [navHidden, setNavHidden] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (appState === 'app' && authVerified) {
      startHomeSecurityHub();
      startChatHub();
    } else {
      homeSecurityHubConnection.stop();
      chatHubConnection.stop();
    }
  }, [appState, authVerified]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < -40 && !isPulling && !navHidden) {
      setIsPulling(true);
      setRefreshKey(prev => prev + 1);
      setTimeout(() => setIsPulling(false), 1500);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && !isPulling && !navHidden) {
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isPulling && !navHidden) {
      setIsPulling(true);
      setRefreshKey(prev => prev + 1);
      setTimeout(() => {
        setIsPulling(false);
      }, 1500);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  const setAppStateWithTransition = (newState: AppState, direction: number) => {
    setTransitionDir(direction);
    setAppState(newState);
  };

  const handleLoginSuccess = () => {
    setAppStateWithTransition('auth', 1);
  };

  const handleAuthSuccess = () => {
    setAuthVerified(true);
    setAppStateWithTransition('app', 1);
  };

  const handleAuthFailMax = () => {
    setAuthVerified(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_details');
    localStorage.removeItem('biometric_stored_token');
    setAppStateWithTransition('login', -1);
  };

  const handleLogout = () => {
    setAuthVerified(false);
    localStorage.removeItem('auth_token');
    setAppStateWithTransition('login', -1);
  };

  const getAnimationVariants = () => ({
    initial: (dir: number) => ({
      x: dir === 1 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as const,
      width: '100%',
      height: '100%'
    }),
    animate: {
      x: 0,
      opacity: 1,
      position: 'relative' as const,
      width: '100%',
      height: '100%'
    },
    exit: (dir: number) => ({
      x: dir === 1 ? '-100%' : '100%',
      opacity: 0,
      position: 'absolute' as const,
      width: '100%',
      height: '100%'
    })
  });

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans tracking-normal overflow-hidden select-none">
      <div className="w-full h-[100dvh] md:w-full md:h-full landscape:w-full landscape:h-[100dvh] landscape:max-w-full landscape:max-h-full landscape:rounded-none landscape:border-none sm:w-[375px] sm:h-[667px] sm:max-h-[90vh] bg-white sm:rounded-[3rem] sm:shadow-[0_32px_64px_rgba(0,0,0,0.15)] overflow-hidden relative sm:border-[8px] sm:border-zinc-900 flex flex-col transition-all duration-300">
        
        {appState === 'splash' && (
          <Splash onComplete={() => setAppStateWithTransition('login', 1)} />
        )}

        <AnimatePresence initial={false} custom={transitionDir}>
          {appState === 'login' && (
            <motion.div
              key="login"
              custom={transitionDir}
              variants={getAnimationVariants()}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white"
            >
              <Login onLogin={handleLoginSuccess} />
            </motion.div>
          )}

          {appState === 'auth' && (
            <motion.div
              key="auth"
              custom={transitionDir}
              variants={getAnimationVariants()}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white"
            >
              <Authorization onSuccess={handleAuthSuccess} onFailMax={handleAuthFailMax} />
            </motion.div>
          )}

          {appState === 'app' && (
            <motion.div
              key="app"
              custom={transitionDir}
              variants={getAnimationVariants()}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex flex-col h-full bg-white relative w-full overflow-hidden"
            >
              <Header onLogout={handleLogout} setView={setCurrentView} />
              
              <main 
                ref={scrollRef}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex-1 overflow-x-hidden overflow-y-auto relative w-full touch-pan-y ios-bounce"
              >
                <div 
                  className="w-full flex justify-center overflow-hidden transition-all duration-300" 
                  style={{ height: pullDistance > 0 ? pullDistance * 0.4 : 0, opacity: pullDistance > 0 ? 1 : 0 }}
                >
                  <div className="mt-4"><LoaderCircle className="animate-spin text-zinc-400" size={24} /></div>
                </div>
                {isPulling && pullDistance === 0 && (
                  <div className="w-full flex justify-center py-4 text-zinc-400 z-50 transition-all duration-300">
                    <LoaderCircle className="animate-spin" size={24} />
                  </div>
                )}
                {currentView === 'dashboard' && <Dashboard key={`dash-${refreshKey}`} />}
                {currentView === 'doors' && <Doors key={`door-${refreshKey}`} />}
                {currentView === 'cameras' && <Cameras key={`cam-${refreshKey}`} />}
                {currentView === 'chats' && <div key={`chat-${refreshKey}`} className="contents"><Chats onChatActive={(active) => setNavHidden(active)} /></div>}
                {currentView === 'logs' && <Logs key={`log-${refreshKey}`} />}
                {currentView === 'settings' && <Settings key={`set-${refreshKey}`} />}
              </main>
              
              {!navHidden && <BottomNav currentView={currentView} setView={setCurrentView} />}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
