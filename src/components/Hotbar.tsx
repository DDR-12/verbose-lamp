// ===== 快捷栏组件 =====
import { useGameStore } from '../game/store';
import { slotLabel } from '../game/hotbar';
import { BLOCKS, type BlockType } from '../game/blocks';
import { TOOLS, type ToolType } from '../game/tools';

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

function BlockIcon({ type }: { type: BlockType }) {
  const color = BLOCKS[type].color;
  return (
    <svg width="32" height="32" viewBox="0 0 30 32" className="drop-shadow">
      <polygon points="15,1 29,8 15,15 1,8" fill={lighten(color, 0.2)} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="1,8 15,15 15,30 1,23" fill={darken(color, 0.05)} stroke="#00000055" strokeWidth="0.5" />
      <polygon points="29,8 15,15 15,30 29,23" fill={darken(color, 0.18)} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
}

function ToolIcon({ type }: { type: ToolType }) {
  const t = TOOLS[type];
  const handle = '#5a3a1b';
  const accent = '#' + t.accent.toString(16).padStart(6, '0');
  if (type === 'axe') return (
    <svg width="32" height="32" viewBox="0 0 30 32">
      <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
      <polygon points="6,4 20,2 22,14 10,18" fill="#c9c9c9" stroke="#00000066" strokeWidth="0.6" />
      <polygon points="6,4 12,6 10,18 8,16" fill={accent} opacity="0.9" stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
  if (type === 'pickaxe') return (
    <svg width="32" height="32" viewBox="0 0 30 32">
      <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
      <polygon points="2,8 28,4 26,10 4,14" fill="#c9c9c9" stroke="#00000066" strokeWidth="0.6" />
      <polygon points="10,6 20,6 18,12 12,12" fill={accent} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
  if (type === 'shovel') return (
    <svg width="32" height="32" viewBox="0 0 30 32">
      <rect x="12" y="14" width="3" height="14" fill={handle} stroke="#00000066" strokeWidth="0.5" />
      <polygon points="7,2 23,2 20,14 10,14" fill="#c9c9c9" stroke="#00000066" strokeWidth="0.6" />
      <polygon points="10,4 20,4 19,12 11,12" fill={accent} stroke="#00000055" strokeWidth="0.5" />
    </svg>
  );
  return (
    <svg width="32" height="32" viewBox="0 0 30 32">
      <polygon points="13,1 17,1 18,20 12,20" fill="#c9c9c9" stroke="#00000066" strokeWidth="0.6" />
      <rect x="6" y="19" width="18" height="3" fill={accent} stroke="#00000055" strokeWidth="0.5" />
      <rect x="12.5" y="22" width="4" height="8" fill={handle} stroke="#00000066" strokeWidth="0.5" />
    </svg>
  );
}

export default function Hotbar() {
  const slots = useGameStore((s) => s.slots);
  const hotbarIndex = useGameStore((s) => s.hotbarIndex);
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 backdrop-blur-sm p-2 rounded-xl border border-white/15">
      {slots.map((slot, i) => (
        <div
          key={i}
          className={
            'relative w-14 h-14 rounded-lg flex flex-col items-center justify-end pb-1 transition-all ' +
            (i === hotbarIndex ? 'ring-2 ring-white bg-black/80 -translate-y-1 shadow-lg shadow-white/30' : 'bg-black/40 border border-white/10')
          }
        >
          <div className="flex-1 w-full flex items-center justify-center">
            {slot.kind === 'tool' ? <ToolIcon type={slot.type} /> : <BlockIcon type={slot.type} />}
          </div>
          <div className="absolute top-0.5 left-1.5 text-[10px] font-bold text-white/90">{i + 1}</div>
          <div className="absolute bottom-0 w-full text-center text-[8px] text-white/95 font-medium">{slotLabel(slot)}</div>
        </div>
      ))}
    </div>
  );
}
