"""Motion-designed Marginloom product film, using genuine UI captures as footage."""
from pathlib import Path
import json, math, subprocess, sys, wave, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
P=Path('output/promo-cinematic');D=Path('output/demo');P.mkdir(exist_ok=True)
story=json.loads((P/'story.json').read_text());FF=imageio_ffmpeg.get_ffmpeg_exe()
W,H,FPS,SR=1600,900,30,24000
CREAM='#f5f2e9';GREEN='#194d3d';INK='#193f35';SAGE='#a5ba8d';GOLD='#ddb667'
@functools.lru_cache(None)
def font(size,kind='sans'):
    files={'sans':'segoeui.ttf','bold':'segoeuib.ttf','serif':'georgia.ttf','italic':'georgiai.ttf'}
    return ImageFont.truetype('C:/Windows/Fonts/'+files[kind],size)
def ease(x):return 1-(1-min(1,max(0,x)))**3
def smooth(x):return .5-.5*math.cos(math.pi*min(1,max(0,x)))
def text(im,xy,s,size=30,color=INK,kind='sans',anchor=None):ImageDraw.Draw(im).text(xy,s,font=font(size,kind),fill=color,anchor=anchor)
def lines(im,xy,words,size=70,color=INK,kind='serif',gap=1.15):
    for j,s in enumerate(words):text(im,(xy[0],xy[1]+j*size*gap),s,size,color,kind)
def pill(im,xy,label,color=GREEN,bg='#e4ead8',size=23):
    draw=ImageDraw.Draw(im);width=draw.textlength(label,font=font(size))+40;draw.rounded_rectangle((xy[0],xy[1],xy[0]+width,xy[1]+size+24),radius=18,fill=bg);text(im,(xy[0]+20,xy[1]+9),label,size,color)
def leaf(im,cx,cy,scale=1,phase=0,color=SAGE):
    # Original curved leaf ornament follows the notebook's existing visual tone.
    def curve(a,b,c,d):
        return [((1-u)**3*a[0]+3*(1-u)**2*u*b[0]+3*(1-u)*u*u*c[0]+u**3*d[0],(1-u)**3*a[1]+3*(1-u)**2*u*b[1]+3*(1-u)*u*u*c[1]+u**3*d[1]) for u in np.linspace(0,1,35)]
    paths=[curve((-32,34),(-62,-5),(-12,-40),(25,-48)),curve((25,-48),(37,-53),(40,-61),(42,-69)),curve((42,-69),(74,-15),(47,42),(10,45)),curve((10,45),(-14,58),(-27,49),(-32,34)),curve((-43,57),(-27,17),(7,10),(29,-32))]
    draw=ImageDraw.Draw(im)
    for pts in paths:draw.line([(cx+x*scale+math.sin(phase)*2,cy+y*scale) for x,y in pts],fill=color,width=max(2,int(scale*3)))
rng=np.random.default_rng(55)
grain=rng.normal(0,.6,(H,W,1));rgb=np.array([245,242,233]);base=Image.fromarray(np.clip(rgb+grain,0,255).astype('uint8'),'RGB')
def background(i,t):
    im=base.copy();draw=ImageDraw.Draw(im)
    draw.ellipse((1170+15*math.sin(t/3),-220,1840,470),fill='#edf0e2')
    draw.ellipse((-260,620,270,1150),fill='#eee8d8')
    if i not in [0,10]:text(im,(75,40),'Marginloom',29,GREEN,'serif');text(im,(1525,50),'LOCAL AI · PERSONAL STUDY',17,'#637664',anchor='ra')
    return im
