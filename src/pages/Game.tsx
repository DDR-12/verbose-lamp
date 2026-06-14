import Board from '../components/board/Board';
import Controls from '../components/controls/Controls';
import Modal from '../components/modals/Modal';
import GameLoop from '../components/board/GameLoop';
import { PlayerList } from '../components/player/PlayerPanel';
import StockPanel from '../components/player/StockPanel';
import LogPanel from '../components/player/LogPanel';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCcw, Pause, Play } from 'lucide-react';

export default function Game() {
  const navigate = useNavigate();
  const reset = useGameStore((s) => s.reset);
  const round = useGameStore((s) => s.round);
  const isPaused = useGameStore((s) => s.isPaused);
  const setPaused = (p: boolean) => useGameStore.setState({ isPaused: p });

  return (
    <div className="w-full h-full bg-wood flex flex-col">
      {/* 顶部状态栏 */}
      <div className="bg-wood-800 border-b-4 border-amber-500/50 px-4 py-2 flex items-center gap-3 shadow-lg">
        <button className="btn-icon" onClick={() => navigate('/')} title="返回主菜单">
          <Home className="w-5 h-5" />
        </button>
        <button className="btn-icon" onClick={() => { if (confirm('确定要重开游戏吗？')) reset(); }} title="重新开始">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button className="btn-icon" onClick={() => setPaused(!isPaused)} title={isPaused ? '继续' : '暂停'}>
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="font-display text-2xl text-amber-300 text-glow-gold">大富翁 4</span>
          <span className="text-wood-200 text-sm">第 <b className="text-amber-200">{round}</b> 回合</span>
        </div>
        <div className="text-wood-300 text-xs">💡 提示：空间不足时滚动</div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧玩家列表 */}
        <div className="w-64 bg-wood-900/30 border-r-2 border-wood-700 p-2 overflow-y-auto custom-scroll">
          <PlayerList />
        </div>

        {/* 中间棋盘 */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto custom-scroll">
          <Board />
        </div>

        {/* 右侧控制 */}
        <div className="w-72 bg-wood-900/30 border-l-2 border-wood-700 p-2 flex flex-col gap-2">
          <StockPanel />
          <div className="flex-1 min-h-0">
            <LogPanel />
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <Controls />

      {/* 弹窗 */}
      <Modal />

      {/* 游戏循环 */}
      <GameLoop />

      {/* 暂停遮罩 */}
      {isPaused && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="text-center">
            <Pause className="w-20 h-20 mx-auto text-amber-300 mb-4" />
            <div className="font-display text-4xl text-amber-300 text-glow-gold">游戏已暂停</div>
            <button className="btn-3d btn-jade mt-6" onClick={() => setPaused(false)}>
              ▶ 继续
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
