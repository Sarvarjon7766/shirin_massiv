import {backendFetch} from '../../../lib/backend';
export const dynamic='force-dynamic';
// Barcha /api/* so'rovlari backend Worker'iga uzatiladi; ruxsatlar va ma'lumotlar backendda tekshiriladi.
async function proxy(req:Request){
  const url=new URL(req.url),write=req.method!=='GET'&&req.method!=='HEAD';
  const origin=req.headers.get('origin');
  if(write&&origin&&origin!==url.origin)return Response.json({error:'So‘rov manbasi mos emas'},{status:403});
  try{
    const res=await backendFetch(url.pathname+url.search,{method:req.method,from:req.headers,body:write?req.body:null,proto:url.protocol.replace(':','')});
    return new Response(req.method==='HEAD'?null:res.body,{status:res.status,headers:res.headers});
  }catch(e:any){console.error('Backend xatosi',e.message);return Response.json({error:'Server vaqtincha ishlamayapti'},{status:502})}
}
export const HEAD=proxy;export const GET=proxy;export const POST=proxy;export const PATCH=proxy;export const DELETE=proxy;
