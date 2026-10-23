import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';

const N=16384,R=8,P=1,KEYLEN=64;
const derive=(password:string,salt:Buffer)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,KEYLEN,{N,r:R,p:P},(e,key)=>e?reject(e):resolve(key)));

// Parol scrypt bilan xeshlanadi: scrypt$N$tuz$xesh (base64)
export async function hashPassword(password:string){
  const salt=randomBytes(16);
  return `scrypt$${N}$${salt.toString('base64')}$${(await derive(password,salt)).toString('base64')}`;
}
export async function verifyPassword(password:string,stored:string|undefined|null){
  const [kind,n,salt,hash]=String(stored||'').split('$');
  if(kind!=='scrypt'||Number(n)!==N||!salt||!hash){await derive(password,Buffer.alloc(16));return false} // mavjud bo'lmagan hisobda ham bir xil vaqt
  const expected=Buffer.from(hash,'base64'),actual=await derive(password,Buffer.from(salt,'base64'));
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
// Login: 3–64 belgi; harf, raqam va . _ - @ + (email ham bo'laveradi). Kichik harfga keltiriladi.
export const normalizeLogin=(x:any)=>typeof x==='string'?x.trim().toLowerCase().slice(0,100):'';
export const loginOk=(x:string)=>/^[a-z0-9][a-z0-9._@+-]{1,62}[a-z0-9]$/.test(x);
export const LOGIN_HINT='Login 3–64 belgidan iborat bo‘lsin: harf, raqam va . _ - @ belgilari';
export const sha256=(value:string)=>createHash('sha256').update(value).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');

// Parol talabi: kamida 8 belgi; xato bo'lsa xabar qaytaradi
export function passwordError(password:any,email=''):string|null{
  if(typeof password!=='string'||password.length<8)return 'Parol kamida 8 belgidan iborat bo‘lsin';
  if(password.length>128)return 'Parol juda uzun';
  if(!password.trim())return 'Parol bo‘sh bo‘lmasin';
  if(email&&password.toLowerCase()===email.toLowerCase())return 'Parol email bilan bir xil bo‘lmasin';
  return null;
}
