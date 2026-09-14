# Шрифты игры из сборки: woff2 → ttf, вариативный Manrope → статический 800,
# кириллица и латиница сливаются в один файл для drawtext.
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger
import glob, os

for w in glob.glob('site/assets/*.woff2'):
    f = TTFont(w); f.flavor = None
    f.save(os.path.basename(w).split('-')[0] + '-' + os.path.basename(w).split('-')[1] + '.ttf')

def static(src, dst, wght):
    f = TTFont(src)
    if 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': wght}, inplace=True)
    f.save(dst); return dst

parts = ['manrope-cyrillic.ttf', 'manrope-latin.ttf']
Merger().merge([static(p, 'st_' + p, 800) for p in parts]).save('promo-sans.ttf')
cmap = TTFont('promo-sans.ttf').getBestCmap()
need = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя ,.—'
print('fonts ok, missing:', [c for c in need if ord(c) not in cmap] or 'нет')
