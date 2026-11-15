# Новогодний ивент — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новогодний ивент Буклицы: зимние загадки, «Ледяная гонка с оттепелью», лента наград.
Строится на общем движке сезонных ивентов, на который переезжает «Ночь тыкв».

**Architecture:** Каждый ивент задаётся описанием `src/data/events/<id>.js` (даты, контент,
лента, тема). Логика общая: календарь в `src/lib/events.js`, прогресс в
`src/lib/eventProgress.js`, режим в `useGame.js`, интерфейс в `components/Event/*`.
Прогресс хранится в `stats[<id>]`; `stats.halloween` остаётся в прежнем формате.
«Ледяная гонка» — чистая функция `iceStep` плюс таймер в `useGame`.

**Tech Stack:** Preact + Vite, чистый JS. Тесты — скрипты `node scripts/test-*.mjs`
на `node:assert`, отдельного раннера нет.

**Spec:** `docs/superpowers/specs/2026-11-16-winter-event-design.md`

## Global Constraints

- Ветка `winter`. В main вливаем только в задаче 11: каждый коммит в main уходит на боевой VK.
- Окно зимы: `start 2026-12-26T00:00:00+03:00`, `end 2027-01-12T00:00:00+03:00`,
  `endLabel '11.01'`.
- Ивент только на площадках (`isEmbedded`) или в предпросмотре (`#winter`, `?event=winter`,
  `VITE_EVENT_PREVIEW=winter`). `#winter-off` / `?event=off` снимают предпросмотр.
- Данные Хэллоуина у игроков не меняются: `stats.halloween` (вместе с `pumpkins` и
  `LEGACY_STEPS`), `rounds.hw`, `gameMode: 'halloween'`. `scripts/test-halloween.mjs` проходит
  **без правок**.
- Зимняя лента: `dailyCap 12`; `need` = 6, 14, 24, 35, 47, 60, 74, 90; за попытки 3/2/1
  (1–2 / 3–4 / 5–6), в гонке ×2.
- Гонка: `ice: { secondsPerRow: 30, thawPerGreen: 1 }`. Числа задаются только в описании ивента.
- Слова 4–6 букв, ё → е, каждое проходит `isValidWord`. Загадки до 80 символов, без религии
  («Рождество» и т. п.).
- SVG без фильтров и без анимаций внутри. Анимации только transform/opacity, выключаются
  при `prefers-reduced-motion`.
- Обе темы, светлая и тёмная. Иконки ивента — `GameIcon`, без эмодзи.
- Название ивента пользователь ещё выбирает. В коде оно только в `title` / `modeTitle`
  описания ивента.

## Review Focus

1. **Старое сохранение после Хэллоуина** (`stats.halloween` с `bought`, `rounds.hw`,
   `gameMode:'halloween'`) при открытом окне зимы: наряды и фоны на месте, хэллоуинская
   партия выброшена, зима стартует с нуля. Тест — задача 3.
2. **Ивент закончился посреди отложенной гонки или загадки:** раунд выброшен, обычная
   партия вернулась. Тест — задача 4.
3. **Облачное слияние двух снимков с разными ивентами:** оба `stats.halloween` и
   `stats.winter` сохраняются, ни один не затирается. Тест — задача 3.
4. **Таймер гонки во время рекламы, скрытой вкладки или окна:** лёд не растёт. Тест на
   `iceStep` с `paused` — задача 8.
5. **Два флага предпросмотра в одной сессии** (`#halloween`, потом `#winter`): активен
   последний, а не оба. Тест — задача 1.

---

### Task 1: Календарь ивентов

**Files:**
- Modify: `src/lib/events.js`
- Create: `src/data/events/winter.js` (пока только `id`, даты, `title`)
- Test: `scripts/test-events.mjs` (новый); `scripts/test-halloween.mjs` должен проходить без правок

**Interfaces:**
- Produces:
  - `EVENTS: EventDates[]`, где `EventDates = { id, start, end, endLabel }`;
  - `eventWindowOpen(id, now) → bool`;
  - `eventActive(id, now) → bool`;
  - `activeEvent(now) → EventDates | null`;
  - `eventDaysLeft(id, now) → number`.
- `HALLOWEEN`, `halloweenWindowOpen`, `daysLeftAt`, `halloweenActive`, `halloweenDaysLeft`
  остаются как обёртки с прежней семантикой.
- Предпросмотр хранит в sessionStorage id **одного** ивента. Новый флаг заменяет старый.

