import { useEffect, useState } from 'react';
import { AchievementsModal } from './components/Achievements/Achievements.jsx';
import { AchievementToast } from './components/Achievements/AchievementToast.jsx';
import { Header } from './components/Header/Header.jsx';
import { PetScreen } from './components/Pet/PetScreen.jsx';
import { SettingsModal } from './components/Settings/Settings.jsx';
import { FeedbackModal } from './components/Feedback/Feedback.jsx';
import { Tour, TOUR_DONE_KEY } from './components/Tour/Tour.jsx';
import { LeaderboardModal } from './components/Leaderboard/Leaderboard.jsx';
import { DailyBadge } from './components/Daily/DailyBadge.jsx';
import { GameModesModal } from './components/GameModes/GameModesModal.jsx';
import { hideSplash } from './lib/splash.js';
import { loadingReady } from './lib/yandex.js';
import { vkInit, showLeaderboard } from './lib/vk.js';
import { isVk } from './lib/platform.js';
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
  const { stats, auth, showToast, status, gameMode, ready, leaveDailyMode, setPref } = useGameContext();

  // VK ждёт VKWebAppInit сразу после загрузки: без него площадка считает, что
  // приложение не стартовало, и не убирает свой лоадер. Вызов идемпотентный и
  // вне VK — no-op.
  useEffect(() => { vkInit(); }, []);

  // Dismiss the boot splash once the initial server reconcile has settled, so
  // the player never sees the empty board flash before its first puzzle. Also
  // signal Yandex Games that the game is ready (hides their loader). No-op off
  // the Yandex platform.
  useEffect(() => {
    if (!ready) return;
    hideSplash();
    loadingReady();
  }, [ready]);
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [petOpen, setPetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  // Слово дня — одна попытка в сутки. Уход в доп. режимы посреди партии
  // сжигает её, поэтому сначала спрашиваем.
  const [dailyLeaveOpen, setDailyLeaveOpen] = useState(false);
  const dailyInProgress = gameMode === 'daily' && status === GAME_STATUS.PLAYING;
  const openModes = () => {
    if (dailyInProgress) setDailyLeaveOpen(true);
    else setModesOpen(true);
  };
  const confirmDailyLeave = () => {
    setDailyLeaveOpen(false);
    leaveDailyMode?.();
    setModesOpen(true);
  };
  const [tourOn, setTourOn] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const closeHelp = () => setHelpOpen(false);

  // У Яндекса таблицу лидеров рисуем сами (данные приходят из его API), у VK
  // площадка показывает своё окно и сама сравнивает игрока с друзьями —
  // результат передаётся прямо в вызове. Метрика одна и та же, что и в
  // яндексовой таблице: сколько слов отгадано.
  const openLeaderboard = async () => {
    if (!isVk) { setLbOpen(true); return; }
    const r = await showLeaderboard(stats.won || 0);
    if (r === 'failed') showToast('Таблица лидеров сейчас недоступна');
  };

  // First-run coachmarks: once the game is ready and the daily-reward (or any)
  // modal is dismissed, start the tour. Один раз на игрока: флаг живёт и в
  // prefs (уезжает в облако Яндекса / в Supabase), и в localStorage — иначе
  // после входа в аккаунт обучение показывалось уже игравшему человеку.
  useEffect(() => {
    if (!ready) return;
    if (stats.prefs?.tourDone) return;
    let skip = false;
    try { skip = Boolean(localStorage.getItem(TOUR_DONE_KEY)); } catch { /* noop */ }
    if (skip) {
      // Старое устройство: поднимаем локальный флаг в prefs, чтобы он уехал
      // в облако и больше не зависел от чистки данных браузера.
      setPref?.('tourDone', true);
      return;
    }
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
        onOpenModes={openModes}
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
      {tourOn && <Tour onDone={() => { setTourOn(false); setPref?.('tourDone', true); }} />}

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenAchievements={() => setAchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onOpenLeaderboard={openLeaderboard}
      />

      <Shop open={shopOpen} onClose={() => setShopOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
      <PetScreen open={petOpen} onClose={() => setPetOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} />
      <GameModesModal open={modesOpen} onClose={() => setModesOpen(false)} />

      <Modal
        open={dailyLeaveOpen}
        onClose={() => setDailyLeaveOpen(false)}
        title="Выйти из Слова дня?"
      >
        <div className="confirm">
          <p className="confirm__text">
            Слово дня даётся раз в сутки. Если сейчас перейти в другой режим,
            вернуться к сегодняшнему Слову дня уже не получится.
          </p>
          <div className="confirm__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setDailyLeaveOpen(false)}
              onMouseDown={(e) => e.preventDefault()}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={confirmDailyLeave}
              onMouseDown={(e) => e.preventDefault()}
            >
              Подтвердить
            </button>
          </div>
        </div>
      </Modal>
      <EnergyModal />

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Статистика">
        <Stats stats={stats} />
      </Modal>
      <Modal open={helpOpen} onClose={closeHelp} title="Как играть">
        <HowToPlay />
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
