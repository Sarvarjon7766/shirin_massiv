import extra from './locales/extra.json';
import jj from './locales/part-j.json';
import a from './locales/part-a.json';
import b from './locales/part-b.json';
import c from './locales/part-c.json';
import d from './locales/part-d.json';
import e from './locales/part-e.json';
import f from './locales/part-f.json';
import g from './locales/part-g.json';
import h from './locales/part-h.json';
import ii from './locales/part-i.json';
export const languages={uz:'O‘zbekcha', 'uz-Cyrl':'Ўзбекча',ru:'Русский',en:'English',zh:'中文'};
export type Locale=keyof typeof languages;
export const localeCodes=Object.keys(languages) as Locale[];
export const validLocale=(v:any):Locale=>localeCodes.includes(v)?v:'uz';
export const dictionary:Record<string,Record<string,string>>={...a,...b,...c,...d,...e,...f,...g,...h,...ii,...jj,...extra};
const normalized=new Map(Object.entries(dictionary).map(([k,v])=>[normalize(k),v]));
export function normalize(s:string){return s.trim().replace(/\s+/g,' ').replace(/[‘’ʻʼ`]/g,"'").toLowerCase()}
export function cyrillic(s:string){const pairs:Record<string,string>={"o'":"ў","g'":"ғ",sh:'ш',ch:'ч',ng:'нг',yo:'ё',yu:'ю',ya:'я',ye:'е',ts:'ц'};const letters:Record<string,string>={a:'а',b:'б',d:'д',e:'е',f:'ф',g:'г',h:'ҳ',i:'и',j:'ж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'қ',r:'р',s:'с',t:'т',u:'у',v:'в',x:'х',y:'й',z:'з',"'":'ъ'};const convert=(m:string,lower:string,neighbourUpper=false)=>{const r=lower==="yo'"?"йў":lower==="e'"?'эъ':pairs[lower]||letters[lower]||m;if(m==="'")return neighbourUpper?r.toUpperCase():r;if(m===m.toLowerCase())return r;return m===m.toUpperCase()?r.toUpperCase():m[0]===m[0].toUpperCase()?r[0].toUpperCase()+r.slice(1):r};return s.replace(/[‘’ʻʼ`]/g,"'").replace(/yo'|e'|o'|g'|sh|ch|ng|yo|yu|ya|ye|ts|[a-z']/gi,(m,at:number,all:string)=>convert(m,m.toLowerCase(),/[A-Z]/.test(all[at-1]||'')&&/[A-Z]/.test(all[at+1]||'')))}
export function translate(text:any,locale:Locale,settings:any={}):any{if(Array.isArray(text))return text.map(x=>translate(x,locale,settings));if(typeof text!=='string'||!text.trim())return text;const key=text.trim(),custom=settings.translations?.[locale]?.[key];if(custom)return text.replace(key,custom);const original=settings.copy?.[key]||key;if(locale==='uz')return text.replace(key,original);if(locale==='uz-Cyrl'&&(/https?:|@|^[A-Z]{2,}-[0-9]/.test(key)))return text;if(locale==='uz-Cyrl')return text.replace(key,cyrillic(original));const entry=dictionary[key]||normalized.get(normalize(key));if(entry?.[locale])return text.replace(key,entry[locale]);if(key.includes('\n'))return text.split('\n').map(s=>translate(s,locale,settings)).join('\n');if(typeof window!=='undefined'&&/[A-Za-z\u0400-\u04FF]/.test(key)&&key.length>1)((window as any).__i18nMiss??=new Set<string>()).add(key);return text}
export const localizedFields=['title','summary','body','category','alt','beforeLabel','afterLabel','location','zone'] as const;
export function sanitizeTranslations(value:any){const out:any={};for(const lang of localeCodes){const src=value?.[lang];if(!src||typeof src!=='object'||Array.isArray(src))continue;const row:any={};for(const field of localizedFields)if(typeof src[field]==='string')row[field]=src[field].trim().slice(0,field==='body'?20000:field==='summary'?2000:300);out[lang]=row}return out}
export function localizeItem(item:any,locale:Locale,settings:any={}){const row=item.data?.i18n?.[locale]||{},result={...item,data:{...item.data}};for(const field of ['title','summary','body','category'])result[field]=row[field]||translate(item[field],locale,settings);for(const field of ['alt','beforeLabel','afterLabel','location','zone'])if(item.data?.[field])result.data[field]=row[field]||translate(item.data[field],locale,settings);return result}
export const siteTextFields=['title','tagline','about','address','organizationName','organizationType','registration','workingHours','reception','responsible','privacy','copyright','seoTitle','seoDescription'];
export function localizeSettings(settings:any,locale:Locale){const out={...settings};for(const k of siteTextFields)out[k]=settings.localizedSettings?.[locale]?.[k]||translate(settings[k],locale,settings);out.navigation=settings.navigation?.map((n:any)=>({...n,label:n.labels?.[locale]||translate(n.label,locale,settings)}));return out}
