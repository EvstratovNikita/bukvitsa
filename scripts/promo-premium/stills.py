# Сетка контрольных кадров 3×5 по 640×360 с подписью времени.
import glob, json
from PIL import Image, ImageDraw

files = sorted(glob.glob('out/still-*.jpg'))
labels = json.load(open('out/stills.json'))
cols, tw, th, pad = 3, 640, 360, 6
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw + (cols + 1) * pad, rows * th + (rows + 1) * pad), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).resize((tw, th), Image.LANCZOS)
    x = pad + (i % cols) * (tw + pad)
    y = pad + (i // cols) * (th + pad)
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 86, y + 26], fill=(0, 0, 0))
    d.text((x + 6, y + 6), f"t={labels[i]}", fill=(255, 220, 120))
sheet.save('stills.jpg', quality=88)
print('stills', len(files), sheet.size)
