import { C, R, SIZE, TAU, pocketCenter } from './geometry';
import { CONDITION_COLORS } from '../../../config/conditions';
import type { RoulettePocket as Pocket } from '../../../types/roulette';

/**
 * Todas as texturas são desenhadas uma vez em canvas 2D (gradientes, veios de
 * madeira, latão) e enviadas ao Phaser. Assim a cena só move sprites prontos.
 */

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h = w): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function ring(ctx: Ctx, outer: number, inner: number) {
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, TAU);
  ctx.arc(0, 0, inner, 0, TAU, true);
  ctx.closePath();
}

function wedge(ctx: Ctx, outer: number, inner: number, a0: number, a1: number) {
  ctx.beginPath();
  ctx.arc(0, 0, outer, a0, a1);
  ctx.arc(0, 0, inner, a1, a0, true);
  ctx.closePath();
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** Veios concêntricos de madeira torneada. */
function woodGrain(ctx: Ctx, outer: number, inner: number, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.save();
  ring(ctx, outer, inner);
  ctx.clip();
  for (let r = inner; r < outer; r += 0.9 + rnd() * 1.6) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    const dark = rnd() > 0.5;
    ctx.strokeStyle = dark ? `rgba(30,12,4,${0.05 + rnd() * 0.12})` : `rgba(255,200,140,${0.02 + rnd() * 0.05})`;
    ctx.lineWidth = 0.6 + rnd() * 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function brass(ctx: Ctx, r: number): CanvasGradient {
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#f6dc8f');
  g.addColorStop(0.35, '#c9993f');
  g.addColorStop(0.55, '#8a6220');
  g.addColorStop(0.8, '#d8b061');
  g.addColorStop(1, '#7a5418');
  return g;
}

/** Parte fixa: tigela de madeira, pista da bola e defletores. */
export function drawBowl(): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(SIZE);
  ctx.translate(C, C);

  // sombra projetada na mesa
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(0, 0, R.bowl - 6, 0, TAU);
  ctx.fillStyle = '#2a1408';
  ctx.fill();
  ctx.restore();

  // madeira externa
  let g = ctx.createRadialGradient(-60, -80, 40, 0, 0, R.bowl);
  g.addColorStop(0, '#8a4f24');
  g.addColorStop(0.75, '#6b3816');
  g.addColorStop(0.9, '#4a240c');
  g.addColorStop(1, '#2c1406');
  ring(ctx, R.bowl - 6, R.bowlInner);
  ctx.fillStyle = g;
  ctx.fill();
  woodGrain(ctx, R.bowl - 6, R.bowlInner, 7);

  // verniz: brilho na metade de cima
  g = ctx.createLinearGradient(0, -R.bowl, 0, R.bowl);
  g.addColorStop(0, 'rgba(255,220,170,0.22)');
  g.addColorStop(0.45, 'rgba(255,220,170,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ring(ctx, R.bowl - 6, R.bowlInner);
  ctx.fillStyle = g;
  ctx.fill();

  // aro de latão
  ring(ctx, R.bowlInner, R.trackOuter);
  ctx.fillStyle = brass(ctx, R.bowlInner);
  ctx.fill();

  // pista da bola (madeira escura polida, inclinada)
  g = ctx.createRadialGradient(0, 0, R.trackInner, 0, 0, R.trackOuter);
  g.addColorStop(0, '#1d0d05');
  g.addColorStop(0.55, '#3b1e0c');
  g.addColorStop(0.9, '#5a3014');
  g.addColorStop(1, '#2a1306');
  ring(ctx, R.trackOuter, R.trackInner - 6);
  ctx.fillStyle = g;
  ctx.fill();
  woodGrain(ctx, R.trackOuter, R.trackInner - 6, 13);

  // reflexo na pista
  g = ctx.createLinearGradient(-R.trackOuter, -R.trackOuter, R.trackOuter, R.trackOuter);
  g.addColorStop(0, 'rgba(255,230,190,0.16)');
  g.addColorStop(0.5, 'rgba(255,230,190,0)');
  g.addColorStop(1, 'rgba(255,230,190,0.05)');
  ring(ctx, R.trackOuter, R.trackInner - 6);
  ctx.fillStyle = g;
  ctx.fill();

  // sombra onde a roda entra na tigela
  g = ctx.createRadialGradient(0, 0, R.wheel - 4, 0, 0, R.trackInner + 4);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ring(ctx, R.trackInner + 4, R.wheel - 4);
  ctx.fillStyle = g;
  ctx.fill();

  // defletores (8 losangos de latão, alternando a orientação)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + TAU / 16;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(R.deflector, 0);
    if (k % 2) ctx.rotate(Math.PI / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(0, -5);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fillStyle = brass(ctx, 11);
    ctx.fill();
    ctx.restore();
  }

  return cv;
}

/** Parte que gira: casas, números, trastes e cone de madeira. */
export function drawWheel(pockets: Pocket[]): HTMLCanvasElement {
  const D = R.wheel * 2 + 8;
  const [cv, ctx] = makeCanvas(D);
  ctx.translate(D / 2, D / 2);
  const n = pockets.length;
  const seg = TAU / n;

  // base escura da roda
  ctx.beginPath();
  ctx.arc(0, 0, R.wheel, 0, TAU);
  ctx.fillStyle = '#120904';
  ctx.fill();

  pockets.forEach((p, i) => {
    const color = CONDITION_COLORS[p.condition];
    const a0 = pocketCenter(i, n) - seg / 2;
    const a1 = a0 + seg;

    // anel dos números
    wedge(ctx, R.wheel - 6, R.numberIn, a0, a1);
    ctx.fillStyle = color;
    ctx.fill();

    // casa (mais funda, mais escura)
    const g = ctx.createRadialGradient(0, 0, R.pocketIn, 0, 0, R.numberIn);
    g.addColorStop(0, shade(color, 0.45));
    g.addColorStop(0.6, shade(color, 0.7));
    g.addColorStop(1, shade(color, 0.55));
    wedge(ctx, R.numberIn, R.pocketIn, a0, a1);
    ctx.fillStyle = g;
    ctx.fill();
  });

  // volume no anel de números
  let g = ctx.createRadialGradient(0, 0, R.numberIn, 0, 0, R.wheel - 6);
  g.addColorStop(0, 'rgba(0,0,0,0.25)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ring(ctx, R.wheel - 6, R.numberIn);
  ctx.fillStyle = g;
  ctx.fill();

  // números
  const fontSize = Math.min(22, Math.floor(((TAU * (R.numberIn + 20)) / n) * 0.52));
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px "Space Grotesk", "Segoe UI", sans-serif`;
  pockets.forEach((p, i) => {
    ctx.save();
    ctx.rotate(pocketCenter(i, n) + Math.PI / 2);
    ctx.translate(0, -(R.numberIn + (R.wheel - 6 - R.numberIn) / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(p.label, 0, 1);
    ctx.restore();
  });

  // trastes metálicos entre as casas
  for (let i = 0; i < n; i++) {
    const a = pocketCenter(i, n) - seg / 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cos * R.pocketIn, sin * R.pocketIn);
    ctx.lineTo(cos * R.numberIn, sin * R.numberIn);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.strokeStyle = '#d9dfe8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cos * R.numberIn, sin * R.numberIn);
    ctx.lineTo(cos * (R.wheel - 6), sin * (R.wheel - 6));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // filetes de latão separando os anéis
  for (const [r, w] of [
    [R.wheel - 4, 4],
    [R.numberIn, 2.5],
    [R.pocketIn, 4],
  ] as const) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = brass(ctx, R.wheel);
    ctx.lineWidth = w;
    ctx.stroke();
  }

  // cone central de madeira
  g = ctx.createRadialGradient(-30, -40, 10, 0, 0, R.cone);
  g.addColorStop(0, '#a3622f');
  g.addColorStop(0.5, '#7c4419');
  g.addColorStop(0.85, '#5a2e10');
  g.addColorStop(1, '#3b1c08');
  ctx.beginPath();
  ctx.arc(0, 0, R.cone, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  woodGrain(ctx, R.cone, 40, 29);

  // sulcos torneados
  for (const r of [176, 150, 124, 100]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = 'rgba(25,10,2,0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, TAU);
    ctx.strokeStyle = 'rgba(255,210,150,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return cv;
}

/** Torre central de latão (cruz com esferas). Gira junto com a roda. */
export function drawTurret(): HTMLCanvasElement {
  const D = R.turret * 2 + 20;
  const [cv, ctx] = makeCanvas(D);
  ctx.translate(D / 2, D / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.rotate(Math.PI / 4 + (k * Math.PI) / 2);
    const g = ctx.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, '#f3d68a');
    g.addColorStop(0.5, '#b9862f');
    g.addColorStop(1, '#6e4a14');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, -4.5, R.turret - 14, 9, 4);
    ctx.fill();
    // esfera da ponta
    const rg = ctx.createRadialGradient(R.turret - 16, -4, 1, R.turret - 12, 0, 12);
    rg.addColorStop(0, '#fff3c8');
    rg.addColorStop(0.4, '#d9ad55');
    rg.addColorStop(1, '#6b4612');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(R.turret - 12, 0, 11, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // base da torre
  const g = ctx.createRadialGradient(-10, -12, 4, 0, 0, R.hub + 14);
  g.addColorStop(0, '#fbe6a8');
  g.addColorStop(0.5, '#c4923a');
  g.addColorStop(1, '#5e3c0e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R.hub + 12, 0, TAU);
  ctx.fill();
  return cv;
}

/** Disco central fixo onde vai o rótulo (ex.: "3×"). */
export function drawHub(): HTMLCanvasElement {
  const D = R.hub * 2 + 8;
  const [cv, ctx] = makeCanvas(D);
  ctx.translate(D / 2, D / 2);
  const g = ctx.createRadialGradient(-8, -10, 2, 0, 0, R.hub);
  g.addColorStop(0, '#1f3550');
  g.addColorStop(1, '#0a1422');
  ctx.beginPath();
  ctx.arc(0, 0, R.hub, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = brass(ctx, R.hub);
  ctx.stroke();
  return cv;
}

export function drawBall(): HTMLCanvasElement {
  const D = R.ball * 2 + 4;
  const [cv, ctx] = makeCanvas(D);
  ctx.translate(D / 2, D / 2);
  const g = ctx.createRadialGradient(-3.5, -4, 0.5, 0, 0, R.ball);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#f1f4f8');
  g.addColorStop(0.8, '#b7c0cc');
  g.addColorStop(1, '#6f7a88');
  ctx.beginPath();
  ctx.arc(0, 0, R.ball, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  return cv;
}

export function drawBallShadow(): HTMLCanvasElement {
  const D = 48;
  const [cv, ctx] = makeCanvas(D);
  const g = ctx.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, D, D);
  return cv;
}

/** Reflexo de vidro/verniz fixo por cima da roda: dá sensação de profundidade quando ela gira. */
export function drawGloss(): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(SIZE);
  ctx.translate(C, C);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R.wheel, 0, TAU);
  ctx.clip();
  const g = ctx.createRadialGradient(-130, -170, 10, -90, -120, 330);
  g.addColorStop(0, 'rgba(255,245,225,0.20)');
  g.addColorStop(0.5, 'rgba(255,245,225,0.05)');
  g.addColorStop(1, 'rgba(255,245,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-R.wheel, -R.wheel, R.wheel * 2, R.wheel * 2);
  const v = ctx.createRadialGradient(0, 0, R.wheel * 0.75, 0, 0, R.wheel);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(-R.wheel, -R.wheel, R.wheel * 2, R.wheel * 2);
  ctx.restore();
  return cv;
}

export function drawSpark(): HTMLCanvasElement {
  const D = 24;
  const [cv, ctx] = makeCanvas(D);
  const g = ctx.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, D, D);
  return cv;
}
