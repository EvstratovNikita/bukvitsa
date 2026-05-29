// Russian plural form picker. Returns one of three forms based on n:
//   one   — 1, 21, 31…   (монета)
//   few   — 2–4, 22–24…  (монеты)
//   many  — 0, 5–20…     (монет)
export function plural(n, one, few, many) {
  const abs = Math.abs(n);
  const m10 = abs % 10;
  const m100 = abs % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// "монета / монеты / монет" for a given count.
export const pluralCoins = (n) => plural(n, 'монета', 'монеты', 'монет');

// "N монета/монеты/монет" — number + correct form.
export const coinsLabel = (n) => `${n} ${pluralCoins(n)}`;
