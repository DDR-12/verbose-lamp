// ===== 调试面板 =====
import { useGameStore } from '../game/store';

export default function DebugPanel() {
  const frameCount = useGameStore((s) => s.frameCount);
  const pos = useGameStore((s) => s.pos);
  const yaw = useGameStore((s) => s.yaw);
  const pitch = useGameStore((s) => s.pitch);
  const onGround = useGameStore((s) => s.onGround);
  const mode = useGameStore((s) => s.mode);
  // 关键修复：keys 是个 Set，selector 每次都返回不同引用会触发死循环
  // 改为只订阅 size，渲染时再展开
  const keysSize = useGameStore((s) => s.keys.size);
  const renderer = useGameStore((s) => s.renderer);
  const error = useGameStore((s) => s.error);
  const breaking = useGameStore((s) => s.breaking);
  const hotbarIndex = useGameStore((s) => s.hotbarIndex);
  const slots = useGameStore((s) => s.slots);

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 text-xs bg-black/65 rounded-lg px-3 py-2 border border-white/20 min-w-[280px]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div>帧: <b className="text-cyan-300">{frameCount}</b> {frameCount > 0 ? '✅' : '❌'}</div>
        <div>渲染: <b className={renderer === '3d' ? 'text-emerald-300' : renderer === '2d' ? 'text-amber-300' : 'text-red-400'}>{renderer.toUpperCase()}</b></div>
        <div>pos: <b className="text-cyan-300">{pos.x.toFixed(1)}, {pos.y.toFixed(1)}, {pos.z.toFixed(1)}</b></div>
        <div>yaw/pitch: <b className="text-cyan-300">{(yaw * 180 / Math.PI).toFixed(0)}°/{(pitch * 180 / Math.PI).toFixed(0)}°</b></div>
        <div>ground: {String(onGround)} · mode: <b className={mode === 'fly' ? 'text-cyan-300' : 'text-emerald-300'}>{mode}</b></div>
        <div>slot: {hotbarIndex + 1}/{slots.length} <b className="text-yellow-300">{slots[hotbarIndex]?.kind === 'tool' ? '🔧 工具' : '🧱 方块'}</b></div>
      </div>
      <div className="text-emerald-300 mt-1">按键: <b>{keysSize} 个</b></div>
      {breaking && <div className="text-orange-300">破坏: {Math.round(breaking.progress * 100)}%</div>}
      {error && <div className="text-red-400 break-all font-mono text-[10px] mt-1">⚠ {error}</div>}
    </div>
  );
}
