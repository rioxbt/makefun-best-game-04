// Prisma: the synthesised blips. No audio files, nothing fetched.
export function createAudio() {
  let context = null;

  function wake() {
    if (context === null) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) context = new Ctor();
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, seconds, type, volume, slide) {
    const audio = wake();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), now + seconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.03);
  }

  return {
    wake,
    brick: (step) => tone(540 + step * 80, 0.075, 'triangle', 0.15, 1.6),
    tough: () => tone(300, 0.08, 'square', 0.12, 1.1),
    paddle: () => tone(230, 0.09, 'square', 0.10, 1.5),
    wall: () => tone(190, 0.05, 'sine', 0.06, 1.2),
    lance: () => tone(900, 0.3, 'sawtooth', 0.13, 0.22),
    power: () => tone(680, 0.22, 'sine', 0.16, 2.4),
    life: () => tone(150, 0.55, 'sawtooth', 0.17, 0.4),
    clear: () => tone(523, 0.5, 'triangle', 0.18, 3.2),
    over: () => tone(220, 0.9, 'sine', 0.2, 0.35),
  };
}
