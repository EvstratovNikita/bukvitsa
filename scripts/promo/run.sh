#!/bin/bash
# Промо «Буклицы» целиком: сборка игры → запись партии в Chromium →
# шрифты → фон → монтаж → выгрузка результата.
set -e
# Ссылки для выгрузки (presigned PUT из media_upload) передаются переменными:
# MP4_URL, SHEET_URL, FRAME_URL — в репозиторий их не кладём.
: "${MP4_URL:?}" "${SHEET_URL:?}" "${FRAME_URL:?}"
cd /home/user/work
pgrep -f "http.server 8123" >/dev/null || (python3 -m http.server 8123 --directory site >/dev/null 2>&1 &)
sleep 1
pip install --quiet fonttools brotli >/dev/null 2>&1 || true
rm -rf video
NODE_PATH=/usr/local/lib/node_modules node record.js
IN=$(ls video/*.webm | head -1)
ffmpeg -y -loglevel error -i "$IN" -vf fps=30 -c:v libx264 -preset veryfast -crf 16 -an raw.mp4
echo "raw $(ffprobe -v error -show_entries format=duration -of csv=p=0 raw.mp4)"
python3 fonts.py
python3 make_bg.py
bash compose.sh
put () { curl -s -o /dev/null -w "$1:%{http_code}\n" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$3"; }
put buklitsa-promo.mp4 video/mp4 "$MP4_URL"
put buklitsa-promo-sheet.jpg image/jpeg "$SHEET_URL"
put buklitsa-promo-frame.jpg image/jpeg "$FRAME_URL"
echo ALL DONE
