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
