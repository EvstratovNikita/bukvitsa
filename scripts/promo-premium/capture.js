// Запись геймплея «Буклицы» для премиального ролика.
// Настоящая сборка в мобильном вьюпорте 432×768 (DPR 2.5), CDP screencast
// ~60 fps. Каждый клип пересобирается в ровные 60 fps по меткам времени
// кадров и получает свои метки событий (marks) — по ним сцена синхронизирует
// монеты, смену фона и прочее. В конце снимаем SVG совы с вычисленными
// стилями — это тот же персонаж, что в игре.
const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'http://127.0.0.1:8123/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = ['first_win','first_try','streak_3','play_5','won_10','daily_2','first_hint','streak_10','won_50','won_200','played_100','first_try_5','hints_used_20','daily_6','fast_30','fast_15','all_attempts','first_purchase','change_bg','coins_50','inventory_5','purchases_10','coins_500','pet_lvl_5','pet_lvl_10','deco_first','deco_5','deco_full_outfit','deco_collection'];

(async () => {
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
  const ctx = await b.newContext({
    viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true,
    locale: 'ru-RU', timezoneId: 'Europe/Moscow'
  });
  ctx.setDefaultTimeout(6000);
  await ctx.addInitScript((done) => {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
    const now = new Date().toISOString();
    localStorage.setItem('wordle-ru:stats', JSON.stringify({
      played: 26, won: 21, lost: 5, currentStreak: 4, maxStreak: 7, totalGuesses: 74, bestAttempts: 2,
      coins: 260, lastVisitDate: key, dailyStreak: 4, distribution: [1,6,7,5,2,0],
      inventory: ['bg-autumn-night','bg-autumn-park','bg-aurora','bg-stars'],
      activeBackground: null, activeCellStyle: null, energy: 5, lastEnergyTickAt: null,
      coinsEarned: 520, hintsUsed: 3, itemsBought: 4, unlockedAchievements: done,
      prefs: { theme: 'dark', enterOnLeft: false, petBond: 64, petBondTickAt: now, petGifts: [], bgByTheme: {}, tourDone: true },
      daily: { lastPlayedKey: key, lastResult: null, streak: 3, maxStreak: 5, gamesPlayed: 12, gamesWon: 10 },
      pet: { hatched: true, name: 'Букля', species: 'owl', bornAt: new Date(Date.now() - 9e8).toISOString(), xp: 340, level: 4, hunger: 82, lastHungerTickAt: now, ownedDecorations: [], equipped: {}, lastTrainAt: {} }
    }));
    localStorage.setItem('wordle-ru:game', JSON.stringify({ solution: 'замок', guesses: [], evaluations: [], status: 'playing', hints: [null,null,null,null,null], gameMode: 'normal', wordLength: 5 }));
    localStorage.setItem('wordle-ru:daily-skipped', JSON.stringify(key));
    localStorage.setItem('wordle-ru:tour-done', '1');
  }, DONE);

  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('.board');
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }).catch(() => {});
  await sleep(1400);

  const cdp = await ctx.newCDPSession(page);
  let last = null;
  let frames = [];
  let rec = false;
  let frameSize = null;
  cdp.on('Page.screencastFrame', async (f) => {
    last = { t: f.metadata.timestamp, data: f.data };
    if (rec) frames.push(last);
    if (!frameSize) frameSize = f.metadata.deviceWidth + 'css';
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await sleep(600);

  const now = () => Date.now() / 1000;
  const tapKey = (label) => page.locator(`.key[aria-label="${label}"]`).first().tap();

  async function clip(name, fn) {
    const t0 = now();
    frames = last ? [{ t: t0, data: last.data }] : [];
    rec = true;
    const M = {};
    const mark = (k) => { M[k] = +(now() - t0).toFixed(3); };
    await sleep(200);
    await fn(mark);
    rec = false;
    const dur = now() - t0;
    const fr = frames.slice().sort((a, b) => a.t - b.t);
    const n = Math.floor(dur * 60);
    fs.mkdirSync(`clips/${name}`, { recursive: true });
    let j = 0;
    for (let k = 0; k < n; k++) {
      const tt = t0 + k / 60;
      while (j + 1 < fr.length && fr[j + 1].t <= tt) j++;
      fs.writeFileSync(`clips/${name}/${String(k).padStart(5, '0')}.jpg`, Buffer.from(fr[j].data, 'base64'));
    }
    console.log(`clip ${name}: ${n} frames @60, source ${fr.length}, ${dur.toFixed(2)}s`, JSON.stringify(M));
    return { n, marks: M };
  }

  const A = await clip('A', async (mark) => {
    mark('start');
    for (const ch of 'КОШКА') { await tapKey(ch); await sleep(100); }
    mark('enter1'); await tapKey('Ввод'); await sleep(1850);
    for (const ch of 'ЗАМОК') { await tapKey(ch); await sleep(100); }
    mark('enter2'); await tapKey('Ввод'); await sleep(1650);
    mark('win'); await sleep(1500);
  });

  await page.locator('.gameend__close').first().tap().catch(() => {});
  await sleep(800);

  const B = await clip('B', async (mark) => {
    mark('start');
    await page.locator('[data-tour="menu"]').first().tap(); await sleep(550); mark('menu');
    await page.locator('.menu button', { hasText: 'Магазин' }).first().tap(); await sleep(900); mark('shop');
    await page.locator('.shop__subtab', { hasText: 'Светлые' }).first().tap(); await sleep(750); mark('light');
    await page.locator('.shop-card', { hasText: 'Золотая осень' }).locator('button').first().tap(); mark('applied'); await sleep(1000);
    await page.locator('.modal__close').first().tap(); mark('closed'); await sleep(1100);
  });

  const C = await clip('C', async (mark) => {
    mark('start');
    await page.locator('.pet-headerbtn').first().tap(); await sleep(1150); mark('open');
    await page.locator('.owl-svg').first().tap(); mark('jump'); await sleep(1250);
    await page.locator('.owl-svg').first().tap(); mark('jump2'); await sleep(1300);
  });

  await cdp.send('Page.stopScreencast');

  // Сова: без анимаций, вычисленные стили переносим в атрибуты, CSS-переменные подставляем.
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
  await sleep(300);
  const owl = await page.evaluate(() => {
    const svg = document.querySelector('.owl-svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    const src = svg.querySelectorAll('*');
    const dst = clone.querySelectorAll('*');
    src.forEach((n, i) => {
      const cs = getComputedStyle(n);
      const st = [];
      if (cs.display === 'none') st.push('display:none');
      if (cs.visibility === 'hidden') st.push('visibility:hidden');
      if (cs.opacity !== '1') st.push('opacity:' + cs.opacity);
      if (cs.transform && cs.transform !== 'none') st.push('transform:' + cs.transform, 'transform-origin:' + cs.transformOrigin, 'transform-box:' + cs.transformBox);
      if (st.length) dst[i].setAttribute('style', st.join(';'));
    });
    clone.removeAttribute('role');
    clone.setAttribute('class', 'owl-art');
    let html = clone.outerHTML;
    const root = getComputedStyle(svg);
    for (const v of ['--owl-rim', '--owl-edge', '--owl-contact', '--owl-drop']) html = html.split(`var(${v})`).join(root.getPropertyValue(v).trim() || 'rgba(0,0,0,.3)');
    return html;
  });
  if (!owl) throw new Error('owl svg not found');
  fs.writeFileSync('owl.svg.html', owl);

  fs.writeFileSync('clips.json', JSON.stringify({ A, B, C, frameSize }, null, 1));
  await b.close();
  console.log('capture ok, owl', owl.length, 'bytes, frame', frameSize);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