ASSETS={
 'home':Image.open(D/'13.png').convert('RGB'),
 'import':Image.open(D/'01.png').convert('RGB').crop((458,211,983,690)),
 'chat':Image.open(D/'02.png').convert('RGB').crop((550,253,1406,733)),
 'source':Image.open(D/'03.png').convert('RGB').crop((389,225,1052,675)),
 'quiz':Image.open(D/'04.png').convert('RGB').crop((419,292,1242,856)),
 'feedback':Image.open(D/'05.png').convert('RGB').crop((455,588,1205,900)),
 'trail':Image.open(D/'07.png').convert('RGB').crop((280,490,1050,865)),
 'memory':Image.open(D/'08.png').convert('RGB').crop((255,170,1400,860)),
 'flash':Image.open(D/'08b.png').convert('RGB').crop((255,160,1400,860)),
 'graph':Image.open(D/'09.png').convert('RGB').crop((354,233,1085,711)),
 'session':Image.open(D/'10.png').convert('RGB').crop((330,110,1110,790)),
 'teach':Image.open(D/'11.png').convert('RGB').crop((330,45,1110,854)),
 'orb':Image.open(D/'11b.png').convert('RGB').crop((350,238,940,351)),
 'offline':Image.open(D/'13.png').convert('RGB').crop((552,255,1405,692)),
}
@functools.lru_cache(maxsize=120)
def card_asset(key,width):
    src=ASSETS[key];height=round(src.height*width/src.width);src=src.resize((width,height),Image.Resampling.LANCZOS).convert('RGBA')
    mask=Image.new('L',(width,height));ImageDraw.Draw(mask).rounded_rectangle((0,0,width-1,height-1),radius=18,fill=255);src.putalpha(mask)
    result=Image.new('RGBA',(width+50,height+55));shadow=Image.new('RGBA',result.size);ImageDraw.Draw(shadow).rounded_rectangle((23,27,width+27,height+30),radius=20,fill=(15,46,34,38));shadow=shadow.filter(ImageFilter.GaussianBlur(11));result.alpha_composite(shadow);result.alpha_composite(src,(25,15));return result
def card(im,key,x,y,width,rotate=0):
    a=card_asset(key,int(width));
    if rotate:a=a.rotate(rotate,Image.Resampling.BICUBIC,expand=True)
    im.paste(a,(int(x)-25,int(y)-15),a)
def wifi(im,xy,size=100,color=CREAM,slash=False):
    d=ImageDraw.Draw(im);x,y=xy
    for r in (.45,.73,1):d.arc((x-size*r,y-size*r,x+size*r,y+size*r),215,325,fill=color,width=7)
    d.ellipse((x-7,y-7,x+7,y+7),fill=color)
    if slash:d.line((x-size*.9,y-size*.9,x+size*.6,y+size*.4),fill=GOLD,width=9)
def subtitle(im,s):
    if not s:return
    draw=ImageDraw.Draw(im);f=font(26);width=draw.textlength(s,font=f);x=(W-width)/2
    draw.rounded_rectangle((x-23,827,x+width+23,878),radius=15,fill=GREEN);text(im,(W/2,852),s,26,CREAM,anchor='mm')
