import { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_CATEGORY,
  ACHIEVEMENT_CATEGORIES,
  getProgress,
  unclaimedAchievementIds,
  unlockedCountIn
} from '../../data/achievements.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon } from '../icons/Icon.jsx';
import { coinsLabel } from '../../utils/plural.js';

export function AchievementsModal({ open, onClose }) {
  const { stats, claimAchievement, showToast } = useGameContext();
  const unlocked = useMemo(
    () => new Set(stats.unlockedAchievements || []),
    [stats.unlockedAchievements]
  );

  const [tab, setTab] = useState(ACHIEVEMENT_CATEGORIES[0].id);

  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
  const pct = Math.round((done / total) * 100);

  const items = ACHIEVEMENTS_BY_CATEGORY[tab] || [];
  // Открытые, но не забранные — кнопка «Забрать» (VK и Яндекс; в вебе пусто).
  const unclaimed = useMemo(() => new Set(unclaimedAchievementIds(stats)), [stats]);
  const claim = (id) => {
    const got = claimAchievement?.(id) || 0;
    if (got) showToast?.(`+${coinsLabel(got)} за достижение`);
  };

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

        <div className="ach-tabs" role="tablist">
          {ACHIEVEMENT_CATEGORIES.map((c) => {
            const catTotal = (ACHIEVEMENTS_BY_CATEGORY[c.id] || []).length;
            const catDone  = unlockedCountIn(c.id, unlocked);
            const catClaim = (ACHIEVEMENTS_BY_CATEGORY[c.id] || []).some((a) => unclaimed.has(a.id));
            const isActive = tab === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                className={`ach-tab${isActive ? ' ach-tab--active' : ''}`}
                onClick={() => setTab(c.id)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="ach-tab__label">{c.label}</span>
                <span className="ach-tab__count">{catDone}/{catTotal}</span>
                {catClaim && <span className="ach-tab__dot" aria-label="Есть награда" />}
              </button>
            );
          })}
        </div>

        <div className="ach-list">
          {items.map((a) => (
            <AchCard
              key={a.id}
              ach={a}
              stats={stats}
              unlocked={unlocked.has(a.id)}
              claimable={unclaimed.has(a.id)}
              onClaim={() => claim(a.id)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function AchCard({ ach, stats, unlocked, claimable, onClaim }) {
  const prog = getProgress(ach, stats);
  const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
  return (
    <div className={`ach-card${unlocked ? ' ach-card--unlocked' : ''}${claimable ? ' ach-card--claim' : ''}`}>
      <div className="ach-card__icon" aria-hidden="true">{ach.icon}</div>
      <div className="ach-card__body">
        <div className="ach-card__row">
          <div className="ach-card__title">{ach.title}</div>
          {ach.reward > 0 && (
            <div className="ach-card__reward" title="Награда">
              <CoinIcon />
              <span>+{ach.reward}</span>
            </div>
          )}
        </div>
        <div className="ach-card__desc">{ach.desc}</div>

        <div className="ach-card__progress">
          <div className="ach-card__bar">
            <div className="ach-card__bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="ach-card__progress-text">
            <b>{prog.current}</b> / {prog.target}
          </div>
        </div>

        {claimable ? (
          <div className="ach-card__status-row">
            <button
              type="button"
              className="ach-card__claim"
              onClick={onClaim}
              onMouseDown={(e) => e.preventDefault()}
            >
              Забрать <CoinIcon /> +{ach.reward}
            </button>
          </div>
        ) : unlocked && (
          <div className="ach-card__status-row">
            <span className="ach-card__status">Получено</span>
          </div>
        )}
      </div>
    </div>
  );
}
