import { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon } from '../icons/Icon.jsx';

export function Coins() {
  const { stats, lastEarned } = useGameContext();
  const [pulseId, setPulseId] = useState(0);
  const [pop, setPop] = useState(null); // { id, value }
  const prevCoins = useRef(stats.coins);

  useEffect(() => {
    if (stats.coins !== prevCoins.current) {
      prevCoins.current = stats.coins;
      setPulseId((n) => n + 1);
      if (lastEarned > 0) {
        const id = Date.now();
        setPop({ id, value: lastEarned });
        const t = setTimeout(() => setPop(null), 1400);
        return () => clearTimeout(t);
      }
    }
  }, [stats.coins, lastEarned]);

  return (
    <div className="coins" key={pulseId}>
      <CoinIcon />
      <span className="coins__value">{stats.coins}</span>
      {pop && (
        <span key={pop.id} className="coins__pop">+{pop.value}</span>
      )}
    </div>
  );
}
