import { useEffect, useState } from 'react';
import {
  ENERGY_AD_REWARD,
  ENERGY_MAX,
  ENERGY_REFILL_COST,
  ENERGY_REGEN_INTERVAL_MS,
  energySpeedFromHunger,
  formatDuration,
  msUntilNextEnergyUnit
} from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { showRewardedAd } from '../../lib/ads.js';
import { pluralCoins } from '../../utils/plural.js';
import { Modal } from '../Modal/Modal.jsx';
import { BoltIcon, CoinIcon, PlayIcon } from '../icons/Icon.jsx';
import { PumpkinIcon } from '../Halloween/HwIcons.jsx';

// Сколько энергии за день дают режимы 4/6 (серия «5 побед → +1», до 3 раз) —
// то же правило, что в EndPanel и GameEnd.
const ALT_ENERGY_PER_DAY = 3;

// onOpenModes — открыть выбор режима (App): режимы 4 и 6 букв энергию не
// тратят и сами её приносят, так что без энергии это лучший выход из окна.
// onPlayHalloween — только пока идёт ивент «Ночь тыкв»: загадки ночи тоже
// не тратят энергию.
export function EnergyModal({ onOpenModes, onPlayHalloween }) {
  const {
    energy,
    energyMax,
    lastEnergyTickAt,
    petHunger,
    energyModalOpen,
    pendingLength,
    closeEnergyModal,
    buyEnergy,
    grantAdEnergy,
    adsEnergyLeft = 0,
    recordAdWatched,
    startAfterRefuel,
    stats,
    solution,
    status,
    gameMode
  } = useGameContext();
  const cap = energyMax || ENERGY_MAX;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!energyModalOpen || energy >= cap) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [energyModalOpen, energy, cap]);
  const [feedback, setFeedback] = useState(null);  // { type, text }
  const [adRunning, setAdRunning] = useState(false);
  // Пополнили и тут же стартуем — но начисление ещё не доехало до состояния,
  // и consumeEnergy внутри startAfterRefuel видел старый ноль и отказывал:
  // энергия прибавлялась, а партия не начиналась. Ставим намерение и ждём
  // эффектом, пока единица появится.
  const [wantStart, setWantStart] = useState(false);
  useEffect(() => {
    if (!wantStart || energy < 1) return;
    setWantStart(false);
    startAfterRefuel();
  }, [wantStart, energy, startAfterRefuel]);

  if (!energyModalOpen) return null;

  // "Cold start" = no current puzzle (energy ran out before mount) OR the
  // round is finished and the user is trying to start a new one.
  // Плюс случай, когда партия идёт, но игрок упёрся в энергию на переходе в
  // режим 5 букв: после пополнения ведём туда, куда он и шёл.
  // В загадках ночи энергия не нужна — пополнение ничего не запускает, только
  // переход в режим 5 букв (pendingLength).
  const needsStart = Boolean(pendingLength) || (gameMode !== 'halloween' && (!solution || status !== 'playing'));

  const flash = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 1600);
  };

  const onBuy = () => {
    const r = buyEnergy();
    if (r === 'ok') {
      flash('ok', `+1 энергия (−${ENERGY_REFILL_COST})`);
      if (needsStart) setWantStart(true);
    } else if (r === 'full') {
      flash('err', 'Энергия уже полная');
    } else {
      flash('err', 'Недостаточно монет');
    }
  };

  const onAd = async () => {
    if (adRunning) return;
    if (adsEnergyLeft <= 0) { flash('err', 'Лимит рекламы на сегодня исчерпан'); return; }
    setAdRunning(true);
    flash('info', 'Реклама…');
    const result = await showRewardedAd();
    setAdRunning(false);
    if (result === 'rewarded') {
      // grantAdEnergy enforces the daily cap and returns false if reached.
      if (!grantAdEnergy()) { flash('err', 'Лимит рекламы на сегодня исчерпан'); return; }
      const adBonus = recordAdWatched?.() || 0;
      flash('ok', adBonus > 0 ? `+${ENERGY_AD_REWARD} энергия и +${adBonus} ${pluralCoins(adBonus)}` : `+${ENERGY_AD_REWARD} энергия`);
      if (needsStart) setWantStart(true);
    } else if (result === 'closed') {
      flash('err', 'Реклама закрыта раньше');
    } else {
      flash('err', result === 'nofill' ? 'Сейчас нет рекламы — попробуйте позже' : 'Реклама недоступна');
    }
  };

  const cannotAfford = (stats.coins || 0) < ENERGY_REFILL_COST;
  const full = energy >= cap;
  const adCapReached = adsEnergyLeft <= 0;

  // Предложение режимов 4/6 — когда на партию энергии нет.
  const showModes = Boolean(onOpenModes) && energy < 1;
  const altPlays = (stats?.altMode?.plays || 0) % 5;
  const altCapped = (stats?.altMode?.energyGranted || 0) >= ALT_ENERGY_PER_DAY;
  const altLeft = 5 - altPlays;
  const onModes = () => { closeEnergyModal(); onOpenModes(); };
  const showHw = Boolean(onPlayHalloween) && energy < 1 && gameMode !== 'halloween';
  const onHw = () => { closeEnergyModal(); onPlayHalloween(); };

  return (
    <Modal open onClose={closeEnergyModal} title="Энергия">
      <div className="energy-modal">
        <div className="energy-modal__hero">
          <div className="energy-modal__bolt">
            <BoltIcon />
          </div>
          <div className="energy-modal__count">{energy} / {cap}</div>
          <div className="energy-modal__desc">
            {full
              ? 'Энергия полная — можно играть!'
              : `Каждая новая игра тратит 1 энергию. Восстановление — раз в ${ENERGY_REGEN_INTERVAL_MS >= 2 * 3600000 ? '2 часа' : 'час'}.`}
          </div>
          {!full && (
            <div className="energy-modal__timer">
              Следующая через <b>{formatDuration(msUntilNextEnergyUnit({ energy, lastEnergyTickAt, hunger: petHunger, maxEnergy: cap }))}</b>
              {' '}<span className="energy-modal__speed">×{energySpeedFromHunger(petHunger).toFixed(1)} от Букли</span>
            </div>
          )}
        </div>

        <div className="energy-modal__options">
          <button
            type="button"
            className="energy-option energy-option--buy"
            onClick={onBuy}
            onMouseDown={(e) => e.preventDefault()}
            disabled={full || cannotAfford || adRunning}
          >
            <span className="energy-option__icon"><CoinIcon /></span>
            <span className="energy-option__body">
              <span className="energy-option__title">Купить за монеты</span>
              <span className="energy-option__sub">+1 энергия</span>
            </span>
            <span className="energy-option__price">
              <CoinIcon />
              <span>{ENERGY_REFILL_COST}</span>
            </span>
          </button>

          <button
            type="button"
            className="energy-option energy-option--ad"
            onClick={onAd}
            onMouseDown={(e) => e.preventDefault()}
            disabled={full || adRunning || adCapReached}
          >
            <span className="energy-option__icon"><PlayIcon /></span>
            <span className="energy-option__body">
              <span className="energy-option__title">
                {adRunning ? 'Смотрим рекламу…' : 'Посмотреть рекламу'}
              </span>
              <span className="energy-option__sub">
                {adCapReached
                  ? 'Лимит на сегодня исчерпан'
                  : `+${ENERGY_AD_REWARD} энергия, бесплатно${Number.isFinite(adsEnergyLeft) ? ` · осталось ${adsEnergyLeft}` : ''}`}
              </span>
            </span>
            <span className="energy-option__price energy-option__price--ad">
              {adRunning ? '…' : (<><PlayIcon /><span>Смотреть</span></>)}
            </span>
          </button>

          {showHw && (
            <button
              type="button"
              className="energy-option energy-option--hw hw-frame"
              onClick={onHw}
              onMouseDown={(e) => e.preventDefault()}
              disabled={adRunning}
            >
              <span className="energy-option__icon" aria-hidden="true"><PumpkinIcon /></span>
              <span className="energy-option__body">
                <span className="energy-option__title">Загадки ночи</span>
                <span className="energy-option__sub">Хэллоуин · без энергии, награда — тыквы</span>
              </span>
              <span className="energy-option__price energy-option__price--hw">
                <span>Играть</span>
              </span>
            </button>
          )}

          {showModes && (
            <button
              type="button"
              className="energy-option energy-option--modes"
              onClick={onModes}
              onMouseDown={(e) => e.preventDefault()}
              disabled={adRunning}
            >
              <span className="energy-option__icon" aria-hidden="true">4·6</span>
              <span className="energy-option__body">
                <span className="energy-option__title">Режимы 4 и 6 букв</span>
                <span className="energy-option__sub">
                  {altCapped
                    ? 'Без энергии — играй сколько хочешь'
                    : <>Без энергии · ещё {altLeft} {altLeft === 1 ? 'победа' : altLeft < 5 ? 'победы' : 'побед'} до <BoltIcon /> +1</>}
                </span>
              </span>
              <span className="energy-option__price energy-option__price--modes">
                <span>Играть</span>
              </span>
            </button>
          )}
        </div>

        {feedback && (
          <div className={`energy-modal__feedback energy-modal__feedback--${feedback.type}`}>
            {feedback.text}
          </div>
        )}
      </div>
    </Modal>
  );
}
