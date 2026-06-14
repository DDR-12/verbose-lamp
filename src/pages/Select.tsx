import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '../data/characters';
import { useGameStore } from '../store/gameStore';
import { formatNum } from '../utils/helpers';
import { ArrowLeft, User, Bot } from 'lucide-react';

export default function Select() {
  const navigate = useNavigate();
  const initGame = useGameStore((s) => s.initGame);
  const setAI = useGameStore((s) => s.setAI);
  const [count, setCount] = useState(2);
  const [chosen, setChosen] = useState<{ id: string; isAI: boolean }[]>([
    { id: 'qian', isAI: false },
    { id: 'atu', isAI: true },
  ]);

  const toggle = (charId: string) => {
    if (chosen.find((c) => c.id === charId)) {
      if (chosen.length > 2) {
        setChosen(chosen.filter((c) => c.id !== charId));
      }
    } else {
      if (chosen.length < 4) {
        setChosen([...chosen, { id: charId, isAI: true }]);
      }
    }
  };

  const toggleAI = (charId: string) => {
    setChosen(chosen.map((c) => c.id === charId ? { ...c, isAI: !c.isAI } : c));
  };

  const handleStart = () => {
    if (chosen.length < 2) return;
    initGame(chosen.length);
    // 找到每个 character 在初始化后的位置
    chosen.forEach((c, i) => {
      setAI(i, c.isAI);
    });
    navigate('/game');
  };

  return (
    <div className="w-full h-full bg-wood flex flex-col p-6 overflow-y-auto custom-scroll">
      {/* 顶部 */}
      <div className="flex items-center gap-4 mb-4">
        <button className="btn-icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-3xl text-amber-300 text-glow-gold">选择角色</h1>
        <span className="text-wood-300 text-sm">至少 2 名玩家，最多 4 名</span>
      </div>

      {/* 角色卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {CHARACTERS.map((char) => {
          const isChosen = chosen.find((c) => c.id === char.id);
          return (
            <div
              key={char.id}
              onClick={() => toggle(char.id)}
              className={`relative rounded-2xl p-4 cursor-pointer border-4 transition-all overflow-hidden ${
                isChosen
                  ? 'border-amber-400 shadow-2xl scale-105'
                  : 'border-wood-700 hover:border-wood-500'
              }`}
              style={{
                background: `linear-gradient(180deg, ${char.hex}55 0%, #2A1C13 100%)`,
              }}
            >
              {isChosen && (
                <div className="absolute top-2 right-2 bg-amber-400 text-wood-800 text-xs px-2 py-0.5 rounded font-bold animate-pop">
                  ✓ 已选
                </div>
              )}
              <div
                className="w-24 h-24 mx-auto rounded-full border-4 border-white shadow-lg flex items-center justify-center text-5xl mb-3"
                style={{ background: char.bgGradient }}
              >
                {char.emoji}
              </div>
              <div className="text-center">
                <div className="font-display text-2xl text-amber-200">{char.name}</div>
                <div className="text-wood-300 text-xs mt-1 min-h-[2.5em]">{char.desc}</div>
                <div className="mt-2 inline-block bg-amber-900/60 text-amber-200 text-sm px-3 py-1 rounded-full font-display">
                  💰 ${formatNum(char.cash)}
                </div>
              </div>
              {isChosen && (
                <div className="mt-3 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAI(char.id); }}
                    className={`flex-1 text-xs py-1.5 rounded font-bold flex items-center justify-center gap-1 ${
                      isChosen.isAI
                        ? 'bg-amber-500 text-wood-800'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    {isChosen.isAI ? <><Bot className="w-3 h-3" />电脑</> : <><User className="w-3 h-3" />人类</>}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示 */}
      <div className="bg-wood-700/60 rounded-xl p-3 text-wood-100 text-sm">
        💡 提示：点击角色卡片加入/移除对战，已选角色可切换「人类」/「电脑」操控
      </div>

      {/* 开始按钮 */}
      <div className="mt-4 flex justify-center">
        <button
          className="btn-3d btn-crimson text-xl px-12 py-4"
          disabled={chosen.length < 2}
          onClick={handleStart}
        >
          🚀 开始游戏（{chosen.length} 人）
        </button>
      </div>
    </div>
  );
}
