import { useEffect, useMemo, useState } from 'react';
import { HUNGER_MAX, energySpeedFromHunger, petComputeLevel } from '../../constants/game.js';
import { PET_DECORATIONS, decorationBonusFor } from '../../data/petDecorations.js';
import { PET_TREATS } from '../../data/petTreats.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CloseIcon, CoinIcon } from '../icons/Icon.jsx';
import { PetScene } from './PetScene.jsx';

const HATCH_DURATION_MS = 3200;

const TABS = [
  { id: 'feed',  icon: '🍖', label: 'Покормить' },
  { id: 'cheer', icon: '🎁', label: 'Порадовать' },
  { id: 'train', icon: '✨', label: 'Обучить'    }
];

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

export function PetScreen({ open, onClose }) {
  const {
    stats,
    hatchPet, renamePet,
    feedPet, petHunger,
    buyDecoration, equipDecoration,
    showToast
  } = useGameContext();
  const pet = stats.pet || {};

  const [mode, setMode] = useState(pet.hatched ? 'owl' : 'egg');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(pet.name || 'Букля');
  const [tab, setTab] = useState('feed');

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
  const decoBonus = decorationBonusFor(pet.activeDecoration);
  const owned = pet.ownedDecorations || [];

  const onFeed = (treat) => {
    const r = feedPet(treat.id);
    if (r === 'ok') showToast?.(`+${treat.hungerGain} сытости`);
    else if (r === 'not_enough_coins') showToast?.('Недостаточно монет');
    else if (r === 'full') showToast?.('Букля уже сыта');
  };

  const onBuyDeco = (d) => {
    const r = buyDecoration(d.id);
    if (r === 'ok') showToast?.(`${d.name} — куплено и надето`);
    else if (r === 'not_enough_coins') showToast?.('Недостаточно монет');
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
        <div className="pet-screen__scene">
          <PetScene mode={mode} />
        </div>

        {mode !== 'owl' ? (
          <div className="pet-screen__caption">
            {mode === 'hatching' ? 'Скорлупа трескается!' : 'В дупле что-то шевелится…'}
          </div>
        ) : (
          <>
            <section className="pet-summary">
              <div className="pet-summary__row">
                {!editingName ? (
                  <>
                    <div className="pet-summary__name">{pet.name}</div>
                    <button
                      type="button"
                      className="pet-summary__edit"
                      onClick={() => { setDraftName(pet.name); setEditingName(true); }}
                    >✎</button>
                  </>
                ) : (
                  <>
                    <input
                      className="pet-summary__name-input"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={20}
                      autoFocus
                    />
                    <button type="button" className="pet-summary__edit" onClick={saveName}>OK</button>
                  </>
                )}
                <div className="pet-summary__badge">Ур. {lvl.level}</div>
              </div>

              <div className="pet-summary__bars">
                <div className="pet-bar">
                  <div className="pet-bar__row">
                    <span className="pet-bar__label">XP</span>
                    <span className="pet-bar__value">{lvl.xpInLevel} / {lvl.xpForNext}</span>
                  </div>
                  <div className="pet-bar__track">
                    <div className="pet-bar__fill pet-bar__fill--xp" style={{ width: `${lvlPct}%` }} />
                  </div>
                </div>

                <div className="pet-bar">
                  <div className="pet-bar__row">
                    <span className="pet-bar__label">Сытость</span>
                    <span className="pet-bar__value">
                      {hunger} / {HUNGER_MAX}
                      {' '}<span className="pet-bar__chip">×{speedMul.toFixed(1)} энергия</span>
                    </span>
                  </div>
                  <div className="pet-bar__track">
                    <div className="pet-bar__fill pet-bar__fill--hunger" style={{ width: `${hungerPct}%` }} />
                  </div>
                </div>

                {decoBonus > 0 && (
                  <div className="pet-deco-active">
                    На Букле: <b>+{decoBonus}%</b> к награде за победы
                  </div>
                )}
                <div className="pet-summary__meta">
                  {age === 0 ? 'Вылупилась сегодня' : `Вылупилась ${age} ${pluralDays(age)} назад`}
                </div>
              </div>
            </section>

            <div className="pet-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  className={`pet-tab${tab === t.id ? ' pet-tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="pet-tab__icon" aria-hidden="true">{t.icon}</span>
                  <span className="pet-tab__label">{t.label}</span>
                </button>
              ))}
            </div>

            <section className="pet-tabpanel">
              {tab === 'feed'  && <FeedPanel  hunger={hunger} treats={PET_TREATS} coins={stats.coins || 0} onFeed={onFeed} />}
              {tab === 'cheer' && (
                <CheerPanel
                  decorations={PET_DECORATIONS}
                  owned={owned}
                  active={pet.activeDecoration}
                  coins={stats.coins || 0}
                  onBuy={onBuyDeco}
                  onEquip={(id) => equipDecoration(id)}
                  onUnequip={() => equipDecoration(null)}
                />
              )}
              {tab === 'train' && <TrainPanel />}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FeedPanel({ hunger, treats, coins, onFeed }) {
  const full = hunger >= HUNGER_MAX - 0.5;
  return (
    <div className="pet-treats">
      <p className="pet-tab__hint">
        Чем сытнее Букля, тем быстрее восстанавливается твоя энергия.
        Сытость со временем расходуется.
      </p>
      {treats.map((t) => {
        const cantAfford = coins < t.price;
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
  );
}

function CheerPanel({ decorations, owned, active, coins, onBuy, onEquip, onUnequip }) {
  return (
    <div className="pet-decos">
      <p className="pet-tab__hint">
        Украшения для Букли — каждое даёт постоянный бонус к награде за победы.
        Носит одно за раз.
      </p>
      {decorations.map((d) => {
        const isOwned = owned.includes(d.id);
        const isActive = active === d.id;
        const cantAfford = coins < d.price;
        return (
          <div key={d.id} className={`pet-deco${isActive ? ' pet-deco--active' : ''}`}>
            <span className="pet-deco__icon" aria-hidden="true">{d.icon}</span>
            <span className="pet-deco__meta">
              <span className="pet-deco__name">{d.name}</span>
              <span className="pet-deco__desc">{d.desc}</span>
              <span className="pet-deco__bonus">+{d.bonusPct}% к награде</span>
            </span>
            <div className="pet-deco__cta">
              {isActive ? (
                <button
                  type="button"
                  className="btn btn--ghost pet-deco__btn"
                  onClick={onUnequip}
                  onMouseDown={(e) => e.preventDefault()}
                >Снять</button>
              ) : isOwned ? (
                <button
                  type="button"
                  className="btn btn--primary pet-deco__btn"
                  onClick={() => onEquip(d.id)}
                  onMouseDown={(e) => e.preventDefault()}
                >Надеть</button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary pet-deco__btn pet-deco__btn--price"
                  onClick={() => onBuy(d)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={cantAfford}
                >
                  <CoinIcon />
                  <span>{d.price}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrainPanel() {
  return (
    <div className="pet-train">
      <div className="pet-train__icon" aria-hidden="true">📖</div>
      <h3 className="pet-train__title">Обучение скоро откроется</h3>
      <p className="pet-train__desc">
        Здесь Букля будет учиться помогать тебе с подсказками, открывать
        пассивные навыки и приобретать новые умения. Загляни позже!
      </p>
    </div>
  );
}
