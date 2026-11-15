// Контент новогоднего ивента «Новогодний переполох» (26.12.2026 – 11.01.2027):
// зимние загадки, «Ледяная гонка» и лента наград за снежинки.
//
// Слова — общеизвестные и тёплые, 4–6 букв, ё → е, каждое проходит
// isValidWord. Без религии (правило Playgama 4.1). Полный список загадок —
// задача 6 плана; пока здесь заготовка для движка и тестов.

export const W_RIDDLES = [
  { word: 'санки', riddle: 'Летом отдыхают в сарае, зимой мчат с горки вниз' },
  { word: 'иней', riddle: 'Белый пушок на ветках и проводах морозным утром' },
  { word: 'сугроб', riddle: 'Снежная гора у подъезда, которую намела метель' }
];

// Лента наград. Снежинки не тратятся: ступень открывается, когда заработано
// `need` за весь ивент. Ивент длится 17 дней: при игре на дневной максимум
// конец ленты берётся за 8 дней, через день — к концу ивента.
//   kind: deco — наряд Букли, shop — фон или стиль клеток, coins — монеты.
export const W_TRACK = [
  { id: 'w-s1', need: 6,  kind: 'deco',  ref: 'w-mitten' },
  { id: 'w-s2', need: 14, kind: 'deco',  ref: 'w-scarf' },
  { id: 'w-s3', need: 24, kind: 'shop',  ref: 'cells-w-frost' },
  { id: 'w-s4', need: 35, kind: 'shop',  ref: 'bg-w-morning' },
  { id: 'w-s5', need: 47, kind: 'deco',  ref: 'w-garland' },
  { id: 'w-s6', need: 60, kind: 'coins', amount: 100 },
  { id: 'w-s7', need: 74, kind: 'shop',  ref: 'bg-w-starry' },
  { id: 'w-s8', need: 90, kind: 'deco',  ref: 'w-ushanka', grand: true }
];

export const WINTER_EVENT = {
  id: 'winter',
  title: 'Новогодний переполох',
  modeTitle: 'Зимние загадки',
  iceTitle: 'Ледяная загадка',
  riddles: W_RIDDLES,
  track: W_TRACK,
  dailyCap: 12,
  capXpPerUnit: 2,
  // 1–2 попытки → 3, 3–4 → 2, 5–6 → 1; в «Ледяной гонке» вдвое больше.
  unitsFor: (attempts, { ice = false } = {}) => (attempts <= 2 ? 3 : attempts <= 4 ? 2 : 1) * (ice ? 2 : 1),
  // «Ледяная гонка с оттепелью»: строка льда за secondsPerRow секунд игры,
  // каждая новая зелёная буква опускает лёд на thawPerGreen строк.
  ice: { secondsPerRow: 30, thawPerGreen: 1 }
};
