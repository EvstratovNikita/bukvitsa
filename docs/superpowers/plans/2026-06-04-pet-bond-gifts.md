# Привязанность Букли — коллекция подарков: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кормление питомца со временем копит «привязанность»; на максимуме Букля приносит эксклюзивный косметический подарок (коллекция), который игрок применяет вручную.

**Architecture:** Bond — клиент-авторитетное значение в `prefs` (`petBond`, `petBondTickAt`, `petGifts`), накапливается чистой time-based функцией по «времени сытости» (+1/5мин пока голод > 0). Подарки — расширяемый каталог косметики, применяются через существующие `activeBackground`/`activeCellStyle`. Без миграций БД; на reconcile синка `petGifts`/`petBond` мёржатся (union/max), чтобы не терялись при смене устройства.

**Tech Stack:** React 18 + Vite, plain CSS, существующие хуки `useStats`/`useShopTheme`. Тест-раннера в репозитории нет → чистую логику проверяем одноразовым Node-скриптом (`node scripts/...`), UI — `npm run build` + ручные проверки.

**Спека:** `docs/superpowers/specs/2026-06-04-pet-bond-gifts-design.md`

---

## Структура файлов

- **Создать** `src/utils/petBond.js` — чистые функции: `reconcileBond`, `mergeGiftProgress` + константы `BOND_PER_GIFT`, `BOND_MINUTES_PER_POINT`.
- **Создать** `src/data/petGifts.js` — каталог подарков + хелперы.
- **Создать** `scripts/verify-petbond.mjs` — одноразовая проверка чистой логики.
- **Изменить** `src/hooks/useStats.js` — `DEFAULT_STATS.prefs`, reconcile bond, flush, чекпойнт в `feedPet`, `claimPetGift`, экспорт.
- **Изменить** `src/hooks/useGame.js` — проброс новых полей в контекст.
- **Изменить** `src/hooks/useShopTheme.js` — резолвер косметики с учётом подарков.
- **Изменить** `src/hooks/useRemoteSync.js`, `src/hooks/useYandexSync.js` — мёрж `petGifts`/`petBond`.
- **Изменить** `src/components/Pet/PetScreen.jsx` — секция «Подарки Букли» + сетка коллекции.
- **Изменить** `src/components/Pet/PetHeaderButton.jsx`, `src/components/Header/Header.jsx` — индикатор «готов подарок».
- **Изменить** `src/styles/index.css` — стили секции/сетки + CSS стилей-клеток подарков + градиенты фонов-подарков.

---

## Task 1: Чистая логика bond (`src/utils/petBond.js`)

**Files:**
- Create: `src/utils/petBond.js`
- Create (verify): `scripts/verify-petbond.mjs`

- [ ] **Step 1: Написать чистый модуль**

Create `src/utils/petBond.js`:

```js
// Pure helpers for the pet "привязанность" (bond) mechanic. No React, no
// side effects — trivially unit-testable. Bond accrues at a FLAT rate of
// +1 per BOND_MINUTES_PER_POINT minutes while the pet is fed (hunger > 0),
// independent of how full the hunger bar is.
import { HUNGER_DECAY_PER_HOUR } from '../constants/game.js';

export const BOND_PER_GIFT = 500;          // points needed for one gift
export const BOND_MINUTES_PER_POINT = 5;   // +1 point per 5 fed-minutes

const DECAY_PER_MIN = HUNGER_DECAY_PER_HOUR / 60; // 0.5 hunger/min

// Advance bond from its anchor (bondTickAt) to `now`, counting only the
// minutes the pet stayed fed (hunger > 0). Hunger at the anchor is projected
// from the stored hunger sample (hunger as of hungerTickAt) via linear decay,
// so feeding (a hunger jump) must checkpoint bond — see useStats.feedPet.
// Returns { bond, bondTickAt:ISO }. Frozen (no gain) when no gifts remain.
export function reconcileBond({ bond, bondTickAt, hunger, hungerTickAt, now, hasGiftsLeft }) {
  const startBond = Number.isFinite(bond) ? Math.max(0, bond) : 0;
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // No anchor yet → just stamp one; nothing accrues this call.
  if (!bondTickAt) return { bond: startBond, bondTickAt: nowIso };
  // Collection exhausted or already full → freeze, keep value, refresh anchor.
  if (!hasGiftsLeft || startBond >= BOND_PER_GIFT) {
    return { bond: Math.min(startBond, BOND_PER_GIFT), bondTickAt: nowIso };
  }

  const bondTickMs = new Date(bondTickAt).getTime();
  const hungerTickMs = hungerTickAt ? new Date(hungerTickAt).getTime() : bondTickMs;
  // Project the stored hunger sample forward to the bond anchor.
  const minsHungerToBond = Math.max(0, (bondTickMs - hungerTickMs) / 60000);
  const hungerAtAnchor = Math.max(0, (Number.isFinite(hunger) ? hunger : 0) - DECAY_PER_MIN * minsHungerToBond);

  const elapsedMin = Math.max(0, (nowMs - bondTickMs) / 60000);
  const fedMin = Math.min(elapsedMin, DECAY_PER_MIN > 0 ? hungerAtAnchor / DECAY_PER_MIN : 0);
  const nextBond = Math.min(BOND_PER_GIFT, startBond + fedMin / BOND_MINUTES_PER_POINT);
  return { bond: nextBond, bondTickAt: nowIso };
}

// Merge gift progress from two snapshots (local vs server/cloud) without loss:
// claimed gifts are unioned, in-progress bond takes the max. Used on sync
// reconcile so a fresh device / cleared storage never wipes the collection.
export function mergeGiftProgress(localGifts, localBond, serverGifts, serverBond) {
  const set = new Set([
    ...(Array.isArray(localGifts) ? localGifts : []),
    ...(Array.isArray(serverGifts) ? serverGifts : [])
  ]);
  const bond = Math.max(
    Number.isFinite(localBond) ? localBond : 0,
    Number.isFinite(serverBond) ? serverBond : 0
  );
  return { petGifts: [...set], petBond: bond };
}
```

