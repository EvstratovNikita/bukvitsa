import { useMemo } from 'react';
import { LETTER_STATUS, MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Row } from './Row.jsx';

export function Board() {
  const {
    guesses,
    evaluations,
    current,
    shakeRow,
    hints,
    hintPickMode,
    revealPositionHint,
    wordLength
  } = useGameContext();
  const currentIdx = guesses.length;

  // Positions where the user has already correctly placed a letter. These
  // slots are excluded from hint pick-mode (no point paying to reveal what
  // you already know) and from random hints in useGame.
  const correctPositions = useMemo(() => {
    const set = new Set();
    for (const evalRow of evaluations) {
      if (!evalRow) continue;
      for (let i = 0; i < evalRow.length; i++) {
        if (evalRow[i] === LETTER_STATUS.CORRECT) set.add(i);
      }
    }
    return set;
  }, [evaluations]);

  return (
    <div className="board" style={{ '--wl': wordLength }}>
      {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        const word = isPast ? guesses[i] : isCurrent ? current : '';
        return (
          <Row
            key={i}
            guess={word}
            evaluation={isPast ? evaluations[i] : null}
            revealing={isPast}
            shaking={isCurrent && shakeRow}
            isCurrent={isCurrent}
            wordLength={wordLength}
            hints={isCurrent ? hints : []}
            pickMode={isCurrent && hintPickMode}
            correctPositions={correctPositions}
            onPick={revealPositionHint}
          />
        );
      })}
    </div>
  );
}
