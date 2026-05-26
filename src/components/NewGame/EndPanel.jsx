import { useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon, PlayIcon, RefreshIcon, ShareIcon } from '../icons/Icon.jsx';
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
    doubledLastWin, doublingAd, doubleLastReward,
    gameMode, exitDailyMode, auth
  } = useGameContext();
  const [shareStatus, setShareStatus] = useState(null);
  if (status === GAME_STATUS.PLAYING) return null;
  const isWin = status === GAME_STATUS.WON;
  const isDaily = gameMode === 'daily';
  const bonus = Math.max(0, (lastEarned || 0) - (lastEarnedBase || 0));
  const canDouble = !isDaily && isWin && lastEarned > 0 && !doubledLastWin;
  const dayN = getDailyNumber();

  const onShare = async () => {
    const text = buildWordleShareText(
      evaluations || [],
      isWin ? (guesses?.length || 0) : 0,
      MAX_ATTEMPTS,
      dayN
    );
    const url = buildInviteUrl(auth?.userId);
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
          {!isDaily && isWin && lastEarned > 0 && (
            <>
              <div className="end-panel__reward">
                <CoinIcon />
                <span>+{lastEarned}</span>
                {doubledLastWin && <span className="end-panel__doubled">×2 ✓</span>}
              </div>
              {bonus > 0 && (
                <div className="end-panel__breakdown">
                  Базовая {lastEarnedBase} + от Букли {bonus}
                </div>
              )}
            </>
          )}
          {isDaily && (
            <div className="end-panel__breakdown">
              Слово дня #{dayN} · {isWin ? `${guesses?.length || 0}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}
            </div>
          )}
        </div>

        <div className="end-panel__actions">
          {canDouble && (
            <button
              type="button"
              className="btn btn--ghost end-panel__double"
              onClick={doubleLastReward}
              onMouseDown={(e) => e.preventDefault()}
              disabled={doublingAd}
            >
              <PlayIcon />
              <span>{doublingAd ? 'Реклама…' : `×2 (+${lastEarned})`}</span>
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
