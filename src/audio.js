const AudioContextClass = window.AudioContext || window.webkitAudioContext;

/**
 * Tiny Web Audio chip synth. Every sound is generated at runtime: no samples,
 * recordings, or external assets are used.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.enabled = localStorage.getItem("ringside-muted") !== "1";
    this.musicTimer = null;
    this.musicName = null;
    this.musicStep = 0;
    this.nextNoteAt = 0;
    this.noiseBuffer = null;
  }

  async unlock() {
    if (!AudioContextClass) return false;
    if (!this.context) {
      this.context = new AudioContextClass({ latencyHint: "interactive", sampleRate: 44100 });
      this.master = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 5;
      this.compressor.ratio.value = 7;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.16;
      this.master.gain.value = this.enabled ? 0.72 : 0;
      this.master.connect(this.compressor);
      this.compressor.connect(this.context.destination);
      this.noiseBuffer = this.makeNoiseBuffer();
    }
    if (this.context.state === "suspended") await this.context.resume();
    return true;
  }

  makeNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.35);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let value = 0;
    for (let i = 0; i < length; i += 1) {
      // NES-ish pseudo-noise: sample-and-hold rather than smooth white noise.
      if (i % 5 === 0) value = Math.random() * 2 - 1;
      data[i] = value * (1 - i / length * 0.18);
    }
    return buffer;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem("ringside-muted", enabled ? "0" : "1");
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(enabled ? 0.72 : 0, this.context.currentTime, 0.015);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.unlock().then(() => this.sfx("menu"));
    }
    return this.enabled;
  }

  tone(frequency, duration = 0.08, options = {}) {
    if (!this.context || !this.master || !this.enabled) return;
    const now = this.context.currentTime + (options.delay || 0);
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type || "square";
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (options.sweep) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.sweep), now + duration);
    }
    if (options.detune) oscillator.detune.value = options.detune;
    const volume = options.volume ?? 0.12;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.006, duration / 3));
    gain.gain.setValueAtTime(volume, now + Math.max(0.008, duration * 0.45));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration = 0.07, options = {}) {
    if (!this.context || !this.master || !this.noiseBuffer || !this.enabled) return;
    const now = this.context.currentTime + (options.delay || 0);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = options.filter || "bandpass";
    filter.frequency.value = options.frequency || 900;
    filter.Q.value = options.q || 0.7;
    const volume = options.volume ?? 0.12;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + Math.min(duration, 0.34));
  }

  chord(notes, duration, options = {}) {
    notes.forEach((note, index) => this.tone(note, duration, {
      ...options,
      volume: (options.volume ?? 0.1) / notes.length * 1.55,
      delay: (options.delay || 0) + index * (options.strum || 0),
    }));
  }

  sfx(name) {
    if (!this.context || !this.enabled) return;
    switch (name) {
      case "menu":
        this.tone(440, 0.045, { volume: 0.08 });
        this.tone(660, 0.06, { volume: 0.07, delay: 0.045 });
        break;
      case "start":
        [261.63, 329.63, 392, 523.25].forEach((n, i) => this.tone(n, 0.12, { delay: i * 0.075, volume: 0.11 }));
        break;
      case "bell":
        this.tone(980, 0.38, { type: "square", sweep: 905, volume: 0.09 });
        this.tone(1960, 0.26, { type: "triangle", sweep: 1750, volume: 0.055 });
        this.noise(0.15, { frequency: 4300, volume: 0.045 });
        break;
      case "jab":
        this.noise(0.045, { frequency: 1500, q: 1.5, volume: 0.07 });
        this.tone(145, 0.04, { sweep: 90, volume: 0.045 });
        break;
      case "swing":
        this.noise(0.06, { frequency: 650, q: 1.1, volume: 0.065 });
        this.tone(95, 0.055, { sweep: 55, volume: 0.04 });
        break;
      case "hitLight":
        this.noise(0.08, { frequency: 430, q: 0.8, volume: 0.12 });
        this.tone(112, 0.075, { sweep: 63, type: "square", volume: 0.13 });
        break;
      case "hitHeavy":
        this.noise(0.15, { frequency: 280, q: 0.8, volume: 0.18 });
        this.tone(92, 0.16, { sweep: 38, volume: 0.18 });
        this.tone(46, 0.19, { type: "triangle", volume: 0.12 });
        break;
      case "block":
        this.noise(0.055, { filter: "highpass", frequency: 2300, volume: 0.08 });
        this.tone(180, 0.045, { sweep: 120, volume: 0.05 });
        break;
      case "dodge":
        this.noise(0.095, { frequency: 1200, q: 2.5, volume: 0.05 });
        break;
      case "hurt":
        this.tone(82, 0.22, { type: "sawtooth", sweep: 47, volume: 0.11 });
        this.noise(0.12, { frequency: 330, volume: 0.1 });
        break;
      case "star":
        [783.99, 1046.5, 1318.5].forEach((n, i) => this.tone(n, 0.12, { delay: i * 0.055, volume: 0.08 }));
        break;
      case "uppercut":
        this.tone(120, 0.22, { type: "sawtooth", sweep: 680, volume: 0.1 });
        this.noise(0.12, { frequency: 560, volume: 0.12, delay: 0.11 });
        break;
      case "count":
        this.chord([196, 293.66], 0.08, { volume: 0.09 });
        break;
      case "ko":
        [392, 329.63, 261.63, 196, 130.81].forEach((n, i) => this.tone(n, 0.22, { delay: i * 0.1, volume: 0.1, type: i % 2 ? "triangle" : "square" }));
        this.noise(0.25, { frequency: 250, volume: 0.12, delay: 0.36 });
        break;
      case "tko":
        [261.63, 329.63, 392, 523.25, 659.25].forEach((n, i) => this.tone(n, 0.2, { delay: i * 0.085, volume: 0.1 }));
        break;
      case "heal":
        [392, 440, 523.25, 659.25].forEach((n, i) => this.tone(n, 0.11, { delay: i * 0.06, volume: 0.07, type: "triangle" }));
        break;
      case "error":
        this.tone(110, 0.11, { volume: 0.08 });
        this.tone(92, 0.14, { volume: 0.08, delay: 0.1 });
        break;
      default:
        break;
    }
  }

  startMusic(name) {
    if (this.musicName === name && this.musicTimer) return;
    this.stopMusic();
    this.musicName = name;
    this.musicStep = 0;
    if (!this.context) return;
    this.nextNoteAt = this.context.currentTime + 0.04;
    const schedule = () => {
      if (!this.context || !this.musicName) return;
      const horizon = this.context.currentTime + 0.28;
      while (this.nextNoteAt < horizon) {
        this.scheduleMusicStep(this.musicName, this.musicStep, this.nextNoteAt - this.context.currentTime);
        const tempo = this.musicName === "fight" ? 154 : 128;
        this.nextNoteAt += (60 / tempo) / 4;
        this.musicStep += 1;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 90);
  }

  scheduleMusicStep(name, step, delay) {
    if (!this.enabled) return;
    const titleLead = [
      0, null, 7, null, 12, 11, 7, null, 5, null, 7, 5, 3, null, null, null,
      0, null, 7, null, 12, 14, 15, null, 12, 7, 5, 3, 0, null, null, null,
    ];
    const fightLead = [
      0, null, 3, 5, 7, null, 5, 3, 0, 0, 3, null, 5, 7, 10, null,
      12, null, 10, 7, 5, null, 3, 5, 7, 5, 3, 0, -2, null, null, null,
    ];
    const seq = name === "fight" ? fightLead : titleLead;
    const root = name === "fight" ? 164.81 : 130.81;
    const note = seq[step % seq.length];
    if (note !== null && step % 2 === 0) {
      this.tone(root * 2 ** (note / 12), 0.07, { delay, volume: name === "fight" ? 0.025 : 0.032, type: "square" });
    }
    if (step % 8 === 0) {
      const bassPattern = name === "fight" ? [0, 0, -2, 3] : [0, 5, 3, 7];
      const bass = root / 2 * 2 ** (bassPattern[Math.floor(step / 8) % 4] / 12);
      this.tone(bass, 0.11, { delay, volume: 0.035, type: "triangle" });
    }
    if (name === "fight" && step % 4 === 2) {
      this.noise(0.025, { delay, filter: "highpass", frequency: 3400, volume: 0.018 });
    }
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicName = null;
  }
}
