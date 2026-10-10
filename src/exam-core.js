export const REMINDER_OPTIONS = [[null,'No reminder'],[0,'At quiz time'],[15,'15 minutes before'],[60,'1 hour before'],[1440,'1 day before'],[4320,'3 days before']];
export function examSchedule(date,time,reminderMinutes=60) {
  if(!/^\d{2}:\d{2}$/.test(time)||Number(time.slice(0,2))>23||Number(time.slice(3))>59)throw new Error('Choose a valid quiz time.');
  const starts=new Date(`${date}T${time}:00`);
  if(!Number.isFinite(starts.getTime())||starts.getHours()!==Number(time.slice(0,2))||starts.getMinutes()!==Number(time.slice(3)))throw new Error('This quiz time does not exist in your device time zone. Choose another time.');
  if(!REMINDER_OPTIONS.some(([minutes])=>minutes===reminderMinutes))throw new Error('Choose a valid reminder timing.');
  return {time,startsAt:starts.getTime(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,reminderMinutes,remindAt:reminderMinutes===null?null:starts.getTime()-reminderMinutes*60000};
}
export function reminderState(event,now=Date.now()) {
  if(event.completed||event.reminderDismissedAt||!Number.isFinite(event.startsAt)||!Number.isFinite(event.remindAt)||now<event.remindAt)return null;
  // Keep a missed reminder visible on return; never claim it was delivered while closed.
  return now>=event.startsAt?'past':'due';
}
export function examStatus(event,now=Date.now()) {
  if(!Number.isFinite(event.startsAt))return 'Time not set';
  const minutes=Math.ceil((event.startsAt-now)/60000);
  if(minutes<=0)return 'Quiz time passed';
  if(minutes<60)return `In ${minutes} min`;
  if(minutes<1440)return `In ${Math.ceil(minutes/60)} hours`;
  return `In ${Math.ceil(minutes/1440)} days`;
}
const utc=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
// RFC 5545 lines fold at 75 UTF-8 octets, including the continuation space.
function fold(line){const lines=[];let part='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){lines.push(part);part=' ';bytes=1;}part+=char;bytes+=size;}lines.push(part);return lines.join('\r\n');}
export function examCalendar(event,subject,now=Date.now()) {
  if(!Number.isFinite(event.startsAt))throw new Error('Set a quiz time before adding it to your device calendar.');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Marginloom//Quiz calendar//EN','BEGIN:VEVENT',`UID:${escape(event.id)}@marginloom`, `DTSTAMP:${utc(now)}`,`DTSTART:${utc(event.startsAt)}`,`SUMMARY:${escape(`${subject} — ${event.title}`)}`,'DESCRIPTION:Quiz planned in Marginloom. Check the time and notification settings in your calendar.'];
  if(Number.isFinite(event.remindAt))lines.push('BEGIN:VALARM',`TRIGGER:-PT${event.reminderMinutes}M`,'ACTION:DISPLAY',`DESCRIPTION:${escape(`Quiz reminder: ${event.title}`)}`,'END:VALARM');
  lines.push('END:VEVENT','END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
