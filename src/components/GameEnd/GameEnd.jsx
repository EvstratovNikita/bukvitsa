import { useEffect, useMemo, useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon, CloseIcon, CoinIcon, CrownIcon, PlayIcon, RefreshIcon, SadIcon, ShareIcon } from '../icons/Icon.jsx';
import { SHARE_BASE_URL, buildWordleShareText, lastShareError, share } from '../../lib/share.js';
import { getDailyNumber } from '../../data/dailyWord.js';
import { rewardedAdsAvailable } from '../../lib/ads.js';
import { HwRoundResult } from '../Halloween/HalloweenGame.jsx';
import { tr } from '../../lib/lang.js';

const CONFETTI_PALETTE = ['#f7c948', '#ffd864', '#6c8cff', '#b388ff', '#e9ecf3'];
// В загадках ночи — тыквенно-лиловое конфетти.
const HW_CONFETTI = ['#ff8a1f', '#ffb35c', '#8b5cf6', '#b794ff', '#7bbf4a'];

// Rough "better than" lookup vs the average Buкvitsa player. Calibrated
// off real Wordle distributions — fewer guesses = higher percentile.
const PERCENTILE_BY_ATTEMPTS = { 1: 99, 2: 92, 3: 75, 4: 50, 5: 25, 6: 10 };

