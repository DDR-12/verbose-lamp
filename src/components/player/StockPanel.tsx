import { useGameStore } from '../../store/gameStore';
import { useState } from 'react';
import { formatNum } from '../../utils/helpers';

export default function StockPanel() {
  const stocks = useGameStore((s) => s.stocks);
  const players = useGameStore((s) => s.players);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const buyStock = useGameStore((s) => s.buyStock);
  const sellStock = useGameStore((s) => s.sellStock);
  const player = players[currentId];

  const [selected, setSelected] = useState(stocks[0].symbol);
  const stock = stocks.find((s) => s.symbol === selected)!;
  const owned = player?.stocks[selected] || 0;

  if (!player) return null;

  const handleBuy = () => buyStock(currentId, selected, 1);
  const handleSell = () => sellStock(currentId, selected, 1);

  return (
    <div className="bg-wood-800 border-2 border-amber-500/40 rounded-xl p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-300 font-display text-lg text-glow-gold">📈 股市</span>
        <span className="text-wood-300 text-xs">每 8 秒自动波动</span>
      </div>

      {/* 股票列表 */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {stocks.map((s) => {
          const change = s.price - s.prevPrice;
          const pct = ((change / s.prevPrice) * 100).toFixed(1);
          const isUp = change > 0;
          const isDown = change < 0;
          const isSel = selected === s.symbol;
          return (
            <button
              key={s.symbol}
              onClick={() => setSelected(s.symbol)}
              className={`text-left rounded-lg p-1.5 border-2 transition-all ${
                isSel ? 'border-amber-400 bg-wood-700' : 'border-wood-700 bg-wood-900/50 hover:bg-wood-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-wood-100 text-xs font-bold">{s.name}</div>
                  <div className="text-[10px] text-wood-400">{s.symbol}</div>
                </div>
                <div className={`font-display text-sm ${isUp ? 'text-red-300' : isDown ? 'text-green-300' : 'text-wood-200'}`}>
                  {isUp ? '↑' : isDown ? '↓' : '─'} {Math.abs(Number(pct)).toFixed(1)}%
                </div>
              </div>
              <div className="text-amber-200 font-display text-lg leading-none mt-0.5">${s.price}</div>
            </button>
          );
        })}
      </div>

      {/* 走势 sparkline */}
      <div className="bg-wood-900/60 rounded p-1.5 mb-2">
        <Sparkline data={stock.history} />
      </div>

      {/* 交易 */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-wood-300">持有：<span className="text-amber-200 font-bold">{owned}</span> 股</span>
        <span className="text-wood-300">现金：<span className="text-amber-200 font-bold">${formatNum(player.cash)}</span></span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleBuy}
          disabled={player.cash < stock.price}
          className="btn-3d btn-crimson flex-1 !py-1 !text-sm"
        >
          📈 买入
        </button>
        <button
          onClick={handleSell}
          disabled={owned === 0}
          className="btn-3d btn-jade flex-1 !py-1 !text-sm"
        >
          📉 卖出
        </button>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <div className="h-8 flex items-center justify-center text-wood-500 text-[10px]">暂无走势</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const w = 220;
  const h = 30;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? '#E85A56' : '#4A8B5E';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      <polyline
        fill={color}
        fillOpacity="0.2"
        stroke="none"
        points={`0,${h} ${points} ${w},${h}`}
      />
    </svg>
  );
}
