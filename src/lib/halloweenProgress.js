import { HW_RIDDLES, HW_TRACK } from '../data/halloween.js';

// Прогресс ивента «Ночь тыкв» — чистые функции без React и хранилища, чтобы
// их можно было проверить в node (scripts/test-halloween.mjs). Состояние
// лежит в stats.halloween и уезжает в облако вместе с остальным прогрессом.
//
//   pumpkins — собрано тыкв за всё время (шкала тропы, не валюта)
//   solved   — разгадано загадок
//   firstTry — из них с первой попытки
//   seen     — слова колоды, уже сыгранные в этом круге
//   rewards  — id выданных ступеней тропы

export const HW_DEFAULT = { pumpkins: 0, solved: 0, firstTry: 0, seen: [], rewards: [] };

export function normalizeHalloween(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  return {
    pumpkins: n(r.pumpkins),
    solved: n(r.solved),
    firstTry: n(r.firstTry),
    seen: list(r.seen),
    rewards: list(r.rewards)
  };
}

// С 1–2 попыток — 3 тыквы, с 3–4 — 2, с 5–6 — 1.
export const pumpkinsFor = (attempts) => (attempts <= 2 ? 3 : attempts <= 4 ? 2 : 1);

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
  const got = new Set(hw.rewards);
  return HW_TRACK.filter((s) => s.need <= hw.pumpkins && !got.has(s.id));
}

// Итог партии в режиме. Слово помечается сыгранным при любом исходе — иначе
// проигранная загадка возвращалась бы следующей же. Когда круг пройден
// целиком, seen начинается заново с этого слова.
export function applyHalloweenResult(raw, { won, attempts, word }) {
  const hw = normalizeHalloween(raw);
  const gained = won ? pumpkinsFor(attempts) : 0;
  const allSeen = HW_RIDDLES.every((r) => r.word === word || hw.seen.includes(r.word));
  const seen = allSeen ? [word] : (hw.seen.includes(word) ? hw.seen : [...hw.seen, word]);
  const next = {
    ...hw,
    pumpkins: hw.pumpkins + gained,
    solved: hw.solved + (won ? 1 : 0),
    firstTry: hw.firstTry + (won && attempts === 1 ? 1 : 0),
    seen
  };
  const newSteps = dueSteps(next);
  next.rewards = [...next.rewards, ...newSteps.map((s) => s.id)];
  return { next, gained, newSteps };
}

// Слияние местного и облачного снимков: числа — по максимуму, списки —
// объединением (см. utils/mergeProgress.js — те же правила для остального).
export function mergeHalloween(a, b) {
  if (!a && !b) return undefined;
  const x = normalizeHalloween(a);
  const y = normalizeHalloween(b);
  const union = (p, q) => [...new Set([...p, ...q])];
  return {
    pumpkins: Math.max(x.pumpkins, y.pumpkins),
    solved: Math.max(x.solved, y.solved),
    firstTry: Math.max(x.firstTry, y.firstTry),
    seen: union(x.seen, y.seen),
    rewards: union(x.rewards, y.rewards)
  };
}

// Выданные ступени тропы → предметы во владении. Версия игры без ивента
// (старый клиент, боевая сборка до слияния) выбрасывает незнакомые id нарядов
// из гардероба, а запись о выдаче в halloween.rewards переживает её — по ней
// наряды и стиль клеток возвращаются. Ничего не надевает и не включает.
export function restoreTrackGrants(stats) {
  const got = stats?.halloween?.rewards;
  if (!Array.isArray(got) || got.length === 0) return stats;
  let pet = stats.pet;
  let inventory = stats.inventory;
  for (const s of HW_TRACK) {
    if (!got.includes(s.id)) continue;
    if (s.kind === 'deco' && pet && !(pet.ownedDecorations || []).includes(s.ref)) {
      pet = { ...pet, ownedDecorations: [...(pet.ownedDecorations || []), s.ref] };
    }
    if (s.kind === 'cells' && !(inventory || []).includes(s.ref)) {
      inventory = [...(inventory || []), s.ref];
    }
  }
  return pet === stats.pet && inventory === stats.inventory ? stats : { ...stats, pet, inventory };
}

// Следующая невыданная ступень — для шкал «ещё N 🎃 до …».
export function nextStep(hw) {
  const got = new Set(normalizeHalloween(hw).rewards);
  return HW_TRACK.find((s) => !got.has(s.id)) || null;
}
