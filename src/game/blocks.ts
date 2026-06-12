// ===== 方块定义 =====
export type BlockType =
  | 'air'
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'wood'
  | 'leaves'
  | 'sand'
  | 'water'
  | 'plank'
  | 'brick';

export interface BlockDef {
  id: BlockType;
  label: string;
  color: number; // 基础颜色
  solid: boolean;
  /** 基础硬度（秒）—— 影响空手破坏所需时间 */
  hardness: number;
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  air:    { id: 'air',    label: '空气',   color: 0x000000, solid: false, hardness: 0 },
  grass:  { id: 'grass',  label: '草方块', color: 0x4a9b3a, solid: true,  hardness: 0.6 },
  dirt:   { id: 'dirt',   label: '泥土',   color: 0x6b4a2b, solid: true,  hardness: 0.5 },
  stone:  { id: 'stone',  label: '石头',   color: 0x808080, solid: true,  hardness: 1.5 },
  wood:   { id: 'wood',   label: '木头',   color: 0x6a4b2a, solid: true,  hardness: 1.2 },
  leaves: { id: 'leaves', label: '树叶',   color: 0x2f7a2a, solid: true,  hardness: 0.3 },
  sand:   { id: 'sand',   label: '沙子',   color: 0xe6d58a, solid: true,  hardness: 0.5 },
  water:  { id: 'water',  label: '水',     color: 0x3a7bd5, solid: false, hardness: 0 },
  plank:  { id: 'plank',  label: '木板',   color: 0xa07848, solid: true,  hardness: 1.0 },
  brick:  { id: 'brick',  label: '砖块',   color: 0xb25a4b, solid: true,  hardness: 1.8 },
};

// ===== 工具定义 =====
export type ToolType = 'axe' | 'pickaxe' | 'sword' | 'shovel';

export interface ToolDef {
  id: ToolType;
  label: string;
  color: number;     // 主色
  accent: number;    // 强调色
  /** 对每种方块类型的破坏速度倍率 */
  speedMultiplier: Partial<Record<BlockType, number>>;
  isTool: true;
}

export const TOOLS: Record<ToolType, ToolDef> = {
  axe: {
    id: 'axe', label: '斧头', color: 0x8b5a2b, accent: 0xc0c0c0, isTool: true,
    speedMultiplier: { wood: 4, plank: 3.5, leaves: 2, grass: 1.5 },
  },
  pickaxe: {
    id: 'pickaxe', label: '镐子', color: 0x707070, accent: 0xffb74d, isTool: true,
    speedMultiplier: { stone: 4, brick: 3.5, sand: 2 },
  },
  shovel: {
    id: 'shovel', label: '铲子', color: 0xa67c52, accent: 0xb0b0b0, isTool: true,
    speedMultiplier: { sand: 4, dirt: 3, grass: 1.2 },
  },
  sword: {
    id: 'sword', label: '剑', color: 0xb0b0b0, accent: 0xffd54a, isTool: true,
    speedMultiplier: { leaves: 3, grass: 1.5 },
  },
};

// ===== 快捷栏槽位（方块 or 工具） =====
export type SlotKind = { kind: 'block'; type: BlockType } | { kind: 'tool'; type: ToolType };

export const HOTBAR: SlotKind[] = [
  { kind: 'block', type: 'grass' },
  { kind: 'block', type: 'dirt' },
  { kind: 'block', type: 'stone' },
  { kind: 'block', type: 'wood' },
  { kind: 'block', type: 'plank' },
  { kind: 'block', type: 'brick' },
  { kind: 'tool',  type: 'axe' },
  { kind: 'tool',  type: 'pickaxe' },
  { kind: 'tool',  type: 'shovel' },
];

/** 获取一个 slot 的基础破坏速度（秒），返回 null 表示不能放置方块（工具） */
export function slotBreakTime(slot: SlotKind, block: BlockType): number | null {
  if (block === 'air' || block === 'water') return null;
  const base = BLOCKS[block].hardness;
  if (slot.kind === 'tool') {
    const mult = TOOLS[slot.type].speedMultiplier[block] ?? 1;
    return base / mult;
  }
  // 空手：按基础硬度
  return base;
}

export function slotLabel(slot: SlotKind): string {
  if (slot.kind === 'tool') return TOOLS[slot.type].label;
  return BLOCKS[slot.type].label;
}

export const BLOCK_SIZE = 1;
