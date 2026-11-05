// Готовит звук игры: node scripts/build-audio.mjs <путь к ffmpeg>
//
// Источники (все под CC0) лежат в design/audio/raw, готовое — в src/assets/audio:
//   музыка и джинглы — MintoDog, «Cozy Puzzle» (opengameart.org)
//   эффекты — Kenney, «Interface Sounds» (opengameart.org/content/interface-sounds)
// Музыка обрезается ровно по тактам: цикл без щелчка. Громкость выравнивается.
// ffmpeg нужен только здесь, в игру он не попадает.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ff = process.argv[2];
if (!ff) { console.error('укажите путь к ffmpeg'); process.exit(1); }

const RAW = 'design/audio/raw';
const OUT = 'src/assets/audio';
mkdirSync(OUT, { recursive: true });
const JINGLES = `${RAW}/jingles/mp3_Cozy Puzzle Jingle & Result`;
const K = `${RAW}/kenney/Audio`;

const run = (args) => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

// Точная длина цикла: число долей × 60 / BPM.
const MUSIC = {
  menu: { src: `${RAW}/cozy_puzzle_title_bpm95.mp3`, dur: (96 * 60) / 95 },
  game: { src: `${RAW}/cozy_puzzle_in-game_3_bpm108.mp3`, dur: (224 * 60) / 108 }
};
for (const [name, m] of Object.entries(MUSIC)) {
  run(['-i', m.src, '-t', m.dur.toFixed(5), '-af', 'loudnorm=I=-20:TP=-2:LRA=11', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', `${OUT}/music-${name}.mp3`]);
  console.log('музыка', name, m.dur.toFixed(2), 'с');
}

const SFX = {
  key: 'tick_002', back: 'scroll_002', enter: 'select_002', flip: 'tick_004', error: 'error_004',
  click: 'click_002', open: 'open_002', close: 'close_002', coin: 'confirmation_001',
  claim: 'confirmation_002', buy: 'maximize_003', hint: 'question_001', toggle: 'toggle_002', pet: 'pluck_001'
};
for (const [name, src] of Object.entries(SFX)) {
  run(['-i', `${K}/${src}.ogg`, '-af', 'loudnorm=I=-18:TP=-2', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', `${OUT}/sfx-${name}.mp3`]);
}
for (const [name, src] of Object.entries({ win: 'Cozy Puzzle Clear (Jingle).mp3', lose: 'Cozy Puzzle Failure (Jingle).mp3' })) {
  run(['-i', `${JINGLES}/${src}`, '-af', 'loudnorm=I=-18:TP=-2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', `${OUT}/sfx-${name}.mp3`]);
}
console.log('эффектов', Object.keys(SFX).length + 2);
