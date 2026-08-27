// Слияние двух снимков прогресса — местного и облачного.
//
// Зачем. На Играх Яндекса у гостя (режим lite) своё хранилище, а у аккаунта —
// своё. При входе в аккаунт посреди игры мы раньше просто заливали в него
// текущий снимок (`cloudSave(stats)`) — и если на аккаунте уже был прогресс,
// он стирался начисто. Обратная крайность — «облако всегда главнее» — так же
// молча съедала всё, что игрок наиграл гостем.
//
// Поэтому: НИЧЕГО НЕ ТЕРЯЕМ И НИЧЕГО НЕ ДУБЛИРУЕМ. Счётчики берём по
// максимуму (не суммируем — иначе после каждого входа монеты бы удваивались),
// рекорды — по минимуму, коллекции — объединением. Функция симметрична:
// mergeProgress(a, b) и mergeProgress(b, a) дают одно и то же, кроме
// косметики, которая по правилам проекта клиент-авторитетна и берётся из `a`.

// Больше — лучше: накопительные счётчики и балансы.
const MAX_KEYS = [
  'played', 'won', 'lost', 'totalGuesses', 'maxStreak', 'currentStreak',
  'coins', 'coinsEarned', 'dailyStreak', 'hintsUsed', 'itemsBought',
  'referralsCount', 'adBonusLeft'
];
// Меньше — лучше: рекорды.
const MIN_KEYS = ['bestAttempts', 'fastestWinMs'];
// Списки id: объединяем, порядок первого снимка сохраняем.
const UNION_KEYS = ['inventory', 'unlockedAchievements'];
// Моменты времени в ISO: берём поздний.
const LATER_ISO_KEYS = ['boostDoubleUntil', 'energyCapUntil', 'lastVisitDate'];

const num = (v) => (Number.isFinite(v) ? v : null);

const maxNum = (x, y) => {
  const a = num(x); const b = num(y);
  if (a == null) return b == null ? undefined : b;
  return b == null ? a : Math.max(a, b);
};

const minNum = (x, y) => {
  const a = num(x); const b = num(y);
  if (a == null) return b == null ? undefined : b;
  return b == null ? a : Math.min(a, b);
};

const union = (x, y) => {
  const out = [];
  for (const v of [...(Array.isArray(x) ? x : []), ...(Array.isArray(y) ? y : [])]) {
    if (!out.includes(v)) out.push(v);
  }
  return out;
};

// Строки-даты сравнимы лексикографически: и ISO, и 'YYYY-MM-DD'.
const later = (x, y) => {
  if (!x) return y || undefined;
  if (!y) return x;
  return x >= y ? x : y;
};

const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// Суточные счётчики-ограничители (реклама, режимы). Свежий день побеждает —
// иначе вчерашний лимит остался бы висеть на сегодня. В один и тот же день
// берём больший счётчик: это консервативно, зато вход в аккаунт не
// превращается в способ обнулить дневной лимит.
function mergeDayCounter(a, b, keyName, counterKeys) {
  if (!isObj(a)) return isObj(b) ? b : undefined;
  if (!isObj(b)) return a;
  const ka = a[keyName] || '';
  const kb = b[keyName] || '';
  if (ka !== kb) return ka >= kb ? a : b;
  const out = { ...a };
  for (const k of counterKeys) out[k] = maxNum(a[k], b[k]) ?? 0;
  return out;
}

function mergePet(a, b) {
  if (!isObj(a)) return isObj(b) ? b : undefined;
  if (!isObj(b)) return a;
  // Ведущим берём того питомца, кого дольше растили.
  const [lead, other] = (num(a.xp) || 0) >= (num(b.xp) || 0) ? [a, b] : [b, a];
  const lastTrainAt = { ...(other.lastTrainAt || {}), ...(lead.lastTrainAt || {}) };
  for (const k of Object.keys(other.lastTrainAt || {})) {
    lastTrainAt[k] = later(lead.lastTrainAt?.[k], other.lastTrainAt[k]);
  }
  return {
    ...lead,
    // Вылупившегося питомца обратно в яйцо не возвращаем.
    hatched: Boolean(a.hatched || b.hatched),
    bornAt: later(a.bornAt, b.bornAt) === a.bornAt ? (a.bornAt || b.bornAt) : (b.bornAt || a.bornAt),
    xp: maxNum(a.xp, b.xp) ?? 0,
    level: maxNum(a.level, b.level) ?? 1,
    ownedDecorations: union(a.ownedDecorations, b.ownedDecorations),
    lastTrainAt
  };
}

