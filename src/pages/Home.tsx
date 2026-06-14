import { useNavigate } from 'react-router-dom';
import { Coins, Play, HelpCircle } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-wood flex flex-col items-center justify-center relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-amber-500/20 text-9xl animate-float" style={{ animationDelay: '0s' }}>💰</div>
        <div className="absolute top-20 right-16 text-amber-500/20 text-8xl animate-float" style={{ animationDelay: '1s' }}>🎲</div>
        <div className="absolute bottom-20 left-20 text-amber-500/20 text-9xl animate-float" style={{ animationDelay: '2s' }}>🏠</div>
        <div className="absolute bottom-32 right-24 text-amber-500/20 text-8xl animate-float" style={{ animationDelay: '0.5s' }}>🎴</div>
        <div className="absolute top-1/2 left-1/4 text-amber-500/10 text-7xl animate-float" style={{ animationDelay: '1.5s' }}>📈</div>
        <div className="absolute top-1/3 right-1/4 text-amber-500/10 text-7xl animate-float" style={{ animationDelay: '2.5s' }}>🧧</div>
      </div>

      {/* 主标题 */}
      <div className="text-center relative z-10 animate-slide-up">
        <div className="inline-block mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Coins className="w-12 h-12 text-amber-300 animate-coin-spin" />
            <h1 className="font-display text-7xl text-amber-300 text-glow-gold tracking-wider">
              大富翁 4
            </h1>
            <Coins className="w-12 h-12 text-amber-300 animate-coin-spin" />
          </div>
          <div className="text-3xl text-amber-200/90 font-display text-glow-gold tracking-[0.3em]">
            台 · 灣 · 之 · 旅
          </div>
        </div>
        <p className="text-wood-200 text-base mb-10 max-w-md mx-auto leading-relaxed">
          投骰子 · 买土地 · 盖房子 · 炒股票<br/>
          经典大宇资讯 1998 桌游网页复刻版
        </p>

        <div className="flex flex-col gap-3 items-center">
          <button
            className="btn-3d btn-crimson text-xl px-12 py-4"
            onClick={() => navigate('/select')}
          >
            <Play className="w-5 h-5 mr-2 inline" />
            开始游戏
          </button>
          <button
            className="btn-3d btn-jade px-10 py-3"
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="w-4 h-4 mr-2 inline" />
            游戏说明
          </button>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="absolute bottom-4 text-wood-400 text-xs text-center z-10">
        致敬经典 · 仅供学习交流使用
      </div>
    </div>
  );
}
