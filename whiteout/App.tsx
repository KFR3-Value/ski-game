import React, { useState } from 'react';
import Countdown from './components/Countdown';
import SkierTrigger from './components/SkierTrigger';
import SkiGame from './components/SkiGame';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LANDING);
  const [modalOpen, setModalOpen] = useState(false);

  const requestSensors = async () => {
    // Check if DeviceOrientationEvent is defined
    if (typeof DeviceOrientationEvent !== 'undefined') {
      // Check if requestPermission exists (iOS 13+)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            startGame();
          } else {
            alert('Sensor permission denied. You can still play by tapping/clicking the screen sides.');
            startGame();
          }
        } catch (error) {
          console.error(error);
          // Fallback for non-iOS or error
          startGame();
        }
      } else {
        // Non-iOS 13+ devices
        startGame();
      }
    } else {
      // Desktop or devices without sensors
      startGame();
    }
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = () => {
    setGameState(GameState.LOST);
    setModalOpen(true);
  };

  const handleGameWin = () => {
    setGameState(GameState.WON);
    setModalOpen(true);
  };

  const resetGame = () => {
    setModalOpen(false);
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen bg-night text-white font-mono overflow-hidden relative selection:bg-neon selection:text-night">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a2e] to-night opacity-50 z-0 pointer-events-none" />

      {/* Main Layout - LANDING */}
      {gameState === GameState.LANDING && (
        <div className="relative z-10 h-screen flex flex-col justify-center items-center p-6">
          <Countdown />

          {/* Locked Clue */}
          <div className="mt-16 w-full max-w-md border border-gray-800 bg-gray-900/50 p-6 rounded-sm text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span className="text-xs uppercase tracking-widest">Secure Transmission</span>
            </div>
            <p className="text-gray-600 text-sm tracking-wider">
              ERSTER HINWEIS: <span className="text-gray-700 bg-gray-800 px-2 py-0.5 rounded ml-1">[GESPERRT]</span>
            </p>
          </div>

          <SkierTrigger onTrigger={requestSensors} />
        </div>
      )}

      {/* Game State */}
      {gameState === GameState.PLAYING && (
        <SkiGame onGameOver={handleGameOver} onGameWin={handleGameWin} />
      )}

      {/* Result Modal */}
      {(modalOpen && (gameState === GameState.WON || gameState === GameState.LOST)) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-night border border-neon/30 p-8 max-w-sm w-full text-center shadow-[0_0_30px_rgba(34,211,238,0.15)]">

            {gameState === GameState.LOST && (
              <>
                <h2 className="text-2xl font-bold text-red-500 mb-4 tracking-widest">MISSION FAILED</h2>
                <p className="text-gray-400 mb-8 text-sm">Kollision oder Tor verpasst. Sensoren neu kalibrieren.</p>
                <button
                  onClick={resetGame}
                  className="w-full py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors uppercase tracking-widest text-sm"
                >
                  Neustart
                </button>
              </>
            )}

            {gameState === GameState.WON && (
              <>
                <h2 className="text-2xl font-bold text-neon mb-4 tracking-widest">ACCESS GRANTED</h2>
                <div className="border-t border-b border-gray-800 py-6 my-6">
                  <p className="text-xs text-gray-500 uppercase mb-2">Decrypted Message:</p>
                  <p className="text-white text-lg font-light leading-relaxed">
                    "Pack die Badehose ein, aber vergiss die Mütze nicht."
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-neon text-night font-bold hover:bg-cyan-300 transition-colors uppercase tracking-widest text-sm"
                >
                  Bestätigen
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;