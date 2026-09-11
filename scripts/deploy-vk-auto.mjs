// Заливка на хостинг VK без вопросов.
//
//   npm run deploy:vk:auto — боевые и dev-адреса (VK пришлёт пуш на телефон:
//                            смену боевого адреса надо подтвердить)
//   npm run deploy:vk:dev  — только dev-адрес, без пуша. Его видят все
//                            администраторы, у которых включён «Режим
//                            разработки»; игроки остаются на боевом.
//
// Обычный `vk-miniapps-deploy` спрашивает четыре вещи подряд и требует
// терминала. Здесь ответы заданы заранее; тестовую группу не трогаем. Токен
// берётся из хранилища пакета (кладётся один раз при первой авторизации) или
// из MINI_APPS_ACCESS_TOKEN.
//
// Важно: конфиг берём ТЕМ ЖЕ require-module, что и сам пакет. Внутри index.js
// есть модульная переменная cfg, и api() читает токен именно из неё — если
// передать в run() копию объекта, токен туда не доедет и заливка упадёт с
// «access_token is missing».
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const devOnly = process.argv.includes('--dev');

// Окружение пакет читает из переменной внутри run(), поэтому ставим её до
// вызова: dev — загрузка только в dev-окружение хостинга.
if (devOnly) process.env.MINI_APPS_ENVIRONMENT = 'dev';

const cfg = require('require-module')('./vk-hosting-config.json');

cfg.noprompt = true;
cfg.update_prod = !devOnly;
cfg.update_dev = true;

const deploy = require('@vkontakte/vk-miniapps-deploy');

deploy
  .run(cfg)
  .then((ok) => {
    if (!ok) {
      console.error('✗ заливка не удалась');
      process.exit(1);
    }
    console.log(devOnly ? '✓ залито на dev (боевой адрес не тронут)' : '✓ залито на dev и боевой');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ заливка не удалась:', e);
    process.exit(1);
  });
