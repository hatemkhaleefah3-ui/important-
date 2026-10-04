import {validateLecture} from '../../server/validation.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function onRequestPost({request,env}){
 if(!env.LECTURES||env.ALLOW_LECTURE_UPLOADS!=='true')return reply({error:'Custom short links need Cloudflare LECTURES storage and uploads enabled. Built-in heart and carbs links work without storage.'},503);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Same-origin request required.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Use application/json.'},415);
 // Bound the streamed body, including requests without Content-Length.
 const reader=request.body?.getReader();if(!reader)return reply({error:'Lecture JSON required.'},400);
 let chunks=[],size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>250000){await reader.cancel();return reply({error:'Use a file smaller than 250 KB.'},413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));validateLecture(data)}catch(error){return reply({error:'Invalid lecture: '+error.message},400)}
 const body=JSON.stringify(data);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
 const id=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
 try{if(!await env.LECTURES.get(id))await env.LECTURES.put(id,body);return reply({id},201)}catch{return reply({error:'Lecture storage is unavailable. Please retry.'},503)}
}
