/* ============================================
 * audio.js — Web Audio 合成音效（无外部音频文件，离线可用）
 * ============================================ */
'use strict';

const SFX = {
  ctx: null,
  muted: false,

  _ac() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  _tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slide = 0) {
    if (this.muted) return;
    const ac = this._ac(); if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },

  correct() {  // 答对：上行琶音
    [523, 659, 784].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.18, i * 0.09));
  },
  wrong() {    // 答错：温和低音（不刺耳）
    this._tone(330, 0.25, 'sine', 0.12);
    this._tone(262, 0.3, 'sine', 0.1, 0.15);
  },
  plant() { this._tone(220, 0.12, 'square', 0.08); this._tone(440, 0.1, 'square', 0.06, 0.08); },
  shoot() { this._tone(700, 0.08, 'square', 0.05, 0, -200); },
  hit() { this._tone(150, 0.1, 'sawtooth', 0.07, 0, -60); },
  zombieDown() { this._tone(200, 0.2, 'sawtooth', 0.1, 0, -120); this._tone(120, 0.25, 'sawtooth', 0.08, 0.1); },
  sun() { this._tone(880, 0.1, 'triangle', 0.12); this._tone(1175, 0.12, 'triangle', 0.1, 0.08); },
  wave() { [392, 392, 392].forEach((f, i) => this._tone(f, 0.15, 'square', 0.1, i * 0.2)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.25, 'triangle', 0.18, i * 0.18)); },
  lose() { [400, 350, 300, 250].forEach((f, i) => this._tone(f, 0.3, 'sawtooth', 0.12, i * 0.22)); },
  summon() { this._tone(180, 0.15, 'sawtooth', 0.1, 0, 80); },
  buff() { [660, 880, 990].forEach((f, i) => this._tone(f, 0.12, 'triangle', 0.15, i * 0.08)); },
};
