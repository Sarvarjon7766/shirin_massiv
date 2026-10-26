'use client';
import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Sun,Moon,Monitor,Languages,ChevronDown,Check} from 'lucide-react';
import {languages,validLocale,translate,type Locale} from '../lib/i18n';
const Context=createContext<any>({locale:'uz',theme:'system',t:(v:any)=>v,settings:{},setConfig:()=>{}});
export const useLocale=()=>useContext(Context);
export function LocaleProvider({children,initialLocale='uz',initialSettings={}}:{children:React.ReactNode;initialLocale?:Locale;initialSettings?:any}){const [locale,setLocale]=useState<Locale>(initialLocale),[theme,setTheme]=useState('system'),[settings,setConfig]=useState(initialSettings);useEffect(()=>{try{setTheme(localStorage.getItem('shirin-theme')||initialSettings.defaultTheme||'system')}catch{}},[]);useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;document.documentElement.style.colorScheme=document.documentElement.dataset.theme||'light'};apply();media.addEventListener('change',apply);try{localStorage.setItem('shirin-theme',theme)}catch{}return()=>media.removeEventListener('change',apply)},[theme]);useEffect(()=>{document.documentElement.lang=locale==='zh'?'zh-Hans':locale;document.cookie='shirin-lang='+locale+'; Path=/; Max-Age=31536000; SameSite=Lax';},[locale]);const changeLanguage=(v:string)=>{const l=validLocale(v);setLocale(l);document.cookie='shirin-lang='+l+'; Path=/; Max-Age=31536000; SameSite=Lax';const url=new URL(window.location.href);url.searchParams.set('lang',l);window.history.replaceState(null,'',url)};return <Context.Provider value={{locale,setLocale:changeLanguage,theme,setTheme,settings,setConfig,t:(v:any)=>translate(v,locale,settings)}}>{children}</Context.Provider>}
// Til: ixcham menyu; mavzu: 3 holatli (yorug' / tizim / tungi) tugma guruhi
const shortLang:Record<string,string>={uz:'UZ','uz-Cyrl':'ЎЗ',ru:'RU',en:'EN',zh:'中文'};
const themes:[string,any,string][]=[['light',Sun,'Yorug‘'],['system',Monitor,'Tizim'],['dark',Moon,'Tungi']];
export function AppearanceControls(){
  const {locale,setLocale,theme,setTheme,t}=useLocale();
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);const timer=useRef<any>(0);const hover=(on:boolean)=>{if(typeof window==='undefined'||!window.matchMedia('(hover:hover)').matches)return;clearTimeout(timer.current);if(on)setOpen(true);else timer.current=setTimeout(()=>setOpen(false),220)};
  useEffect(()=>{
    if(!open)return;
    const onDown=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        const items=[...(root.current?.querySelectorAll<HTMLButtonElement>('.ac-menu button')||[])];if(!items.length)return;
        e.preventDefault();const i=items.indexOf(document.activeElement as HTMLButtonElement);
        items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
      }
    };
    document.addEventListener('mousedown',onDown);document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey)};
  },[open]);
  return <div className="appearance-controls">
    <div className="ac-lang" ref={root} onMouseEnter={()=>hover(true)} onMouseLeave={()=>hover(false)}>
      <button type="button" ref={trigger} className="ac-btn" aria-haspopup="menu" aria-expanded={open} aria-label={t('Til')+': '+(languages as any)[locale]} onClick={()=>setOpen(!open)}><Languages size={15}/><span>{shortLang[locale]||locale}</span><ChevronDown size={13} className={open?'ac-flip':''}/></button>
      {open&&<ul className="ac-menu" role="menu" aria-label={t('Til')}>{Object.entries(languages).map(([k,v])=><li key={k} role="none"><button type="button" role="menuitemradio" aria-checked={k===locale} onClick={()=>{setLocale(k);setOpen(false)}}><span>{v as string}</span>{k===locale&&<Check size={14}/>}</button></li>)}</ul>}
    </div>
    <div className="ac-theme" role="radiogroup" aria-label={t('Mavzu')}>{themes.map(([k,Icon,label])=><button type="button" key={k} role="radio" aria-checked={theme===k} className={theme===k?'on':''} title={t(label)} aria-label={t(label)} onClick={()=>setTheme(k)}><Icon size={15}/></button>)}</div>
  </div>}
