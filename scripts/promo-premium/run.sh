#!/bin/bash
# Премиальный промо «Буклицы»: запись геймплея → сцена → рендер → выгрузка.
# MODE=stills — контрольные кадры (STILLS_URL); MODE=full — ролик (MP4_URL, SHEET_URL).
set -e
cd "$(dirname "$0")"
MODE=${MODE:-stills}
export NODE_PATH=/usr/local/lib/node_modules

(nohup python3 -m http.server 8123 --bind 127.0.0.1 --directory site >/dev/null 2>&1 &) || true
(nohup python3 -m http.server 8124 --bind 127.0.0.1 --directory . >/dev/null 2>&1 &) || true
sleep 1.5

mkdir -p fonts
cp site/assets/manrope-cyrillic-*.woff2 fonts/manrope-cyrillic.woff2
cp site/assets/manrope-latin-*.woff2 fonts/manrope-latin.woff2
cp site/assets/cormorant-garamond-cyrillic-*.woff2 fonts/cormorant-cyrillic.woff2
cp site/assets/cormorant-garamond-latin-*.woff2 fonts/cormorant-latin.woff2

rm -rf clips out
node capture.js
python3 -c "from PIL import Image; import glob; f=sorted(glob.glob('clips/A/*.jpg')); print('clip frame size', Image.open(f[0]).size, 'A frames', len(f))"

put () { curl -s -o /dev/null -w "$1:%{http_code}\n" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$3"; }

if [ "$MODE" = "stills" ] || [ "$MODE" = "both" ]; then
  node render.js stills
  python3 stills.py
  put stills.jpg image/jpeg "$STILLS_URL"
fi
if [ "$MODE" = "full" ] || [ "$MODE" = "both" ]; then
  node render.js full
  ffmpeg -y -loglevel error -framerate 60 -i out/f%05d.jpg -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.2     -pix_fmt yuv420p -movflags +faststart -an buklitsa-promo-premium.mp4
  ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate -of default=nw=1 buklitsa-promo-premium.mp4
  ffmpeg -y -loglevel error -i buklitsa-promo-premium.mp4 -vf "fps=1,scale=480:270,tile=5x6:padding=4:color=0x111111" -frames:v 1 -q:v 3 sheet.jpg
  put buklitsa-promo-premium.mp4 video/mp4 "$MP4_URL"
  put sheet.jpg image/jpeg "$SHEET_URL"
fi
echo ALL DONE
