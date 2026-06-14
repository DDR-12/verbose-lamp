// ===== 保存/加载菜单（按 E 键弹出） =====
import { useState, useEffect } from 'react';
import { useGameStore, gameActions } from '../game/store';
import { World } from '../game/world';

interface SlotInfo {
  slot: number;
  name: string;
  timestamp: number;
  blockCount: number;
}

export default function SaveMenu() {
  const open = useGameStore((s) => s.saveMenuOpen);
  const [slots, setSlots] = useState<(SlotInfo | null)[]>([null, null, null]);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    if (open) {
      setSlots(World.listSlots());
      setSaveName('');
    }
  }, [open]);

  if (!open) return null;

  const close = () => gameActions.setSaveMenuOpen(false);
  const eng = (window as any).__mc?.engine;
  const doSave = (slot: number) => {
    if (slots[slot] && !confirm(`覆盖存档 ${slot + 1} "${slots[slot]!.name}"？`)) return;
    eng?.quickSave?.(slot, saveName || `存档 ${slot + 1}`);
  };
  const doLoad = (slot: number) => {
    if (!slots[slot]) return;
    if (!confirm(`加载存档 ${slot + 1} 会丢弃当前未保存进度，是否继续？`)) return;
    eng?.quickLoad?.(slot);
  };
  const doDelete = (slot: number) => {
    if (!confirm(`删除存档 ${slot + 1} "${slots[slot]?.name}"？`)) return;
    World.deleteSlot(slot);
    setSlots(World.listSlots());
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-cyan-300">💾 保存 / 加载</h2>
          <button onClick={close} className="text-white/60 hover:text-white text-lg">✕</button>
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/60">存档名（保存时使用）：</label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="例如：我的城堡"
            className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/15 text-sm focus:outline-none focus:border-cyan-500"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          {slots.map((s, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border ${
                s ? 'border-emerald-500/40 bg-emerald-900/15' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
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
                <button
                  onClick={() => doSave(i)}
                  className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold whitespace-nowrap"
                >
                  {s ? '覆盖' : '保存'}
                </button>
                {s && (
                  <button
                    onClick={() => doLoad(i)}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold whitespace-nowrap"
                  >
                    加载
                  </button>
                )}
                {s && (
                  <button
                    onClick={() => doDelete(i)}
                    className="px-2 py-1 rounded-md bg-red-700/60 hover:bg-red-600/80 text-xs"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-white/40 mt-3 text-center">
          按 <b className="text-cyan-300">E</b> 或 <b>Esc</b> 关闭此菜单
        </div>
      </div>
    </div>
  );
}
