export function createGameSounds() {
  let context;
  const notes = { tap: [480], flip: [330, 440], miss: [220, 196], win: [523, 659, 784], finish: [523, 659, 784, 1047] };
  return {
    async play(kind, enabled) {
      if (!enabled) return;
      try {
        context ??= new (window.AudioContext || window.webkitAudioContext)();
        if (context.state === 'suspended') await context.resume();
        if (context.state !== 'running') return;
        for (const [i, frequency] of (notes[kind] || notes.tap).entries()) {
          const start = context.currentTime + i * .085;
          const oscillator = context.createOscillator(); const volume = context.createGain();
          oscillator.type = kind === 'miss' ? 'triangle' : 'sine'; oscillator.frequency.value = frequency;
          volume.gain.setValueAtTime(0, start); volume.gain.linearRampToValueAtTime(.055, start + .012); volume.gain.exponentialRampToValueAtTime(.001, start + .14);
          oscillator.connect(volume); volume.connect(context.destination); oscillator.start(start); oscillator.stop(start + .15);
          oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
        }
      } catch { /* Sound is optional; unsupported audio never blocks a game. */ }
    },
    stop() { const old = context; context = undefined; old?.close().catch(() => {}); },
  };
}
