import { createContext, useContext } from 'react';
import { useGame } from '../hooks/useGame.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const value = useGame();
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
