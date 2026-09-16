# Музыка и звук премиального промо «Буклицы».
#
# Генеративных музыкальных моделей для отдельного трека у нас нет, поэтому трек
# синтезируем кодом по таймлайну сцены (timeline.json): 120 BPM, доля 0,5 с,
# такт 2 с. События кадра — перевороты плиток, нажатия, монеты, смена фона,
# прыжки совы — приходят из сцены, поэтому звук стоит ровно в кадре.
#
# Выход: music.wav 48 кГц стерео, пик ≈ −1 dBFS (громкость доводим loudnorm в ffmpeg).
import json
import numpy as np
from scipy.signal import butter, sosfilt, lfilter, fftconvolve

SR = 48000
TLJ = json.load(open('timeline.json'))
TL, DUR, SFX = TLJ['TL'], TLJ['D'], TLJ['SFX']
TAIL = 1.6
N = int((DUR + TAIL) * SR)

# Шины: музыка, звуки, отдельная посылка в реверберацию.
BUS = {k: np.zeros((N, 2)) for k in ('mus', 'sfx', 'rev')}
RNG = np.random.default_rng(20260916)

def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)

def tt(dur):
    return np.arange(max(1, int(dur * SR))) / SR

def pan2(sig, pan):
    """Равномощное панорамирование: pan −1 слева, +1 справа."""
    a = (pan + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)

def put(bus, t, sig, pan=0.0, gain=1.0, rev=0.0):
    if sig is None or len(sig) == 0:
        return
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), N - i)
    if n <= 0:
        return
    st = pan2(sig[:n] * gain, pan)
    BUS[bus][i:i + n] += st
    if rev > 0:
        BUS['rev'][i:i + n] += st * rev

def env(dur, a=0.005, d=None, curve=4.0, hold=0.0):
    """Атака — косинусом, спад — экспонентой."""
    n = max(1, int(dur * SR))
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    nh = int(hold * SR)
    ns = na + nh
    if ns < n:
        k = np.linspace(0, 1, n - ns)
        e[ns:] = np.exp(-curve * k) * (1 - k)
    return e

def lp(sig, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), sig)

def hp(sig, f, order=2):
    return sosfilt(butter(order, max(20, f) / (SR / 2), 'high', output='sos'), sig)

