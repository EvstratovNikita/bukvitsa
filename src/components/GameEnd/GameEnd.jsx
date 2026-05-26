import { useEffect, useMemo, useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CloseIcon, CoinIcon, CrownIcon, PlayIcon, RefreshIcon, SadIcon, ShareIcon } from '../icons/Icon.jsx';
import { buildInviteUrl, buildWordleShareText, share } from '../../lib/share.js';
import { getDailyNumber } from '../../data/dailyWord.js';

const CONFETTI_PALETTE = ['#f7c948', '#ffd864', '#6c8cff', '#b388ff', '#e9ecf3'];

// Rough "better than" lookup vs the average Buкvitsa player. Calibrated
// off real Wordle distributions — fewer guesses = higher percentile.
const PERCENTILE_BY_ATTEMPTS = { 1: 99, 2: 92, 3: 75, 4: 50, 5: 25, 6: 10 };

function Confetti({ count = 22 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
        duration: 1600 + Math.random() * 1400,
        delay: Math.random() * 500,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 720 - 360
      })),
    [count]
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
    status, solution, lastEarned, lastEarnedBase, stats,
    guesses, evaluations, auth, gameMode, exitDailyMode,
    doubledLastWin, doublingAd, doubleLastReward
  } = useGameContext();
  const bonus = Math.max(0, (lastEarned || 0) - (lastEarnedBase || 0));
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
  const streakLabel = isDaily ? 'Серия Слова дня' : 'Серия побед';

  const onShare = async () => {
    const url = buildInviteUrl(auth?.userId);
    const text = buildWordleShareText(
      evaluations || [],
      isWin ? attempts : 0,
      MAX_ATTEMPTS,
      isDaily ? getDailyNumber() : null,
      url
    );
    const r = await share({ title: 'Буквица — Слово дня', text, url });
    setShareStatus(r);
    setTimeout(() => setShareStatus(null), 1600);
  };

  // Daily: jump straight to a normal round (exitDailyMode spends 1 energy).
  // Normal: just dismiss the celebration so EndPanel below stays visible —
  // that's where the reward breakdown and the "×2 за рекламу" button live.
  // Reset only fires when the player taps "Новая игра" in the EndPanel.
  const onContinue = () => {
    setClosed(true);
    if (isDaily) exitDailyMode();
  };

  return (
    <div className={`gameend gameend--${isWin ? 'win' : 'lose'}`} role="dialog" aria-live="polite">
      {isWin && <Confetti />}

      <div className="gameend__card">
        <button
          type="button"
          className="gameend__close"
          onClick={() => setClosed(true)}
          aria-label="Закрыть"
          title="Закрыть"
        >
          <CloseIcon />
        </button>

        <div className="gameend__badge">
          {isWin ? <CrownIcon /> : <SadIcon />}
        </div>

        <h2 className="gameend__title">
          {isWin ? 'Победа!' : 'Не угадал'}
        </h2>

        <div className="gameend__label">Слово</div>
        <div className="gameend__word">
          {letters.map((c, i) => (
            <span key={i} style={{ animationDelay: `${300 + i * 70}ms` }}>
              {c.toUpperCase()}
            </span>
          ))}
        </div>

        {isWin && lastEarned > 0 && (
          <div className="gameend__reward">
            <CoinIcon />
            <span>+{lastEarned}</span>
            {doubledLastWin && <span className="gameend__doubled">×2 ✓</span>}
            {isDaily ? (
              <div className="gameend__bonus">
                {lastEarnedBase} основная + {bonus} за Слово дня
              </div>
            ) : bonus > 0 ? (
              <div className="gameend__bonus">
                {lastEarnedBase} базовых + {bonus} от Букли
              </div>
            ) : null}
          </div>
        )}

        {isWin && streak >= 2 && (
          <div className="gameend__streak">
            {streakLabel}: <b>{streak}</b>
          </div>
        )}

        {!isWin && (
          <div className="gameend__streak">
            Серия прервана. Попробуй ещё.
          </div>
        )}

        {isDaily && isWin && percentile != null && (
          <div className="gameend__percentile">
            Вы справились лучше, чем <b>{percentile}%</b> игроков!
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
              <span>{shareStatus === 'copied' ? 'Скопировано' :
                     shareStatus === 'shared' ? 'Готово' :
                     shareStatus === 'failed' ? 'Не вышло' :
                     'Поделиться сеткой'}</span>
            </button>
          )}
          {!isDaily && isWin && lastEarned > 0 && !doubledLastWin && (
            <button
              type="button"
              className="btn btn--ad-double gameend__btn"
              onClick={doubleLastReward}
              onMouseDown={(e) => e.preventDefault()}
              disabled={doublingAd}
            >
              <span className="btn-ad__label">
                <span>{doublingAd ? 'Реклама…' : 'Удвоить награду'}</span>
                {!doublingAd && <span className="btn-ad__hint">+{lastEarned}</span>}
              </span>
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
            <span>Играем дальше</span>
          </button>
        </div>
      </div>
    </div>
  );
}
