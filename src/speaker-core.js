export const naturalVoices = [
  {id:'af_heart',name:'Heart · American English'},
  {id:'af_bella',name:'Bella · American English'},
  {id:'am_puck',name:'Puck · American English'},
  {id:'bf_emma',name:'Emma · British English'},
];
export function speechChunks(text) {
  const clean=String(text).replace(/\[\d+\]/g,'').replace(/[*#`]/g,'').trim();
  // Small phrases keep phoneme input below the model's token limit, even for
  // unusually long source sentences. Nothing is silently clipped.
  const words=clean.split(/\s+/).filter(Boolean),chunks=[];let current='';
  for(const word of words){
    if(current&&(current.length+word.length>180||/[.!?]$/.test(current))){chunks.push(current);current='';}
    // Break pathological unspaced tokens as well.
    for(let i=0;i<word.length;i+=180){const part=word.slice(i,i+180);if(current&&current.length+part.length>180){chunks.push(current);current='';}current+=(current?' ':'')+part;}
  }
  if(current)chunks.push(current);return chunks;
}
export function validSpeaker(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&['device',...naturalVoices.map(v=>v.id)].includes(value.voice)&&typeof value.deviceVoice==='string'&&value.deviceVoice.length<500&&typeof value.ready==='boolean';}
