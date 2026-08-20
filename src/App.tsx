import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Splash from './components/Splash';
import Login from './components/Login';
import Authorization from './views/Authorization';
import { Header } from './components/Header';
import { BottomNav, ViewType } from './components/BottomNav';
import Dashboard from './views/Dashboard';
import Facilities from './views/Facilities';
import Doors from './views/Doors';
import Actions from './views/Actions';
import Cameras from './views/Cameras';
import Externals from './views/Externals';
import Chats from './views/Chats';
import Settings from './views/Settings';
import { startHomeSecurityHub, homeSecurityHubConnection, rebuildHubConnections } from './utils/signalr';
import { LoaderCircle } from 'lucide-react';
import { refreshLoginToken, saveAppNamesList, getStoredAppNamesList, saveToken } from './utils/api';
import { playNotificationSound, stopAllSounds } from './utils/audio';
import { clearAllStores, clearStore, STORES } from './utils/db';

import Logs from './views/Logs';
import { useLogs } from './context/LogsContext';
import { useData } from './context/DataContext';

type AppState = 'splash' | 'login' | 'auth' | 'app';

export default function App() {
  const { clearLogs, fetchLogs } = useLogs();
  const { refreshData } = useData();
  const [appState, setAppState] = useState<AppState>(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return 'splash';
    const isVerified = localStorage.getItem('auth_verified') === 'true';
    if (!isVerified) return 'auth';
    const saved = localStorage.getItem('app_state');
    return (saved as AppState) || 'splash';
  });
  const [transitionDir, setTransitionDir] = useState(1); // 1 for left (forward), -1 for right (backward)
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('current_view');
    return (saved as ViewType) || 'dashboard';
  });
  const [navHidden, setNavHidden] = useState(false);
  const [authVerified, setAuthVerified] = useState<boolean>(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    return localStorage.getItem('auth_verified') === 'true';
  });
  const [isPulling, setIsPulling] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const handleLogoutRef = useRef<() => void>(() => {});

  const [refreshKey, setRefreshKey] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);

  const currentViewRef = useRef(currentView);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Floating curved overlay notification states
  const [activeNotification, setActiveNotification] = useState<{
    isOpen: boolean;
    senderName: string;
    senderPhoto: string;
    messageText: string;
  }>({
    isOpen: false,
    senderName: '',
    senderPhoto: '',
    messageText: ''
  });

  const notificationTimeoutRef = useRef<any>(null);

  const triggerNotification = (senderName: string, messageText: string, senderPhoto: string, chatId?: string) => {
    // Read notification settings
    const alertsEnabled = localStorage.getItem('alerts_enabled') !== 'false';
    if (!alertsEnabled) return;
    
    // Only suppress if we are ON the chats view AND looking at the exact same chat
    if (currentViewRef.current === 'chats') {
      const activeChatId = (window as any).__activeChatId;
      if (activeChatId && chatId && activeChatId === chatId) {
        return; // We are actively in the chat where the message was sent
      }
    }

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    // Set floating in-app notification variables
    setActiveNotification({
      isOpen: true,
      senderName,
      messageText,
      senderPhoto
    });

    // Close in exactly 7 seconds
    notificationTimeoutRef.current = setTimeout(() => {
      setActiveNotification(prev => ({ ...prev, isOpen: false }));
    }, 7000);

    // Minimize / background parsing hooks
    const isBackground = document.visibilityState === 'hidden';
    if (isBackground) {
      console.log("[BG_NOTIFICATION_PARSED]", JSON.stringify({ senderName, messageText, senderPhoto }));

      // Bridge for standard mobile wrappers or Cordova / native postMessage
      if (typeof (window as any).ReactNativeWebView !== 'undefined') {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: "notification",
          title: senderName,
          body: messageText,
          icon: senderPhoto
        }));
      }

      // Standalone browser Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(senderName, {
            body: messageText,
            icon: senderPhoto
          });
        }
      }
    }
  };

  // HTML5 Web notification permission request
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Attempt to refresh the token on interval
    const initTokenRefresh = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const res = await refreshLoginToken();
          if (res) {
            const newToken = typeof res === 'string' ? res : (res.token || res.Token || res.data?.token || res.Data?.Token || res.result?.token || res.Result?.Token);
            if (newToken) {
              saveToken(newToken);
              console.log("Token refreshed and saved successfully.");
            }
          }
        } catch (e) {
          console.error("Failed to refresh token", e);
        }
      }
    };
    
    // Set up a daily refresh timer just in case it stays open
    const interval = setInterval(initTokenRefresh, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to SignalR messages
  useEffect(() => {
    const handleReceivedMessage = (...args: any[]) => {
      console.log("[HOME_SIGNALR_EVENT: MessageSent/ReceiveMessage]", ...args);
      if (args.length === 0) return;
      
      let rawMsg = args[0];
      if (typeof args[0] === 'string' && args.length > 1 && typeof args[1] === 'object') {
        rawMsg = args[1];
      }
      
      if (!rawMsg) return;

      // Unpack rawMsg if nested inside result
      let msg = rawMsg;
      if (rawMsg && typeof rawMsg === 'object') {
        if ('result' in rawMsg && rawMsg.result) {
          msg = rawMsg.result;
        } else if ('Result' in rawMsg && rawMsg.Result) {
          msg = rawMsg.Result;
        }
      }

      const msgSenderId = msg.senderPersonId || msg.SenderPersonId || msg.personId || msg.PersonId || msg.senderId || msg.SenderId || 0;
      
      let senderName = msg.senderName || msg.SenderName || msg.fullName || msg.FullName || '';
      let senderPhoto = msg.senderProfileImageUrl || msg.SenderProfileImageUrl || msg.profileImageUrl || msg.ProfileImageUrl || msg.imageUrl || msg.ImageUrl || '';

      // Fallback: If person name or image url are not supplied, look them up in the app list (app_names_list)
      if (!senderName || !senderPhoto) {
        try {
          const appNames = getStoredAppNamesList();
          if (appNames) {
            const list = appNames.personIdNames || appNames.PersonIdNames || [];
            if (Array.isArray(list)) {
              const matchedPerson = list.find((p: any) => (p.id || p.Id) === msgSenderId);
              if (matchedPerson) {
                if (!senderName) {
                  senderName = matchedPerson.name || matchedPerson.Name || '';
                }
                if (!senderPhoto) {
                  senderPhoto = matchedPerson.imageUrl || matchedPerson.ImageUrl || '';
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse app_names_list in SignalR notification engine:", e);
        }
      }

      // If still not specified, use a friendly user ID tag
      if (!senderName) {
        senderName = `User #${msgSenderId}`;
      }

      // Resolve the sender's photo path using the specified storage URL if relative string
      const resolvePhotoUrl = (photo?: string) => {
        if (!photo) return '';
        if (photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://')) return photo;
        const cleanPath = photo.startsWith('/') ? photo.slice(1) : photo;
        const apiBase = localStorage.getItem('api_base_url') || 'https://kv5zhpcr-7190.uks1.devtunnels.ms';
        return `${apiBase}/storage/${cleanPath}`;
      };

      const finalPhoto = resolvePhotoUrl(senderPhoto);

      const text = msg.content || msg.Content || msg.text || msg.Text || (msg.type === 'image' || msg.type === 'Image' ? '📷 Image' : msg.type === 'audio' || msg.type === 'Audio' ? '🎵 Voice Note' : 'New message received');

      let cachedUserId = 0;
      try {
        const stored = localStorage.getItem('user_details');
        if (stored) {
          const userObj = JSON.parse(stored);
          cachedUserId = userObj.id || userObj.Id || 0;
        }
      } catch (err) {
        console.warn("Could not retrieve current user details inside notification listener", err);
      }

      const isMe = cachedUserId && Number(msgSenderId) === Number(cachedUserId);
      
      // Trigger notification if not sent by user
      if (!isMe) {
        const msgChatId = (msg.chatId || msg.ChatId)?.toString();
        const activeChatId = localStorage.getItem('activeChatId');
        
        if (msgChatId === activeChatId) {
            playNotificationSound('messageReceived');
        }
        
        triggerNotification(senderName, text, finalPhoto, msgChatId);

        // Presence: Set user to online
        if (msgSenderId) {
            homeSecurityHubConnection.invoke("UserOnline", Number(msgSenderId)).catch(console.error);
        }
      }
    };

    const handleGetAppNamesDetails = (data: any) => {
      console.log("[HOME_SIGNALR_EVENT: GetAppNamesDetails]", data);
      if (data) {
        saveAppNamesList(data);
        // Dispatch event to notify other components via custom and standard storage event
        window.dispatchEvent(new Event('app_names_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    };

    const handleHighLevelLogOut = (data?: any) => {
      console.log("[HOME_SIGNALR_EVENT: HighLevelLogOut]", data);
      handleLogoutRef.current();
    };

    const handleLogOut = (personId?: any) => {
      console.log("[HOME_SIGNALR_EVENT: LogOut]", personId);
      try {
        const stored = localStorage.getItem('user_details');
        if (stored) {
          let userObj = JSON.parse(stored);
          const myId = userObj?.id || userObj?.Id || userObj?.personId || userObj?.PersonId || userObj?.person_id;
          
          if (personId !== undefined && personId !== null && personId !== '' && myId) {
            if (String(myId) === String(personId)) {
              handleLogoutRef.current();
            }
          } else {
            handleLogoutRef.current();
          }
        } else {
          handleLogoutRef.current();
        }
      } catch (err) {
        console.error("Error handling LogOut SignalR event:", err);
        handleLogoutRef.current();
      }
    };

    homeSecurityHubConnection.on("MessageSent", handleReceivedMessage);
    homeSecurityHubConnection.on("ReceiveMessage", handleReceivedMessage);
    homeSecurityHubConnection.on("GetAppNamesDetails", handleGetAppNamesDetails);
    homeSecurityHubConnection.on("HighLevelLogOut", handleHighLevelLogOut);
    homeSecurityHubConnection.on("LogOut", handleLogOut);
    
    return () => {
      homeSecurityHubConnection.off("MessageSent", handleReceivedMessage);
      homeSecurityHubConnection.off("ReceiveMessage", handleReceivedMessage);
      homeSecurityHubConnection.off("GetAppNamesDetails", handleGetAppNamesDetails);
      homeSecurityHubConnection.off("HighLevelLogOut", handleHighLevelLogOut);
      homeSecurityHubConnection.off("LogOut", handleLogOut);
    };
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const sync = localStorage.getItem('app_theme_sync') === 'true';
      if (sync) {
        const isOsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        localStorage.setItem('app_theme', isOsDark ? 'dark' : 'light');
        if (isOsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        const theme = localStorage.getItem('app_theme');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localStorage.getItem('app_theme_sync') === 'true') {
        applyTheme();
      }
    };
    
    const handleSyncChanged = () => {
      applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('theme_sync_changed', handleSyncChanged);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('theme_sync_changed', handleSyncChanged);
    };
  }, []);

  useEffect(() => {
    if (appState === 'app' && authVerified) {
      const initHubAndUserOnline = async () => {
        await startHomeSecurityHub();
        try {
          const stored = localStorage.getItem('user_details');
          if (stored) {
            const userObj = JSON.parse(stored);
            const personId = userObj.id || userObj.Id || 0;
            // Introduce a short wait if state is still connecting
            if (String(homeSecurityHubConnection.state) === 'Connecting') {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            if (personId && String(homeSecurityHubConnection.state) === 'Connected') {
              await homeSecurityHubConnection.invoke("UserOnline", Number(personId));
              console.log("[SignalR] Successfully invoked UserOnline for ID:", personId);
            }
          }
        } catch (e) {
          console.warn("[SignalR] Failed to invoke UserOnline on startup:", e);
        }
      };
      
      initHubAndUserOnline();
      
      const handleReconnected = async () => {
        try {
          const stored = localStorage.getItem('user_details');
          if (stored) {
            const userObj = JSON.parse(stored);
            const personId = userObj.id || userObj.Id || 0;
            if (personId && String(homeSecurityHubConnection.state) === 'Connected') {
              await homeSecurityHubConnection.invoke("UserOnline", Number(personId));
              console.log("[SignalR] Reconnected and invoked UserOnline");
            }
          }
        } catch (err) {
          console.warn("Failed to re-invoke UserOnline on reconnection:", err);
        }
      };

      try {
        homeSecurityHubConnection.onreconnected(handleReconnected);
      } catch (err) {
        console.warn("reconnection tracking registered as expected");
      }
    } else {
      homeSecurityHubConnection.stop();
    }
  }, [appState, authVerified]);

  useEffect(() => {
    localStorage.setItem('app_state', appState);
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('auth_verified', authVerified ? 'true' : 'false');
  }, [authVerified]);

  useEffect(() => {
    localStorage.setItem('current_view', currentView);
  }, [currentView]);

  const clearCachesForView = (view: ViewType) => {
    if (view === 'doors') {
      delete (window as any).__cachedDoors;
      refreshData().catch(err => console.warn("Failed to refresh doors data:", err));
    } else if (view === 'actions') {
      delete (window as any).__cachedActions;
      refreshData().catch(err => console.warn("Failed to refresh actions data:", err));
    } else if (view === 'cameras') {
      delete (window as any).__cachedCameras;
      clearStore(STORES.CAMERAS).catch(err => console.warn("Failed to clear cameras store on refresh:", err));
      refreshData().catch(err => console.warn("Failed to refresh cameras data:", err));
    } else if (view === 'facilities' || view === 'externals' || view === 'dashboard') {
      refreshData().catch(err => console.warn("Failed to refresh data:", err));
    } else if (view === 'chats') {
      delete (window as any).__cachedChats;
      clearStore(STORES.CHATS).catch(err => console.warn("Failed to clear chats store on refresh:", err));
    } else if (view === 'logs') {
      clearLogs();
      clearStore(STORES.LOGS).catch(err => console.warn("Failed to clear logs store on refresh:", err));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < -40 && !isPulling && !navHidden) {
      setIsPulling(true);
      clearCachesForView(currentView);
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
      clearCachesForView(currentView);
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

  const [previousView, setPreviousView] = useState<ViewType | null>(null);

  const changeViewWithTransition = (newView: ViewType) => {
    if (newView === currentView) return;
    const viewsOrder: ViewType[] = ['dashboard', 'facilities', 'cameras', 'doors', 'actions', 'externals', 'chats', 'logs', 'settings'];
    const currentIndex = viewsOrder.indexOf(currentView);
    const newIndex = viewsOrder.indexOf(newView);
    const dir = newIndex > currentIndex ? 1 : -1;
    setTransitionDir(dir);
    setPreviousView(currentView);
    setCurrentView(newView);
  };

  const fetchAllPostLoginData = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    console.log("[AutoFetch] Automatically fetching doors, cameras, actions, chats, and logs after login...");
    
    // Fetch doors, cameras, actions
    try {
      await refreshData();
    } catch (err) {
      console.warn("[AutoFetch] Failed to fetch doors/cameras/actions:", err);
    }

    // Fetch logs
    try {
      await fetchLogs(true);
    } catch (err) {
      console.warn("[AutoFetch] Failed to fetch logs:", err);
    }

    // Fetch chats
    try {
      if (typeof (window as any).__fetchChatsRef === 'function') {
        await (window as any).__fetchChatsRef();
      }
    } catch (err) {
      console.warn("[AutoFetch] Failed to fetch chats:", err);
    }
  }, [refreshData, fetchLogs]);

  useEffect(() => {
    if (appState === 'app') {
      fetchAllPostLoginData();
    }
  }, [appState, authVerified, fetchAllPostLoginData]);

  const handleLoginSuccess = () => {
    setAppStateWithTransition('auth', 1);
  };

  const handleAuthSuccess = () => {
    setAuthVerified(true);
    rebuildHubConnections().catch(err => console.warn("Failed to rebuild hubs on auth success:", err));
    setAppStateWithTransition('app', 1);
    setTimeout(() => {
      fetchAllPostLoginData();
    }, 100);
  };

  const handleAuthFailMax = () => {
    setAuthVerified(false);
    clearLogs();
    stopAllSounds();
    clearAllStores().catch(err => console.warn("Failed to clear DB on auth fail:", err));
    localStorage.removeItem('auth_verified');
    localStorage.removeItem('app_state');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_details');
    localStorage.removeItem('biometric_stored_token');
    localStorage.removeItem('app_names_list');
    setAppStateWithTransition('login', -1);
  };

  const handleLogout = () => {
    setAuthVerified(false);
    clearLogs();
    stopAllSounds();
    clearAllStores().catch(err => console.warn("Failed to clear DB on logout:", err));
    localStorage.removeItem('auth_verified');
    localStorage.removeItem('app_state');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_details');
    localStorage.removeItem('app_names_list');
    localStorage.removeItem('biometric_stored_token');
    localStorage.removeItem('biometric_registered');
    localStorage.removeItem('activeChatId');
    localStorage.removeItem('current_view');
    sessionStorage.clear();
    setAppStateWithTransition('login', -1);
  };

  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  });

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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans tracking-normal overflow-hidden select-none">
      <div className="w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:max-h-[94vh] bg-white dark:bg-zinc-900 sm:rounded-[3rem] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden relative sm:border-[8px] sm:border-zinc-800 flex flex-col transition-all duration-300">
        
        {appState === 'splash' && (
          <Splash onComplete={() => {
            const token = localStorage.getItem('auth_token');
            if (token) {
              const verified = localStorage.getItem('auth_verified') === 'true';
              setAppStateWithTransition(verified ? 'app' : 'auth', 1);
            } else {
              setAppStateWithTransition('login', 1);
            }
          }} />
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
              <Header onLogout={handleLogout} setView={changeViewWithTransition} />
              
              {/* Snapchat-style Horizontal Bar Loading Indicator just below app header */}
              {isPulling && (
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-850 relative overflow-hidden shrink-0 z-[120]">
                  <div 
                    className="h-full w-full absolute animate-snap-loading" 
                    style={{ background: 'linear-gradient(to right, #000000 0%, #000000 50%, #949499 50%, #949499 100%)' }}
                  />
                </div>
              )}
              
              <main 
                ref={scrollRef}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex-1 overflow-x-hidden relative w-full touch-pan-y ios-bounce ${
                  ['chats', 'logs', 'settings'].includes(currentView) ? 'overflow-y-hidden' : 'overflow-y-auto'
                }`}
              >
                {/* 3-dot bouncing indicator shown when pulling down */}
                <div 
                  className="w-full flex justify-center items-center overflow-hidden transition-all duration-300" 
                  style={{ height: pullDistance > 0 ? Math.min(60, pullDistance * 0.7) : 0, opacity: pullDistance > 0 ? 1 : 0 }}
                >
                  <div className="flex gap-2 justify-center items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-205 dark:border-zinc-700 px-3.5 py-2 rounded-full mt-3 shadow-sm scale-90">
                    <div className="w-2.5 h-2.5 bg-zinc-500 rounded-full animate-bounce [animation-duration:0.6s]"></div>
                    <div className="w-2.5 h-2.5 bg-zinc-600 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]"></div>
                    <div className="w-2.5 h-2.5 bg-zinc-700 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]"></div>
                  </div>
                </div>
                
                <AnimatePresence initial={false} custom={transitionDir} mode="wait">
                  <motion.div
                    key={currentView}
                    custom={transitionDir}
                    variants={{
                      initial: (dir: number) => ({
                        x: dir === 1 ? '100%' : '-100%',
                        opacity: 0,
                      }),
                      animate: {
                        x: 0,
                        opacity: 1,
                      },
                      exit: (dir: number) => ({
                        x: dir === 1 ? '-100%' : '100%',
                        opacity: 0,
                      })
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                    className="w-full h-full flex flex-col"
                  >
                    {currentView === 'dashboard' && <Dashboard key={`dash-${refreshKey}`} onNavigate={changeViewWithTransition} />}
                    {currentView === 'facilities' && <Facilities key={`fac-${refreshKey}`} onNavigate={changeViewWithTransition} />}
                    {currentView === 'doors' && <Doors key={`door-${refreshKey}`} onBack={() => changeViewWithTransition('facilities')} />}
                    {currentView === 'actions' && <Actions key={`action-${refreshKey}`} onBack={() => changeViewWithTransition('facilities')} />}
                    {currentView === 'cameras' && <Cameras key={`cam-${refreshKey}`} onBack={() => changeViewWithTransition('facilities')} />}
                    {currentView === 'externals' && <Externals key={`ext-${refreshKey}`} onBack={() => changeViewWithTransition('facilities')} />}
                    {currentView === 'chats' && <div key={`chat-${refreshKey}`} className="contents"></div>}
                    {currentView === 'logs' && <Logs key={`log-${refreshKey}`} />}
                    {currentView === 'settings' && <Settings key={`set-${refreshKey}`} onBack={previousView ? () => changeViewWithTransition(previousView) : undefined} />}
                  </motion.div>
                </AnimatePresence>

                <Chats 
                  onChatActive={(active) => setNavHidden(active)} 
                  onRefreshPage={() => setRefreshKey(prev => prev + 1)} 
                  isViewActive={currentView === 'chats'} 
                  onNavigateToChats={() => changeViewWithTransition('chats')}
                />
              </main>
              
              {!navHidden && <BottomNav currentView={currentView} setView={changeViewWithTransition} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Curved Floating Overlay Notification (Curved, Dark Border, Background Opacity .5, Scales out from center) */}
        <AnimatePresence>
          {activeNotification.isOpen && (
            <motion.div
              variants={{
                hidden: { scaleX: 0, opacity: 0 },
                visible: { scaleX: 1, opacity: 1, transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } },
                exit: { scaleX: 0, opacity: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: 'center' }}
              className="absolute top-[64px] -translate-y-1/2 left-1/2 -translate-x-1/2 w-auto max-w-[75%] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 shadow-2xl z-[300] rounded-full overflow-hidden"
            >
              <div className="flex items-center gap-4 px-4 py-2 bg-transparent w-full">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 relative">
                  {activeNotification.senderPhoto ? (
                    <img 
                      src={activeNotification.senderPhoto} 
                      alt="" 
                      className="w-full h-full object-cover rounded-full pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-black text-xs uppercase rounded-full">
                      {activeNotification.senderName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-1.5 py-0.5">
                  <p className="font-bold text-sm leading-tight text-black dark:text-white truncate">
                    {activeNotification.senderName}
                  </p>
                  <p className="text-xs leading-tight text-zinc-900 dark:text-zinc-200 font-normal truncate mt-0.5 max-w-full">
                    {activeNotification.messageText}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
