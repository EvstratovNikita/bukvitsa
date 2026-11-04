// Пакет языка: что загадываем, что принимаем как догадку, сложность слов.
// Подгружается один раз из lib/lang.js до старта приложения.
let pack = null;

export async function loadPack(lang) {
  const m = lang === 'en' ? await import('./en/pack.js') : await import('./ru/pack.js');
  pack = m.PACK;
  return pack;
}

export function getPack() {
  if (!pack) throw new Error('Пакет языка не загружен: сначала initLang() / loadPack()');
  return pack;
}
