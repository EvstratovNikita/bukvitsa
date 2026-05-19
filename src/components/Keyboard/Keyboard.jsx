import { KEYBOARD_ROWS, LETTER_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BackspaceIcon, EnterIcon } from '../icons/Icon.jsx';

function Key({ value, status, onClick, wide }) {
  const isEnter = value === 'ENTER';
  const isBack = value === 'BACK';
  const label = isEnter ? 'Ввод' : isBack ? 'Удалить' : value;
  const classes = [
    'key',
    wide && 'key--wide',
    isEnter && 'key--enter',
    isBack && 'key--back',
    status && `key--${status}`
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classes}
      onClick={() => onClick(value)}
      aria-label={label}
      title={label}
    >
      {isEnter ? 'Ввод' : isBack ? <BackspaceIcon /> : value}
    </button>
  );
}

export function Keyboard() {
  const { addLetter, removeLetter, submit, keyboardStatuses } = useGameContext();

  const handle = (val) => {
    if (val === 'ENTER') return submit();
    if (val === 'BACK') return removeLetter();
    addLetter(val);
  };

  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, i) => (
        <div className="keyboard__row" key={i}>
          {row.map((k) => {
            const isAction = k === 'ENTER' || k === 'BACK';
            const status = !isAction
              ? keyboardStatuses[k.toLowerCase()] || null
              : null;
            return (
              <Key
                key={k}
                value={k}
                wide={isAction}
                status={status && status !== LETTER_STATUS.TBD ? status : null}
                onClick={handle}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
