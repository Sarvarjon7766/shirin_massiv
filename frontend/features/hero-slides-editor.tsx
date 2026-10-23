'use client';
import {useRef,useState} from 'react';
import {Upload,Trash2,ArrowUp,ArrowDown,Film,Image as ImageIcon} from 'lucide-react';
import {useLocale} from './locale-provider';
import type {HeroSlide} from './hero-media';

// Admin → Sayt boshqaruvi → Rasmlar: bosh sahifa slayderi. Rasm, GIF yoki qisqa video (MP4/WEBM) qo'shiladi, tartibi o'zgartiriladi.
export default function HeroSlidesEditor({slides,interval,onChange}:{slides:HeroSlide[];interval:number;onChange:(s:HeroSlide[],interval:number)=>void}){
  const {t:tx}=useLocale();
  const [busy,setBusy]=useState(0),[error,setError]=useState(''),input=useRef<HTMLInputElement>(null);
  async function upload(files:FileList|null){
    if(!files?.length)return;setError('');const next=[...slides];
    for(const file of Array.from(files)){
      if(next.length>=10){setError(tx('Ko‘pi bilan 10 ta slayd'));break}
      setBusy(b=>b+1);
      try{const f=new FormData();f.append('file',file);const r=await fetch('/api/upload',{method:'POST',body:f});const v:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(v.error||'Yuklab bo‘lmadi');
        next.push({type:/^video\//.test(v.mime||file.type)?'video':'image',url:v.url,alt:''});onChange([...next],interval)}
      catch(e:any){setError(`${file.name}: ${e.message}`)}finally{setBusy(b=>b-1)}
    }
    if(input.current)input.current.value='';
  }
  const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=slides.length)return;const a=[...slides];[a[i],a[j]]=[a[j],a[i]];onChange(a,interval)};
  return <div className="hse">
    <h3>{tx('Bosh sahifa slayderi')}</h3>
    <p className="muted">{tx('Bosh sahifadagi katta blokka bir nechta rasm, GIF yoki qisqa video (ovozsiz) yuklang — ular o‘zi almashib turadi. Slayd qo‘shilmasa, quyidagi «Bosh sahifa katta rasmi» ishlatiladi.')}</p>
    {slides.length>0&&<ul className="hse-list">{slides.map((s,i)=><li key={s.url+i}>
      <span className="hse-thumb">{s.type==='video'?<video src={s.url} muted playsInline preload="metadata"/>:<img src={s.url} alt=""/>}</span>
      <span className="hse-main"><b>{s.type==='video'?<><Film size={14}/> {tx('Video')}</>:<><ImageIcon size={14}/> {tx('Rasm')}</>} · {i+1}</b>
        <input value={s.alt||''} maxLength={120} placeholder={tx('Tavsif (ko‘zi ojizlar uchun, ixtiyoriy)')} onChange={e=>onChange(slides.map((x,k)=>k===i?{...x,alt:e.target.value}:x),interval)}/></span>
      <button type="button" className="icon-btn" disabled={i===0} onClick={()=>move(i,-1)} title={tx('Yuqoriga')}><ArrowUp size={14}/></button>
      <button type="button" className="icon-btn" disabled={i===slides.length-1} onClick={()=>move(i,1)} title={tx('Pastga')}><ArrowDown size={14}/></button>
      <button type="button" className="icon-btn" onClick={()=>onChange(slides.filter((_,k)=>k!==i),interval)} title={tx('Olib tashlash')}><Trash2 size={14}/></button>
    </li>)}</ul>}
    <div className="hse-bar">
      <label className="upload-button"><Upload size={14}/> {tx(busy?'Yuklanmoqda…':'Rasm yoki video qo‘shish')}<input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" disabled={busy>0} onChange={e=>upload(e.target.files)}/></label>
      {slides.length>1&&<label className="hse-int">{tx('Almashish vaqti')}<select value={interval} onChange={e=>onChange(slides,Number(e.target.value))}>{[4,6,8,10,15].map(n=><option key={n} value={n}>{n} {tx('soniya')}</option>)}</select></label>}
    </div>
    <small className="muted">{tx('Video: MP4 yoki WEBM, 25 MB gacha, tovushsiz bo‘lishi ma’qul (ovozsiz o‘ynaydi). Rasm yoki GIF ham mumkin.')}</small>
    {error&&<p role="alert" className="inline-error">{error}</p>}
  </div>;
}
