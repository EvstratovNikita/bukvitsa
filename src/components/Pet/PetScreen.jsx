import { useEffect, useMemo, useState } from 'react';
import { HUNGER_MAX, energySpeedFromHunger, petComputeLevel } from '../../constants/game.js';
import { PET_TREATS } from '../../data/petTreats.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CloseIcon, CoinIcon } from '../icons/Icon.jsx';
import { PetScene } from './PetScene.jsx';

const HATCH_DURATION_MS = 3200;

function ageInDays(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function pluralDays(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
  return 'дней';
}

// Full-screen pet view (not a Modal). Slides in from the right so it reads
// as navigation rather than a dialog. Lock body scroll while open so the
// game underneath doesn't compete for touch.
export function PetScreen({ open, onClose }) {
  const { stats, hatchPet, renamePet, feedPet, petHunger, showToast } = useGameContext();
  const pet = stats.pet || {};

  const [mode, setMode] = useState(pet.hatched ? 'owl' : 'egg');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(pet.name || 'Букля');

  // Lock body scroll + hatching animation on first open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (pet.hatched) { setMode('owl'); return; }
    setMode('egg');
    const start  = setTimeout(() => setMode('hatching'), 120);
    const finish = setTimeout(() => { hatchPet(); setMode('owl'); }, HATCH_DURATION_MS);
    return () => { clearTimeout(start); clearTimeout(finish); };
  }, [open, pet.hatched, hatchPet]);

  const age = useMemo(() => ageInDays(pet.bornAt), [pet.bornAt]);
  const lvl = useMemo(() => petComputeLevel(pet.xp || 0), [pet.xp]);
  const lvlPct = Math.min(100, Math.round((lvl.xpInLevel / lvl.xpForNext) * 100));
  const hunger = Math.round(petHunger ?? pet.hunger ?? 0);
  const hungerPct = Math.round((hunger / HUNGER_MAX) * 100);
  const speedMul = energySpeedFromHunger(hunger);

  const onFeed = (treat) => {
    const r = feedPet(treat.id);
    if (r === 'ok') showToast?.(`${pet.name || 'Букля'} наелась! +${treat.hungerGain} сытости`);
    else if (r === 'not_enough_coins') showToast?.('Недостаточно монет');
    else if (r === 'full') showToast?.(`${pet.name || 'Букля'} уже сыта`);
    else if (r === 'not_hatched') showToast?.('Сначала Букля должна вылупиться');
  };

  const saveName = () => { renamePet(draftName); setEditingName(false); };

  if (!open) return null;

  return (
    <div className="pet-screen" role="dialog" aria-modal="true">
      <header className="pet-screen__head">
        <button
          type="button"
          className="iconbtn"
          onClick={onClose}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Назад"
          title="Назад"
        >
          <CloseIcon />
        </button>
        <h2 className="pet-screen__title">{pet.name || 'Букля'}</h2>
        <div className="pet-screen__balance" title="Монеты">
          <CoinIcon />
          <span>{stats.coins || 0}</span>
        </div>
      </header>

      <div className="pet-screen__body">
        <PetScene mode={mode} />

        {mode !== 'owl' ? (
          <div className="pet-screen__caption">
            {mode === 'hatching' ? 'Скорлупа трескается!' : 'В дупле что-то шевелится…'}
          </div>
        ) : (
          <>
            <section className="pet-card">
              <div className="pet-card__row">
                {!editingName ? (
                  <>
                    <div className="pet-card__name">{pet.name}</div>
                    <button
                      type="button"
                      className="pet-card__edit"
                      onClick={() => { setDraftName(pet.name); setEditingName(true); }}
                    >Переименовать</button>
                  </>
                ) : (
                  <>
                    <input
                      className="pet-card__name-input"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={20}
                      autoFocus
                    />
                    <button type="button" className="pet-card__edit" onClick={saveName}>OK</button>
                  </>
                )}
              </div>
              <div className="pet-card__meta">
                {age === 0 ? 'Вылупилась сегодня' : `Вылупилась ${age} ${pluralDays(age)} назад`} · Совёнок
              </div>

              <div className="pet-card__level-row">
                <div className="pet-card__level-badge">Ур. {lvl.level}</div>
                <div className="pet-card__bar-stack">
                  <div className="pet-card__bar">
                    <div className="pet-card__bar-fill pet-card__bar-fill--xp" style={{ width: `${lvlPct}%` }} />
                  </div>
                  <div className="pet-card__bar-text">
                    {lvl.xpInLevel} / {lvl.xpForNext} XP до следующего уровня
                  </div>
                </div>
              </div>
            </section>

            <section className="pet-card">
              <div className="pet-card__bar-row">
                <span className="pet-card__bar-label">Сытость</span>
                <span className="pet-card__bar-value">{hunger} / {HUNGER_MAX}</span>
              </div>
              <div className="pet-card__bar pet-card__bar--lg">
                <div className="pet-card__bar-fill pet-card__bar-fill--hunger" style={{ width: `${hungerPct}%` }} />
              </div>
              <div className="pet-card__speed">
                Скорость восстановления энергии: <b>×{speedMul.toFixed(1)}</b>
                {' '}<span className="pet-card__speed-hint">(каждые 10 сытости = +10%)</span>
              </div>
            </section>

            <section className="pet-card">
              <h3 className="pet-card__heading">Лакомства</h3>
              <div className="pet-treats">
                {PET_TREATS.map((t) => {
                  const cantAfford = (stats.coins || 0) < t.price;
                  const full = hunger >= HUNGER_MAX - 0.5;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="pet-treat"
                      onClick={() => onFeed(t)}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={cantAfford || full}
                    >
                      <span className="pet-treat__icon" aria-hidden="true">{t.icon}</span>
                      <span className="pet-treat__meta">
                        <span className="pet-treat__name">{t.name}</span>
                        <span className="pet-treat__desc">{t.desc}</span>
                        <span className="pet-treat__gain">+{t.hungerGain} сытости</span>
                      </span>
                      <span className="pet-treat__price">
                        <CoinIcon />
                        <span>{t.price}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
