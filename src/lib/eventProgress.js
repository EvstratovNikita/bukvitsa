import { EVENT_DEFS, eventItems, trackMax } from '../data/events/index.js';

// Прогресс сезонного ивента — чистые функции без React и хранилища (их
// проверяют scripts/test-events.mjs и test-halloween.mjs). Состояние лежит в
// stats[def.id] и уезжает в облако вместе с остальным прогрессом.
//
//   earned   — единиц (тыкв, снежинок) за ивент: шкала ленты, не тратится
//   dayKey / dayEarned — сколько заработано сегодня (дневной лимит)
//   solved   — разгадано загадок, firstTry — из них с первой попытки
//   seen     — слова колоды, уже сыгранные в этом круге
//   steps    — id выданных ступеней ленты
//   bought   — id полученных предметов (по ним полученное восстанавливается,
//              если версия без ивента его выбросила)
//   iceWins / iceBest — только у ивентов с «Ледяной гонкой»: побед в гонке и
//              лучший запас свободных строк
//   pumpkins — только у Хэллоуина: то же earned, поле осталось от версии с лавкой

const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const union = (p, q) => [...new Set([...p, ...q])];

export function defaultState(def) {
  const st = { earned: 0, dayKey: null, dayEarned: 0, solved: 0, firstTry: 0, seen: [], steps: [], bought: [] };
  if (def.legacy?.pumpkins) st.pumpkins = 0;
  if (def.ice) Object.assign(st, { iceWins: 0, iceBest: 0 });
  return st;
}

export function normalize(def, raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const legacySteps = def.legacy?.steps || {};
  const legacy = list(r.rewards).map((id) => legacySteps[id]).filter(Boolean);
  // В версии Хэллоуина с лавкой pumpkins уменьшались при покупке, earned — нет.
  const earned = Math.max(n(r.earned), def.legacy?.pumpkins ? n(r.pumpkins) : 0);
  const st = {
    earned,
    dayKey: typeof r.dayKey === 'string' ? r.dayKey : null,
    dayEarned: n(r.dayEarned),
    solved: n(r.solved),
    firstTry: n(r.firstTry),
    seen: list(r.seen),
    steps: list(r.steps),
    bought: union(list(r.bought), legacy)
  };
  if (def.legacy?.pumpkins) st.pumpkins = earned;
  if (def.ice) Object.assign(st, { iceWins: n(r.iceWins), iceBest: n(r.iceBest) });
  return st;
}

// Сколько единиц уже заработано сегодня (со сменой дня — ноль).
export const earnedToday = (st, today) => (st?.dayKey === today ? (st.dayEarned || 0) : 0);

// Следующая ещё не открытая ступень ленты (null — лента пройдена).
export const nextStep = (def, st) => def.track.find((s) => s.need > (st?.earned || 0)) || null;

// Лента пройдена — единицы больше не копятся (победа даёт опыт Букле, useGame).
export const trackDone = (def, st) => (st?.earned || 0) >= trackMax(def);

// Следующая загадка: первая по колоде, которой нет в seen. Колода кончилась —
// круг заново (seenReset). exclude — слово, которое только что сыграли: на
// стыке кругов оно не должно выпасть второй раз подряд.
export function nextRiddle(def, seen, exclude = null) {
  const have = new Set(Array.isArray(seen) ? seen : []);
  const fresh = def.riddles.find((r) => !have.has(r.word) && r.word !== exclude);
  if (fresh) return { entry: fresh, seenReset: false };
  const entry = def.riddles.find((r) => r.word !== exclude) || def.riddles[0];
  return { entry, seenReset: true };
}

// Ступени, которые положены при таком earned, но ещё не выданы.
export function dueSteps(def, st) {
  const got = new Set(st.steps);
  return def.track.filter((s) => s.need <= st.earned && !got.has(s.id));
}

