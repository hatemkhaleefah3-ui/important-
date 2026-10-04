export async function onRequestGet({params,env}){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!/^[a-f0-9]{24}$/.test(params.id))return new Response('{"error":"Invalid ID."}',{status:400,headers});
 if(!env.LECTURES)return new Response('{"error":"Storage unavailable."}',{status:503,headers});
 try{const body=await env.LECTURES.get(params.id);return new Response(body||'{"error":"Not found."}',{status:body?200:404,headers})}catch{return new Response('{"error":"Storage unavailable."}',{status:503,headers})}
}
