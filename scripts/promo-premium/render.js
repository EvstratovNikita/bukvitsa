// Покадровый рендер сцены: renderAt(t) → скриншот. MODE=stills — контрольные
// кадры для проверки, MODE=full — весь ролик 60 fps.
const { chromium } = require('playwright');
const fs = require('fs');

const mode = process.argv[2] || 'stills';
const FPS = 60;

(async () => {
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.goto('http://127.0.0.1:8124/scene.html');
  await page.waitForFunction(() => window.READY === true || window.READY_ERROR, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.READY_ERROR);
  if (err) throw new Error('scene: ' + err);
  const D = await page.evaluate(() => window.DURATION);
  const TL = await page.evaluate(() => window.TIMELINE);
  console.log('duration', D.toFixed(2), 'timeline', JSON.stringify(Object.fromEntries(Object.entries(TL).map(([k, v]) => [k, +v.toFixed(2)]))));
  fs.mkdirSync('out', { recursive: true });

  const shot = async (t, path, q) => {
    await page.evaluate((tt) => window.renderAt(tt), t);
    await page.screenshot({ path, type: 'jpeg', quality: q });
  };

  // Таймлайн и звуковые события — для music.py (звук строится по тем же меткам, что и кадр).
  fs.writeFileSync('timeline.json', JSON.stringify(await page.evaluate(() => ({ TL: window.TIMELINE, D: window.DURATION, SFX: window.SFX })), null, 1));
  if (mode === 'timeline') { await b.close(); return; }

  if (mode === 'stills') {
    const times = [0, 1.0, 2.5, TL.logo + 0.45, TL.logo + 1.3, TL.logo + 2.4, TL.game - 0.1, TL.game + 0.14,
      TL.game + 1.5, TL.win - 1.9, TL.win + 0.05, TL.win + 0.9, TL.shop - 0.05, TL.warm + 0.35, TL.warm + 1.4,
      TL.pet - 0.1, TL.pet + 0.5, TL.jump + 0.3, TL.jump2 + 0.45, TL.fin - 0.08, TL.fin + 0.6, TL.fin + 1.4, TL.fin + 2.6, D - 0.02];
    const labels = [];
    for (const [i, t] of times.entries()) {
      await shot(t, `out/still-${String(i).padStart(2, '0')}.jpg`, 90);
      labels.push(t.toFixed(2));
    }
    fs.writeFileSync('out/stills.json', JSON.stringify(labels));
    // Числовая проверка центровки финала и слогана: центр по X должен быть 960.
    await page.evaluate((tt) => window.renderAt(tt), TL.fin + 3);
    const centers = await page.evaluate(() => [...document.querySelectorAll('.cta, .fsub, .tagline, .hl')].map((e) => {
      const r = document.createRange(); r.selectNodeContents(e); const b = e.classList.contains('cta') ? e.getBoundingClientRect() : r.getBoundingClientRect();
      return `${e.className.trim()}: centerX ${((b.left + b.right) / 2).toFixed(1)} width ${b.width.toFixed(0)}`;
    }));
    console.log('layout', JSON.stringify(centers));
  } else {
    const N = Math.round(D * FPS);
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await shot(i / FPS, `out/f${String(i).padStart(5, '0')}.jpg`, 95);
      if (i % 150 === 0) console.log(`frame ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    console.log('render done', N, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  await b.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
