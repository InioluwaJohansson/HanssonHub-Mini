// Progressive Web App (PWA) Manager for HanssonHub

export interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: PWAInstallPromptEvent | null = null;
const installListeners: Array<(canInstall: boolean) => void> = [];
const updateListeners: Array<() => void> = [];

/**
 * Check if the application is currently running in standalone PWA / installed mode
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isMinimalUIMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandaloneMedia || isMinimalUIMedia || isIOSStandalone;
}

/**
 * Check if the PWA install prompt is available to trigger
 */
export function canInstallPWA(): boolean {
  return !isStandaloneMode() && deferredPrompt !== null;
}

/**
 * Trigger the native PWA install prompt
 */
export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.log('[PWA] No deferred install prompt available.');
    return 'unavailable';
  }

  try {
    // Show the browser's install prompt
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice: ${choice.outcome}`);
    
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
      notifyInstallListeners(false);
    }
    
    return choice.outcome;
  } catch (error) {
    console.error('[PWA] Error displaying install prompt:', error);
    return 'unavailable';
  }
}

/**
 * Subscribe to installability state changes
 */
export function onInstallableChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.push(callback);
  callback(canInstallPWA());
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx > -1) installListeners.splice(idx, 1);
  };
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((listener) => {
    try {
      listener(canInstall);
    } catch (e) {
      console.error('[PWA] Listener error:', e);
    }
  });
}

/**
 * Subscribe to service worker updates
 */
export function onServiceWorkerUpdate(callback: () => void): () => void {
  updateListeners.push(callback);
  return () => {
    const idx = updateListeners.indexOf(callback);
    if (idx > -1) updateListeners.splice(idx, 1);
  };
}

function notifyUpdateListeners() {
  updateListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[PWA] Update listener error:', e);
    }
  });
}

/**
 * Register the Service Worker in production / supported environments
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported in this browser.');
    return;
  }

  // Capture beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard mini-infobar on mobile so we have full programmatic control
    e.preventDefault();
    deferredPrompt = e as PWAInstallPromptEvent;
    console.log('[PWA] beforeinstallprompt captured.');
    notifyInstallListeners(true);
  });

  // Track appinstalled event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] HanssonHub was installed as a PWA!');
    deferredPrompt = null;
    notifyInstallListeners(false);
  });

  // Register service worker after initial window load to prioritize app responsiveness
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered with scope:', registration.scope);

      // Check for worker updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[PWA] New update available.');
              notifyUpdateListeners();
            } else {
              console.log('[PWA] Content is precached for offline use.');
            }
          }
        });
      });
    } catch (error) {
      console.warn('[PWA] Service Worker registration failed:', error);
    }
  });

  // Handle controller change (reloads page cleanly when updated)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('[PWA] Controller changed, updating active page.');
    }
  });
}
