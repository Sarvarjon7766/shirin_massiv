'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {useLocale} from './locale-provider';

// Bosh sahifa katta bloki: bir nechta rasm / qisqa video (ovozsiz, takrorlanadigan) / GIF — o'zi almashib turadi.
export type HeroSlide={type:'image'|'video';url:string;alt?:string};
export default function HeroMedia({slides,interval=6,alt}:{slides:HeroSlide[];interval?:number;alt:string}){
  const {t:tx}=useLocale();
  const [i,setI]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
  const refs=useRef<(HTMLVideoElement|null)[]>([]);
  const n=slides.length;
  useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');setReduced(m.matches);const f=()=>setReduced(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[]);
  const go=useCallback((d:number)=>setI(v=>(v+d+n)%n),[n]);
  useEffect(()=>{if(n<2||paused||reduced)return;const t=setInterval(()=>go(1),Math.max(3,interval)*1000);return()=>clearInterval(t)},[n,paused,reduced,interval,go]);
  // faqat ko'rinib turgan video o'ynaydi
  useEffect(()=>{refs.current.forEach((v,k)=>{if(!v)return;if(k===i&&!reduced){v.currentTime=0;v.play().catch(()=>{})}else v.pause()})},[i,reduced]);
  if(!n)return null;
  return <>
    <div className="hero-media" aria-roledescription={n>1?'carousel':undefined}>
      {slides.map((s,k)=><div key={s.url+k} className={'hero-slide'+(k===i?' on':'')} aria-hidden={k!==i}>
        {s.type==='video'
          ?<video ref={el=>{refs.current[k]=el}} src={s.url} muted loop playsInline preload={k===0?'auto':'metadata'} autoPlay={k===0&&!reduced} aria-label={s.alt||alt}/>
          :<img src={s.url} alt={k===i?(s.alt||alt):''} loading={k===0?'eager':'lazy'} decoding="async"/>}
      </div>)}
    </div>
    {n>1&&<div className="hero-ctrl" role="group" aria-label={tx('Slayder boshqaruvi')}>
      <button type="button" onClick={()=>go(-1)} aria-label={tx('Oldingisi')}><ChevronLeft size={18}/></button>
      <div className="hero-dots">{slides.map((_,k)=><button type="button" key={k} className={k===i?'on':''} onClick={()=>setI(k)} aria-label={`${tx('Slayd')} ${k+1}`} aria-current={k===i}/>)}</div>
      <button type="button" onClick={()=>go(1)} aria-label={tx('Keyingisi')}><ChevronRight size={18}/></button>
      <button type="button" onClick={()=>setPaused(p=>!p)} aria-label={tx(paused?'Davom ettirish':'To‘xtatish')} aria-pressed={paused}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>
    </div>}
  </>;
}
