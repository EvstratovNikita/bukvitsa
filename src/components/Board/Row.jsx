import { ANIM } from '../../constants/game.js';
import { Cell } from './Cell.jsx';

export function Row({
  guess = '',
  evaluation,
  revealing,
  shaking,
  isCurrent,
  wordLength = 5,
  // Inline hints injected only for the current input row:
  hints = [],          // array<string|null> length wordLength
  pickMode = false,    // true → empty/non-correct slots become clickable
  correctPositions = new Set(),
  onPick               // (idx) => void
}) {
  const letters = guess.padEnd(wordLength, ' ').split('').map((c) => (c === ' ' ? '' : c));
  return (
    <div className={`row${shaking ? ' row--shake' : ''}`}>
      {letters.map((ch, i) => {
        const hintLetter = isCurrent ? hints[i] : null;
        const slotKnown = correctPositions.has(i) || Boolean(hintLetter) || Boolean(ch);
        const pickable = isCurrent && pickMode && !slotKnown;
        return (
          <Cell
            key={i}
            letter={ch ? ch.toUpperCase() : ''}
            status={evaluation ? evaluation[i] : null}
            revealing={revealing}
            revealDelayMs={i * ANIM.FLIP_STAGGER_MS}
            popOnInput={isCurrent && Boolean(ch)}
            hintLetter={hintLetter}
            pickable={pickable}
            onPick={() => onPick && onPick(i)}
          />
        );
      })}
    </div>
  );
}