def bp(sig, f1, f2, order=2):
    return sosfilt(butter(order, [max(20, f1) / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), sig)

def noise(dur):
    return RNG.standard_normal(max(1, int(dur * SR)))

# ---------------------------------------------------------------- инструменты
def bell(f, dur, amp=0.5, ratio=3.0, index=2.6, curve=5.0):
    """Колокольчик/челеста: частотная модуляция с затухающим индексом."""
    x = tt(dur)
    e = env(dur, 0.002, curve=curve)
    mod = np.sin(2 * np.pi * ratio * f * x) * index * np.exp(-6 * x)
    return amp * e * np.sin(2 * np.pi * f * x + mod)

def marimba(f, dur, amp=0.5):
    x = tt(dur)
    y = np.sin(2 * np.pi * f * x) * np.exp(-7 * x)
    y += 0.32 * np.sin(2 * np.pi * 4.0 * f * x) * np.exp(-16 * x)
    y += 0.12 * np.sin(2 * np.pi * 9.2 * f * x) * np.exp(-26 * x)
    click = hp(noise(min(dur, 0.02)), 2500) * np.exp(-260 * tt(min(dur, 0.02)))
    y[:len(click)] += 0.25 * click
    return amp * y * env(dur, 0.001, curve=6)

def pluck(f, dur, amp=0.4, damp=0.996, tone=0.5):
    """Карплюс–Стронг через рекурсивный фильтр: щипок, мягкая струна."""
    n = max(1, int(dur * SR))
    d = max(2, int(SR / f))
    exc = np.zeros(n)
    k = min(d, n)
    exc[:k] = lp(RNG.standard_normal(k), 2600 + 4000 * tone) * np.hanning(k) ** 0.5
    a = np.zeros(d + 2)
    a[0] = 1.0
    a[d] = -0.5 * damp
    a[d + 1] = -0.5 * damp
    y = lfilter([1.0], a, exc)
    return amp * y * env(dur, 0.001, curve=3.2)

def pad(notes, dur, amp=0.22, cut=1700, attack=0.5):
    """Тёплый пад: гармоники складываем до частоты среза, а не режем готовую пилу.
    Наложения частот (aliasing) нет, поэтому в верхах не звенит металлом."""
    x = tt(dur)
    y = np.zeros(len(x))
    for m in notes:
        f = midi(m)
        for dt, w in ((-0.004, 0.75), (0.0, 1.0), (0.005, 0.75)):
            fd = f * (1 + dt)
            for h in range(1, max(1, min(20, int(cut / fd))) + 1):
                y += (w / h) * np.sin(2 * np.pi * fd * h * x + h * 0.7)
    y /= (len(notes) * 3 * 1.6)
    e = env(dur, attack, curve=1.4)
    e *= np.linspace(1, 0.55, len(e))
    return amp * np.tanh(y) * e

def chime(f, dur, amp=0.4, bright=1.0):
    """Мягкий колокольчик: синус и две быстро гаснущие гармоники.
    В отличие от ЧМ-колокола не даёт металлического призвука."""
    x = tt(dur)
    y = np.sin(2 * np.pi * f * x)
    y += 0.34 * bright * np.sin(2 * np.pi * 2 * f * x) * np.exp(-3.0 * x)
    y += 0.13 * bright * np.sin(2 * np.pi * 3 * f * x) * np.exp(-6.0 * x)
    return amp * y * env(dur, 0.014, curve=3.0)

def subbass(m, dur, amp=0.5):
    x = tt(dur)
    f = midi(m)
    y = np.sin(2 * np.pi * f * x) + 0.25 * np.sin(4 * np.pi * f * x)
    return amp * np.tanh(1.5 * y) * env(dur, 0.006, curve=3.0)

def kick(amp=0.9):
    x = tt(0.42)
    f = 46 + 130 * np.exp(-28 * x)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    y *= np.exp(-9 * x)
    cl = hp(noise(0.01), 1800) * np.exp(-320 * tt(0.01))
    y[:len(cl)] += 0.22 * cl
    return amp * np.tanh(1.6 * y)

def snap(amp=0.5):
    d = 0.19
    y = bp(noise(d), 1400, 6200) * np.exp(-26 * tt(d))
    for k in (0.006, 0.013, 0.02):
        i = int(k * SR)
        y[i:] += 0.5 * bp(noise(d - k), 1500, 6000) * np.exp(-30 * tt(d - k))
    return amp * y / 2.2

def hat(amp=0.22, dur=0.05):
    return amp * hp(noise(dur), 7200) * np.exp(-90 * tt(dur))

def shaker(amp=0.12, dur=0.09):
    return amp * bp(noise(dur), 4000, 11000) * (np.exp(-40 * tt(dur)) * (1 - np.exp(-300 * tt(dur))))

def whoosh(dur=0.75, amp=0.5, down=False):
    x = tt(dur)
    k = x / dur
    if down:
        k = 1 - k
    y = np.zeros(len(x))
    for f1, f2, w in ((300, 900, 0.5), (900, 2600, 0.8), (2600, 7000, 0.6)):
        band = bp(noise(dur), f1, f2)
        pos = (f1 + f2) / 2 / 7000
        y += w * band * np.exp(-((k - pos) ** 2) / 0.06)
    y *= np.sin(np.pi * np.clip(k if not down else 1 - k, 0, 1)) ** 0.7
    return amp * y / 2.0

def riser(dur=1.0, amp=0.42, soft=False):
    """Подъём перед переходом. soft — мягкий вариант для финала: тише, без
    щелчков и без верхов, чтобы не царапал перед последним аккордом."""
    x = tt(dur)
    k = x / dur
    y = bp(noise(dur), 300, 3500 if soft else 9000) * (k ** 2)
    f = 220 * 2 ** ((1.6 if soft else 2.4) * k)
    y += 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (k ** 3)
    if soft:
        return amp * y / 1.6
    # ускоряющиеся щелчки — «отсчёт» перед ударом
    ticks = np.zeros(len(x))
    p = 0.0
    step = 0.22
    while p < dur - 0.02:
        i = int(p * SR)
        t2 = hp(noise(0.03), 3000) * np.exp(-120 * tt(0.03))
        m = min(len(t2), len(ticks) - i)
        ticks[i:i + m] += 0.5 * t2[:m] * (0.3 + 0.7 * p / dur)
        step *= 0.82
        p += max(0.045, step)
    return amp * (y / 1.6 + 0.35 * ticks)

def impact(amp=1.0, big=True):
    x = tt(1.6)
    f = 38 + 55 * np.exp(-9 * x)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-3.2 * x)
    cr = lp(noise(1.6), 9000) * np.exp(-7 * x) * (0.5 if big else 0.3)
    return amp * np.tanh(1.4 * (y + 0.32 * cr))

