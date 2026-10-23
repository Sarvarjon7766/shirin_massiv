import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {handle} from './api';
import {getDb,closeDb} from './db';
import {ensureOwner} from './auth/owner';

const secret=process.env.API_SHARED_SECRET||'';
const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';

function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function reply(res:http.ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body))}

const server=http.createServer(async(req,res)=>{
  try{
    if(!secret)return reply(res,503,{error:'API_SHARED_SECRET sozlanmagan'});
    if(!safeEqual(String(req.headers['x-internal-secret']||''),secret))return reply(res,401,{error:'Ruxsat yo‘q'});
    const url=new URL(req.url||'/','http://'+(req.headers.host||'localhost'));
    if(!url.pathname.startsWith('/api/'))return reply(res,404,{error:'Manzil topilmadi'});
    const headers=new Headers();
    for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(', '):v);
    const method=req.method||'GET',hasBody=method!=='GET'&&method!=='HEAD';
    const request=new Request(url,{method,headers,body:hasBody?Readable.toWeb(req) as any:undefined,duplex:'half'} as any);
    const response=await handle(request);
    const out:Record<string,string|string[]>={};
    response.headers.forEach((v,k)=>{if(k!=='set-cookie')out[k]=v});
    const cookies=response.headers.getSetCookie();if(cookies.length)out['set-cookie']=cookies;
    res.writeHead(response.status,out);
    if(response.body&&method!=='HEAD')Readable.fromWeb(response.body as any).on('error',()=>res.destroy()).pipe(res);else res.end();
  }catch(e:any){
    console.error('Server xatosi',e?.message);
    if(!res.headersSent)reply(res,500,{error:'Amal bajarilmadi. Qayta urinib ko‘ring.'});else res.destroy();
  }
});

await getDb();
await ensureOwner();
server.listen(port,host,()=>console.log(`Backend: http://${host}:${port}  (MongoDB: ${process.env.MONGODB_DB||'shirin'})`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{server.close();closeDb().finally(()=>process.exit(0))});
