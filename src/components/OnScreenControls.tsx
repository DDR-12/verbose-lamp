// ===== 屏幕虚拟按钮（移动、视角、动作） =====

interface BtnProps {
  label: string;
  code: string;
  className?: string;
}

function StickBtn({ label, code, className = '' }: BtnProps) {
  const onDown = () => (window as any).__mc?.input?.press(code);
  const onUp = () => (window as any).__mc?.input?.release(code);
  return (
    <button
      className={`w-14 h-14 rounded-xl bg-white/25 hover:bg-white/35 active:bg-white/50 border border-white/30 text-white font-bold shadow backdrop-blur-sm select-none transition-all active:scale-90 text-lg touch-none ${className}`}
      onPointerDown={(e) => { e.preventDefault(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {} onDown(); }}
      onPointerUp={(e) => { try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} onUp(); }}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      {label}
    </button>
  );
}

export default function OnScreenControls() {
  return (
    <>
      {/* 左下：移动 */}
      <div className="absolute bottom-24 left-4 z-40">
        <div className="flex flex-col items-center gap-1">
          <StickBtn label="W" code="KeyW" />
          <div className="flex gap-1">
            <StickBtn label="A" code="KeyA" />
            <StickBtn label="S" code="KeyS" />
            <StickBtn label="D" code="KeyD" />
          </div>
        </div>
      </div>
      {/* 跳跃 */}
      <div className="absolute bottom-24 left-20 z-40">
        <StickBtn label="跳" code="Space" className="w-16" />
      </div>
      {/* 右下：视角 */}
      <div className="absolute bottom-24 right-4 z-40">
        <div className="flex flex-col items-center gap-1">
          <StickBtn label="↑" code="ArrowUp" />
          <div className="flex gap-1">
            <StickBtn label="←" code="ArrowLeft" />
            <StickBtn label="↓" code="ArrowDown" />
            <StickBtn label="→" code="ArrowRight" />
          </div>
        </div>
      </div>
      {/* 破坏 / 放置 */}
      <div className="absolute bottom-44 right-4 z-40 flex gap-2">
        <button
          onPointerDown={() => (window as any).__mc?.engine?.startBreak()}
          onPointerUp={() => (window as any).__mc?.engine?.endBreak()}
          onPointerLeave={() => (window as any).__mc?.engine?.endBreak()}
          className="px-4 py-2 rounded-lg bg-red-600/85 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm shadow border border-white/20 transition touch-none"
        >
          破坏
        </button>
        <button
          onClick={() => (window as any).__mc?.engine?.placeBlock()}
          className="px-4 py-2 rounded-lg bg-amber-600/85 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm shadow border border-white/20 transition"
        >
          放置
        </button>
      </div>
    </>
  );
}
