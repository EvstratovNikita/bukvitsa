import { useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS, PET_UNLOCK_GAMES, isFreeStartGame } from '../../constants/game.js';
import { plural } from '../../utils/plural.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { BoltIcon, CoinIcon, PlayIcon, RefreshIcon, ShareIcon } from '../icons/Icon.jsx';
import { SHARE_BASE_URL, buildWordleShareText, share } from '../../lib/share.js';
import { getDailyNumber } from '../../data/dailyWord.js';
import { HwRoundResult } from '../Halloween/HalloweenGame.jsx';

// Bottom panel that swaps in for the keyboard once a round ends. Vertical
// stack on the left (title + word + reward lines); action buttons on the
// right. Daily mode adds a share-grid button; его кнопка тоже начинает
// обычную партию, поэтому и подписана одинаково — «Новая игра» с ценой.
// Раньше там было «К играм»: игрок читал это как «выйти», а с него молча
// списывалась энергия за новую партию.
export function EndPanel() {
  const {
    status, reset, solution, evaluations, guesses,
    lastEarned, lastEarnedBase, lastEarnedDeco, boostedLastWin,
    doubledLastWin, doublingAd, doubleLastReward, adsDoubleLeft,
    gameMode, exitDailyMode, wordLength, stats,
    exitHalloween, nextHalloweenRiddle, riddle,
    showToast
  } = useGameContext();
  const [shareStatus, setShareStatus] = useState(null);
  if (status === GAME_STATUS.PLAYING) return null;
  const isWin = status === GAME_STATUS.WON;
  const isDaily = gameMode === 'daily';
  const isHw = gameMode === 'halloween';
  const isAlt = !isDaily && !isHw && wordLength !== 5;
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
  // Цель на виду: сколько партий осталось до Букли. Питомец — главная фишка,
  // и новичок должен видеть, что до неё рукой подать.
  const played = stats?.played || 0;
  const petLeft = stats?.pet?.hatched ? 0 : Math.max(0, PET_UNLOCK_GAMES - played);
  const petReady = !stats?.pet?.hatched && played >= PET_UNLOCK_GAMES;
  const showPet = !isAlt && !isHw && (petLeft > 0 || petReady);
  // Первые партии новичка бесплатны (VK и Яндекс) — так и пишем на кнопке.
  const freeNext = isFreeStartGame(stats);

  const onShare = async () => {
    const url = SHARE_BASE_URL;
    const text = buildWordleShareText(
      evaluations || [],
      isWin ? (guesses?.length || 0) : 0,
      MAX_ATTEMPTS,
      dayN,
      url
    );
    // На vk.com окно VK шлёт только ссылку — сетка уходит в буфер, и
    // подсказка висит, пока игрок пишет сообщение.
    const r = await share({
      title: 'Буклица — Слово дня', text, url,
      onCopied: () => showToast?.('Сетка скопирована — вставь её в сообщение', 5000)
    });
    setShareStatus(r);
    setTimeout(() => setShareStatus(null), 1600);
  };

  return (
    <div className="end-panel" role="region" aria-label="Конец раунда">
      <div className="end-panel__inner">
        <div className="end-panel__meta">
          <div className="end-panel__title">
            {isHw
              ? (isWin ? '🎃 Разгадано!' : '🕯️ Не разгадано')
              : <>{isDaily && '📅 '}{isWin ? '🎉 Победа!' : '😕 Не угадал'}</>}
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
              ) : (lastEarnedDeco > 0 || boostedLastWin) ? (
                <div className="end-panel__breakdown">
                  Базовая {lastEarnedBase}
                  {lastEarnedDeco > 0 && <> + от Букли {lastEarnedDeco}</>}
                  {boostedLastWin && <>, всё ×2 по бонусу</>}
                </div>
              ) : null}
            </>
          )}
          {isHw && !isWin && riddle && (
            <div className="end-panel__breakdown">{riddle.riddle}</div>
          )}
          {isHw && <HwRoundResult compact />}
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
        {showPet && (
            <div className="end-panel__alt end-panel__pet">
              {!petReady && (
                <div className="end-panel__alt-bar" aria-hidden="true">
                  {Array.from({ length: PET_UNLOCK_GAMES }, (_, i) => (
                    <span key={i} className={`end-panel__alt-pip end-panel__pet-pip${i < played ? ' end-panel__alt-pip--on' : ''}`} />
                  ))}
                </div>
              )}
              <div className="end-panel__alt-text">
                {petReady
                  ? <>🥚 Яйцо Букли готово — загляни в дупло!</>
                  : <>🥚 До питомца Букли ещё <b>{petLeft}</b> {plural(petLeft, 'партия', 'партии', 'партий')}</>}
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
          {isHw ? (
            <>
              <button
                type="button"
                className="btn btn--ghost end-panel__double"
                onClick={exitHalloween}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span>К обычной игре</span>
              </button>
              <button
                type="button"
                className="btn btn--primary end-panel__cta hw-next-btn"
                onClick={nextHalloweenRiddle}
                onMouseDown={(e) => e.preventDefault()}
              >
                <RefreshIcon />
                <span>Следующая загадка</span>
              </button>
            </>
          ) : (
          <button
            type="button"
            className="btn btn--primary end-panel__cta"
            onClick={isDaily ? exitDailyMode : reset}
            onMouseDown={(e) => e.preventDefault()}
          >
            <RefreshIcon />
            <span>Новая игра</span>
            {/* Цена партии прямо на кнопке: 5 букв стоят энергию, 4 и 6 — нет.
                Без неё списание выглядело как «энергия ушла сама». */}
            {wordLength === 5 && (freeNext
              ? <span className="end-panel__cost end-panel__cost--free">бесплатно</span>
              : <span className="end-panel__cost"><BoltIcon />1</span>)}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
