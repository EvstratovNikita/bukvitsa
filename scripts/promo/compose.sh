#!/bin/bash
# Монтаж промо «Буклицы»: та же композиция, что у прежнего ролика (игра
# панелью справа, две строки слева, 4 сцены со сдвигом), но фон — в цветах
# обложки, текст — на плашке. Границы сцен считаются по меткам записи
# (marks.json), а не вручную: время каждой новой записи немного другое.
set -e
cd /home/user/work
F=promo-sans.ttf
FS=$(cat fs.txt)
Y2=$((292 + FS * 7 / 5))

python3 - <<'PY'
import json
M = json.load(open('marks.json'))
sc = [
    (M['ready'] - 0.05,     M['reveal1'] + 0.30),   # Угадай слово
    (M['reveal1'] + 0.20,   M['win']),              # Победа — монеты
    (M['shop'] - 0.70,      M['boardLight'] - 0.30),# Фон из магазина
    (M['boardLight'] + 0.15, M['pet']),             # Совёнок Букля
]
X = 0.4
with open('times.sh', 'w') as f:
    off = 0.0
    for i, (a, b) in enumerate(sc, 1):
        f.write(f'S{i}={a:.2f}\nE{i}={b:.2f}\n')
        if i > 1:
            f.write(f'O{i}={off:.2f}\n')
        off += (b - a) - X
print(open('times.sh').read())
PY
. ./times.sh

slide () {
  local out=$1 ss=$2 to=$3 l1=$4 l2=$5
  ffmpeg -y -loglevel error -ss "$ss" -to "$to" -i raw.mp4 -loop 1 -i bg.png -i mask.png -i shadow.png \
   -filter_complex "\
[0]crop=700:720:290:0,scale=620:638:flags=lanczos,format=rgba[p];\
[p][2]alphamerge[pm];\
[1][3]overlay=x=560:y=-3[b1];\
[b1][pm]overlay=x=604:y=41:shortest=1[c];\
[c]drawbox=x=76:y=294:w=6:h=$((Y2 + FS - 290)):color=0xf7c948@0.95:t=fill,\
drawtext=fontfile=$F:text='$l1':fontcolor=white:fontsize=$FS:x=104:y='292+26*(1-min(1\,t/0.45))':alpha='min(1\,t/0.45)':shadowcolor=0x060a28@0.7:shadowx=0:shadowy=3,\
drawtext=fontfile=$F:text='$l2':fontcolor=0xf7c948:fontsize=$FS:x=104:y='$Y2+26*(1-min(1\,max(0\,t-0.15)/0.45))':alpha='min(1\,max(0\,t-0.15)/0.45)':shadowcolor=0x060a28@0.7:shadowx=0:shadowy=3,\
format=yuv420p,settb=AVTB[v]" \
   -map "[v]" -an -r 30 -video_track_timescale 15360 -c:v libx264 -preset veryfast -crf 16 "$out"
  echo "$out $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")"
}

slide n1.mp4 $S1 $E1 'Угадай слово'    'из пяти букв'
slide n2.mp4 $S2 $E2 'Победа —'        'монеты в копилку'
slide n3.mp4 $S3 $E3 'Фон из магазина' 'меняет всю игру'
slide n4.mp4 $S4 $E4 'Совёнок Букля'   'растёт с тобой'

ffmpeg -y -loglevel error -i n1.mp4 -i n2.mp4 -i n3.mp4 -i n4.mp4 \
 -filter_complex "\
[0]fps=30,settb=AVTB[v0];[1]fps=30,settb=AVTB[v1];[2]fps=30,settb=AVTB[v2];[3]fps=30,settb=AVTB[v3];\
[v0][v1]xfade=transition=slideleft:duration=0.4:offset=$O2[a];\
[a][v2]xfade=transition=slideleft:duration=0.4:offset=$O3[b];\
[b][v3]xfade=transition=slideleft:duration=0.4:offset=$O4[v]" \
 -map "[v]" -r 30 -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.0 \
 -pix_fmt yuv420p -movflags +faststart -an buklitsa-promo.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate -of default=nw=1 buklitsa-promo.mp4
ffmpeg -y -loglevel error -i buklitsa-promo.mp4 -vf "fps=1.2,scale=426:240,tile=4x4:padding=4:color=0x222222" -frames:v 1 -q:v 3 buklitsa-promo-sheet.jpg
# крупный кадр для проверки читаемости: середина второй сцены
ffmpeg -y -loglevel error -ss $(python3 -c "print(round($O2+1.6,2))") -i buklitsa-promo.mp4 -frames:v 1 -q:v 2 buklitsa-promo-frame.jpg
echo compose ok
