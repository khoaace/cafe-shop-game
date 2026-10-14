// Original morning loop. Notes are scheduled from the scene clock, so a
// paused or hidden shift stops the music instead of letting it run on.
const C3 = 130.81, F3 = 174.61, G3 = 196, A3 = 220;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5;
const ROOTS = [C3, A3, F3, G3, C3, A3, F3, C3];
const MELODY = [
  E5, G5, A5, G5, E5, D5, C5, E5,
  G5, A5, C6, A5, G5, E5, D5, 0,
  E5, 0, G5, A5, C6, A5, G5, E5,
  D5, E5, G5, E5, D5, C5, 0, 0,
  G5, A5, C6, A5, G5, E5, D5, G5,
  A5, C6, A5, G5, E5, G5, E5, 0,
  E5, G5, A5, C6, A5, G5, E5, D5,
  C5, E5, G5, E5, D5, C5, 0, 0,
];

function bassAt(index) {
  const root = ROOTS[Math.floor(index / 8) % ROOTS.length];
  const step = index % 8;
  if (step === 0) return root;
  if (step === 4) return root * 1.5 > 250 ? root * 0.75 : root * 1.5;
  return 0;
}

export class AudioManager {
  constructor(save) {
    this.save = save;
    this.context = null;
    this.buses = null;
    this.last = new Map();
    this.nodes = new Set();
    this.beds = new Map();
    this.streams = new Map();
    this.musicClock = 0;
    this.note = 0;
    this.birdIn = 1.6;
    this.bikeIn = 4.2;
    this.noiseData = null;
  }

  unlock() {
    try {
      const settings = this.save.data.settings;
      if (!settings.sound && !settings.music) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.context) {
        this.context = new AudioCtx();
        this.master = this.context.createGain();
        this.master.gain.value = 0.82;
        this.master.connect(this.context.destination);
        this.buses = { sound: this.context.createGain(), music: this.context.createGain() };
        this.buses.sound.connect(this.master);
        this.buses.music.connect(this.master);
      }
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }

  resumeIfUnlocked() {
    try {
      if (this.context && this.context.state !== 'running') this.context.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }

  out(channel) { return this.buses?.[channel] || this.context.destination; }

  can(channel) {
    return this.context?.state === 'running' && this.nodes.size < (channel === 'music' ? 22 : 32);
  }

  noiseBuffer() {
    if (this.noiseData) return this.noiseData;
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseData = buffer;
    return buffer;
  }

  track(source, chain, channel, extra = {}) {
    const entry = { source, chain, channel, ...extra };
    this.nodes.add(entry);
    source.onended = () => {
      try { source.disconnect(); } catch { /* Already stopped. */ }
      for (const node of chain) { try { node.disconnect(); } catch { /* Already stopped. */ } }
      this.nodes.delete(entry);
      if (entry.bedId && this.beds.get(entry.bedId) === entry) this.beds.delete(entry.bedId);
      if (entry.streamId && this.streams.get(entry.streamId) === entry) this.streams.delete(entry.streamId);
    };
    return entry;
  }

  voice(channel, volume, delay, duration, build) {
    if (!(volume > 0) || !this.can(channel)) return;
    const ctx = this.context;
    const t = ctx.currentTime + delay;
    try {
      const { source, chain } = build(ctx, t);
      this.track(source, chain, channel);
      source.start(t);
      source.stop(t + duration + 0.02);
    } catch { /* Interrupted audio must not affect gestures. */ }
  }

  blip(freq, volume, duration, type = 'sine', delay = 0, channel = 'sound') {
    this.voice(channel, volume, delay, duration, (ctx, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      const attack = Math.min(0.018, duration * 0.28);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain); gain.connect(this.out(channel));
      return { source: osc, chain: [gain] };
    });
  }

