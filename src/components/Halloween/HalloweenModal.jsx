import { useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { HALLOWEEN, halloweenDaysLeft } from '../../lib/events.js';
import { HW_DAILY_CAP, HW_SHOP } from '../../data/halloween.js';
import { earnedToday } from '../../lib/halloweenProgress.js';
import { todayKey } from '../../constants/game.js';
import { plural } from '../../utils/plural.js';
import { Modal } from '../Modal/Modal.jsx';
import { HwBadge, PumpkinIcon, itemInfo, ownsHwItem } from './HwIcons.jsx';

const BUY_ERROR = {
  not_enough: 'Не хватает тыкв',
  already_owned: 'Уже куплено',
  closed: 'Ивент закончился'
};

// Окно ивента «Ночь тыкв»: обложка с отсчётом, вход в режим и Тыквенная
// лавка — наряды Букли, фоны и стиль клеток за тыквы.
export function HalloweenModal({ open, onClose, onPlay, onOpenAchievements }) {
  const { stats, gameMode, status, buyHalloweenItem, showToast } = useGameContext();
  const [flash, setFlash] = useState(null); // { id, text }
  if (!open) return null;
  const hw = stats.halloween || {};
  const pumpkins = hw.pumpkins || 0;
  const today = earnedToday(hw, todayKey());
  const days = halloweenDaysLeft();
  const inMode = gameMode === 'halloween' && status === 'playing';
  const pct = Math.min(100, Math.round((today / HW_DAILY_CAP) * 100));

  const onBuy = (id) => {
    const r = buyHalloweenItem(id);
    if (r === 'ok') showToast?.(`${itemInfo(id).name} — куплено`);
    else {
      setFlash({ id, text: BUY_ERROR[r] || 'Не получилось' });
      setTimeout(() => setFlash(null), 1400);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ночь тыкв" headerRight={<HwBadge till={false} />}>
      <div className="hw-hub">
        <div className="hw-hub__hero">
          <HeroArt />
          <div className="hw-hub__hero-text">
            <b>Загадки ночи</b>
            <span>Отгадывай жуткие слова, собирай тыквы и наряжай Буклю</span>
          </div>
          <div className="hw-hub__timer">
            ещё {days} {plural(days, 'день', 'дня', 'дней')} · до {HALLOWEEN.endLabel}
          </div>
        </div>

        <button type="button" className="hw-cta" onClick={onPlay} onMouseDown={(e) => e.preventDefault()}>
          <PumpkinIcon />
          <span className="hw-cta__label">
            <b>{inMode ? 'Продолжить' : 'Играть'}</b>
            <small>Загадки ночи · без энергии</small>
          </span>
          <span className="hw-cta__go" aria-hidden="true">›</span>
        </button>

        <section className="hw-track" aria-label="Тыквенная лавка">
          <div className="hw-track__head">
            <b>Тыквенная лавка</b>
            <span className="hw-track__count"><PumpkinIcon /> {pumpkins}</span>
          </div>
          <div className="hw-track__today">
            <span>Собрано сегодня: <b>{today}</b> из {HW_DAILY_CAP}</span>
            <span className="hw-track__bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
          </div>
          <ol className="hw-track__steps">
            {HW_SHOP.map((e) => {
              const info = itemInfo(e.id);
              const owned = ownsHwItem(stats, e.id);
              const afford = pumpkins >= e.price;
              return (
                <li key={e.id} className={`hw-step${owned ? ' hw-step--done' : ''}${e.grand ? ' hw-step--grand' : ''}`}>
                  <span className="hw-step__icon" aria-hidden="true">{info.icon}</span>
                  <span className="hw-step__body">
                    <span className="hw-step__name">{info.name}</span>
                    {e.grand && <span className="hw-step__tag">Главный предмет</span>}
                    {!owned && !afford && <span className="hw-step__left">ещё {e.price - pumpkins} 🎃</span>}
                  </span>
                  {owned ? (
                    <span className="hw-step__need">✓</span>
                  ) : flash?.id === e.id ? (
                    <span className="hw-step__flash">{flash.text}</span>
                  ) : (
                    <button
                      type="button"
                      className="hw-buy"
                      onClick={() => onBuy(e.id)}
                      onMouseDown={(ev) => ev.preventDefault()}
                      disabled={!afford}
                    >
                      {e.price} <PumpkinIcon />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="hw-hub__links hw-hub__links--one">
          <button type="button" className="hw-link" onClick={onOpenAchievements} onMouseDown={(e) => e.preventDefault()}>
            🏅 Достижения ивента
          </button>
        </div>

        <p className="hw-hub__note">
          За разгаданную загадку: с 1–2 попыток — 3 🎃, с 3–4 — 2, с 5–6 — 1,
          до {HW_DAILY_CAP} в день. Загадка над полем — подсказка за монеты.
          Купленное остаётся навсегда.
        </p>
      </div>
    </Modal>
  );
}

// Обложка: ночное небо, луна, холмы, тыквы-фонари и летучие мыши. Статичная
// картинка — анимаций в окне нет, чтобы не нагружать телефоны.
function HeroArt() {
  return (
    <svg className="hw-hub__art" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hwh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b0f33" />
          <stop offset="0.6" stopColor="#3a1a4f" />
          <stop offset="1" stopColor="#6a2a3a" />
        </linearGradient>
        <radialGradient id="hwh-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3cf" />
          <stop offset="0.7" stopColor="#ffe2a0" />
          <stop offset="1" stopColor="#f2c66e" />
        </radialGradient>
        <radialGradient id="hwh-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 214, 140, 0.55)" />
          <stop offset="1" stopColor="rgba(255, 214, 140, 0)" />
        </radialGradient>
        <radialGradient id="hwh-pk" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffc06a" />
          <stop offset="0.6" stopColor="#f07a12" />
          <stop offset="1" stopColor="#a8410a" />
        </radialGradient>
        <radialGradient id="hwh-pkglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255, 150, 40, 0.45)" />
          <stop offset="1" stopColor="rgba(255, 150, 40, 0)" />
        </radialGradient>
        <g id="hwh-pumpkin">
          <circle r="34" fill="url(#hwh-pkglow)" />
          <ellipse cx="-9" cy="2" rx="11" ry="13" fill="url(#hwh-pk)" />
          <ellipse cx="9" cy="2" rx="11" ry="13" fill="url(#hwh-pk)" />
          <ellipse cx="0" cy="1" rx="10" ry="14.5" fill="url(#hwh-pk)" />
          <path d="M-1 -13 Q0 -19 4 -21" stroke="#4f7a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g fill="#ffe08a">
            <path d="M-8 -3 L-3 -3 L-5.5 -8 Z" /><path d="M3 -3 L8 -3 L5.5 -8 Z" />
            <path d="M-8 3 L-5 6 L-2.5 4 L0 7 L2.5 4 L5 6 L8 3 Q0 12 -8 3 Z" />
          </g>
        </g>
        <path id="hwh-bat" d="M0 -2 L3 -7 L4 -2 C8 -6 15 -9 24 -6 C20 -3 20 1 21 4 C17 2 14 3 12 6 C10 3 7 3 5 6 C3 8 1 9 0 9 C-1 9 -3 8 -5 6 C-7 3 -10 3 -12 6 C-14 3 -17 2 -21 4 C-20 1 -20 -3 -24 -6 C-15 -9 -8 -6 -4 -2 L-3 -7 Z" />
      </defs>
      <rect width="360" height="150" fill="url(#hwh-sky)" />
      <g fill="#fff4d6">
        <circle cx="40" cy="22" r="1.2" /><circle cx="96" cy="40" r="0.9" /><circle cx="150" cy="16" r="1.1" />
        <circle cx="210" cy="34" r="0.8" /><circle cx="250" cy="12" r="1" /><circle cx="20" cy="70" r="0.8" />
      </g>
      <circle cx="292" cy="44" r="46" fill="url(#hwh-glow)" />
      <circle cx="292" cy="44" r="24" fill="url(#hwh-moon)" />
      <circle cx="284" cy="38" r="4" fill="#f2cf86" opacity="0.6" /><circle cx="299" cy="52" r="3" fill="#f2cf86" opacity="0.5" />
      <g fill="#120822">
        <use href="#hwh-bat" transform="translate(236 30) scale(0.75) rotate(-8)" />
        <use href="#hwh-bat" transform="translate(326 82) scale(0.55) rotate(10)" />
        <use href="#hwh-bat" transform="translate(196 58) scale(0.45) rotate(4)" />
      </g>
      <path d="M0 116 Q70 92 140 110 T280 104 T360 112 V150 H0 Z" fill="#1f0d2a" />
      <path d="M0 132 Q90 116 180 128 T360 126 V150 H0 Z" fill="#12071b" />
      <use href="#hwh-pumpkin" transform="translate(254 132) scale(0.62)" />
      <use href="#hwh-pumpkin" transform="translate(300 124) scale(1.05)" />
      <use href="#hwh-pumpkin" transform="translate(346 134) scale(0.6)" />
    </svg>
  );
}
