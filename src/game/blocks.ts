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
  /** 顶面颜色稍微变亮，侧面正常，底面变暗 — 模拟简单光照 */
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  air:    { id: 'air',    label: '空气', color: 0x000000, solid: false },
  grass:  { id: 'grass',  label: '草方块', color: 0x4a9b3a, solid: true },
  dirt:   { id: 'dirt',   label: '泥土',   color: 0x6b4a2b, solid: true },
  stone:  { id: 'stone',  label: '石头',   color: 0x808080, solid: true },
  wood:   { id: 'wood',   label: '木头',   color: 0x6a4b2a, solid: true },
  leaves: { id: 'leaves', label: '树叶',   color: 0x2f7a2a, solid: true },
  sand:   { id: 'sand',   label: '沙子',   color: 0xe6d58a, solid: true },
  water:  { id: 'water',  label: '水',     color: 0x3a7bd5, solid: false },
  plank:  { id: 'plank',  label: '木板',   color: 0xa07848, solid: true },
  brick:  { id: 'brick',  label: '砖块',   color: 0xb25a4b, solid: true },
};

export const HOTBAR: BlockType[] = [
  'grass',
  'dirt',
  'stone',
  'wood',
  'leaves',
  'sand',
  'plank',
  'brick',
  'water',
];

export const BLOCK_SIZE = 1;
