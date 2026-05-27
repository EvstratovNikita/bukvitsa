import { Modal } from '../Modal/Modal.jsx';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon } from '../icons/Icon.jsx';

const MODES = [
  {
    length: 4,
    title: '4 буквы',
    desc: 'Короткие слова — быстрее партии, меньше комбинаций.',
    sample: 'ВАЗА',
    accent: 'mode--four'
  },
  {
    length: 6,
    title: '6 букв',
    desc: 'Длинные слова — больше места для логики и подсказок.',
    sample: 'РАКЕТА',
    accent: 'mode--six'
  }
];

// "Доп. режимы" picker. Tap on a mode → useGame.setGameLength(N) which
// starts a fresh round at that length — no energy cost, no coin reward.
// Each 5 plays in 4/6 modes refunds +1 energy to the canonical 5-letter
// mode (capped at 3 per day).
export function GameModesModal({ open, onClose }) {
  const { setGameLength, wordLength } = useGameContext();

  const onPick = (length) => {
    setGameLength(length);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Доп. режимы">
      <div className="modes">
        <p className="modes__hint">
          Тренировочные режимы. Энергия не тратится, монеты не начисляются —
          только опыт. Каждые 5 партий возвращают +1 энергию в основной режим
          (до 3 в день).
        </p>
        {MODES.map((m) => {
          const active = wordLength === m.length;
          return (
            <button
              key={m.length}
              type="button"
              className={`mode-card ${m.accent}${active ? ' mode-card--active' : ''}`}
              onClick={() => onPick(m.length)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={active}
            >
              <div className="mode-card__preview" aria-hidden="true">
                {[...m.sample].map((ch, i) => (
                  <span key={i} className="mode-card__cell">{ch}</span>
                ))}
              </div>
              <div className="mode-card__body">
                <div className="mode-card__title">
                  {m.title}
                  <span className="mode-card__half mode-card__free">
                    <BoltIcon />
                    <span>бесплатно</span>
                  </span>
                </div>
                <div className="mode-card__desc">{m.desc}</div>
                {active && <div className="mode-card__active">Сейчас играешь</div>}
              </div>
            </button>
          );
        })}

        {wordLength !== 5 && (
          <button
            type="button"
            className="btn modes__back"
            onClick={() => onPick(5)}
            onMouseDown={(e) => e.preventDefault()}
          >
            ← Вернуться на 5 букв (основной)
          </button>
        )}

        <p className="modes__foot">
          Сейчас: <b>{wordLength} букв</b>.
        </p>
      </div>
    </Modal>
  );
}
