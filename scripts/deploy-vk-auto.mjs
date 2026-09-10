// Заливка на хостинг VK без вопросов: npm run deploy:vk:auto
//
// Обычный `vk-miniapps-deploy` спрашивает четыре вещи подряд и требует
// терминала. Здесь те же ответы заданы заранее: заливаем, обновляем и боевые,
// и dev-адреса, тестовую группу не трогаем. Токен берётся из хранилища пакета
// (кладётся один раз при первой авторизации) или из MINI_APPS_ACCESS_TOKEN.
//
// Важно: конфиг берём ТЕМ ЖЕ require-module, что и сам пакет. Внутри index.js
// есть модульная переменная cfg, и api() читает токен именно из неё — если
// передать в run() копию объекта, токен туда не доедет и заливка упадёт с
// «access_token is missing».
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cfg = require('require-module')('./vk-hosting-config.json');

cfg.noprompt = true;
cfg.update_prod = true;
cfg.update_dev = true;

const deploy = require('@vkontakte/vk-miniapps-deploy');

deploy
  .run(cfg)
  .then((ok) => {
    if (!ok) {
      console.error('✗ заливка не удалась');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ заливка не удалась:', e);
    process.exit(1);
  });
