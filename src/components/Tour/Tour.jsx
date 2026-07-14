import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// First-run coachmarks: dim the screen, spotlight one UI element at a time and
// describe it in a couple of words. Shown once per device (localStorage flag).
// Targets are matched by [data-tour="..."] attributes on the live elements, so
// steps whose target isn't on screen are skipped automatically.

export const TOUR_DONE_KEY = 'wordle-ru:tour-done';

const STEPS = [
  {
    sel: '[data-tour="board"]',
    title: 'Игровое поле',
    text: 'Угадай слово из 5 букв за 6 попыток. После каждой попытки клетки подсветятся: зелёная — буква на своём месте, жёлтая — есть, но не там, серая — нет в слове.',
    pad: 4
  },
  {
    sel: '[data-tour="theme"]',
    title: 'Тема оформления',
    text: 'Быстрое переключение между тёмной и светлой темой. Солнце — включить светлую, месяц — тёмную.'
  },
  {
    sel: '[data-tour="daily"]',
    title: 'Слово дня',
    text: 'Каждый день — одно особое слово для всех игроков. Не тратит энергию.'
  },
  {
    sel: '[data-tour="coins"]',
    title: 'Монеты',
    text: 'Зарабатывай за победы. Трать в магазине на фоны и стили клеток — или на подсказки.'
  },
  {
    sel: '[data-tour="hint"]',
    title: 'Подсказка',
    text: 'В обычной игре можно открыть букву за монеты, если слово никак не угадывается.'
  },
  {
    sel: '[data-tour="modes"]',
    title: 'Режимы 4 и 6 букв',
    text: 'Дополнительные режимы — играй без траты энергии и прокачивай питомца Буклю.'
  },
  {
    sel: '[data-tour="menu"]',
    title: 'Меню',
    text: 'Магазин, достижения, статистика, настройки и обратная связь — всё здесь.'
  }
];

export function Tour({ onDone }) {
  const [steps] = useState(() => STEPS.filter((s) => document.querySelector(s.sel)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const popRef = useRef(null);
  const [popH, setPopH] = useState(0);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step) return;
    const el = document.querySelector(step.sel);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [steps, i]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useLayoutEffect(() => { if (popRef.current) setPopH(popRef.current.offsetHeight); }, [i, rect]);

  useEffect(() => {
    const on = () => measure();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('scroll', on, true);
    };
  }, [measure]);

  const finish = useCallback(() => {
    try { localStorage.setItem(TOUR_DONE_KEY, '1'); } catch { /* noop */ }
    onDone();
  }, [onDone]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  if (!steps.length) return null;

  const step = steps[i];
  const last = i === steps.length - 1;
  const next = () => (last ? finish() : setI((n) => n + 1));

  const pad = step.pad ?? 8;
  const spot = rect && {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  };

  // Place the bubble below the spot if it fits, else above it; if the target is
  // too tall to flank either way (e.g. the board), pin it near the top so the
  // whole bubble — and its button — stays on screen. Clamp horizontally.
  let popStyle = { top: 70, left: '50%', transform: 'translateX(-50%)' };
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = 300;
    const center = rect.left + rect.width / 2;
    const left = Math.max(12, Math.min(center - W / 2, vw - W - 12));
    const belowTop = rect.top + rect.height + pad + 14;
    const aboveTop = rect.top - pad - 14 - popH;
    let top;
    if (belowTop + popH + 12 <= vh) top = belowTop;
    else if (aboveTop >= 12) top = aboveTop;
    else top = 70;
    popStyle = { top, left };
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Обучение">
      {spot && (
        <div
          className="tour__spot"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      )}
      <div className="tour__pop" ref={popRef} style={popStyle}>
        <div className="tour__step">{i + 1} / {steps.length}</div>
        <div className="tour__title">{step.title}</div>
        <div className="tour__text">{step.text}</div>
        <div className="tour__actions">
          <button
            type="button"
            className="tour__skip"
            onClick={finish}
            onMouseDown={(e) => e.preventDefault()}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="tour__next"
            onClick={next}
            onMouseDown={(e) => e.preventDefault()}
          >
            {last ? 'Понятно' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
