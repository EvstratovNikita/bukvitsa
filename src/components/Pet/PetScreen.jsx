import { useEffect, useMemo, useRef, useState } from 'react';
import { HUNGER_MAX, PET_UNLOCK_GAMES, energySpeedFromHunger, petComputeLevel } from '../../constants/game.js';
import { PET_DECORATIONS, SLOTS, SLOT_LABEL, equippedDecorationsBonus } from '../../data/petDecorations.js';
import { PET_TREATS } from '../../data/petTreats.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { pluralCoins } from '../../utils/plural.js';
import { CloseIcon, CoinIcon } from '../icons/Icon.jsx';
import { PetScene } from './PetScene.jsx';
import { TrainPanel } from './TrainPanel.jsx';

const HATCH_DURATION_MS = 3200;

const TABS = [
  { id: 'feed',  icon: '🍖', label: 'Покормить' },
  { id: 'cheer', icon: '🎁', label: 'Порадовать' },
  { id: 'train', icon: '🎓', label: 'Обучить'    }
];

function ageInDays(iso) {
  // Day of hatch counts as day 1 — pet is never "0 days old".
  if (!iso) return 1;
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) + 1);
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
    hatchPet,
    feedPet, petHunger,
    buyDecoration, equipDecoration, unequipDecorationSlot,
    showToast
  } = useGameContext();
  // Rename intentionally disabled — pet is always "Букля" for now.
  const pet = stats.pet || {};
  // Feature gate — new players need to play a handful of rounds before the
  // tamagotchi layer unlocks. Pre-unlock, the screen shows a teaser stub
  // with the games-remaining countdown and no hatching animation.
  const played = stats.played || 0;
  const unlocked = played >= PET_UNLOCK_GAMES;
  const gamesLeft = Math.max(0, PET_UNLOCK_GAMES - played);

  const [mode, setMode] = useState(pet.hatched ? 'owl' : 'egg');
  const [tab, setTab] = useState('feed');
  // Each successful feed pushes a flying emoji that animates from the
  // tapped treat button to Букля's mouth. Multiple can be in-flight.
  const [flyingTreats, setFlyingTreats] = useState([]);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (pet.hatched) { setMode('owl'); return; }
    // Pre-unlock: just sit on the egg, no hatching countdown — that fires
    // only once the player has earned the right to start the loop.
    if (!unlocked) { setMode('egg'); return; }
    setMode('egg');
    const start  = setTimeout(() => setMode('hatching'), 120);
    const finish = setTimeout(() => { hatchPet(); setMode('owl'); }, HATCH_DURATION_MS);
    return () => { clearTimeout(start); clearTimeout(finish); };
  }, [open, pet.hatched, unlocked, hatchPet]);

  const age = useMemo(() => ageInDays(pet.bornAt), [pet.bornAt]);
  const lvl = useMemo(() => petComputeLevel(pet.xp || 0), [pet.xp]);
  const lvlPct = Math.min(100, Math.round((lvl.xpInLevel / lvl.xpForNext) * 100));
  const hunger = Math.round(petHunger ?? pet.hunger ?? 0);
  const hungerPct = Math.round((hunger / HUNGER_MAX) * 100);
  const speedMul = energySpeedFromHunger(hunger);
  const decoBonus = equippedDecorationsBonus(pet);
  const owned = pet.ownedDecorations || [];
  const equipped = pet.equipped || {};

  const onFeed = (treat, ev) => {
    const r = feedPet(treat.id);
    if (r === 'ok') {
      showToast?.(`+${treat.hungerGain} сытости`);
      // Compute fly-from (treat button center) and fly-to (owl mouth).
      // Mouth in scene coords: roughly 50% across, 56% down.
      const btn = ev?.currentTarget?.getBoundingClientRect?.();
      const scene = sceneRef.current?.getBoundingClientRect?.();
      if (btn && scene) {
        const from = { x: btn.left + btn.width / 2, y: btn.top + btn.height / 2 };
        const to   = { x: scene.left + scene.width / 2, y: scene.top + scene.height * 0.56 };
        const id = Date.now() + Math.random();
        setFlyingTreats((q) => [...q, { id, icon: treat.icon, from, to }]);
        setTimeout(() => {
          setFlyingTreats((q) => q.filter((f) => f.id !== id));
        }, 700);
      }
    }
    else if (r === 'not_enough_coins') showToast?.('Недостаточно монет');
    else if (r === 'full') showToast?.('Букля уже сыта');
  };

  const onBuyDeco = (d) => {
    const r = buyDecoration(d.id);
    if (r === 'ok') showToast?.(`${d.name} — куплено и надето`);
    else if (r === 'not_enough_coins') showToast?.('Недостаточно монет');
    else if (r === 'locked') showToast?.(`Доступно с ${d.minLevel} уровня Букли`);
  };

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
        <h2 className="pet-screen__title">
          {!unlocked && !pet.hatched ? 'Дупло' : (pet.name || 'Букля')}
        </h2>
        <div className="pet-screen__balance" title="Монеты">
          <CoinIcon />
          <span>{stats.coins || 0}</span>
        </div>
      </header>

      <div className="pet-screen__body">
        <div className="pet-screen__scene" ref={sceneRef}>
          <PetScene mode={mode} equipped={equipped} />
        </div>

        {!unlocked && !pet.hatched ? (
          <LockedStub gamesLeft={gamesLeft} played={played} />
        ) : mode !== 'owl' ? (
          <div className="pet-screen__caption">
            {mode === 'hatching' ? 'Скорлупа трескается!' : 'В дупле что-то шевелится…'}
          </div>
        ) : (
          <>
            <section className="pet-summary">
              <div className="pet-summary__row">
                <div className="pet-summary__name">{pet.name || 'Букля'}</div>
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
                    На Букле: <b>+{decoBonus} {pluralCoins(decoBonus)}</b> к награде за победы
                  </div>
                )}
                <div className="pet-summary__meta">
                  Возраст: {age} {pluralDays(age)}
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
                  owned={owned}
                  equipped={equipped}
                  coins={stats.coins || 0}
                  petLevel={lvl.level || 1}
                  onBuy={onBuyDeco}
                  onEquip={(id, slotOverride) => equipDecoration(id, slotOverride)}
                  onUnequipSlot={(slot) => unequipDecorationSlot(slot)}
                />
              )}
              {tab === 'train' && <TrainPanel />}
            </section>
          </>
        )}
      </div>

      {/* Flying-treat layer — fixed-positioned emojis traveling from the
          tapped button to Букля's mouth. Lives at the screen root so it
          isn't clipped by the scrollable body. */}
      {flyingTreats.map((f) => (
        <div
          key={f.id}
          className="feed-flier"
          style={{
            '--from-x': `${f.from.x}px`,
            '--from-y': `${f.from.y}px`,
            '--to-x':   `${f.to.x}px`,
            '--to-y':   `${f.to.y}px`,
            '--mid-y':  `${Math.min(f.from.y, f.to.y) - 80}px`
          }}
          aria-hidden="true"
        >{f.icon}</div>
      ))}
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
            onClick={(e) => onFeed(t, e)}
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

