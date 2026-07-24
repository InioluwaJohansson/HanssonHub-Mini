
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let currentlyPlaying: HTMLAudioElement | null = null;
let recordingSoundPlayed = false;

export const setCurrentlyPlaying = (audio: HTMLAudioElement | null) => {
  currentlyPlaying = audio;
};

export const pauseAllAudio = () => {
  if (currentlyPlaying) {
    currentlyPlaying.pause();
    currentlyPlaying = null;
  }
};

export const playNotificationSound = (type: 'messageReceived' | 'messageSent' | 'typingKeyStroke' | 'recording') => {
  if (localStorage.getItem('sounds_enabled') === 'false') return;

  if (type === 'recording') {
    if (recordingSoundPlayed) return;
    recordingSoundPlayed = true;
    setTimeout(() => { recordingSoundPlayed = false; }, 2000);
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'messageReceived') {
    // iMessage received: soft pop
    oscillator.type = 'sine';
    const time = audioCtx.currentTime;
    oscillator.frequency.setValueAtTime(800, time);
    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    oscillator.start();
    oscillator.stop(time + 0.05);
  } else if (type === 'messageSent') {
    // iMessage sent: soft, slightly higher pop
    oscillator.type = 'sine';
    const time = audioCtx.currentTime;
    oscillator.frequency.setValueAtTime(1200, time);
    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    oscillator.start();
    oscillator.stop(time + 0.05);
  } else if (type === 'typingKeyStroke') {
    // Triple keystroke: fast, clicky
    [0, 0.05, 0.1].forEach(delay => {
        const osc = audioCtx.createOscillator();
        const gn = audioCtx.createGain();
        osc.connect(gn);
        gn.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + delay);
        gn.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gn.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.03);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.03);
    });
  } else if (type === 'recording') {
    // WhatsApp-like sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  }
};

let ringingInterval: any = null;

export const startRinging = () => {
  if (localStorage.getItem('sounds_enabled') === 'false') return;
  if (ringingInterval) return;

  const playRing = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn("Ringing playback failed", e);
    }
  };

  playRing();
  ringingInterval = setInterval(playRing, 2000);
};

export const stopRinging = () => {
  if (ringingInterval) {
    clearInterval(ringingInterval);
    ringingInterval = null;
  }
};

export const playCallConnectSound = () => {
  if (localStorage.getItem('sounds_enabled') === 'false') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    const time = ctx.currentTime;
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.15);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.start();
    osc.stop(time + 0.2);
  } catch (e) {}
};

export const playCallDisconnectSound = () => {
  if (localStorage.getItem('sounds_enabled') === 'false') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    const time = ctx.currentTime;
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.25);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start();
    osc.stop(time + 0.3);
  } catch (e) {}
};

