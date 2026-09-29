import { useEffect } from 'react';
import { getAchievement } from '../../data/achievements.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon } from '../icons/Icon.jsx';
import { isEmbedded } from '../../lib/platform.js';

// 3,2 с было мало: всплывашка появляется в момент победы, когда взгляд на
// поле и окне итога, и её просто не успевали заметить.
const TOAST_DURATION_MS = 5000;

// Shows the next item from the achievement queue. Auto-dismisses, then the
// queue rolls forward. Stacking is left to the user's natural pace —
// multiple unlocks in one moment surface one after another, not piled up.
// onOpen — открыть «Достижения»: награду там забирают кнопкой, и нажатие на
// всплывашку ведёт прямо к ней.
export function AchievementToast({ onOpen }) {
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
    <div
      className={`ach-toast${onOpen ? ' ach-toast--link' : ''}`}
      role="status"
      key={head.id}
      onClick={onOpen ? () => { consumeAchievementToast(head.id); onOpen(); } : undefined}
    >
      <div className="ach-toast__icon" aria-hidden="true">{ach.icon}</div>
      <div className="ach-toast__body">
        <div className="ach-toast__label">{isEmbedded && ach.reward > 0 ? 'Достижение · забери награду' : 'Достижение'}</div>
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
