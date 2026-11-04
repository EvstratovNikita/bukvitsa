# Hootword — английская версия «Буклицы»

Ветка `english`. Игра **Hootword**, совёнок **Pip** (заменяются в `src/i18n/en.js`,
логотип — `LOGO` в `StartMenu.jsx`, заставка — `vite.config.js`).

## Как устроено

- Язык решается до импорта приложения: `main.jsx` → `lib/lang.js`.
- Текст: `tr('Русская фраза')`, перевод в `src/i18n/en.js`. Проверка полноты:
  `npm run i18n:check`. Новая строка без перевода уронит проверку.
- Слова: `data/ru/` (не менять порядок — Слово дня) и `data/en/` — генератор
  `scripts/gen-en-words.mjs`, ручная вычитка `scripts/en-words-review.json`.
  Источник — SCOWL, а не список Wordle.
- Загадываемых слов: 4 буквы 1601, 5 букв 2387, 6 букв 3403 (по уровням).
  Слово дня — из лёгких и средних, день по UTC.
- Правила и экономика общие с русской версией. Ивент «Ночь тыкв» в английской
  версии выключен: загадки не переведены.
- Площадка: `lib/platform.js`; реклама `lib/ads.js`; сохранения `lib/cloud.js`;
  события готовности `lib/lifecycle.js`.

## Сборки

| Команда | Архив | Язык | Сохранения | Реклама |
|---|---|---|---|---|
| `npm run build:yandex` | `buklitsa-yandex.zip` | по SDK Яндекса | облако игрока | как раньше |
| `npm run build:playgama` | `hootword-playgama.zip` | en | Bridge storage | Bridge: за награду и межстраничная |
| `npm run build:gamemonetize` | `hootword-gamemonetize.zip` | en | localStorage | только межстраничная: ролика за награду в SDK нет |
| `npm run build:telegram` | `hootword-telegram.zip` | по клиенту Telegram | CloudStorage | Adsgram |
| `npm run build:vk` | `buklitsa-vk.zip` | ru | как раньше | как раньше |

## Что нужно завести на площадках (данные аккаунта — настоящие)

- **GameMonetize:** gamemonetize.com → Dashboard → My games → Add game → GameId
  в `.env.gamemonetize.local`: `VITE_GM_GAME_ID=…`, пересобрать, Verify Game.
- **Telegram:** бот в @BotFather, Mini App, хостинг папки `dist` (https). Кабинет
  Adsgram → блоки за награду и межстраничный. В `.env.telegram.local`:
  `VITE_TG_APP_LINK`, `VITE_ADSGRAM_REWARD_BLOCK`, `VITE_ADSGRAM_INTER_BLOCK`.
- **Playgama:** developer.playgama.com → архив. Файл `playgama-bridge-config.json`
  пустой: содержимое в документации не описано, уточнить при модерации.
- **Яндекс:** в консоли включить английский язык в карточке, добавить название и
  описание на английском. Модерация обычная.
- Адрес поддержки по умолчанию `relagames@yandex.com`; другой — `VITE_SUPPORT_EMAIL`.

## Не сделано

- Карточки для площадок: иконка, обложки, скриншоты и описание Hootword.
- Живая проверка в настоящих SDK: тестировалось на заглушке Bridge и поддельных
  Telegram и Adsgram.
- Правило Playgama 1.5.2 (не использовать Esc): Esc по-прежнему закрывает окна.
- Форма обратной связи в русской версии на площадках не отправляет сообщения:
  сервер там выключен (было и раньше, не менялось).

## Проверка

`node scripts/test-i18n.mjs` (русское Слово дня на 1000 дней совпадает с прежним,
словари), `npm run i18n:check`, `node scripts/test-halloween.mjs`.
Обход экранов — `scripts/qa-en-sweep.js` на сервере `--mode gamemonetize`.
