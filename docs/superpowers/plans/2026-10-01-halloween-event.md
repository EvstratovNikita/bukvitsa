# Ивент «Ночь тыкв» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (в этом проекте — инлайн, без субагентов: правило пользователя). Шаги — чекбоксы.

**Цель.** Сезонный ивент к Хэллоуину для VK, OK и Яндекса:
- режим «Загадки ночи»;
- Тыквенная тропа с нарядами Букли и стилем клеток;
- два лимитированных фона;
- вкладка достижений;
- единое ивентовое оформление.

Включается по датам, до старта его можно открыть ссылкой с `#halloween`.

**Архитектура.**
- Календарь и вся чистая логика (колода, тыквы, ступени тропы) лежат в отдельных модулях без зависимостей от браузера. Их проверяет node-скрипт.
- Режим встраивается в `useGame` как `gameMode: 'halloween'`. Поле, клавиатура, подсказки и анимации переиспользуются.
- Прогресс хранится в `stats.halloween` и сливается в `mergeProgress`.
- Интерфейс — новые компоненты в `src/components/Halloween/` плюс точечные вставки в меню, магазин, наряды, достижения, режимы и окно энергии.

**Стек.** React 18, Vite 5, обычный CSS (`src/styles/index.css` + новый `src/styles/halloween.css`). Тесты — `node scripts/test-halloween.mjs` (`node:assert`); vitest в проекте нет и ради этого не ставим.

Спецификация: `docs/superpowers/specs/2026-09-30-halloween-event-design.md`.

---

## Карта файлов

| Файл | Что делает |
|---|---|
| `src/lib/events.js` (новый) | Окно дат, предпросмотр по хэшу, `halloweenActive()`, `halloweenDaysLeft()`, `hwEndLabel` |
| `src/data/halloween.js` (новый) | Слова с загадками, ступени тропы, порядок колоды |
| `src/lib/halloweenProgress.js` (новый) | Чистые функции: тыквы за попытки, следующее слово колоды, применение результата партии |
| `scripts/test-halloween.mjs` (новый) | Тесты: календарь, колода, тыквы, ступени, merge, словарь |
| `src/data/validGuessesExtra.js` | Ивентовые слова, которых нет в словарях |
| `src/utils/mergeProgress.js` | Слияние `halloween` |
| `src/hooks/useStats.js` | `DEFAULT_STATS.halloween`, `recordHalloweenResult`, выдача наград, запреты покупки |
| `src/data/petDecorations.js` | 4 ивентовых наряда (`event: 'halloween'`, `source: 'track'`) |
| `src/components/Pet/OwlSvg.jsx` | SVG: шляпа ведьмы, очки-мыши, брошь-тыква, фонарик |
| `src/data/shopItems.js` | 2 ивентовых фона и стиль клеток «Тыквенные огоньки» |
| `src/hooks/useShopTheme.js` | Класс нового стиля клеток |
| `src/hooks/useGame.js` | Режим `halloween`: старт, следующая загадка, выход, сохранение, итоги партии |
| `src/components/Halloween/RiddleCard.jsx` (новый) | Загадка над полем |
| `src/components/Halloween/HalloweenModal.jsx` (новый) | Окно ивента: отсчёт, «Играть», тропа |
| `src/components/Halloween/HalloweenBanner.jsx` (новый) | Баннер в главном меню |
| `src/components/Halloween/HwBadge.jsx` (новый) | Плашка «🎃 Хэллоуин · до 3.11» |
| `src/components/Halloween/PumpkinBadge.jsx` (новый) | Счётчик тыкв в верхней панели |
| `src/styles/halloween.css` (новый) | Токены, `.hw-*`, баннер, мыши, виньетка, стиль клеток |
| `src/App.jsx`, `StartMenu.jsx`, `GameModesModal.jsx`, `EnergyModal.jsx`, `Shop.jsx`, `PetScreen.jsx`, `Achievements.jsx`, `EndPanel.jsx`, `GameEnd.jsx` | Подключение |
| `src/data/achievements.js` | Категория `halloween`, 5 достижений, видимость |

---

### Task 1: Календарь ивента

**Files:** create `src/lib/events.js`, `scripts/test-halloween.mjs`.

- [ ] **1.1** Тест (часть `scripts/test-halloween.mjs`):

