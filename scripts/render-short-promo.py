"""Motion-designed Marginloom product film, using genuine UI captures as footage."""
from pathlib import Path
import json, math, subprocess, sys, wave, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0,str(Path('.qa/video-tools').resolve()))
import imageio_ffmpeg
P=Path('output/promo-short');D=Path('output/demo');P.mkdir(exist_ok=True)
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
def frame(i,t,duration,caption=''):
    i=story[i]['scene']
    u=t/duration;enter=ease(t/.8);shift=(1-enter)*80;im=background(i,t);draw=ImageDraw.Draw(im)
    if i==0:
        im=Image.new('RGB',(W,H),GREEN);d=ImageDraw.Draw(im)
        d.ellipse((1150,-200,1750,500),outline='#32614f',width=2);d.ellipse((1000,-350,1900,650),outline='#32614f',width=2)
        section=min(2,int(u*3));hook=[['Quiz tomorrow.'],['Too many pages.'],['No signal.']][section];local=(u*3)%1
        text(im,(100,120),'THE STUDENT REALITY',22,SAGE,'bold');lines(im,(95,310+(1-ease(local*5))*60),hook,108,CREAM)
        if section==0:
            for k in range(4):
                x=1100+15*k;y=170+22*k;d.rounded_rectangle((x,y,x+210,y+280),radius=13,fill=['#f5f2e9','#dce6cb','#e4d6b6','#f5f2e9'][k]);d.line((x+30,y+55,x+170,y+55),fill=GREEN,width=3)
        elif section==1:
            for k in range(6):
                y=190+k*55;d.rounded_rectangle((1100+math.sin(t+k)*20,y,1440+math.sin(t+k)*20,y+34),radius=7,fill='#426b54')
        else:wifi(im,(1260,410),130,slash=True)
        text(im,(100,590),'Your study time shouldn’t depend on Wi-Fi.',32,SAGE)
    elif i==1:
        text(im,(80,122+shift),'Meet Marginloom.',84,GREEN,'serif');text(im,(85,239+shift),'A little progress. Anywhere.',32,'#607660')
        # Device reveal inspired by the reference's clear product introduction.
        screen_x,screen_y=590+12*math.sin(u),280+shift
        draw.rounded_rectangle((screen_x-13,screen_y-13,screen_x+863,screen_y+544),radius=24,fill='#26483a')
        card(im,'home',screen_x,screen_y,850)
        draw.polygon([(screen_x-13,screen_y+544),(screen_x+863,screen_y+544),(screen_x+905,screen_y+567),(screen_x-55,screen_y+567)],fill='#bcc8b4')
        draw.rounded_rectangle((screen_x+338,screen_y+545,screen_x+511,screen_y+553),radius=4,fill='#8d9f85')
        pill(im,(95,385),'YOUR NOTES',size=22);pill(im,(95,458),'YOUR DEVICE',size=22);pill(im,(95,531),'YOUR PACE',size=22)
        leaf(im,490,440,.55,t)
    elif i==2:
        lines(im,(80,147+shift),['Start with what','you already have.'],72)
        text(im,(85,335),'A lecture PDF. A chapter. Your notes.',28,'#607660')
        a=ease((u-.42)/.15)
        if a<1:card(im,'import',880+180*a,165+shift,460,rotate=-2+u*3)
        if a>0:card(im,'chat',610+480*(1-a),390+(1-a)*50,875,rotate=-1)
        for k,label in enumerate(['PDF','TXT','MARKDOWN']):pill(im,(85+k*145,430),label,size=19)
    elif i==3:
        lines(im,(80,140+shift),['Answers you','can check.'],78)
        text(im,(85,355),'Back to the page. Back to the passage.',27,'#607660')
        card(im,'source',655-25*u,175+shift,815,rotate=1.5-2*u)
        pill(im,(88,465),'ORIGINAL TEXT',size=21);pill(im,(88,530),'PAGE REFERENCES',size=21)
        if u>.35:
            # Highlight the actual Unicode evidence, rather than a generic pointer.
            left=725-25*u;top=487;right=left+600*ease((u-.35)/.18)
            wash=Image.new('RGBA',im.size);highlight=ImageDraw.Draw(wash);highlight.rounded_rectangle((left,top,right,top+27),radius=6,fill=(221,182,103,45),outline=(190,145,60,150),width=2);im=Image.alpha_composite(im.convert('RGBA'),wash).convert('RGB');draw=ImageDraw.Draw(im)
    elif i==4:
        lines(im,(80,143+shift),['Find what needs','another look.'],72)
        text(im,(85,350),'Practice. Understand. Revisit.',29,'#607660')
        card(im,'quiz',680-15*u,165+shift,770,rotate=-1)
        if u>.42:card(im,'feedback',490,550+(1-ease((u-.42)/.15))*220,960,rotate=.7)
        pill(im,(85,458),'MISTAKES BECOME YOUR NEXT STEP',size=17)
    elif i==5:
        text(im,(80,130+shift),'Learn it your way.',82,GREEN,'serif');text(im,(85,243+shift),'Same notes. A different rhythm.',31,'#607660')
        names=['Word Trail','Memory Match','Flashcards'];keys=['trail','memory','flash']
        for j,key in enumerate(keys):
            x=85+j*505;y=365+(1-ease((t-j*.2)/.75))*120+math.sin(t*1.2+j)*7
            card(im,key,x,y,445,rotate=[-3,1.5,-1][j]+math.sin(t*.7+j)*.6);pill(im,(x+20,y-55),names[j],size=22)
        for k,c in enumerate('LEARN'):
            y=710+(1-ease((t-k*.1)/.7))*60;draw.rounded_rectangle((600+k*78,y,659+k*78,y+58),radius=12,fill='#ead9ab');text(im,(630+k*78,y+28),c,29,GREEN,'bold',anchor='mm')
    elif i==6:
        lines(im,(80,147+shift),['A lesson you','can explore.'],76)
        text(im,(85,348),'Predict. Connect. Check the evidence.',27,'#607660')
        card(im,'graph',700-12*u,220+shift,795,rotate=-1.5+u*2)
        pill(im,(85,470),'FROM YOUR MATERIAL',size=22)
        text(im,(85,550),'Change x.',43,GREEN,'serif');text(im,(85,608),'Watch y.',43,GREEN,'serif')
    elif i==7:
        text(im,(80,145+shift),'Only fifteen minutes?',70,GREEN,'serif');text(im,(85,253+shift),'Give that time a purpose.',31,'#607660')
        cx,cy=300,520;draw.arc((cx-150,cy-150,cx+150,cy+150),-90,270,fill='#d8e2c8',width=13);draw.arc((cx-150,cy-150,cx+150,cy+150),-90,-90+300*ease(t/1.3),fill=GREEN,width=13);text(im,(cx,cy),'15:00',70,GREEN,'serif',anchor='mm')
        text(im,(cx,cy+75),'A GUIDED STUDY SESSION',17,'#607660',anchor='mm');card(im,'session',740-10*u,245+shift,655,rotate=1)
    elif i==8:
        lines(im,(80,143+shift),['Say it in','your own words.'],73)
        text(im,(85,352),'A conversation with your local tutor.',28,'#607660')
        # Decorative orb animation reflects the app's real voice-presence design.
        cx,cy=320,580;r=103+4*math.sin(t*3)
        for j in range(10,0,-1):draw.ellipse((cx-r-j*4,cy-r-j*4,cx+r+j*4,cy+r+j*4),outline='#dce5cd',width=2)
        draw.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#91ad82')
        for k in range(4):
            a=t*.8+k*.6;rx=r*(.6+.25*math.sin(a));draw.ellipse((cx-rx,cy-r,cx+rx,cy+r),outline=['#d7e6c3','#c0d2b1'][k%2],width=2)
        text(im,(cx,cy+155),'TEACH IT BACK',20,GREEN,'bold',anchor='mm');card(im,'teach',800,140+shift,595,rotate=-.5)
        if u>.5:card(im,'orb',690,610+(1-ease((u-.5)/.2))*150,680,rotate=.5)
    elif i==9:
        im=Image.new('RGB',(W,H),GREEN);draw=ImageDraw.Draw(im);text(im,(80,45),'Marginloom',29,CREAM,'serif')
        lines(im,(80,145+shift),['The cloud can','disappear.'],79,CREAM)
        text(im,(85,355),'Your study space stays.',39,SAGE,'serif');wifi(im,(310,590),95,slash=True)
        card(im,'offline',615-10*u,242+shift,900,rotate=1-u*2)
        pill(im,(645,175),'NEW ANSWER · NETWORK DISABLED',CREAM,'#3c6851',19)
        text(im,(650,746),'DOWNLOAD ONCE. RUN AI ON YOUR DEVICE.',21,SAGE,'bold')
    elif i==10:
        leaf(im,800,130,.48,t,color='#95aa80');text(im,(800,326+shift),'Marginloom',117,GREEN,'serif',anchor='mm')
        text(im,(800,451+shift),'Your notes. Your pace.',51,GREEN,'serif',anchor='mm');text(im,(800,532),'Even when the cloud disappears.',28,'#607660',anchor='mm')
        pill(im,(550,646),'BRING A CHAPTER. START WITH ONE QUESTION.',size=20)
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
    n=len(voice);music=np.zeros(n);sfx=np.zeros(n);bpm=96;beat=60/bpm;rng=np.random.default_rng(90)
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
                t=np.arange(int(.16*SR))/SR;kick=.08*np.sin(2*np.pi*(65*t+1.2*(1-np.exp(-t*28))))*np.exp(-t*22);add(music,kick,start);add(music,note(ch[0]-12,duration=1.5,gain=.075),start)
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
                blend=smooth((t-(dur-.45))/.45);nextim=frame(i+1,0,durations[i+1]);im=Image.blend(im,nextim,blend)
            process.stdin.write(im.tobytes())
        cursor+=dur;print(f'Motion scene {i+1}/{len(story)} rendered',flush=True)
finally:process.stdin.close()
assert process.wait()==0
def stamp(t):
    n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
(P/'Marginloom-Promo.srt').write_text('\n'.join(f'{j+1}\n{stamp(a)} --> {stamp(b)}\n{s}\n' for j,(a,b,s) in enumerate(caps)),encoding='utf8')
final=Path('output/Marginloom-Promo-60s.mp4');subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(P/'motion.mp4'),'-i',str(P/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-metadata','title=Marginloom — Your notes. Your pace. Even offline.','-movflags','+faststart','-shortest',str(final)],check=True)
subprocess.run([FF,'-hide_banner','-loglevel','error','-i',str(final),'-f','null','-'],check=True)
print(json.dumps({'file':str(final),'seconds':round(total,2),'resolution':'1920x1080','fps':FPS,'audio_peak':round(float(np.max(np.abs(np.frombuffer(wave.open(str(P/'mix.wav')).readframes(99999999),dtype='<i2')))/32767),3)}))
