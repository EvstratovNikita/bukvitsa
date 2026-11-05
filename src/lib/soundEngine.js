// Воспроизведение: WebAudio. Подключается только в сборках со звуком.
// Музыка не держит загрузку: скачивается после первого жеста игрока.
const FILES = import.meta.glob('../assets/audio/*.mp3', { query: '?url', import: 'default', eager: true });
const url = (name) => FILES[`../assets/audio/${name}.mp3`];

// Точная длина цикла (scripts/build-audio.mjs): mp3 дополняет конец тишиной,
// поэтому цикл задаём сами, иначе на стыке слышна пауза.
const LOOPS = { menu: 150, game: 150 };
const MUSIC_VOLUME = 0.4;
const SFX_VOLUME = { key: 0.35, flip: 0.3, click: 0.4, back: 0.45, open: 0.4 };
// Смена меню и партии: плавной музыке короткий переход режет слух.
const FADE = 1.5;

export function createEngine() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_VOLUME;
  musicBus.connect(master);
  const buffers = new Map();
  let current = null; // { name, src, gain }
  let target = null;

  const load = (name) => {
    if (!buffers.has(name)) {
      buffers.set(name, fetch(url(name)).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)));
    }
    return buffers.get(name);
  };

  async function startMusic(name) {
    target = name;
    if (current?.name === name) return;
    let buf;
    try { buf = await load(`music-${name}`); } catch (e) { console.warn('[sound] music', e); return; }
    if (target !== name) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(musicBus);
    const src = ctx.createBufferSource();
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
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(1, now + FADE);
    const prev = current;
    current = { name, src, gain };
    if (prev) {
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + FADE);
      prev.src.stop(now + FADE + 0.05);
    }
  }

  // Эффекты грузим заранее, сразу после первого жеста.
  ['key', 'back', 'enter', 'flip', 'error', 'click', 'open', 'close', 'coin', 'claim', 'buy', 'hint', 'toggle', 'pet', 'win', 'lose']
    .forEach((n) => load(`sfx-${n}`).catch(() => {}));

  return {
    unlock() {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setSilent(on) {
      // Звук стоит вместе с контекстом: музыка продолжит с того же места.
      if (on) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    },
    playMusic: startMusic,
    async playSfx(name) {
      let buf;
      try { buf = await load(`sfx-${name}`); } catch { return; }
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = SFX_VOLUME[name] ?? 0.6;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(master);
      src.start();
    }
  };
}