# Film composition: live footage, a notebook reveal, moving camera crops and
# match cuts. Captured interactions are real; decorative marks are animation.
capture=json.loads((P/'capture.json').read_text())
@functools.lru_cache(maxsize=5)
def decoded_clip(key):
    seg=capture['segments'][key]
    raw=subprocess.run([FF,'-hide_banner','-loglevel','error','-ss',str(seg['start']),'-i',capture['file'],'-t',str(seg['end']-seg['start']),'-vf','fps=12,scale=960:600','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,check=True).stdout
    frames=np.frombuffer(raw,dtype=np.uint8).reshape(-1,600,960,3)
    assert len(frames),key
    return frames

def live(key,u):
    frames=decoded_clip(key)
    return Image.fromarray(frames[min(len(frames)-1,max(0,int(u*(len(frames)-1))))]).copy()

def crop_original(src,box):
    return src.crop(tuple(round(v*src.width/1440) for v in box))

def camera(src,width,height,u,zoom=1.08,focus=(.5,.5)):
    # Fill a cinematic viewport, easing the camera toward the relevant UI.
    factor=max(width/src.width,height/src.height)*(1+(zoom-1)*smooth(u))
    rw,rh=round(src.width*factor),round(src.height*factor)
    src=src.resize((rw,rh),Image.Resampling.BICUBIC)
    x=max(0,min(rw-width,round((rw-width)*focus[0])))
    y=max(0,min(rh-height,round((rh-height)*focus[1])))
    return src.crop((x,y,x+width,y+height))

def contain_shot(src,width,height,u):
    factor=min(width/src.width,height/src.height)*(.97+.025*smooth(u))
    rw,rh=round(src.width*factor),round(src.height*factor)
    shot=Image.new('RGB',(width,height),CREAM);shot.paste(src.resize((rw,rh),Image.Resampling.BICUBIC),((width-rw)//2,(height-rh)//2));return shot

def film_bg(t,dark=False):
    im=Image.new('RGB',(W,H),GREEN if dark else CREAM)
    d=ImageDraw.Draw(im)
    for j in range(9):
        x=150+j*170+18*math.sin(t*.6+j)
        d.line((x,-100,x-250,H+100),fill='#285b48' if dark else '#e9e8db',width=1)
    return im

def label(im,s,dark=False):
    pill(im,(55,38),s,CREAM if dark else GREEN,'#315f4a' if dark else '#e5e9d7',20)

def pointer(im,x,y,t,color=GREEN):
    d=ImageDraw.Draw(im)
    d.polygon([(x,y),(x+8,y+36),(x+17,y+25),(x+29,y+27)],fill=color,outline=CREAM,width=2)
    r=20+12*math.sin(t*5)**2
    d.ellipse((x-r,y-r,x+r,y+r),outline=GOLD,width=2)

def paper(im,x,y,angle=0,scale=1,heading='LECTURE NOTES'):
    w,h=round(245*scale),round(320*scale)
    a=Image.new('RGBA',(w+20,h+20));d=ImageDraw.Draw(a)
    d.rounded_rectangle((8,12,w+8,h+12),radius=8,fill='#102f25')
    d.rounded_rectangle((0,0,w,h),radius=8,fill=CREAM)
    d.text((20,25),heading,font=font(max(13,round(16*scale)),'bold'),fill=GREEN)
    for j in range(8):d.line((20,70+j*25*scale,w-25-(j%3)*15,70+j*25*scale),fill='#b6c4ab',width=2)
    a=a.rotate(angle,Image.Resampling.BICUBIC,expand=True);im.paste(a,(int(x),int(y)),a)

def headline(im,words,t,y=340,dark=False,size=110):
    d=ImageDraw.Draw(im);f=font(size,'serif')
    total=sum(d.textlength(w+' ',font=f) for w in words);x=(W-total)/2
    for j,w in enumerate(words):
        arrival=ease((t-j*.09)/.55);text(im,(x,y+(1-arrival)*70),w,size,CREAM if dark else GREEN,'serif')
        x+=d.textlength(w+' ',font=f)

def frame(i,t,duration,caption=''):
    u=t/duration;im=film_bg(t,dark=i in (0,6,7));d=ImageDraw.Draw(im)
    if i==0:
        # A desk fills up before the network disappears. The camera never sits
        # on a fixed title-and-card layout.
        beat=min(2,int(u*3));q=u*3-beat
        if beat<2:
            for j in range(6):
                travel=ease((t-j*.13)/1.1)
                x=90+j*245+math.sin(t*.8+j)*20
                y=140+(j%2)*110+(1-travel)*600
                paper(im,x,y,(-14+j*5)+math.sin(t+j)*2,.9,heading=['CHAPTER 01','REVISION NOTES','QUIZ TOMORROW'][j%3])
            wash=Image.new('RGBA',(W,H),(10,36,26,175));im=Image.alpha_composite(im.convert('RGBA'),wash).convert('RGB')
            headline(im,['Quiz','tomorrow.'] if beat==0 else ['Too','many','pages.'],q*3,y=350,dark=True,size=106)
        else:
            d=ImageDraw.Draw(im);wifi(im,(800,315),115,color=SAGE,slash=True)
            headline(im,['No','internet.'],q*3,y=420,dark=True,size=118)
            text(im,(800,610),'Your study time should keep going.',31,SAGE,anchor='mm')
        text(im,(65,50),'A STUDENT’S REALITY',20,SAGE,'bold')
    elif i==1:
        # Open a branded notebook directly into the actual study workspace.
        reveal=ease(t/2.2);src=ASSETS['home'];screen=camera(src,1280,720,u,1.035)
        im.paste(screen,(160,105));d=ImageDraw.Draw(im)
        d.rounded_rectangle((150,95,1450,835),radius=15,outline='#abc099',width=5)
        if reveal<1:
            right=1450-1280*reveal
            d.polygon([(150,95),(right,95+35*reveal),(right,835-35*reveal),(150,835)],fill=GREEN)
            if right>650:
                text(im,(230,270),'Marginloom',75,CREAM,'serif')
                text(im,(235,375),'YOUR OFFLINE NOTEBOOK',20,SAGE,'bold')
                leaf(im,330,550,.9,t,color=SAGE)
            d.line((right,95+35*reveal,right,835-35*reveal),fill=GOLD,width=7)
        label(im,'MEET MARGINLOOM')
    elif i==2:
        # Live typing and the app's real source-search result.
        src=crop_original(live('chat',min(1,u*1.15)),(230,160,1430,880))
        im.paste(camera(src,1470,740,u,1.07,focus=(.75,.85)) if u<.64 else contain_shot(ASSETS['chat'],1470,740,u),(65,96))
        label(im,'YOUR MATERIAL → YOUR STUDY SPACE')
        if u>.66:
            # Cursor emphasis is an editorial overlay, not an invented answer.
            ImageDraw.Draw(im).line((210,810,210+1180*ease((u-.66)/.3),810),fill=GOLD,width=4)
    elif i==3:
        src=crop_original(live('source',min(1,u*1.2)),(380,190,1060,735))
        shot=camera(src,1240,720,u,1.04,focus=(.5,.55))
        im.paste(shot,(180,95));label(im,'CHECK THE ORIGINAL PASSAGE')
        d=ImageDraw.Draw(im)
        if u>.4:
            # Keep the marker at the edge so the source words remain legible.
            y=360+100*smooth((u-.4)/.6)
            d.line((150,220,150,y),fill=GOLD,width=7)
            pointer(im,145,y,t)
    elif i==4:
        # A rapid match cut from a real quiz to its real source feedback.
        phase=smooth(min(1,u*1.8));src=ASSETS['quiz'] if u<.48 else ASSETS['feedback']
        im.paste(contain_shot(src,1240,660,phase),(180,125))
        label(im,'PRACTICE → FEEDBACK → ANOTHER TRY')
        if u>.53:
            wash=Image.new('RGBA',(W,H));wd=ImageDraw.Draw(wash)
            wd.rounded_rectangle((1040,660,1515,750),radius=12,fill=(25,77,61,235))
            im=Image.alpha_composite(im.convert('RGBA'),wash).convert('RGB')
            text(im,(1080,677),'Find the gap.',43,CREAM,'serif')
    elif i==5:
        # Three actual interactions, cutting on the soundtrack's rhythm.
        j=min(2,int(u*3));local=u*3-j;key=['trail','memory','flash'][j]
        src=crop_original(live(key,min(1,local*1.13)),(230,120,1430,895))
        im.paste(camera(src,1480,760,local,1.055,focus=(.5,.85)),(60,65))
        label(im,['TYPE IT.','MATCH IT.','RECALL IT.'][j])
        if local<.14 and j:
            d=ImageDraw.Draw(im);edge=int(W*ease(local/.14));d.rectangle((edge,0,W,H),fill=GREEN)
    elif i==6:
        # The network drops; the UI stays. Evidence is the genuine disconnected
        # answer capture, without simulated token generation or fabricated UI.
        if u<.23:
            wifi(im,(800,300),115,color=SAGE,slash=True)
            headline(im,['Still','studying.'],t,y=430,dark=True,size=100)
            text(im,(800,590),'The cloud can disappear.',32,SAGE,anchor='mm')
        else:
            v=(u-.23)/.77;src=ASSETS['offline']
            panel=camera(src,1260,615,v,1.12,focus=(.52,.55))
            im.paste(panel,(170,160));label(im,'NEW ANSWER · NETWORK DISABLED',dark=True)
            pill(im,(190,775),'RUNS ON YOUR DEVICE',CREAM,'#315f4a',20)
            pill(im,(650,775),'YOUR NOTES STAY LOCAL',CREAM,'#315f4a',20)
            d=ImageDraw.Draw(im);d.line((170,155,170+1260*ease(v*2),155),fill=GOLD,width=4)
    elif i==7:
        # The study tools gather into a notebook mark, then a clean brand close.
        gather=ease(t/1.7)
        for j in range(4):
            angle=j*math.pi/2+t*.35;r=360*(1-gather)
            x=800+math.cos(angle)*r;y=280+math.sin(angle)*r
            if gather<.97:
                d.rounded_rectangle((x-24,y-24,x+24,y+24),radius=8,fill=GOLD)
                text(im,(x,y),['?','A','✓','+'][j],26,GREEN,'bold',anchor='mm')
        d.rounded_rectangle((750,205,850,325),radius=9,outline=SAGE,width=4)
        d.line((772,205,772,325),fill=SAGE,width=3)
        for y in (235,258,281):d.line((790,y,832,y),fill=SAGE,width=3)
        headline(im,['Marginloom'],t,y=372,dark=True,size=120)
        text(im,(800,540),'Your notes. Your pace.',47,CREAM,'serif',anchor='mm')
        text(im,(800,615),'Even when the cloud disappears.',29,SAGE,anchor='mm')
        if t>2:pill(im,(560,718),'BRING A CHAPTER. START WITH ONE QUESTION.',GREEN,GOLD,20)
    subtitle(im,caption)
    return im

def prepare_audio():
    raw=[]
    for i in range(len(story)):
        meta=json.loads((P/f'voice-{i}.json').read_text());a=np.fromfile(P/f'voice-{i}.f32',dtype='<f4')
        if meta['rate']!=SR:a=np.interp(np.linspace(0,len(a)-1,int(len(a)*SR/meta['rate'])),np.arange(len(a)),a)
        raw.append(a.astype('<f4'))
    tempo=max(1,sum(len(a)/SR for a in raw)/51)
    durations=[];audio=[];caps=[];cursor=0
    for i,a in enumerate(raw):
        if tempo>1:a=np.frombuffer(subprocess.run([FF,'-hide_banner','-loglevel','error','-f','f32le','-ar',str(SR),'-ac','1','-i','pipe:0','-af',f'atempo={tempo}','-f','f32le','pipe:1'],input=a.tobytes(),stdout=subprocess.PIPE,check=True).stdout,dtype='<f4')
        gap=1.6 if i in (0,1,len(story)-1) else .9;dur=math.ceil((len(a)/SR+gap)*FPS)/FPS;durations.append(dur)
        audio.extend([np.zeros(int(.35*SR)),a,np.zeros(int(dur*SR)-len(a)-int(.35*SR))])
        words=story[i]['voice'].split();chunks=[' '.join(words[k:k+9]) for k in range(0,len(words),9)]
        for j,s in enumerate(chunks):caps.append((cursor+.35+len(a)/SR*j/len(chunks),cursor+.35+len(a)/SR*(j+1)/len(chunks),s))
        cursor+=dur
    # Hold the closing brand card long enough to reach one minute.
    if cursor<60:
        extra=math.ceil((60-cursor)*FPS)/FPS
        durations[-1]+=extra;cursor+=extra;audio.append(np.zeros(round(extra*SR)))
    voice=np.concatenate(audio);voice/=max(.1,np.max(np.abs(voice)));voice*=.76
    n=len(voice);music=np.zeros(n);sfx=np.zeros(n);bpm=112;beat=60/bpm;rng=np.random.default_rng(90)
    chords=[[50,57,61,66],[47,54,57,62],[43,50,57,59],[45,52,59,61]]
    def add(dst,a,start):
        start=int(start*SR);length=min(len(a),len(dst)-start)
        if length>0:dst[start:start+length]+=a[:length]
    def note(midi,duration=2.5,gain=.12):
        t=np.arange(int(duration*SR))/SR;f=440*2**((midi-69)/12);env=(1-np.exp(-t*100))*np.exp(-t*2.1)
        return gain*env*(np.sin(2*np.pi*f*t)+.23*np.sin(4*np.pi*f*t)+.05*np.sin(6*np.pi*f*t))
    for k in range(math.ceil(cursor/beat)):
        start=k*beat;ch=chords[(k//8)%4];add(music,note(ch[[0,2,1,3][k%4]]+12,gain=.11),start)
        if start>durations[0]:
            if k%4==0:
                t=np.arange(int(.16*SR))/SR;kick=.105*np.sin(2*np.pi*(65*t+1.2*(1-np.exp(-t*28))))*np.exp(-t*22);add(music,kick,start);add(music,note(ch[0]-12,duration=1.5,gain=.09),start)
            if k%2==1:
                t=np.arange(int(.08*SR))/SR;rim=.022*rng.normal(0,1,len(t))*np.exp(-t*65);add(music,rim,start)
            t=np.arange(int(.035*SR))/SR;tick=.009*rng.normal(0,1,len(t))*np.exp(-t*95);add(music,tick,start+.5*beat)
    start=0
    for i,dur in enumerate(durations):
        if i:
            t=np.arange(int(.36*SR))/SR;noise=rng.normal(0,1,len(t));noise=np.convolve(noise,np.ones(9)/9,mode='same');add(sfx,.065*noise*np.sin(np.pi*np.arange(len(t))/len(t))**2,max(0,start-.18));add(sfx,note(78,duration=.6,gain=.022),start+.08)
        start+=dur
    # Duck the soundtrack under speech; ease in/out the original instrumental.
    energy=np.convolve(np.abs(voice),np.ones(2400)/2400,mode='same');duck=1-.5*np.clip(energy/.03,0,1);music*=duck
    fade=np.minimum(1,np.arange(n)/(SR*1.5))*np.minimum(1,(n-np.arange(n))/(SR*2.8));mix=(voice+music+sfx)*fade;assert np.max(np.abs(mix))<1
    def wav(name,a):
        with wave.open(str(P/name),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((a*32767).astype('<i2').tobytes())
    wav('pitch-narration.wav',voice);wav('original-promo-music.wav',music);wav('mix.wav',mix)
    (P/'timing.json').write_text(json.dumps({'durations':durations,'captions':caps,'total':cursor},indent=2))
    return durations,caps,cursor

if '--preview' in sys.argv:
    grid=Image.new('RGB',(W*2,H*3));
    for j,i in enumerate([0,2,3,5,6,7]):
        f=frame(i,4,8,'Your notes. Your pace.');f.save(P/f'preview-{i}.png');grid.paste(f,((j%2)*W,(j//2)*H))
    grid.resize((1600,1350)).save(P/'storyboard.png');print('Motion storyboard ready');sys.exit(0)
durations,caps,total=prepare_audio();assert 50<=total<=70,total
cursor=0;process=subprocess.Popen([FF,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(P/'motion.mp4')],stdin=subprocess.PIPE)
try:
    for i,dur in enumerate(durations):
        for k in range(round(dur*FPS)):
            t=k/FPS;clock=cursor+t;caption=next((s for left,right,s in caps if left<=clock<right),'');im=frame(i,t,dur,caption)
            if i<len(story)-1 and t>dur-.45:
                blend=smooth((t-(dur-.45))/.45);nextim=frame(i+1,.15,durations[i+1]);mask=Image.new('L',(W,H));md=ImageDraw.Draw(mask);edge=int(W*blend);md.polygon([(0,0),(edge+90,0),(edge-90,H),(0,H)],fill=255);im=Image.composite(nextim,im,mask);ImageDraw.Draw(im).line((edge+90,0,edge-90,H),fill=GOLD,width=5)
            process.stdin.write(im.tobytes())
        cursor+=dur;print(f'Motion scene {i+1}/{len(story)} rendered',flush=True)
finally:process.stdin.close()
assert process.wait()==0
def stamp(t):
    n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
(P/'Marginloom-Promo.srt').write_text('\n'.join(f'{j+1}\n{stamp(a)} --> {stamp(b)}\n{s}\n' for j,(a,b,s) in enumerate(caps)),encoding='utf8')
final=Path('output/Marginloom-Promo-Cinematic.mp4');subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(P/'motion.mp4'),'-i',str(P/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-metadata','title=Marginloom — Your notes. Your pace. Even offline.','-movflags','+faststart','-shortest',str(final)],check=True)
subprocess.run([FF,'-hide_banner','-loglevel','error','-i',str(final),'-f','null','-'],check=True)
print(json.dumps({'file':str(final),'seconds':round(total,2),'resolution':'1920x1080','fps':FPS,'audio_peak':round(float(np.max(np.abs(np.frombuffer(wave.open(str(P/'mix.wav')).readframes(99999999),dtype='<i2')))/32767),3)}))
