// 角色数据 - 大富翁 4 原版角色
export interface CharacterDef {
  id: string;
  name: string;
  desc: string;
  cash: number;
  color: string;      // tailwind 颜色类
  hex: string;        // 实际颜色
  emoji: string;      // 头像 emoji
  bgGradient: string; // 头像背景
  perk: PerkDef;
}

export interface PerkDef {
  type: 'buildDiscount' | 'rentBonus' | 'cashBonus' | 'stockBonus';
  value: number; // 百分比 0-1
  label: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'sunxiaomei',
    name: '孙小美',
    desc: '建筑大师，盖房子省钱 10%',
    cash: 15000,
    color: 'pink',
    hex: '#E91E63',
    emoji: '👧🏻',
    bgGradient: 'linear-gradient(135deg, #FFD1DC 0%, #E91E63 100%)',
    perk: { type: 'buildDiscount', value: 0.10, label: '建筑费 -10%' },
  },
  {
    id: 'atu',
    name: '阿土仔',
    desc: '福气满满，过路费加成 20%',
    cash: 15000,
    color: 'blue',
    hex: '#2A4A7F',
    emoji: '👦🏻',
    bgGradient: 'linear-gradient(135deg, #B3D9FF 0%, #2A4A7F 100%)',
    perk: { type: 'rentBonus', value: 0.20, label: '过路费 +20%' },
  },
  {
    id: 'qian',
    name: '钱夫人',
    desc: '富甲一方，初始现金 +20%',
    cash: 18000,
    color: 'red',
    hex: '#C73E3A',
    emoji: '👩🏻‍🦰',
    bgGradient: 'linear-gradient(135deg, #FFC1C1 0%, #C73E3A 100%)',
    perk: { type: 'cashBonus', value: 0.20, label: '初始现金 +20%' },
  },
  {
    id: 'wumi',
    name: '乌咪',
    desc: '股市高手，股票收益 +30%',
    cash: 15000,
    color: 'purple',
    hex: '#7B3F99',
    emoji: '🐱',
    bgGradient: 'linear-gradient(135deg, #D8B4E2 0%, #7B3F99 100%)',
    perk: { type: 'stockBonus', value: 0.30, label: '股票收益 +30%' },
  },
];
