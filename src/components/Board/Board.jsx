import { MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Row } from './Row.jsx';

export function Board() {
  const { guesses, evaluations, current, shakeRow, isClearing } = useGameContext();
  const currentIdx = guesses.length;

  return (
    <div className={`board${isClearing ? ' board--clearing' : ''}`}>
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
          />
        );
      })}
    </div>
  );
}