- [ ] Тест `scripts/test-events.mjs`:
  - `eventWindowOpen('winter', t('2026-12-25T20:59:59Z')) === false`;
  - `t('2026-12-25T21:00:00Z') → true`; `t('2027-01-11T20:59:59Z') → true`;
    `t('2027-01-11T21:00:00Z') → false`;
  - `eventDaysLeft('winter', t('2026-12-26T09:00:00Z')) === 17`;
  - `eventActive('winter', …)` вне площадок без предпросмотра — `false`;
  - `activeEvent(t('2026-10-30T12:00:00Z'))` вне площадок — `null`;
  - `parsePreview({hash:'#winter', search:''}, stored='halloween') === 'winter'`;
  - `parsePreview({hash:'#winter-off'}, 'winter') === null`.
- [ ] `node scripts/test-events.mjs` → FAIL (нет экспорта).
- [ ] Реализовать.
  - Вынести чистую функцию `parsePreview(location, stored) → id|null`, чтобы тест обходился
    без window.
  - `VITE_EVENT_PREVIEW` принимает любой id из `EVENTS`.
  - `build-vk.mjs`:
    - флаг `--event-preview=<id>` (по умолчанию `halloween`, ради старой команды);
    - проверка боевой сборки ловит любой `VITE_EVENT_PREVIEW:"…"`;
    - npm-скрипт `deploy:vk:dev:winter`.
- [ ] `node scripts/test-events.mjs && node scripts/test-halloween.mjs` → оба PASS.
- [ ] Commit `feat(events): календарь ивентов, предпросмотр любого ивента`.

### Task 2: Описание ивента и общий прогресс

**Files:**
- Move: `src/data/halloween.js` → `src/data/events/halloween.js`. Старый путь остаётся
  реэкспортом, чтобы не трогать тест.
- Create: `src/lib/eventProgress.js`
- Modify: `src/lib/halloweenProgress.js` — превращается в обёртки над `eventProgress` с HALLOWEEN
- Test: `scripts/test-events.mjs`

**Interfaces:**
- `EventDef = { id, title, modeTitle, currency, riddles, track, dailyCap, capXpPerUnit, unitsFor(attempts, {ice}), ice? }`.
  Описание хранит и даты из Task 1: `EVENTS` собирается из описаний.
- `getEvent(id) → EventDef | null`, `eventItems(def)`, `stepFor(def, ref)` — в `src/data/events/index.js`.
- Функции `eventProgress.js`:
  - `normalize(def, raw)`;
  - `applyResult(def, raw, { won, attempts, word, today, ice })` → `{ next, gained, capped, newSteps }`;
  - `merge(def, a, b)`, `nextRiddle(def, seen, exclude)`, `dueSteps(def, st)`, `trackDone(def, st)`;
  - `earnedToday(st, today)`, `nextStep(def, st)`.
- Для `halloween` `normalize` и `merge` пишут и `pumpkins` (= earned) и учитывают
  `LEGACY_STEPS`. Для зимы — `iceWins` и `iceBest` (max при слиянии; +1 и max при победе
  в гонке).
- Зимняя заготовка: `unitsFor = (a, {ice}) => (a<=2?3:a<=4?2:1) * (ice?2:1)`; `dailyCap 12`,
  ступени из Global Constraints, `ref` — id из Task 6. Временно 3 тестовые загадки.

- [ ] Тесты:
  - зима: победа с 1 попытки — 3, в гонке — 6; лимит 12 в день режет до остатка;
  - `iceWins`/`iceBest` растут только при `ice && won`;
  - `merge` берёт max от `iceBest`;
  - `normalize(winter, undefined)` → дефолты с нулями;
  - Хэллоуин через новые функции даёт ровно те же `next`, что `applyHalloweenResult`
    на тех же входах (3 сценария).
- [ ] FAIL → реализовать → оба скрипта PASS → commit `feat(events): общий прогресс ивентов`.

### Task 3: Статистика и слияние для всех ивентов

**Files:**
- Modify: `src/hooks/useStats.js`, `src/utils/mergeProgress.js`, `src/lib/eventProgress.js`
- Test: `scripts/test-events.mjs`

**Interfaces:**
- `DEFAULT_STATS[id]` и `normalize` при загрузке — для каждого ивента из `EVENTS`.
- `recordEventResult(id, { won, attempts, word, ice })` → `{ gained, capped, newSteps }`.
  Тело — нынешний `recordHalloweenResult`, обобщённое.
- `recordHalloweenResult` остаётся алиасом с `id='halloween'`.
- `restoreEventItems(stats)` идёт по `bought` всех ивентов.
- `mergeProgress` сливает `stats[id]` каждого ивента.

- [ ] Тесты:
  - `mergeProgress({halloween:{earned:40,bought:['hw-pumpkin']}}, {winter:{earned:10}})`
    содержит оба поля, а `pet.ownedDecorations` включает `hw-pumpkin`;
  - зимний `bought` восстанавливает зимний наряд;
  - снимок с одним `halloween` (старый формат, `rewards:['hw-t1']`) после `mergeProgress`
    даёт `bought` с `hw-pumpkin` (Review Focus 1).
