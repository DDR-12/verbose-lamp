// ===== 主页面：游戏画布 + UI 叠层 =====
import { useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';
import StatusBar from '../components/StatusBar';
import HelpPanel from '../components/HelpPanel';
import Hotbar from '../components/Hotbar';
import DebugPanel from '../components/DebugPanel';
import StartScreen from '../components/StartScreen';
import OnScreenControls from '../components/OnScreenControls';
import { useGameStore } from '../game/store';
import { initAudioOnFirstInteraction } from '../game/audio';

export default function Home() {
  const hasStarted = useGameStore((s) => s.hasStarted);

  useEffect(() => {
    initAudioOnFirstInteraction();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a14] select-none font-sans text-white">
      <GameCanvas />
      {hasStarted && (
        <>
          <StatusBar />
          <HelpPanel />
          <Hotbar />
          <DebugPanel />
          <OnScreenControls />
        </>
      )}
      <StartScreen />
    </div>
  );
}
