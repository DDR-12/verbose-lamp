// ===== 开始游戏大遮罩 =====
import { useGameStore } from '../game/store';
import { gameActions } from '../game/store';

export default function StartScreen() {
  const hasStarted = useGameStore((s) => s.hasStarted);
  const renderer = useGameStore((s) => s.renderer);
  const error = useGameStore((s) => s.error);

  if (hasStarted) return null;
  if (error && !error.startsWith('fetch')) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="rounded-2xl px-10 py-8 border border-red-400/40 text-center max-w-md shadow-2xl">
          <div className="text-3xl font-bold mb-3 text-red-300">⛔ 无法启动</div>
          <div className="text-sm text-white/80 leading-relaxed">
            {error}
            <div className="mt-4">
              <button
                onClick={() => location.reload()}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-sm">
      <div className="bg-black/75 rounded-3xl px-10 py-8 border-2 border-white/20 text-center shadow-2xl max-w-md">
        <div className="text-4xl font-black mb-3">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
        </div>
        <div className="text-sm text-white/80 mb-5 leading-relaxed">
          浏览器里亲手体验 <b className="text-yellow-300">3D 体素</b> 探索、建造。
          <br />
          渲染器: <b className={renderer === '3d' ? 'text-emerald-300' : 'text-amber-300'}>
            {renderer === '3d' ? '3D (WebGL)' : renderer === '2d' ? '2D 备用' : '初始化中…'}
          </b>
        </div>
        <button
          onClick={() => {
            gameActions.setHasStarted(true);
            (window as any).__mc?.input?.requestPointerLock();
          }}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 active:scale-95 text-black font-bold text-lg shadow-lg shadow-lime-900/60 transition"
        >
          🎮 点击开始游戏
        </button>
        <div className="mt-4 text-xs text-white/60 leading-relaxed">
          <b className="text-amber-300">提示：</b>
          <br />
          · WASD 移动，方向键转视角（即使鼠标锁定失败也能用）
          <br />
          · F 切换走路/飞行（飞行时 Space 上升，Shift 下降）
          <br />
          · Space 跳跃（走路模式）
          <br />
          · 左键按住破坏，右键放置方块
          <br />
          · 屏幕底部有虚拟按钮兜底
        </div>
      </div>
    </div>
  );
}