  sweep(from, to, volume, duration, type = 'sine', delay = 0, channel = 'sound') {
    this.voice(channel, volume, delay, duration, (ctx, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, from), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + Math.min(0.02, duration * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain); gain.connect(this.out(channel));
      return { source: osc, chain: [gain] };
    });
  }

  noiseHit({ volume, frequency, type = 'lowpass', duration = 0.2, channel = 'sound', q = 0.8, sweepTo = 0, delay = 0 }) {
    this.voice(channel, volume, delay, duration, (ctx, t) => {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer();
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.Q.value = q;
      filter.frequency.setValueAtTime(Math.max(40, frequency), t);
      if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume, t + Math.min(0.03, duration * 0.25));
      gain.gain.linearRampToValueAtTime(0.0001, t + duration);
      source.connect(filter); filter.connect(gain); gain.connect(this.out(channel));
      return { source, chain: [filter, gain] };
    });
  }

  hat(volume, channel = 'music') {
    this.noiseHit({ volume, frequency: 6500, type: 'highpass', duration: 0.04, channel, q: 0.7 });
  }

  chirp(volume) {
    const base = 1480 + Math.random() * 640;
    this.sweep(base, base * 1.34, volume, 0.07, 'sine');
    this.sweep(base * 1.08, base * 1.5, volume * 0.7, 0.06, 'sine', 0.08);
  }

  whoosh(volume) {
    this.noiseHit({ volume, frequency: 240, type: 'bandpass', duration: 0.85, q: 0.85, sweepTo: 1500 });
  }

  loopNoise({ id, map, volume, frequency, type = 'lowpass', q = 0.7 }) {
    const current = map.get(id);
    if (current && !current.releasing) {
      current.at = this.context.currentTime;
      if (current.frequency !== frequency) {
        current.frequency = frequency;
        try { current.filter.frequency.linearRampToValueAtTime(frequency, this.context.currentTime + 0.25); } catch { /* Keep the old tone. */ }
      }
      if (current.volume !== volume) {
        current.volume = volume;
        try { current.gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.2); } catch { /* Keep the old level. */ }
      }
      return current;
    }
    if (!this.can('sound')) return null;
    try {
      const ctx = this.context;
      const t = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer();
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.Q.value = q;
      filter.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.08);
      source.connect(filter); filter.connect(gain); gain.connect(this.out('sound'));
      source.start();
      const entry = this.track(source, [filter, gain], 'sound', {
        bedId: map === this.beds ? id : undefined,
        streamId: map === this.streams ? id : undefined,
        filter, gain, at: t, volume, frequency,
      });
      map.set(id, entry);
      return entry;
    } catch { return null; }
  }

  release(entry) {
    if (!entry || entry.releasing) return;
    entry.releasing = true;
    try {
      const t = this.context.currentTime;
      entry.gain.gain.cancelScheduledValues(t);
      entry.gain.gain.setValueAtTime(Math.max(0.0001, entry.gain.gain.value), t);
      entry.gain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
      entry.source.stop(t + 0.12);
    } catch {
      try { entry.source.stop(); } catch { /* Already stopped. */ }
    }
  }

  bed(id, options) { return this.loopNoise({ id, map: this.beds, ...options }); }

  stream(kind, volume) {
    const spec = {
      pour: { base: 1180, q: 0.9, mul: 1.2, rate: 17, spark: 0.14, from: 940, to: 460, drip: 0.06 },
      milk: { base: 540, q: 0.5, mul: 1.05, rate: 7, spark: 0.22, from: 480, to: 250, drip: 0.08 },
      creamPour: { base: 330, q: 0.35, mul: 0.75, rate: 4, spark: 0.3, from: 220, to: 110, drip: 0.12 },
      condensed: { base: 230, q: 0.42, mul: 1.15, rate: 3.2, spark: 0.28, from: 170, to: 85, drip: 0.13 },
      // Motor hum: low band of noise with a fast wobble and occasional pitch dips under load.
      blender: { base: 150, q: 1.6, mul: 1.3, rate: 38, spark: 0.45, from: 210, to: 140, drip: 0.2 },
    }[kind] || { base: 900, q: 0.7, mul: 1, rate: 10, spark: 0.2, from: 700, to: 360, drip: 0.08 };
    const entry = this.loopNoise({
      id: kind, map: this.streams, type: 'bandpass', q: spec.q,
      volume: volume * spec.mul, frequency: spec.base,
    });
    if (!entry || entry.releasing) return;
    const t = this.context.currentTime;
    entry.at = t;
    try { entry.filter.frequency.value = spec.base * (1 + Math.sin(t * spec.rate) * 0.1); } catch { /* Steady pour is fine. */ }
    if (t - (entry.spark || 0) >= spec.spark) {
      entry.spark = t;
      this.sweep(spec.from, spec.to, volume * 0.5, spec.drip, 'sine');
    }
  }

  expireStreams() {
    const t = this.context.currentTime;
    for (const entry of this.streams.values()) if (t - entry.at > 0.18) this.release(entry);
  }

  effect(kind, volume) {
    const wobble = (this.context.currentTime * 9) % 1;
    switch (kind) {
      case 'ui':
        this.blip(784, volume * 0.42, 0.045, 'sine');
        this.blip(1245, volume * 0.18, 0.06, 'triangle', 0.018);
        break;
      case 'pickup':
        this.sweep(240, 620, volume * 0.65, 0.07, 'triangle');
        this.noiseHit({ volume: volume * 0.18, frequency: 1900, type: 'highpass', duration: 0.03, q: 0.5 });
        break;
      case 'place':
        this.blip(196, volume * 0.85, 0.06, 'sine');
        this.blip(620, volume * 0.32, 0.08, 'triangle', 0.028);
        break;
      case 'glass':
        this.blip(1568, volume * 0.5, 0.12, 'sine');
        this.blip(2349, volume * 0.2, 0.08, 'sine', 0.008);
        this.noiseHit({ volume: volume * 0.1, frequency: 4200, type: 'highpass', duration: 0.025, q: 0.4 });
        break;
      case 'phin':
        this.blip(932, volume * 0.48, 0.09, 'triangle');
        this.blip(1397, volume * 0.26, 0.13, 'sine', 0.02);
        break;
      case 'grounds':
        [0, 0.035, 0.07].forEach((delay, i) => this.noiseHit({ volume: volume * (1.15 - i * 0.28), frequency: 780 + i * 520, type: 'bandpass', duration: 0.06, q: 1.4, delay }));
        break;
      case 'press':
        this.blip(92, volume * 1.15, 0.055, 'sine');
        this.noiseHit({ volume: volume * 0.4, frequency: 180, type: 'lowpass', duration: 0.05, q: 0.8 });
        break;
      case 'lock':
        this.blip(174, volume * 0.9, 0.04, 'sine');
        this.blip(698, volume * 0.42, 0.09, 'triangle', 0.025);
        break;
      case 'pour':
      case 'milk':
      case 'condensed':
        this.stream(kind, volume);
        break;
      case 'ice':
        [0, 0.048, 0.092].forEach((delay, i) => {
          const freq = 1580 + i * 190;
          this.blip(freq, volume * (0.62 - i * 0.12), 0.09, 'sine', delay);
          this.blip(freq * 1.49, volume * 0.14, 0.05, 'sine', delay);
        });
        break;
      case 'stir':
        this.blip(860 + wobble * 380, volume * 0.38, 0.04, 'sine');
        this.blip(1400 + wobble * 200, volume * 0.1, 0.03, 'sine');
        break;
      case 'creamWhisk':
        this.noiseHit({ volume: volume * 0.4, frequency: 550 + wobble * 700, type: 'bandpass', duration: 0.07, q: 0.5 }); break;
      case 'foamBubble':
        this.sweep(980, 620, volume * 0.18, 0.035, 'sine'); break;
      case 'creamLanding':
        this.sweep(240, 100, volume * 0.32, 0.12, 'sine'); break;
      case 'iceCrack':
        this.noiseHit({ volume: volume * 0.55, frequency: 2600 + wobble * 900, type: 'bandpass', duration: 0.03, q: 1.6 });
        this.blip(1900 + wobble * 600, volume * 0.18, 0.03, 'sine', 0.01); break;
      case 'creamPerfect':
        [880, 1175, 1568].forEach((freq, i) => this.blip(freq, volume * 0.38, 0.18, 'sine', i * 0.055)); break;
      case 'whisk':
        this.noiseHit({ volume: volume * 0.62, frequency: 700 + wobble * 900, type: 'bandpass', duration: 0.05, q: 0.75, sweepTo: 2400 });
        break;
      case 'foam':
        this.noiseHit({ volume: volume * 0.75, frequency: 1600, type: 'bandpass', duration: 0.16, q: 0.55, sweepTo: 3400 });
        this.blip(1046, volume * 0.22, 0.12, 'sine', 0.04);
        break;
      case 'drop':
        this.sweep(820, 300, Math.max(volume * 1.3, 0.028), 0.1, 'sine');
        this.noiseHit({ volume: volume * 0.35, frequency: 1500, type: 'bandpass', duration: 0.045, q: 1.2 });
        break;
      case 'trash':
        this.blip(150, volume * 0.75, 0.07, 'triangle');
        this.noiseHit({ volume: volume * 0.4, frequency: 420, type: 'lowpass', duration: 0.08, q: 0.7 });
        this.blip(96, volume * 0.35, 0.09, 'sine', 0.045);
        break;
      case 'talk':
        this.blip(494, volume * 0.5, 0.07, 'sine');
        this.blip(740, volume * 0.36, 0.09, 'sine', 0.055);
        break;
      case 'done':
        this.blip(784, volume * 0.5, 0.07, 'sine');
        this.blip(1175, volume * 0.36, 0.11, 'sine', 0.045);
        break;
      case 'perfect':
        [659, 880, 1319].forEach((freq, i) => this.blip(freq, volume * 0.62, 0.13, 'triangle', i * 0.048));
        break;
      case 'good':
        this.blip(587, volume * 0.58, 0.09, 'triangle');
        this.blip(880, volume * 0.42, 0.12, 'sine', 0.055);
        break;
      case 'miss':
        this.blip(370, volume * 0.5, 0.09, 'triangle');
        this.blip(294, volume * 0.38, 0.11, 'sine', 0.06);
        break;
      case 'ready':
        this.blip(659.25, volume * 0.85, 0.11, 'triangle');
        this.blip(987.77, volume * 0.62, 0.16, 'sine', 0.06);
        this.blip(1318.5, volume * 0.28, 0.18, 'sine', 0.12);
        break;
      case 'success':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.blip(freq, volume * (0.9 - i * 0.08), 0.18, 'triangle', i * 0.06));
        this.noiseHit({ volume: volume * 0.2, frequency: 3000, type: 'highpass', duration: 0.08, q: 0.5, delay: 0.18 });
        break;
      case 'money':
        this.blip(1568, volume * 2.2, 0.06, 'sine');
        this.blip(2093, volume * 1.5, 0.08, 'sine', 0.05);
        this.blip(2637, volume * 0.8, 0.1, 'sine', 0.1);
        break;
      case 'combo':
        [659.25, 880, 1174.66, 1567.98].forEach((freq, i) => this.blip(freq, volume * 0.72, 0.13, 'sine', i * 0.042));
        break;
      case 'arrive':
        [392, 523.25, 659.25].forEach((freq, i) => this.blip(freq, volume * 0.55, 0.13, 'sine', i * 0.05));
        break;
      case 'rush':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.blip(freq, volume * 0.62, 0.11, 'triangle', i * 0.038));
        this.hat(0.02, 'sound');
        break;
      case 'error':
        this.blip(311, volume * 0.55, 0.08, 'triangle');
        this.blip(233, volume * 0.42, 0.11, 'sine', 0.075);
        break;
      case 'bird':
        this.chirp(Math.max(volume, 0.016));
        break;
      default:
        this.blip(520, volume, 0.1, 'sine');
    }
  }

  play(kind, volume = 0.035) {
    if (!this.save.data.settings.sound || this.context?.state !== 'running') return;
    if (kind === 'pour' || kind === 'milk' || kind === 'condensed' || kind === 'creamPour' || kind === 'blender') { this.stream(kind, volume); return; }
    const now = this.context.currentTime;
    const gap = { iceCrack: 0.07, foamBubble: 0.35, creamWhisk: 0.06, creamLanding: 0.25, stir: 0.06, whisk: 0.05, press: 0.09, drop: 0.18 }[kind] ?? 0.08;
    if (now - (this.last.get(kind) ?? -10) < gap) return;
    this.last.set(kind, now);
    this.effect(kind, volume);
  }

  musicNote(index, event, rush) {
    const melody = MELODY[index];
    const bass = bassAt(index);
    const late = (index % 4) * 0.004;
    if (melody) this.blip(melody, event === 'festival' ? 0.05 : 0.042, 0.32, 'triangle', late, 'music');
    if (melody && event === 'festival') this.blip(melody * 1.25, 0.016, 0.24, 'sine', late + 0.012, 'music');
    if (bass) this.blip(bass, 0.032, 0.4, 'sine', 0, 'music');
    if (index % 2 === 1) this.hat(rush || event === 'festival' ? 0.018 : 0.012);
    if (index % 8 === 4) this.noiseHit({ volume: 0.013, frequency: 380, type: 'bandpass', duration: 0.05, channel: 'music', q: 1.1 });
  }

  advanceMusic(seconds, rush, event) {
    const step = event === 'festival' ? 0.21 : rush ? 0.23 : 0.26;
    this.musicClock += seconds;
    let spins = 0;
    while (this.musicClock >= step && spins < 2) {
      this.musicClock -= step;
      this.musicNote(this.note, event, rush);
      this.note = (this.note + 1) % MELODY.length;
      spins += 1;
    }
    if (this.musicClock > step) this.musicClock = 0;
  }

  ambient(seconds, rush, event = null) {
    if (this.context?.state !== 'running') return;
    const dt = Math.max(0, Math.min(seconds, 0.1));
    this.expireStreams();
    if (this.save.data.settings.music) this.advanceMusic(dt, rush, event);
    else this.musicClock = 0;
    if (!this.save.data.settings.sound) {
      for (const id of [...this.beds.keys()]) this.release(this.beds.get(id));
      for (const entry of this.streams.values()) this.release(entry);
      return;
    }
    this.bed('street', { volume: rush ? 0.013 : 0.0075, frequency: rush ? 760 : 440, type: 'lowpass', q: 0.7 });
    if (event === 'rain') this.bed('rain', { volume: 0.02, frequency: 2400, type: 'highpass', q: 0.6 });
    else this.release(this.beds.get('rain'));
    this.birdIn -= dt;
    if (this.birdIn <= 0) {
      this.birdIn = (event === 'rain' ? 14 : rush ? 5 : 8) + Math.random() * 4;
      if (event !== 'rain') this.chirp(0.02);
    }
    this.bikeIn -= dt;
    if (this.bikeIn <= 0) {
      this.bikeIn = (rush ? 7 : 13) + Math.random() * 5;
      this.whoosh(rush ? 0.026 : 0.015);
    }
  }

  stop(channel) {
    for (const entry of [...this.nodes]) {
      if (channel && entry.channel !== channel) continue;
      try { entry.source.stop(); } catch { /* Already stopped. */ }
      try { entry.source.disconnect(); } catch { /* Already stopped. */ }
      for (const node of entry.chain) { try { node.disconnect(); } catch { /* Already stopped. */ } }
      this.nodes.delete(entry);
      if (entry.bedId && this.beds.get(entry.bedId) === entry) this.beds.delete(entry.bedId);
      if (entry.streamId && this.streams.get(entry.streamId) === entry) this.streams.delete(entry.streamId);
    }
    if (!channel || channel === 'music') this.musicClock = 0;
  }

  pause() { this.stop(); this.context?.suspend().catch(() => {}); }

  toggle(channel = 'sound') {
    if (!['sound', 'music'].includes(channel)) return;
    this.save.settings({ [channel]: !this.save.data.settings[channel] });
    if (!this.save.data.settings[channel]) this.stop(channel);
    else this.unlock();
  }
}
