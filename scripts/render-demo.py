"""Assemble actual app captures, local narration, and an original instrumental bed."""
import json, math, subprocess, sys, wave, textwrap
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
out=Path('output/demo'); scenes=json.loads((out/'scenes.json').read_text())
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe(); sr=24000
raw=[]
for s in scenes:
    i=s['id']; meta=json.loads((out/f'voice-{i}.json').read_text()); a=np.fromfile(out/f'voice-{i}.f32',dtype='<f4')
    if meta['rate']!=sr:a=np.interp(np.linspace(0,len(a)-1,int(len(a)*sr/meta['rate'])),np.arange(len(a)),a)
    raw.append(a.astype('<f4'))
tempo=max(1,sum(len(a)/sr for a in raw)/(115-1.25*len(scenes)))
voice=[]; durations=[]; cursor=0; captions=[]
for s in scenes:
    i=s['id'];a=raw[i]
    if tempo>1:
        audio=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-f','f32le','-ar',str(sr),'-ac','1','-i','pipe:0','-af',f'atempo={tempo:.5f}','-f','f32le','pipe:1'],input=a.tobytes(),stdout=subprocess.PIPE,check=True).stdout
        a=np.frombuffer(audio,dtype='<f4')
    duration=max(5.3,len(a)/sr+1.25);durations.append(duration)
    voice.extend([np.zeros(int(.4*sr)),a,np.zeros(max(0,int(duration*sr)-len(a)-int(.4*sr)))])
    captions.append((cursor+.3,cursor+duration-.2,s['narration']));cursor+=duration
voice=np.concatenate(voice);voice=voice/(max(.05,np.max(np.abs(voice))))*.74
total=len(voice)/sr
if total>120:raise RuntimeError(f'Voiceover exceeds requested two minutes: {total:.1f}s')
# Original slow piano-like arpeggios, with a soft sustained pad. No sampled music.
music=np.zeros_like(voice); beat=60/72
chords=[[50,57,61,66],[45,52,59,61],[47,54,57,62],[43,50,57,59]]
def tone(midi,seconds,gain=.15):
    t=np.arange(int(seconds*sr))/sr;f=440*2**((midi-69)/12)
    env=(1-np.exp(-t*80))*np.exp(-t*1.65)
    return gain*env*(np.sin(2*np.pi*f*t)+.24*np.sin(4*np.pi*f*t)+.07*np.sin(6*np.pi*f*t))
for bar in range(math.ceil(total/(beat*4))):
    notes=chords[bar%4]
    for j,midi in enumerate([notes[0],notes[2]+12,notes[1]+12,notes[3]+12]):
        start=int((bar*4+j)*beat*sr);a=tone(midi,3,.1 if j==0 else .055);n=min(len(a),len(music)-start)
        if n>0:music[start:start+n]+=a[:n]
    start=int(bar*4*beat*sr);n=min(int(beat*4*sr),len(music)-start)
    if n>0:
        t=np.arange(n)/sr;env=np.sin(np.pi*np.arange(n)/n)**2
        for note in notes:music[start:start+n]+=.008*env*np.sin(2*np.pi*(440*2**((note+12-69)/12))*t)
music*=np.minimum(1,np.arange(len(music))/(sr*3))*np.minimum(1,(len(music)-np.arange(len(music)))/(sr*4))
mix=np.clip(voice+music,-.98,.98)
def wav(name,a):
    with wave.open(str(out/name),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((a*32767).astype('<i2').tobytes())
wav('narration.wav',voice);wav('original-music.wav',music);wav('mix.wav',mix)
serif=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',38);sans=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',24);label=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',18)
def wrapped(draw,text,font,width):
    lines=[];line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if draw.textlength(candidate,font=font)>width and line:lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines
parts=[]
for s,duration in zip(scenes,durations):
    i=s['id'];canvas=Image.new('RGB',(1920,1080),'#f5f3eb');draw=ImageDraw.Draw(canvas)
    draw.text((70,22),'Marginloom',font=serif,fill='#194d3d');draw.text((1845,34),f'{i+1:02d} / {len(scenes):02d}',font=label,anchor='ra',fill='#637664')
    draw.text((960,34),s['title'],font=sans,anchor='ma',fill='#194d3d')
    screenshot=Image.open(out/f'{i:02d}.png').convert('RGB');canvas.paste(screenshot,(240,79));draw.rectangle((240,79,1679,979),outline='#d6d9c9',width=2)
    # Concise subtitles are broken into readable clauses in the separate SRT.
    draw.text((960,1019),'YOUR NOTES. YOUR PACE.  •  LOCAL AI',font=label,anchor='mm',fill='#637664')
    png=out/f'frame-{i:02d}.png';canvas.save(png)
    chunks=[(png,duration)]
    if i in (8,11) and (out/f'{i:02d}b.png').exists():
        second=canvas.copy();second.paste(Image.open(out/f'{i:02d}b.png').convert('RGB'),(240,79));second.save(out/f'frame-{i:02d}b.png');chunks=[(png,duration/2),(out/f'frame-{i:02d}b.png',duration/2)]
    for j,(frame,d) in enumerate(chunks):
        part=out/f'part-{i:02d}-{j}.mp4';parts.append(part)
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-loop','1','-i',str(frame),'-t',str(d),'-vf',f"fade=t=in:st=0:d=0.3,fade=t=out:st={max(0,d-.3):.3f}:d=0.3",'-r','24','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',str(part)],check=True)
    print('Rendered scene',i+1,flush=True)
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
srt=[];counter=0
for start,end,text in captions:
    # Split long narration into ~12-word captions, paced to each segment.
    words=text.split();chunks=[' '.join(words[j:j+12]) for j in range(0,len(words),12)]
    for j,chunk in enumerate(chunks):
        counter+=1;left=start+(end-start)*j/len(chunks);right=start+(end-start)*(j+1)/len(chunks)
        srt.append(f'{counter}\n{stamp(left)} --> {stamp(right)}\n{chunk}\n')
(out/'Marginloom-Demo.srt').write_text('\n'.join(srt),encoding='utf8')
(out/'concat.txt').write_text('\n'.join("file '"+p.name+"'" for p in parts),encoding='utf8')
silent=out/'silent.mp4';subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(out/'concat.txt'),'-c','copy',str(silent)],check=True)
final=Path('output/Marginloom-Demo.mp4')
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(silent),'-i',str(out/'mix.wav'),'-i',str(out/'Marginloom-Demo.srt'),'-map','0:v','-map','1:a','-map','2:s','-c:v','copy','-c:a','aac','-b:a','160k','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata','title=Marginloom — Your notes, your pace','-movflags','+faststart','-shortest',str(final)],check=True)
manifest={'duration_seconds':round(total,2),'resolution':'1920x1080','narrator':'Kokoro Heart, locally generated','music':'Original synthesized instrumental, composed for this demo','footage':'Actual app captures; final answer generated with browser network disabled','file':str(final)}
(out/'production.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest),flush=True)
