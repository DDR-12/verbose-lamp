// 台湾地图 - 大富翁 4 经典地图
export type TileType =
  | 'start' | 'property' | 'chance' | 'fate' | 'news' | 'shop'
  | 'hospital' | 'jail' | 'park' | 'lottery' | 'immortal'
  | 'turtle' | 'fortune' | 'misfortune' | 'empty';

export type PropertyColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';

export interface Tile {
  index: number;
  type: TileType;
  name: string;
  color?: PropertyColor;
  price?: number;          // 购地价
  rent?: number[];         // [空地, 1房, 2房, 3房, 4房, 旅馆]
  housePrice?: number;     // 盖房价
  ownerId: number | null;
  houses: number;          // 0-5
  description?: string;
  icon: string;            // 格子上的小图标
}

export const PROPERTY_COLORS: Record<PropertyColor, { bg: string; text: string; light: string }> = {
  blue:   { bg: '#2A4A7F', text: '#FFFFFF', light: '#4A6FA8' },
  green:  { bg: '#2C5F3D', text: '#FFFFFF', light: '#4A8B5E' },
  red:    { bg: '#C73E3A', text: '#FFFFFF', light: '#E85A56' },
  yellow: { bg: '#E8B94A', text: '#3E2A1E', light: '#FFD66A' },
  purple: { bg: '#7B3F99', text: '#FFFFFF', light: '#A567BD' },
  orange: { bg: '#D97634', text: '#FFFFFF', light: '#F09A5C' },
};

const T = (
  index: number,
  type: TileType,
  name: string,
  icon: string,
  opts: Partial<Omit<Tile, 'index' | 'type' | 'name' | 'icon' | 'ownerId' | 'houses'>> = {},
): Tile => ({
  index, type, name, icon, ownerId: null, houses: 0, ...opts,
});

