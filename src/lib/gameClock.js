// Часы мини-игр: на паузе площадки время не идёт (Playgama, шаг 5 требований).
let pausedAt = null;
let pausedTotal = 0;

export function setClockPaused(on) {
  if (on && pausedAt == null) pausedAt = Date.now();
  if (!on && pausedAt != null) {
    pausedTotal += Date.now() - pausedAt;
    pausedAt = null;
  }
}

export const gameNow = () => (pausedAt ?? Date.now()) - pausedTotal;