- [ ] **Step 2: Написать проверочный скрипт**

Create `scripts/verify-petbond.mjs`:

```js
import assert from 'node:assert/strict';
import { reconcileBond, mergeGiftProgress, BOND_PER_GIFT, BOND_MINUTES_PER_POINT } from '../src/utils/petBond.js';

const t0 = new Date('2026-06-04T00:00:00.000Z').getTime();
const at = (min) => new Date(t0 + min * 60000).toISOString();

// 1. No anchor → stamps anchor, no gain.
let r = reconcileBond({ bond: 0, bondTickAt: null, hunger: 100, hungerTickAt: at(0), now: t0, hasGiftsLeft: true });
assert.equal(r.bond, 0);
assert.ok(r.bondTickAt);

// 2. Fully fed for 10 min → +2 points (10/5).
r = reconcileBond({ bond: 0, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 10 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 2);

// 3. Starving (hunger 0) → no gain.
r = reconcileBond({ bond: 7, bondTickAt: at(0), hunger: 0, hungerTickAt: at(0), now: t0 + 60 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 7);

// 4. Hunger 100 lasts 200 min (decay 0.5/min) → after 300 min only 200 fed-min
//    count → +40 points, not +60.
r = reconcileBond({ bond: 0, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 300 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 40);

// 5. Cap at BOND_PER_GIFT.
r = reconcileBond({ bond: BOND_PER_GIFT - 1, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 1000 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, BOND_PER_GIFT);

// 6. Frozen when no gifts left.
r = reconcileBond({ bond: 123, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 60 * 60000, hasGiftsLeft: false });
assert.equal(r.bond, 123);

// 7. Merge: union gifts, max bond.
const m = mergeGiftProgress(['a'], 30, ['a', 'b'], 80);
assert.deepEqual([...m.petGifts].sort(), ['a', 'b']);
assert.equal(m.petBond, 80);

console.log('petBond OK', { BOND_PER_GIFT, BOND_MINUTES_PER_POINT });
```

- [ ] **Step 3: Запустить проверку — должна пройти**

Run: `node scripts/verify-petbond.mjs`
Expected: печатает `petBond OK { BOND_PER_GIFT: 500, BOND_MINUTES_PER_POINT: 5 }`, без ошибок assert.

- [ ] **Step 4: Commit**

```bash
git add src/utils/petBond.js scripts/verify-petbond.mjs
git commit -m "feat(pet): pure bond reconcile + gift-progress merge helpers"
```

---

## Task 2: Каталог подарков (`src/data/petGifts.js`)

**Files:**
- Create: `src/data/petGifts.js`

- [ ] **Step 1: Написать каталог + хелперы**

Create `src/data/petGifts.js`:

