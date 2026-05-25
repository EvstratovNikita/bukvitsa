import { useEffect } from 'react';
import { getAchievement } from '../../data/achievements.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon } from '../icons/Icon.jsx';

const TOAST_DURATION_MS = 3200;

// Shows the next item from the achievement queue. Auto-dismisses, then the
// queue rolls forward. Stacking is left to the user's natural pace —
// multiple unlocks in one moment surface one after another, not piled up.
export function AchievementToast() {
  const { achievementToasts = [], consumeAchievementToast } = useGameContext();
  const head = achievementToasts[0];

  useEffect(() => {
    if (!head) return;
    const t = setTimeout(() => consumeAchievementToast(head.id), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [head, consumeAchievementToast]);

  if (!head) return null;
  const ach = getAchievement(head.id);
  if (!ach) return null;

  return (
    <div className="ach-toast" role="status" key={head.id}>
      <div className="ach-toast__icon" aria-hidden="true">{ach.icon}</div>
      <div className="ach-toast__body">
        <div className="ach-toast__label">Достижение</div>
        <div className="ach-toast__title">{ach.title}</div>
      </div>
      {ach.reward > 0 && (
        <div className="ach-toast__reward">
          <CoinIcon />
          <span>+{ach.reward}</span>
        </div>
      )}
    </div>
  );
}
