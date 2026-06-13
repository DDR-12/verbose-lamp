// ===== 状态栏（左上角：标题、模式、指针锁） =====
import { useGameStore } from '../game/store';

export default function StatusBar() {
  const pointerLocked = useGameStore((s) => s.pointerLocked);
  const mode = useGameStore((s) => s.mode);
  const hasStarted = useGameStore((s) => s.hasStarted);
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-30 text-sm leading-tight drop-shadow">
      <div className="text-xl font-black tracking-wider">
        <span className="text-lime-300">我的</span>
        <span className="text-amber-200">世界</span>
        <span className="text-white/70 text-xs ml-1.5 font-normal">Web</span>
      </div>
      <div className="mt-1 inline-flex items-center gap-1.5 bg-black/40 rounded px-2 py-0.5 border border-white/10 text-[11px]">
        <span className={`w-1.5 h-1.5 rounded-full ${pointerLocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        {pointerLocked ? '鼠标已锁定（ESC 退出）' : hasStarted ? '用方向键转视角 / 鼠标拖拽 / 屏幕按钮' : '点击下方按钮开始'}
      </div>
      <div className="mt-1 inline-flex items-center gap-1.5 bg-black/40 rounded px-2 py-0.5 border border-white/10 text-[11px]">
        模式: <b className={mode === 'fly' ? 'text-cyan-300' : 'text-emerald-300'}>{mode === 'fly' ? '飞行' : '走路'}</b>
        <span className="text-white/50">(F 切换 · R 重生)</span>
      </div>
    </div>
  );
}
