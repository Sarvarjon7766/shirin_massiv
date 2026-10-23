import {col} from '../db';
import {hashPassword,verifyPassword,passwordError,normalizeLogin,loginOk,LOGIN_HINT} from './password';
import {createSession,destroySession,destroyMemberSessions,clearCookie,readCookie,COOKIE} from './session';

const json=(v:any,status=200,cookie?:string)=>{
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(cookie)headers.append('Set-Cookie',cookie);
  return new Response(JSON.stringify(v),{status,headers});
};
const clean=(x:any,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';

// Parolni taxmin qilishdan himoya: bir emailga 15 daqiqada 5 ta muvaffaqiyatsiz urinish; ro'yxatdan o'tish soatiga 30 ta.
const failures=new Map<string,{count:number;until:number}>();
let registrations:number[]=[];
const MAX_FAILURES=5,LOCK_MS=15*60*1000;
const locked=(email:string)=>{const f=failures.get(email);return !!f&&f.count>=MAX_FAILURES&&f.until>Date.now()};
function fail(email:string){const f=failures.get(email),now=Date.now();failures.set(email,f&&f.until>now?{count:f.count+1,until:now+LOCK_MS}:{count:1,until:now+LOCK_MS})}
export const resetAuthLimits=()=>{failures.clear();registrations=[]};

const publicUser=(m:any)=>({userId:m.id,email:m.email,name:m.name,role:m.role,memberId:m.id});

export async function handleAuth(req:Request,path:string[],actor:any):Promise<Response|null>{
  const members=await col('members'),action=path[1];
  if(req.method!=='POST')return null;
  const b:any=await req.json().catch(()=>({}));
  const uid=()=>crypto.randomUUID(),now=()=>new Date().toISOString();

  if(action==='login'){
    const email=normalizeLogin(b.login??b.email),password=typeof b.password==='string'?b.password.slice(0,200):'';
    if(!email||!password)return json({error:'Login va parolni kiriting'},400);
    if(locked(email))return json({error:'Juda ko‘p noto‘g‘ri urinish. 15 daqiqadan keyin qayta urinib ko‘ring.'},429);
    const m=await members.findOne({email});
    const ok=await verifyPassword(password,m?.passwordHash);
    if(!m||!ok){fail(email);return json({error:'Login yoki parol noto‘g‘ri'},401)}
    if(!m.active)return json({error:'Hisob bloklangan. Administratorga murojaat qiling.'},403);
    failures.delete(email);
    return json({ok:true,user:publicUser(m)},200,await createSession(m.id,req));
  }
  if(action==='register'){
    const name=clean(b.name,100),email=normalizeLogin(b.login??b.email);
    if(name.length<2)return json({error:'Ismni kiriting'},400);
    if(!loginOk(email))return json({error:LOGIN_HINT},400);
    const pe=passwordError(b.password,email);if(pe)return json({error:pe},400);
    const hourAgo=Date.now()-3600000;registrations=registrations.filter(t=>t>hourAgo);
    if(registrations.length>=30)return json({error:'Ro‘yxatdan o‘tish vaqtincha cheklangan. Keyinroq urinib ko‘ring.'},429);
    if(await members.findOne({email}))return json({error:'Bu login band. Boshqa login tanlang yoki kiring.'},409);
    const m={id:uid(),user_id:null,email,name,role:'visitor',active:1,created:now(),passwordHash:await hashPassword(b.password)};
    await members.insertOne(m);registrations.push(Date.now());
    return json({ok:true,user:publicUser(m)},201,await createSession(m.id,req));
  }
  if(action==='logout'){
    await destroySession(req);
    return json({ok:true},200,clearCookie(req));
  }
  if(action==='password'){
    if(!actor)return json({error:'Kirish talab etiladi'},401);
    const m=await members.findOne({id:actor.memberId});
    if(!m||!(await verifyPassword(typeof b.current==='string'?b.current:'',m.passwordHash)))return json({error:'Joriy parol noto‘g‘ri'},400);
    const pe=passwordError(b.next,m.email);if(pe)return json({error:pe},400);
    await members.updateOne({id:m.id},{$set:{passwordHash:await hashPassword(b.next)}});
    await destroyMemberSessions(m.id,readCookie(req,COOKIE));
    return json({ok:true});
  }
  return null;
}
