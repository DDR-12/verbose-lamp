export interface StockDef {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number; // 0-1
}

export const STOCK_DEFS: StockDef[] = [
  { symbol: 'MSFT', name: '微软',   basePrice: 50, volatility: 0.18 },
  { symbol: 'IBM',  name: 'IBM',    basePrice: 80, volatility: 0.12 },
  { symbol: 'AAPL', name: '苹果',   basePrice: 60, volatility: 0.22 },
  { symbol: 'TSM',  name: '台积电', basePrice: 40, volatility: 0.25 },
];
