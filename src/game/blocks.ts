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
  color: number;
  solid: boolean;
  /** 基础硬度（秒）—— 空手破坏所需时间 */
  hardness: number;
  /** 音效频率（Hz）—— 破坏音 */
  soundFreq: number;
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  air:    { id: 'air',    label: '空气',   color: 0x000000, solid: false, hardness: 0,    soundFreq: 0 },
  grass:  { id: 'grass',  label: '草方块', color: 0x4a9b3a, solid: true,  hardness: 0.6,  soundFreq: 320 },
  dirt:   { id: 'dirt',   label: '泥土',   color: 0x6b4a2b, solid: true,  hardness: 0.5,  soundFreq: 280 },
  stone:  { id: 'stone',  label: '石头',   color: 0x808080, solid: true,  hardness: 1.5,  soundFreq: 180 },
  wood:   { id: 'wood',   label: '木头',   color: 0x6a4b2a, solid: true,  hardness: 1.2,  soundFreq: 380 },
  leaves: { id: 'leaves', label: '树叶',   color: 0x2f7a2a, solid: true,  hardness: 0.3,  soundFreq: 460 },
  sand:   { id: 'sand',   label: '沙子',   color: 0xe6d58a, solid: true,  hardness: 0.5,  soundFreq: 300 },
  water:  { id: 'water',  label: '水',     color: 0x3a7bd5, solid: false, hardness: 0,    soundFreq: 0 },
  plank:  { id: 'plank',  label: '木板',   color: 0xa07848, solid: true,  hardness: 1.0,  soundFreq: 420 },
  brick:  { id: 'brick',  label: '砖块',   color: 0xb25a4b, solid: true,  hardness: 1.8,  soundFreq: 220 },
};

export const BLOCK_SIZE = 1;
