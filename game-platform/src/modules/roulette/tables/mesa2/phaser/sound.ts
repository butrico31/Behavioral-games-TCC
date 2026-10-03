/**
 * Sons sintetizados com WebAudio (sem arquivos): rolar da bola na pista
 * e os "cliques" quando ela bate nos trastes e quica nas casas.
 */
export class RouletteSound {
  private ctx?: AudioContext;
  private noise?: AudioBuffer;
  private rollGain?: GainNode;
  private rollFilter?: BiquadFilterNode;
  private lastClick = 0;
  muted = false;

  /** Precisa ser chamado dentro de um gesto do usuário (clique). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = Math.floor(this.ctx.sampleRate * 2);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startRoll();
    }
    void this.ctx.resume();
  }

  private startRoll() {
    if (!this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.rollFilter = this.ctx.createBiquadFilter();
    this.rollFilter.type = 'lowpass';
    this.rollFilter.frequency.value = 400;
    this.rollGain = this.ctx.createGain();
    this.rollGain.gain.value = 0;
    src.connect(this.rollFilter).connect(this.rollGain).connect(this.ctx.destination);
    src.start();
  }

  /** level 0..1 = velocidade da bola na pista. */
  roll(level: number) {
    if (!this.ctx || !this.rollGain || !this.rollFilter) return;
    const t = this.ctx.currentTime;
    const v = this.muted ? 0 : Math.max(0, Math.min(1, level));
    this.rollGain.gain.setTargetAtTime(v * 0.09, t, 0.08);
    this.rollFilter.frequency.setTargetAtTime(250 + v * 650, t, 0.1);
  }

  click(volume: number, pitch = 1) {
    if (this.muted || !this.ctx || !this.noise) return;
    const now = this.ctx.currentTime;
    if (now - this.lastClick < 0.02) return;
    this.lastClick = now;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600 * pitch;
    bp.Q.value = 6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(1, volume) * 0.9, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(now, Math.random());
    src.stop(now + 0.06);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
