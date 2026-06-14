// ===== 开始界面：3 个存档槽位，自动存档 =====
import { useState, useEffect } from 'react';
import { useGameStore, gameActions } from '../game/store';
import { World } from '../game/world';

interface SlotInfo {
  slot: number;
  name: string;
  timestamp: number;
  blockCount: number;
}

export default function StartScreen() {
  const hasStarted = useGameStore((s) => s.hasStarted);
  const renderer = useGameStore((s) => s.renderer);
  const error = useGameStore((s) => s.error);
  const [slots, setSlots] = useState<(SlotInfo | null)[]>([null, null, null]);

  useEffect(() => {
    if (!hasStarted) setSlots(World.listSlots());
  }, [hasStarted]);

  if (hasStarted) return null;

  // 错误状态
  if (error) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="rounded-2xl px-10 py-8 border border-red-400/40 text-center max-w-md shadow-2xl">
          <div className="text-3xl font-bold mb-3 text-red-300">⛔ 无法启动</div>
          <div className="text-sm text-white/80 leading-relaxed mb-4 font-mono break-all">{error}</div>
          <button
            onClick={() => location.reload()}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 选好槽位后，引擎已经在底层 paused 等待
  const startGame = (slot: number, mode: 'continue' | 'new') => {
    if (mode === 'continue' && !slots[slot]) return;
    if (mode === 'new' && slots[slot] && !confirm(`存档 ${slot + 1} 已有内容 "${slots[slot]!.name}"，开始新游戏会清空它。继续？`)) return;
    const eng = (window as any).__mc?.engine;
    if (!eng) {
      gameActions.setError('引擎未就绪');
      return;
    }
    if (mode === 'new') {
      // 清掉该槽位旧存档 + 让引擎重置为新世界
      World.deleteSlot(slot);
      try { localStorage.removeItem('mc-world-save-v2'); } catch {}
      eng.resetNewWorld();
    } else {
      // 继续：从该槽位加载
      eng.quickLoad(slot);
    }
    gameActions.setPendingSlot(slot);
    eng.start(); // 解除 paused
    gameActions.setHasStarted(true);
    // 进入后请求指针锁定
    setTimeout(() => {
      (window as any).__mc?.input?.requestPointerLock?.();
    }, 300);
  };

  const deleteSlot = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定删除存档 ${slot + 1} "${slots[slot]!.name}"？`)) return;
    World.deleteSlot(slot);
    setSlots(World.listSlots());
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-sm">
      <div className="bg-black/85 rounded-3xl px-8 py-7 border-2 border-white/20 shadow-2xl max-w-xl w-full mx-4">
        <div className="text-3xl font-black mb-1 text-center">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
          <span className="text-white/60 text-sm ml-2">· 8×8×8 小世界</span>
        </div>
        <div className="text-xs text-white/60 text-center mb-5">
          渲染器: <b className={renderer === '3d' ? 'text-emerald-300' : 'text-amber-300'}>
            {renderer === '3d' ? '3D (WebGL)' : renderer === '2d' ? '2D 备用' : '初始化中…'}
          </b>
        </div>

        {/* 存档槽位 */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-white/60 font-semibold">📂 选择存档（退出时自动保存到当前槽位）</div>
          {slots.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                s ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                {s ? (
                  <>
                    <div className="font-semibold text-emerald-300 text-sm">
                      槽位 {i + 1} · {s.name}
                    </div>
                    <div className="text-xs text-white/50">
                      {fmt(s.timestamp)} · {s.blockCount} 方块
                    </div>
                  </>
                ) : (
                  <div className="text-white/40 text-sm">槽位 {i + 1} · 空</div>
                )}
              </div>
              {s && (
                <button
                  onClick={() => startGame(i, 'continue')}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold whitespace-nowrap"
                >
                  继续
                </button>
              )}
              {s && (
                <button
                  onClick={(e) => deleteSlot(i, e)}
                  className="px-2 py-1.5 rounded-md bg-red-700/60 hover:bg-red-600/80 text-xs"
                  title="删除"
                >
                  🗑
                </button>
              )}
              <button
                onClick={() => startGame(i, 'new')}
                className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold whitespace-nowrap"
              >
                {s ? '新游戏' : '新游戏 →'}
              </button>
            </div>
          ))}
        </div>

        {/* 操作提示 */}
        <div className="text-xs text-white/55 leading-relaxed border-t border-white/10 pt-3">
          <b className="text-amber-300">操作：</b> WASD 移动 · 方向键转视角 · Space 跳跃 · F 飞行
          <br />
          左键破坏 · 右键放置 · 1-9 切槽 · 退出时自动保存到当前槽位
        </div>
      </div>
    </div>
  );
}