// Итог партии. Слово помечается сыгранным при любом исходе — иначе
// проигранная загадка возвращалась бы следующей же. Единицы — с учётом
// дневного лимита и конца ленты: capped — сегодня (или вообще) больше не дадут.
// ice — партия в «Ледяной гонке», iceLeft — сколько строк осталось свободными
// при победе. newSteps — ступени, открытые этой победой: награды выдаёт useStats.
export function applyResult(def, raw, { won, attempts, word, today, ice = false, iceLeft = 0 }) {
  const st = normalize(def, raw);
  const max = trackMax(def);
  const sofar = earnedToday(st, today);
  const room = Math.max(0, Math.min(def.dailyCap - sofar, max - st.earned));
  const gained = won ? Math.min(def.unitsFor(attempts, { ice }), room) : 0;
  const allSeen = def.riddles.every((r) => r.word === word || st.seen.includes(r.word));
  const seen = allSeen ? [word] : (st.seen.includes(word) ? st.seen : [...st.seen, word]);
  const next = {
    ...st,
    earned: st.earned + gained,
    dayKey: today,
    dayEarned: sofar + gained,
    solved: st.solved + (won ? 1 : 0),
    firstTry: st.firstTry + (won && attempts === 1 ? 1 : 0),
    seen
  };
  if (def.legacy?.pumpkins) next.pumpkins = next.earned;
  if (def.ice && ice && won) {
    next.iceWins = st.iceWins + 1;
    next.iceBest = Math.max(st.iceBest, n(iceLeft));
  }
  const newSteps = dueSteps(def, next);
  next.steps = [...next.steps, ...newSteps.map((s) => s.id)];
  next.bought = union(next.bought, newSteps.filter((s) => s.ref).map((s) => s.ref));
  const capped = won && (sofar + gained >= def.dailyCap || next.earned >= max);
  return { next, gained, capped, newSteps };
}

// Слияние местного и облачного снимков: числа — по максимуму (как монеты в
// mergeProgress), дневной счётчик — по последнему дню, списки — объединением.
export function merge(def, a, b) {
  if (!a && !b) return undefined;
  const x = normalize(def, a);
  const y = normalize(def, b);
  const dayKey = [x.dayKey, y.dayKey].filter(Boolean).sort().pop() || null;
  const dayOf = (h) => (h.dayKey === dayKey ? h.dayEarned : 0);
  const earned = Math.max(x.earned, y.earned);
  const out = {
    earned,
    dayKey,
    dayEarned: Math.max(dayOf(x), dayOf(y)),
    solved: Math.max(x.solved, y.solved),
    firstTry: Math.max(x.firstTry, y.firstTry),
    seen: union(x.seen, y.seen),
    steps: union(x.steps, y.steps),
    bought: union(x.bought, y.bought)
  };
  if (def.legacy?.pumpkins) out.pumpkins = earned;
  if (def.ice) Object.assign(out, { iceWins: Math.max(x.iceWins, y.iceWins), iceBest: Math.max(x.iceBest, y.iceBest) });
  return out;
}

// Полученное на лентах всех ивентов → предметы во владении. Версия игры без
// ивента (старый клиент) выбрасывает незнакомые id нарядов из гардероба, а
// запись в stats[id].bought переживает её — по ней наряды, фоны и стиль клеток
// возвращаются. Ничего не надевает и не включает.
export function restoreEventItems(stats) {
  if (!stats) return stats;
  let pet = stats.pet;
  let inventory = stats.inventory;
  for (const def of EVENT_DEFS) {
    const got = stats[def.id]?.bought;
    if (!Array.isArray(got) || got.length === 0) continue;
    for (const e of eventItems(def)) {
      if (!got.includes(e.ref)) continue;
      if (e.kind === 'deco' && pet && !(pet.ownedDecorations || []).includes(e.ref)) {
        pet = { ...pet, ownedDecorations: [...(pet.ownedDecorations || []), e.ref] };
      }
      if (e.kind === 'shop' && !(inventory || []).includes(e.ref)) {
        inventory = [...(inventory || []), e.ref];
      }
    }
  }
  return pet === stats.pet && inventory === stats.inventory ? stats : { ...stats, pet, inventory };
}
