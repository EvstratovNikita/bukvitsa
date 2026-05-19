import { ANIM, WORD_LENGTH } from '../../constants/game.js';
import { Cell } from './Cell.jsx';

export function Row({ guess = '', evaluation, revealing, shaking, isCurrent }) {
  const letters = guess.padEnd(WORD_LENGTH, ' ').split('').map((c) => (c === ' ' ? '' : c));
  return (
    <div className={`row${shaking ? ' row--shake' : ''}`}>
      {letters.map((ch, i) => (
        <Cell
          key={i}
          letter={ch ? ch.toUpperCase() : ''}
          status={evaluation ? evaluation[i] : null}
          revealing={revealing}
          revealDelayMs={i * ANIM.FLIP_STAGGER_MS}
          popOnInput={isCurrent && Boolean(ch)}
        />
      ))}
    </div>
  );
}