- [ ] FAIL → реализовать → PASS → `npm run build` без ошибок → commit
  `feat(events): статистика и слияние по всем ивентам`.

### Task 4: Режим ивента в игре

**Files:**
- Modify: `src/hooks/useGame.js`, `src/App.jsx`, `src/components/GameEnd/GameEnd.jsx`,
  `src/components/NewGame/EndPanel.jsx`, `src/components/GameModes/GameModesModal.jsx`
- Create: `src/lib/eventRounds.js` — чистые функции полки, для теста
- Test: `scripts/test-events.mjs`

**Interfaces:**
- `gameMode` — id ивента. В раунде есть `ice: boolean`.
- Полки: `rounds.ev` и `rounds.ice`; `rounds.hw` читается как `rounds.ev` для halloween.
- `useGame` отдаёт `startEvent({ ice=false }) → bool`, `nextEventRiddle()`, `exitEvent()`,
  `lastEvent`, `eventId` (активный id или null). Старые имена (`startHalloween`, `lastHw`, …)
  удаляются вместе со всеми вызовами.
- `eventRounds.js`: `isLiveEventRound(round, now) → bool` — gameMode равен id активного ивента
  и слово есть в его колоде; `restoredMode(round)`.

- [ ] Тесты `isLiveEventRound`:
  - хэллоуинский раунд при открытой зиме — `false`;
  - зимний раунд после 12.01 — `false` (Review Focus 2);
  - зимний раунд в окне — `true`;
  - раунд со словом не из колоды — `false`.
- [ ] FAIL → реализовать → PASS.
- [ ] Браузер, `npm run dev`, `#halloween`: загадка, победа, выход и возврат к обычной партии,
  перезагрузка посреди загадки — всё как до рефакторинга.
- [ ] Commit `refactor(events): режим ивента вместо режима Хэллоуина`.

### Task 5: Интерфейс ивента по описанию

**Files:**
- Move/rename: `src/components/Halloween/*` → `src/components/Event/*`
  (`EventBanner`, `EventModal`, `EventGame` — бейдж валюты, карточка загадки, итог —
  и `EventIcons`)
- Modify: `src/styles/index.css` (`.hw-*` → `.ev-*` на `--ev-a/--ev-b/--ev-ink` с
  `[data-event=…]`), `Shop.jsx`, `PetScreen.jsx`, `Achievements.jsx`, `data/achievements.js`,
  `EnergyModal.jsx`, `StartMenu.jsx`

**Interfaces:**
- Компоненты получают `def = getEvent(eventId)` и берут из него тексты, валюту, ленту и лимит.
- `<div className="app" data-event={eventId}>` задаёт токены.
- Декор меню: `decor: 'bats' | 'snow'`.
- Предметы ивента: поле `event` в `PET_DECORATIONS` и `shopItems`. Видимость — через
  `eventActive(item.event)`.

- [ ] Браузер, `#halloween`, 393×873, обе темы. Экраны совпадают со скриншотами до
  рефакторинга: меню, окно ивента, магазин, наряды, достижения, итог партии.
- [ ] Commit `refactor(events): интерфейс ивента по описанию`.

### Task 6: Зимний контент

**Files:**
- Modify: `src/data/events/winter.js`, `src/data/petDecorations.js` (4 наряда:
  `w-mitten` +1, `w-scarf` +2, `w-garland` +2, `w-ushanka` +3; `source:'track'`,
  `event:'winter'`), `src/data/shopItems.js` (`cells-w-frost`, `bg-w-morning`, `bg-w-starry`),
  `src/data/achievements.js` (`w_first` 10, `w_solver` 40, `w_seer` 30, `w_ice` 40,
  `w_path` 100; вкладка `winter`), `src/data/validGuesses.js` (если слов нет в словаре)

- [ ] Тест (по образцу `test-halloween`):
  - ≥ 45 загадок, `/^[а-я]{4,6}$/`, `isValidWord`, без повторов;
  - загадка ≤ 80 символов и не содержит ответ;
  - нет слов «рожд», «христ», «ангел», «церк»;
  - все `ref` ленты существуют, ивентовые, без цены в монетах.
- [ ] Написать загадки → PASS → commit `feat(winter): контент — загадки, лента, достижения`.

### Task 7: Зимний арт

**Files:** `src/components/Pet/*` (SVG нарядов), `src/data/shopItems.js` (узоры фонов
через `enc()`), `src/styles/index.css` (стиль клеток «Иней», снег в меню, токены зимы),
`src/components/Event/EventIcons.jsx` (снежинка, ёлка, лёд)

