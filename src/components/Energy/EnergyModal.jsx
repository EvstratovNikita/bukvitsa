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
import { rewardedAdsAvailable, showRewardedAd, rewardedFailText } from '../../lib/ads.js';
import { pluralCoins } from '../../utils/plural.js';
import { Modal } from '../Modal/Modal.jsx';
import { BoltIcon, CoinIcon, PlayIcon } from '../icons/Icon.jsx';
import { PumpkinIcon } from '../Halloween/HwIcons.jsx';
import { tr } from '../../lib/lang.js';

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

  const flash = (type, text, ms = 1600) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback((f) => (f?.text === text ? null : f)), ms);
  };

  const onBuy = () => {
    const r = buyEnergy();
    if (r === 'ok') {
      flash('ok', tr('+1 энергия (−{ENERGY_REFILL_COST})', { ENERGY_REFILL_COST }));
      if (needsStart) setWantStart(true);
    } else if (r === 'full') {
      flash('err', tr('Энергия уже полная'));
    } else {
      flash('err', tr('Недостаточно монет'));
    }
  };

  const onAd = async () => {
    if (adRunning) return;
    if (adsEnergyLeft <= 0) { flash('err', tr('Лимит рекламы на сегодня исчерпан')); return; }
    setAdRunning(true);
    flash('info', tr('Реклама…'));
    const result = await showRewardedAd();
    setAdRunning(false);
    if (result === 'rewarded') {
      // grantAdEnergy enforces the daily cap and returns false if reached.
      if (!grantAdEnergy()) { flash('err', tr('Лимит рекламы на сегодня исчерпан')); return; }
      const adBonus = recordAdWatched?.() || 0;
      flash('ok', adBonus > 0 ? tr('+{ENERGY_AD_REWARD} энергия и +{adBonus} {v2}', { ENERGY_AD_REWARD, adBonus, v2: pluralCoins(adBonus) }) : tr('+{ENERGY_AD_REWARD} энергия', { ENERGY_AD_REWARD }));
      if (needsStart) setWantStart(true);
    } else {
      flash('err', rewardedFailText(result), result === 'closed' ? 1600 : 4000);
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
    <Modal open onClose={closeEnergyModal} title={tr('Энергия')}>
      <div className="energy-modal">
        <div className="energy-modal__hero">
          <div className="energy-modal__bolt">
            <BoltIcon />
          </div>
          <div className="energy-modal__count">{energy} / {cap}</div>
          <div className="energy-modal__desc">
            {full
              ? tr('Энергия полная — можно играть!')
              : tr('Каждая новая игра тратит 1 энергию. Восстановление — раз в {v0}.', { v0: ENERGY_REGEN_INTERVAL_MS >= 2 * 3600000 ? tr('2 часа') : tr('час') })}
          </div>
          {!full && (
            <div className="energy-modal__timer">{tr('Следующая через ')}<b>{formatDuration(msUntilNextEnergyUnit({ energy, lastEnergyTickAt, hunger: petHunger, maxEnergy: cap }))}</b>
              {' '}<span className="energy-modal__speed">×{energySpeedFromHunger(petHunger).toFixed(1)}{tr(' от Букли')}</span>
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
              <span className="energy-option__title">{tr('Купить за монеты')}</span>
              <span className="energy-option__sub">{tr('+1 энергия')}</span>
            </span>
            <span className="energy-option__price">
              <CoinIcon />
              <span>{ENERGY_REFILL_COST}</span>
            </span>
          </button>

          {rewardedAdsAvailable() && (<button
            type="button"
            className="energy-option energy-option--ad"
            onClick={onAd}
            onMouseDown={(e) => e.preventDefault()}
            disabled={full || adRunning || adCapReached}
          >
            <span className="energy-option__icon"><PlayIcon /></span>
            <span className="energy-option__body">
              <span className="energy-option__title">
                {adRunning ? tr('Смотрим рекламу…') : tr('Посмотреть рекламу')}
              </span>
              <span className="energy-option__sub">
                {adCapReached
                  ? tr('Лимит на сегодня исчерпан')
                  : tr('+{ENERGY_AD_REWARD} энергия, бесплатно{v1}', { ENERGY_AD_REWARD, v1: Number.isFinite(adsEnergyLeft) ? tr(' · осталось {adsEnergyLeft}', { adsEnergyLeft }) : '' })}
              </span>
            </span>
            <span className="energy-option__price energy-option__price--ad">
              {adRunning ? '…' : (<><PlayIcon /><span>{tr('Смотреть')}</span></>)}
            </span>
          </button>)}

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
                <span className="energy-option__title">{tr('Загадки ночи')}</span>
                <span className="energy-option__sub">{tr('Хэллоуин · без энергии, награда — тыквы')}</span>
              </span>
              <span className="energy-option__price energy-option__price--hw">
                <span>{tr('Играть')}</span>
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
                <span className="energy-option__title">{tr('Режимы 4 и 6 букв')}</span>
                <span className="energy-option__sub">
                  {altCapped
                    ? tr('Без энергии — играй сколько хочешь')
                    : <>{tr('Без энергии · ещё ')}{altLeft} {altLeft === 1 ? tr('победа') : altLeft < 5 ? tr('победы') : tr('побед')}{tr(' до ')}<BoltIcon /> +1</>}
                </span>
              </span>
              <span className="energy-option__price energy-option__price--modes">
                <span>{tr('Играть')}</span>
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