def boing(up=True, amp=0.5):
    d = 0.42
    x = tt(d)
    k = x / d
    f = 330 * 2 ** ((1.1 * np.sin(np.pi * k) if up else -0.9 * np.sin(np.pi * k)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-6 * x)
    y += 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-11 * x)
    return amp * y

def click(kind='ui'):
    d, f1, f2, amp = {'ui': (0.05, 900, 5200, 0.30), 'key': (0.04, 1200, 6000, 0.22)}[kind]
    y = bp(noise(d), f1, f2) * np.exp(-120 * tt(d))
    x = tt(d)
    y += 0.5 * np.sin(2 * np.pi * (1500 if kind == 'key' else 900) * x) * np.exp(-150 * x)
    return amp * y

def gliss(base, steps, dur, amp=0.32, up=True):
    y = np.zeros(int((dur + 1.3) * SR))
    for i, s in enumerate(steps):
        note = bell(midi(base + s), 1.0, amp * (0.6 + 0.4 * i / len(steps)), ratio=2.0, index=1.4, curve=6)
        k = int((i / len(steps)) * dur * SR)
        m = min(len(note), len(y) - k)
        y[k:k + m] += note[:m]
    return y if up else y[::-1]

# ---------------------------------------------------------------- гармония
SCALE = [0, 2, 4, 7, 9]                       # ре-мажорная пентатоника
ROOT = 62                                      # ре
CHORDS = {                                     # такты грува: D – Bm – G – A
    'D': dict(bass=38, pad=[62, 66, 69, 73], arp=[62, 66, 69, 74]),
    'Bm': dict(bass=35, pad=[59, 62, 66, 71], arp=[59, 62, 66, 71]),
    'G': dict(bass=31, pad=[59, 62, 67, 71], arp=[55, 59, 62, 67]),
    'A': dict(bass=33, pad=[57, 61, 64, 69], arp=[57, 61, 64, 69]),
}
SEQ = ['D', 'Bm', 'G', 'A']
BAR = 2.0
BEAT = 0.5
G0 = TL['game'] + 1.0                          # грув вступает, когда телефон встал
FIN = TL['fin']

def chord_at(bar_i):
    return CHORDS[SEQ[bar_i % len(SEQ)]]

# ---------------------------------------------------------------- аранжировка
# Вступление: пад и челеста, пока переворачиваются плитки хука.
put('mus', 0.0, pad([62, 66, 69], TL['logo'] + 0.6, amp=0.16, cut=1300, attack=0.9), 0, 1.0, 0.35)
for i in range(6):
    t = 0.5 + i * 0.5
    if t > TL['logo'] - 0.3:
        break
    put('mus', t, bell(midi(74 + SCALE[i % 5]), 1.6, 0.11, ratio=2.0, index=1.2, curve=4), -0.25 + 0.1 * i, 1.0, 0.5)

