import { useEffect, useRef, useState } from 'react';
import { MinecraftEngine } from '../game/engine';
import { World } from '../game/world';
import { BLOCKS, HOTBAR, SlotKind, TOOLS, slotLabel, BlockType } from '../game/blocks';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MinecraftEngine | null>(null);
  const [hotbarIdx, setHotbarIdx] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [mode, setMode] = useState<'walk' | 'fly'>('walk');
  const [breakInfo, setBreakInfo] = useState<{ pos: { x: number; y: number; z: number } | null; progress: number }>({
    pos: null, progress: 0,
  });
  const [webglOk, setWebglOk] = useState(true);

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
      });
    } catch (err) {
      console.warn('Failed to start engine:', err);
      setWebglOk(false);
      return;
    }
    engineRef.current = engine;

    const onMouseMove = (e: MouseEvent) => engine.handleMouseMove(e);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      engine.dispose();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87ceeb] select-none font-sans text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {/* 十字准星 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-6 h-6">
          <div className="absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 bg-white mix-blend-difference" />
          <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-white mix-blend-difference" />
        </div>
      </div>

      {/* 左上角：标题 + 模式 */}
      <div className="pointer-events-none absolute top-4 left-4 text-sm leading-relaxed drop-shadow">
        <div className="text-2xl font-black tracking-wider">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
          <span className="text-white/80 text-sm ml-2 font-normal">Web Edition</span>
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5">
          <span className={`w-2 h-2 rounded-full ${pointerLocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {pointerLocked ? '已锁定鼠标（按 ESC 退出）' : '点击画面开始'}
        </div>
        <div className="mt-1 inline-flex items-center gap-2 bg-black/30 rounded px-2 py-0.5">
          模式：<b className={mode === 'fly' ? 'text-cyan-300' : 'text-emerald-300'}>{mode === 'fly' ? '飞行' : '走路'}</b>
          <span className="text-white/60 text-xs">(F 切换)</span>
        </div>
      </div>

      {/* 右上角：操作说明 */}
      <div className="pointer-events-none absolute top-4 right-4 text-right text-xs leading-relaxed bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 max-w-xs">
        <div className="text-white/90 font-semibold mb-1">操作</div>
        <div><kbd className="kbd">WASD</kbd> 移动</div>
        <div><kbd className="kbd">鼠标</kbd> 视角</div>
        <div><kbd className="kbd">Space</kbd> 跳跃 / 飞高</div>
        <div><kbd className="kbd">Shift</kbd> 下降（飞行中）</div>
        <div><kbd className="kbd">F</kbd> 切换走路 / 飞行</div>
        <div><kbd className="kbd">左键 按住</kbd> 破坏方块</div>
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
      <div className="pointer-events-none absolute bottom-[160px] left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full border border-white/10">
        {(() => {
          const s = HOTBAR[hotbarIdx];
          if (s.kind === 'tool') return `⚒ 工具：${TOOLS[s.type].label}`;
          return `🧱 方块：${BLOCKS[s.type as BlockType].label}`;
        })()}
      </div>

      {/* 未锁定鼠标时的大提示 */}
      {!pointerLocked && webglOk && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/15 text-center shadow-2xl max-w-sm">
            <div className="text-2xl font-bold mb-2">👆 点击画面开始游戏</div>
            <div className="text-sm text-white/70">
              锁定鼠标后即可用鼠标转动视角，用 WASD 走动。
              <br />按 <kbd className="kbd">ESC</kbd> 可退出鼠标锁定。
            </div>
          </div>
        </div>
      )}

      {!webglOk && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 rounded-2xl px-8 py-6 border border-red-400/40 text-center max-w-md shadow-2xl">
            <div className="text-2xl font-bold mb-2 text-red-300">⛔ WebGL 不可用</div>
            <div className="text-sm text-white/80">
              当前环境禁用了 WebGL，无法启动 3D 游戏。
              <br />请在桌面浏览器（Chrome / Edge / Firefox / Safari）中打开此页面。
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
        {slot.kind === 'tool' ? (
          <ToolIcon type={slot.type} />
        ) : (
          <BlockIcon type={slot.type} />
        )}
      </div>
      <div className="absolute top-0.5 left-1.5 text-[11px] font-bold text-white/90">{index + 1}</div>
      <div className="absolute bottom-0.5 w-full text-center text-[9px] text-white/90 font-medium">
        {slotLabel(slot)}
      </div>
    </div>
  );
}

/** 3D 方块图标（由三个可见面的斜角矩形组成） */
function BlockIcon({ type }: { type: BlockType }) {
  const color = BLOCKS[type].color;
  const hex = '#' + color.toString(16).padStart(6, '0');
  const top = lighten(color, 0.18);
  const side = darken(color, 0.08);
  const front = darken(color, 0.2);
  return (
    <svg width="30" height="32" viewBox="0 0 30 32" className="drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
      {/* 顶面 */}
      <polygon points="15,1 29,8 15,15 1,8" fill={top} stroke="#00000055" strokeWidth="0.5" />
      {/* 左侧面 */}
      <polygon points="1,8 15,15 15,30 1,23" fill={side} stroke="#00000055" strokeWidth="0.5" />
      {/* 右侧面 */}
      <polygon points="29,8 15,15 15,30 29,23" fill={front} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
}

function ToolIcon({ type }: { type: 'axe' | 'pickaxe' | 'shovel' | 'sword' }) {
  // 不同工具画不同风格的简化图标（柄 + 头）
  const handle = '#8b5a2b';
  const head = '#c9c9c9';
  const accent = TOOLS[type].accent;
  const accentHex = '#' + accent.toString(16).padStart(6, '0');
  const common = (
    <>
      {/* 把手 */}
      <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
    </>
  );
  if (type === 'axe') {
    return (
      <svg width="30" height="32" viewBox="0 0 30 32">
        {common}
        {/* 斧头 */}
        <polygon points="6,4 20,2 22,14 10,18" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="6,4 12,6 10,18 8,16" fill={accentHex} opacity="0.85" stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  if (type === 'pickaxe') {
    return (
      <svg width="30" height="32" viewBox="0 0 30 32">
        {common}
        {/* 镐头 — 横向金属条 + 两个尖 */}
        <polygon points="2,8 28,4 26,10 4,14" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="10,6 20,6 18,12 12,12" fill={accentHex} stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  if (type === 'shovel') {
    return (
      <svg width="30" height="32" viewBox="0 0 30 32">
        {common}
        {/* 铲头 */}
        <polygon points="7,2 23,2 20,14 10,14" fill={head} stroke="#00000066" strokeWidth="0.6" />
        <polygon points="10,4 20,4 19,12 11,12" fill={accentHex} stroke="#00000055" strokeWidth="0.5" />
      </svg>
    );
  }
  // sword
  return (
    <svg width="30" height="32" viewBox="0 0 30 32">
      {/* 剑身 */}
      <polygon points="13,1 17,1 18,20 12,20" fill={head} stroke="#00000066" strokeWidth="0.6" />
      {/* 护手 */}
      <rect x="6" y="19" width="18" height="3" fill={accentHex} stroke="#00000055" strokeWidth="0.5" />
      {/* 柄 */}
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
