import Phaser from 'phaser';
import gsap from 'gsap';
import { C, R, TAU, mod, pocketCenter } from './geometry';
import { CONDITION_COLORS } from '../../../config/conditions';
import type { RoulettePocket as Pocket } from '../../../types/roulette';
import { RouletteSound } from './sound';
import {
  drawBall,
  drawBallShadow,
  drawBowl,
  drawGloss,
  drawHub,
  drawSpark,
  drawTurret,
  drawWheel,
} from './textures';

export type RoulettePhase = 'idle' | 'spinning' | 'landing' | 'settled';

export interface RouletteSceneOptions {
  pockets: Pocket[];
  centerLabel?: string;
  /** 1 = tempo real de cassino (~9 s de desaceleração). 2 = duas vezes mais rápido. */
  speed?: number;
  onPhaseChange?: (phase: RoulettePhase) => void;
}

// velocidades em rad/s
const IDLE_WHEEL = 0.12;
const SPIN_WHEEL = 2.3;
const SPIN_BALL = 13.5; // ~2,1 voltas/s, sentido contrário à roda
const MIN_SPIN_MS = 1800; // giro mínimo antes de pousar, mesmo se o backend responder rápido

const hermite = (u: number, p0: number, m0: number, p1: number) => {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1;
};

export class RouletteScene extends Phaser.Scene {
  readonly ready: Promise<void>;
  private resolveReady!: () => void;

  private opts: RouletteSceneOptions;
  private phase: RoulettePhase = 'idle';
  private texVersion = 0;

  // estado físico (animado pelo GSAP e integrado no update do Phaser)
  private s = {
    wheelAngle: 0,
    wheelVel: IDLE_WHEEL,
    ballAngle: 0,
    ballVel: 0,
    ballRadius: R.ballPocket as number,
    ballRel: 0, // ângulo da bola no referencial da roda (quando está numa casa)
    ballAlpha: 1,
  };

  private wheel!: Phaser.GameObjects.Image;
  private turret!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Image;
  private ghosts: Phaser.GameObjects.Image[] = [];
  private highlight!: Phaser.GameObjects.Graphics;
  private centerText!: Phaser.GameObjects.Text;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  private trail: { x: number; y: number }[] = [];
  private prevBall = { x: 0, y: 0 };
  private prevFret = -1;
  private prevRadius = 0;
  private radiusFalling = false;
  private spinStartedAt = 0;
  private landing?: gsap.core.Tween;

  readonly sfx = new RouletteSound();

  constructor(opts: RouletteSceneOptions) {
    super({ key: 'roulette' });
    this.opts = opts;
    this.ready = new Promise((r) => (this.resolveReady = r));
    this.s.ballRel = pocketCenter(0, opts.pockets.length);
  }

  // ---------- ciclo de vida ----------