```js
import assert from 'node:assert/strict';
import { halloweenWindowOpen, HALLOWEEN, daysLeftAt } from '../src/lib/events.js';
const t = (iso) => new Date(iso).getTime();
assert.equal(halloweenWindowOpen(t('2026-10-23T20:59:59Z')), false); // 23:59:59 МСК 23.10
assert.equal(halloweenWindowOpen(t('2026-10-23T21:00:00Z')), true);  // 00:00 МСК 24.10
assert.equal(halloweenWindowOpen(t('2026-11-03T20:59:59Z')), true);  // 23:59:59 МСК 3.11
assert.equal(halloweenWindowOpen(t('2026-11-03T21:00:00Z')), false);
assert.equal(daysLeftAt(t('2026-11-03T12:00:00Z')), 1);
assert.equal(daysLeftAt(t('2026-10-24T09:00:00Z')), 11);
```

- [ ] **1.2** Реализация. Модуль не трогает `window` при импорте; `isEmbedded` берётся из `platform.js` лениво — в node он `false`.

```js
// src/lib/events.js
import { isEmbedded } from './platform.js';
export const HALLOWEEN = {
  id: 'halloween',
  start: Date.parse('2026-10-24T00:00:00+03:00'),
  end: Date.parse('2026-11-04T00:00:00+03:00'),
  endLabel: '3.11'
};
const PREVIEW_KEY = 'bukv:event-preview';
export const halloweenWindowOpen = (now = Date.now()) => now >= HALLOWEEN.start && now < HALLOWEEN.end;
export const daysLeftAt = (now = Date.now()) => Math.max(0, Math.ceil((HALLOWEEN.end - now) / 86400000));
// Предпросмотр: #halloween / ?event=halloween включают, #halloween-off выключает.
export function readPreviewFlag() { /* sessionStorage + location, try/catch */ }
export function halloweenActive(now = Date.now()) {
  return readPreviewFlag() || (isEmbedded && halloweenWindowOpen(now));
}
```

- [ ] **1.3** Запуск: `node scripts/test-halloween.mjs` — PASS.
- [ ] **1.4** Commit.

### Task 2: Слова и загадки

**Files:** create `src/data/halloween.js`; modify `src/data/validGuessesExtra.js`; test in the script.

- [ ] **2.1** Тест: каждое слово 4–6 букв, кириллица без ё, уникальное; загадка ≤ 80 символов; `isValidWord(word, word.length)` — true. Импорт `src/data/words.js` в node работает: модули словарей чистые.
- [ ] **2.2** Записи `HW_RIDDLES = [{ word, riddle }]`, ~45 штук. Длины смешанные: примерно 10×4, 20×5, 15×6.
- [ ] **2.3** Ступени тропы:

```js
export const HW_TRACK = [
  { id: 'hw-t1', need: 3,  kind: 'deco',  ref: 'hw-pumpkin' },
  { id: 'hw-t2', need: 8,  kind: 'deco',  ref: 'hw-batglasses' },
  { id: 'hw-t3', need: 14, kind: 'cells', ref: 'cells-hw-lights' },
  { id: 'hw-t4', need: 22, kind: 'deco',  ref: 'hw-lantern' },
  { id: 'hw-t5', need: 32, kind: 'coins', amount: 100 },
  { id: 'hw-t6', need: 45, kind: 'deco',  ref: 'hw-witchhat', grand: true }
];
```

- [ ] **2.4** Слова, которых нет в словарях, добавить в `MANUAL` в `validGuessesExtra.js`. Тест — PASS.
- [ ] **2.5** Commit.

### Task 3: Чистая логика прогресса

**Files:** create `src/lib/halloweenProgress.js`; tests.

```js
export const HW_DEFAULT = { pumpkins: 0, solved: 0, firstTry: 0, seen: [], rewards: [] };
export const pumpkinsFor = (attempts) => (attempts <= 2 ? 3 : attempts <= 4 ? 2 : 1);
// Следующее слово: первое по порядку колоды, которого нет в seen. Колода
// кончилась — круг заново (seenReset: true).
export function nextRiddle(seen, order = HW_ORDER, exclude = null) { ... return { entry, seenReset } }
// Применить итог партии. Возвращает новое состояние и что выдать.
export function applyHalloweenResult(hw, { won, attempts, word }) {
  // seen += word; won → pumpkins += pumpkinsFor, solved++, firstTry += attempts === 1
  // newSteps = HW_TRACK.filter(need <= pumpkins && !rewards.includes(id))
  return { next, gained, newSteps };
}
export function mergeHalloween(a, b) { /* max чисел, union seen/rewards */ }
```

