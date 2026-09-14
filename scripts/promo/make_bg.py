# Подложка ролика в цветах обложки «Буклицы»: сине-голубое небо, фиолетовый
# край справа, звёзды и искры. Слева — полупрозрачная тёмная плашка под
# подписи, чтобы текст не сливался со звёздами. Панель игры встаёт справа
# (x 604..1224, y 41..679) — там остаётся мягкий светлый ореол.
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import random

W, H = 1280, 720
PW, PH, R = 620, 638, 28
LINES = ['Угадай слово', 'из пяти букв', 'Победа —', 'монеты в копилку',
         'Фон из магазина', 'меняет всю игру', 'Совёнок Букля', 'растёт с тобой']
TX = 104            # x текста (как в прежнем ролике)
CARD_X = 52         # левый край плашки
CARD_MAX_R = 572    # правый край плашки — не заходим под тень панели

def text_w(size):
    f = ImageFont.truetype('promo-sans.ttf', size)
    return max(f.getlength(t) for t in LINES)

fs = 50
while TX + text_w(fs) + 38 > CARD_MAX_R and fs > 38:
    fs -= 2
mw = text_w(fs)
open('fs.txt', 'w').write(str(fs))

# --- небо: горизонтальный градиент синий → голубой → фиолетовый
c0, c1, c2 = (24, 46, 166), (40, 104, 226), (116, 62, 204)
bg = Image.new('RGB', (W, H))
d = ImageDraw.Draw(bg)
for x in range(W):
    k = x / (W - 1)
    a, b, t = (c0, c1, k / 0.45) if k < 0.45 else (c1, c2, (k - 0.45) / 0.55)
    d.line([(x, 0), (x, H)], fill=tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))

def glow(img, cx, cy, r, color, strength, blur):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=int(255 * strength))
    m = m.filter(ImageFilter.GaussianBlur(blur))
    return Image.composite(Image.new('RGB', (W, H), color), img, m)

bg = glow(bg, 300, 330, 380, (110, 205, 255), 0.55, 150)   # голубое сияние за текстом
bg = glow(bg, 1180, 640, 360, (186, 118, 255), 0.50, 150)  # фиолетовый угол
bg = glow(bg, 914, 360, 430, (205, 228, 255), 0.30, 160)   # светлый ореол за панелью

# виньетка к тёмно-синему по краям
v = Image.new('L', (W, H), 255)
ImageDraw.Draw(v).ellipse([-160, -140, W + 160, H + 140], fill=0)
v = v.filter(ImageFilter.GaussianBlur(120)).point(lambda p: int(p * 0.75))
bg = Image.composite(Image.new('RGB', (W, H), (12, 20, 78)), bg, v)

# --- звёзды и искры (фиксированное зерно — одинаково при каждой сборке)
card = (CARD_X, 250, int(TX + mw + 38), 456)
def in_card(x, y, pad=18):
    return card[0] - pad < x < card[2] + pad and card[1] - pad < y < card[3] + pad

stars = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(stars)
rnd = random.Random(7)
n = 0
while n < 70:
    x, y = rnd.uniform(10, 600), rnd.uniform(8, H - 8)
    if rnd.random() < 0.25:
        x = rnd.uniform(10, W - 10); y = rnd.choice([rnd.uniform(6, 34), rnd.uniform(H - 34, H - 6)])
    if in_card(x, y): continue
    r = rnd.choice([0.9, 1.2, 1.5, 2.0, 2.4])
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, rnd.randint(150, 255)))
    n += 1
spark = []
while len(spark) < 12:
    x, y = rnd.uniform(24, 580), rnd.uniform(24, H - 24)
    if in_card(x, y, 40) or any(abs(x - a) < 70 and abs(y - b) < 70 for a, b, _ in spark): continue
    spark.append((x, y, rnd.choice([9, 12, 15, 19, 24])))
for x, y, s in spark:
    q = s * 0.16
    sd.polygon([(x, y - s), (x + q, y - q), (x + s, y), (x + q, y + q),
                (x, y + s), (x - q, y + q), (x - s, y), (x - q, y - q)], fill=(255, 255, 255, 245))
halo = stars.filter(ImageFilter.GaussianBlur(4))
bg = bg.convert('RGBA')
bg = Image.alpha_composite(bg, halo)
bg = Image.alpha_composite(bg, halo)
bg = Image.alpha_composite(bg, stars)

# --- плашка под подписи: тень, тёмно-синее стекло, тонкая светлая кромка
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle([card[0], card[1] + 12, card[2], card[3] + 12], radius=26, fill=(6, 10, 40, 130))
bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(18)))
pl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(pl).rounded_rectangle(card, radius=26, fill=(12, 20, 74, 178), outline=(255, 255, 255, 52), width=2)
bg = Image.alpha_composite(bg, pl)
bg.convert('RGB').save('bg.png')

# --- маска и тень панели игры (как в прежнем ролике)
m = Image.new('L', (PW, PH), 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, PW - 1, PH - 1], radius=R, fill=255)
m.save('mask.png')
PAD = 44
s = Image.new('RGBA', (PW + PAD * 2, PH + PAD * 2), (0, 0, 0, 0))
ImageDraw.Draw(s).rounded_rectangle([PAD, PAD, PAD + PW, PAD + PH], radius=R, fill=(8, 12, 50, 170))
s.filter(ImageFilter.GaussianBlur(26)).save('shadow.png')
print('bg ok: font', fs, 'text width', round(mw), 'card', card)
