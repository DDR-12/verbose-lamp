// ===== 开始界面：3 个存档槽位 + 新游戏 =====
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
  const [saveName, setSaveName] = useState('');

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

  // 新游戏：直接开始（玩家进入后按 E 主动保存到指定槽位）
  const startNew = (slot: number) => {
    if (slots[slot] && !confirm(`存档 ${slot + 1} 已有内容 "${slots[slot]!.name}"，是否覆盖？`)) return;
    // 清掉自动保存，确保世界是干净的
    try { localStorage.removeItem('mc-world-save-v2'); } catch {}
    gameActions.setHasStarted(true);
    // 进入后稍等引擎初始化再保存
    setTimeout(() => {
      const eng = (window as any).__mc?.engine;
      if (eng?.quickSave) eng.quickSave(slot, saveName || `存档 ${slot + 1}`);
    }, 600);
    (window as any).__mc?.input?.requestPointerLock?.();
  };

  // 继续：加载该槽位并开始
  const loadSlot = (slot: number) => {
    if (!slots[slot]) return;
    // 先重置 world（清空自动保存），再让引擎从该槽位加载
    try { localStorage.removeItem('mc-world-save-v2'); } catch {}
    gameActions.setHasStarted(true);
    setTimeout(() => {
      const eng = (window as any).__mc?.engine;
      if (eng?.quickLoad) eng.quickLoad(slot);
    }, 600);
    (window as any).__mc?.input?.requestPointerLock?.();
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
          <div className="text-xs text-white/60 font-semibold">📂 存档槽位（3 个）</div>
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
                  onClick={() => loadSlot(i)}
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
                onClick={() => startNew(i)}
                className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold whitespace-nowrap"
              >
                {s ? '覆盖' : '新游戏 →'}
              </button>
            </div>
          ))}
        </div>

        {/* 存档名输入 */}
        <div className="mb-4">
          <label className="text-xs text-white/60">新存档名（可选）：</label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="例如：我的基地"
            className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/15 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* 操作提示 */}
        <div className="text-xs text-white/55 leading-relaxed border-t border-white/10 pt-3">
          <b className="text-amber-300">操作：</b> WASD 移动 · 方向键转视角 · Space 跳跃 · F 飞行
          <br />
          左键破坏 · 右键放置 · 1-9 切槽 · <b className="text-cyan-300">E</b> 弹出保存菜单
        </div>
      </div>
    </div>
  );
}
