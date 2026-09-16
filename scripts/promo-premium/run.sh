#!/bin/bash
# Премиальный промо «Буклицы»: запись геймплея → сцена → музыка → рендер → сведение.
# MODE=stills — контрольные кадры и проверка звука; MODE=full — ролик; both — всё.
set -e
cd "$(dirname "$0")"
MODE=${MODE:-stills}
export NODE_PATH=/usr/local/lib/node_modules

(nohup python3 -m http.server 8123 --bind 127.0.0.1 --directory site >/dev/null 2>&1 &) || true
(nohup python3 -m http.server 8124 --bind 127.0.0.1 --directory . >/dev/null 2>&1 &) || true
pip install -q scipy 2>/dev/null || true
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

# Кадры (они же пишут timeline.json со звуковыми событиями сцены)
if [ "$MODE" = "stills" ] || [ "$MODE" = "both" ]; then
  node render.js stills
  python3 stills.py
fi
[ -f timeline.json ] || node render.js timeline

# Музыка: синтез по таймлайну, громкость по EBU R128, предохранитель от перегруза
python3 music.py
I=$(ffmpeg -hide_banner -i music.wav -af ebur128=peak=true -f null - 2>&1 | awk '/^ *I: /{v=$2} END{print v}')
G=$(python3 -c "print(round(-15.0 - ($I), 2))")
echo "loudness $I LUFS → правка ${G} dB"
ffmpeg -y -loglevel error -i music.wav -af "volume=${G}dB,alimiter=level_in=1:level_out=1:limit=0.9:attack=5:release=60" -ar 48000 music-final.wav
ffmpeg -hide_banner -i music-final.wav -af ebur128=peak=true -f null - 2>&1 | tail -12
python3 audio_check.py

if [ "$MODE" = "stills" ] || [ "$MODE" = "both" ]; then
  put stills.jpg image/jpeg "$STILLS_URL"
  put audio-check.png image/png "$AUDIO_URL"
fi

if [ "$MODE" = "full" ] || [ "$MODE" = "both" ]; then
  node render.js full
  ffmpeg -y -loglevel error -framerate 60 -i out/f%05d.jpg -i music-final.wav \
    -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.2 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ac 2 -shortest -movflags +faststart buklitsa-promo-premium.mp4
  ffprobe -v error -show_entries format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate -of default=nw=1 buklitsa-promo-premium.mp4
  ffmpeg -y -loglevel error -i buklitsa-promo-premium.mp4 -vf "fps=1,scale=480:270,tile=5x6:padding=4:color=0x111111" -frames:v 1 -q:v 3 sheet.jpg
  put buklitsa-promo-premium.mp4 video/mp4 "$MP4_URL"
  put sheet.jpg image/jpeg "$SHEET_URL"
fi
echo ALL DONE
