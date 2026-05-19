import { ANIM, LETTER_STATUS } from '../../constants/game.js';

export function Cell({ letter, status, revealing, revealDelayMs, popOnInput }) {
  const dataStatus = status || (letter ? LETTER_STATUS.TBD : LETTER_STATUS.EMPTY);
  const style = revealing
    ? { animationDelay: `${revealDelayMs}ms`, animationDuration: `${ANIM.FLIP_MS}ms` }
    : undefined;
  const classes = [
    'cell',
    `cell--${dataStatus}`,
    revealing && 'cell--flipping',
    popOnInput && 'cell--pop'
  ].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style} data-status={dataStatus}>
      <span className="cell__face cell__face--front">{letter || ''}</span>
      <span className="cell__face cell__face--back">{letter || ''}</span>
    </div>
  );
}
