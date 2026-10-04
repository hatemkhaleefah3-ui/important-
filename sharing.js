/* Public references, never browser-local IDs masquerading as shareable links. */
(()=>{
 const catalog={heart:'lectures/heart-drugs-pharmacology.json',carbs:'lectures/carbohydrate-biochemistry.json'};
 const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
 const url=id=>{const u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('l',id);return u.href};
 window.LectureLinks={
 async create(data){
  validateLecture(data);
  for(const [id,path] of Object.entries(catalog)){const r=await fetch(path+'?v=4.2.0');if(r.ok&&canonical(await r.json())===canonical(data))return url(id)}
  const r=await fetch('api/lectures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!r.ok){let message='Could not create a short link. Please retry.';try{message=(await r.json()).error||message}catch{}throw Error(message)}
  const saved=await r.json();if(!/^[a-f0-9]{24}$/.test(saved.id))throw Error('Invalid sharing response.');return url(saved.id);
 },
 async load(){
  const id=new URLSearchParams(location.search).get('l');if(!/^(heart|carbs|[a-f0-9]{24})$/.test(id||''))throw Error('Invalid lecture link.');
  const r=await fetch(catalog[id]?catalog[id]+'?v=4.2.0':'api/lectures/'+id);
  if(!r.ok)throw Error(r.status===404?'Lecture not found. The link may have been removed.':'Lecture storage is unavailable. Please retry.');
  const data=await r.json();validateLecture(data);return data;
 }};
})();
