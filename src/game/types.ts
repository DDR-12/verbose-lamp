// ===== 共享类型 =====

import type { BlockType } from './blocks';
import type { ToolType } from './tools';

export type Vec3 = { x: number; y: number; z: number };

export type Slot = { kind: 'block'; type: BlockType } | { kind: 'tool'; type: ToolType };

export type MoveMode = 'walk' | 'fly';

export type BreakInfo = {
  pos: Vec3;
  progress: number;
  total: number;
  block: BlockType;
} | null;

export type HighlightInfo = Vec3 | null;

export type GameRendererKind = '3d' | '2d' | 'none';

export interface GameState {
  // === 玩家 ===
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  onGround: boolean;
  mode: MoveMode;

  // === 输入 ===
  keys: Set<string>;
  pointerLocked: boolean;
  leftDown: boolean;

  // === 快捷栏 ===
  hotbarIndex: number;
  slots: Slot[];

  // === 状态 ===
  breaking: BreakInfo;
  highlight: HighlightInfo;
  renderer: GameRendererKind;
  frameCount: number;
  dayTime: number; // 0~24000
  hasStarted: boolean;
  paused: boolean;
  error: string | null;
  saveMenuOpen: boolean;
  saveMessage: string | null;
  blockCount: number;
  /** 玩家在开始界面选择的存档槽位（0/1/2），引擎启动时读取 */
  pendingSlot: number;
}

export type Vec3Array = [number, number, number];