export const TAIWAN_MAP: Tile[] = [
  T(0,  'start',      '起点',    '🚩', { description: '经过或停留可领 $2000' }),

  // 底部一行 (索引 1-8) -> 淡水→中坜
  T(1,  'property',   '淡水',    '🌊', { color: 'blue',   price: 600,  rent: [20, 100, 300, 600, 1100, 1500], housePrice: 300 }),
  T(2,  'chance',     '机会',    '❓'),
  T(3,  'property',   '基隆',    '⛵', { color: 'blue',   price: 600,  rent: [40, 200, 600, 1200, 2200, 3000], housePrice: 300 }),
  T(4,  'lottery',    '乐透',    '🎰', { description: '随机赢得 $1000 - $5000' }),
  T(5,  'property',   '新竹',    '🍡', { color: 'blue',   price: 800,  rent: [60, 300, 900, 1800, 2800, 3800], housePrice: 400 }),
  T(6,  'news',       '新闻',    '📰'),
  T(7,  'property',   '桃园',    '✈️', { color: 'green',  price: 1000, rent: [80, 400, 1200, 2400, 3600, 5000], housePrice: 500 }),
  T(8,  'immortal',   '仙药',    '🧪', { description: '30 回合内免疫负面事件' }),

  // 右侧 (索引 9-17) -> 中坜→台南
  T(9,  'property',   '中坜',    '🏯', { color: 'green',  price: 1000, rent: [100, 500, 1500, 3000, 4500, 6000], housePrice: 500 }),
  T(10, 'fate',       '命运',    '🎴'),
  T(11, 'property',   '台中',    '🌳', { color: 'green',  price: 1200, rent: [120, 600, 1800, 3600, 5500, 7500], housePrice: 600 }),
  T(12, 'shop',       '道具屋',  '🏪', { description: '购买道具（路障/机器娃娃等）' }),
  T(13, 'property',   '彰化',    '🏛️', { color: 'red',    price: 1400, rent: [140, 700, 2100, 4200, 6500, 9000], housePrice: 700 }),
  T(14, 'chance',     '机会',    '❓'),
  T(15, 'property',   '嘉义',    '🍊', { color: 'red',    price: 1400, rent: [160, 800, 2400, 4800, 7500, 10000], housePrice: 700 }),
  T(16, 'turtle',     '乌龟',    '🐢', { description: '停留 2 回合' }),
  T(17, 'property',   '台南',    '🦑', { color: 'red',    price: 1600, rent: [180, 900, 2700, 5500, 8500, 11500], housePrice: 800 }),

  // 顶部 (索引 18-26) -> 高雄→台东（反向）
  T(18, 'fate',       '命运',    '🎴'),
  T(19, 'property',   '高雄',    '🚢', { color: 'yellow', price: 1800, rent: [200, 1000, 3000, 6000, 9500, 13000], housePrice: 900 }),
  T(20, 'property',   '屏东',    '🥭', { color: 'yellow', price: 1800, rent: [220, 1100, 3300, 6600, 10500, 14000], housePrice: 900 }),
  T(21, 'news',       '新闻',    '📰'),
  T(22, 'property',   '宜兰',    '🌧️', { color: 'yellow', price: 2000, rent: [240, 1200, 3600, 7200, 11500, 15500], housePrice: 1000 }),
  T(23, 'chance',     '机会',    '❓'),
  T(24, 'property',   '花莲',    '🪨', { color: 'purple', price: 2200, rent: [260, 1300, 3900, 7800, 12500, 17000], housePrice: 1100 }),
  T(25, 'fortune',    '财神',    '🧧', { description: '当场所有地产升级一档' }),
  T(26, 'property',   '台东',    '🌴', { color: 'purple', price: 2200, rent: [280, 1400, 4200, 8400, 13500, 18500], housePrice: 1100 }),

  // 左侧 (索引 27-35) -> 澎湖→绿岛
  T(27, 'fate',       '命运',    '🎴'),
  T(28, 'misfortune', '穷神',    '💀', { description: '现金减半，存款清零' }),
  T(29, 'property',   '澎湖',    '🐚', { color: 'purple', price: 2400, rent: [300, 1500, 4500, 9000, 14500, 20000], housePrice: 1200 }),
  T(30, 'jail',       '监狱',    '🔒', { description: '入狱 3 回合' }),
  T(31, 'property',   '金门',    '🥮', { color: 'orange', price: 2600, rent: [320, 1600, 4800, 9600, 15500, 21000], housePrice: 1300 }),
  T(32, 'shop',       '卡片屋',  '🃏', { description: '花 $1000 抽一张卡' }),
  T(33, 'property',   '马祖',    '🍶', { color: 'orange', price: 2600, rent: [340, 1700, 5100, 10200, 16500, 22500], housePrice: 1300 }),
  T(34, 'park',       '公园',    '🌳', { description: '停留一回合，奖励 $500' }),
  T(35, 'property',   '绿岛',    '🤿', { color: 'orange', price: 2800, rent: [360, 1800, 5400, 10800, 17500, 24000], housePrice: 1400 }),
];

// 格子在棋盘上的位置（11x11 网格）- 经典 36 格环绕
// 0 起点 = (10, 10) 右下角
// 边缘坐标 (row, col) (0-10)
export const TILE_POSITIONS: { row: number; col: number; dir: 'top' | 'bottom' | 'left' | 'right' }[] = (() => {
  const arr: { row: number; col: number; dir: 'top' | 'bottom' | 'left' | 'right' }[] = [];
  // 底部 0-8: 起点 + 8 格，从右到左 (col 10..2) at row 10
  for (let i = 0; i <= 8; i++) arr.push({ row: 10, col: 10 - i, dir: 'bottom' });
  // 左侧 9-17: 从下到上 (row 9..1) at col 0 — 9 格
  for (let i = 1; i <= 9; i++) arr.push({ row: 10 - i, col: 0, dir: 'left' });
  // 顶部 18-26: 从左到右 (col 1..9) at row 0 — 9 格
  for (let i = 1; i <= 9; i++) arr.push({ row: 0, col: i, dir: 'top' });
  // 右侧 27-35: 从上到下 (row 1..9) at col 10 — 9 格
  for (let i = 1; i <= 9; i++) arr.push({ row: i, col: 10, dir: 'right' });
  return arr;
})();
