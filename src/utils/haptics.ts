export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'lock'
  | 'unlock'
  | 'send'
  | 'messageSent'
  | 'success' 
  | 'warning' 
  | 'error'
  | 'incoming' 
  | 'call'
  | 'action'
  | 'destructive'
  | 'selection';

/**
 * Trigger vibration haptic feedback using the Web Vibration API when supported by the device.
 * Gracefully handles unsupported environments, disabled permissions, or iframe policies.
 */
export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  if (typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    switch (type) {
      case 'lock':
        // Distinct firm physical lock clunk pattern (50ms pulse, 40ms pause, 60ms pulse)
        navigator.vibrate([50, 40, 60]);
        break;

      case 'unlock':
        // Crisp smooth unlock tumblers release pattern (30ms pulse, 30ms pause, 45ms pulse)
        navigator.vibrate([30, 30, 45]);
        break;

      case 'send':
      case 'messageSent':
        // Snappy positive confirmation pulse (25ms pulse, 30ms pause, 35ms pulse)
        navigator.vibrate([25, 30, 35]);
        break;

      case 'incoming':
        // Strong incoming message / notification pattern
        navigator.vibrate([100, 50, 100]);
        break;

      case 'call':
        // Distinct phone ring vibration sequence
        navigator.vibrate([80, 50, 80]);
        break;

      case 'action':
        // Automation / macro triggered sequence
        navigator.vibrate([40, 30, 40, 30, 60]);
        break;

      case 'destructive':
        // Deletion or critical cancel impact
        navigator.vibrate([60, 40, 60]);
        break;

      case 'success':
        // Subtle dual rising success feedback
        navigator.vibrate([35, 45, 55]);
        break;

      case 'warning':
      case 'error':
        // Staccato warning vibration
        navigator.vibrate([50, 40, 50, 40, 50]);
        break;

      case 'heavy':
        navigator.vibrate(65);
        break;

      case 'medium':
        navigator.vibrate(35);
        break;

      case 'light':
      case 'selection':
      default:
        // Subtle crisp micro-tap
        navigator.vibrate(15);
        break;
    }
  } catch (e) {
    // Ignore vibration errors if blocked by browser autoplay/security policy or device settings
  }
};

/**
 * Check if the device/browser supports the Vibration API
 */
export const isHapticSupported = (): boolean => {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
};
