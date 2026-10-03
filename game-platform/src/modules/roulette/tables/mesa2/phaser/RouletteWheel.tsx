import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Phaser from 'phaser';
import { RouletteScene, type RoulettePhase } from './RouletteScene';
import { SIZE } from './geometry';
import type { RoulettePocket as Pocket } from '../../../types/roulette';

export interface RouletteWheelHandle {
  /**
   * Lança a bola na hora e espera a resposta do backend.
   * Quando ela chega, a roda desacelera até a casa indicada por `pickIndex`.
   * Resolve com a resposta depois que a bola parou.
   */
  spin<T>(result: Promise<T>, pickIndex: (response: T) => number): Promise<T>;
  abort(): void;
}

interface Props {
  pockets: Pocket[];
  centerLabel?: string;
  muted?: boolean;
  /** 1 = tempo real. Use 2–3 em testes. */
  speed?: number;
  onPhaseChange?: (phase: RoulettePhase) => void;
  className?: string;
}

export const RouletteWheel = forwardRef<RouletteWheelHandle, Props>(function RouletteWheel(
  { pockets, centerLabel, muted = false, speed = 1, onPhaseChange, className },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RouletteScene | null>(null);
  const phaseCb = useRef(onPhaseChange);
  phaseCb.current = onPhaseChange;

  // cria o jogo Phaser uma única vez
  useEffect(() => {
    const scene = new RouletteScene({
      pockets,
      centerLabel,
      speed,
      onPhaseChange: (p) => phaseCb.current?.(p),
    });
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current!,
      width: SIZE,
      height: SIZE,
      transparent: true,
      banner: false,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      scene,
    });
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) void scene.ready.then(() => scene.configure({ pockets, centerLabel, speed }));
  }, [pockets, centerLabel, speed]);

  useEffect(() => {
    sceneRef.current?.setMuted(muted);
  }, [muted]);

  useImperativeHandle(ref, () => ({
    async spin<T>(result: Promise<T>, pickIndex: (r: T) => number): Promise<T> {
      const scene = sceneRef.current;
      if (!scene) throw new Error('Roleta ainda não montada');
      await scene.ready;
      scene.startSpin();
      let response: T;
      try {
        response = await result;
      } catch (err) {
        scene.abort();
        throw err;
      }
      await scene.land(pickIndex(response));
      return response;
    },
    abort() {
      sceneRef.current?.abort();
    },
  }));

  return <div ref={hostRef} className={className} style={{ width: '100%', aspectRatio: '1 / 1' }} />;
});
