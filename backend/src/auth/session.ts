import {col} from '../db';
import {newToken,sha256} from './password';
import {normalizeRole} from '../shared/permissions';

// Sessiya tokeni HttpOnly cookie'da; bazada faqat SHA-256 xeshi saqlanadi (sessions kolleksiyasi, TTL indeks).
export const COOKIE='shirin_session';
const TTL_MS=7*864e5;

const isSecure=(req:Request)=>req.headers.get('x-forwarded-proto')==='https';
export function readCookie(req:Request,name:string){
  for(const part of (req.headers.get('cookie')||'').split(';')){
    const i=part.indexOf('=');
    if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim();
  }
  return '';
}
const cookie=(value:string,maxAge:number,secure:boolean)=>`${COOKIE}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;
export const clearCookie=(req:Request)=>cookie('',0,isSecure(req));

export async function createSession(memberId:string,req:Request){
  const token=newToken(),now=Date.now();
  await (await col('sessions')).insertOne({id:sha256(token),memberId,created:new Date(now).toISOString(),expiresAt:new Date(now+TTL_MS)});
  return cookie(token,TTL_MS/1000,isSecure(req));
}
// Amaldagi foydalanuvchi: sessiya yaroqli va hisob faol bo'lsa
export async function sessionActor(req:Request){
  const token=readCookie(req,COOKIE);
  if(!token)return null;
  const session=await (await col('sessions')).findOne({id:sha256(token)});
  if(!session||session.expiresAt<new Date())return null;
  const m=await (await col('members')).findOne({id:session.memberId});
  if(!m||!m.active)return null;
  return {userId:m.id as string,email:m.email as string,name:m.name as string,role:normalizeRole(m.role),memberId:m.id as string};
}
export async function destroySession(req:Request){
  const token=readCookie(req,COOKIE);
  if(token)await (await col('sessions')).deleteOne({id:sha256(token)});
}
// Parol almashganda yoki hisob bloklanganda: (istisnodan tashqari) barcha sessiyalar bekor qilinadi
export async function destroyMemberSessions(memberId:string,exceptToken=''){
  await (await col('sessions')).deleteMany({memberId,...(exceptToken?{id:{$ne:sha256(exceptToken)}}:{})});
}
