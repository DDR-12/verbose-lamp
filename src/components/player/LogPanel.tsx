import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';

export default function LogPanel() {
  const log = useGameStore((s) => s.log);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [log.length]);

  return (
    <div className="bg-wood-800 border-2 border-amber-500/40 rounded-xl shadow-xl flex flex-col overflow-hidden h-full">
      <div className="px-3 py-2 border-b border-amber-500/30 bg-wood-900/50">
        <span className="text-amber-300 font-display text-base text-glow-gold">📜 游戏日志</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto custom-scroll p-2 space-y-0.5 text-xs">
        {log.slice().reverse().map((e) => {
          const color =
            e.type === 'gain' ? 'text-emerald-300'
              : e.type === 'lose' ? 'text-rose-300'
              : e.type === 'event' ? 'text-amber-300'
              : e.type === 'system' ? 'text-cyan-300'
              : 'text-wood-200';
          return (
            <div key={e.id} className={`${color} leading-snug`}>
              <span className="text-wood-500 mr-1">[{e.turn}]</span>
              {e.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}
