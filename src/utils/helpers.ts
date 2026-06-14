// 工具函数
export const formatMoney = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
};

export const formatNum = (n: number): string => n.toLocaleString();

export const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const cn = (...args: (string | false | null | undefined)[]): string =>
  args.filter(Boolean).join(' ');

// 计算玩家总资产
export const calcTotalAssets = (player: {
  cash: number;
  deposit: number;
  stocks: Record<string, number>;
  cards: any[];
}, stocks: { symbol: string; price: number }[], tiles: { ownerId: number | null; price?: number; houses: number; housePrice?: number }[], id: number): number => {
  let total = player.cash + player.deposit;
  // 股票
  for (const sym in player.stocks) {
    const stock = stocks.find((s) => s.symbol === sym);
    if (stock) total += stock.price * (player.stocks[sym] || 0);
  }
  // 地产（按购地价+盖房估值）
  for (const t of tiles) {
    if (t.ownerId === id) {
      total += (t.price || 0) + (t.housePrice || 0) * t.houses;
    }
  }
  return total;
};
