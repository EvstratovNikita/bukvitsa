// Повторный вход для заливки на хостинг VK (npm run deploy:vk:*), когда
// сохранённый токен перестал работать — например, после смены пароля VK.
//
//   node scripts/vk-login.cjs
//
// Повторяет вход пакета @vkontakte/vk-miniapps-deploy без вопросов в
// терминале: печатает ссылку, ждёт, пока владелец откроет её и подтвердит
// вход в браузере, и кладёт токен туда же, откуда его берёт пакет
// (configstore). Сам токен не печатается.
const path = require('node:path');
const pkgDir = path.dirname(require.resolve('@vkontakte/vk-miniapps-deploy/package.json'));
const pkg = require(path.join(pkgDir, 'package.json'));
const Configstore = require(require.resolve('configstore', { paths: [pkgDir] }));

const OAUTH = 'https://oauth.vk.ru/';
const DEPLOY_APP_ID = 6670517; // как в пакете (index.js)
const APP_ID = require('../vk-hosting-config.json').app_id;
const WAIT_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const res = await (await fetch(`${OAUTH}get_auth_code?scope=offline&client_id=${DEPLOY_APP_ID}&mini_app_id=${APP_ID}`)).json();
  if (!res.auth_code) throw new Error('VK не выдал код входа: ' + JSON.stringify(res.error || res));
  const { auth_code, device_id } = res;
  console.log(`Открой и подтверди вход:\n${OAUTH}code_auth?stage=check&code=${auth_code}&revoke=1`);

  const until = Date.now() + WAIT_MS;
  while (Date.now() < until) {
    await sleep(4000);
    const r = await fetch(`${OAUTH}code_auth_token?device_id=${device_id}&client_id=${DEPLOY_APP_ID}&mini_app_id=${APP_ID}`);
    const j = await r.json().catch(() => ({}));
    if (r.status === 200 && j.access_token) {
      const vault = new Configstore(pkg.name, {});
      vault.set('access_token', j.access_token);
      vault.set('expires_in', j.expires_in || 0);
      console.log('✓ вход выполнен, токен сохранён');
      return;
    }
  }
  console.error('✗ вход не подтверждён за 10 минут');
  process.exit(1);
})().catch((e) => { console.error('✗', e.message || e); process.exit(1); });
