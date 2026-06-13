import { useEffect, useRef, useState, useCallback } from 'react';
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

  // ====== 纯 HTML 测试方块（完全绕过 Three.js） ======
  const [testPos, setTestPos] = useState({ x: 200, y: 200 });
  const testKeysRef = useRef(new Set<string>());
  const testRafRef = useRef(0);

  // 测试方块的移动循环 — 纯 HTML，与引擎无关
  useEffect(() => {
    if (!hasStarted) return;
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const speed = 200; // px/秒
      setTestPos((prev) => {
        let { x, y } = prev;
        const keys = testKeysRef.current;
        if (keys.has('KeyW') || keys.has('ArrowUp')) y -= speed * dt;
        if (keys.has('KeyS') || keys.has('ArrowDown')) y += speed * dt;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= speed * dt;
        if (keys.has('KeyD') || keys.has('ArrowRight')) x += speed * dt;
        return { x, y };
      });
      testRafRef.current = requestAnimationFrame(tick);
    };
    testRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(testRafRef.current);
  }, [hasStarted]);

  // 全局键盘事件（同时驱动测试方块和引擎）
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      testKeysRef.current.add(e.code);
      // 也传给引擎
      engineRef.current?.pressKey(e.code);
      // 阻止默认行为
      const gameKeys = ['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF'];
      if (gameKeys.includes(e.code)) e.preventDefault();
      // 处理特殊键
      if (e.code === 'KeyF') {
        setMode((m) => m === 'walk' ? 'fly' : 'walk');
      }
    };
    const onUp = (e: KeyboardEvent) => {
      testKeysRef.current.delete(e.code);
      engineRef.current?.releaseKey(e.code);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // 初始化引擎
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
    engineRef.current?.forceFreeLook();
    engineRef.current?.tryRequestPointerLock();
  };

  const handleForceMove = () => {
    const e = engineRef.current;
    if (!e) { setEngineError('引擎未创建！'); return; }
    // 直接修改位置
    (e as any).pos.x += 3;
    setEngineError('已强制前移 +3，查看调试面板 pos 是否变化');
  };

  const handleRespawn = () => engineRef.current?.respawn();

  // 屏幕按钮处理
  const handleScreenBtnDown = useCallback((code: string) => {
    testKeysRef.current.add(code);
    engineRef.current?.pressKey(code);
  }, []);
  const handleScreenBtnUp = useCallback((code: string) => {
    testKeysRef.current.delete(code);
    engineRef.current?.releaseKey(code);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87ceeb] select-none font-sans text-white">
      {/* Three.js 画布容器 */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* ====== 纯 HTML 测试方块（红色，永远在最上层）====== */}
      {hasStarted && (
        <div
          style={{
            position: 'fixed',
            left: testPos.x,
            top: testPos.y,
            width: 40,
            height: 40,
            background: 'red',
            border: '3px solid yellow',
            borderRadius: 6,
            zIndex: 99999,
            pointerEvents: 'none',
            transition: 'none',
          }}
        >
          <div style={{ fontSize: 10, textAlign: 'center', lineHeight: '40px', fontWeight: 'bold' }}>测试</div>
        </div>
      )}

      {/* 十字准星 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
        <div className="relative w-7 h-7">
          <div className="absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 bg-white mix-blend-difference shadow" />
          <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-white mix-blend-difference shadow" />
        </div>
      </div>

      {/* 左上角标题 + 状态 */}
      <div className="pointer-events-none absolute top-4 left-4 text-sm leading-relaxed drop-shadow max-w-xs" style={{ zIndex: 20 }}>
        <div className="text-2xl font-black tracking-wider">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10">
          <span className={`w-2 h-2 rounded-full ${pointerLocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {pointerLocked ? '鼠标已锁定' : '鼠标未锁定'}
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10">
          模式：<b className={mode === 'fly' ? 'text-cyan-300' : 'text-emerald-300'}>{mode === 'fly' ? '飞行' : '走路'}</b>
        </div>
      </div>

      {/* 调试面板 — 最重要！ */}
      {hasStarted && (
        <div className="pointer-events-none absolute top-24 left-4 text-xs bg-black/70 rounded-lg px-4 py-3 border-2 border-yellow-400/60 min-w-[280px]" style={{ zIndex: 30 }}>
          <div className="font-bold mb-2 text-yellow-300 text-sm">🔍 调试信息</div>
          <div className="space-y-1">
            <div>引擎帧: <b className="text-cyan-300">{debug.frameCount}</b> {debug.frameCount > 0 ? <span className="text-emerald-400">✅ 运行中</span> : <span className="text-red-400">❌ 未启动</span>}</div>
            <div>3D位置: <b className="text-cyan-300">{debug.pos.x.toFixed(1)}, {debug.pos.y.toFixed(1)}, {debug.pos.z.toFixed(1)}</b></div>
            <div>朝向: yaw={debug.yaw.toFixed(2)} pitch={debug.pitch.toFixed(2)}</div>
            <div>落地: {String(debug.onGround)} · 网格: {String(debug.hasMesh)}</div>
            <div className="text-emerald-300">按键: <b>{debug.keys.length > 0 ? debug.keys.join(', ') : '(空)'}</b></div>
            {debug.error && <div className="text-red-400 break-all font-mono text-[10px]">错误: {debug.error}</div>}
            {engineError && <div className="text-red-400 break-all font-mono text-[10px]">引擎: {engineError}</div>}
          </div>
          <div className="mt-2 pt-2 border-t border-white/20 text-white/70">
            红色测试方块: 用 WASD / 方向键 移动<br/>
            如果红块能动 → 输入系统正常，问题在 3D 引擎<br/>
            如果红块不动 → 键盘事件没进来
          </div>
        </div>
      )}

      {/* 右上角操作说明 */}
      <div className="pointer-events-none absolute top-4 right-4 text-right text-xs leading-relaxed bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 max-w-xs" style={{ zIndex: 20 }}>
        <div className="text-white/90 font-semibold mb-1">操作</div>
        <div><kbd className="kbd">WASD</kbd> 移动</div>
        <div><kbd className="kbd">方向键</kbd> 转视角</div>
        <div><kbd className="kbd">Space</kbd> 跳跃 / 飞高</div>
        <div><kbd className="kbd">F</kbd> 切换走路 / 飞行</div>
        <div><kbd className="kbd">左键按住</kbd> 破坏</div>
        <div><kbd className="kbd">右键</kbd> 放置</div>
      </div>

      {/* 破坏进度条 */}
      {breakInfo.pos && breakInfo.progress > 0 && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+30px)] w-48" style={{ zIndex: 20 }}>
          <div className="bg-black/50 rounded-full h-2 overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-amber-300 to-red-500" style={{ width: `${Math.min(100, breakInfo.progress * 100)}%` }} />
          </div>
        </div>
      )}

      {/* 底部快捷栏 */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2" style={{ zIndex: 20 }}>
        <div className="flex gap-1.5 bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
          {HOTBAR.map((slot, i) => (
            <HotbarSlot key={i} slot={slot} index={i} active={i === hotbarIdx} />
          ))}
        </div>
      </div>

      {/* 屏幕虚拟按钮 */}
      {hasStarted && (
        <>
          {/* 左下角：WASD + 跳 */}
          <div className="absolute bottom-28 left-6" style={{ zIndex: 50 }}>
            <div className="flex flex-col items-center gap-1">
              <StickBtn label="W" code="KeyW" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
              <div className="flex gap-1">
                <StickBtn label="A" code="KeyA" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
                <StickBtn label="S" code="KeyS" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
                <StickBtn label="D" code="KeyD" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
              </div>
              <StickBtn label="跳" code="Space" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
            </div>
          </div>

          {/* 右下角：方向键 */}
          <div className="absolute bottom-28 right-6" style={{ zIndex: 50 }}>
            <div className="flex flex-col items-center gap-1">
              <StickBtn label="↑" code="ArrowUp" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
              <div className="flex gap-1">
                <StickBtn label="←" code="ArrowLeft" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
                <StickBtn label="↓" code="ArrowDown" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
                <StickBtn label="→" code="ArrowRight" onDown={handleScreenBtnDown} onUp={handleScreenBtnUp} />
              </div>
            </div>
          </div>

          {/* 破坏 / 放置 */}
          <div className="absolute bottom-[260px] right-6 flex gap-2" style={{ zIndex: 50 }}>
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

          {/* 左下 — 功能按钮 */}
          <div className="absolute bottom-[260px] left-6 flex flex-col gap-2" style={{ zIndex: 50 }}>
            <button
              onClick={handleForceMove}
              className="px-4 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              ⚡ 强制前移+3
            </button>
            <button
              onClick={handleRespawn}
              className="px-4 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-sm shadow border border-white/20 transition"
            >
              🔄 重生
            </button>
          </div>
        </>
      )}

      {/* 开始游戏大按钮 */}
      {!hasStarted && webglOk && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/30 to-black/60 backdrop-blur-sm" style={{ zIndex: 100 }}>
          <div className="bg-black/70 rounded-3xl px-10 py-8 border-2 border-white/20 text-center shadow-2xl max-w-md">
            <div className="text-4xl font-black mb-3">
              <span className="text-lime-300">我的</span>
              <span className="text-amber-200">世界</span>
            </div>
            <div className="text-sm text-white/80 mb-6 leading-relaxed">
              进入后有<b className="text-red-400">红色测试方块</b>，用 WASD 移动它。<br/>
              如果红块能动说明输入正常。
            </div>
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 active:scale-95 text-black font-bold text-lg shadow-lg shadow-lime-900/60 transition"
            >
              🎮 开始游戏
            </button>
          </div>
        </div>
      )}

      {/* WebGL 失败 */}
      {!webglOk && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80" style={{ zIndex: 100 }}>
          <div className="rounded-2xl px-10 py-8 border border-red-400/40 text-center max-w-md shadow-2xl">
            <div className="text-3xl font-bold mb-3 text-red-300">⛔ 无法启动</div>
            <div className="text-sm text-white/80 leading-relaxed">
              WebGL 不可用。请在桌面浏览器中打开。
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
    <div className={
      'relative w-14 h-14 rounded-lg flex flex-col items-center justify-end pb-1 transition-all ' +
      (active ? 'ring-2 ring-white bg-black/70 -translate-y-1 shadow-lg shadow-white/20' : 'bg-black/40 border border-white/10')
    }>
      <div className="flex-1 w-full flex items-center justify-center">
        {slot.kind === 'tool' ? <ToolIcon type={slot.type} /> : <BlockIcon type={slot.type} />}
      </div>
      <div className="absolute top-0.5 left-1.5 text-[10px] font-bold text-white/90">{index + 1}</div>
      <div className="absolute bottom-0.5 w-full text-center text-[8px] text-white/90 font-medium">{slotLabel(slot)}</div>
    </div>
  );
}

function BlockIcon({ type }: { type: BlockType }) {
  const color = BLOCKS[type].color;
  const top = lighten(color, 0.18);
  const side = darken(color, 0.08);
  const front = darken(color, 0.2);
  return (
    <svg width="28" height="28" viewBox="0 0 30 32">
      <polygon points="15,1 29,8 15,15 1,8" fill={top} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="1,8 15,15 15,30 1,23" fill={side} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="29,8 15,15 15,30 29,23" fill={front} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
}

function ToolIcon({ type }: { type: 'axe' | 'pickaxe' | 'shovel' | 'sword' }) {
  const h = '#8b5a2b', hd = '#c9c9c9';
  if (type === 'axe') return <svg width="28" height="28" viewBox="0 0 30 32"><rect x="12" y="14" width="3" height="14" fill={h} stroke="#00000066" strokeWidth="0.5"/><polygon points="6,4 20,2 22,14 10,18" fill={hd} stroke="#00000066" strokeWidth="0.6"/></svg>;
  if (type === 'pickaxe') return <svg width="28" height="28" viewBox="0 0 30 32"><rect x="12" y="14" width="3" height="14" fill={h} stroke="#00000066" strokeWidth="0.5"/><polygon points="2,8 28,4 26,10 4,14" fill={hd} stroke="#00000066" strokeWidth="0.6"/></svg>;
  if (type === 'shovel') return <svg width="28" height="28" viewBox="0 0 30 32"><rect x="12" y="14" width="3" height="14" fill={h} stroke="#00000066" strokeWidth="0.5"/><polygon points="7,2 23,2 20,14 10,14" fill={hd} stroke="#00000066" strokeWidth="0.6"/></svg>;
  return <svg width="28" height="28" viewBox="0 0 30 32"><polygon points="13,1 17,1 18,20 12,20" fill={hd} stroke="#00000066" strokeWidth="0.6"/><rect x="6" y="19" width="18" height="3" fill="#ffd9a0" stroke="#00000055" strokeWidth="0.5"/><rect x="12.5" y="22" width="4" height="8" fill={h} stroke="#00000066" strokeWidth="0.5"/></svg>;
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

/** 屏幕虚拟按钮 */
function StickBtn({ label, code, onDown, onUp }: { label: string; code: string; onDown: (c: string) => void; onUp: (c: string) => void }) {
  return (
    <button
      className="w-14 h-14 rounded-xl bg-white/25 hover:bg-white/35 active:bg-white/50 border border-white/30 text-white font-bold shadow backdrop-blur-sm select-none transition-all active:scale-90 text-lg"
      onPointerDown={(e) => {
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        onDown(code);
      }}
      onPointerUp={(e) => {
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        onUp(code);
      }}
      onPointerLeave={() => onUp(code)}
      onPointerCancel={() => onUp(code)}
    >
      {label}
    </button>
  );
}