- [ ] **3.1** Тесты:
  - `pumpkinsFor` на 1..6;
  - `nextRiddle` не повторяет и сбрасывает круг;
  - `applyHalloweenResult`: 0 → +3 → ступень `hw-t1`; повтор не выдаёт её второй раз; поражение не даёт тыкв, но помечает слово;
  - `mergeHalloween` симметричен.
- [ ] **3.2** Реализация, PASS.
- [ ] **3.3** `mergeProgress`: `out.halloween = mergeHalloween(a.halloween, b.halloween)`, если поле есть хотя бы с одной стороны. Тест через `mergeProgress` — PASS.
- [ ] **3.4** Commit.

### Task 4: Наряды Букли

**Files:** `petDecorations.js`, `OwlSvg.jsx`, `useStats.js` (`buyDecoration`), `PetScreen.jsx`.

- [ ] **4.1** Каталог (цены нет, бонусы как у обычных предметов):

```js
{ id: 'hw-witchhat',   slot: 'head',   icon: '🧙', name: 'Шляпа ведьмы',      desc: 'Главный приз Тыквенной тропы', bonusCoins: 3, event: 'halloween', source: 'track' },
{ id: 'hw-batglasses', slot: 'eyes',   icon: '🦇', name: 'Очки «Летучие мыши»', desc: 'Видят в темноте',           bonusCoins: 2, event: 'halloween', source: 'track' },
{ id: 'hw-pumpkin',    slot: 'brooch', icon: '🎃', name: 'Брошь «Тыквочка»',    desc: 'Светится изнутри',          bonusCoins: 1, event: 'halloween', source: 'track' },
{ id: 'hw-lantern',    slot: 'wing',   icon: '🏮', name: 'Ведьмин фонарик',     desc: 'Огонёк в ночь Хэллоуина',   bonusCoins: 2, event: 'halloween', source: 'track' }
```

  `price` не задаём: `petPrice(undefined)` даст NaN. В map цену проставляем только тем, у кого она есть. Ивентовые предметы **не входят** в `TOTAL_DECO` достижения «Коллекционер модных вещей»: его счётчик берёт только `!d.event`.
- [ ] **4.2** `buyDecoration`: `if (d.source === 'track') return 'locked';`.
- [ ] **4.3** `OwlSvg.jsx` — `WitchHat`, `BatGlasses`, `PumpkinBrooch`, `Lantern` (wing). Рисуются в старом пространстве координат; без фильтров и анимаций; id градиентов с префиксом `hw-`. Подключить в `renderSlot` и `WING_COMPS`. Брошь сейчас идёт эмодзи-фолбэком — добавить ветку `slot === 'brooch' && id === 'hw-pumpkin'`.
- [ ] **4.4** `CheerPanel`:
  - ивентовые предметы — отдельной группой «🎃 Хэллоуинская коллекция» над слотами, в `.hw-frame`;
  - группа видна во время ивента или если хоть один предмет получен;
  - в обычных слотах ивентовые предметы не дублируются;
  - CTA у неполученного: «🎃 N на тропе» (кнопка открывает окно ивента) или «Только в Хэллоуин» после ивента.
- [ ] **4.5** Проверка в браузере, commit.

### Task 5: Магазин — фоны и стиль клеток

**Files:** `shopItems.js`, `Shop.jsx`, `useStats.js` (`buyItem`), `useShopTheme.js`, `halloween.css`.

- [ ] **5.1** `bg-hw-night` (dark, 150) и `bg-hw-field` (light, 150), `event: 'halloween'`. Плитки `hwTile(c)` строятся через `enc()` и `<use>`, как осенние: тыква, летучая мышь, звезда-искра, лист. Плюс большой лунный ореол радиальным градиентом.
- [ ] **5.2** `cells-hw-lights`, category `cells`, `event: 'halloween'`, `source: 'track'`, без цены.
- [ ] **5.3** Видимость в `Shop`: `visibleInShop(item, stats, active)` — не ивентовое; или ивент идёт; или предмет уже куплен.
  - Предмет тропы без владения во время ивента показываем с CTA «🎃 14 на тропе».
  - После ивента неполученный предмет тропы скрыт.
  - Ивентовые карточки ставим первыми.
