import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase.js';
import { isYandex, openAuth, getPlayerInfo, cloudSave } from '../../lib/yandex.js';
import { useGameContext } from '../../context/GameContext.jsx';
import {
  CloseIcon,
  CoinIcon,
  GiftIcon,
  HelpIcon,
  LogoutIcon,
  MailIcon,
  MenuIcon,
  SettingsIcon,
  ShopIcon,
  StatsIcon,
  TrophyIcon,
  UserIcon
} from '../icons/Icon.jsx';

export function MenuButton({ onClick }) {
  return (
    <button
      type="button"
      className="iconbtn iconbtn--accent"
      data-tour="menu"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Меню"
      title="Меню"
    >
      <MenuIcon />
    </button>
  );
}

export function SideMenu({ open, onClose, onOpenShop, onOpenStats, onOpenHelp, onOpenAuth, onOpenAchievements, onOpenInvite, onOpenSettings, onOpenFeedback, onOpenLeaderboard }) {
  const { stats, auth } = useGameContext();
  const unlockedCount = (stats.unlockedAchievements || []).length;

  // Close with ESC, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const isLinked = auth?.user && auth.isAnonymous === false;
  const accountLabel = isLinked ? (auth.user.email || 'Аккаунт') : 'Войти';
  const accountSub = isLinked ? 'Прогресс сохранён' : 'Сохрани прогресс';
  const initial = (isLinked ? (auth.user.email || '?')[0] : '?').toUpperCase();

  const handle = (fn) => () => { onClose(); fn(); };

  const onLogout = async () => {
    onClose();
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <div
        className={`menu-backdrop${open ? ' menu-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <aside
        className={`menu${open ? ' menu--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <header className="menu__head">
          <h2 className="menu__title">Меню</h2>
          <button
            type="button"
            className="menu__close"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Account / Auth section — whole row opens the auth modal so the
            user has one obvious place to log in / see their account.
            Hidden on Yandex Games: the platform forbids third-party login
            (Google/email) — only Yandex ID is allowed (deferred to a later
            bridge), so we show no login UI there. */}
        {!isYandex && (
        <button
          type="button"
          className="menu__user menu__user--btn"
          onClick={isSupabaseConfigured ? handle(onOpenAuth) : undefined}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={accountLabel}
        >
          <div className={`menu__avatar${isLinked ? ' menu__avatar--linked' : ''}`}>
            {isLinked ? initial : <UserIcon />}
          </div>
          <div className="menu__user-meta">
            <div className="menu__user-name" title={accountLabel}>{accountLabel}</div>
            <div className="menu__user-sub">{accountSub}</div>
          </div>
          <div className="menu__balance" title="Монеты">
            <CoinIcon />
            <span>{stats.coins || 0}</span>
          </div>
        </button>
        )}

        <nav className="menu__list">
          {isYandex && <YandexAuthRow onClose={onClose} />}
          <MenuItem icon={<ShopIcon />} label="Магазин" onClick={handle(onOpenShop)} accent />
          {isYandex && (
            <MenuItem icon={<TrophyIcon />} label="Лидерборд" onClick={handle(onOpenLeaderboard)} />
          )}
          <MenuItem
            icon={<TrophyIcon />}
            label="Достижения"
            badge={unlockedCount > 0 ? unlockedCount : undefined}
            onClick={handle(onOpenAchievements)}
          />
          <MenuItem icon={<StatsIcon />} label="Статистика" onClick={handle(onOpenStats)} />
          {!isYandex && (
            <MenuItem
              icon={<GiftIcon />}
              label="Пригласить друга"
              badge={(stats.referralsCount || 0) > 0 ? stats.referralsCount : undefined}
              onClick={handle(onOpenInvite)}
            />
          )}
          <MenuItem icon={<SettingsIcon />} label="Настройки" onClick={handle(onOpenSettings)} />
          <MenuItem icon={<HelpIcon />} label="Как играть" onClick={handle(onOpenHelp)} />
          <MenuItem icon={<MailIcon />} label="Обратная связь" onClick={handle(onOpenFeedback)} />
          {isLinked && (
            <MenuItem
              icon={<LogoutIcon />}
              label="Выйти"
              onClick={onLogout}
              danger
            />
          )}
        </nav>

        <footer className="menu__foot">
          <span className="menu__brand">Буквица</span>
        </footer>
      </aside>
    </>
  );
}

// Yandex-only login row. Login is optional and only via Yandex ID (platform
// rule). Authorized → cloud progress syncs across devices; guests still save
// to their browser. Shows the account name once signed in.
function YandexAuthRow({ onClose }) {
  const { stats, showToast } = useGameContext();
  const [info, setInfo] = useState(null);

  useEffect(() => { getPlayerInfo().then(setInfo); }, []);

  const onLogin = async () => {
    const ok = await openAuth();
    if (ok) {
      await cloudSave(stats);
      const next = await getPlayerInfo();
      setInfo(next);
      showToast?.('Вход выполнен — прогресс сохранён в аккаунте');
      onClose();
    }
  };

  if (info?.authorized) {
    return (
      <div className="menu-item menu-item--static">
        <span className="menu-item__icon"><UserIcon /></span>
        <span className="menu-item__label">{info.name || 'Аккаунт Яндекс'}</span>
      </div>
    );
  }
  return (
    <MenuItem icon={<UserIcon />} label="Войти через Яндекс" onClick={onLogin} accent />
  );
}

function MenuItem({ icon, label, onClick, accent, danger, badge }) {
  const classes = [
    'menu-item',
    accent && 'menu-item--accent',
    danger && 'menu-item--danger'
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span className="menu-item__icon">{icon}</span>
      <span className="menu-item__label">{label}</span>
      {badge !== undefined && <span className="menu-item__badge">{badge}</span>}
    </button>
  );
}
