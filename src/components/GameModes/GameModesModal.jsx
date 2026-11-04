import { Modal } from '../Modal/Modal.jsx';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon } from '../icons/Icon.jsx';
import { HwBadge, PumpkinIcon } from '../Halloween/HwIcons.jsx';
import { tr } from '../../lib/lang.js';

const MODES = [
  {
    length: 4,
    title: tr('4 буквы'),
    sample: tr('ВАЗА'),
    accent: 'mode--four'
  },
  {
    length: 6,
    title: tr('6 букв'),
    sample: tr('РАКЕТА'),
    accent: 'mode--six'
  }
];

// "Режимы игры" picker. Tap on a mode → useGame.setGameLength(N) which
// starts a fresh round at that length — no energy cost, no coin reward.
// Each 5 plays in 4/6 modes refunds +1 energy to the canonical 5-letter
// mode (capped at 3 per day).
// onPicked — выбор сделан (а не окно просто закрыли): главное меню VK по нему
// уходит, и игрок сразу попадает на поле с новой партией.
// onPlayHalloween — есть только пока идёт ивент «Ночь тыкв»: карточка
// «Загадки ночи» первой, в ивентовом оформлении.
export function GameModesModal({ open, onClose, onPicked, onPlayHalloween }) {
  const { setGameLength, wordLength, gameMode, exitHalloween } = useGameContext();
  const inHw = gameMode === 'halloween';

  const onPick = (length) => {
    setGameLength(length);
    onClose();
    onPicked?.();
  };

  return (
    <Modal open={open} onClose={onClose} title={tr('Режимы игры')}>
      <div className="modes">
        <p className="modes__hint">{tr('Без траты энергии, только опыт питомцу. Каждые 5 побед — +1 энергия (до 3 в день).')}</p>

        {inHw ? (
          <button
            type="button"
            className="btn modes__back"
            onClick={() => { exitHalloween(); onClose(); onPicked?.(); }}
            onMouseDown={(e) => e.preventDefault()}
          >{tr('← Вернуться к обычной игре')}</button>
        ) : wordLength !== 5 && (
          <button
            type="button"
            className="btn modes__back"
            onClick={() => onPick(5)}
            onMouseDown={(e) => e.preventDefault()}
          >{tr('← Вернуться на 5 букв')}</button>
        )}

        {onPlayHalloween && (inHw ? (
          <div className="mode-now hw-frame hw-mode-now">
            <span className="mode-now__title"><PumpkinIcon />{tr(' Загадки ночи')}</span>
            <span className="mode-now__badge">{tr('Сейчас играешь')}</span>
          </div>
        ) : (
          <button
            type="button"
            className="hw-mode-card hw-frame"
            onClick={onPlayHalloween}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="hw-mode-card__top">
              <span className="hw-mode-card__title">{tr('Загадки ночи')}</span>
              <HwBadge />
            </span>
            <span className="hw-mode-card__desc">{tr('Жуткие слова по загадкам. Тыквы за победы — наряды для Букли.')}</span>
            <span className="hw-mode-card__foot">
              <span className="hw-mode-card__sample" aria-hidden="true">
                {[...tr('ТЫКВА')].map((ch, i) => <span key={i} className="hw-mode-card__cell">{ch}</span>)}
              </span>
              <span className="mode-card__free"><BoltIcon /><span>{tr('бесплатно')}</span></span>
            </span>
          </button>
        ))}

        {MODES.map((m) => {
          const active = !inHw && wordLength === m.length;
          // Режим, в котором игрок уже находится, показываем строкой, а не
          // карточкой: полноразмерная карточка с описанием и превью
          // выталкивала модалку в скролл на 4 и 6 буквах.
          if (active) {
            return (
              <div key={m.length} className={`mode-now ${m.accent}`}>
                <span className="mode-now__title">{m.title}</span>
                <span className="mode-now__badge">{tr('Сейчас играешь')}</span>
              </div>
            );
          }
          return (
            <button
              key={m.length}
              type="button"
              className={`mode-card ${m.accent}`}
              onClick={() => onPick(m.length)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="mode-card__title">{m.title}</div>
              <div className="mode-card__preview" aria-hidden="true">
                {[...m.sample].map((ch, i) => (
                  <span key={i} className="mode-card__cell">{ch}</span>
                ))}
              </div>
              <span className="mode-card__half mode-card__free" aria-label={tr('бесплатно')}>
                <BoltIcon />
                <span>{tr('бесплатно')}</span>
              </span>
            </button>
          );
        })}

        {!inHw && wordLength === 5 && (
          <p className="modes__foot">{tr('Сейчас: ')}<b>{tr('основной режим, 5 букв')}</b>.
          </p>
        )}
      </div>
    </Modal>
  );
}
