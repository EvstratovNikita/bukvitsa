import { useState } from 'react';
import { ENERGY_AD_REWARD, ENERGY_MAX, ENERGY_REFILL_COST } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { BoltIcon, CoinIcon, PlayIcon } from '../icons/Icon.jsx';

// Stubbed ad-watch: pretend a rewarded ad runs for ~3s, then grant energy.
// Real integration point — swap the setTimeout for the SDK's reward callback.
const AD_DURATION_MS = 3000;

export function EnergyModal() {
  const {
    energy,
    energyModalOpen,
    closeEnergyModal,
    buyEnergy,
    grantAdEnergy,
    startAfterRefuel,
    stats,
    solution,
    status
  } = useGameContext();
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

  const onAd = () => {
    if (adRunning) return;
    setAdRunning(true);
    flash('info', 'Реклама…');
    setTimeout(() => {
      grantAdEnergy();
      setAdRunning(false);
      flash('ok', `+${ENERGY_AD_REWARD} энергия`);
      if (needsStart) startAfterRefuel();
    }, AD_DURATION_MS);
  };

  const cannotAfford = (stats.coins || 0) < ENERGY_REFILL_COST;
  const full = energy >= ENERGY_MAX;

  return (
    <Modal open onClose={closeEnergyModal} title="Энергия">
      <div className="energy-modal">
        <div className="energy-modal__hero">
          <div className="energy-modal__bolt">
            <BoltIcon />
          </div>
          <div className="energy-modal__count">{energy} / {ENERGY_MAX}</div>
          <div className="energy-modal__desc">
            {full
              ? 'Энергия полная — можно играть!'
              : energy > 0
                ? 'Каждая новая игра тратит 1 энергию. Восстанавливается каждый день.'
                : 'Энергия закончилась. Подожди до завтра или пополни прямо сейчас.'}
          </div>
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
