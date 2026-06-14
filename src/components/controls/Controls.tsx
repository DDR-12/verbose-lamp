import { useGameStore } from '../../store/gameStore';
import Dice from '../board/Dice';

export default function Controls() {
  const phase = useGameStore((s) => s.phase);
  const rollDice = useGameStore((s) => s.rollDice);
  const endTurn = useGameStore((s) => s.endTurn);
  const players = useGameStore((s) => s.players);
  const dice = useGameStore((s) => s.dice);
  const diceRolling = useGameStore((s) => s.diceRolling);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const current = players[currentId];
  const isAI = current?.isAI;

  const canRoll = phase === 'idle' && !isAI;
  const canEnd = phase === 'landed' && !isAI;

  return (
    <div className="bg-wood-800 border-t-4 border-amber-500/60 px-4 py-3 flex items-center gap-3 shadow-2xl">
      {/* 骰子 */}
      <div className="flex items-center gap-2">
        <Dice value={dice[0]} rolling={diceRolling} />
        <Dice value={dice[1]} rolling={diceRolling} />
        <div className="text-amber-300 font-display text-2xl ml-2 text-glow-gold">
          = {dice[0] + dice[1]}
        </div>
      </div>

      {/* 状态信息 */}
      <div className="flex-1 px-4 text-wood-100 text-sm">
        {current && (
          <div>
            <span className="text-amber-300 font-bold">{current.name}</span>
            <span className="text-wood-300 ml-2">的回合</span>
            {current.inJail && <span className="ml-2 text-amber-400">🔒 在狱中</span>}
            {current.skipTurns > 0 && <span className="ml-2 text-emerald-400">🐢 乌龟休息</span>}
            {current.parkStop > 0 && <span className="ml-2 text-green-400">🌳 公园休息</span>}
            {phase === 'rolling' && <span className="ml-2 text-cyan-300 animate-pulse">投骰中...</span>}
            {phase === 'moving' && <span className="ml-2 text-cyan-300 animate-pulse">移动中...</span>}
            {phase === 'modal' && <span className="ml-2 text-purple-300">处理事件...</span>}
            {isAI && phase === 'idle' && <span className="ml-2 text-amber-300 animate-pulse">🤖 AI 思考中...</span>}
          </div>
        )}
      </div>

      {/* 按钮组 */}
      <div className="flex items-center gap-2">
        <button
          className="btn-3d"
          disabled={!canRoll}
          onClick={rollDice}
        >
          🎲 投骰子
        </button>
        <button
          className="btn-3d btn-jade"
          disabled={!canEnd}
          onClick={endTurn}
        >
          ⏭️ 结束回合
        </button>
      </div>
    </div>
  );
}
