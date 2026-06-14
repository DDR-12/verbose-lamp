// 卡片效果类型
export type CardEffect =
  | { kind: 'gain'; amount: number }
  | { kind: 'lose'; amount: number }
  | { kind: 'move'; to: number; type: 'absolute' | 'relative' }
  | { kind: 'moveToStart' }
  | { kind: 'goToJail' }
  | { kind: 'outOfJail' }
  | { kind: 'collectFromAll'; amount: number }
  | { kind: 'payToAll'; amount: number }
  | { kind: 'stockUp'; symbol: string; percent: number }
  | { kind: 'stockDown'; symbol: string; percent: number }
  | { kind: 'upgradeAllOwn' }
  | { kind: 'downgradeAllOwn' }
  | { kind: 'teleportRandom' };

export interface Card {
  id: string;
  type: 'chance' | 'fate';
  title: string;
  description: string;
  effect: CardEffect;
}

const chanceCards: Card[] = [
  { id: 'c01', type: 'chance', title: '财神降临',     description: '获得 $3000 红包',          effect: { kind: 'gain', amount: 3000 } },
  { id: 'c02', type: 'chance', title: '股票大涨',     description: '微软股价上涨 30%',         effect: { kind: 'stockUp', symbol: 'MSFT', percent: 0.30 } },
  { id: 'c03', type: 'chance', title: '出差旅行',     description: '前进到 基隆',             effect: { kind: 'move', to: 3, type: 'absolute' } },
  { id: 'c04', type: 'chance', title: '免费出狱',     description: '获得「出狱卡」一张',       effect: { kind: 'outOfJail' } },
  { id: 'c05', type: 'chance', title: '乐善好施',     description: '向每位玩家支付 $500',      effect: { kind: 'payToAll', amount: 500 } },
  { id: 'c06', type: 'chance', title: '苹果丰收',     description: '苹果股价上涨 25%',         effect: { kind: 'stockUp', symbol: 'AAPL', percent: 0.25 } },
  { id: 'c07', type: 'chance', title: '向前走',       description: '前进 5 格',                effect: { kind: 'move', to: 5, type: 'relative' } },
  { id: 'c08', type: 'chance', title: '退后三步',     description: '后退 3 格',                effect: { kind: 'move', to: -3, type: 'relative' } },
  { id: 'c09', type: 'chance', title: '银行利息',     description: '获得 $1500',               effect: { kind: 'gain', amount: 1500 } },
  { id: 'c10', type: 'chance', title: '台积电危机',   description: '台积电股价下跌 30%',       effect: { kind: 'stockDown', symbol: 'TSM', percent: 0.30 } },
  { id: 'c11', type: 'chance', title: '建筑许可',     description: '所有自有地产升级一档',     effect: { kind: 'upgradeAllOwn' } },
  { id: 'c12', type: 'chance', title: '生日快乐',     description: '每位玩家送你 $1000',       effect: { kind: 'collectFromAll', amount: 1000 } },
  { id: 'c13', type: 'chance', title: '天降横财',     description: '获得 $2000',               effect: { kind: 'gain', amount: 2000 } },
  { id: 'c14', type: 'chance', title: '回起点',       description: '回到起点并领 $2000',       effect: { kind: 'moveToStart' } },
  { id: 'c15', type: 'chance', title: 'IBM并购',      description: 'IBM 股价上涨 20%',         effect: { kind: 'stockUp', symbol: 'IBM', percent: 0.20 } },
  { id: 'c16', type: 'chance', title: '黑函',         description: '向最富玩家支付 $2000',     effect: { kind: 'lose', amount: 2000 } },
  { id: 'c17', type: 'chance', title: '随机传送',     description: '随机传送到一个地产上',     effect: { kind: 'teleportRandom' } },
  { id: 'c18', type: 'chance', title: '安全检查',     description: '所有自有地产降一档（罚款）', effect: { kind: 'downgradeAllOwn' } },
];

const fateCards: Card[] = [
  { id: 'f01', type: 'fate', title: '全球风暴',     description: '所有股票下跌 15%',         effect: { kind: 'payToAll', amount: 1000 } },
  { id: 'f02', type: 'fate', title: '路霸',         description: '入狱 3 回合',              effect: { kind: 'goToJail' } },
  { id: 'f03', type: 'fate', title: '年终奖金',     description: '获得 $2500',               effect: { kind: 'gain', amount: 2500 } },
  { id: 'f04', type: 'fate', title: '快速前进',     description: '前进 8 格',                effect: { kind: 'move', to: 8, type: 'relative' } },
  { id: 'f05', type: 'fate', title: '投对股',       description: '苹果股价上涨 40%',         effect: { kind: 'stockUp', symbol: 'AAPL', percent: 0.40 } },
  { id: 'f06', type: 'fate', title: '慈善捐款',     description: '支付 $1500',               effect: { kind: 'lose', amount: 1500 } },
  { id: 'f07', type: 'fate', title: '大丰收',       description: '每位玩家送你 $800',        effect: { kind: 'collectFromAll', amount: 800 } },
  { id: 'f08', type: 'fate', title: '直接去台中',   description: '前进到 台中',              effect: { kind: 'move', to: 11, type: 'absolute' } },
  { id: 'f09', type: 'fate', title: '退后五步',     description: '后退 5 格',                effect: { kind: 'move', to: -5, type: 'relative' } },
  { id: 'f10', type: 'fate', title: '免费出狱',     description: '获得「出狱卡」一张',       effect: { kind: 'outOfJail' } },
  { id: 'f11', type: 'fate', title: '保险理赔',     description: '获得 $1800',               effect: { kind: 'gain', amount: 1800 } },
  { id: 'f12', type: 'fate', title: '负面新闻',     description: '所有股票下跌 20%',         effect: { kind: 'stockDown', symbol: 'MSFT', percent: 0.20 } },
  { id: 'f13', type: 'fate', title: '维修费',       description: '支付 $800',                effect: { kind: 'lose', amount: 800 } },
  { id: 'f14', type: 'fate', title: '免费升级',     description: '所有自有地产升级一档',     effect: { kind: 'upgradeAllOwn' } },
  { id: 'f15', type: 'fate', title: '回起点',       description: '回到起点并领 $2000',       effect: { kind: 'moveToStart' } },
  { id: 'f16', type: 'fate', title: '拆迁公告',     description: '所有自有地产降一档（罚款）', effect: { kind: 'downgradeAllOwn' } },
  { id: 'f17', type: 'fate', title: '横财',         description: '获得 $4000',               effect: { kind: 'gain', amount: 4000 } },
  { id: 'f18', type: 'fate', title: '飞来横祸',     description: '入狱',                    effect: { kind: 'goToJail' } },
];

export const ALL_CARDS: Card[] = [...chanceCards, ...fateCards];

export const getRandomCard = (type: 'chance' | 'fate'): Card => {
  const pool = type === 'chance' ? chanceCards : fateCards;
  return pool[Math.floor(Math.random() * pool.length)];
};
