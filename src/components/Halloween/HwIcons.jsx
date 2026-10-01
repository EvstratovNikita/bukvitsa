import { HALLOWEEN } from '../../lib/events.js';
import { getDecoration } from '../../data/petDecorations.js';
import { getItem } from '../../data/shopItems.js';
import { coinsLabel } from '../../utils/plural.js';

// Общие мелочи оформления ивента «Ночь тыкв»: значок тыквы, плашка
// «Хэллоуин», описание ступени тропы.

// Тыква-фонарь. Своя, а не эмодзи: эмодзи на разных телефонах рисуются
// по-разному, а значок должен совпадать с тыквами на фоне и в наряде.
export function PumpkinIcon({ className = '' }) {
  return (
    <svg className={`hw-pumpkin-ic ${className}`.trim()} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="10.5" cy="18" rx="7.5" ry="9.5" fill="#e8741c" />
      <ellipse cx="21.5" cy="18" rx="7.5" ry="9.5" fill="#e8741c" />
      <ellipse cx="16" cy="17.5" rx="7" ry="10.5" fill="#ff9330" />
      <path d="M13 9 Q12 17 13 27 M19 9 Q20 17 19 27" stroke="#b8520f" strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M15.6 8.2 Q15.8 4.6 18.6 3.2" stroke="#4f7a2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g fill="#ffe08a">
        <path d="M10.8 15.6 L14 15.6 L12.4 12.6 Z" />
        <path d="M18 15.6 L21.2 15.6 L19.6 12.6 Z" />
        <path d="M10.6 19.4 L12.6 21.2 L14.4 19.8 L16 21.6 L17.6 19.8 L19.4 21.2 L21.4 19.4 Q16 26 10.6 19.4 Z" />
      </g>
    </svg>
  );
}

// Плашка «🎃 Хэллоуин · до 3.11» — ей помечен весь ивентовый контент.
export function HwBadge({ till = true, className = '' }) {
  return (
    <span className={`hw-badge ${className}`.trim()}>
      <PumpkinIcon />
      <span>Хэллоуин</span>
      {till && <span className="hw-badge__till">до {HALLOWEEN.endLabel}</span>}
    </span>
  );
}

// Что лежит на ступени тропы: значок и название для списков и панелей.
export function stepInfo(step) {
  if (step.kind === 'coins') return { icon: '🪙', name: coinsLabel(step.amount), kind: 'coins' };
  if (step.kind === 'cells') {
    const it = getItem(step.ref);
    return { icon: '✨', name: it ? `Стиль клеток «${it.name}»` : 'Стиль клеток', kind: 'cells' };
  }
  const d = getDecoration(step.ref);
  return { icon: d?.icon || '🎁', name: d?.name || 'Наряд', kind: 'deco' };
}
