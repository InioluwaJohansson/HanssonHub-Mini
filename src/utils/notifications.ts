import { triggerHaptic } from './haptics';
import { playNotificationSound } from './audio';

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  photoUrl?: string;
  type?: 'message' | 'door' | 'action' | 'external' | 'security' | 'info';
  status?: 'locked' | 'unlocked' | 'open' | 'closed' | 'triggered' | 'active' | 'inactive' | 'success' | 'warn';
  badge?: string;
  chatId?: string;
  duration?: number;
}

export const triggerAppNotification = (notification: AppNotification) => {
  // Check if alerts are enabled in settings
  const alertsEnabled = localStorage.getItem('alerts_enabled') !== 'false';
  if (!alertsEnabled) return;

  // Dispatch custom window event for App.tsx overlay
  const event = new CustomEvent('show_custom_notification', { detail: notification });
  window.dispatchEvent(event);
};