- [ ] **5.4** `buyItem`: `source === 'track'` → `'unknown_item'`; ивентовый предмет вне ивента и не во владении → `'unknown_item'`.
- [ ] **5.5** `useShopTheme`: добавить `cells-hw-lights` в `ALL_CELL_STYLES`. CSS `body.cell-style-cells-hw-lights` для двух тем:
  - present — тыквенно-оранжевый;
  - correct — зелье с лиловой каймой;
  - свечение — box-shadow.
- [ ] **5.6** Браузер (обе темы), commit.

### Task 6: Прогресс в useStats

**Files:** `useStats.js`.

- [ ] **6.1** `DEFAULT_STATS.halloween = HW_DEFAULT`; при загрузке снимка — `{ ...HW_DEFAULT, ...(raw.halloween || {}) }`, по образцу `altMode`.
- [ ] **6.2** `recordHalloweenResult({ won, attempts, word })`:
  - считает `applyHalloweenResult` от `stats.halloween`;
  - одним `setStats` пишет новое состояние и выдаёт ступени;
  - `deco` → `pet.ownedDecorations` и надеть в свободный или тот же слот, по правилам `buyDecoration`;
  - `cells` → `inventory` + `activeCellStyle` + `cosmeticAt`;
  - `coins` → `coins` + `coinsEarned`;
  - возвращает `{ gained, newSteps }`.
- [ ] **6.3** Экспорт из хука. Commit.

### Task 7: Режим в useGame

**Files:** `useGame.js`.

- [ ] **7.1** Состояние `riddle` (`{ word, riddle } | null`), сохраняется в `GAME_STATE` вместе с партией. При восстановлении слово ищется в `HW_RIDDLES` по `solution`.
- [ ] **7.2** `startHalloween()`:
  - если ивент не идёт или идёт стартовая блокировка — выход;
  - Слово дня в процессе — решает App (окно выхода);
  - обычная идущая партия → `stashCurrentRound()`;
  - отложенная загадка → `takeRound('hw')`, иначе `nextRiddle(stats.halloween.seen)`;
  - `setGameMode('halloween')`, `setWordLength(len)`, чистая доска;
  - `maybeInterstitial()` не зовём: игрок только вошёл.
- [ ] **7.3** `nextHalloweenRiddle()` — «Следующая загадка»: анимация очистки, `maybeInterstitial()`, следующее слово колоды без текущего.
- [ ] **7.4** `exitHalloween()`:
  - недоигранная загадка → полка `rounds.hw`;
  - `gameMode = 'normal'`;
  - вернуть обычную партию с полки 5 букв, иначе с полок 4/6, иначе новую за энергию.
  - `setGameLength` из ивента работает так же: откладывает загадку и уходит.
- [ ] **7.5** `stashCurrentRound`: для `gameMode === 'halloween'` кладёт в `rounds.hw` с `riddle`. `takeRound('hw')` проверяет, что слово есть в `HW_RIDDLES`.
- [ ] **7.6** `submit()`, ветка `halloween`:
  - **победа:**
    - `stats.recordWin(attempts, elapsed, 1, false)`;
    - `recordHalloweenResult`;
    - XP Букле как за 5 букв;
    - `setLastHw({ gained, newSteps })`;
  - **поражение:** `recordLoss()` + `recordHalloweenResult({ won: false })`.
  - В обоих случаях `rememberWord` не вызываем.
- [ ] **7.7** Старт и перезагрузка:
  - сохранённая партия с `gameMode: 'halloween'` при неактивном ивенте выбрасывается;
  - при активном восстанавливается с `riddle`;
  - утреннее Слово дня откладывает её как `normal-backup` с `gameMode`, а `takeNormalBackup` возвращает режим;
  - эффект `rememberWord` — только `normal`.
- [ ] **7.8** Экспорт: `startHalloween`, `nextHalloweenRiddle`, `exitHalloween`, `riddle`, `lastHw`. Commit.

### Task 8: Интерфейс партии

**Files:** `RiddleCard.jsx`, `PumpkinBadge.jsx`, `App.jsx`, `EndPanel.jsx`, `GameEnd.jsx`, `halloween.css`.

- [ ] **8.1** `RiddleCard` в `.main` над `<Board />`, только в режиме `halloween`: «🎃 Загадка ночи · N букв» и текст. Компактная, в 1–2 строки.
- [ ] **8.2** Верхняя панель: в режиме `halloween` вместо `EnergyBadge` — `PumpkinBadge` (🎃 N). По нажатию открывается окно ивента.
- [ ] **8.3** `.app--hw` на корне в режиме → тёплая виньетка за полем: статичный радиальный градиент на `::before` фиксированного слоя.
- [ ] **8.4** `EndPanel` в режиме:
  - «+N 🎃»;
  - мини-шкала до следующей ступени;
  - новые награды плашками;
  - кнопки «Следующая загадка» (без цены) и «Выйти»;
  - при поражении — разгадка и загадка.
