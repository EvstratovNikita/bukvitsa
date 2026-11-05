// Сборки без звука: настоящий движок и файлы музыки не попадают в архив
// (алиас в vite.config.js).
export function createEngine() {
  return { unlock() {}, setSilent() {}, playMusic() {}, playSfx() {} };
}
