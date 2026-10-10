from pathlib import Path
import json,sys,subprocess,re
import numpy as np
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
f=imageio_ffmpeg.get_ffmpeg_exe();p=Path('output/promo-short');timing=json.loads((p/'timing.json').read_text());assert 50<=timing['total']<=70
subprocess.run([f,'-hide_banner','-loglevel','error','-i','output/Marginloom-Promo-60s.mp4','-f','null','-'],check=True)
probe=subprocess.run([f,'-hide_banner','-i','output/Marginloom-Promo-60s.mp4'],capture_output=True,text=True).stderr
match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe);assert match,probe
actual_duration=int(match[1])*3600+int(match[2])*60+float(match[3]);assert 50<=actual_duration<=70,actual_duration
assert 'Video: h264' in probe and 'Audio: aac' in probe
durations=timing['durations'];starts=np.cumsum([0]+durations[:-1]);samples=[]
for i in [0,1,2,3,4,5,6,7]:
    t=starts[i]+durations[i]*.6;file=p/f'verify-{i}.png';subprocess.run([f,'-hide_banner','-loglevel','error','-y','-ss',str(t),'-i','output/Marginloom-Promo-60s.mp4','-frames:v','1',str(file)],check=True);samples.append(file)
sheet=Image.new('RGB',(1920,540*4));
for j,file in enumerate(samples):sheet.paste(Image.open(file).resize((960,540)),((j%2)*960,(j//2)*540))
sheet.save(p/'verification.png')
# Validate movement within a scene, not merely changes between screenshots.
for offset,name in [(starts[1]+1.1,'motion-a'),(starts[1]+2.1,'motion-b')]:subprocess.run([f,'-hide_banner','-loglevel','error','-y','-ss',str(offset),'-i','output/Marginloom-Promo-60s.mp4','-frames:v','1',str(p/(name+'.png'))],check=True)
a=np.asarray(Image.open(p/'motion-a.png'),dtype=np.float32);b=np.asarray(Image.open(p/'motion-b.png'),dtype=np.float32);difference=float(np.abs(a-b).mean());assert difference>.2,difference
print(json.dumps({'duration_seconds':actual_duration,'motion_frame_difference':round(difference,3),'decode':'passed','video_size_bytes':Path('output/Marginloom-Promo-60s.mp4').stat().st_size}))
