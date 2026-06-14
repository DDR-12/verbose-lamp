// 商品（道具屋/卡片屋）
export interface Item {
  id: string;
  name: string;
  desc: string;
  price: number;
  icon: string;
  type: 'card' | 'tool';
}

export const ITEMS_SHOP: Item[] = [
  { id: 'tool_roadblock',  name: '路障',       desc: '前方一格无法通过',  price: 500,  icon: '🚧', type: 'tool' },
  { id: 'tool_doll',       name: '机器娃娃',   desc: '前方 10 格内随机传送敌人', price: 800, icon: '🤖', type: 'tool' },
  { id: 'tool_bomb',       name: '定时炸弹',   desc: '前方 5 格爆炸收取过路费',  price: 1200, icon: '💣', type: 'tool' },
  { id: 'card_chance',     name: '机会卡',     desc: '即时使用一张机会卡', price: 600, icon: '❓', type: 'card' },
  { id: 'card_fate',       name: '命运卡',     desc: '即时使用一张命运卡', price: 600, icon: '🎴', type: 'card' },
];
