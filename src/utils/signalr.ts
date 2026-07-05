import * as signalR from '@microsoft/signalr';
import { getToken, getBaseUrl } from './api';

// Create real internal connection
let activeHomeConnection = new signalR.HubConnectionBuilder()
  .withUrl(`${getBaseUrl()}/HomeSecurityHub`, {
    accessTokenFactory: () => getToken() || ''
  })
  .withAutomaticReconnect()
  .build();

activeHomeConnection.onreconnected(async () => {
  console.log('SignalR HomeSecurityHub Reconnected.');
  const token = getToken();
  if (token) {
    try {
      await activeHomeConnection.invoke("AddPersonRole", token);
      console.log('[SignalR] AddPersonRole invoked on reconnect.');
    } catch (err) {
      console.warn('[SignalR] Failed to invoke AddPersonRole on reconnect:', err);
    }
  }
});

// Logging Interceptors & Registrations Map
const homeCallbackMap = new Map<string, Map<any, any>>();

interface CallbackRegistration {
  methodName: string;
  newMethod: (...args: any[]) => void;
}

const homeRegisteredCallbacks: CallbackRegistration[] = [];

// Proxy Hub Connection that remains static module but delegates dynamically to active instance
export const homeSecurityHubConnection = new Proxy({}, {
  get(target, prop, receiver) {
    if (prop === 'on') {
      return (methodName: string, newMethod: (...args: any[]) => void) => {
        // Track the registration for reconnection rebuilds
        homeRegisteredCallbacks.push({ methodName, newMethod });
        
        if (!homeCallbackMap.has(methodName)) {
          homeCallbackMap.set(methodName, new Map());
        }
        const methodMap = homeCallbackMap.get(methodName)!;

        const wrappedMethod = (...args: any[]) => {
          console.log(`%c[SignalR HomeHub Event: "${methodName}"]`, 'color: #0088cc; font-weight: bold; font-size: 11px', 'Response:', args[0]);
          newMethod(...args);
        };
        methodMap.set(newMethod, wrappedMethod);
        
        activeHomeConnection.on(methodName, wrappedMethod);
      };
    }
    
    if (prop === 'off') {
      return (methodName: string, method?: (...args: any[]) => void) => {
        // Remove from tracking registry
        if (method) {
          const idx = homeRegisteredCallbacks.findIndex(r => r.methodName === methodName && r.newMethod === method);
          if (idx !== -1) homeRegisteredCallbacks.splice(idx, 1);
        } else {
          let idx = homeRegisteredCallbacks.findIndex(r => r.methodName === methodName);
          while (idx !== -1) {
            homeRegisteredCallbacks.splice(idx, 1);
            idx = homeRegisteredCallbacks.findIndex(r => r.methodName === methodName);
          }
        }

        if (method) {
          const wrapped = homeCallbackMap.get(methodName)?.get(method);
          if (wrapped) {
            activeHomeConnection.off(methodName, wrapped);
            homeCallbackMap.get(methodName)?.delete(method);
            return;
          }
        }
        activeHomeConnection.off(methodName, method);
      };
    }

    const value = Reflect.get(activeHomeConnection, prop);
    if (typeof value === 'function') {
      return value.bind(activeHomeConnection);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(activeHomeConnection, prop, value);
  }
}) as signalR.HubConnection;

export const startHomeSecurityHub = async () => {
  if (activeHomeConnection.state === signalR.HubConnectionState.Disconnected) {
    try {
      await activeHomeConnection.start();
      console.log('SignalR HomeSecurityHub Connected.');
      const token = getToken();
      if (token) {
        await activeHomeConnection.invoke("AddPersonRole", token);
        await activeHomeConnection.invoke("AddPerson", token);
        console.log('[SignalR] AddPersonRole and AddPerson invoked on connect.');
      }
    } catch (err) {
      console.log('Error connecting to HomeSecurityHub: ', err);
    }
  }
};

export const rebuildHubConnections = async () => {
  const baseUrl = getBaseUrl();
  console.log('[SignalR] Rebuilding and reconnecting SignalR Hubs with Base URL:', baseUrl);

  // 1. Stop existing active connection
  try {
    if (activeHomeConnection.state !== signalR.HubConnectionState.Disconnected) {
      await activeHomeConnection.stop();
    }
  } catch (e) {
    console.warn('[SignalR] Error stopping old Home Hub:', e);
  }

  // 2. Clear old wraps
  homeCallbackMap.clear();

  // 3. Create fresh connection
  activeHomeConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseUrl}/HomeSecurityHub`, {
      accessTokenFactory: () => getToken() || ''
    })
    .withAutomaticReconnect()
    .build();

  activeHomeConnection.onreconnected(async () => {
    console.log('SignalR HomeSecurityHub Reconnected.');
    const token = getToken();
    if (token) {
      try {
        await activeHomeConnection.invoke("AddPersonRole", token);
        console.log('[SignalR] AddPersonRole invoked on reconnect.');
      } catch (err) {
        console.warn('[SignalR] Failed to invoke AddPersonRole on reconnect:', err);
      }
    }
  });

  // 4. Re-apply all registered listeners
  // Re-register Home Hub event listeners
  for (const { methodName, newMethod } of homeRegisteredCallbacks) {
    if (!homeCallbackMap.has(methodName)) {
      homeCallbackMap.set(methodName, new Map());
    }
    const methodMap = homeCallbackMap.get(methodName)!;
    const wrappedMethod = (...args: any[]) => {
      console.log(`%c[SignalR HomeHub Event: "${methodName}"]`, 'color: #0088cc; font-weight: bold; font-size: 11px', 'Response:', args[0]);
      newMethod(...args);
    };
    methodMap.set(newMethod, wrappedMethod);
    activeHomeConnection.on(methodName, wrappedMethod);
  }

  // 5. Restart connection if user is logged in
  const token = localStorage.getItem('auth_token');
  const verified = localStorage.getItem('auth_verified') === 'true';
  if (token && verified) {
    await startHomeSecurityHub();
  }
};
