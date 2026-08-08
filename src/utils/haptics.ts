export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'incoming' | 'call';

export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'incoming') {
        navigator.vibrate([100, 50, 100]);
      } else if (type === 'call') {
        navigator.vibrate([80, 50, 80]);
      } else if (type === 'success') {
        navigator.vibrate([40, 50, 60]);
      } else if (type === 'warning') {
        navigator.vibrate([50, 40, 50, 40, 50]);
      } else if (type === 'heavy') {
        navigator.vibrate([60, 30, 60]);
      } else if (type === 'medium') {
        navigator.vibrate(35);
      } else {
        navigator.vibrate(15);
      }
    } catch (e) {
      // Ignore vibration errors if unsupported or blocked by browser permissions
    }
  }
};
