// Генератор английских словарей: node scripts/gen-en-words.mjs
//
// Источник — SCOWL (пакет wordlist-english): списки разбиты по частотности
// (10 — самые частые … 70 — редкие). Список ответов Wordle НЕ используем: он
// чужая собственность, и повторять его незачем.
//
//   ОТВЕТЫ (что загадываем): только основы слов, без форм -s/-ed/-ing/-est,
//   как и в русской версии (там — существительные в начальной форме).
//     easy   — уровни 10–20, medium — 35, hard — 40–50.
//   ДОГАДКИ (что принимаем): всё до уровня 70, включая формы слов.
//   Чёрный список: naughty-words + BLOCK_ANSWERS ниже (только для ответов).
//
// На выходе — src/data/en/words.js. Ответы отсортированы: порядок задаёт Слово
// дня (см. dailyWord.js), и новые слова добавлять в списки только через
// EXTRA_* — иначе у всех сменится сегодняшнее слово.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = 'node_modules/wordlist-english/';
const LEVELS = [10, 20, 35, 40, 50, 55, 60, 70];

const read = (kind, lvl) => {
  try { return JSON.parse(readFileSync(`${dir}${kind}-words-${lvl}.json`, 'utf8')); } catch { return []; }
};
const atLevel = (lvl) => new Set([...read('english', lvl), ...read('american', lvl)].filter((w) => /^[a-z]+$/.test(w)));

const byLevel = Object.fromEntries(LEVELS.map((l) => [l, atLevel(l)]));
const upto = (max) => {
  const s = new Set();
  for (const l of LEVELS) if (l <= max) for (const w of byLevel[l]) s.add(w);
  return s;
};
const ALL = upto(70);

const naughty = require('naughty-words').en.map((w) => w.toLowerCase());

// Слова, которые нельзя загадывать: насилие, смерть, наркотики, болезни,
// политика, религия, грубости вне naughty-words, а также всё, что неприятно
// увидеть как «Слово дня». Догадкой такое ввести можно, загадано не будет.
const BLOCK_ANSWERS = new Set(`
abort abuse addict agony aids alcoho allah amok anal anus arson aryan assault
beat beaten behead bigot bitch bleed blood bloody bomb bomber bondage booze boob
bosom bowel brawl breast bribe brothel bully burial butt cancer carnal casket
choke christ church coffin cocaine cock coke colon condom corpse crack crap
creep crime crook crotch crude cult curse dagger damn dead deadly death debase
decay demon detox devil dildo disease drown drug drunk dumb dung dying enema
erect erotic evil execute exile faggot fart fascist fatal feces fetal fetish
fetus filth flesh foetus gang genital ghetto gore grave gross gun gunman hanged
harass hate hatred heil hell heroin herpes hitler homo hooker horny idiot idiot
imbecile incest infect insane islam jesus jihad jew jewish junkie kidnap kill
killer knife koran leper lewd loot lunatic lynch maim mafia massacre meth moron
morphine mosque murder muslim naked nazi negro nude nudist opium orgy pagan
panties pedo penis pimp piss pistol poison pope porn prison prude prick psycho
pube pubic pubis punch queer rabbi racial racism racist rape raped rapist rectal
rectum rifle riot satan scum semen sewage sexy shoot shot sissy slain slave
slay sleazy slut smut sodomy sperm stab stool strip stupid suicide syphilis
tampon teat terror testes thug toilet torture toxic tumor turd ugly urine vagina
venom vomit vulgar weapon wench whip whore womb wound wrath zealot
abused bloat bitchy cruel crazy nasty lusty gypsy pansy
`.trim().split(/\s+/));

const isBlocked = (w) => BLOCK_ANSWERS.has(w) || naughty.includes(w);

// Форма другого слова? (cats → cat, baked → bake, making → make, safest → safe)
function isInflected(w) {
  const has = (b) => b.length >= 3 && ALL.has(b);
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) {
    if (has(w.slice(0, -1))) return true;
    if (w.endsWith('es') && has(w.slice(0, -2))) return true;
    if (w.endsWith('ies') && has(`${w.slice(0, -3)}y`)) return true;
  }
  if (w.endsWith('ed')) {
    const b = w.slice(0, -2);
    if (has(b) || has(`${b}e`) || (b.at(-1) === b.at(-2) && has(b.slice(0, -1))) || (b.endsWith('i') && has(`${b.slice(0, -1)}y`))) return true;
  }
  if (w.endsWith('ing')) {
    const b = w.slice(0, -3);
    if (has(b) || has(`${b}e`) || (b.at(-1) === b.at(-2) && has(b.slice(0, -1)))) return true;
  }
  if (w.endsWith('est')) {
    const b = w.slice(0, -3);
    if (has(b) || has(`${b}e`) || (b.at(-1) === b.at(-2) && has(b.slice(0, -1))) || (b.endsWith('i') && has(`${b.slice(0, -1)}y`))) return true;
  }
  return false;
}

// Нет ни одной гласной (hmm, psst, brrr) — плохое загаданное слово.
const hasVowel = (w) => /[aeiouy]/.test(w);

const manual = (() => {
  try { return JSON.parse(readFileSync('scripts/en-words-review.json', 'utf8')); } catch { return { remove: [] }; }
})();
const REMOVED = new Set(manual.remove || []);

function answers(len) {
  const pick = (lvls, seen) => {
    const out = [];
    for (const l of lvls) {
      for (const w of [...byLevel[l]].sort()) {
        if (w.length !== len || seen.has(w) || isBlocked(w) || isInflected(w) || !hasVowel(w) || REMOVED.has(w)) continue;
        seen.add(w);
        out.push(w);
      }
    }
    return out.sort();
  };
  const seen = new Set();
  return { easy: pick([10, 20], seen), medium: pick([35], seen), hard: pick([40, 50], seen) };
}

const out = { answers: {}, guesses: {} };
for (const len of [4, 5, 6]) {
  out.answers[len] = answers(len);
  out.guesses[len] = [...ALL].filter((w) => w.length === len && !naughty.includes(w)).sort();
}

const q = (a) => `'${a.join(' ')}'`;
let js = `// Сгенерировано scripts/gen-en-words.mjs из SCOWL (wordlist-english). Не править руками.
// Порядок ответов задаёт Слово дня.
export const ANSWERS = {\n`;
for (const len of [4, 5, 6]) {
  const a = out.answers[len];
  js += `  ${len}: { easy: ${q(a.easy)}, medium: ${q(a.medium)}, hard: ${q(a.hard)} },\n`;
}
js += `};\nexport const GUESSES = {\n`;
for (const len of [4, 5, 6]) js += `  ${len}: ${q(out.guesses[len])},\n`;
js += `};\n`;

mkdirSync('src/data/en', { recursive: true });
writeFileSync('src/data/en/words.js', js);

for (const len of [4, 5, 6]) {
  const a = out.answers[len];
  console.log(len, 'easy', a.easy.length, 'medium', a.medium.length, 'hard', a.hard.length, 'guesses', out.guesses[len].length);
}
console.log('размер файла', Math.round(js.length / 1024), 'КБ');
writeFileSync(process.argv[2] || 'en-words-dump.txt', [4, 5, 6].map((l) => {
  const a = out.answers[l];
  return `== ${l} easy\n${a.easy.join(' ')}\n== ${l} medium\n${a.medium.join(' ')}\n== ${l} hard\n${a.hard.join(' ')}`;
}).join('\n'));