- [ ] **8.5** `GameEnd` в режиме:
  - вместо монет — тыквы и новые награды;
  - «Играем дальше» → `nextHalloweenRiddle`;
  - процентиль и удвоение не показываем.
- [ ] **8.6** Браузер, commit.

### Task 9: Вход в ивент — окно, баннер, режимы, энергия

**Files:** `HalloweenModal.jsx`, `HalloweenBanner.jsx`, `HwBadge.jsx`, `StartMenu.jsx`, `GameModesModal.jsx`, `EnergyModal.jsx`, `App.jsx`, `halloween.css`.

- [ ] **9.1** `HalloweenModal` (на базе `Modal`):
  - шапка — луна и тыква (SVG), «Ночь тыкв», отсчёт «ещё N дн.»;
  - CTA «Играть: Загадки ночи» → `openHalloween()` в App;
  - тропа — вертикальный список 6 ступеней: иконка-превью, название, «N 🎃», состояние (получено ✓ / прогресс), общая шкала;
  - ссылки «Фоны в магазине» и «Достижения».
- [ ] **9.2** `openHalloween` в App:
  - Слово дня в процессе → существующее окно подтверждения, затем старт;
  - иначе `startHalloween()` + `closeHome()`.
- [ ] **9.3** `HalloweenBanner` в `StartMenu` между «Играть» и сеткой, только при `halloweenActive()`. Летучие мыши в `home__sky` — 3 SVG-слоя, анимация только transform; reduced motion их останавливает.
- [ ] **9.4** `GameModesModal`: первая карточка «Загадки ночи» в `.hw-frame`. Из режима `halloween` — «← Вернуться к обычной игре».
- [ ] **9.5** `EnergyModal`: при `energy < 1` и активном ивенте — строка «Загадки ночи — без энергии».
- [ ] **9.6** Браузер, commit.

### Task 10: Достижения

**Files:** `achievements.js`, `Achievements.jsx`.

- [ ] **10.1** Категория `{ id: 'halloween', label: '🎃 Хэллоуин', event: 'halloween' }` и 5 записей по спецификации; `check` читает `s.halloween`.
  - `hw_outfit`: надеты ≥ 3 предмета с `event === 'halloween'`.
  - `hw_path`: `s.halloween.rewards` содержит `hw-t6`.
- [ ] **10.2** `visibleAchievementCategories(stats)`: ивентовая категория видна при активном ивенте или если в ней что-то открыто. Итог «X из Y» и вкладки — только по видимым.
- [ ] **10.3** Карточки и вкладка ивента — в `.hw-frame` / `.hw-tab`. Commit.

### Task 11: Общий стиль ивента

**Files:** `src/styles/halloween.css` (импорт в `main.jsx` после `index.css`).

- [ ] **11.1** Токены `:root` / `[data-theme=light]`; `.hw-badge`; `.hw-frame` (градиентная рамка через padding-box/border-box); `.hw-ribbon`; `.hw-tab`.
- [ ] **11.2** Применить к магазину (`shop-card--hw`), нарядам (`pet-deco--hw`), достижениям, режимам, окну энергии. Commit.

### Task 12: Проверка и сборки

- [ ] **12.1** `node scripts/test-halloween.mjs` — все PASS.
- [ ] **12.2** Браузер (dev-сервер, 393×873, тёмная и светлая), `?event=halloween`:
  - меню и баннер;
  - окно ивента;
  - вход в режим;
  - победа → тыквы → ступень → наряд на Букле;
  - поражение;
  - перезагрузка посреди загадки;
  - выход → обычная партия на месте;
  - магазин;
  - достижения;
  - окно энергии.
- [ ] **12.3** Без флага ивента не видно нигде; с `#halloween-off` флаг снимается.
- [ ] **12.4** Производительность меню: CPU 4x, доля занятости главного потока против main.
- [ ] **12.5** `npm run build:vk` и `npm run build:yandex` — проверки зелёные. **Не деплоить.**
- [ ] **12.6** `tasks/todo.md` (ревью), `tasks/lessons.md` (если были правки), `tasks/vk-publish.md` (ссылка предпросмотра для редакции). Commit, push ветки `halloween`.
