/*
 * RHub — Couche Données v0.4
 * Séparée du code interface. Les mises à jour de index.html
 * ne touchent JAMAIS aux données localStorage.
 *
 * Clés : rhub_v · rhub_events · rhub_reminders · rhub_notes
 *        rhub_feedback · rhub_prefs · rhub_import_ts
 */
const _VER='0.4';
const _K={
  v:'rhub_v', ev:'rhub_events', re:'rhub_reminders',
  no:'rhub_notes', fb:'rhub_feedback',
  prefs:'rhub_prefs',   /* préférences UI (modes Perso/Pro/Les deux) */
  its:'rhub_import_ts', /* timestamps des derniers imports */
};

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function _r(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}}
function _w(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){console.error('RHub DB:',e);return false;}}
function _dl(d=0,h=0){const n=new Date(Date.now()+d*86400000+h*3600000);return n.toISOString().slice(0,16);}

/* ── Données démo ── */
function _initData(){
  _w(_K.v,_VER);
  _w(_K.ev,[
    {id:uid(),title:'Stand-up équipe', start:_dl(0,1), end:_dl(0,2), calendar:'Pro',     color:'#4FC3F7',location:'Google Meet',source:'outlook'},
    {id:uid(),title:'Déjeuner Paul',   start:_dl(0,4), end:_dl(0,5), calendar:'Perso',   color:'#A5D6A7',location:null,         source:'apple'},
    {id:uid(),title:'Réunion budget Q2',start:_dl(1,2),end:_dl(1,4), calendar:'Pro',     color:'#4FC3F7',location:null,         source:'outlook'},
    {id:uid(),title:'Dîner famille',   start:_dl(2,7), end:_dl(2,9), calendar:'Familial',color:'#FFB74D',location:'Chez maman', source:'apple'},
  ]);
  _w(_K.re,[
    {id:uid(),title:'Appeler le médecin',         done:false,priority:'high',  due:_dl(0,2),source:'apple'},
    {id:uid(),title:'Payer facture EDF',           done:false,priority:'high',  due:_dl(1),  source:'apple'},
    {id:uid(),title:'Finaliser specs API client',  done:false,priority:'high',  due:_dl(1),  source:'todo'},
    {id:uid(),title:'Renouveler assurance auto',   done:false,priority:'medium',due:_dl(3),  source:'apple'},
    {id:uid(),title:'Préparer présentation Q2',    done:false,priority:'medium',due:_dl(2),  source:'todo'},
    {id:uid(),title:'Acheter cadeau anniversaire', done:false,priority:'medium',due:_dl(5),  source:'apple'},
  ]);
  _w(_K.no,[
    {id:uid(),title:'Idées projet RHub', content:'Dashboard réorganisable\nDeeplinks apps\nWidget iOS',         date:Date.now(),          pinned:true, source:'manual'},
    {id:uid(),title:'Liste courses',     content:'Pain, lait, œufs\nFromage\nFruits\nVin rouge',               date:Date.now()-3600000,  pinned:false,source:'manual'},
    {id:uid(),title:'Réunion — notes',   content:'Budget Q2 validé\nRecrutement en pause\nSprint vendredi',    date:Date.now()-86400000, pinned:false,source:'manual'},
  ]);
  _w(_K.fb,[]);
  _w(_K.prefs,{calMode:'both',remMode:'both',mailMode:'both'});
  _w(_K.its,{calendar:null,reminders:null,mail:null,backup:null});
}

function dbInit(){
  if(!_r(_K.v,null)){_initData();}
  /* migration 0.3 → 0.4 : ajouter champs manquants */
  const prefs=_r(_K.prefs,null);
  if(!prefs){_w(_K.prefs,{calMode:'both',remMode:'both',mailMode:'both'});}
  const its=_r(_K.its,null);
  if(!its){_w(_K.its,{calendar:null,reminders:null,mail:null,backup:null});}
  /* s'assurer que source existe sur les événements et rappels */
  const evs=_r(_K.ev,[]);
  if(evs.length&&!evs[0].source){_w(_K.ev,evs.map(e=>({...e,source:e.source||'manual'})));}
  const res=_r(_K.re,[]);
  if(res.length&&!res[0].source){_w(_K.re,res.map(r=>({...r,source:r.source||'apple'})));}
}

