import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon } from '../icons/Icon.jsx';
import { isValidWord, pickRandomWord, normalizeWord } from '../../data/words.js';
import { tr } from '../../lib/lang.js';
import { gameNow } from '../../lib/gameClock.js';
import { Emoji, EmojiText } from '../icons/GameIcon.jsx';

const ROUND_MS = 60_000;
const XP_PER_WORD = 8;
// Опыт мини-игр урезан втрое, монеты вдвое — прежние награды были
// заметно щедрее всего остального в игре.
const XP_DIV = 3;

// Fisher-Yates shuffle with a guarantee that the result is NOT the source
// order (so we never serve a "scramble" that's already the answer).
function scramble(word) {
  const chars = [...word];
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = [...chars];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.join('') !== word) return a;
  }
  // Last resort: swap first two.
  return [chars[1], chars[0], ...chars.slice(2)];
}

function makeRound() {
  const word = normalizeWord(pickRandomWord());
  return { word, bank: scramble(word).map((ch, idx) => ({ id: `${idx}-${Math.random()}`, ch })) };
}

function isSameLocalDay(iso) {
  if (!iso) return false;
  const last = new Date(iso);
  const today = new Date();
  return last.getFullYear() === today.getFullYear()
      && last.getMonth() === today.getMonth()
      && last.getDate() === today.getDate();
}

