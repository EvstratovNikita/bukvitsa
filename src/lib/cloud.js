// Облако площадки за одним интерфейсом.
//
// У Яндекса это player.getData/setData, у VK — VKWebAppStorageGet/Set с
// разбивкой на части. Логика синхронизации (hooks/useCloudSync.js) про эту
// разницу не знает и работает с любым адаптером: у неё хватает своих тонких
// мест — не писать игроку, у которого не читали; не открывать запись после
// неудачного чтения, — и второй копии этого кода быть не должно.
//
// Контракт адаптера:
//   load()      → { ok, data }   ok=false означает «прочитать не смогли»,
//                                 и это НЕ то же самое, что «там пусто»
//   save(obj)   → boolean
//   identity()  → строка вида 'режим:id' или null
//   status      → объект диагностики (window.__buklitsaCloud)
import { isYandexGames, isVk } from './platform.js';
import { cloudLoad as yaLoad, cloudSave as yaSave, playerIdentity as yaIdentity, cloudStatus as yaStatus } from './yandex.js';
import { cloudLoad as vkLoad, cloudSave as vkSave, playerIdentity as vkIdentity, cloudStatus as vkStatus } from './vk.js';

const offline = {
  load: async () => ({ ok: false, data: null }),
  save: async () => false,
  identity: async () => null,
  status: { platform: false, load: '—', identity: '—', readFrom: '—', save: '—' }
};

function pick() {
  if (isYandexGames) return { load: yaLoad, save: yaSave, identity: yaIdentity, status: yaStatus };
  if (isVk) return { load: vkLoad, save: vkSave, identity: vkIdentity, status: vkStatus };
  return offline;
}

export const cloud = pick();
