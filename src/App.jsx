import { useState } from 'react';
import { Header } from './components/Header/Header.jsx';
import { Board } from './components/Board/Board.jsx';
import { Keyboard } from './components/Keyboard/Keyboard.jsx';
import { Stats } from './components/Stats/Stats.jsx';
import { Coins } from './components/Coins/Coins.jsx';
import { HintButton, HintsStrip } from './components/Hints/Hints.jsx';
import { NewGameButton } from './components/NewGame/NewGame.jsx';
import { GameEnd } from './components/GameEnd/GameEnd.jsx';
import { DailyReward } from './components/DailyReward/DailyReward.jsx';
import { Modal } from './components/Modal/Modal.jsx';
import { GameProvider, useGameContext } from './context/GameContext.jsx';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useAuthRedirectFallback } from './hooks/useAuthRedirectFallback.js';

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
  const { stats, resetStats } = useGameContext();
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeHelp = () => setHelpOpen(false);

  return (
    <div className="app">
      <Header
        onOpenStats={() => setStatsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <div className="topbar">
        <Coins />
        <HintButton />
        <NewGameButton />
      </div>
      <main className="main">
        <HintsStrip />
        <Board />
        <GameEnd />
      </main>
      <Keyboard />
      <Toast />
      <DailyReward />

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
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
