import { useEffect, useRef, useState } from 'react';
import { ENERGY_MAX } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon } from '../icons/Icon.jsx';

// Pill badge sitting alongside the coin counter. Clicking it always opens the
// energy modal — even with units to spare — so the user can top up early.
export function EnergyBadge() {
  const { energy, openEnergyModal } = useGameContext();
  const [pulseId, setPulseId] = useState(0);
  const prev = useRef(energy);

  useEffect(() => {
    if (energy !== prev.current) {
      prev.current = energy;
      setPulseId((n) => n + 1);
    }
  }, [energy]);

  const empty = energy <= 0;

  return (
    <button
      type="button"
      className={`energy${empty ? ' energy--empty' : ''}`}
      onClick={openEnergyModal}
      onMouseDown={(e) => e.preventDefault()}
      title={`Энергия ${energy} / ${ENERGY_MAX}`}
      aria-label={`Энергия ${energy} из ${ENERGY_MAX}`}
      key={pulseId}
    >
      <BoltIcon />
      <span className="energy__value">{energy}</span>
      <span className="energy__max">/{ENERGY_MAX}</span>
    </button>
  );
}