/* ── Accesseurs ── */
const DB={
  events:   {get:()=>_r(_K.ev,[]),   set:v=>_w(_K.ev,v)},
  reminders:{get:()=>_r(_K.re,[]),   set:v=>_w(_K.re,v)},
  notes:    {get:()=>_r(_K.no,[]),   set:v=>_w(_K.no,v)},
  feedback: {get:()=>_r(_K.fb,[]),   set:v=>_w(_K.fb,v)},
  prefs:    {get:()=>_r(_K.prefs,{calMode:'both',remMode:'both',mailMode:'both'}), set:v=>_w(_K.prefs,v)},
  its:      {get:()=>_r(_K.its,{calendar:null,reminders:null,mail:null,backup:null}), set:v=>_w(_K.its,v)},
};

/* ── Timestamps import ── */
function tsSet(key){
  const its=DB.its.get();
  its[key]=new Date().toISOString();
  DB.its.set(its);
}
function tsFmt(key){
  const v=DB.its.get()[key];
  if(!v)return'Jamais importé';
  const d=new Date(v);
  return'Dernier import : '+d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

/* ── Export JSON ── */
function dbExport(){
  const p={_rhub:'0.4',_date:new Date().toISOString(),
    events:DB.events.get(),reminders:DB.reminders.get(),
    notes:DB.notes.get(),feedback:DB.feedback.get(),
    prefs:DB.prefs.get(),its:DB.its.get()};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));
  a.download=`rhub_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  tsSet('backup');
}

/* ── Import JSON ── */
function dbImportJSON(file,ok,err){
  const r=new FileReader();
  r.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(!d._rhub)throw new Error('Fichier non reconnu');
      let n=0;
      if(d.events){DB.events.set(d.events);n+=d.events.length;}
      if(d.reminders){DB.reminders.set(d.reminders);n+=d.reminders.length;}
      if(d.notes){DB.notes.set(d.notes);n+=d.notes.length;}
      if(d.feedback)DB.feedback.set(d.feedback);
      if(d.prefs)DB.prefs.set(d.prefs);
      if(d.its)DB.its.set(d.its);
      ok(`✅ ${n} éléments restaurés`);
    }catch(x){err('❌ '+x.message);}
  };
  r.readAsText(file);
}

/* ── Parseur ICS ── */
function _parseICS(txt){
  txt=txt.replace(/\r\n[ \t]/g,'').replace(/\r/g,'');
  const evts=[],todos=[],lines=txt.split('\n');
  let inE=false,inT=false,cur={};
  function pd(l){
    const v=l.split(':').pop().trim().replace(/Z$/,'');
    if(v.length===8)return`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00`;
    if(v.length>=13)return`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}`;
    return null;
  }
  for(const raw of lines){
    const l=raw.trim();
    if(l==='BEGIN:VEVENT'){inE=true;cur={};continue;}
    if(l==='END:VEVENT'){
      inE=false;
      evts.push({id:uid(),title:cur.SUMMARY||'Sans titre',start:cur.DTSTART||null,
        end:cur.DTEND||null,location:cur.LOCATION||null,
        calendar:'Importé',color:'#CE93D8',source:'ics',uid:cur.UID||uid()});
      continue;
    }
    if(l==='BEGIN:VTODO'){inT=true;cur={};continue;}
    if(l==='END:VTODO'){
      inT=false;
      const p=parseInt(cur.PRIORITY||'5');
      todos.push({id:uid(),title:cur.SUMMARY||'Sans titre',
        done:(cur.STATUS||'').toUpperCase()==='COMPLETED',
        priority:p<=3?'high':p<=6?'medium':'low',
        due:cur.DUE||null,source:'ics',uid:cur.UID||uid()});
      continue;
    }
    if(!inE&&!inT)continue;
    const c=l.indexOf(':');if(c<0)continue;
    const k=l.slice(0,c).split(';')[0].toUpperCase();
    if(['DTSTART','DTEND','DUE'].includes(k))cur[k]=pd(raw);
    else cur[k]=l.slice(c+1).replace(/\\n/g,'\n').replace(/\\,/g,',');
  }
  return{evts,todos};
}

/* ── Import ICS → Calendrier ── */
function dbImportICS(file,ok,err){
  const r=new FileReader();
  r.onload=e=>{
    try{
      const{evts}=_parseICS(e.target.result);
      if(!evts.length){ok('⚠️ Aucun événement trouvé');return;}
      const ex=DB.events.get(),eu=new Set(ex.map(x=>x.uid).filter(Boolean));
      const nw=evts.filter(x=>!eu.has(x.uid));
      DB.events.set([...ex,...nw]);
      tsSet('calendar');
      ok(`📅 ${nw.length} événement(s) importé(s)${evts.length-nw.length>0?` · ${evts.length-nw.length} doublon(s) ignoré(s)`:''}`);
    }catch(x){err('❌ '+x.message);}
  };
  r.readAsText(file);
}

/* ── Import ICS → Rappels ── */
function dbImportReminders(file,ok,err){
  const r=new FileReader();
  r.onload=e=>{
    try{
      const{todos}=_parseICS(e.target.result);
      if(!todos.length){ok('⚠️ Aucun rappel trouvé');return;}
      const ex=DB.reminders.get(),eu=new Set(ex.map(x=>x.uid).filter(Boolean));
      const nw=todos.filter(x=>!eu.has(x.uid));
      DB.reminders.set([...ex,...nw]);
      tsSet('reminders');
      ok(`🔔 ${nw.length} rappel(s) importé(s)${todos.length-nw.length>0?` · ${todos.length-nw.length} doublon(s)`:''}`);
    }catch(x){err('❌ '+x.message);}
  };
  r.readAsText(file);
}

/* ── Import Notes .txt/.md ── */
function dbImportNotes(files,ok,err){
  Promise.all(Array.from(files).map(f=>new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>{
      const ls=e.target.result.split('\n').map(l=>l.trim()).filter(Boolean);
      res({id:uid(),title:(ls[0]||'').replace(/^#+\s*/,'').slice(0,80)||f.name.replace(/\.(txt|md)$/i,''),
        content:ls.slice(1).join('\n'),date:Date.now(),pinned:false,source:'apple-notes'});
    };
    r.onerror=rej;r.readAsText(f);
  }))).then(nw=>{
    DB.notes.set([...nw,...DB.notes.get()]);
    ok(`📝 ${nw.length} note(s) importée(s)`);
  }).catch(x=>err('❌ '+x.message));
}

/* ── Import EML (session only) ── */
function parseEML(txt){
  const lines=txt.replace(/\r\n/g,'\n').split('\n');
  const h={};let bs=0;
  for(let i=0;i<lines.length;i++){
    if(!lines[i].trim()){bs=i+1;break;}
    const c=lines[i].indexOf(':');
    if(c>0)h[lines[i].slice(0,c).toLowerCase().trim()]=lines[i].slice(c+1).trim();
  }
  const body=lines.slice(bs).filter(l=>!l.startsWith('--')&&!l.startsWith('Content-'))
    .join('\n').replace(/<[^>]+>/g,'').trim().slice(0,200);
  const from=h['from']||'';
  const nm=from.match(/^"?([^"<]+)"?\s*</);
  const sender=nm?nm[1].trim():from.replace(/<.*>/,'').trim()||'Inconnu';
  const ini=sender.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  let tStr='Récent';
  try{const d=new Date(h['date']||'');if(!isNaN(d)){const s=(Date.now()-d)/1000;tStr=s<3600?`${Math.round(s/60)}min`:s<86400?`${Math.round(s/3600)}h`:`${Math.round(s/86400)}j`;}}catch{}
  return{id:uid(),sender,initials:ini,subject:h['subject']||'(sans objet)',
    preview:body.slice(0,120),time:tStr,read:false,account:'Pro',color:'#4FC3F7',source:'eml'};
}
function dbImportEML(files,ok,err){
  Promise.all(Array.from(files).map(f=>new Promise((res,rej)=>{
    const r=new FileReader();r.onload=e=>res(parseEML(e.target.result));r.onerror=rej;r.readAsText(f);
  }))).then(emails=>{tsSet('mail');ok(emails);}).catch(x=>err('❌ '+x.message));
}

window.RHubDB={init:dbInit,DB,uid,tsFmt,tsSet,
  export:dbExport,importJSON:dbImportJSON,
  importICS:dbImportICS,importReminders:dbImportReminders,
  importNotes:dbImportNotes,importEML:dbImportEML};
