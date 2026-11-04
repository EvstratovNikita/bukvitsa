import { useState } from 'react';
import { HINT_COST } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon, HintIcon } from '../icons/Icon.jsx';
import { tr } from '../../lib/lang.js';

export function HintButton() {
  const { hintPickMode, startHintPick, cancelHintPick, revealRandomHint, stats, hints, status, gameMode } =
    useGameContext();
  const [open, setOpen] = useState(false);

  const allOpened = hints.every(Boolean);
  const isDaily = gameMode === 'daily';
  const disabled = status !== 'playing' || allOpened || isDaily;

  const onRandom = () => {
    setOpen(false);
    revealRandomHint();
  };
  const onPick = () => {
    setOpen(false);
    startHintPick();
  };

  return (
    <>
      <button
        type="button"
        className={`hint-btn${hintPickMode ? ' hint-btn--active' : ''}`}
        data-tour="hint"
        onClick={() => (hintPickMode ? cancelHintPick() : setOpen(true))}
        disabled={disabled}
        aria-label={isDaily ? tr('Подсказки недоступны в Слове дня') : tr('Подсказка')}
        title={isDaily ? tr('В Слове дня подсказки отключены — у всех равные условия') : tr('Подсказка')}
      >
        <HintIcon />
        <span>{hintPickMode ? tr('Отмена') : tr('Подсказка')}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={tr('Подсказки')}>
        <div className="hint-menu">
          <p className="hint-menu__intro">{tr('Открой одну букву загаданного слова. Чем выше цена — тем больше контроля.')}</p>

          <button
            type="button"
            className="hint-option"
            onClick={onRandom}
            disabled={(stats.coins || 0) < HINT_COST.RANDOM || allOpened}
          >
            <div className="hint-option__icon hint-option__icon--soft">
              <HintIcon />
            </div>
            <div className="hint-option__body">
              <div className="hint-option__title">{tr('Случайная буква')}</div>
              <div className="hint-option__sub">{tr('Откроется любая ещё не открытая позиция')}</div>
            </div>
            <div className="hint-option__price">
              <CoinIcon />
              <span>{HINT_COST.RANDOM}</span>
            </div>
          </button>

          <button
            type="button"
            className="hint-option"
            onClick={onPick}
            disabled={(stats.coins || 0) < HINT_COST.PICK || allOpened}
          >
            <div className="hint-option__icon hint-option__icon--solid">
              <HintIcon />
            </div>
            <div className="hint-option__body">
              <div className="hint-option__title">{tr('Выбрать позицию')}</div>
              <div className="hint-option__sub">{tr('Сам укажешь, какую букву раскрыть')}</div>
            </div>
            <div className="hint-option__price">
              <CoinIcon />
              <span>{HINT_COST.PICK}</span>
            </div>
          </button>

          <p className="hint-menu__balance">{tr('Твой баланс: ')}<CoinIcon /> <b>{stats.coins || 0}</b>
          </p>
        </div>
      </Modal>
    </>
  );
}

export function HintsStrip() {
  const { hints, hintPickMode, revealPositionHint, wordLength } = useGameContext();
  const any = hints.some(Boolean) || hintPickMode;
  if (!any) return null;

  return (
    <div className={`hints-strip${hintPickMode ? ' hints-strip--picking' : ''}`}>
      {Array.from({ length: wordLength }).map((_, i) => {
        const ch = hints[i];
        const isFilled = Boolean(ch);
        const isPickable = hintPickMode && !isFilled;
        return (
          <button
            key={i}
            type="button"
            className={[
              'hints-strip__cell',
              isFilled && 'hints-strip__cell--filled',
              isPickable && 'hints-strip__cell--pick'
            ].filter(Boolean).join(' ')}
            disabled={!isPickable}
            onClick={() => isPickable && revealPositionHint(i)}
            aria-label={isFilled ? tr('Открыта буква {ch}', { ch }) : tr('Позиция {v0}', { v0: i + 1 })}
          >
            {isFilled ? ch.toUpperCase() : isPickable ? '?' : ''}
          </button>
        );
      })}
    </div>
  );
}
