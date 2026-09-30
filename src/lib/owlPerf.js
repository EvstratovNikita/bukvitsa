// Облегчённая сова для слабых устройств.
//
// Прыжок, покачивание и дыхание совы двигают слой целиком — это бесплатно
// на любом устройстве. А моргание, наклон головы и взмахи крыльев живут
// внутри одной SVG-картинки, и каждый их кадр перерисовывает её целиком.
// Если устройство с этим не справляется, ставим на <html> класс owl-lite:
// CSS выключает движения частей, сова остаётся живой за счёт слоя.
//
// Решаем по замеру, а не по модели телефона: пока сова на экране, пару
// секунд считаем интервалы между кадрами. Мало кадров или много длинных
// провалов — облегчаем до конца сессии. Замер один на сессию.

const START_DELAY_MS = 1500; // пропускаем открытие экрана и вылупление
const SAMPLE_MS = 2000;

let state = 'idle'; // idle → measuring → done

function setLite() {
  document.documentElement.classList.add('owl-lite');
}

export function watchOwlPerf() {
  if (state !== 'idle' || typeof window === 'undefined') return;
  if (typeof requestAnimationFrame !== 'function') return;
  state = 'measuring';

  // Явно слабое железо (Android Chrome сообщает объём памяти) — без замера.
  // Число ядер не берём: Safari на iOS его занижает ради приватности.
  const mem = navigator.deviceMemory;
  if (mem && mem <= 2) { setLite(); state = 'done'; return; }

  setTimeout(() => {
    const gaps = [];
    let last = 0;
    let end = 0;
    const tick = (t) => {
      if (document.hidden) { state = 'idle'; return; } // ушли со вкладки — замер недостоверен
      if (last) gaps.push(t - last);
      last = t;
      if (!end) end = t + SAMPLE_MS;
      if (t < end) { requestAnimationFrame(tick); return; }
      state = 'done';
      if (gaps.length < 10) { setLite(); return; }
      const sorted = [...gaps].sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];
      // Провал — кадр дольше 2,5 обычных (на 120 Гц это > 21 мс, на 60 Гц > 42 мс).
      const drops = gaps.filter((g) => g > median * 2.5).length / gaps.length;
      // median > 24 мс — меньше ~40 кадров в секунду (в том числе режим
      // энергосбережения на iPhone, где кадров 30): там облегчаем тоже.
      if (median > 24 || drops > 0.08) setLite();
    };
    requestAnimationFrame(tick);
  }, START_DELAY_MS);
}
