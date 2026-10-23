import {env} from 'cloudflare:workers';

// Sessiya cookie'si backendga uzatiladi; backend ruxsatni o'zi tekshiradi.
const PASS_HEADERS=['content-type','content-length','range','accept','if-none-match','cookie'];

export function backendFetch(path:string,init:{method?:string;from?:Headers;body?:BodyInit|null;proto?:string}={}){
  const base=env.BACKEND_URL,secret=env.BACKEND_SECRET;
  if(!base)throw new Error('BACKEND_URL sozlanmagan');if(!secret)throw new Error('BACKEND_SECRET sozlanmagan (frontend/.dev.vars)');
  const headers=new Headers({'x-internal-secret':secret});
  for(const name of PASS_HEADERS){const v=init.from?.get(name);if(v)headers.set(name,v)}
  if(init.proto)headers.set('x-forwarded-proto',init.proto);
  return fetch(new URL(path,base),{method:init.method||'GET',headers,body:init.body??undefined,...(init.body?{duplex:'half'}:{})} as RequestInit);
}
