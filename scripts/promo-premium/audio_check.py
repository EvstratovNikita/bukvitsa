# Проверка звука без прослушивания: волна с метками сцены + сверка ударов с таймлайном.
# Печатает, насколько близко к каждому событию кадра стоит ближайшая атака в звуке.
import json
import wave
import numpy as np
from PIL import Image, ImageDraw

TL = json.load(open('timeline.json'))['TL']
SRC = 'music-final.wav'

w = wave.open(SRC)
sr, n = w.getframerate(), w.getnframes()
x = np.frombuffer(w.readframes(n), np.int16).reshape(-1, 2).astype(np.float32) / 32768
mono = x.mean(1)
dur = len(mono) / sr

hop = sr // 200                                   # окно 5 мс
fr = mono[:len(mono) // hop * hop].reshape(-1, hop)
rms = np.sqrt((fr ** 2).mean(1))
d = np.diff(np.log(rms + 1e-6), prepend=0)
onsets = [i * hop / sr for i in range(3, len(d) - 3)
          if d[i] > 0.8 and d[i] >= d[max(0, i - 6):i + 7].max()]

KEYS = ['logo', 'game', 'win', 'shop', 'warm', 'pet', 'jump', 'jump2', 'fin']
print(f'{SRC}: {dur:.2f} c, пик {np.abs(x).max():.3f}, СКЗ {np.sqrt((mono ** 2).mean()):.3f}, атак {len(onsets)}')
for k in KEYS:
    t = TL[k]
    if onsets:
        dt, o = min((abs(o - t), o) for o in onsets)
        print(f'  {k:6s} {t:6.2f} → ближайшая атака {o:6.2f} (Δ {dt * 1000:4.0f} мс)')

W, H = 1920, 380
img = Image.new('RGB', (W, H), (16, 18, 30))
dr = ImageDraw.Draw(img)
step = max(1, len(mono) // W)
for xi in range(W):
    seg = mono[xi * step:(xi + 1) * step]
    if len(seg) == 0:
        continue
    a = int(abs(seg).max() * (H / 2 - 30))
    dr.line([(xi, H / 2 - a), (xi, H / 2 + a)], fill=(120, 170, 255))
for k in KEYS:
    xi = int(TL[k] / dur * W)
    dr.line([(xi, 20), (xi, H - 40)], fill=(247, 201, 72))
    dr.text((xi + 4, 24 + 26 * (KEYS.index(k) % 4)), f'{k} {TL[k]:.1f}', fill=(255, 226, 150))
for o in onsets:
    xi = int(o / dur * W)
    dr.line([(xi, H - 34), (xi, H - 18)], fill=(255, 120, 120))
img.save('audio-check.png', quality=90)
print('audio-check.png готов')
