/* RHub — Couche Données v0.3
 * Indépendant de index.html.
 * Mettre à jour index.html ne touche JAMAIS aux données stockées.
 * Clés localStorage : rhub_v · rhub_events · rhub_reminders · rhub_notes · rhub_feedback
 */
const _V='0.3',_K={v:'rhub_v',ev:'rhub_events',re:'rhub_reminders',no:'rhub_notes',fb:'rhub_feedback'};
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function _r(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}}
function _w(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){console.error('RHub DB:',e);return false;}}
function _dl(d=0,h=0){const n=new Date(Date.now()+d*86400000+h*3600000);return n.toISOString().slice(0,16);}

function dbInit(){
  if(!_r(_K.v,null)){
    _w(_K.v,_V);
    _w(_K.ev,[
      {id:uid(),title:'Stand-up équipe', start:_dl(0,1),end:_dl(0,2), calendar:'Pro',     color:'#4FC3F7',location:'Google Meet',source:'demo'},
      {id:uid(),title:'Déjeuner Paul',   start:_dl(0,4),end:_dl(0,5), calendar:'Perso',   color:'#A5D6A7',location:null,         source:'demo'},
      {id:uid(),title:'Réunion budget',  start:_dl(1,2),end:_dl(1,4), calendar:'Pro',     color:'#4FC3F7',location:null,         source:'demo'},
      {id:uid(),title:'Dîner famille',   start:_dl(2,7),end:_dl(2,9), calendar:'Familial',color:'#FFB74D',location:'Chez maman', source:'demo'},
    ]);
    _w(_K.re,[
      {id:uid(),title:'Appeler le médecin',        done:false,priority:'high',  due:_dl(0,2),source:'demo'},
      {id:uid(),title:'Payer facture EDF',          done:false,priority:'high',  due:_dl(1),  source:'demo'},
      {id:uid(),title:'Renouveler assurance auto',  done:false,priority:'medium',due:_dl(3),  source:'demo'},
      {id:uid(),title:'Acheter cadeau anniversaire',done:false,priority:'medium',due:_dl(5),  source:'demo'},
    ]);
    _w(_K.no,[
      {id:uid(),title:'Idées projet RHub', content:'Dashboard réorganisable\nDeeplinks apps\nWidget iOS',       date:Date.now(),         pinned:true, source:'demo'},
      {id:uid(),title:'Liste courses',     content:'Pain, lait, œufs\nFromage\nFruits\nVin rouge',              date:Date.now()-3600000, pinned:false,source:'demo'},
      {id:uid(),title:'Réunion — notes',   content:'Budget Q2 validé\nRecrutement en pause\nSprint vendredi',   date:Date.now()-86400000,pinned:false,source:'demo'},
    ]);
    _w(_K.fb,[]);
  }
}

const DB={
  events:   {get:()=>_r(_K.ev,[]),set:v=>_w(_K.ev,v)},
  reminders:{get:()=>_r(_K.re,[]),set:v=>_w(_K.re,v)},
  notes:    {get:()=>_r(_K.no,[]),set:v=>_w(_K.no,v)},
  feedback: {get:()=>_r(_K.fb,[]),set:v=>_w(_K.fb,v)},
};

