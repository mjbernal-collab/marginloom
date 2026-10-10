// Group confirmed subject labels; never infer equivalence between different courses.
export const subjectKey = label => label.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function subjectGroups(documents){
  const groups=new Map();
  for(const doc of documents){
    const confirmed=doc.subjectConfirmed&&doc.subject?.trim();
    const key=confirmed?`subject:${subjectKey(doc.subject)}`:'unassigned';
    if(!groups.has(key))groups.set(key,{id:key,label:confirmed?doc.subject.trim().replace(/\s+/g,' '):'Unassigned',documents:[],confirmed:!!confirmed});
    groups.get(key).documents.push(doc);
  }
  return [...groups.values()].sort((a,b)=>a.id==='unassigned'?1:b.id==='unassigned'?-1:a.label.localeCompare(b.label));
}
export function documentScope(doc){return doc.subjectConfirmed&&doc.subject?.trim()?`subject:${subjectKey(doc.subject)}`:`document:${doc.id}`;}
export function scopedDocuments(documents,scope){
  if(scope==='all')return documents;
  if(scope.startsWith('subject:'))return subjectGroups(documents).find(g=>g.id===scope)?.documents||[];
  return documents.filter(d=>d.id===(scope.startsWith('document:')?scope.slice(9):scope));
}
