from pathlib import Path
import json,sys,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
f=imageio_ffmpeg.get_ffmpeg_exe();p=Path('output/promo');timing=json.loads((p/'timing.json').read_text());assert 60<=timing['total']<=120
subprocess.run([f,'-hide_banner','-loglevel','error','-i','output/Marginloom-Promo.mp4','-f','null','-'],check=True)
durations=timing['durations'];starts=np.cumsum([0]+durations[:-1]);samples=[]
for i in [0,1,2,3,5,8,9,10]:
    t=starts[i]+durations[i]*.6;file=p/f'verify-{i}.png';subprocess.run([f,'-hide_banner','-loglevel','error','-y','-ss',str(t),'-i','output/Marginloom-Promo.mp4','-frames:v','1',str(file)],check=True);samples.append(file)
sheet=Image.new('RGB',(1920,540*4));
for j,file in enumerate(samples):sheet.paste(Image.open(file).resize((960,540)),((j%2)*960,(j//2)*540))
sheet.save(p/'verification.png')
# Validate movement within a scene, not merely changes between screenshots.
for offset,name in [(starts[1]+1.1,'motion-a'),(starts[1]+2.1,'motion-b')]:subprocess.run([f,'-hide_banner','-loglevel','error','-y','-ss',str(offset),'-i','output/Marginloom-Promo.mp4','-frames:v','1',str(p/(name+'.png'))],check=True)
a=np.asarray(Image.open(p/'motion-a.png'),dtype=np.float32);b=np.asarray(Image.open(p/'motion-b.png'),dtype=np.float32);difference=float(np.abs(a-b).mean());assert difference>.2,difference
print(json.dumps({'duration_seconds':round(timing['total'],2),'motion_frame_difference':round(difference,3),'decode':'passed','video_size_bytes':Path('output/Marginloom-Promo.mp4').stat().st_size}))
