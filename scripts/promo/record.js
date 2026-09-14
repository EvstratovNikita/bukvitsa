const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8123/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = ['first_win','first_try','streak_3','play_5','won_10','daily_2','first_hint','streak_10','won_50','won_200','played_100','first_try_5','hints_used_20','daily_6','fast_30','fast_15','all_attempts','first_purchase','change_bg','coins_50','inventory_5','purchases_10','coins_500','pet_lvl_5','pet_lvl_10','deco_first','deco_5','deco_full_outfit','deco_collection'];

(async () => {
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'ru-RU', timezoneId: 'Europe/Moscow',
    recordVideo: { dir: 'video', size: { width: 1280, height: 720 } }
  });
  ctx.setDefaultTimeout(5000);
  await ctx.addInitScript((done) => {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
    const now = new Date().toISOString();
    localStorage.setItem('wordle-ru:stats', JSON.stringify({
      played: 26, won: 21, lost: 5, currentStreak: 4, maxStreak: 7, totalGuesses: 74, bestAttempts: 2,
      coins: 260, lastVisitDate: key, dailyStreak: 4, distribution: [1,6,7,5,2,0],
      inventory: ['bg-autumn-night','bg-autumn-park','bg-aurora','bg-stars'],
      activeBackground: 'bg-autumn-night', activeCellStyle: null, energy: 5, lastEnergyTickAt: null,
      coinsEarned: 520, hintsUsed: 3, itemsBought: 4, unlockedAchievements: done,
      prefs: { theme:'dark', enterOnLeft:false, petBond:64, petBondTickAt:now, petGifts:[], bgByTheme:{dark:'bg-autumn-night',light:'bg-autumn-park'} },
      daily: { lastPlayedKey:key, lastResult:null, streak:3, maxStreak:5, gamesPlayed:12, gamesWon:10 },
      pet: { hatched:true, name:'Букля', species:'owl', bornAt:new Date(Date.now()-9e8).toISOString(), xp:340, level:4, hunger:82, lastHungerTickAt:now, ownedDecorations:[], equipped:{}, lastTrainAt:{} }
    }));
    localStorage.setItem('wordle-ru:game', JSON.stringify({ solution:'замок', guesses:[], evaluations:[], status:'playing', hints:[null,null,null,null,null], gameMode:'normal', wordLength:5 }));
    localStorage.setItem('wordle-ru:daily-skipped', JSON.stringify(key));
    localStorage.setItem('wordle-ru:tour-done', '1');
  }, DONE);

  // Видео пишется с момента создания страницы — от него и считаем метки,
  // чтобы монтажные склейки попадали в кадр, а не «примерно туда».
  const page = await ctx.newPage();
  const t0 = Date.now();
  const M = {};
  const mark = (k) => { M[k] = (Date.now() - t0) / 1000; };

  const tap = async (label, pause = 130) => {
    await page.locator(`.key[aria-label="${label}"]`).first().click();
    await sleep(pause);
  };
  const word = async (w) => { for (const ch of w) await tap(ch); };

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('.board');
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }).catch(() => {});
  await sleep(500);
  mark('ready');

  await word('КОШКА');            mark('word1');
  await tap('Ввод', 2100);        mark('reveal1');
  await word('ЗАМОК');            mark('word2');
  await tap('Ввод', 1300);        mark('reveal2');
  await sleep(2200);              mark('win');

  const close = page.locator('.gameend__close');
  if (await close.count()) { await close.first().click(); await sleep(700); }
  mark('afterWin');

  await page.locator('[data-tour="menu"]').click();     await sleep(600);  mark('menu');
  await page.locator('.menu button', { hasText: 'Магазин' }).first().click(); await sleep(1000); mark('shop');
  await page.locator('.shop__subtab', { hasText: 'Светлые' }).click();  await sleep(900);  mark('lightTab');
  await page.locator('.shop-card', { hasText: 'Золотая осень' }).locator('button').first().click(); await sleep(1300); mark('applied');
  await page.locator('.modal__close').first().click();  await sleep(1600); mark('boardLight');
  await page.locator('.pet-headerbtn').click();         await sleep(2400); mark('pet');
  await page.locator('[aria-label="Назад"]').first().click(); await sleep(1400); mark('end');

  await ctx.close();
  await b.close();
  fs.writeFileSync('marks.json', JSON.stringify(M, null, 1));
  console.log(JSON.stringify(M));
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
