// Что игра сообщает площадке о себе: готова к игре, партия идёт, партия стоит.
// Один вход для всех площадок: приложению незачем знать, чей это SDK.
import { gameplayStart as yaStart, gameplayStop as yaStop, loadingReady as yaReady } from './yandex.js';
import { initPlaygama, pgGameplayStart, pgGameplayStop } from './playgama.js';
import { initTelegram } from './telegram.js';

// До старта приложения: Bridge требует инициализации раньше игры.
export async function initPlatformSdk() {
  initTelegram();
  await initPlaygama();
}

export function gameIsReady() {
  yaReady();
}

export function gameplayStart() {
  yaStart();
  pgGameplayStart();
}

export function gameplayStop() {
  yaStop();
  pgGameplayStop();
}