# Логотип: удар, бас и пад держат сцену, плитки падают маримбой.
put('mus', TL['logo'], pad([62, 66, 69, 74], 3.1, amp=0.2, cut=2100, attack=0.05), 0, 1.0, 0.3)
put('mus', TL['logo'], subbass(38, 1.8, 0.45), 0, 1.0, 0.1)
put('mus', TL['logo'] + 1.0, subbass(45, 1.0, 0.3), 0, 1.0, 0.1)
for i in range(4):
    put('mus', TL['logo'] + 1.0 + i * 0.5, shaker(0.1), 0.3)

# Грув: от вступления телефона до паузы перед финалом.
gr_end = FIN - 0.5
bar = 0
t = G0
while t < gr_end - 0.01:
    ch = chord_at(bar)
    put('mus', t, pad(ch['pad'], BAR * 1.05, amp=0.17, cut=1500 + 500 * (bar % 2), attack=0.12), 0, 1.0, 0.3)
    put('mus', t, subbass(ch['bass'], 1.0, 0.42), 0, 1.0, 0.05)
    put('mus', t + 1.0, subbass(ch['bass'], 0.55, 0.34), 0, 1.0, 0.05)
    put('mus', t + 1.5, subbass(ch['bass'] + 7, 0.4, 0.26), 0, 1.0, 0.05)
    for b, amp in ((0.0, 1.0), (1.0, 0.85), (1.75, 0.55)):
        if t + b < gr_end:
            put('mus', t + b, kick(0.62 * amp), 0, 1.0, 0.02)
    for b in (0.5, 1.5):
        if t + b < gr_end:
            put('mus', t + b, snap(0.34), 0.08, 1.0, 0.22)
    for k in range(8):
        tb = t + k * 0.25
        if tb >= gr_end:
            break
        put('mus', tb, hat(0.10 if k % 2 else 0.15, 0.05), 0.22)
        put('mus', tb + 0.125, shaker(0.07), -0.25)
    # арпеджио щипком — восьмыми, с паузами, чтобы не спорило с геймплеем
    for k, deg in enumerate([0, 2, 3, 2, 1, 3, 2, 1]):
        tb = t + k * 0.25
        if tb >= gr_end:
            break
        if k in (3, 6):
            continue
        put('mus', tb, pluck(midi(ch['arp'][deg] + 12), 0.9, 0.16, 0.994, 0.6), -0.2 + 0.05 * k, 1.0, 0.35)
    bar += 1
    t += BAR

# Победа: аккорд-вспышка поверх грува.
for i, m in enumerate([74, 78, 81, 86]):
    put('mus', TL['win'] + i * 0.03, bell(midi(m), 2.2, 0.2, ratio=2.0, index=1.6, curve=3.4), (i - 1.5) * 0.18, 1.0, 0.6)
put('mus', TL['win'], subbass(38, 1.2, 0.4), 0, 1.0, 0.05)

# Смена фона: восходящая арфа.
put('mus', TL['warm'], gliss(74, [0, 2, 4, 7, 9, 12, 14, 16], 0.55, 0.16), 0.15, 1.0, 0.6)

