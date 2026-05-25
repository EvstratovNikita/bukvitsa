import { useEffect, useState } from 'react';
import { AchievementsModal } from './components/Achievements/Achievements.jsx';
import { AchievementToast } from './components/Achievements/AchievementToast.jsx';
import { Header } from './components/Header/Header.jsx';
import { InviteModal } from './components/Share/InviteModal.jsx';
import { PetFab } from './components/Pet/PetFab.jsx';
import { PetModal } from './components/Pet/PetModal.jsx';
import { captureReferralFromUrl } from './lib/referral.js';
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
import { SideMenu } from './components/Menu/Menu.jsx';
import { Shop } from './components/Shop/Shop.jsx';
import { AuthModal } from './components/Auth/Auth.jsx';
import { GAME_STATUS } from './constants/game.js';
import { GameProvider, useGameContext } from './context/GameContext.jsx';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useAuthRedirectFallback } from './hooks/useAuthRedirectFallback.js';
import { useShopTheme } from './hooks/useShopTheme.js';

function HelpBody() {
  return (
    <div className="help">
      <p>Угадай слово из 5 букв за 6 попыток.</p>
      <p>После каждой попытки клетки подсветятся:</p>
      <ul className="help__legend">
        <li><span className="swatch swatch--correct" /> буква на своём месте</li>
        <li><span className="swatch swatch--present" /> буква есть, но в другом месте</li>
        <li><span className="swatch swatch--absent" /> буквы нет в слове</li>
      </ul>

      <h3 className="help__heading">Награды</h3>
      <p>За угаданное слово ты получаешь монеты — чем меньше попыток, тем выше награда:</p>
      <ul className="help__rewards">
        <li><span className="help__rewardN">1</span> попытка <em>— 8 монет</em></li>
        <li><span className="help__rewardN">2</span> попытки <em>— 5 монет</em></li>
        <li><span className="help__rewardN">3</span> попытки <em>— 4 монеты</em></li>
        <li><span className="help__rewardN">4</span> попытки <em>— 3 монеты</em></li>
        <li><span className="help__rewardN">5</span> попыток <em>— 2 монеты</em></li>
        <li><span className="help__rewardN">6</span> попыток <em>— 1 монета</em></li>
      </ul>
      <p className="help__hint">
        Если слово не угадано — 0 монет. Общее число монет видно сверху и сохраняется
        между играми.
      </p>

      <h3 className="help__heading">Подсказки</h3>
      <p>Монеты можно потратить на подсказки — открыть букву загаданного слова:</p>
      <ul className="help__rewards">
        <li><span className="help__rewardN">10</span> случайная буква <em>— 10 монет</em></li>
        <li><span className="help__rewardN">15</span> выбранная позиция <em>— 15 монет</em></li>
      </ul>

      <h3 className="help__heading">Магазин</h3>
      <p>
        В меню (правый верхний угол) есть Магазин — там за монеты можно купить
        смены фона, стили клеток и одноразовые бонусы, например «Двойные монеты»
        на следующую победу.
      </p>

      <p className="help__hint">
        Используются только нарицательные русские существительные. Имена и
        географические названия не загадываются.
      </p>
    </div>
  );
}

function Toast() {
  const { toast } = useGameContext();
  if (!toast) return null;
  return <div key={toast.id} className="toast">{toast.text}</div>;
}

function GameShell() {
  useKeyboard(true);
  useAuthRedirectFallback();
  useShopTheme();
  const { stats, resetStats, auth, showToast, status } = useGameContext();
  // Server-side gated: only fires when user is verified (non-anon).
  useReferralClaim({
    userId: auth?.userId,
    isAnonymous: auth?.isAnonymous,
    onClaim: (r) => showToast?.(`Бонус за приглашение: +${r.invitee_bonus} монет!`)
  });
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [petOpen, setPetOpen] = useState(false);
  const closeHelp = () => setHelpOpen(false);

  return (
    <div className="app">
      <Header
        onOpenStats={() => setStatsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <div className="topbar">
        <Coins />
        <EnergyBadge />
        <HintButton />
      </div>
      <main className="main">
        <Board />
        <GameEnd />
        <PetFab onOpen={() => setPetOpen(true)} />
      </main>
      {status === GAME_STATUS.PLAYING ? <Keyboard /> : <EndPanel />}
      <Toast />
      <AchievementToast />
      <DailyReward />

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenAchievements={() => setAchOpen(true)}
        onOpenInvite={() => setInviteOpen(true)}
      />

      <Shop open={shopOpen} onClose={() => setShopOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AchievementsModal open={achOpen} onClose={() => setAchOpen(false)} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <PetModal open={petOpen} onClose={() => setPetOpen(false)} />
      <EnergyModal />

      <Modal open={statsOpen} onClose={() => setStatsOpen(false)} title="Статистика">
        <Stats stats={stats} onReset={resetStats} />
      </Modal>
      <Modal open={helpOpen} onClose={closeHelp} title="Как играть">
        <HelpBody />
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