  create() {
    this.textures.addCanvas('rw-bowl', drawBowl());
    this.textures.addCanvas('rw-turret', drawTurret());
    this.textures.addCanvas('rw-hub', drawHub());
    this.textures.addCanvas('rw-ball', drawBall());
    this.textures.addCanvas('rw-ball-shadow', drawBallShadow());
    this.textures.addCanvas('rw-gloss', drawGloss());
    this.textures.addCanvas('rw-spark', drawSpark());
    const wheelKey = this.buildWheelTexture();

    this.add.image(C, C, 'rw-bowl');
    this.wheel = this.add.image(C, C, wheelKey);
    this.highlight = this.add.graphics({ x: C, y: C }).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.turret = this.add.image(C, C, 'rw-turret');
    this.add.image(C, C, 'rw-hub');
    this.centerText = this.add
      .text(C, C + 1, this.opts.centerLabel ?? '', {
        fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
        fontSize: '22px',
        fontStyle: '700',
        color: '#e8f1ff',
      })
      .setOrigin(0.5);

    this.ballShadow = this.add.image(0, 0, 'rw-ball-shadow');
    for (let i = 0; i < 7; i++) {
      this.ghosts.push(this.add.image(0, 0, 'rw-ball').setAlpha(0));
    }
    this.ball = this.add.image(0, 0, 'rw-ball');
    this.add.image(C, C, 'rw-gloss');

    this.sparks = this.add.particles(0, 0, 'rw-spark', {
      speed: { min: 60, max: 260 },
      lifespan: { min: 400, max: 900 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gsap.killTweensOf(this.s);
      this.landing?.kill();
      this.sfx.dispose();
    });

    this.resolveReady();
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;
    const s = this.s;
    if (this.phase !== 'landing') {
      s.wheelAngle += s.wheelVel * dt;
      if (this.phase === 'spinning') s.ballAngle += s.ballVel * dt;
      else s.ballAngle = s.wheelAngle + s.ballRel;
    }
    this.renderState(dt);
  }

  // ---------- API pública ----------

  configure(opts: Partial<RouletteSceneOptions>) {
    const pocketsChanged = opts.pockets && opts.pockets !== this.opts.pockets;
    this.opts = { ...this.opts, ...opts };
    if (!this.sys.isActive()) return;
    if (opts.centerLabel !== undefined) this.centerText.setText(opts.centerLabel);
    if (pocketsChanged) {
      const old = this.wheel.texture.key;
      this.wheel.setTexture(this.buildWheelTexture());
      this.textures.remove(old);
    }
  }

  /** Lança a bola. Chame no clique; depois chame land() com o resultado do backend. */
  startSpin() {
    if (this.phase === 'spinning' || this.phase === 'landing') return;
    this.sfx.unlock();
    this.clearHighlight();
    gsap.killTweensOf(this.s);
    const s = this.s;
    s.ballAngle = s.wheelAngle + s.ballRel;
    s.ballAlpha = 1;
    this.setPhase('spinning');
    this.spinStartedAt = performance.now();

    // a bola salta da casa para a pista e é lançada contra o giro da roda
    gsap.to(s, { ballRadius: R.ballRim, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo(s, { ballVel: s.wheelVel - 2 }, { ballVel: -SPIN_BALL, duration: 0.55, ease: 'power3.out' });
    gsap.to(s, { wheelVel: SPIN_WHEEL, duration: 1.4, ease: 'power2.out' });
  }

  /** Desacelera roda e bola até a bola cair exatamente na casa `index` (vinda do backend). */
  async land(index: number): Promise<void> {
    const n = this.opts.pockets.length;
    if (!Number.isInteger(index) || index < 0 || index >= n) {
      this.abort();
      throw new Error(`Índice de casa inválido: ${index}`);
    }
    if (this.phase !== 'spinning') this.startSpin();

    const wait = MIN_SPIN_MS - (performance.now() - this.spinStartedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (this.phase !== 'spinning') return; // abortado nesse meio tempo

    gsap.killTweensOf(this.s);
    const s = this.s;
    s.ballRadius = R.ballRim;

    const T = 9; // roda para em T segundos
    const tA = 3; // bola desacelerando na pista
    const w0 = s.wheelAngle;
    const ww = s.wheelVel;
    const b0 = s.ballAngle;
    const v0 = s.ballVel; // negativa
    const v1 = v0 * 0.34;

    // roda: velocidade cai linearmente até 0 em T
    const wheelAt = (t: number) => w0 + ww * (t - (t * t) / (2 * T));
    const wheelVelAt = (t: number) => ww * (1 - t / T);
    // bola na pista: velocidade cai linearmente de v0 a v1 em tA
    const ballRimAt = (t: number) => b0 + v0 * t + ((v1 - v0) * t * t) / (2 * tA);

    const relA = ballRimAt(tA) - wheelAt(tA);
    const vr = v1 - wheelVelAt(tA); // velocidade relativa à roda no momento da queda (negativa)
    const speed = Math.abs(vr);

    // casa alvo (com leve variação dentro da casa para não parar sempre no centro)
    const seg = TAU / n;
    const base = pocketCenter(index, n) + (Math.random() - 0.5) * seg * 0.35;
    const d0 = mod(relA - base, TAU);

    // escolhe quantas voltas relativas a bola ainda dá para que o movimento
    // seja contínuo (sem tranco) e a duração da queda fique natural
    let best = { d: d0, tB: 2.4, score: Infinity };
    for (let k = 0; k < 6; k++) {
      const d = d0 + k * TAU;
      if (d < 0.5) continue;
      const tB = Math.min(3.6, Math.max(1.8, (2 * d) / speed));
      const m = (speed * tB) / d; // inclinação normalizada da Hermite (1.4–3 = desaceleração suave)
      const score = Math.abs(tB - 2.6) + (m < 1.4 || m > 3 ? 50 + Math.abs(m - 2) : 0);
      if (score < best.score) best = { d, tB, score };
    }
    const { d, tB } = best;
    const relTarget = relA - d;
    const rStart = R.ballRim - 8;
    const kick = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.05);
    const bounce = gsap.parseEase('bounce.out');

    const apply = (t: number) => {
      s.wheelAngle = wheelAt(t);
      if (t < tA) {
        const u = t / tA;
        s.ballAngle = ballRimAt(t);
        // perde velocidade e começa a descer a pista
        s.ballRadius = R.ballRim - 8 * Math.max(0, (u - 0.55) / 0.45) ** 2;
      } else if (t < tA + tB) {
        const u = (t - tA) / tB;
        const rel = hermite(u, relA, vr * tB, relTarget) + kick * Math.sin(Math.PI * 3 * u) ** 2 * (1 - u) ** 2;
        s.ballAngle = s.wheelAngle + rel;
        s.ballRadius = rStart + (R.ballPocket - rStart) * bounce(u);
      } else {
        s.ballAngle = s.wheelAngle + relTarget;
        s.ballRadius = R.ballPocket;
      }
    };

    this.setPhase('landing');
    const timeScale = this.opts.speed ?? 1;
    await new Promise<void>((resolve) => {
      const proxy = { t: 0 };
      this.landing = gsap.to(proxy, {
        t: T,
        duration: T,
        ease: 'none',
        onUpdate: () => apply(proxy.t),
        onComplete: () => {
          apply(T);
          s.ballRel = mod(relTarget, TAU);
          s.wheelVel = 0;
          this.setPhase('settled');
          this.celebrate(index);
          gsap.to(s, { wheelVel: IDLE_WHEEL, duration: 3, delay: 1.5, ease: 'sine.inOut' });
          resolve();
        },
      });
      this.landing.timeScale(timeScale);
    });
  }

  /** Cancela (ex.: backend falhou). A bola some e a roda volta ao giro lento. */
  abort() {
    this.landing?.kill();
    gsap.killTweensOf(this.s);
    const s = this.s;
    if (this.phase === 'landing') s.wheelVel = 0;
    this.setPhase('spinning');
    gsap.to(s, { ballVel: s.wheelVel, ballAlpha: 0, duration: 0.8, ease: 'power2.out' });
    gsap.to(s, {
      wheelVel: IDLE_WHEEL,
      duration: 1.6,
      ease: 'power2.out',
      onComplete: () => {
        s.ballRadius = R.ballPocket;
        this.setPhase('idle');
      },
    });
  }

  setMuted(muted: boolean) {
    this.sfx.muted = muted;
    if (muted) this.sfx.roll(0);
  }

  // ---------- internos ----------

  private setPhase(p: RoulettePhase) {
    this.phase = p;
    this.opts.onPhaseChange?.(p);
  }

  private buildWheelTexture(): string {
    const key = `rw-wheel-${++this.texVersion}`;
    this.textures.addCanvas(key, drawWheel(this.opts.pockets));
    return key;
  }

  private renderState(dt: number) {
    const s = this.s;
    this.wheel.rotation = s.wheelAngle;
    this.turret.rotation = s.wheelAngle;
    this.highlight.rotation = s.wheelAngle;

    // pequena oscilação vertical enquanto a bola corre na pista
    const wobble = this.phase === 'spinning' ? Math.sin(s.ballAngle * 7) * 0.8 : 0;
    const r = s.ballRadius + wobble;
    const x = C + Math.cos(s.ballAngle) * r;
    const y = C + Math.sin(s.ballAngle) * r;
    this.ball.setPosition(x, y).setAlpha(s.ballAlpha);

    // sombra deslocada para fora (luz vindo de cima/centro); maior na pista
    const lift = (r - R.ballPocket) / (R.ballRim - R.ballPocket);
    const off = 3 + lift * 3;
    this.ballShadow
      .setPosition(x + Math.cos(s.ballAngle) * off, y + Math.sin(s.ballAngle) * off + 2)
      .setAlpha(s.ballAlpha * (0.9 - lift * 0.2));

    // rastro de movimento
    const v = dt > 0 ? Math.hypot(x - this.prevBall.x, y - this.prevBall.y) / dt : 0;
    this.prevBall = { x, y };
    this.trail.unshift({ x, y });
    if (this.trail.length > this.ghosts.length + 1) this.trail.pop();
    const trailStrength = Math.min(1, Math.max(0, (v - 500) / 2200));
    this.ghosts.forEach((g, i) => {
      const p = this.trail[i + 1];
      if (!p) return g.setAlpha(0);
      g.setPosition(p.x, p.y)
        .setScale(1 - i * 0.07)
        .setAlpha(s.ballAlpha * trailStrength * 0.32 * (1 - i / this.ghosts.length));
    });

    // som de rolagem na pista
    const onTrack = r > R.trackInner;
    this.sfx.roll(onTrack && (this.phase === 'spinning' || this.phase === 'landing') ? Math.min(1, v / 3000) * s.ballAlpha : 0);

    // cliques: bola cruzando trastes dentro do anel das casas, e batidas ao quicar
    if (this.phase === 'landing') {
      const n = this.opts.pockets.length;
      const rel = mod(s.ballAngle - s.wheelAngle + Math.PI / 2, TAU);
      const fret = Math.floor(rel / (TAU / n));
      if (r < R.numberIn + 12 && fret !== this.prevFret && this.prevFret !== -1) {
        this.sfx.click(Math.min(1, v / 900) * 0.7 + 0.15, 0.9 + Math.random() * 0.25);
      }
      this.prevFret = fret;
      const falling = r < this.prevRadius;
      if (this.radiusFalling && !falling && r < R.trackInner) this.sfx.click(0.9, 0.7);
      this.radiusFalling = falling;
    } else {
      this.prevFret = -1;
    }
    this.prevRadius = r;
  }

  private celebrate(index: number) {
    const n = this.opts.pockets.length;
    const seg = TAU / n;
    const a0 = pocketCenter(index, n) - seg / 2;
    const a1 = a0 + seg;
    const color = Phaser.Display.Color.HexStringToColor(CONDITION_COLORS[this.opts.pockets[index].condition]).color;

    const g = this.highlight;
    g.clear();
    g.fillStyle(0xffffff, 0.35);
    g.beginPath();
    g.arc(0, 0, R.wheel - 6, a0, a1, false);
    g.arc(0, 0, R.pocketIn, a1, a0, true);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xfff1b8, 1);
    g.strokePath();

    gsap.killTweensOf(g);
    gsap.fromTo(
      g,
      { alpha: 0 },
      {
        alpha: 1,
        duration: 0.3,
        repeat: 5,
        yoyo: true,
        ease: 'sine.inOut',
        onComplete: () => void gsap.to(g, { alpha: 0.6, duration: 0.4 }),
      },
    );

    this.sparks.setParticleTint(color);
    this.sparks.explode(26, this.ball.x, this.ball.y);
    this.sparks.setParticleTint(0xffe7a3);
    this.sparks.explode(14, this.ball.x, this.ball.y);

    gsap.fromTo(this.centerText, { scale: 1.6 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  }

  private clearHighlight() {
    gsap.killTweensOf(this.highlight);
    gsap.to(this.highlight, { alpha: 0, duration: 0.25 });
  }
}
