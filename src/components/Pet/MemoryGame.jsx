import { useEffect, useMemo, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';

// 8 pairs → 16 cards. Pet-themed icons stay visually distinct and don't
// lean on the Cyrillic alphabet (which would feel like a Wordle session).
const SYMBOLS = ['🪶', '🌙', '⭐', '🔮', '💎', '🍎', '🌸', '🐛'];
const FLIP_BACK_MS = 800;
const MATCH_HOLD_MS = 240;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newDeck() {
  return shuffle(
    SYMBOLS.flatMap((s, idx) => [
      { id: `${idx}-a`, symbol: s, matched: false, flipped: false },
      { id: `${idx}-b`, symbol: s, matched: false, flipped: false }
    ])
  );
}

function formatMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pluralMoves(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'ход';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'хода';
  return 'ходов';
}

// Mini-game: 4×4 memory — tap two cards, match the pair. Time-based reward
// (XP for the pet + a small coin drop). Win the round and the player can
// instantly replay for more XP.
export function MemoryGame() {
  const { recordPetXp, addCoins, showToast } = useGameContext();
  const [cards, setCards] = useState(newDeck);
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  // Wall-clock tick so the timer reads as continuous without re-rendering
  // on every animation frame.
  const [, setTick] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Live ticker — only runs while a round is in progress.
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [startedAt, finishedAt]);

  // Pair check after both flips. Match → mark both as matched. Mismatch →
  // flip both back to face-down. Resets first/second so the next tap starts
  // a new attempt.
  useEffect(() => {
    if (first == null || second == null) return;
    const a = cards[first];
    const b = cards[second];
    if (a.symbol === b.symbol) {
      const t = setTimeout(() => {
        setCards((cs) => cs.map((c, i) =>
          i === first || i === second ? { ...c, matched: true } : c
        ));
        setFirst(null);
        setSecond(null);
      }, MATCH_HOLD_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCards((cs) => cs.map((c, i) =>
        i === first || i === second ? { ...c, flipped: false } : c
      ));
      setFirst(null);
      setSecond(null);
    }, FLIP_BACK_MS);
    return () => clearTimeout(t);
    // We intentionally don't depend on `cards` — pair resolution should
    // only re-run when first/second changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, second]);

  // Detect win — all cards matched.
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    if (cards.every((c) => c.matched)) {
      setFinishedAt(Date.now());
    }
  }, [cards, startedAt, finishedAt]);

  const elapsedMs = startedAt ? (finishedAt || Date.now()) - startedAt : 0;
  const won = finishedAt != null;

  // Reward formula: base 40 XP minus 1 XP per 3 seconds, floored at 15.
  // Coins scale with speed.
  const xpReward = useMemo(() => {
    if (!won) return 0;
    const sec = Math.floor(elapsedMs / 1000);
    return Math.max(15, 40 - Math.floor(sec / 3));
  }, [won, elapsedMs]);
  const coinReward = useMemo(() => {
    if (!won) return 0;
    const sec = Math.floor(elapsedMs / 1000);
    if (sec <= 30)  return 10;
    if (sec <= 60)  return 6;
    if (sec <= 120) return 3;
    return 1;
  }, [won, elapsedMs]);

  // Claim XP + coins once per finished round.
  useEffect(() => {
    if (!won || rewardClaimed) return;
    setRewardClaimed(true);
    const r = recordPetXp(xpReward);
    addCoins(coinReward);
    if (r?.levelAfter > r?.levelBefore) {
      showToast?.(`Букля выросла! Уровень ${r.levelAfter}`);
    }
  }, [won, rewardClaimed, xpReward, coinReward, recordPetXp, addCoins, showToast]);

  const busy = first != null && second != null;
  const onFlip = (i) => {
    if (busy || won) return;
    const c = cards[i];
    if (c.matched || c.flipped) return;
    if (!startedAt) setStartedAt(Date.now());
    setCards((cs) => cs.map((x, j) => (j === i ? { ...x, flipped: true } : x)));
    if (first == null) setFirst(i);
    else {
      setSecond(i);
      setMoves((m) => m + 1);
    }
  };

  const onReset = () => {
    setCards(newDeck());
    setFirst(null);
    setSecond(null);
    setMoves(0);
    setStartedAt(null);
    setFinishedAt(null);
    setRewardClaimed(false);
  };

  return (
    <div className="memory">
      <p className="pet-tab__hint">
        Открой две карточки. Совпали — остаются открытыми. Не совпали —
        переворачиваются. Собери все 8 пар за минимум времени!
      </p>

      <div className="memory__hud">
        <span className="memory__stat">⏱ <b>{formatMs(elapsedMs)}</b></span>
        <span className="memory__stat">Ходов: <b>{moves}</b></span>
      </div>

      <div className="memory__grid" role="grid">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={[
              'memory-card',
              c.flipped && 'memory-card--flipped',
              c.matched && 'memory-card--matched'
            ].filter(Boolean).join(' ')}
            onClick={() => onFlip(i)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={c.matched || won}
            aria-label={c.flipped ? c.symbol : 'Закрытая карточка'}
          >
            <span className="memory-card__inner">
              <span className="memory-card__face memory-card__face--back" aria-hidden="true">?</span>
              <span className="memory-card__face memory-card__face--front" aria-hidden="true">{c.symbol}</span>
            </span>
          </button>
        ))}
      </div>

      {won ? (
        <div className="memory__result">
          <div className="memory__result-title">🎉 Все пары собраны!</div>
          <div className="memory__result-stats">
            {formatMs(elapsedMs)} · {moves} {pluralMoves(moves)}
          </div>
          <div className="memory__result-rewards">
            <span className="memory__reward">+{xpReward} XP</span>
            <span className="memory__reward memory__reward--coin">+{coinReward}</span>
          </div>
          <button
            type="button"
            className="btn btn--primary memory__again"
            onClick={onReset}
            onMouseDown={(e) => e.preventDefault()}
          >
            Сыграть ещё
          </button>
        </div>
      ) : startedAt ? (
        <button
          type="button"
          className="btn btn--ghost memory__restart"
          onClick={onReset}
          onMouseDown={(e) => e.preventDefault()}
        >
          Перезапустить
        </button>
      ) : null}
    </div>
  );
}
