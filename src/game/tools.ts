// ===== 工具定义 =====
import type { BlockType } from './blocks';

export type ToolType = 'axe' | 'pickaxe' | 'shovel' | 'sword';

export interface ToolDef {
  id: ToolType;
  label: string;
  color: number;
  accent: number;
  /** 对每种方块的破坏速度倍率 */
  speedMultiplier: Partial<Record<BlockType, number>>;
}

export const TOOLS: Record<ToolType, ToolDef> = {
  axe: {
    id: 'axe',
    label: '斧头',
    color: 0x8b5a2b,
    accent: 0xc0c0c0,
    speedMultiplier: { wood: 4, plank: 3.5, leaves: 2, grass: 1.5 },
  },
  pickaxe: {
    id: 'pickaxe',
    label: '镐子',
    color: 0x707070,
    accent: 0xffb74d,
    speedMultiplier: { stone: 4, brick: 3.5, sand: 2 },
  },
  shovel: {
    id: 'shovel',
    label: '铲子',
    color: 0xa67c52,
    accent: 0xb0b0b0,
    speedMultiplier: { sand: 4, dirt: 3, grass: 1.2 },
  },
  sword: {
    id: 'sword',
    label: '剑',
    color: 0xb0b0b0,
    accent: 0xffd54a,
    speedMultiplier: { leaves: 3, grass: 1.5 },
  },
};

/** 破坏方块所需时间（秒）—— 工具倍率影响 */
export function breakTime(tool: ToolType | null, block: BlockType, baseHardness: number): number {
  if (!tool) return baseHardness;
  const mult = TOOLS[tool].speedMultiplier[block] ?? 1;
  return baseHardness / mult;
}