- [ ] Браузер, `#winter`, 393×873 и 1280×800, обе темы:
  - наряды на Букле и в гардеробе;
  - фоны;
  - контраст клеток «Иней» (жёлтый → ледяной голубой, с зелёным не путается);
  - снег останавливается при reduced-motion.
- [ ] Производительность меню: CPU 4x, пинг MessageChannel — не хуже Хэллоуина.
- [ ] Commit `feat(winter): наряды, стиль клеток, фоны, снег`.

### Task 8: Логика «Ледяной гонки»

**Files:**
- Create: `src/lib/iceRace.js`
- Test: `scripts/test-events.mjs`

**Interfaces:**
- `ICE_START = { level: 0, carry: 0, started: false }`.
- `iceTick(state, dtMs, { secondsPerRow, paused }) → state`: копит `carry`, на каждые
  `secondsPerRow*1000` даёт `level+1`. Ничего не делает, если `paused` или `!started`.
- `iceStart(state) → state`: `started:true`, вызывается при первой букве.
- `iceThaw(state, newGreens, { thawPerGreen }) → state`: `level = max(0, level - newGreens*thawPerGreen)`.
- `newGreens(prevEvaluations, evaluation) → number`: позиции, впервые ставшие зелёными.
- `iceLost(state, guessesCount, rows=6) → bool`: `rows - level <= guessesCount`.

- [ ] Тесты:
  - 29 999 мс — `level 0`; 30 000 — `1`; 95 000 одним тиком — `3`, `carry 5000`;
  - `paused` — не растёт (Review Focus 4); до `iceStart` — не растёт;
  - оттепель на 2 при двух новых зелёных; не ниже 0;
  - повторная зелёная на той же позиции — не новая;
  - `iceLost` при `level 4` и 2 догадках — `true`, при 1 — `false`.
- [ ] FAIL → реализовать → PASS → commit `feat(winter): логика ледяной гонки`.

### Task 9: «Ледяная гонка» в игре

**Files:** `src/hooks/useGame.js` (раунд с `ice`, состояние в сохранении, тик по
`requestAnimationFrame` или 250 мс-интервалу, пауза), `components/Event/EventGame.jsx`
(слой льда, полоска времени, подпись «Лёд проснётся с первой буквой», «Продолжить» после
перезагрузки), `EventModal.jsx` и `GameModesModal.jsx` (карточка «Ледяная загадка»), CSS
(лёд: градиент и узор инея, подъём transform ~400 мс)

**Interfaces:**
- Пауза = `document.hidden || adShowing || anyModalOpen || platformPaused`. Флаги уже есть
  в коде звука и рекламы, используем их.
- Поражение по льду вызывает тот же `recordLoss`/`recordEventResult({won:false})`, что и
  обычный проигрыш.
- В раунд пишутся `ice: { level, carry, started }`. После перезагрузки — `paused` до касания.

- [ ] Браузер, `#winter`:
  - гонка до победы с оттепелью;
  - гонка до поражения;
  - реклама или окно посреди гонки — лёд стоит;
  - перезагрузка — «Продолжить», уровень тот же;
  - выход и возврат с полки — тот же уровень.
- [ ] Commit `feat(winter): ледяная гонка`.

### Task 10: Англоязычные площадки

**Files:** ветка `english` — слить в неё `winter`. `src/data/events/winter.js` получает
`riddlesEn` (≥ 45 английских слов 4–6 букв из английского словаря пакета и загадки);
`src/i18n/en.js` — строки ивента; название ивента на английском.

- [ ] Тест: английские слова проходят английский `isValidWord`; `scripts/i18n-check.mjs`
  без пропусков.
- [ ] Браузер `?lang=en#winter`: все экраны ивента на английском, иконки без эмодзи
  (сборка Playgama).
- [ ] Commit в `english`. Обновление архива на Playgama — только с «да» пользователя
  (новый архив + `publish_sandbox`).

### Task 11: Выпуск

- [ ] Все тесты (`test-events`, `test-halloween`), `npm run build:vk`, `npm run build:yandex`.
- [ ] Слить `winter` в main → push → `build:yandex` → `deploy:vk:auto` (по правилу проекта).
- [ ] На боевом VK `vk.com/app54762016#winter` — ивент виден; без метки — не виден.
- [ ] Скриншоты для заявки: меню с баннером, окно ивента, загадка, гонка, наряды.
- [ ] 2.12: заявка `Фичеринг: Новый год: ВКонтакте` (текст готовлю я, отправляет пользователь
  или я по его «да»).
- [ ] `tasks/lessons.md` и навык `game-platforms`: уроки ивента.
