import { useCallback, useEffect, useMemo, useState } from 'react';
import { AchievementsModal } from './components/Achievements/Achievements.jsx';
import { AchievementToast } from './components/Achievements/AchievementToast.jsx';
import { NotifyAsk } from './components/Notify/NotifyAsk.jsx';
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
import { vkInit, preloadRewardedVk, preloadInterstitialVk, fitToVisibleFrame } from './lib/vk.js';
import { reportArrival } from './lib/referral.js';
import { reportMissions } from './lib/missions.js';
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
import { StartMenu } from './components/StartMenu/StartMenu.jsx';
import { HalloweenModal } from './components/Halloween/HalloweenModal.jsx';
import { PumpkinBadge, RiddleCard } from './components/Halloween/HalloweenGame.jsx';
import { halloweenActive } from './lib/events.js';
import { isVk } from './lib/platform.js';
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
  // Главное меню VK (правила, п. 4.2.10): открыто при запуске и по кнопке
  // «Домой» в шапке. Пока оно на экране, физическая клавиатура не пишет в поле.
  const [homeOpen, setHomeOpen] = useState(isVk);
  const closeHome = useCallback(() => setHomeOpen(false), []);
  useKeyboard(!homeOpen);
  useAuthRedirectFallback();
  useShopTheme();
  const { stats, auth, showToast, status, gameMode, ready, leaveDailyMode, setPref, startHalloween } = useGameContext();

  // VK ждёт VKWebAppInit сразу после загрузки: без него площадка считает, что
  // приложение не стартовало, и не убирает свой лоадер. Вызов идемпотентный и
  // вне VK — no-op. Сразу же просим площадку подгрузить ролик за награду,
  // чтобы первое нажатие «Смотреть рекламу» не ждало загрузки.
  // На vk.ru ещё и укладываем игру в видимую часть фрейма — в
  // широкоформатном режиме он выше экрана (см. lib/vk.js).
  // Пришёл по чужой ссылке «Поделиться» — отметить на сервере (статистика,
  // без наград; см. lib/referral.js).
  useEffect(() => { vkInit(); preloadRewardedVk(); preloadInterstitialVk(); fitToVisibleFrame(); reportArrival(); }, []);

  // Dismiss the boot splash once the initial server reconcile has settled, so
  // the player never sees the empty board flash before its first puzzle. Also
  // signal Yandex Games that the game is ready (hides their loader). No-op off
  // the Yandex platform.
  useEffect(() => {
    if (!ready) return;
    hideSplash();
    loadingReady();
  }, [ready]);

  // Миссии VK: открытые достижения → лента друзей и баллы (lib/missions.js).
  // Ждём ready — до сверки с облаком список достижений неполный.
  useEffect(() => {
    if (ready) reportMissions(stats.unlockedAchievements);
  }, [ready, stats.unlockedAchievements]);
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
  // Куда игрок шёл, когда спросили про Слово дня: в режимы или в загадки.
  const [dailyLeaveOpen, setDailyLeaveOpen] = useState(false);
  const [dailyLeaveTo, setDailyLeaveTo] = useState('modes');
  const dailyInProgress = gameMode === 'daily' && status === GAME_STATUS.PLAYING;
  const openModes = useCallback(() => {
    if (dailyInProgress) { setDailyLeaveTo('modes'); setDailyLeaveOpen(true); }
    else setModesOpen(true);
  }, [dailyInProgress]);
  // Ивент «Ночь тыкв»: окно с тропой и вход в «Загадки ночи». Из Слова дня
  // в загадки — через то же подтверждение (сегодняшнее слово сгорит).
  const [hwOpen, setHwOpen] = useState(false);
  const hwOn = halloweenActive();
  const playHalloween = () => {
    setHwOpen(false);
    setModesOpen(false);
    if (dailyInProgress) { setDailyLeaveTo('halloween'); setDailyLeaveOpen(true); return; }
    if (startHalloween?.()) setHomeOpen(false);
  };
  const confirmDailyLeave = () => {
    setDailyLeaveOpen(false);
    if (dailyLeaveTo === 'halloween') {
      // Без exitDailyMode: он списал бы энергию за обычную партию, которую
      // игрок не увидит. startHalloween сам пометит день пропущенным.
      if (startHalloween?.()) setHomeOpen(false);
      return;
    }
    leaveDailyMode?.();
    setModesOpen(true);
  };
  const [tourOn, setTourOn] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const closeHelp = () => setHelpOpen(false);

  // Таблицу лидеров рисуем сами на обеих площадках: у Яндекса данные даёт его
  // API, у VK — наш сервер, потому что общего рейтинга площадка не даёт вовсе
  // (нативное окно сравнивает только с друзьями, оно осталось кнопкой внутри
  // модалки). Метрика одна: сколько слов отгадано.
  const openLeaderboard = useCallback(() => setLbOpen(true), []);

  // Стабильные обработчики для шапки и главного меню: они обёрнуты в memo, и
  // новые стрелки на каждый рендер App сводили бы memo на нет — открытие любого
  // окна перерисовывало сову и всё меню.
  const nav = useMemo(() => ({
    menu: () => setMenuOpen(true),
    pet: () => setPetOpen(true),
    home: () => setHomeOpen(true),
    shop: () => setShopOpen(true),
    ach: () => setAchOpen(true),
    stats: () => setStatsOpen(true),
    help: () => setHelpOpen(true),
    settings: () => setSettingsOpen(true),
    feedback: () => setFeedbackOpen(true),
    hw: () => setHwOpen(true)
  }), []);

  // First-run coachmarks: once the game is ready and the daily-reward (or any)
  // modal is dismissed, start the tour. Один раз на игрока: флаг живёт и в
  // prefs (уезжает в облако Яндекса / в Supabase), и в localStorage — иначе
  // после входа в аккаунт обучение показывалось уже игравшему человеку.
  // В VK обучение ждёт, пока игрок выйдет из главного меню: подсказки
  // показывают элементы шапки и поля, а меню их закрывает.
  useEffect(() => {
    if (!ready || homeOpen) return;
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
  }, [ready, homeOpen]);

  // Букля закрывает меню целиком, но меню под ней продолжало рисоваться —
  // со своей анимированной совой. Когда экран Букли доехал (его въезд —
  // 320 мс), меню перестаёт рисоваться (app--pet, см. index.css); при
  // закрытии возвращается в том же кадре, что исчезает Букля.
  const [petCovers, setPetCovers] = useState(false);
  useEffect(() => {
    if (!petOpen || !homeOpen) { setPetCovers(false); return; }
    const t = setTimeout(() => setPetCovers(true), 360);
    return () => clearTimeout(t);
  }, [petOpen, homeOpen]);
  const appClass = `app${homeOpen ? ' app--home' : ''}${petCovers && petOpen ? ' app--pet' : ''}${gameMode === 'halloween' ? ' app--hw' : ''}`;

  return (
    <div className={appClass}>
      <Header
        onOpenMenu={nav.menu}
        onOpenPet={nav.pet}
        onOpenModes={openModes}
        onOpenHome={isVk ? nav.home : undefined}
      />
      <div className="topbar">
        <Coins />
        {gameMode === 'daily' ? <DailyBadge />
          : gameMode === 'halloween' ? <PumpkinBadge onClick={() => setHwOpen(true)} />
          : <EnergyBadge />}
        <HintButton />
      </div>
      <main className="main" data-tour="board">
        {gameMode === 'halloween' && <RiddleCard />}
        <Board />
        <GameEnd />
      </main>
      {status === GAME_STATUS.PLAYING ? <Keyboard /> : <EndPanel />}
      <Toast />
      <AchievementToast onOpen={() => setAchOpen(true)} />
      <NotifyAsk />
      <DailyReward />
      {homeOpen && (
        <StartMenu
          onPlay={closeHome}
          onOpenShop={nav.shop}
          onOpenPet={nav.pet}
          onOpenAchievements={nav.ach}
          onOpenLeaderboard={openLeaderboard}
          onOpenStats={nav.stats}
          onOpenHelp={nav.help}
          onOpenSettings={nav.settings}
          onOpenFeedback={nav.feedback}
          onOpenHalloween={hwOn ? nav.hw : undefined}
        />
      )}
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
      {/* Из главного меню Букля открывается поверх него: меню не закрываем,
          иначе на миг мелькало поле, а крестик возвращал на поле, не в меню. */}
      <PetScreen
        open={petOpen}
        onClose={() => setPetOpen(false)}
        overHome={homeOpen}
        onHome={isVk ? () => { setHomeOpen(true); setPetOpen(false); } : undefined}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} showToast={showToast} />
      <GameModesModal
        open={modesOpen}
        onClose={() => setModesOpen(false)}
        onPicked={closeHome}
        onPlayHalloween={hwOn ? playHalloween : undefined}
      />
      <HalloweenModal
        open={hwOpen && hwOn}
        onClose={() => setHwOpen(false)}
        onPlay={playHalloween}
        onOpenAchievements={() => { setHwOpen(false); setAchOpen(true); }}
      />

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
      <EnergyModal onOpenModes={openModes} onPlayHalloween={hwOn ? playHalloween : undefined} />

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
