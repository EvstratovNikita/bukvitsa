import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { escAllowed, hasHomeMenu } from '../../lib/platform.js';
import { storage } from '../../utils/storage.js';
import { tr } from '../../lib/lang.js';
import { uiZoom } from '../../lib/uiScale.js';

// First-run coachmarks: dim the screen, spotlight one UI element at a time and
// describe it in a couple of words. Показывается один раз на ИГРОКА: флаг
// дублируется в prefs.tourDone и уезжает в облако, иначе после входа в
// аккаунт (или на новом устройстве) обучение начиналось заново.
// Targets are matched by [data-tour="..."] attributes on the live elements, so
// steps whose target isn't on screen are skipped automatically.

export const TOUR_DONE_KEY = 'wordle-ru:tour-done';

// Только три шага: игрок из каталога решает за первые минуты, и семь окон
// подряд до первого хода его отпугивали. Тема, монеты, режимы и «Слово дня»
// видны на экране и объясняются сами (плюс раздел «Как играть»).
const STEPS = [
  {
    sel: '[data-tour="board"]',
    title: tr('Угадай слово'),
    text: tr('Слово из 5 букв, 6 попыток. После хода клетки подскажут: зелёная — буква на месте, жёлтая — есть, но в другом месте, серая — такой буквы нет.'),
    pad: 4
  },
  {
    sel: '[data-tour="hint"]',
    title: tr('Застрял?'),
    text: tr('Подсказка откроет букву за монеты. Монеты дают за победы.')
  },
  // В VK на этом месте кнопка «Домой» — главное меню со всеми разделами.
  hasHomeMenu
    ? {
        sel: '[data-tour="menu"]',
        title: tr('Главное меню'),
        text: tr('Магазин, питомец Букля, достижения и рейтинг. Вернуться сюда можно в любой момент — кнопкой с домиком.')
      }
    : {
        sel: '[data-tour="menu"]',
        title: tr('Меню'),
        text: tr('Магазин, достижения, статистика и настройки — всё здесь.')
      }
];
// steps — свой набор шагов (ликбез экрана Букли); storageKey — локальный
// флаг «пройдено» (null — не писать, флаг тогда ведёт вызывающий); onStep —
// вызывается при показе шага (например, переключить вкладку под подсказкой);
// className — для слоя поверх полноэкранных экранов.
export function Tour({ onDone, steps: stepsProp = STEPS, storageKey = TOUR_DONE_KEY, onStep, className = '' }) {
  // Шаги отбираем после монтирования, а не при первом рендере: тур может
  // появиться в одном коммите со своими целями (вкладки Букли сразу после
  // вылупления), и до коммита их ещё нет в DOM.
  const [steps, setSteps] = useState(null);
  useLayoutEffect(() => {
    setSteps(stepsProp.filter((s) => document.querySelector(s.sel)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const popRef = useRef(null);
  const [popH, setPopH] = useState(0);

  const measure = useCallback(() => {
    const step = steps?.[i];
    if (!step) return;
    const el = document.querySelector(step.sel);
    if (!el) { setRect(null); return; }
    // Цель может быть ниже края прокручиваемого экрана (вкладки Букли на
    // низком телефоне) — сначала показать её, потом мерить.
    el.scrollIntoView?.({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const z = uiZoom();
    setRect({ top: r.top / z, left: r.left / z, width: r.width / z, height: r.height / z });
  }, [steps, i]);

  useLayoutEffect(() => { if (steps?.[i]) onStep?.(steps[i]); }, [steps, i, onStep]);
  useLayoutEffect(() => { measure(); }, [measure]);
  // onStep мог поменять раскладку (другая вкладка — другая высота экрана):
  // перемерить, когда она уляжется.
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { measure(); r2 = requestAnimationFrame(measure); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [measure]);
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
    if (storageKey) storage.set(storageKey, 1);
    onDone();
  }, [onDone, storageKey]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && escAllowed) finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  if (!steps?.length) return null;

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
    const vw = window.innerWidth / uiZoom();
    const vh = window.innerHeight / uiZoom();
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
    <div className={`tour${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-label={tr('Обучение')}>
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
          >{tr('Пропустить')}</button>
          <button
            type="button"
            className="tour__next"
            onClick={next}
            onMouseDown={(e) => e.preventDefault()}
          >
            {last ? tr('Понятно') : tr('Далее')}
          </button>
        </div>
      </div>
    </div>
  );
}
