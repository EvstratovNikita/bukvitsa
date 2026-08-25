import { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { MemoryGame } from './MemoryGame.jsx';
import { AnagramGame } from './AnagramGame.jsx';

// Catalog of available mini-games. Extend this list when new games ship —
// each entry needs an id, label, short description, icon, and a Component
// that renders the playable surface.
const MINI_GAMES = [
  {
    id: 'memory',
    icon: '🧠',
    name: 'Память',
    desc: 'Открой пары одинаковых карточек на поле 4×4.',
    Component: MemoryGame
  },
  {
    id: 'anagram',
    icon: '🔤',
    name: 'Анаграмма',
    desc: 'Собери слово из перемешанных букв. У тебя 60 секунд.',
    Component: AnagramGame
  }
  // Future: simon, fast-letter, …
];

// Same-local-day check — used to gate "once per day" play.
function isSameLocalDay(iso) {
  if (!iso) return false;
  const last = new Date(iso);
  const today = new Date();
  return last.getFullYear() === today.getFullYear()
      && last.getMonth() === today.getMonth()
      && last.getDate() === today.getDate();
}

function nextMidnightMs(now = new Date()) {
  const t = new Date(now);
  t.setHours(24, 0, 0, 0);
  return t.getTime();
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrainPanel() {
  const { stats } = useGameContext();
  const [activeId, setActiveId] = useState(null);
  const [, setTick] = useState(0);
  const hostRef = useRef(null);
  const firstRender = useRef(true);

  const lastTrainAt = stats.pet?.lastTrainAt || {};
  const anyOnCooldown = MINI_GAMES.some((g) => isSameLocalDay(lastTrainAt[g.id]));

  // Открыв игру (или вернувшись к списку), подводим её под глаза: панель
  // живёт в самом низу прокручиваемого тела экрана, и без этого игра
  // открывается за нижней кромкой. Пропускаем первый рендер — иначе
  // экран прыгал бы при простом заходе на вкладку.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const raf = requestAnimationFrame(() => {
      const el = hostRef.current;
      const scroller = el && el.closest('.pet-screen__body');
      if (!el) return;
      if (!scroller) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const pad = 12;
      const r = el.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      // Помещается целиком — центрируем; выше кадра — прижимаем верх,
      // иначе центрирование увело бы начало игры за верхнюю кромку.
      const fits = r.height <= s.height - pad * 2;
      const delta = fits
        ? (r.top - s.top) - (s.height - r.height) / 2
        : (r.top - s.top) - pad;
      scroller.scrollBy({ top: delta, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  // Tick once a second so the "Сыграть ещё через" countdown reads live.
  // Only runs when at least one card is on cooldown.
  useEffect(() => {
    if (!anyOnCooldown) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [anyOnCooldown]);

  if (activeId) {
    const game = MINI_GAMES.find((g) => g.id === activeId);
    return (
      <div className="mini-host" ref={hostRef}>
        <button
          type="button"
          className="btn btn--ghost mini-host__back"
          onClick={() => setActiveId(null)}
          onMouseDown={(e) => e.preventDefault()}
        >
          ← К списку
        </button>
        <game.Component onExit={() => setActiveId(null)} />
      </div>
    );
  }

  const nextMs = nextMidnightMs();

  return (
    <div className="mini-list" ref={hostRef}>
      <p className="pet-tab__hint">
        Мини-игры тренируют Буклю и приносят опыт и монеты. В каждую можно
        играть один раз в сутки.
      </p>
      {MINI_GAMES.map((g) => {
        const lastIso = lastTrainAt[g.id];
        const onCd = isSameLocalDay(lastIso);
        const cdMs = onCd ? nextMs - Date.now() : 0;
        return (
          <div key={g.id} className={`mini-card${onCd ? ' mini-card--done' : ''}`}>
            <div className="mini-card__icon" aria-hidden="true">{g.icon}</div>
            <div className="mini-card__meta">
              <div className="mini-card__name">{g.name}</div>
              <div className="mini-card__desc">{g.desc}</div>
              {onCd && (
                <div className="mini-card__cd">
                  Сыграть ещё через: <b>{formatCountdown(cdMs)}</b>
                </div>
              )}
            </div>
            <button
              type="button"
              className={`btn ${onCd ? 'btn--ghost' : 'btn--primary'} mini-card__btn`}
              onClick={() => !onCd && setActiveId(g.id)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={onCd}
            >
              {onCd ? 'Готово' : 'Играть'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