function CheerPanel({ owned, equipped, coins, petLevel = 1, onBuy, onEquip, onUnequipSlot }) {
  const bySlot = SLOTS.map((s) => ({
    slot: s,
    items: PET_DECORATIONS.filter((d) => d.slot === s.id)
  }));

  return (
    <div className="pet-decos">
      <p className="pet-tab__hint">
        В каждом слоте — одно украшение, но слоты складываются. На крыльях
        можно носить два амулета (по одному на каждое крыло). Бонусы
        суммируются.
      </p>
      {bySlot.map(({ slot, items }) => {
        const isWing = slot.id === 'wing';
        const wingL = equipped.wingL;
        const wingR = equipped.wingR;
        const equippedId = isWing ? null : (equipped[slot.id] || null);
        return (
          <div key={slot.id} className="pet-deco-group">
            <div className="pet-deco-group__head">
              <span className="pet-deco-group__label">{slot.label}</span>
              {isWing ? (
                <div className="pet-deco-group__wings">
                  {wingL && <button type="button" className="pet-deco-group__clear"
                    onClick={() => onUnequipSlot('wingL')}>Снять лев.</button>}
                  {wingR && <button type="button" className="pet-deco-group__clear"
                    onClick={() => onUnequipSlot('wingR')}>Снять прав.</button>}
                </div>
              ) : equippedId && (
                <button
                  type="button"
                  className="pet-deco-group__clear"
                  onClick={() => onUnequipSlot(slot.id)}
                  onMouseDown={(e) => e.preventDefault()}
                >Снять</button>
              )}
            </div>
            {items.map((d) => {
              const isOwned = owned.includes(d.id);
              const cantAfford = coins < d.price;
              const onL = wingL === d.id;
              const onR = wingR === d.id;
              const isActiveSingle = !isWing && equippedId === d.id;
              const isLocked = !isOwned && d.minLevel && petLevel < d.minLevel;

              return (
                <div key={d.id} className={`pet-deco${isActiveSingle || onL || onR ? ' pet-deco--active' : ''}${isLocked ? ' pet-deco--locked' : ''}`}>
                  <span className="pet-deco__icon" aria-hidden="true">{d.icon}</span>
                  <span className="pet-deco__meta">
                    <span className="pet-deco__name">{d.name}</span>
                    <span className="pet-deco__desc">{d.desc}</span>
                    <span className="pet-deco__bonus">+{d.bonusCoins} {pluralCoins(d.bonusCoins)} за победу</span>
                  </span>
                  <div className="pet-deco__cta">
                    {isLocked ? (
                      <span className="pet-deco__lock" title={`Доступно с ${d.minLevel} уровня Букли`}>
                        🔒 Ур. {d.minLevel}
                      </span>
                    ) : !isOwned ? (
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
                    ) : isWing ? (
                      <div className="pet-deco__wing-btns">
                        <button
                          type="button"
                          className={`pet-deco__wing-btn${onL ? ' pet-deco__wing-btn--on' : ''}`}
                          onClick={() => onEquip(d.id, 'wingL')}
                          onMouseDown={(e) => e.preventDefault()}
                        >Лев</button>
                        <button
                          type="button"
                          className={`pet-deco__wing-btn${onR ? ' pet-deco__wing-btn--on' : ''}`}
                          onClick={() => onEquip(d.id, 'wingR')}
                          onMouseDown={(e) => e.preventDefault()}
                        >Прав</button>
                      </div>
                    ) : isActiveSingle ? (
                      <span className="pet-deco__chip">Надето</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--primary pet-deco__btn"
                        onClick={() => onEquip(d.id)}
                        onMouseDown={(e) => e.preventDefault()}
                      >Надеть</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function LockedStub({ gamesLeft, played }) {
  const pct = Math.min(100, Math.round((played / PET_UNLOCK_GAMES) * 100));
  return (
    <section className="pet-locked">
      <div className="pet-locked__lock" aria-hidden="true">🔒</div>
      <h3 className="pet-locked__title">
        Букля ещё не готова вылупиться
      </h3>
      <p className="pet-locked__desc">
        Сыграй {gamesLeft} {pluralGames(gamesLeft)}, и в дупле начнётся что-то интересное.
      </p>
      <div className="pet-locked__bar">
        <div className="pet-locked__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pet-locked__count">{played} / {PET_UNLOCK_GAMES}</div>
    </section>
  );
}

function pluralGames(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'игру';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'игры';
  return 'игр';
}

