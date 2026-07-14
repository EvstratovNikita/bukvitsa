import { useEffect, useState } from 'react';
import { AchievementsModal } from './components/Achievements/Achievements.jsx';
import { AchievementToast } from './components/Achievements/AchievementToast.jsx';
import { Header } from './components/Header/Header.jsx';
import { InviteModal } from './components/Share/InviteModal.jsx';
import { PetScreen } from './components/Pet/PetScreen.jsx';
import { SettingsModal } from './components/Settings/Settings.jsx';
import { FeedbackModal } from './components/Feedback/Feedback.jsx';
import { Tour, TOUR_DONE_KEY } from './components/Tour/Tour.jsx';
import { LeaderboardModal } from './components/Leaderboard/Leaderboard.jsx';
import { DailyBadge } from './components/Daily/DailyBadge.jsx';
import { GameModesModal } from './components/GameModes/GameModesModal.jsx';
import { captureReferralFromUrl } from './lib/referral.js';
import { hideSplash } from './lib/splash.js';
import { loadingReady } from './lib/yandex.js';
import { pluralCoins } from './utils/plural.js';
import { useReferralClaim } from './hooks/useReferralClaim.js';
import { Board } from './components/Board/Board.jsx';
import { Keyboard } from './components/Keyboard/Keyboard.jsx';
import { Stats } from './components/Stats/Stats.jsx';
import { Coins } from './components/Coins/Coins.jsx';
import { EnergyBadge } from './components/Energy/Energy.jsx';
import { EnergyModal } from './components/Energy/EnergyModal.jsx';
import { HintButton } from './components/Hints/Hints.jsx';
import { EndPanel } from './components/NewGame/EndPanel.jsx';
import { GameEnd } from './components/GameEnd/GameEnd.jsx';
import { DailyReward } from './components/DailyReward/DailyReward.jsx';
import { Modal } from './components/Modal/Modal.jsx';
import { HowToPlay } from './components/Help/HowToPlay.jsx';
import { SideMenu } from './components/Menu/Menu.jsx';
import { Shop } from './components/Shop/Shop.jsx';
import { AuthModal } from './components/Auth/Auth.jsx';
import { GAME_STATUS } from './constants/game.js';
import { GameProvider, useGameContext } from './context/GameContext.jsx';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useAuthRedirectFallback } from './hooks/useAuthRedirectFallback.js';
import { useShopTheme } from './hooks/useShopTheme.js';

function Toast() {
  const { toast } = useGameContext();
  if (!toast) return null;
  return <div key={toast.id} className="toast">{toast.text}</div>;
}

function GameShell() {
  useKeyboard(true);
  useAuthRedirectFallback();
  useShopTheme();
  const { stats, resetStats, auth, showToast, status, gameMode, ready } = useGameContext();

  // Dismiss the boot splash once the initial server reconcile has settled, so
  // the player never sees the empty board flash before its first puzzle. Also
  // signal Yandex Games that the game is ready (hides their loader). No-op off
  // the Yandex platform.
  useEffect(() => {
    if (!ready) return;
    hideSplash();
    loadingReady();
  }, [ready]);
  // Server-side gated: only fires when user is verified (non-anon).
  useReferralClaim({
    userId: auth?.userId,
    isAnonymous: auth?.isAnonymous,
    onClaim: (r) => showToast?.(`Бонус за приглашение: +${r.invitee_bonus} ${pluralCoins(r.invitee_bonus)}!`)
  });
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [petOpen, setPetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [tourOn, setTourOn] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const closeHelp = () => setHelpOpen(false);

  // First-run coachmarks: once the game is ready and the daily-reward (or any)
  // modal is dismissed, start the tour. Shown once per device.
  useEffect(() => {
    if (!ready) return;
    let skip = false;
    try { skip = Boolean(localStorage.getItem(TOUR_DONE_KEY)); } catch { /* noop */ }
    if (skip) return;
    let raf = 0;
    const tryStart = () => {
      if (document.querySelector('.modal-backdrop')) { raf = requestAnimationFrame(tryStart); return; }
      setTourOn(true);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tryStart); }, 400);
    return () => { clearTimeout(t); if (raf) cancelAnimationFrame(raf); };
  }, [ready]);

  return (
    <div className="app">
      <Header
        onOpenMenu={() => setMenuOpen(true)}
        onOpenPet={() => setPetOpen(true)}
        onOpenModes={() => setModesOpen(true)}
      />
      <div className="topbar">
        <Coins />
        {gameMode === 'daily' ? <DailyBadge /> : <EnergyBadge />}
        <HintButton />
      </div>
      <main className="main" data-tour="board">
        <Board />
        <GameEnd />
      </main>
      {status === GAME_STATUS.PLAYING ? <Keyboard /> : <EndPanel />}
      <Toast />
      <AchievementToast />
      <DailyReward />
      {tourOn && <Tour onDone={() => setTourOn(false)} />}

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenAchievements={() => setAchOpen(true)}
        onOpenInvite={() => setInviteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onOpenLeaderboard={() => setLbOpen(true)}
      />

      <Shop open={shopOpen} onClose={() => setShopOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <PetScreen open={petOpen} onClose={() => setPetOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} />
      <GameModesModal open={modesOpen} onClose={() => setModesOpen(false)} />
      <EnergyModal />

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Статистика">
        <Stats stats={stats} onReset={resetStats} />
      </Modal>
      <Modal open={helpOpen} onClose={closeHelp} title="Как играть">
        <HowToPlay />
      </Modal>
    </div>
  );
}

export default function App() {
  // Stash referrer from ?ref=... before Provider mounts so the auth flow can
  // pick it up the moment the user becomes non-anonymous.
  useEffect(() => { captureReferralFromUrl(); }, []);
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
