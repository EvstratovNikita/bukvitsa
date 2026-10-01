import { HW_DAILY_CAP, HW_ITEMS, HW_RIDDLES, HW_TRACK } from '../data/halloween.js';

// Прогресс ивента «Ночь тыкв» — чистые функции без React и хранилища, чтобы
// их можно было проверить в node (scripts/test-halloween.mjs). Состояние
// лежит в stats.halloween и уезжает в облако вместе с остальным прогрессом.
//
//   earned   — тыкв заработано за ивент (шкала ленты, не тратится)
//   pumpkins — то же число; поле осталось от версии с лавкой
//   dayKey / dayEarned — сколько заработано сегодня (дневной лимит)
//   solved   — разгадано загадок, firstTry — из них с первой попытки
//   seen     — слова колоды, уже сыгранные в этом круге
//   steps    — id выданных ступеней ленты
//   bought   — id полученных предметов ивента (по ним полученное и
//              восстанавливается, если версия без ивента его выбросила)

export const HW_DEFAULT = {
  pumpkins: 0, earned: 0, dayKey: null, dayEarned: 0,
  solved: 0, firstTry: 0, seen: [], steps: [], bought: []
};

// Самая первая заготовка выдавала предметы ступенями «тропы» (rewards hw-t*).
// Такие сохранения есть только у тестировщиков; выданное считаем полученным.
const LEGACY_STEPS = {
  'hw-t1': 'hw-pumpkin', 'hw-t2': 'hw-batglasses', 'hw-t3': 'cells-hw-lights',
  'hw-t4': 'hw-lantern', 'hw-t6': 'hw-witchhat'
};

export function normalizeHalloween(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const legacy = list(r.rewards).map((id) => LEGACY_STEPS[id]).filter(Boolean);
  // В версии с лавкой pumpkins уменьшались при покупке, earned — нет.
  const earned = Math.max(n(r.earned), n(r.pumpkins));
  return {
    pumpkins: earned,
    earned,
    dayKey: typeof r.dayKey === 'string' ? r.dayKey : null,
    dayEarned: n(r.dayEarned),
    solved: n(r.solved),
    firstTry: n(r.firstTry),
    seen: list(r.seen),
    steps: list(r.steps),
    bought: [...new Set([...list(r.bought), ...legacy])]
  };
}

// С 1–2 попыток — 3 тыквы, с 3–4 — 2, с 5–6 — 1.
export const pumpkinsFor = (attempts) => (attempts <= 2 ? 3 : attempts <= 4 ? 2 : 1);

// Сколько тыкв уже заработано сегодня (со сменой дня — ноль).
export const earnedToday = (hw, today) => (hw?.dayKey === today ? (hw.dayEarned || 0) : 0);

// Следующая ещё не открытая ступень ленты (null — лента пройдена).
export const nextStep = (hw) => HW_TRACK.find((s) => s.need > (hw?.earned || 0)) || null;

// Следующая загадка: первая по колоде, которой нет в seen. Колода кончилась —
// круг заново (seenReset). exclude — слово, которое только что сыграли: на
// стыке кругов оно не должно выпасть второй раз подряд.
export function nextRiddle(seen, exclude = null) {
  const have = new Set(Array.isArray(seen) ? seen : []);
  const fresh = HW_RIDDLES.find((r) => !have.has(r.word) && r.word !== exclude);
  if (fresh) return { entry: fresh, seenReset: false };
  const entry = HW_RIDDLES.find((r) => r.word !== exclude) || HW_RIDDLES[0];
  return { entry, seenReset: true };
}

// Ступени, которые положены при таком числе тыкв, но ещё не выданы.
export function dueSteps(hw) {
  const got = new Set(hw.steps);
  return HW_TRACK.filter((s) => s.need <= hw.earned && !got.has(s.id));
}

// Итог партии в режиме. Слово помечается сыгранным при любом исходе — иначе
// проигранная загадка возвращалась бы следующей же. Тыквы — с учётом
// дневного лимита: capped — лимит на сегодня исчерпан этой или прошлой победой.
// newSteps — ступени, открытые этой победой: их награды выдаёт useStats.
export function applyHalloweenResult(raw, { won, attempts, word, today }) {
  const hw = normalizeHalloween(raw);
  const sofar = earnedToday(hw, today);
  const room = Math.max(0, HW_DAILY_CAP - sofar);
  const gained = won ? Math.min(pumpkinsFor(attempts), room) : 0;
  const allSeen = HW_RIDDLES.every((r) => r.word === word || hw.seen.includes(r.word));
  const seen = allSeen ? [word] : (hw.seen.includes(word) ? hw.seen : [...hw.seen, word]);
  const next = {
    ...hw,
    pumpkins: hw.earned + gained,
    earned: hw.earned + gained,
    dayKey: today,
    dayEarned: sofar + gained,
    solved: hw.solved + (won ? 1 : 0),
    firstTry: hw.firstTry + (won && attempts === 1 ? 1 : 0),
    seen
  };
  const newSteps = dueSteps(next);
  next.steps = [...next.steps, ...newSteps.map((s) => s.id)];
  next.bought = [...new Set([...next.bought, ...newSteps.filter((s) => s.ref).map((s) => s.ref)])];
  return { next, gained, capped: won && sofar + gained >= HW_DAILY_CAP, newSteps };
}

// Слияние местного и облачного снимков: числа — по максимуму (как монеты в
// mergeProgress), дневной счётчик — по последнему дню, списки — объединением.
export function mergeHalloween(a, b) {
  if (!a && !b) return undefined;
  const x = normalizeHalloween(a);
  const y = normalizeHalloween(b);
  const union = (p, q) => [...new Set([...p, ...q])];
  const dayKey = [x.dayKey, y.dayKey].filter(Boolean).sort().pop() || null;
  const dayOf = (h) => (h.dayKey === dayKey ? h.dayEarned : 0);
  const earned = Math.max(x.earned, y.earned);
  return {
    pumpkins: earned,
    earned,
    dayKey,
    dayEarned: Math.max(dayOf(x), dayOf(y)),
    solved: Math.max(x.solved, y.solved),
    firstTry: Math.max(x.firstTry, y.firstTry),
    seen: union(x.seen, y.seen),
    steps: union(x.steps, y.steps),
    bought: union(x.bought, y.bought)
  };
}

// Полученное на ленте → предметы во владении. Версия игры без ивента (старый
// клиент, боевая сборка до слияния) выбрасывает незнакомые id нарядов из
// гардероба, а запись в halloween.bought переживает её — по ней наряды, фоны
// и стиль клеток возвращаются. Ничего не надевает и не включает.
export function restoreEventItems(stats) {
  const got = stats?.halloween?.bought;
  if (!Array.isArray(got) || got.length === 0) return stats;
  let pet = stats.pet;
  let inventory = stats.inventory;
  for (const e of HW_ITEMS) {
    if (!got.includes(e.ref)) continue;
    if (e.kind === 'deco' && pet && !(pet.ownedDecorations || []).includes(e.ref)) {
      pet = { ...pet, ownedDecorations: [...(pet.ownedDecorations || []), e.ref] };
    }
    if (e.kind === 'shop' && !(inventory || []).includes(e.ref)) {
      inventory = [...(inventory || []), e.ref];
    }
  }
  return pet === stats.pet && inventory === stats.inventory ? stats : { ...stats, pet, inventory };
}
