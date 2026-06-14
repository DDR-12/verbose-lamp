import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { startAILoop } from '../../store/ai';

export default function GameLoop() {
  const phase = useGameStore((s) => s.phase);
  const modal = useGameStore((s) => s.modal);
  const tickStocks = useGameStore((s) => s.tickStocks);

  // 启动 AI 循环
  useEffect(() => {
    const id = startAILoop();
    return () => clearInterval(id);
  }, []);

  // 股票自动波动 - 每 8 秒一次
  useEffect(() => {
    const id = setInterval(() => {
      tickStocks();
    }, 8000);
    return () => clearInterval(id);
  }, [tickStocks]);

  return null;
}