# Финал: ровный тёплый аккорд D — A — D, без ударных и звонких колокольчиков.
# Ничего не бьёт по ушам: только пад, мягкий бас и два тихих обертона в конце.
put('mus', FIN, impact(0.4, big=False), 0, 1.0, 0.22)
put('mus', FIN, pad([50, 57, 62, 66, 69], 3.3, amp=0.26, cut=1500, attack=0.14), 0, 1.0, 0.24)
put('mus', FIN, subbass(38, 2.8, 0.34), 0, 1.0, 0.03)
put('mus', FIN + 2.0, pad([52, 57, 61, 64, 69], 1.7, amp=0.22, cut=1400, attack=0.26), 0, 1.0, 0.24)
put('mus', FIN + 2.0, subbass(33, 1.7, 0.3), 0, 1.0, 0.03)
put('mus', FIN + 3.0, pad([50, 57, 62, 66, 69, 74], 3.8, amp=0.27, cut=1600, attack=0.3), 0, 1.0, 0.28)
put('mus', FIN + 3.0, subbass(38, 3.6, 0.34), 0, 1.0, 0.03)
put('mus', FIN + 3.0, chime(midi(74), 3.4, 0.13), -0.12, 1.0, 0.35)
put('mus', FIN + 3.15, chime(midi(81), 3.0, 0.09, bright=0.6), 0.16, 1.0, 0.35)

