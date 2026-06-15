import * as signalR from '@microsoft/signalr';
import { getToken } from './api';

export const homeSecurityHubConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://kv5zhpcr-7190.uks1.devtunnels.ms/HomeSecurityHub', {
    accessTokenFactory: () => getToken() || ''
  })
  .withAutomaticReconnect()
  .build();

export const chatHubConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://kv5zhpcr-7190.uks1.devtunnels.ms/HomeSecurityChatHub', {
    accessTokenFactory: () => getToken() || ''
  })
  .withAutomaticReconnect()
  .build();

// Logging Interceptors for SignalR Hub Connections
const homeCallbackMap = new Map<string, Map<any, any>>();
const chatCallbackMap = new Map<string, Map<any, any>>();

const originalOnHome = homeSecurityHubConnection.on.bind(homeSecurityHubConnection);
homeSecurityHubConnection.on = (methodName: string, newMethod: (...args: any[]) => void) => {
  if (!homeCallbackMap.has(methodName)) {
    homeCallbackMap.set(methodName, new Map());
  }
  const methodMap = homeCallbackMap.get(methodName)!;

  const wrappedMethod = (...args: any[]) => {
    console.log(`%c[SignalR HomeHub Event: "${methodName}"]`, 'color: #0088cc; font-weight: bold; font-size: 11px', 'Response:', args[0]);
    newMethod(...args);
  };
  methodMap.set(newMethod, wrappedMethod);
  originalOnHome(methodName, wrappedMethod);
};

const originalOffHome = homeSecurityHubConnection.off.bind(homeSecurityHubConnection);
homeSecurityHubConnection.off = (methodName: string, method?: (...args: any[]) => void) => {
  if (method) {
    const wrapped = homeCallbackMap.get(methodName)?.get(method);
    if (wrapped) {
      originalOffHome(methodName, wrapped);
      homeCallbackMap.get(methodName)?.delete(method);
      return;
    }
  }
  originalOffHome(methodName, method);
};

const originalOnChat = chatHubConnection.on.bind(chatHubConnection);
chatHubConnection.on = (methodName: string, newMethod: (...args: any[]) => void) => {
  if (!chatCallbackMap.has(methodName)) {
    chatCallbackMap.set(methodName, new Map());
  }
  const methodMap = chatCallbackMap.get(methodName)!;

  const wrappedMethod = (...args: any[]) => {
    console.log(`%c[SignalR ChatHub Event: "${methodName}"]`, 'color: #00a884; font-weight: bold; font-size: 11px', 'Response:', args[0]);
    newMethod(...args);
  };
  methodMap.set(newMethod, wrappedMethod);
  originalOnChat(methodName, wrappedMethod);
};

const originalOffChat = chatHubConnection.off.bind(chatHubConnection);
chatHubConnection.off = (methodName: string, method?: (...args: any[]) => void) => {
  if (method) {
    const wrapped = chatCallbackMap.get(methodName)?.get(method);
    if (wrapped) {
      originalOffChat(methodName, wrapped);
      chatCallbackMap.get(methodName)?.delete(method);
      return;
    }
  }
  originalOffChat(methodName, method);
};

export const startHomeSecurityHub = async () => {
  if (homeSecurityHubConnection.state === signalR.HubConnectionState.Disconnected) {
    try {
      await homeSecurityHubConnection.start();
      console.log('SignalR HomeSecurityHub Connected.');
    } catch (err) {
      console.log('Error connecting to HomeSecurityHub: ', err);
    }
  }
};

export const startChatHub = async () => {
  if (chatHubConnection.state === signalR.HubConnectionState.Disconnected) {
    try {
      await chatHubConnection.start();
      console.log('SignalR ChatHub Connected.');
    } catch (err) {
      console.log('Error connecting to ChatHub: ', err);
    }
  }
};
