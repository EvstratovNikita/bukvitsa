// Воспроизведение: WebAudio. Подключается только в сборках со звуком.
// Музыка не держит загрузку: скачивается после первого жеста игрока.
//
// Два контекста: эффектам нужен малый буфер (клавиша отзывается сразу), музыке —
// большой. С общим малым буфером телефон под нагрузкой не успевал его наполнять,
// и музыка хрипела.
const FILES = import.meta.glob('../assets/audio/*.mp3', { query: '?url', import: 'default', eager: true });
const url = (name) => FILES[`../assets/audio/${name}.mp3`];

// Точная длина цикла (scripts/build-audio.mjs): mp3 дополняет конец тишиной,
// поэтому цикл задаём сами, иначе на стыке слышна пауза.
const LOOPS = { menu: 150, game: 150 };
const MUSIC_VOLUME = 0.4;
const SFX_VOLUME = { key: 0.35, flip: 0.3, click: 0.4, back: 0.45, open: 0.4 };
// Смена меню и партии: плавной музыке короткий переход режет слух.
const FADE = 1.5;
const SFX = ['key', 'back', 'enter', 'flip', 'error', 'click', 'open', 'close', 'coin', 'claim', 'buy', 'hint', 'toggle', 'pet', 'win', 'lose'];

export function createEngine() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const musicCtx = new Ctx({ latencyHint: 'playback' });
  const sfxCtx = new Ctx({ latencyHint: 'interactive' });
  const contexts = [musicCtx, sfxCtx];
  const musicBus = musicCtx.createGain();
  musicBus.gain.value = MUSIC_VOLUME;
  musicBus.connect(musicCtx.destination);
  const buffers = new Map();
  let current = null; // { name, src, gain }
  let target = null;

  const load = (name, ctx) => {
    if (!buffers.has(name)) {
      buffers.set(name, fetch(url(name)).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)));
    }
    return buffers.get(name);
  };

  // Эффекты грузим сразу после первого жеста и по одному, музыку — после них:
  // одновременное декодирование всего сразу нагружало телефон в самый первый момент.
  const sfxReady = SFX.reduce(
    (p, n) => p.then(() => load(`sfx-${n}`, sfxCtx).catch(() => {})),
    Promise.resolve()
  );

  async function startMusic(name) {
    target = name;
    if (current?.name === name) return;
    await sfxReady;
    if (target !== name || current?.name === name) return;
    let buf;
    try { buf = await load(`music-${name}`, musicCtx); } catch (e) { console.warn('[sound] music', e); return; }
    if (target !== name || current?.name === name) return;
    const gain = musicCtx.createGain();
    gain.gain.value = 0;
    gain.connect(musicBus);
    const src = musicCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // Задержка кодировщика: начало цикла — первый неслышимо близкий к нулю кадр.
    const data = buf.getChannelData(0);
    let start = 0;
    const limit = Math.min(data.length, Math.floor(buf.sampleRate * 0.1));
    while (start < limit && Math.abs(data[start]) < 1e-4) start += 1;
    if (start >= limit) start = 0;
    src.loopStart = start / buf.sampleRate;
    src.loopEnd = Math.min(buf.duration, src.loopStart + LOOPS[name]);
    src.connect(gain);
    src.start(0, src.loopStart);
    const now = musicCtx.currentTime;
    gain.gain.linearRampToValueAtTime(1, now + FADE);
    const prev = current;
    current = { name, src, gain };
    if (prev) {
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + FADE);
      prev.src.stop(now + FADE + 0.05);
    }
  }

  return {
    unlock() {
      contexts.forEach((c) => { if (c.state === 'suspended') c.resume().catch(() => {}); });
    },
    setSilent(on) {
      // Звук стоит вместе с контекстом: музыка продолжит с того же места.
      contexts.forEach((c) => (on ? c.suspend() : c.resume()).catch(() => {}));
    },
    playMusic: startMusic,
    async playSfx(name) {
      let buf;
      try { buf = await load(`sfx-${name}`, sfxCtx); } catch { return; }
      const src = sfxCtx.createBufferSource();
      const gain = sfxCtx.createGain();
      gain.gain.value = SFX_VOLUME[name] ?? 0.6;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(sfxCtx.destination);
      src.start();
    }
  };
}