# ---------------------------------------------------------------- события сцены
TONE = [0, 4, 7]            # серая, жёлтая, золотая плитка хука
for t, kind, v in SFX:
    if kind == 'flip':
        put('sfx', t, marimba(midi(69 + TONE[int(v)] + (12 if v == 2 else 0)), 0.7, 0.22), (t % 0.7 - 0.35), 1.0, 0.4)
    elif kind == 'tile':
        put('sfx', t, marimba(midi(ROOT + SCALE[int(v) % 5] + 12 * (int(v) // 5)), 0.85, 0.3), (int(v) - 3) * 0.12, 1.0, 0.45)
    elif kind == 'owl':
        if t >= FIN:                                   # в финале — тёплый обертон, без звона
            put('sfx', t, chime(midi(81), 2.6, 0.12), 0, 1.0, 0.4)
        else:
            put('sfx', t, bell(midi(86), 1.8, 0.2, ratio=2.0, index=1.2, curve=3.0), 0, 1.0, 0.7)
            put('sfx', t, gliss(81, [0, 4, 7, 12], 0.22, 0.08), 0.2, 1.0, 0.6)
    elif kind == 'fintile':                            # плитки финала: тихая восходящая пентатоника
        put('sfx', t, chime(midi(62 + SCALE[int(v) % 5] + 12 * (int(v) // 5)), 1.8, 0.10, bright=0.7),
            (int(v) - 3) * 0.12, 1.0, 0.35)
    elif kind == 'sparkle' or kind == 'glint':
        if t >= FIN:
            put('sfx', t, chime(midi(86), 1.6, 0.05, bright=0.5), 0.3, 1.0, 0.3)
        else:
            put('sfx', t, bell(midi(93), 1.1, 0.12, ratio=2.5, index=1.0, curve=5.0), 0.3, 1.0, 0.6)
    elif kind == 'riser':
        soft = t > FIN - 1.6
        put('sfx', t, riser(float(v), 0.17 if soft else 0.34, soft=soft), 0, 1.0, 0.2)
    elif kind == 'impact':
        put('sfx', t, impact(0.8 if v == 0 else 0.45, big=(v == 0)), 0, 1.0, 0.35)
    elif kind == 'whoosh':
        put('sfx', t, whoosh(0.8, 0.28 if t > FIN - 1.2 else 0.42), -0.2, 1.0, 0.28)
    elif kind == 'swish':
        put('sfx', t - 0.25, whoosh(0.55, 0.26), 0.25, 1.0, 0.25)
    elif kind == 'key':
        put('sfx', t, click('key'), -0.3, 1.0, 0.12)
    elif kind == 'enter':
        put('sfx', t, click('ui'), -0.2, 1.1, 0.15)
    elif kind in ('ui', 'apply', 'pet'):
        put('sfx', t, click('ui'), 0.1, 1.0, 0.15)
        if kind == 'apply':
            put('sfx', t, bell(midi(81), 1.0, 0.12, ratio=2.0, index=1.2), 0.1, 1.0, 0.5)
    elif kind.startswith('rev-'):
        i = int(v)
        if kind == 'rev-g':                      # победный ряд: восходящая пентатоника
            put('sfx', t, bell(midi(74 + SCALE[i]), 1.4, 0.24, ratio=2.0, index=1.5, curve=3.6), (i - 2) * 0.18, 1.0, 0.55)
        elif kind == 'rev-y':
            put('sfx', t, marimba(midi(69 + SCALE[i % 5]), 0.5, 0.17), (i - 2) * 0.18, 1.0, 0.3)
        else:
            put('sfx', t, lp(noise(0.09), 900) * np.exp(-40 * tt(0.09)) * 0.16, (i - 2) * 0.18, 1.0, 0.12)
    elif kind == 'coins':
        for k in range(20):
            d = 0.02 + 0.045 * k + RNG.random() * 0.04
            m = 86 + SCALE[RNG.integers(0, 5)] + 12 * RNG.integers(0, 2)
            put('sfx', t + d, bell(midi(m), 0.8, 0.10 + 0.05 * RNG.random(), ratio=3.0, index=1.6, curve=6),
                float(RNG.random() * 1.6 - 0.8), 1.0, 0.5)
    elif kind == 'pill':
        put('sfx', t, bell(midi(81), 0.9, 0.14, ratio=2.0, index=1.0, curve=5), 0.35, 1.0, 0.4)
    elif kind == 'magic':
        put('sfx', t, gliss(69, [0, 4, 7, 11, 12, 16, 19, 23], 0.5, 0.14), -0.15, 1.0, 0.7)
        put('sfx', t, bp(noise(1.2), 3000, 9000) * np.exp(-3.5 * tt(1.2)) * 0.09, 0, 1.0, 0.5)
    elif kind == 'boing':
        put('sfx', t, boing(v == 0, 0.34), 0.2, 1.0, 0.3)
        put('sfx', t + 0.05, bell(midi(93), 0.7, 0.09, ratio=2.5, index=1.0, curve=6), 0.3, 1.0, 0.5)
    elif kind == 'cta':
        put('sfx', t, chime(midi(74), 2.8, 0.15), 0, 1.0, 0.4)
        put('sfx', t, pluck(midi(62), 1.6, 0.11, 0.995, 0.3), 0.1, 1.0, 0.28)

# ---------------------------------------------------------------- сведение
def reverb_ir(dur=1.9, dark=5200):
    n = int(dur * SR)
    x = np.arange(n) / SR
    decay = np.exp(-4.4 * x)
    ir = np.stack([lp(RNG.standard_normal(n) * decay, dark), lp(RNG.standard_normal(n) * decay, dark * 0.9)], axis=1)
    pre = int(0.018 * SR)
    ir[:pre] = 0
    return ir / np.max(np.abs(ir)) * 0.55

IR = reverb_ir()
wet = np.stack([fftconvolve(BUS['rev'][:, c], IR[:, c])[:N] for c in (0, 1)], axis=1)

mix = BUS['mus'] * 0.95 + BUS['sfx'] * 0.95 + wet * 0.30
mix = hp(mix.T, 28).T

# Мягкая компрессия шины и предохранитель от перегруза.
envf = np.maximum.reduce([np.abs(mix[:, 0]), np.abs(mix[:, 1])])
envf = lp(envf, 12)
gain = np.minimum(1.0, (0.55 / np.maximum(envf, 1e-6)) ** 0.35)
mix *= gain[:, None]
mix = np.tanh(mix * 1.25) / 1.25

# Хвост: аккуратно уводим последние 0,45 с, чтобы ролик не обрывался щелчком.
fade = int(0.45 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]

peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
data = (mix * 32767).astype(np.int16)

import wave
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())

print(f'music.wav: {N / SR:.2f}s, peak before norm {peak:.3f}, events {len(SFX)}, bars {bar}')
print('groove', round(G0, 2), '->', round(gr_end, 2), 'fin', round(FIN, 2), 'dur', round(DUR, 2))
