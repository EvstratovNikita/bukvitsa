// Готовит звук игры: node scripts/build-audio.mjs <путь к ffmpeg>
//
// Источники (все под CC0) лежат в design/audio/raw, готовое — в src/assets/audio:
//   музыка — The Cynic Project, «Lifewave 2k» и «Vaporware» (opengameart.org/content/calm-ambient-3-lifewave-2k,
//            opengameart.org/content/calm-piano-1-vaporware); запасной — «Yoiyami Core Theme»
//   джинглы — MintoDog, «Cozy Puzzle» (opengameart.org)
//   эффекты — Kenney, «Interface Sounds» (opengameart.org/content/interface-sounds)
// У плавной музыки нет тактов, по которым резать: конец цикла плавно перетекает в
// его начало. Громкость — одна поправка на весь файл, иначе на стыке слышен скачок.
// ffmpeg нужен только здесь, в игру он не попадает.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ff = process.argv[2];
if (!ff) { console.error('укажите путь к ffmpeg'); process.exit(1); }

const RAW = 'design/audio/raw';
const OUT = 'src/assets/audio';
mkdirSync(OUT, { recursive: true });
const JINGLES = `${RAW}/jingles/mp3_Cozy Puzzle Jingle & Result`;
const K = `${RAW}/kenney/Audio`;

const run = (args) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

// Длина цикла (LOOP) и начало в исходнике: длины те же, что в LOOPS в lib/soundEngine.js.
const LOOP = 150;
const OVERLAP = 5;
const TARGET_DB = -23;
const MUSIC = {
  menu: { src: `${RAW}/calm/lifewave.mp3`, from: 8 },
  game: { src: `${RAW}/calm/vaporware.mp3`, from: 8 }
};
const meanVolume = (src, from) => {
  const r = spawnSync(ff, ['-hide_banner', '-ss', String(from), '-t', String(LOOP + OVERLAP), '-i', src, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(r.stderr)[1]);
};
for (const [name, m] of Object.entries(MUSIC)) {
  const gain = (TARGET_DB - meanVolume(m.src, m.from)).toFixed(2);
  // Хвост цикла перетекает в его начало: первые OVERLAP секунд идут только в наложение.
  const fc = `[0:a][1:a]acrossfade=d=${OVERLAP}:c1=tri:c2=tri,volume=${gain}dB,alimiter=limit=0.8[out]`;
  run([
    '-ss', String(m.from + OVERLAP), '-t', String(LOOP), '-i', m.src,
    '-ss', String(m.from), '-t', String(OVERLAP), '-i', m.src,
    '-filter_complex', fc, '-map', '[out]', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', `${OUT}/music-${name}.mp3`
  ]);
  console.log('музыка', name, LOOP, 'с, поправка', gain, 'дБ');
}

const SFX = {
  key: 'tick_002', back: 'drop_002', enter: 'select_002', flip: 'tick_004', error: 'error_004',
  click: 'click_002', open: 'drop_004', close: 'close_002', coin: 'confirmation_001',
  claim: 'confirmation_002', buy: 'confirmation_001', hint: 'question_001', toggle: 'toggle_002', pet: 'pluck_001'
};
for (const [name, src] of Object.entries(SFX)) {
  run(['-i', `${K}/${src}.ogg`, '-af', 'loudnorm=I=-18:TP=-2', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', `${OUT}/sfx-${name}.mp3`]);
}
for (const [name, src] of Object.entries({ win: 'Cozy Puzzle Clear (Jingle).mp3', lose: 'Cozy Puzzle Failure (Jingle).mp3' })) {
  run(['-i', `${JINGLES}/${src}`, '-af', 'loudnorm=I=-18:TP=-2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', `${OUT}/sfx-${name}.mp3`]);
}
console.log('эффектов', Object.keys(SFX).length + 2);