// Anagram mini-game: 60s, assemble shuffled letters into the hidden word.
// Tap a bank letter → fills the next empty slot. Tap a filled slot → letter
// goes back to the bank. Once all 5 slots match the target the round
// auto-advances and the score ticks +1. Reward: XP_PER_WORD × solved
// + 1 coin per solved word, stamped on Букля for the day.
export function AnagramGame({ onExit }) {
  const { recordPetXp, addCoins, showToast, recordMiniGamePlay, stats } = useGameContext();
  const playedToday = isSameLocalDay(stats.pet?.lastTrainAt?.anagram);

  const [phase, setPhase] = useState('idle'); // 'idle' | 'playing' | 'done'
  const [round, setRound] = useState(makeRound);
  // slots[i] = { id, ch } | null. Bank tracks remaining letters.
  const [slots, setSlots] = useState(() => Array(round.word.length).fill(null));
  const [bank, setBank] = useState(round.bank);
  const [solved, setSolved] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [, setTick] = useState(0);
  const [shake, setShake] = useState(false);
  const [justSolved, setJustSolved] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Countdown ticker — 250ms so the timer reads smoothly without melting CPU.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [phase]);

  // End condition.
  const elapsed = startedAt ? gameNow() - startedAt : 0;
  const remaining = Math.max(0, ROUND_MS - elapsed);
  useEffect(() => {
    if (phase !== 'playing') return;
    if (remaining <= 0) setPhase('done');
  }, [phase, remaining]);

  // Load the next puzzle, keeping the score intact.
  const nextWord = useCallback(() => {
    const r = makeRound();
    setRound(r);
    setSlots(Array(r.word.length).fill(null));
    setBank(r.bank);
  }, []);

  // Check the slotted word every time it changes.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (slots.some((s) => !s)) return;
    const assembled = slots.map((s) => s.ch).join('');
    // Засчитываем любое настоящее слово из этих букв: LEAST, STEAL и SLATE одинаково
    // верны, и отказ в таком случае выглядел бы ошибкой игры.
    if (assembled === round.word || isValidWord(assembled, round.word.length)) {
      setSolved((n) => n + 1);
      setJustSolved(true);
      const t1 = setTimeout(() => setJustSolved(false), 320);
      const t2 = setTimeout(nextWord, 420);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    // Wrong assembly — shake + clear slots back to bank after the bounce.
    setShake(true);
    const t = setTimeout(() => {
      setBank((b) => [...b, ...slots.filter(Boolean)]);
      setSlots(Array(round.word.length).fill(null));
      setShake(false);
    }, 360);
    return () => clearTimeout(t);
  }, [slots, round.word, phase, nextWord]);

  // Tap-place letter from bank into next empty slot.
  const placeFromBank = (i) => {
    if (phase !== 'playing' || shake) return;
    const letter = bank[i];
    if (!letter) return;
    const slotIdx = slots.findIndex((s) => !s);
    if (slotIdx < 0) return;
    setBank((b) => b.filter((_, j) => j !== i));
    setSlots((s) => s.map((x, j) => (j === slotIdx ? letter : x)));
  };

  // Tap a filled slot → letter goes back to the bank.
  const returnFromSlot = (i) => {
    if (phase !== 'playing' || shake) return;
    const letter = slots[i];
    if (!letter) return;
    setSlots((s) => s.map((x, j) => (j === i ? null : x)));
    setBank((b) => [...b, letter]);
  };

  const onStart = () => {
    if (playedToday) return;
    const fresh = makeRound();
    setRound(fresh);
    setSlots(Array(fresh.word.length).fill(null));
    setBank(fresh.bank);
    setSolved(0);
    setStartedAt(gameNow());
    setPhase('playing');
    setRewardClaimed(false);
  };

  const onSkip = () => {
    if (phase !== 'playing') return;
    nextWord();
  };

  // Reshuffle current word's bank — same letters, different visual order.
  const onShuffleBank = () => {
    if (phase !== 'playing' || bank.length < 2) return;
    setBank((b) => {
      const a = [...b];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  };

  // Reward + cooldown stamp on finish.
  const xpReward = Math.round(solved * XP_PER_WORD / XP_DIV);
  // Монеты — половина от числа собранных слов (было 1:1).
  const coinReward = Math.round(solved / 2);
  useEffect(() => {
    if (phase !== 'done' || rewardClaimed) return;
    setRewardClaimed(true);
    if (solved > 0) {
      const r = recordPetXp(xpReward);
      addCoins(coinReward);
      if (r?.levelAfter > r?.levelBefore) {
        showToast?.(tr('Букля выросла! Уровень {levelAfter}', { levelAfter: r.levelAfter }));
      }
    }
    recordMiniGamePlay?.('anagram', xpReward, coinReward);
  }, [phase, rewardClaimed, solved, xpReward, coinReward, recordPetXp, addCoins, recordMiniGamePlay, showToast]);

  const remainSec = Math.ceil(remaining / 1000);

  if (playedToday && phase === 'idle') {
    return (
      <div className="anagram anagram--done">
        <p className="pet-tab__hint">{tr('На сегодня Букля уже потренировалась. Возвращайся завтра!')}</p>
      </div>
    );
  }

  if (phase === 'idle') {
    return (
      <div className="anagram">
        <p className="pet-tab__hint">{tr('У тебя одна минута. Перемешанные буквы — собери из них слово. Тапни букву внизу, чтобы поставить её в слот. Тапни слот, чтобы вернуть. Чем больше слов соберёшь — тем больше опыта и монет.')}</p>
        <button
          type="button"
          className="btn btn--primary anagram__start"
          onClick={onStart}
          onMouseDown={(e) => e.preventDefault()}
        >{tr('Начать (60 сек)')}</button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="anagram anagram--result">
        <div className="anagram__result-title"><EmojiText text={tr('⏱ Время вышло!')} /></div>
        <div className="anagram__result-stats">{tr('Слов угадано: ')}<b>{solved}</b>
        </div>
        <div className="anagram__result-rewards">
          <span className="memory__reward">+{xpReward} XP</span>
          <span className="memory__reward memory__reward--coin">
            <CoinIcon />
            +{coinReward}
          </span>
        </div>
        <p className="memory__cooldown-note">{tr('Возвращайся завтра — следующая тренировка после полуночи.')}</p>
        <button
          type="button"
          className="btn btn--primary memory__result-exit"
          onClick={onExit}
          onMouseDown={(e) => e.preventDefault()}
        >{tr('К списку игр')}</button>
      </div>
    );
  }

  // phase === 'playing'
  return (
    <div className={`anagram${shake ? ' anagram--shake' : ''}${justSolved ? ' anagram--solved' : ''}`}>
      <div className="anagram__hud">
        <span className="anagram__stat"><Emoji e="⏱" /> <b>{remainSec}</b>{tr(' сек')}</span>
        <span className="anagram__stat">{tr('Угадано: ')}<b>{solved}</b></span>
      </div>

      <div className="anagram__slots">
        {slots.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`anagram-slot${s ? ' anagram-slot--filled' : ''}`}
            onClick={() => returnFromSlot(i)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={s ? tr('Буква {ch}', { ch: s.ch }) : tr('Пустой слот {v0}', { v0: i + 1 })}
          >
            {s ? s.ch.toUpperCase() : ''}
          </button>
        ))}
      </div>

      <div className="anagram__bank">
        {bank.map((b, i) => (
          <button
            key={b.id}
            type="button"
            className="anagram-tile"
            onClick={() => placeFromBank(i)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={tr('Буква {ch}', { ch: b.ch })}
          >
            {b.ch.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="anagram__actions">
        <button
          type="button"
          className="btn btn--ghost anagram__action"
          onClick={onShuffleBank}
          onMouseDown={(e) => e.preventDefault()}
        ><EmojiText text={tr('🔀 Перемешать')} /></button>
        <button
          type="button"
          className="btn btn--ghost anagram__action"
          onClick={onSkip}
          onMouseDown={(e) => e.preventDefault()}
        >{tr('Пропустить →')}</button>
      </div>
    </div>
  );
}