```js
// Exclusive cosmetic gifts Букля brings as the player keeps her fed (bond
// mechanic). NOT buyable in the shop. Ordered: gifts are awarded top-to-bottom.
// Live-ops: append new items here and the loop keeps giving them out.
//
// type:'background' → payload.gradient applied to document.body (like shopItems)
// type:'cells'      → applied via body class `cell-style-<id>` (CSS in index.css)

export const PET_GIFTS = [
  {
    id: 'gift-night',
    type: 'background',
    icon: '🌙',
    name: 'Совиная ночь',
    desc: 'Подарок Букли — глубокая ночь под луной',
    payload: {
      gradient: [
        'radial-gradient(55% 38% at 76% 20%, rgba(220,226,255,0.30), transparent 60%)',
        'radial-gradient(90% 70% at 50% 120%, rgba(80,110,200,0.22), transparent 70%)',
        'linear-gradient(180deg, #070a18 0%, #0b1024 60%, #0a0e1f 100%)'
      ].join(', ')
    }
  },
  {
    id: 'gift-feather',
    type: 'background',
    icon: '🪶',
    name: 'Перо Букли',
    desc: 'Подарок Букли — мягкое сиреневое перо',
    payload: {
      gradient: [
        'radial-gradient(800px 500px at 50% -10%, rgba(200,170,255,0.20), transparent 70%)',
        'radial-gradient(700px 480px at 90% 110%, rgba(255,190,230,0.16), transparent 70%)',
        'linear-gradient(180deg, #15101f 0%, #1b1430 60%, #181126 100%)'
      ].join(', ')
    }
  },
  {
    id: 'gift-moonsilver',
    type: 'cells',
    icon: '✨',
    name: 'Лунное серебро',
    desc: 'Подарок Букли — серебристый блик на верных клетках'
  },
  {
    id: 'gift-owleye',
    type: 'cells',
    icon: '🦉',
    name: 'Совиный глаз',
    desc: 'Подарок Букли — тёплое янтарное свечение верных клеток'
  }
];

export const GIFT_IDS = PET_GIFTS.map((g) => g.id);

export const getGift = (id) => PET_GIFTS.find((g) => g.id === id) || null;

// Ids of cell-style gifts (for toggling body classes in useShopTheme).
export const GIFT_CELL_IDS = PET_GIFTS.filter((g) => g.type === 'cells').map((g) => g.id);

// First gift not yet in `claimed`, or null when the collection is complete.
export function nextUnclaimedGiftId(claimed) {
  const have = new Set(Array.isArray(claimed) ? claimed : []);
  return GIFT_IDS.find((id) => !have.has(id)) || null;
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `✓ built` без ошибок (модуль импортируется/парсится).

- [ ] **Step 3: Commit**

```bash
git add src/data/petGifts.js
git commit -m "feat(pet): exclusive gift catalog (4 starter cosmetics)"
```

---

## Task 3: Интеграция bond в `useStats`

**Files:**
- Modify: `src/hooks/useStats.js`

- [ ] **Step 1: Импорты**

В начале файла, в блоке `import { ... } from '../constants/game.js'` — оставить как есть; добавить две новые строки импорта ПОСЛЕ строки `import { getTreat } from '../data/petTreats.js';`:

```js
import { reconcileBond, mergeGiftProgress, BOND_PER_GIFT } from '../utils/petBond.js';
import { GIFT_IDS, nextUnclaimedGiftId } from '../data/petGifts.js';
```

(Note: `mergeGiftProgress` импортируется здесь только если используется; он применяется в Task 6 в sync-хуках, не в useStats. Если линт ругается на неиспользуемый импорт — оставить только `reconcileBond, BOND_PER_GIFT` тут, а `mergeGiftProgress` импортировать в sync-хуках.)

Скорректировать: в useStats импортировать только нужное:

```js
import { reconcileBond, BOND_PER_GIFT } from '../utils/petBond.js';
import { GIFT_IDS, nextUnclaimedGiftId } from '../data/petGifts.js';
```

- [ ] **Step 2: Расширить `DEFAULT_STATS.prefs`**

Найти (строки ~62-65):

```js
  prefs: {
    theme: 'dark',          // 'dark' | 'light'
    enterOnLeft: false      // false = [BACK,...,ENTER]; true = [ENTER,...,BACK]
  },
```

Заменить на:

```js
  prefs: {
    theme: 'dark',          // 'dark' | 'light'
    enterOnLeft: false,     // false = [BACK,...,ENTER]; true = [ENTER,...,BACK]
    petBond: 0,             // привязанность к питомцу (0..BOND_PER_GIFT)
    petBondTickAt: null,    // ISO якоря последнего пересчёта bond
    petGifts: []            // id уже полученных подарков (по порядку)
  },
```

- [ ] **Step 3: Добавить reconcile bond + flush-эффект**

Сразу ПОСЛЕ блока энергетического flush-эффекта (после строки `}, [reconciled.energy, stats.energy]);`, ~строка 226) вставить:

```js
  // ---------- Pet bond (привязанность) ----------
  // Есть ли ещё несобранные подарки — иначе bond заморожен.
  const giftsLeft = (stats.prefs?.petGifts?.length || 0) < GIFT_IDS.length;

  // Живой пересчёт bond (как energy/hunger). Источник истины для отображения и
  // готовности подарка; в prefs флашится лениво (см. эффект ниже).
  const reconciledBond = useMemo(() => reconcileBond({
    bond: stats.prefs?.petBond,
    bondTickAt: stats.prefs?.petBondTickAt,
    hunger: stats.pet?.hunger,
    hungerTickAt: stats.pet?.lastHungerTickAt,
    now: nowMs,
    hasGiftsLeft: giftsLeft
  }), [stats.prefs?.petBond, stats.prefs?.petBondTickAt, stats.pet?.hunger, stats.pet?.lastHungerTickAt, nowMs, giftsLeft]);

  // Флашим bond в prefs, когда целое число очков изменилось ИЛИ якорь ещё не
  // инициализирован. Дробный bond не флашим каждый тик. Только после вылупления.
  useEffect(() => {
    if (!stats.pet?.hatched) return;
    const storedBond = stats.prefs?.petBond || 0;
    const integerChanged = Math.floor(reconciledBond.bond) !== Math.floor(storedBond);
    const needsAnchor = !stats.prefs?.petBondTickAt;
    if (!integerChanged && !needsAnchor) return;
    setStats((s) => ({
      ...s,
      prefs: {
        ...(s.prefs || DEFAULT_STATS.prefs),
        petBond: reconciledBond.bond,
        petBondTickAt: reconciledBond.bondTickAt
      }
    }));
  }, [reconciledBond.bond, reconciledBond.bondTickAt, stats.prefs?.petBond, stats.prefs?.petBondTickAt, stats.pet?.hatched]);
