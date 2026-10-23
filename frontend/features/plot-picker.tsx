'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Search,X,MapPin,ExternalLink,Pencil} from 'lucide-react';
import {useLocale} from './locale-provider';
import {plotStatusMeta} from '../lib/plot-model';

// Kontent formasida: xaritadagi tayyor hududlardan birini tanlab biriktirish (GeoJSON qo'lda yozilmaydi).
// Hududlar admin → «Xarita» bo'limida chiziladi yoki import qilinadi.
type PlotRow={id:string;lotNumber:string;title:string;areaHa:number;statusKey:string;published:boolean};

export default function PlotPicker({value,onChange}:{value:string;onChange:(id:string,plot?:PlotRow)=>void}){
  const {t:tx}=useLocale();
  const [rows,setRows]=useState<PlotRow[]|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false),[query,setQuery]=useState(''),box=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    fetch('/api/plots',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then((d:any)=>setRows(d)).catch(()=>setError(tx('Hududlar ro‘yxatini yuklab bo‘lmadi')));
  },[]);
  useEffect(()=>{
    if(!open)return;
    const onDown=(e:MouseEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false)};
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('mousedown',onDown);document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey)};
  },[open]);
  const current=rows?.find(r=>r.id===value);
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return (rows||[]).filter(r=>!q||[r.lotNumber,r.title].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,40);
  },[rows,query]);
  return <div className="pp" ref={box}>
    <span className="pp-label">{tx('Xarita hududi')}</span>
    {value?<div className="pp-current">
      <MapPin size={16}/>
      <div><b>{current?`${current.lotNumber?current.lotNumber+' · ':''}${current.title}`:tx('Tanlangan hudud')}</b>
        {current&&<small>{current.areaHa} {tx('ga')} · {tx(plotStatusMeta[current.statusKey as keyof typeof plotStatusMeta]?.label||current.statusKey)}{current.published?'':` · ${tx('qoralama')}`}</small>}</div>
      <a className="icon-btn" href={'/map?lot='+encodeURIComponent(value)} target="_blank" rel="noopener noreferrer" title={tx('Xaritada ochish')}><ExternalLink size={15}/></a>
      <button type="button" className="icon-btn" onClick={()=>setOpen(true)} title={tx('Boshqasini tanlash')}><Pencil size={15}/></button>
      <button type="button" className="icon-btn" onClick={()=>onChange('')} title={tx('Biriktirishni olib tashlash')}><X size={15}/></button>
    </div>:<button type="button" className="btn outline small pp-pick" onClick={()=>setOpen(true)}><MapPin size={14}/> {tx('Xaritadan hudud tanlash')}</button>}
    {open&&<div className="pp-pop" role="dialog" aria-label={tx('Hudud tanlash')}>
      <div className="pp-search"><Search size={15}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={tx('Raqam yoki nom bo‘yicha qidiring')}/></div>
      <ul>{rows===null&&!error&&<li className="pp-none">…</li>}{error&&<li className="pp-none">{error}</li>}
        {results.map(r=><li key={r.id}><button type="button" className={r.id===value?'on':''} onClick={()=>{onChange(r.id,r);setOpen(false)}}>
          <i style={{background:plotStatusMeta[r.statusKey as keyof typeof plotStatusMeta]?.color||'#999'}}/><span><b>{r.lotNumber||'—'}</b> {r.title}</span><small>{r.areaHa} {tx('ga')}</small></button></li>)}
        {rows&&!results.length&&<li className="pp-none">{rows.length?tx('Hech narsa topilmadi'):tx('Hali hudud yo‘q')}</li>}</ul>
      <p className="pp-foot">{tx('Kerakli hudud yo‘qmi?')} <a href="/admin/plots" target="_blank" rel="noopener noreferrer">{tx('Xaritada yangisini chizing')}</a></p>
    </div>}
    <p className="form-hint">{tx('Chegara endi qo‘lda yozilmaydi: hudud admin → «Xarita» bo‘limida xaritada chiziladi yoki GeoJSON fayldan import qilinadi, bu yerda esa tayyor hududni tanlaysiz. Ochiq sahifada «Xaritada ko‘rish» havolasi paydo bo‘ladi.')}</p>
  </div>;
}
