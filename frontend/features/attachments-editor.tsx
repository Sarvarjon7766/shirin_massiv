'use client';
import {useRef,useState} from 'react';
import {Upload,Trash2,FileText,Presentation,Sheet,Paperclip} from 'lucide-react';
import {useLocale} from './locale-provider';

// Qo'shimcha fayllar: taqdimot (PPTX), PDF, Word, Excel. Material sahifasida «Qo'shimcha materiallar» bo'lib, yuklab olish uchun chiqadi.
export type Attachment={url:string;name:string;mime:string;size:number};
const ACCEPT='.pptx,.ppt,.pdf,.docx,.doc,.xlsx,.xls,application/pdf';
export const sizeText=(n:number)=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
export function fileKind(a:{mime?:string;name?:string}){
  const m=a.mime||'',n=(a.name||'').toLowerCase();
  if(/presentation|powerpoint/.test(m)||/\.pptx?$/.test(n))return 'ppt';
  if(m==='application/pdf'||/\.pdf$/.test(n))return 'pdf';
  if(/spreadsheet|excel/.test(m)||/\.xlsx?$/.test(n))return 'xls';
  return 'doc';
}
export const FileIcon=({a,size=18}:{a:{mime?:string;name?:string};size?:number})=>{const k=fileKind(a);return k==='ppt'?<Presentation size={size}/>:k==='xls'?<Sheet size={size}/>:k==='pdf'||k==='doc'?<FileText size={size}/>:<Paperclip size={size}/>};

export default function AttachmentsEditor({value,onChange}:{value:Attachment[];onChange:(v:Attachment[])=>void}){
  const {t:tx}=useLocale();
  const [busy,setBusy]=useState(0),[error,setError]=useState(''),input=useRef<HTMLInputElement>(null);
  async function upload(files:FileList|null){
    if(!files?.length)return;setError('');
    const next=[...value];
    for(const file of Array.from(files)){
      if(next.length>=12){setError(tx('Ko‘pi bilan 12 ta fayl biriktiriladi'));break}
      setBusy(b=>b+1);
      try{
        const f=new FormData();f.append('file',file);
        const r=await fetch('/api/upload',{method:'POST',body:f});const v:any=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(v.error||'Yuklab bo‘lmadi');
        next.push({url:v.url,name:v.name||file.name,mime:v.mime||file.type,size:v.size||file.size});onChange([...next]);
      }catch(e:any){setError(`${file.name}: ${e.message}`)}
      finally{setBusy(b=>b-1)}
    }
    if(input.current)input.current.value='';
  }
  return <div className="att">
    {value.length>0&&<ul className="att-list">{value.map((a,i)=><li key={a.url}><FileIcon a={a}/><span><b>{a.name}</b><small>{sizeText(a.size)}</small></span><button type="button" className="icon-btn" onClick={()=>onChange(value.filter((_,j)=>j!==i))} title={tx('Olib tashlash')}><Trash2 size={14}/></button></li>)}</ul>}
    <label className="upload-button att-up"><Upload size={14}/> {tx(busy?'Yuklanmoqda…':'Fayl qo‘shish (PPTX, PDF, DOCX, XLSX)')}<input ref={input} type="file" multiple accept={ACCEPT} disabled={busy>0} onChange={e=>upload(e.target.files)}/></label>
    <small className="muted">{tx('Taqdimot yoki hujjatni biriktiring: foydalanuvchilar uni material sahifasidan yuklab oladi. Bitta fayl — 100 MB gacha.')}</small>
    {error&&<p role="alert" className="inline-error">{error}</p>}
  </div>;
}
