import { useEffect, useState } from 'react';
import {
  ENERGY_AD_REWARD,
  ENERGY_MAX,
  ENERGY_REFILL_COST,
  energySpeedFromHunger,
  formatDuration,
  msUntilNextEnergyUnit
} from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { showRewardedAd } from '../../lib/ads.js';
import { Modal } from '../Modal/Modal.jsx';
import { BoltIcon, CoinIcon, PlayIcon } from '../icons/Icon.jsx';

export function EnergyModal() {
  const {
    energy,
    energyMax,
    lastEnergyTickAt,
    petHunger,
    energyModalOpen,
    closeEnergyModal,
    buyEnergy,
    grantAdEnergy,
    recordAdWatched,
    startAfterRefuel,
    stats,
    solution,
    status
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

  if (!energyModalOpen) return null;

  // "Cold start" = no current puzzle (energy ran out before mount) OR the
  // round is finished and the user is trying to start a new one.
  const needsStart = !solution || status !== 'playing';

  const flash = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 1600);
  };

  const onBuy = () => {
    const r = buyEnergy();
    if (r === 'ok') {
      flash('ok', `+1 энергия (−${ENERGY_REFILL_COST})`);
      if (needsStart) startAfterRefuel();
    } else if (r === 'full') {
      flash('err', 'Энергия уже полная');
    } else {
      flash('err', 'Недостаточно монет');
    }
  };

  const onAd = async () => {
    if (adRunning) return;
    setAdRunning(true);
    flash('info', 'Реклама…');
    const result = await showRewardedAd();
    setAdRunning(false);
    if (result === 'rewarded') {
      grantAdEnergy();
      const adBonus = recordAdWatched?.() || 0;
      flash('ok', adBonus > 0 ? `+${ENERGY_AD_REWARD} энергия и +${adBonus} монет` : `+${ENERGY_AD_REWARD} энергия`);
      if (needsStart) startAfterRefuel();
    } else if (result === 'closed') {
      flash('err', 'Реклама закрыта раньше');
    } else {
      flash('err', 'Реклама недоступна');
    }
  };

  const cannotAfford = (stats.coins || 0) < ENERGY_REFILL_COST;
  const full = energy >= cap;

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
              : 'Каждая новая игра тратит 1 энергию. Восстановление — раз в 2 часа.'}
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
            className="energy-option"
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
            className="energy-option"
            onClick={onAd}
            onMouseDown={(e) => e.preventDefault()}
            disabled={full || adRunning}
          >
            <span className="energy-option__icon"><PlayIcon /></span>
            <span className="energy-option__body">
              <span className="energy-option__title">
                {adRunning ? 'Смотрим рекламу…' : 'Посмотреть рекламу'}
              </span>
              <span className="energy-option__sub">+{ENERGY_AD_REWARD} энергия, бесплатно</span>
            </span>
            <span className="energy-option__price energy-option__price--ad">
              {adRunning ? '…' : 'Смотреть'}
            </span>
          </button>
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
