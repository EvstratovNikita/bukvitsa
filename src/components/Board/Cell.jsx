import { ANIM, LETTER_STATUS } from '../../constants/game.js';

export function Cell({
  letter,
  status,
  revealing,
  revealDelayMs,
  popOnInput,
  // Hint-related extras (only used on cells of the current input row):
  hintLetter,    // letter to ghost-show as a paid hint
  pickable,      // true when in pick-mode AND this slot can be revealed
  onPick         // click handler for pick-mode selection
}) {
  const showHint = !letter && Boolean(hintLetter);
  const dataStatus = status || (letter || showHint ? LETTER_STATUS.TBD : LETTER_STATUS.EMPTY);
  const displayLetter = letter || (showHint ? hintLetter : '');
  const style = revealing
    ? { animationDelay: `${revealDelayMs}ms`, animationDuration: `${ANIM.FLIP_MS}ms` }
    : undefined;
  const classes = [
    'cell',
    `cell--${dataStatus}`,
    revealing && 'cell--flipping',
    popOnInput && 'cell--pop',
    pickable && 'cell--pick'
  ].filter(Boolean).join(' ');

  // Pickable cells become buttons; everything else is a plain div.
  if (pickable) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onPick}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Раскрыть букву"
      >
        <span className="cell__face cell__face--front">?</span>
        <span className="cell__face cell__face--back">?</span>
      </button>
    );
  }

  return (
    <div className={classes} style={style} data-status={dataStatus}>
      <span className="cell__face cell__face--front">
        {displayLetter ? displayLetter.toUpperCase() : ''}
      </span>
      <span className="cell__face cell__face--back">
        {displayLetter ? displayLetter.toUpperCase() : ''}
      </span>
    </div>
  );
}
