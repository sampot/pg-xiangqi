/**
 * Xiangqi SFX: Kenney UI samples + short synthesized fallbacks.
 */

const SFX = {
  select: "./assets/sfx/rollover1.ogg",
  move: "./assets/sfx/click1.ogg",
  capture: "./assets/sfx/switch1.ogg",
  deny: "./assets/sfx/click2.ogg",
  win: "./assets/music/jingles_HIT05.ogg",
};

export class XiangqiAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.35;
    /** @type {Map<string, AudioBuffer>} */
    this.buffers = new Map();
    this._loadPromise = null;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
    await this.preload();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  async preload() {
    if (this._loadPromise) return this._loadPromise;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    this._loadPromise = Promise.all(
      Object.entries(SFX).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          const raw = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(raw.slice(0));
          this.buffers.set(key, buf);
        } catch {
          /* synthesized fallback */
        }
      }),
    );
    return this._loadPromise;
  }

  /**
   * @param {string} key
   * @param {number} [gain]
   */
  play(key, gain = 0.5) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const buf = this.buffers.get(key);
    if (buf) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = gain * this.master;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
      return;
    }
    this._toneFallback(key);
  }

  /**
   * @param {string} key
   */
  _toneFallback(key) {
    const map = {
      select: [660, 0.03, "sine", 0.05],
      move: [280, 0.05, "triangle", 0.07],
      capture: [200, 0.08, "sawtooth", 0.1],
      deny: [110, 0.06, "sawtooth", 0.05],
      check: [520, 0.08, "square", 0.08],
      win: [400, 0.12, "square", 0.1],
      lose: [160, 0.2, "triangle", 0.1],
    };
    const conf = map[key];
    if (!conf) return;
    this.tone(conf[0], conf[1], conf[2], conf[3]);
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   */
  tone(freq, dur, type = "square", gain = 0.12, when = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  select() {
    this.play("select", 0.35);
  }
  move() {
    this.play("move", 0.45);
  }
  capture() {
    this.play("capture", 0.55);
  }
  deny() {
    this.play("deny", 0.4);
  }
  check() {
    this.tone(540, 0.07, "square", 0.09);
    this.tone(720, 0.09, "sine", 0.07, 0.06);
  }
  win() {
    this.play("win", 0.55);
  }
  lose() {
    this.tone(280, 0.15, "sawtooth", 0.1);
    this.tone(160, 0.25, "triangle", 0.1, 0.12);
  }
}
