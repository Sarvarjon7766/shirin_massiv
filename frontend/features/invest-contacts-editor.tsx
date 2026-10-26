'use client';
import {useState} from 'react';
import {Plus,Trash2,Upload,Presentation,Phone,Send,Mail,Link2} from 'lucide-react';
import {useLocale} from './locale-provider';

// «Shiringa investitsiya kiriting» menyusi: taqdimot, telefon, Telegram, email va havolalar. Kontent menejer shu yerda kiritadi.
export type InvestContact={type:'presentation'|'phone'|'telegram'|'email'|'link';label:string;value:string};
const TYPES:{key:InvestContact['type'];label:string;hint:string}[]=[
  {key:'presentation',label:'Taqdimot (fayl)',hint:'PPTX yoki PDF yuklang'},
  {key:'phone',label:'Telefon',hint:'+998 90 123 45 67'},
  {key:'telegram',label:'Telegram',hint:'@foydalanuvchi yoki t.me/nom'},
  {key:'email',label:'Email',hint:'nom@domen.uz'},
  {key:'link',label:'Havola',hint:'https://… yoki /sahifa'}
];
export const InvestIcon=({type,size=17}:{type:string;size?:number})=>type==='presentation'?<Presentation size={size}/>:type==='phone'?<Phone size={size}/>:type==='telegram'?<Send size={size}/>:type==='email'?<Mail size={size}/>:<Link2 size={size}/>;

export default function InvestContactsEditor({value,onChange}:{value:InvestContact[];onChange:(v:InvestContact[])=>void}){
  const {t:tx}=useLocale();
  const [busy,setBusy]=useState(-1),[error,setError]=useState('');
  const set=(i:number,patch:Partial<InvestContact>)=>onChange(value.map((x,j)=>j===i?{...x,...patch}:x));
  async function upload(i:number,file?:File|null){
    if(!file)return;setError('');setBusy(i);
    try{
      const f=new FormData();f.append('file',file);
      const r=await fetch('/api/upload',{method:'POST',body:f});const v:any=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(v.error||'Yuklab bo‘lmadi');
      set(i,{value:v.url,label:value[i].label||String(v.name||file.name).replace(/\.[^.]+$/,'')});
    }catch(e:any){setError(e.message)}finally{setBusy(-1)}
  }
  return <section className="invest-editor">
    <h3>{tx('Investitsiya menyusi: taqdimot va aloqa')}</h3>
    <p className="muted">{tx('Saytning yuqoridagi «Shiringa investitsiya kiriting» tugmasi bosilganda shu qatorlar chiqadi: taqdimotni yuklab olish, telefon, Telegram. Hech narsa kiritilmasa, oddiy yo‘nalishlar ko‘rsatiladi.')}</p>
    {value.map((c,i)=><div className="invest-row" key={i}>
      <select value={c.type} onChange={e=>set(i,{type:e.target.value as InvestContact['type'],value:''})} aria-label={tx('Turi')}>{TYPES.map(t=><option key={t.key} value={t.key}>{tx(t.label)}</option>)}</select>
      <input value={c.label} maxLength={80} placeholder={tx('Yozuv (masalan: Investitsiya bo‘limi)')} onChange={e=>set(i,{label:e.target.value})}/>
      {c.type==='presentation'
        ?<span className="invest-file"><label className="upload-button"><Upload size={14}/> {tx(busy===i?'Yuklanmoqda…':c.value?'Almashtirish':'Fayl yuklash')}<input type="file" accept=".pptx,.ppt,.pdf,application/pdf" hidden disabled={busy===i} onChange={e=>upload(i,e.target.files?.[0])}/></label>{c.value&&<small className="muted">{c.value.split('/').pop()}</small>}</span>
        :<input value={c.value} maxLength={300} placeholder={TYPES.find(t=>t.key===c.type)?.hint} onChange={e=>set(i,{value:e.target.value})}/>}
      <button type="button" className="icon-btn" onClick={()=>onChange(value.filter((_,j)=>j!==i))} title={tx('Olib tashlash')}><Trash2 size={14}/></button>
    </div>)}
    {value.length<10&&<button type="button" className="btn outline small" onClick={()=>onChange([...value,{type:'phone',label:'',value:''}])}><Plus size={14}/> {tx('Qator qo‘shish')}</button>}
    {error&&<p role="alert" className="inline-error">{error}</p>}
  </section>;
}