function Confetti({ count = 22, palette = CONFETTI_PALETTE }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: palette[Math.floor(Math.random() * palette.length)],
        duration: 1600 + Math.random() * 1400,
        delay: Math.random() * 500,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 720 - 360
      })),
    [count, palette]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`,
            ['--rot']: `${p.rotate}deg`
          }}
        />
      ))}
    </div>
  );
}

export function GameEnd() {
  const {
    status, solution, lastEarned, lastEarnedBase, lastEarnedDeco, boostedLastWin, stats,
    guesses, evaluations, gameMode, exitDailyMode, reset,
    doubledLastWin, doublingAd, doubleLastReward, adsDoubleLeft, wordLength,
    nextHalloweenRiddle, riddle,
    showToast
  } = useGameContext();
  // В Слове дня «бонус» — это вторая половина удвоенной награды; в обычной
  // игре раскладка приходит готовой, вычитать ничего не нужно.
  const bonus = Math.max(0, (lastEarned || 0) - (lastEarnedBase || 0));
  const isHw = gameMode === 'halloween';
  const isAlt = gameMode !== 'daily' && !isHw && wordLength !== 5;
  const altPlays = (stats?.altMode?.plays || 0) % 5;
  const altGranted = stats?.altMode?.energyGranted || 0;
  const altLeft = 5 - altPlays;
  const altCapped = altGranted >= 3;
  const [closed, setClosed] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);

  // Re-open the celebration whenever a new game ends.
  useEffect(() => {
    if (status === GAME_STATUS.WON || status === GAME_STATUS.LOST) {
      setClosed(false);
    }
  }, [status]);

  if (status === GAME_STATUS.PLAYING) return null;
  if (closed) return null;
  const isWin = status === GAME_STATUS.WON;
  const isDaily = gameMode === 'daily';
  const letters = [...solution];
  const attempts = guesses?.length || 0;
  const percentile = isWin ? PERCENTILE_BY_ATTEMPTS[attempts] : null;
  const streak = isDaily ? (stats.daily?.streak || 0) : (stats.currentStreak || 0);
  const streakLabel = isDaily ? tr('Серия Слова дня') : tr('Серия побед');

  const onShare = async () => {
    const url = SHARE_BASE_URL;
    const text = buildWordleShareText(
      evaluations || [],
      isWin ? attempts : 0,
      MAX_ATTEMPTS,
      isDaily ? getDailyNumber() : null,
      url
    );
    // На vk.com окно VK шлёт только ссылку — сетка уходит в буфер, и
    // подсказка висит, пока игрок пишет сообщение.
    const r = await share({
      title: tr('Буклица — Слово дня'), text, url, wall: true,
      onCopied: () => showToast?.(tr('Сетка скопирована — вставь её в сообщение'), 5000)
    });
    if (r === 'failed' && lastShareError()) showToast?.(tr('Не удалось поделиться (код {v0})', { v0: lastShareError() }), 4000);
    setShareStatus(r);
    setTimeout(() => setShareStatus(null), 1600);
  };

  // "Играем дальше" actually starts the next round. EndPanel still
  // reachable via the close (×) button if the player wants the reward
  // breakdown / ×2 ad button — both are duplicated in this modal too.
  const onContinue = () => {
    setClosed(true);
    if (isDaily) exitDailyMode();
    else if (isHw) nextHalloweenRiddle();
    else reset();
  };

  return (
    <div className={`gameend gameend--${isWin ? 'win' : 'lose'}${isHw ? ' gameend--hw' : ''}`} role="dialog" aria-live="polite">
      {isWin && <Confetti palette={isHw ? HW_CONFETTI : CONFETTI_PALETTE} />}

      <div className="gameend__card">
        <button
          type="button"
          className="gameend__close"
          onClick={() => setClosed(true)}
          aria-label={tr('Закрыть')}
          title={tr('Закрыть')}
        >
          <CloseIcon />
        </button>

        <div className="gameend__badge">
          {isWin ? <CrownIcon /> : <SadIcon />}
        </div>

        <h2 className="gameend__title">
          {isHw ? (isWin ? tr('Загадка разгадана!') : tr('Загадка не далась')) : (isWin ? tr('Победа!') : tr('Не угадал'))}
        </h2>
        {isHw && riddle && <p className="gameend__riddle">{riddle.riddle}</p>}

        <div className="gameend__label">{tr('Слово')}</div>
        <div className="gameend__word">
          {letters.map((c, i) => (
            <span key={i} style={{ animationDelay: `${300 + i * 70}ms` }}>
              {c.toUpperCase()}
            </span>
          ))}
        </div>

        {isWin && lastEarned > 0 && (
          <div className="gameend__reward-wrap">
            <div className="gameend__reward">
              <CoinIcon />
              <span>+{lastEarned}</span>
              {doubledLastWin && <span className="gameend__doubled">×2 ✓</span>}
            </div>
            {isDaily ? (
              <div className="gameend__bonus">
                {lastEarnedBase}{tr(' основная + ')}{bonus}{tr(' за Слово дня')}</div>
            ) : (lastEarnedDeco > 0 || boostedLastWin) ? (
              <div className="gameend__bonus">
                {lastEarnedBase}{tr(' базовых')}{lastEarnedDeco > 0 && <> + {lastEarnedDeco}{tr(' от Букли')}</>}
                {boostedLastWin && <>{tr(', всё ×2 по бонусу')}</>}
              </div>
            ) : null}
          </div>
        )}

        {isHw && <HwRoundResult />}

        {!isHw && isWin && streak >= 2 && (
          <div className="gameend__streak">
            {streakLabel}: <b>{streak}</b>
          </div>
        )}

        {!isWin && !isHw && (
          <div className="gameend__streak">{tr('Серия прервана. Попробуй ещё.')}</div>
        )}

        {isDaily && isWin && percentile != null && (
          <div className="gameend__percentile">{tr('Вы справились лучше, чем ')}<b>{percentile}%</b>{tr(' игроков!')}</div>
        )}

        {isAlt && (
          <div className="gameend__alt">
            <div className="gameend__alt-bar" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`gameend__alt-pip${i < altPlays ? ' gameend__alt-pip--on' : ''}`} />
              ))}
            </div>
            <div className="gameend__alt-text">
              {altCapped
                ? tr('Лимит энергии за режимы достигнут (3/3 сегодня)')
                : <>{tr('Серия ')}{altPlays}{tr('/5 — ещё ')}<b>{altLeft}</b> {altLeft === 1 ? tr('победа') : tr('побед')}{tr(' до ')}<BoltIcon />{tr(' +1 энергии')}</>}
            </div>
          </div>
        )}

        <div className="gameend__cta-row">
          {isDaily && isWin && (
            <button
              type="button"
              className="btn btn--ghost gameend__btn"
              onClick={onShare}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ShareIcon />
              <span>{shareStatus === 'copied' ? tr('Скопировано') :
                     shareStatus === 'shared' ? tr('Готово') :
                     shareStatus === 'failed' ? tr('Не вышло') :
                     tr('Поделиться сеткой')}</span>
            </button>
          )}
          {!isDaily && isWin && lastEarned > 0 && !doubledLastWin && (adsDoubleLeft ?? 0) > 0 && rewardedAdsAvailable() && (
            <button
              type="button"
              className="btn btn--ad-double gameend__btn"
              onClick={doubleLastReward}
              onMouseDown={(e) => e.preventDefault()}
              disabled={doublingAd}
            >
              <span className="btn-ad__text">{doublingAd ? tr('Реклама…') : tr('Удвоить награду')}</span>
              {!doublingAd && (
                <span className="btn-ad__amount">
                  <CoinIcon />
                  <span>+{lastEarned}</span>
                </span>
              )}
              <span className="btn-ad__icon" aria-hidden="true">
                <PlayIcon />
              </span>
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary gameend__btn"
            onClick={onContinue}
            onMouseDown={(e) => e.preventDefault()}
          >
            <RefreshIcon />
            <span>{isHw ? tr('Следующая загадка') : tr('Играем дальше')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
