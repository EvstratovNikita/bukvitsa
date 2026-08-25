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
          В дополнительных режимах <b>энергия не тратится</b>, а начисляется
          только опыт питомцу! <b>Бонус:</b> каждые 5 побед восстанавливают
          +1 энергию в основном режиме (не более 3 единиц в день).
        </p>

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

        {MODES.map((m) => {
          const active = wordLength === m.length;
          // Режим, в котором игрок уже находится, показываем строкой, а не
          // карточкой: полноразмерная карточка с описанием и превью
          // выталкивала модалку в скролл на 4 и 6 буквах.
          if (active) {
            return (
              <div key={m.length} className={`mode-now ${m.accent}`}>
                <span className="mode-now__title">{m.title}</span>
                <span className="mode-now__badge">Сейчас играешь</span>
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
              <div className="mode-card__desc">{m.desc}</div>
              <div className="mode-card__preview" aria-hidden="true">
                {[...m.sample].map((ch, i) => (
                  <span key={i} className="mode-card__cell">{ch}</span>
                ))}
              </div>
              <span className="mode-card__half mode-card__free" aria-label="бесплатно">
                <BoltIcon />
                <span>бесплатно</span>
              </span>
            </button>
          );
        })}

        {wordLength === 5 && (
          <p className="modes__foot">
            Сейчас: <b>основной режим, 5 букв</b>.
          </p>
        )}
      </div>
    </Modal>
  );
}
