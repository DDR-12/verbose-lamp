// ===== 快捷栏定义 =====
import type { Slot } from './types';
import type { BlockType } from './blocks';
import type { ToolType } from './tools';

export const DEFAULT_HOTBAR: Slot[] = [
  { kind: 'block', type: 'grass' as BlockType },
  { kind: 'block', type: 'dirt' as BlockType },
  { kind: 'block', type: 'stone' as BlockType },
  { kind: 'block', type: 'wood' as BlockType },
  { kind: 'block', type: 'plank' as BlockType },
  { kind: 'block', type: 'brick' as BlockType },
  { kind: 'block', type: 'water' as BlockType },
  { kind: 'tool', type: 'axe' as ToolType },
  { kind: 'tool', type: 'pickaxe' as ToolType },
];

export function slotLabel(slot: Slot): string {
  if (slot.kind === 'tool') {
    return { axe: '斧头', pickaxe: '镐子', shovel: '铲子', sword: '剑' }[slot.type];
  }
  return { grass: '草方块', dirt: '泥土', stone: '石头', wood: '木头', plank: '木板', brick: '砖块',
           leaves: '树叶', sand: '沙子', water: '水', air: '空气' }[slot.type];
}

export function isTool(slot: Slot): slot is { kind: 'tool'; type: ToolType } {
  return slot.kind === 'tool';
}