function dbExport(){
  const p={_rhub:'0.3',_date:new Date().toISOString(),events:DB.events.get(),reminders:DB.reminders.get(),notes:DB.notes.get(),feedback:DB.feedback.get()};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));
  a.download=`rhub_${new Date().toISOString().slice(0,10)}.json`;a.click();
}
function dbImportJSON(file,ok,err){
  const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);if(!d._rhub)throw new Error('Fichier non reconnu');let n=0;
  if(d.events){DB.events.set(d.events);n+=d.events.length;}if(d.reminders){DB.reminders.set(d.reminders);n+=d.reminders.length;}
  if(d.notes){DB.notes.set(d.notes);n+=d.notes.length;}if(d.feedback)DB.feedback.set(d.feedback);ok(`✅ ${n} éléments restaurés`);}catch(x){err('❌ '+x.message);}};r.readAsText(file);
}
function dbImportICS(file,target,ok,err){
  const r=new FileReader();r.onload=e=>{try{
    const txt=e.target.result.replace(/\r\n[ \t]/g,'').replace(/\r/g,'');
    const evts=[],todos=[],lines=txt.split('\n');let inE=false,inT=false,cur={};
    function pd(l){const v=l.split(':').pop().trim().replace(/Z$/,'');if(v.length===8)return`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00`;if(v.length>=13)return`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}`;return null;}
    for(const raw of lines){const l=raw.trim();
      if(l==='BEGIN:VEVENT'){inE=true;cur={};continue;}if(l==='END:VEVENT'){inE=false;evts.push({id:uid(),title:cur.SUMMARY||'Sans titre',start:cur.DTSTART||null,end:cur.DTEND||null,location:cur.LOCATION||null,calendar:'Importé',color:'#CE93D8',source:'ics',uid:cur.UID||uid()});continue;}
      if(l==='BEGIN:VTODO'){inT=true;cur={};continue;}if(l==='END:VTODO'){inT=false;const p=parseInt(cur.PRIORITY||'5');todos.push({id:uid(),title:cur.SUMMARY||'Sans titre',done:(cur.STATUS||'').toUpperCase()==='COMPLETED',priority:p<=3?'high':p<=6?'medium':'low',due:cur.DUE||null,source:'ics',uid:cur.UID||uid()});continue;}
      if(!inE&&!inT)continue;const c=l.indexOf(':');if(c<0)continue;const k=l.slice(0,c).split(';')[0].toUpperCase();
      if(['DTSTART','DTEND','DUE'].includes(k))cur[k]=pd(raw);else cur[k]=l.slice(c+1).replace(/\\n/g,'\n').replace(/\\,/g,',');
    }
    let msg='';
    if(target==='calendar'&&evts.length>0){const ex=DB.events.get(),eu=new Set(ex.map(x=>x.uid).filter(Boolean)),nw=evts.filter(x=>!eu.has(x.uid));DB.events.set([...ex,...nw]);msg=`📅 ${nw.length} événement(s) importé(s)`;}
    if(target==='reminders'&&todos.length>0){const ex=DB.reminders.get(),eu=new Set(ex.map(x=>x.uid).filter(Boolean)),nw=todos.filter(x=>!eu.has(x.uid));DB.reminders.set([...ex,...nw]);msg=`🔔 ${nw.length} rappel(s) importé(s)`;}
    ok(msg||'⚠️ Aucune donnée trouvée');
  }catch(x){err('❌ '+x.message);}};r.readAsText(file);
}
function dbImportTxt(files,ok,err){
  Promise.all(Array.from(files).map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{const ls=e.target.result.split('\n').map(l=>l.trim()).filter(Boolean);res({id:uid(),title:(ls[0]||'').replace(/^#+\s*/,'').slice(0,80)||f.name.replace(/\.(txt|md)$/i,''),content:ls.slice(1).join('\n'),date:Date.now(),pinned:false,source:'apple-notes'});};r.onerror=rej;r.readAsText(f);})))
  .then(nw=>{DB.notes.set([...nw,...DB.notes.get()]);ok(`📝 ${nw.length} note(s) importée(s)`);}).catch(x=>err('❌ '+x.message));
}

/* Deep links vers apps natives iOS */
const DEEPLINKS={
  calendar: 'calshow://',          /* Apple Calendrier */
  reminders:'x-apple-reminder://', /* Apple Rappels    */
  outlook:  'ms-outlook://',       /* Microsoft Outlook */
  todo:     'ms-to-do://',         /* Microsoft To-Do  */
  notes:    'applenotes://',       /* Apple Notes      */
  mail:     'message://',          /* Apple Mail       */
};
function openApp(key){
  const url=DEEPLINKS[key];if(!url)return;
  window.location.href=url;
  /* Fallback App Store si l'app n'est pas installée */
  setTimeout(()=>{
    const stores={outlook:'https://apps.apple.com/app/id951937596',todo:'https://apps.apple.com/app/id1212616790'};
    if(stores[key])window.open(stores[key],'_blank');
  },1200);
}

window.RHubDB={init:dbInit,DB,uid,export:dbExport,importJSON:dbImportJSON,importICS:dbImportICS,importTxt:dbImportTxt,openApp,DEEPLINKS};
