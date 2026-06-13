import { useEffect, useRef, useState } from 'react';
import { MinecraftEngine } from '../game/engine';
import { World } from '../game/world';
import { BLOCKS, HOTBAR, SlotKind, TOOLS, slotLabel, BlockType } from '../game/blocks';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MinecraftEngine | null>(null);

  const [hotbarIdx, setHotbarIdx] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<'walk' | 'fly'>('fly');
  const [breakInfo, setBreakInfo] = useState<{ pos: { x: number; y: number; z: number } | null; progress: number }>({
    pos: null, progress: 0,
  });
  const [debug, setDebug] = useState<{
    pos: { x: number; y: number; z: number }; keys: string[];
    onGround: boolean; hasMesh: boolean; yaw: number; pitch: number;
    frameCount: number; error: string | null;
  }>({ pos: { x: 0, y: 0, z: 0 }, keys: [], onGround: false, hasMesh: false, yaw: 0, pitch: 0, frameCount: 0, error: null });
  const [webglOk, setWebglOk] = useState(true);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const world = new World(48, 48, 24, 1337);
    let engine: MinecraftEngine;
    try {
      engine = new MinecraftEngine(containerRef.current, world, HOTBAR, {
        onHotbarChange: (idx) => setHotbarIdx(idx),
        onModeChange: (m) => setMode(m),
        onPointerLockChange: (locked) => setPointerLocked(locked),
        onBreakProgress: (pos, progress) => setBreakInfo({ pos, progress }),
        onDebug: (d) => setDebug(d),
      });
    } catch (err: any) {
      console.warn('启动引擎出错:', err);
      setEngineError(err?.message || '未知错误');
      setWebglOk(false);
      return;
    }
    engineRef.current = engine;
    return () => { engine.dispose(); };
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    // 强制开放方向键视角，即使 pointer lock 失败
    engineRef.current?.forceFreeLook();
    // 同时尝试请求指针锁定
    engineRef.current?.tryRequestPointerLock();
  };

  const handleToggleMode = () => {
    // 通过发送一次 F 键切换模式
    engineRef.current?.pressKey('KeyF');
    setTimeout(() => engineRef.current?.releaseKey('KeyF'), 10);
  };

  const handleRespawn = () => engineRef.current?.respawn();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87ceeb] select-none font-sans text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {/* 十字准星 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-7 h-7">
          <div className="absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 bg-white mix-blend-difference shadow" />
          <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-white mix-blend-difference shadow" />
        </div>
      </div>

      {/* 左上角标题 + 状态 */}
      <div className="pointer-events-none absolute top-4 left-4 text-sm leading-relaxed drop-shadow max-w-xs">
        <div className="text-2xl font-black tracking-wider">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
          <span className="text-white/80 text-sm ml-2 font-normal">Web Edition</span>
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10">
          <span className={`w-2 h-2 rounded-full ${pointerLocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {pointerLocked ? '鼠标已锁定（按 ESC 退出）' : '鼠标未锁定 · 使用方向键转视角'}
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10">
          模式：<b className={mode === 'fly' ? 'text-cyan-300' : 'text-emerald-300'}>{mode === 'fly' ? '飞行' : '走路'}</b>
        </div>
      </div>

      {/* 右上角操作说明 */}
      <div className="pointer-events-none absolute top-4 right-4 text-right text-xs leading-relaxed bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 max-w-xs">
        <div className="text-white/90 font-semibold mb-1">操作</div>
        <div><kbd className="kbd">WASD</kbd> 移动</div>
        <div><kbd className="kbd">方向键</kbd> 转视角</div>
        <div><kbd className="kbd">鼠标</kbd> 锁定后转视角</div>
        <div><kbd className="kbd">Space</kbd> 跳跃 / 飞高</div>
        <div><kbd className="kbd">F</kbd> 切换走路 / 飞行</div>
        <div><kbd className="kbd">左键按住</kbd> 破坏方块</div>
        <div><kbd className="kbd">右键</kbd> 放置方块</div>
        <div><kbd className="kbd">1-9 / 滚轮</kbd> 切换快捷栏</div>
      </div>

      {/* 破坏进度条 */}
      {breakInfo.pos && breakInfo.progress > 0 && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+30px)] w-48">
          <div className="bg-black/50 rounded-full h-2 overflow-hidden border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-red-500 transition-[width] duration-75"
              style={{ width: `${Math.min(100, breakInfo.progress * 100)}%` }}
            />
          </div>
          <div className="text-center text-[10px] text-white/80 mt-1">破坏中…</div>
        </div>
      )}

      {/* 底部快捷栏 */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex gap-1.5 bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
          {HOTBAR.map((slot, i) => (
            <HotbarSlot key={i} slot={slot} index={i} active={i === hotbarIdx} />
          ))}
        </div>
      </div>

      {/* 当前选中项提示 */}
      <div className="pointer-events-none absolute bottom-[170px] left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full border border-white/10">
        {(() => {
          const s = HOTBAR[hotbarIdx];
          if (s.kind === 'tool') return `⚒ ${TOOLS[s.type].label}`;
          return `🧱 ${BLOCKS[s.type as BlockType].label}`;
        })()}
      </div>

      {/* 屏幕虚拟按钮（开始游戏后出现） */}
      {hasStarted && (
        <>
          {/* 左下角：WASD + 跳 */}
          <div className="absolute bottom-28 left-6 select-none">
            <div className="flex flex-col items-center gap-1">
              <StickBtn label="W" code="KeyW" engine={engineRef} />
              <div className="flex gap-1">
                <StickBtn label="A" code="KeyA" engine={engineRef} />
                <StickBtn label="S" code="KeyS" engine={engineRef} />
                <StickBtn label="D" code="KeyD" engine={engineRef} />
              </div>
              <div className="mt-2">
                <StickBtn label="跳" code="Space" engine={engineRef} />
              </div>
            </div>
          </div>

          {/* 右下角：方向键 + 破坏/放置 */}
          <div className="absolute bottom-28 right-6 select-none">
            <div className="flex flex-col items-center gap-1">
              <StickBtn label="↑" code="ArrowUp" engine={engineRef} />
              <div className="flex gap-1">
                <StickBtn label="←" code="ArrowLeft" engine={engineRef} />
                <StickBtn label="↓" code="ArrowDown" engine={engineRef} />
                <StickBtn label="→" code="ArrowRight" engine={engineRef} />
              </div>
            </div>
          </div>

          {/* 破坏 / 放置按钮 — 右下 */}
          <div className="absolute bottom-[260px] right-6 flex gap-2 select-none">
            <button
              onPointerDown={() => engineRef.current?.startBreak()}
              onPointerUp={() => engineRef.current?.endBreak()}
              onPointerLeave={() => engineRef.current?.endBreak()}
              className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              破坏
            </button>
            <button
              onClick={() => engineRef.current?.placeBlock()}
              className="px-4 py-2 rounded-lg bg-amber-600/80 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              放置
            </button>
          </div>

          {/* 左下 — 工具按钮（模式切换/重生） */}
          <div className="absolute bottom-[260px] left-6 flex flex-col gap-2 select-none">
            <button
              onClick={handleToggleMode}
              className="px-4 py-2 rounded-lg bg-cyan-700/80 hover:bg-cyan-600 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              切换：{mode === 'fly' ? '走路' : '飞行'}
            </button>
            <button
              onClick={handleRespawn}
              className="px-4 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              重生
            </button>
          </div>
        </>
      )}

      {/* 调试面板（开始后出现） */}
      {hasStarted && (
        <div className="pointer-events-none absolute top-24 left-4 text-xs bg-black/60 rounded-lg px-3 py-2 border border-white/20 min-w-[260px]">
          <div className="font-bold mb-1 text-yellow-300">调试信息</div>
          <div>帧: <b className="text-cyan-300">{debug.frameCount}</b> {debug.frameCount > 0 ? '✅ 循环运行中' : '❌ 循环未启动'}</div>
          <div>pos: {debug.pos.x.toFixed(1)}, {debug.pos.y.toFixed(1)}, {debug.pos.z.toFixed(1)}</div>
          <div>yaw: {debug.yaw.toFixed(2)} · pitch: {debug.pitch.toFixed(2)}</div>
          <div>ground: {String(debug.onGround)} · mesh: {String(debug.hasMesh)}</div>
          <div className="text-emerald-300">keys: {debug.keys.length > 0 ? debug.keys.join(', ') : '(空)'}</div>
          {debug.error && (
            <div className="text-red-400 mt-1 break-all font-mono text-[10px]">错误: {debug.error}</div>
          )}
        </div>
      )}

      {/* 开始游戏大按钮 */}
      {!hasStarted && webglOk && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/30 to-black/60 backdrop-blur-sm">
          <div className="bg-black/70 rounded-3xl px-10 py-8 border-2 border-white/20 text-center shadow-2xl max-w-md">
            <div className="text-4xl font-black mb-3">
              <span className="text-lime-300">我的</span>
              <span className="text-amber-200">世界</span>
            </div>
            <div className="text-sm text-white/80 mb-6 leading-relaxed">
              在浏览器里亲手体验破坏、建造、自由探索。
              <br />
              <span className="text-amber-300">任何环境都能玩：</span> 键盘 / 鼠标 / 屏幕按钮
            </div>
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 active:scale-95 text-black font-bold text-lg shadow-lg shadow-lime-900/60 transition"
            >
              🎮 点击开始游戏
            </button>
            <div className="mt-5 text-xs text-white/60 leading-relaxed">
              提示：
              <br />
              · WASD 移动，方向键转视角
              <br />
              · 鼠标指针锁定后可用鼠标转视角（点击画面尝试）
              <br />
              · 左键按住破坏，右键放置方块
            </div>
          </div>
        </div>
      )}

      {/* WebGL 失败提示 */}
      {!webglOk && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="rounded-2xl px-10 py-8 border border-red-400/40 text-center max-w-md shadow-2xl">
            <div className="text-3xl font-bold mb-3 text-red-300">⛔ 无法启动</div>
            <div className="text-sm text-white/80 leading-relaxed">
              当前环境禁用了 WebGL，无法启动 3D 游戏。
              <br />
              请在桌面浏览器（Chrome / Edge / Firefox / Safari）中打开此页面。
              {engineError && <div className="mt-3 text-xs text-red-300 font-mono break-all">{engineError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HotbarSlot({ slot, index, active }: { slot: SlotKind; index: number; active: boolean }) {
  return (
    <div
      className={
        'relative w-16 h-16 rounded-lg flex flex-col items-center justify-end pb-1 transition-all ' +
        (active
          ? 'ring-2 ring-white bg-black/70 -translate-y-1 shadow-lg shadow-white/20'
          : 'bg-black/40 border border-white/10')
      }
    >
      <div className="flex-1 w-full flex items-center justify-center">
        {slot.kind === 'tool' ? <ToolIcon type={slot.type} /> : <BlockIcon type={slot.type} />}
      </div>
      <div className="absolute top-0.5 left-1.5 text-[11px] font-bold text-white/90">{index + 1}</div>
      <div className="absolute bottom-0.5 w-full text-center text-[9px] text-white/90 font-medium">
        {slotLabel(slot)}
      </div>
    </div>
  );
}

function BlockIcon({ type }: { type: BlockType }) {
  const color = BLOCKS[type].color;
  const top = lighten(color, 0.18);
  const side = darken(color, 0.08);
  const front = darken(color, 0.2);
  return (
    <svg width="32" height="32" viewBox="0 0 30 32" className="drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
      <polygon points="15,1 29,8 15,15 1,8" fill={top} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="1,8 15,15 15,30 1,23" fill={side} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="29,8 15,15 15,30 29,23" fill={front} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
}

function ToolIcon({ type }: { type: 'axe' | 'pickaxe' | 'shovel' | 'sword' }) {
  const handle = '#8b5a2b';
  const head = '#c9c9c9';
  if (type === 'axe') {
    return (
      <svg width="32" height="32" viewBox="0 0 30 32">
        <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
        <polygon points="6,4 20,2 22,14 10,18" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="6,4 12,6 10,18 8,16" fill="#ffd9a0" opacity="0.85" stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  if (type === 'pickaxe') {
    return (
      <svg width="32" height="32" viewBox="0 0 30 32">
        <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
        <polygon points="2,8 28,4 26,10 4,14" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="10,6 20,6 18,12 12,12" fill="#ffd9a0" stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  if (type === 'shovel') {
    return (
      <svg width="32" height="32" viewBox="0 0 30 32">
        <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
        <polygon points="7,2 23,2 20,14 10,14" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="10,4 20,4 19,12 11,12" fill="#ffd9a0" stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 30 32">
      <polygon points="13,1 17,1 18,20 12,20" fill={head} stroke="#00000066" strokeWidth="0.6" />
      <rect x="6" y="19" width="18" height="3" fill="#ffd9a0" stroke="#00000055" strokeWidth="0.5" />
      <rect x="12.5" y="22" width="4" height="8" fill={handle} stroke="#00000066" strokeWidth="0.5" />
    </svg>
  );
}

function lighten(hex: number, amount: number): string {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) * (1 + amount)));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xff) * (1 + amount)));
  const b = Math.min(255, Math.floor((hex & 0xff) * (1 + amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
function darken(hex: number, amount: number): string {
  const r = Math.max(0, Math.floor(((hex >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((hex >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((hex & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

/** 屏幕虚拟按钮：按住触发按键，松开取消 */
function StickBtn({ label, code, engine }: { label: string; code: string; engine: React.RefObject<MinecraftEngine | null> }) {
  return (
    <button
      className="w-14 h-14 rounded-xl bg-white/25 hover:bg-white/35 active:bg-white/50 border border-white/30 text-white font-bold shadow backdrop-blur-sm select-none transition-all active:scale-90 text-lg"
      onPointerDown={(e) => {
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
        engine.current?.pressKey(code);
      }}
      onPointerUp={(e) => {
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        engine.current?.releaseKey(code);
      }}
      onPointerLeave={() => engine.current?.releaseKey(code)}
      onPointerCancel={() => engine.current?.releaseKey(code)}
    >
      {label}
    </button>
  );
}