function mergePrefs(a, b) {
  const pa = isObj(a) ? a : {};
  const pb = isObj(b) ? b : {};
  return {
    // Косметика (тема, обои по темам, раскладка) — клиент-авторитетна:
    // ключи `a` перекрывают облачные, но недостающие берём оттуда.
    ...pb,
    ...pa,
    petGifts: union(pa.petGifts, pb.petGifts),
    petBond: maxNum(pa.petBond, pb.petBond) ?? 0,
    petBondTickAt: later(pa.petBondTickAt, pb.petBondTickAt),
    // Обучение проходят один раз на игрока, а не на устройство.
    tourDone: Boolean(pa.tourDone || pb.tourDone)
  };
}

function mergeDaily(a, b) {
  if (!isObj(a)) return isObj(b) ? b : undefined;
  if (!isObj(b)) return a;
  const fresh = (a.lastPlayedKey || '') >= (b.lastPlayedKey || '') ? a : b;
  return {
    ...fresh,
    lastPlayedKey: later(a.lastPlayedKey, b.lastPlayedKey),
    streak: maxNum(a.streak, b.streak) ?? 0,
    maxStreak: maxNum(a.maxStreak, b.maxStreak) ?? 0,
    gamesPlayed: maxNum(a.gamesPlayed, b.gamesPlayed) ?? 0,
    gamesWon: maxNum(a.gamesWon, b.gamesWon) ?? 0,
    lastResult: fresh.lastResult ?? a.lastResult ?? b.lastResult ?? null
  };
}

/**
 * Сливает два снимка статистики. `a` — местный (его косметика главнее),
 * `b` — облачный. Любой из них может быть null/пустым.
 */
export function mergeProgress(a, b) {
  if (!isObj(a)) return isObj(b) ? { ...b } : null;
  if (!isObj(b)) return { ...a };

  const out = { ...b, ...a };

  for (const k of MAX_KEYS) {
    const v = maxNum(a[k], b[k]);
    if (v !== undefined) out[k] = v;
  }
  for (const k of MIN_KEYS) {
    const v = minNum(a[k], b[k]);
    if (v !== undefined) out[k] = v;
  }
  for (const k of UNION_KEYS) out[k] = union(a[k], b[k]);
  for (const k of LATER_ISO_KEYS) {
    const v = later(a[k], b[k]);
    if (v !== undefined) out[k] = v;
  }

  // Энергия и якорь её восстановления — одна пара, и берётся она по
  // МЕНЬШЕМУ запасу. Максимум сделал бы вход бесплатной заправкой: у чистой
  // установки энергия полная, и любой сброс данных с последующим входом
  // возвращал бы 5/5. Потраченная на аккаунте энергия — настоящая, поэтому
  // выигрывает она, а вместе с ней едет и её якорь: иначе счётчик «+1 через»
  // отсчитывался бы от чужого момента и показывал полный час на ровном месте.
  const ea = num(a.energy);
  const eb = num(b.energy);
  if (ea != null || eb != null) {
    const takeA = eb == null || (ea != null && ea <= eb);
    out.energy = takeA ? ea : eb;
    out.lastEnergyTickAt = (takeA ? a.lastEnergyTickAt : b.lastEnergyTickAt)
      || later(a.lastEnergyTickAt, b.lastEnergyTickAt);
  }

  // Распределение попыток — поклеточный максимум.
  const da = Array.isArray(a.distribution) ? a.distribution : [];
  const db = Array.isArray(b.distribution) ? b.distribution : [];
  const len = Math.max(da.length, db.length);
  if (len) {
    out.distribution = Array.from({ length: len }, (_, i) => maxNum(da[i], db[i]) ?? 0);
  }

  out.prefs = mergePrefs(a.prefs, b.prefs);
  out.pet = mergePet(a.pet, b.pet);
  out.daily = mergeDaily(a.daily, b.daily);
  out.altMode = mergeDayCounter(a.altMode, b.altMode, 'dayKey', ['plays', 'energyGranted']);
  out.adsDouble = mergeDayCounter(a.adsDouble, b.adsDouble, 'dayKey', ['count']);
  out.adEnergy = mergeDayCounter(a.adEnergy, b.adEnergy, 'dayKey', ['count']);

  return out;
}

/** Есть ли в снимке хоть какой-то прогресс (для решений «сливать или нет»). */
export function hasProgress(s) {
  if (!isObj(s)) return false;
  return (s.played || 0) > 0 ||
    (s.coinsEarned || 0) > 0 ||
    (s.dailyStreak || 0) > 0 ||
    (Array.isArray(s.inventory) && s.inventory.length > 0) ||
    (Array.isArray(s.unlockedAchievements) && s.unlockedAchievements.length > 0) ||
    Boolean(s.pet?.hatched);
}
