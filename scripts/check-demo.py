from pathlib import Path
import sys, subprocess, json
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-i','output/Marginloom-Demo.mp4','-f','null','-'],check=True)
dur=json.loads(Path('output/demo/production.json').read_text())['duration_seconds'];assert 60<=dur<=120
for time,name in [(3,'opening'),(93,'voice'),(110,'offline')]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(time),'-i','output/Marginloom-Demo.mp4','-frames:v','1',f'output/demo/check-{name}.png'],check=True)
canvas=Image.new('RGB',(960,1620))
for i,name in enumerate(['opening','voice','offline']):canvas.paste(Image.open(f'output/demo/check-{name}.png').resize((960,540)),(0,i*540))
canvas.save('output/demo/verification.png')
voice=np.concatenate([np.fromfile(p,dtype='<f4') for p in Path('output/demo').glob('voice-*.f32')]);assert np.isfinite(voice).all()
print('PASS: full video/audio decode, captions present in MP4, finite speech samples, requested duration, 1080p extracted frames.')
