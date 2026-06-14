import { useGameStore } from '../../store/gameStore';
import { PROPERTY_COLORS, TILE_POSITIONS } from '../../data/map';
import type { Tile as TileType } from '../../data/map';
import { cn, formatNum } from '../../utils/helpers';

const TILE_SIZE = 64; // pixels
const GAP = 4;
const PADDING = 8;

const houseColor = (houses: number): string => {
  if (houses === 0) return 'transparent';
  if (houses === 5) return '#FF6B6B'; // 旅馆
  if (houses === 4) return '#9C27B0';
  if (houses === 3) return '#FF9800';
  if (houses === 2) return '#2196F3';
  return '#4CAF50';
};

const houseLabel = (houses: number): string => {
  return ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', '🏨'][houses] || '';
};

interface TileProps {
  tile: TileType;
  index: number;
  isCurrent: boolean;
  playersHere: number[];
}

function Tile({ tile, index, isCurrent, playersHere }: TileProps) {
  const pos = TILE_POSITIONS[index];
  const left = PADDING + pos.col * (TILE_SIZE + GAP);
  const top = PADDING + pos.row * (TILE_SIZE + GAP);
  const isCorner = (pos.row === 0 || pos.row === 10) && (pos.col === 0 || pos.col === 10);
  const w = isCorner ? TILE_SIZE : TILE_SIZE;
  const h = isCorner ? TILE_SIZE : TILE_SIZE;

  // 地产色
  const propColor = tile.color ? PROPERTY_COLORS[tile.color] : null;

  // 玩家
  const allPlayers = useGameStore((s) => s.players);

  return (
    <div
      data-tile={index}
      style={{ left, top, width: w, height: h }}
      className={cn(
        'absolute bg-wood-100 border-2 border-wood-700 rounded-md overflow-hidden shadow-md flex flex-col',
        isCurrent && 'tile-highlight',
        'transition-all duration-200',
      )}
    >
      {/* 顶部色条 (地产) */}
      {propColor && (
        <div
          className="w-full text-center text-[9px] font-bold leading-tight py-0.5 text-white"
          style={{ backgroundColor: propColor.bg }}
        >
          {tile.name}
        </div>
      )}
      {!propColor && tile.type === 'start' && (
        <div className="w-full text-center text-[10px] font-bold leading-tight py-0.5 bg-gradient-to-r from-red-500 to-yellow-400 text-white">
          🚩起点
        </div>
      )}
      {!propColor && ['chance','fate','news','shop','lottery','immortal','turtle','fortune','misfortune','park','jail','hospital'].includes(tile.type) && (
        <div className="w-full flex items-center justify-center flex-1 text-xl">
          {tile.icon}
        </div>
      )}

      {/* 价格 (地产) */}
      {propColor && tile.price && (
        <div className="text-[9px] text-center bg-yellow-200 text-wood-800 font-bold">
          ${tile.price}
        </div>
      )}

      {/* 房屋 */}
      {propColor && tile.houses > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold text-white"
          style={{ backgroundColor: houseColor(tile.houses) }}
        >
          {houseLabel(tile.houses)}
        </div>
      )}

      {/* 所有者标记 */}
      {propColor && tile.ownerId !== null && (
        <div
          className="absolute top-0 right-0 w-3 h-3 rounded-full border border-white"
          style={{ backgroundColor: allPlayers[tile.ownerId]?.character.hex || '#fff' }}
        />
      )}

      {/* 玩家棋子 */}
      {playersHere.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 flex-wrap pointer-events-none z-10">
          {playersHere.map((pid) => {
            const p = allPlayers[pid];
            if (!p || p.isBankrupt) return null;
            return (
              <div
                key={pid}
                className="w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px]"
                style={{ backgroundColor: p.character.hex }}
                title={p.name}
              >
                {p.character.emoji}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Board() {
  const tiles = useGameStore((s) => s.tiles);
  const players = useGameStore((s) => s.players);
  const highlighted = useGameStore((s) => s.highlightedTile);

  const playersByTile: Record<number, number[]> = {};
  players.forEach((p) => {
    if (p.isBankrupt) return;
    if (!playersByTile[p.position]) playersByTile[p.position] = [];
    playersByTile[p.position].push(p.id);
  });

  const boardSize = PADDING * 2 + 11 * TILE_SIZE + 10 * GAP;
  return (
    <div className="relative bg-felt rounded-2xl shadow-2xl border-4 border-wood-700 p-1.5"
      style={{ width: boardSize + 4, height: boardSize + 4 }}
    >
      {/* 中心台湾岛装饰 */}
      <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
        <TaiwanIsland />
      </div>
      {/* 中心信息 */}
      <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
        <div className="text-center bg-wood-900/70 backdrop-blur rounded-2xl p-4 border-2 border-amber-400/50">
          <div className="font-display text-amber-300 text-2xl text-glow-gold">大富翁 4</div>
          <div className="text-wood-100 text-sm mt-1">台灣之旅</div>
          <div className="text-wood-300 text-xs mt-2">第 {useGameStore.getState().round} 回合</div>
        </div>
      </div>
      {tiles.map((tile, i) => (
        <Tile
          key={i}
          tile={tile}
          index={i}
          isCurrent={highlighted === i}
          playersHere={playersByTile[i] || []}
        />
      ))}
    </div>
  );
}

function TaiwanIsland() {
  return (
    <svg viewBox="0 0 220 320" className="w-44 opacity-50">
      <defs>
        <radialGradient id="tw-g" cx="0.5" cy="0.5">
          <stop offset="0%" stopColor="#3a7250" />
          <stop offset="100%" stopColor="#1f4530" />
        </radialGradient>
      </defs>
      <path
        d="M70 20 Q110 10 140 30 Q170 60 165 110 Q180 160 160 200 Q150 240 130 270 Q110 300 80 290 Q40 280 30 240 Q20 200 35 150 Q40 90 70 20 Z"
        fill="url(#tw-g)"
        stroke="#E8C56A"
        strokeWidth="2"
        opacity="0.6"
      />
      <text x="100" y="160" textAnchor="middle" fill="#E8C56A" fontSize="20" fontFamily="ZCOOL KuaiLe" opacity="0.5">
        台灣
      </text>
    </svg>
  );
}
