// ===== 渲染器接口 =====
import type { GameRendererKind, Vec3, BreakInfo, Slot } from './types';
import type { World } from './world';

export interface GameRenderer {
  readonly kind: GameRendererKind;
  init(container: HTMLElement): boolean;
  render(state: {
    pos: Vec3;
    yaw: number;
    pitch: number;
    vel: Vec3;
    onGround: boolean;
    mode: 'walk' | 'fly';
    highlight: Vec3 | null;
    breaking: BreakInfo;
    dayTime: number;
    currentSlot: Slot;
    isBreaking: boolean;
  }, world: World): void;
  requestPointerLock?(): void;
  onResize(): void;
  dispose(): void;
}
