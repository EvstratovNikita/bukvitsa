import { useEffect, useRef, useState } from 'react';
import { ENERGY_MAX, formatDuration, msUntilNextEnergyUnit } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon } from '../icons/Icon.jsx';

// Pill badge sitting alongside the coin counter. Shows "X / 5" and a small
// countdown when not full. Ticking is local (1s setInterval) — it's just
// display, the authoritative reconciliation runs in useStats.
export function EnergyBadge() {
  const { energy, lastEnergyTickAt, petHunger, openEnergyModal } = useGameContext();
  const [pulseId, setPulseId] = useState(0);
  const [tick, setTick] = useState(0);
  const prev = useRef(energy);

  useEffect(() => {
    if (energy !== prev.current) {
      prev.current = energy;
      setPulseId((n) => n + 1);
    }
  }, [energy]);

  // Local 1s tick so the countdown reads as continuous.
  useEffect(() => {
    if (energy >= ENERGY_MAX) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [energy]);

  const empty = energy <= 0;
  const ms = msUntilNextEnergyUnit({ energy, lastEnergyTickAt, hunger: petHunger });
  const countdown = energy < ENERGY_MAX ? formatDuration(ms) : null;

  return (
    <button
      type="button"
      className={`energy${empty ? ' energy--empty' : ''}`}
      onClick={openEnergyModal}
      onMouseDown={(e) => e.preventDefault()}
      title={`Энергия ${energy} / ${ENERGY_MAX}${countdown ? `, до +1: ${countdown}` : ''}`}
      aria-label={`Энергия ${energy} из ${ENERGY_MAX}`}
      key={pulseId}
      data-tick={tick}
    >
      <BoltIcon />
      <span className="energy__value">{energy}</span>
      <span className="energy__max">/{ENERGY_MAX}</span>
      {countdown && <span className="energy__timer">{countdown}</span>}
    </button>
  );
}
