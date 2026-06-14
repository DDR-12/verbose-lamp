import { useGameStore } from '../../store/gameStore';
import { formatNum, calcTotalAssets } from '../../utils/helpers';
import { useState, useEffect } from 'react';
import type { Player } from '../../store/types';

export default function PlayerPanel({ player }: { player: Player }) {
  const allPlayers = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const stocks = useGameStore((s) => s.stocks);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const isCurrent = player.id === currentId;
  const isBankrupt = player.isBankrupt;
  const totalAssets = calcTotalAssets(player, stocks, tiles, player.id);

  // 现金闪烁
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    setFlashKey((k) => k + 1);
  }, [player.cash]);

  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
        isCurrent ? 'border-amber-400 ring-2 ring-amber-300/60 scale-[1.02] shadow-2xl' : 'border-wood-700'
      } ${isBankrupt ? 'opacity-40 grayscale' : ''}`}
      style={{
        background: `linear-gradient(180deg, ${player.character.hex}33 0%, #2A1C13 100%)`,
      }}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 p-2.5 border-b-2 border-wood-700"
        style={{ background: `linear-gradient(90deg, ${player.character.hex} 0%, ${player.character.hex}88 100%)` }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md"
          style={{ background: player.character.bgGradient }}
        >
          {player.character.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-white text-base leading-tight truncate flex items-center gap-1">
            {player.name}
            {isCurrent && <span className="text-xs animate-pulse">🎯</span>}
            {player.isAI && <span className="text-[10px] bg-amber-300 text-wood-800 px-1 rounded">AI</span>}
          </div>
          <div className="text-wood-100 text-[10px] truncate">{player.character.perk.label}</div>
        </div>
      </div>

      {/* 状态徽章 */}
      <div className="flex flex-wrap gap-1 px-2 py-1 bg-wood-800/50">
        {player.inJail && <Badge color="bg-amber-500">🔒 狱中 {player.jailTurns}</Badge>}
        {player.skipTurns > 0 && <Badge color="bg-emerald-500">🐢 乌龟 {player.skipTurns}</Badge>}
        {player.immortalTurns > 0 && <Badge color="bg-purple-500">🧪 仙药 {player.immortalTurns}</Badge>}
        {player.parkStop > 0 && <Badge color="bg-green-500">🌳 公园</Badge>}
      </div>

      {/* 资金 */}
      <div className="p-2.5 space-y-1.5">
        <Row label="💵 现金" value={formatNum(player.cash)} valueClass="text-amber-300" flashKey={flashKey} />
        <Row label="🏦 存款" value={formatNum(player.deposit)} valueClass="text-cyan-300" />
        <Row label="🏠 地产" value={`${tiles.filter((t) => t.ownerId === player.id).length} 块`} valueClass="text-emerald-300" />
        <Row label="📊 资产" value={formatNum(totalAssets)} valueClass="text-rose-300" bold />
      </div>

      {/* 股票 */}
      {Object.keys(player.stocks).some((k) => player.stocks[k] > 0) && (
        <div className="px-2.5 pb-2 pt-1 border-t border-wood-700/50">
          <div className="text-[10px] text-wood-300 mb-0.5">持仓</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(player.stocks).map(([sym, qty]) => {
              if (qty === 0) return null;
              const stock = stocks.find((s) => s.symbol === sym);
              return (
                <span key={sym} className="text-[10px] bg-wood-700 px-1.5 py-0.5 rounded text-wood-100">
                  {stock?.name || sym} ×{qty}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 卡片 */}
      {player.cards.length > 0 && (
        <div className="px-2.5 pb-2 pt-1 border-t border-wood-700/50">
          <div className="text-[10px] text-wood-300 mb-0.5">卡片</div>
          <div className="flex flex-wrap gap-1">
            {player.cards.map((c, i) => (
              <span key={i} className="text-[10px] bg-purple-900 px-1.5 py-0.5 rounded text-purple-200">
                {c.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`text-[10px] ${color} text-white px-1.5 py-0.5 rounded font-bold`}>
      {children}
    </span>
  );
}

function Row({ label, value, valueClass = '', bold = false, flashKey = 0 }: { label: string; value: string; valueClass?: string; bold?: boolean; flashKey?: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-wood-200 text-xs">{label}</span>
      <span key={flashKey} className={`cash-flash font-display ${valueClass} ${bold ? 'text-base' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function PlayerList() {
  const players = useGameStore((s) => s.players);
  return (
    <div className="flex flex-col gap-2">
      {players.map((p) => <PlayerPanel key={p.id} player={p} />)}
    </div>
  );
}
