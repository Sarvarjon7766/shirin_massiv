'use client';
import {useEffect,useRef,useState} from 'react';
import {LogIn,UserPlus,Eye,EyeOff,X,ShieldCheck} from 'lucide-react';
import {useLocale} from './locale-provider';

// Login + parol bilan kirish va (tashrifchilar uchun) ro'yxatdan o'tish. Sessiya HttpOnly cookie'da, backend beradi.
async function post(path:string,body:any){
  const res=await fetch('/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}

export function safeReturnTo(value:string|null|undefined){
  return value&&value.startsWith('/')&&!value.startsWith('//')&&!value.startsWith('/\\')?value:'/';
}
export async function logout(){
  try{await post('logout',{})}finally{window.location.assign('/')}
}

export function AuthPanel({allowRegister=false,onDone}:{allowRegister?:boolean;onDone:()=>void}){
  const {t:tx}=useLocale();
  const [mode,setMode]=useState<'login'|'register'>('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      if(mode==='login')await post('login',{login:email,password});
      else await post('register',{name,login:email,password});
      onDone();
    }catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <form className="auth-form" onSubmit={submit} noValidate={false}>
    {allowRegister&&<div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'on':''} onClick={()=>{setMode('login');setError('')}}><LogIn size={15}/> {tx('Kirish')}</button>
      <button type="button" role="tab" aria-selected={mode==='register'} className={mode==='register'?'on':''} onClick={()=>{setMode('register');setError('')}}><UserPlus size={15}/> {tx('Ro‘yxatdan o‘tish')}</button></div>}
    {mode==='register'&&<label>{tx('Ism va familiya')}<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={100}/></label>}
    <label>{tx('Login')}<input type="text" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={mode==='register'?3:1} maxLength={64}/></label>
    <label>{tx('Parol')}<span className="auth-pass"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='register'?8:1} maxLength={128}/>
      <button type="button" className="icon-btn" onClick={()=>setShow(!show)} title={tx(show?'Yashirish':'Ko‘rsatish')} aria-label={tx(show?'Parolni yashirish':'Parolni ko‘rsatish')}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></span></label>
    {mode==='register'&&<small className="auth-hint">{tx('Parol kamida 8 belgidan iborat bo‘lsin.')}</small>}
    {error&&<p className="auth-error" role="alert">{tx(error)}</p>}
    <button className="btn dark" disabled={busy}>{busy?'…':tx(mode==='login'?'Kirish':'Ro‘yxatdan o‘tish')}</button>
  </form>;
}

export function LoginPage({me,onDone}:{me:any;onDone:()=>void}){
  const {t:tx}=useLocale();
  const target=()=>safeReturnTo(new URLSearchParams(window.location.search).get('return_to'));
  if(me)return <div className="auth-card"><h1>{tx('Siz tizimga kirgansiz')}</h1><p>{me.name} · {me.email}</p>
    <div className="auth-row"><a className="btn dark" href={target()}>{tx('Davom etish')}</a><button className="btn outline" onClick={()=>logout()}>{tx('Hisobdan chiqish')}</button></div></div>;
  return <div className="auth-card"><h1>{tx('Hisobga kirish')}</h1><p>{tx('Murojaat yuborish va javoblarni kuzatish uchun hisobingiz bilan kiring yoki ro‘yxatdan o‘ting.')}</p>
    <AuthPanel allowRegister onDone={()=>{onDone();window.location.assign(target())}}/></div>;
}

// «Boshqaruv» tugmasi bosilganda ochiladigan kirish oynasi (xodimlar uchun)
export function LoginDialog({open,onClose}:{open:boolean;onClose:()=>void}){
  const {t:tx}=useLocale();
  const [denied,setDenied]=useState(''),box=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    setDenied('');
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')closeRef.current()};
    document.addEventListener('keydown',onKey);
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    setTimeout(()=>box.current?.querySelector('input')?.focus(),50);
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previous};
  },[open]);
  if(!open)return null;
  async function after(){
    try{
      const me:any=await fetch('/api/me',{cache:'no-store'}).then(r=>r.json());
      if(me.user&&me.user.role!=='visitor'){window.location.assign('/admin');return}
      setDenied(tx('Bu hisobda boshqaruv paneliga kirish huquqi yo‘q.'));
    }catch{window.location.assign('/admin')}
  }
  return <div className="login-dialog" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="login-dialog-card" ref={box} role="dialog" aria-modal="true" aria-label={tx('Boshqaruv paneliga kirish')}>
      <button className="icon-btn login-dialog-x" onClick={onClose} aria-label={tx('Yopish')} title={tx('Yopish')}><X size={18}/></button>
      <ShieldCheck size={34}/>
      <h2>{tx('Boshqaruv paneli')}</h2>
      <p>{tx('Xavfsiz kirish uchun login va parolingizni kiriting.')}</p>
      {denied?<><p className="auth-error" role="alert">{denied}</p><div className="auth-row"><button className="btn outline" onClick={()=>logout()}>{tx('Hisobdan chiqish')}</button><button className="btn dark" onClick={onClose}>{tx('Yopish')}</button></div></>
        :<AuthPanel onDone={after}/>}
      <small className="login-dialog-foot">{tx('Tashrifchimisiz?')} <a href="/login">{tx('Ro‘yxatdan o‘tish yoki kirish')}</a></small>
    </div>
  </div>;
}
