import { useMemo } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_TIER } from '../../data/achievements.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { ShareButton } from '../Share/ShareButton.jsx';
import { CoinIcon } from '../icons/Icon.jsx';

export function AchievementsModal({ open, onClose }) {
  const { stats } = useGameContext();
  const unlocked = useMemo(
    () => new Set(stats.unlockedAchievements || []),
    [stats.unlockedAchievements]
  );

  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
  const pct = Math.round((done / total) * 100);

  return (
    <Modal open={open} onClose={onClose} title="Достижения">
      <div className="ach">
        <div className="ach__summary">
          <div className="ach__summary-bar">
            <div className="ach__summary-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="ach__summary-text">
            Открыто <b>{done}</b> из <b>{total}</b>
          </div>
        </div>

        <AchSection title="Простые" items={ACHIEVEMENTS_BY_TIER.easy} stats={stats} unlocked={unlocked} />
        <AchSection title="Посложнее" items={ACHIEVEMENTS_BY_TIER.hard} stats={stats} unlocked={unlocked} />
      </div>
    </Modal>
  );
}

function AchSection({ title, items, stats, unlocked }) {
  return (
    <section className="ach-section">
      <h3 className="ach-section__title">{title}</h3>
      <div className="ach-list">
        {items.map((a) => (
          <AchCard key={a.id} ach={a} stats={stats} unlocked={unlocked.has(a.id)} />
        ))}
      </div>
    </section>
  );
}

function AchCard({ ach, stats, unlocked }) {
  const prog = ach.progress ? ach.progress(stats) : null;
  const pct = prog ? Math.min(100, Math.round((prog.current / prog.target) * 100)) : (unlocked ? 100 : 0);
  return (
    <div className={`ach-card${unlocked ? ' ach-card--unlocked' : ''}`}>
      <div className="ach-card__icon" aria-hidden="true">{ach.icon}</div>
      <div className="ach-card__body">
        <div className="ach-card__row">
          <div className="ach-card__title">{ach.title}</div>
          {ach.reward > 0 && (
            <div className="ach-card__reward" title="Награда за получение">
              <CoinIcon />
              <span>+{ach.reward}</span>
            </div>
          )}
        </div>
        <div className="ach-card__desc">{ach.desc}</div>
        {prog && !unlocked && (
          <div className="ach-card__bar">
            <div className="ach-card__bar-fill" style={{ width: `${pct}%` }} />
            <span className="ach-card__bar-text">{prog.current} / {prog.target}</span>
          </div>
        )}
        {unlocked && (
          <div className="ach-card__status-row">
            <span className="ach-card__status">Получено</span>
            <ShareButton kind="achievement" achievement={ach} variant="icon" label="Поделиться" />
          </div>
        )}
      </div>
    </div>
  );
}
