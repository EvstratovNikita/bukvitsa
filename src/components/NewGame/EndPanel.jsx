import { useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon, CoinIcon, PlayIcon, RefreshIcon, ShareIcon } from '../icons/Icon.jsx';
import { buildInviteUrl, buildWordleShareText, share } from '../../lib/share.js';
import { getDailyNumber } from '../../data/dailyWord.js';

// Bottom panel that swaps in for the keyboard once a round ends. Vertical
// stack on the left (title + word + reward lines); action buttons on the
// right. Daily mode adds a share-grid button and swaps the CTA to "К играм"
// (which leaves daily and starts a regular energy-gated round).
export function EndPanel() {
  const {
    status, reset, solution, evaluations, guesses,
    lastEarned, lastEarnedBase,
    doubledLastWin, doublingAd, doubleLastReward, adsDoubleLeft,
    gameMode, exitDailyMode, auth, wordLength, stats
  } = useGameContext();
  const [shareStatus, setShareStatus] = useState(null);
  if (status === GAME_STATUS.PLAYING) return null;
  const isWin = status === GAME_STATUS.WON;
  const isDaily = gameMode === 'daily';
  const isAlt = !isDaily && wordLength !== 5;
  // Alt-mode (4/6) series toward the next +1 energy refund. plays counts
  // completed rounds in the current local day; every 5 grants energy (≤3/day).
  const altPlays = (stats?.altMode?.plays || 0) % 5;
  const altGranted = stats?.altMode?.energyGranted || 0;
  const altLeft = 5 - altPlays;
  const altCapped = altGranted >= 3;
  const bonus = Math.max(0, (lastEarned || 0) - (lastEarnedBase || 0));
  // Daily wins do NOT show the ×2 ad button — the doubled reward is built
  // into the daily payout already.
  const canDouble = !isDaily && isWin && lastEarned > 0 && !doubledLastWin && (adsDoubleLeft ?? 0) > 0;
  const dayN = getDailyNumber();

  const onShare = async () => {
    const url = buildInviteUrl(auth?.userId);
    const text = buildWordleShareText(
      evaluations || [],
      isWin ? (guesses?.length || 0) : 0,
      MAX_ATTEMPTS,
      dayN,
      url
    );
    const r = await share({ title: 'Буквица — Слово дня', text, url });
    setShareStatus(r);
    setTimeout(() => setShareStatus(null), 1600);
  };

  return (
    <div className="end-panel" role="region" aria-label="Конец раунда">
      <div className="end-panel__inner">
        <div className="end-panel__meta">
          <div className="end-panel__title">
            {isDaily && '📅 '}{isWin ? '🎉 Победа!' : '😕 Не угадал'}
          </div>
          <div className="end-panel__word">
            Слово: <b>{(solution || '').toUpperCase()}</b>
          </div>
          {isWin && lastEarned > 0 && (
            <>
              <div className="end-panel__reward">
                <CoinIcon />
                <span>+{lastEarned}</span>
                {doubledLastWin && <span className="end-panel__doubled">×2 ✓</span>}
              </div>
              {isDaily ? (
                <div className="end-panel__breakdown">
                  Основная {lastEarnedBase} + за Слово дня {bonus}
                </div>
              ) : bonus > 0 ? (
                <div className="end-panel__breakdown">
                  Базовая {lastEarnedBase} + от Букли {bonus}
                </div>
              ) : null}
            </>
          )}
          {isDaily && (
            <div className="end-panel__breakdown">
              Слово дня #{dayN} · {isWin ? `${guesses?.length || 0}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}
            </div>
          )}
          {isAlt && (
            <div className="end-panel__alt">
              <div className="end-panel__alt-bar" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`end-panel__alt-pip${i < altPlays ? ' end-panel__alt-pip--on' : ''}`} />
                ))}
              </div>
              <div className="end-panel__alt-text">
                {altCapped
                  ? 'Лимит энергии за режимы достигнут (3/3 сегодня)'
                  : altLeft === 5
                    ? <>Серия {altPlays}/5 — ещё <b>5</b> побед до <BoltIcon /> +1</>
                    : <>Серия {altPlays}/5 — ещё <b>{altLeft}</b> {altLeft === 1 ? 'победа' : altLeft < 5 ? 'победы' : 'побед'} до <BoltIcon /> +1</>}
              </div>
            </div>
          )}
        </div>

        <div className="end-panel__actions">
          {canDouble && (
            <button
              type="button"
              className="btn btn--ad-double end-panel__double"
              onClick={doubleLastReward}
              onMouseDown={(e) => e.preventDefault()}
              disabled={doublingAd}
            >
              <span className="btn-ad__text">{doublingAd ? 'Реклама…' : 'Удвоить награду'}</span>
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
          {isDaily && (
            <button
              type="button"
              className="btn btn--ghost end-panel__double"
              onClick={onShare}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ShareIcon />
              <span>{shareStatus === 'copied' ? 'Скопировано' :
                     shareStatus === 'shared' ? 'Готово' :
                     shareStatus === 'failed' ? 'Не вышло' :
                     'Поделиться сеткой'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary end-panel__cta"
            onClick={isDaily ? exitDailyMode : reset}
            onMouseDown={(e) => e.preventDefault()}
          >
            <RefreshIcon />
            <span>{isDaily ? 'К играм' : 'Новая игра'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
