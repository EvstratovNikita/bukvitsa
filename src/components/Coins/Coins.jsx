import { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon } from '../icons/Icon.jsx';

export function Coins() {
  const { stats } = useGameContext();
  const [pulseId, setPulseId] = useState(0);
  const [pop, setPop] = useState(null); // { id, value }
  const prevCoins = useRef(stats.coins);

  useEffect(() => {
    const prev = prevCoins.current;
    if (stats.coins === prev) return;
    const delta = stats.coins - prev;
    prevCoins.current = stats.coins;
    setPulseId((n) => n + 1);
    // Only flash a "+N" when coins actually increase. Spends (hints, shop)
    // decrease the balance — no green pop for those.
    if (delta > 0) {
      const id = Date.now();
      setPop({ id, value: delta });
      const t = setTimeout(() => setPop(null), 1400);
      return () => clearTimeout(t);
    }
    setPop(null);
  }, [stats.coins]);

  return (
    <div className="coins" key={pulseId} data-tour="coins">
      <CoinIcon />
      <span className="coins__value">{stats.coins}</span>
      {pop && (
        <span key={pop.id} className="coins__pop">+{pop.value}</span>
      )}
    </div>
  );
}
