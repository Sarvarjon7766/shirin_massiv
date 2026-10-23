import {col} from '../db';
import {hashPassword,passwordError} from './password';

// Birinchi superadmin: superadmin yo'q bo'lsa, .env dagi OWNER_LOGIN (yoki OWNER_EMAIL) / OWNER_PASSWORD (/ OWNER_NAME) bilan yaratiladi.
export async function ensureOwner(log:(m:string)=>void=console.log){
  const members=await col('members');
  if(await members.findOne({role:'superadmin'}))return;
  const email=(process.env.OWNER_LOGIN||process.env.OWNER_EMAIL||'').trim().toLowerCase(),password=process.env.OWNER_PASSWORD||'';
  if(!email||!password){log('Superadmin yo‘q. backend/.env ga OWNER_LOGIN va OWNER_PASSWORD yozib, serverni qayta ishga tushiring.');return}
  const pe=passwordError(password,email);
  if(pe){log('OWNER_PASSWORD yaroqsiz: '+pe);return}
  const passwordHash=await hashPassword(password),name=process.env.OWNER_NAME||'Superadmin';
  const existing=await members.findOne({email});
  if(existing)await members.updateOne({id:existing.id},{$set:{role:'superadmin',active:1,passwordHash}});
  else await members.insertOne({id:crypto.randomUUID(),user_id:null,email,name,role:'superadmin',active:1,created:new Date().toISOString(),passwordHash});
  log(`Superadmin yaratildi: ${email}`);
}