```

- [ ] **Step 4: Чекпойнт bond в `feedPet`**

Кормление поднимает голод скачком — это разрыв, поэтому закрываем окно bond перед добавлением еды. Найти тело `feedPet` (setStats-апдейтер, ~строки 493-510):

```js
    setStats((s) => {
      // Apply pending hunger decay first so the gain is honest.
      const r = reconcilePetTimers({
        energy: s.energy,
        lastEnergyTickAt: s.lastEnergyTickAt,
        hunger: s.pet?.hunger,
        lastHungerTickAt: s.pet?.lastHungerTickAt,
        hatched: Boolean(s.pet?.hatched)
      });
      const nextHunger = Math.min(HUNGER_MAX, (r.hunger || 0) + treat.hungerGain);
      // ... (существующий блок nextTick для энергии)
      return {
        ...s,
        coins: Math.max(0, (s.coins || 0) - treat.price),
        energy: r.energy,
        lastEnergyTickAt: nextTick,
        pet: { ...(s.pet || DEFAULT_STATS.pet), hunger: nextHunger, lastHungerTickAt: r.lastHungerTickAt }
      };
    });
```

В этом апдейтере, СРАЗУ перед `return {`, добавить чекпойнт bond (до скачка голода используем `r.hunger` — голод после распада, до еды):

```js
      const nowIso = new Date().toISOString();
      const bn = reconcileBond({
        bond: s.prefs?.petBond,
        bondTickAt: s.prefs?.petBondTickAt,
        hunger: r.hunger,
        hungerTickAt: r.lastHungerTickAt,
        now: Date.now(),
        hasGiftsLeft: (s.prefs?.petGifts?.length || 0) < GIFT_IDS.length
      });
```

И в возвращаемом объекте добавить ключ `prefs` (после `pet: {...}`):

```js
        pet: { ...(s.pet || DEFAULT_STATS.pet), hunger: nextHunger, lastHungerTickAt: r.lastHungerTickAt },
        prefs: { ...(s.prefs || DEFAULT_STATS.prefs), petBond: bn.bond, petBondTickAt: nowIso }
```

(`r.lastHungerTickAt` == текущее «сейчас» из reconcilePetTimers; `nowIso` совпадает с ним по смыслу — новый якорь bond = момент кормления.)

- [ ] **Step 5: Экшен `claimPetGift`**

Перед блоком `return { ... }` (экспорт хука, ~строка 871) добавить:

```js
  // Забрать готовый подарок: добавить следующий несобранный id в коллекцию,
  // обнулить bond. Косметика НЕ применяется автоматически. Возвращает id
  // подарка или null. Идемпотентно относительно порога/наличия.
  const claimPetGift = useCallback(() => {
    let claimedId = null;
    setStats((s) => {
      const claimed = s.prefs?.petGifts || [];
      const id = nextUnclaimedGiftId(claimed);
      if (!id) return s;
      const bn = reconcileBond({
        bond: s.prefs?.petBond,
        bondTickAt: s.prefs?.petBondTickAt,
        hunger: s.pet?.hunger,
        hungerTickAt: s.pet?.lastHungerTickAt,
        now: Date.now(),
        hasGiftsLeft: claimed.length < GIFT_IDS.length
      });
      if (bn.bond < BOND_PER_GIFT) return s;
      claimedId = id;
      return {
        ...s,
        prefs: {
          ...(s.prefs || DEFAULT_STATS.prefs),
          petGifts: [...claimed, id],
          petBond: 0,
          petBondTickAt: new Date().toISOString()
        }
      };
    });
    return claimedId;
  }, []);
```

- [ ] **Step 6: Экспорт новых полей**

В возвращаемом объекте хука (`return { ... }`, ~строка 871) добавить ключи (рядом с `feedPet`):

```js
    petBond: reconciledBond.bond,
    petBondMax: BOND_PER_GIFT,
    petGiftReady: reconciledBond.bond >= BOND_PER_GIFT && giftsLeft,
    petGifts: stats.prefs?.petGifts || [],
    claimPetGift,
```

- [ ] **Step 7: Проверить сборку**

Run: `npm run build`
Expected: `✓ built` без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useStats.js
git commit -m "feat(pet): bond accrual, claim action, prefs state + exports"
```

---

## Task 4: Проброс в игровой контекст (`src/hooks/useGame.js`)

**Files:**
- Modify: `src/hooks/useGame.js`

- [ ] **Step 1: Добавить поля в возврат useGame**

В объекте `return { ... }` хука `useGame` (секция с `feedPet: stats.feedPet,` и соседними pet-полями) добавить:

```js
    petBond: stats.petBond,
    petBondMax: stats.petBondMax,
    petGiftReady: stats.petGiftReady,
    petGifts: stats.petGifts,
    claimPetGift: stats.claimPetGift,
```

(Поля прокидываются в `GameContext` автоматически: `GameProvider` отдаёт весь объект `useGame()` как `value` — `src/context/GameContext.jsx:7`. Правок провайдера не требуется.)

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGame.js
git commit -m "feat(pet): expose bond/gift state through game context"
```

---

## Task 5: Резолвер косметики с учётом подарков (`useShopTheme` + CSS)

**Files:**
- Modify: `src/hooks/useShopTheme.js`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Резолвить фон-подарки и классы клеток-подарков**

Заменить весь `src/hooks/useShopTheme.js` на:

```js
import { useEffect } from 'react';
import { getItem } from '../data/shopItems.js';
import { getGift, GIFT_CELL_IDS } from '../data/petGifts.js';
import { useGameContext } from '../context/GameContext.jsx';

// Resolve a cosmetic id from EITHER the shop catalog OR the pet-gift catalog.
function resolveBackgroundGradient(id) {
  if (!id) return null;
  const shop = getItem(id);
  if (shop?.payload?.gradient) return shop.payload.gradient;
  const gift = getGift(id);
  if (gift?.type === 'background' && gift.payload?.gradient) return gift.payload.gradient;
  return null;
}

// All toggleable cell-style classes (shop + gifts), removed before applying one.
const ALL_CELL_STYLES = ['cells-neon', 'cells-shimmer', 'cells-emerald', ...GIFT_CELL_IDS];

// Applies the user's selected cosmetic items to the document.
export function useShopTheme() {
  const { stats } = useGameContext();
  const { activeBackground, activeCellStyle } = stats;

  // Background
  useEffect(() => {
    const grad = resolveBackgroundGradient(activeBackground);
    document.body.style.backgroundImage = grad || '';
    document.body.style.backgroundColor = '';
  }, [activeBackground]);

  // Cell style — toggle a single class on body so CSS handles the rest.
  useEffect(() => {
    for (const c of ALL_CELL_STYLES) document.body.classList.remove(`cell-style-${c}`);
    if (activeCellStyle) document.body.classList.add(`cell-style-${activeCellStyle}`);
  }, [activeCellStyle]);
}
```

- [ ] **Step 2: CSS стилей клеток-подарков**

В `src/styles/index.css`, сразу ПОСЛЕ блока emerald (после правила `body.cell-style-cells-emerald .cell--correct ... { ... }`, ~строка 1660) добавить:

```css
/* Gift cell style — Лунное серебро: серебристый диагональный блик на верных. */
body.cell-style-gift-moonsilver .cell--correct:not(.cell--flipping) .cell__face--front,
body.cell-style-gift-moonsilver .cell--correct .cell__face--back {
  background-image:
    linear-gradient(120deg, transparent 40%, rgba(255, 255, 255, 0.65) 50%, transparent 60%),
    linear-gradient(120deg, #8a93a8, #e8edf6 35%, #8a93a8 65%, #5f6878);
  background-color: #9aa3b6;
  background-size: 200% 200%, 100% 100%;
  background-repeat: no-repeat;
  background-position: 150% 150%, 0 0;
  animation: shine-diagonal 2.8s linear infinite;
  color: #11151c;
  border-color: #cfd6e6;
  box-shadow: 0 0 12px rgba(200, 210, 230, 0.5);
}

/* Gift cell style — Совиный глаз: тёплое янтарное свечение верных. */
body.cell-style-gift-owleye .cell--correct:not(.cell--flipping) .cell__face--front,
body.cell-style-gift-owleye .cell--correct .cell__face--back {
  background-image:
    linear-gradient(120deg, transparent 40%, rgba(255, 240, 200, 0.6) 50%, transparent 60%),
    linear-gradient(120deg, #c9821f, #ffd27a 35%, #c9821f 65%, #8a5410);
  background-color: #d08a22;
  background-size: 200% 200%, 100% 100%;
  background-repeat: no-repeat;
  background-position: 150% 150%, 0 0;
  animation: shine-diagonal 2.8s linear infinite;
  color: #1a1300;
  border-color: #ffcf7a;
  box-shadow: 0 0 12px rgba(230, 170, 60, 0.55);
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useShopTheme.js src/styles/index.css
git commit -m "feat(pet): resolve gift cosmetics (backgrounds + cell styles)"
```

---

## Task 6: Долговечность синка — мёрж `petGifts`/`petBond`

**Files:**
- Modify: `src/hooks/useRemoteSync.js`
- Modify: `src/hooks/useYandexSync.js`

- [ ] **Step 1: Web — union/max при reconcile**

В `src/hooks/useRemoteSync.js` импортировать вверху:

```js
import { mergeGiftProgress } from '../utils/petBond.js';
```

Найти блок (добавлен ранее фиксом темы):

```js
        setStats((s) => ({
          ...s,
          ...fromRow(data),
          prefs: s.prefs,
          activeBackground: s.activeBackground,
          activeCellStyle: s.activeCellStyle
        }));
```

Заменить на (мёржим ценные ключи подарков из серверного prefs):

```js
        setStats((s) => {
          const serverPrefs = (data.prefs && typeof data.prefs === 'object') ? data.prefs : {};
          const merged = mergeGiftProgress(
            s.prefs?.petGifts, s.prefs?.petBond,
            serverPrefs.petGifts, serverPrefs.petBond
          );
          return {
            ...s,
            ...fromRow(data),
            // prefs остаются клиент-авторитетными (фикс слёта темы), но
            // коллекция подарков и bond мёржатся, чтобы не теряться на новом
            // устройстве / после очистки localStorage.
            prefs: {
              ...(s.prefs || {}),
              petGifts: merged.petGifts,
              petBond: merged.petBond
            },
            activeBackground: s.activeBackground,
            activeCellStyle: s.activeCellStyle
          };
        });
```

- [ ] **Step 2: Yandex — union/max при загрузке облака**

В `src/hooks/useYandexSync.js` импортировать вверху:

```js
import { mergeGiftProgress } from '../utils/petBond.js';
```

Найти в эффекте загрузки:

```js
      if (data && Object.keys(data).length > 0) {
        setStats((s) => ({ ...s, ...data }));
      }
```

Заменить на:

```js
      if (data && Object.keys(data).length > 0) {
        setStats((s) => {
          const next = { ...s, ...data };
          const lp = s.prefs || {};
          const cp = data.prefs || {};
          const merged = mergeGiftProgress(lp.petGifts, lp.petBond, cp.petGifts, cp.petBond);
          next.prefs = { ...(cp || {}), ...(next.prefs || {}), petGifts: merged.petGifts, petBond: merged.petBond };
          return next;
        });
      }
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useRemoteSync.js src/hooks/useYandexSync.js
git commit -m "fix(pet): merge gift collection on sync (union+max) for durability"
```

---

## Task 7: UI — секция «Подарки Букли» в `PetScreen`

**Files:**
- Modify: `src/components/Pet/PetScreen.jsx`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Импорты и данные контекста**

В `src/components/Pet/PetScreen.jsx` добавить импорт каталога рядом с другими data-импортами:

```js
import { PET_GIFTS, GIFT_IDS, getGift } from '../../data/petGifts.js';
```

В деструктуризации `useGameContext()` (в `PetScreen`) добавить новые поля и применение косметики:

```js
  const {
    stats,
    hatchPet,
    feedPet, petHunger,
    buyDecoration, equipDecoration, unequipDecorationSlot,
    showToast,
    petBond, petBondMax, petGiftReady, petGifts, claimPetGift,
    setActiveBackground, setActiveCellStyle
  } = useGameContext();
```

(`setActiveBackground`/`setActiveCellStyle` уже экспортируются из useGame — проверить наличие; они используются для применения подарка.)

- [ ] **Step 2: Обработчики claim/apply**

Внутри `PetScreen`, рядом с `onFeed`/`onBuyDeco`, добавить:

```js
  const onClaimGift = () => {
    const id = claimPetGift();
    if (id) {
      const g = getGift(id);
      showToast?.(`Букля принесла подарок: ${g?.name || 'сюрприз'}!`);
    }
  };

  const onApplyGift = (g) => {
    if (g.type === 'background') {
      const isOn = stats.activeBackground === g.id;
      setActiveBackground?.(isOn ? null : g.id);
      showToast?.(isOn ? 'Фон снят' : `Применён фон: ${g.name}`);
    } else {
      const isOn = stats.activeCellStyle === g.id;
      setActiveCellStyle?.(isOn ? null : g.id);
      showToast?.(isOn ? 'Стиль снят' : `Применён стиль: ${g.name}`);
    }
  };
```

- [ ] **Step 3: Добавить таб «Подарки» и панель**

В массив `TABS` (вверху файла) добавить четвёртый таб:

```js
const TABS = [
  { id: 'feed',  icon: '🍖', label: 'Покормить' },
  { id: 'cheer', icon: '🎁', label: 'Порадовать' },
  { id: 'train', icon: '🎓', label: 'Обучить'    },
  { id: 'gifts', icon: '🎀', label: 'Подарки'    }
];
```

В рендере панелей (после `{tab === 'train' && <TrainPanel />}`) добавить:

```js
              {tab === 'gifts' && (
                <GiftsPanel
                  bond={petBond || 0}
                  bondMax={petBondMax || 1}
                  ready={petGiftReady}
                  claimed={petGifts || []}
                  activeBg={stats.activeBackground}
                  activeCells={stats.activeCellStyle}
                  onClaim={onClaimGift}
                  onApply={onApplyGift}
                />
              )}
```

- [ ] **Step 4: Компонент `GiftsPanel`**

В конце файла `PetScreen.jsx` (рядом с `FeedPanel`/`CheerPanel`) добавить:

```jsx
function GiftsPanel({ bond, bondMax, ready, claimed, activeBg, activeCells, onClaim, onApply }) {
  const have = new Set(claimed);
  const pct = Math.min(100, Math.round((bond / bondMax) * 100));
  const allClaimed = claimed.length >= GIFT_IDS.length;
  return (
    <div className="pet-gifts">
      <p className="pet-tab__hint">
        Корми Буклю — со временем растёт привязанность. На максимуме Букля
        приносит эксклюзивный подарок, который можно применить здесь.
      </p>

      {ready ? (
        <button
          type="button"
          className="btn btn--primary pet-gift-claim"
          onClick={onClaim}
          onMouseDown={(e) => e.preventDefault()}
        >
          🎁 Букля что-то принесла! Забрать
        </button>
      ) : (
        <div className="pet-bar pet-gift-bar">
          <div className="pet-bar__row">
            <span className="pet-bar__label">Привязанность</span>
            <span className="pet-bar__value">
              {allClaimed ? 'Все подарки собраны' : `${Math.floor(bond)} / ${bondMax}`}
            </span>
          </div>
          <div className="pet-bar__track">
            <div className="pet-bar__fill pet-bar__fill--bond" style={{ width: `${allClaimed ? 100 : pct}%` }} />
          </div>
          {allClaimed && <div className="pet-gifts__soon">Скоро новые подарки ✨</div>}
        </div>
      )}

      <div className="pet-gift-grid">
        {PET_GIFTS.map((g) => {
          const owned = have.has(g.id);
          const isActive = owned && (g.type === 'background' ? activeBg === g.id : activeCells === g.id);
          return (
            <button
              key={g.id}
              type="button"
              className={`pet-gift-card${owned ? '' : ' pet-gift-card--locked'}${isActive ? ' pet-gift-card--active' : ''}`}
              onClick={owned ? () => onApply(g) : undefined}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!owned}
              title={owned ? g.name : 'Ещё не получен'}
            >
              <span className="pet-gift-card__icon" aria-hidden="true">{owned ? g.icon : '❔'}</span>
              <span className="pet-gift-card__name">{owned ? g.name : '???'}</span>
              <span className="pet-gift-card__cta">
                {!owned ? 'Не получен' : isActive ? 'Применён ✓' : 'Применить'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: CSS секции подарков**

В `src/styles/index.css` (рядом с другими `.pet-*` правилами) добавить:

```css
.pet-gifts { display: flex; flex-direction: column; gap: 12px; }
.pet-gift-bar { margin: 0; }
.pet-bar__fill--bond { background: linear-gradient(90deg, #b388ff, #6c8cff); }
.pet-gift-claim {
  width: 100%;
  padding: 12px 14px;
  font-weight: 800;
  animation: login-glow 2.4s ease-in-out infinite;
}
.pet-gifts__soon { margin-top: 6px; font-size: 12.5px; color: var(--text-dim); }
.pet-gift-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.pet-gift-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--text);
  cursor: pointer;
  text-align: center;
}
.pet-gift-card--locked { opacity: 0.5; cursor: default; }
.pet-gift-card--active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 6px 16px rgba(108,140,255,0.25); }
.pet-gift-card__icon { font-size: 28px; }
.pet-gift-card__name { font-weight: 700; font-size: 13px; }
.pet-gift-card__cta { font-size: 11.5px; color: var(--text-dim); }
.pet-gift-card--active .pet-gift-card__cta { color: var(--accent); font-weight: 700; }
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 7: Commit**

```bash
git add src/components/Pet/PetScreen.jsx src/styles/index.css
git commit -m "feat(pet): gifts tab — bond bar, claim, collection grid"
```

---

## Task 8: Индикатор «готов подарок» в шапке

**Files:**
- Modify: `src/components/Header/Header.jsx`
- Modify: `src/components/Pet/PetHeaderButton.jsx`

- [ ] **Step 1: Прокинуть флаг в кнопку**

В `src/components/Header/Header.jsx`:
- В деструктуризации добавить `petGiftReady`:

```js
  const { stats, petGiftReady } = useGameContext();
```

- Передать в кнопку:

```js
        <PetHeaderButton onClick={onOpenPet} hatched={hatched} ready={ready} giftReady={Boolean(petGiftReady)} />
```

- [ ] **Step 2: Точка-индикатор на иконке**

В `src/components/Pet/PetHeaderButton.jsx` обновить сигнатуру и разметку:

```jsx
export function PetHeaderButton({ onClick, hatched, ready, giftReady }) {
  return (
    <button
      type="button"
      className={`iconbtn pet-headerbtn${hatched ? '' : ' pet-headerbtn--egg'}${ready ? ' pet-headerbtn--ready' : ''}${giftReady ? ' pet-headerbtn--gift' : ''}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={hatched ? (giftReady ? 'Букля принесла подарок!' : 'Букля') : ready ? 'Яйцо готово вылупиться!' : 'Дупло'}
      title={hatched ? (giftReady ? 'Букля принесла подарок!' : 'Букля') : ready ? 'Яйцо готово вылупиться!' : 'Дупло'}
    >
      {hatched ? <HeaderOwl /> : <HeaderEgg />}
      {ready
        ? <span className="pet-headerbtn__badge" aria-hidden="true">!</span>
        : giftReady
          ? <span className="pet-headerbtn__gift" aria-hidden="true">🎁</span>
          : !hatched && <span className="pet-headerbtn__dot" aria-hidden="true" />}
    </button>
  );
}
```

- [ ] **Step 3: CSS для бейджа подарка**

В `src/styles/index.css` рядом с `.pet-headerbtn__badge` добавить:

```css
.pet-headerbtn__gift {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 13px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
  animation: login-glow 2.4s ease-in-out infinite;
}
```

(Если у `.pet-headerbtn` нет `position: relative` — добавить его в существующее правило `.pet-headerbtn`.)

- [ ] **Step 4: Проверить сборку**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header/Header.jsx src/components/Pet/PetHeaderButton.jsx src/styles/index.css
git commit -m "feat(pet): header gift-ready indicator"
```

---

## Task 9: Финальная проверка + zip для Яндекса

**Files:** —

- [ ] **Step 1: Прогнать чистую логику и сборку**

Run: `node scripts/verify-petbond.mjs && npm run build`
Expected: `petBond OK ...` и `✓ built`.

- [ ] **Step 2: Ручная проверка (dev)**

Run: `npm run dev` и проверить по спеке (раздел «Проверка»):
- Питомец вылуплен → таб «Подарки» виден; до вылупления — pet-секция как раньше.
- Покормить → bond начинает расти (для ускорения можно временно снизить `BOND_PER_GIFT` или подождать; темп +1/5мин).
- При сытости 0 bond не растёт; при сытости >0 растёт.
- Дойти до `BOND_PER_GIFT` → кнопка «Забрать»; тап → подарок в сетке, bond=0, **косметика не применилась сама**; в шапке гаснет 🎁.
- Тап по собранному подарку в сетке → применяется фон/стиль; повторный тап — снимается.
- F5 → применённый подарок и коллекция на месте.
- Собрать все 4 → «Все подарки собраны» + «Скоро новые подарки», bond заморожен.
- Реген энергии от сытости работает как прежде (×1…×2 в шкале «Сытость»).

- [ ] **Step 3: Re-zip для Яндекса**

Run (PowerShell):
```powershell
cd C:\Users\nik52\wordle-ru; if (Test-Path buklitsa-yandex.zip) { Remove-Item buklitsa-yandex.zip -Force }; Compress-Archive -Path dist\* -DestinationPath buklitsa-yandex.zip; (Get-Item buklitsa-yandex.zip).LastWriteTime
```
Expected: zip обновлён (свежая дата).

- [ ] **Step 4: Commit (если остались незакоммиченные правки тюнинга)**

```bash
git add -A
git commit -m "chore(pet): finalize bond gifts feature"
git push
```

---

## Самопроверка плана

**Покрытие спеки:**
- Хранение в prefs (petBond/petBondTickAt/petGifts) → Task 3 (DEFAULT_STATS), Task 6 (мёрж).
- Накопление +1/5мин по времени сытости, freeze при исчерпании → Task 1 (`reconcileBond`) + Task 3 (интеграция).
- Каталог 4 подарка, расширяемый → Task 2.
- Применение косметики (резолвер shop ∪ gifts), без автоприменения → Task 5 + Task 7 (`onApplyGift`, claim без apply).
- UI: прогресс-бар, «Забрать», сетка коллекции, «Скоро новые» → Task 7.
- Индикатор в шапке → Task 8.
- Долговечность/смена устройства (union/max) → Task 6.
- Реген энергии не тронут → подтверждается отсутствием правок в энергетической логике.

**Типы/имена согласованы:** `reconcileBond({ bond, bondTickAt, hunger, hungerTickAt, now, hasGiftsLeft }) → { bond, bondTickAt }`; `mergeGiftProgress(localGifts, localBond, serverGifts, serverBond) → { petGifts, petBond }`; `nextUnclaimedGiftId(claimed)`; экспорт `petBond/petBondMax/petGiftReady/petGifts/claimPetGift` — едины во всех тасках.

**Заглушек нет.**
