'use client';
import {Check,ExternalLink,Map} from 'lucide-react';
import {useLocale} from './locale-provider';
import {MediaPicker} from './media-tools';
import ContentTranslations from './content-translations';
import LocationPicker from './location-picker';
import PlotPicker from './plot-picker';
import AttachmentsEditor,{type Attachment} from './attachments-editor';
import {kinds} from '../lib/data';

// Materialni qo'shish/tahrirlash formasi: tanlangan turga qarab faqat kerakli maydonlar ko'rinadi.
// Tartib: 1) Asosiy ma'lumot  2) Rasm  3) Tafsilotlar  4) Joylashuv  5) Qo'shimcha fayllar  6) Nashr.
type Recipe={one:string;title:string;summary:string;body?:string;image?:string;category?:string;categoryHint?:string;date?:string;location?:string;file?:string;progress?:boolean;area?:boolean;map?:boolean;answer?:boolean;noAttach?:boolean};
const R:Record<string,Recipe>={
  news:{one:'Yangilik',title:'Yangilik sarlavhasi',summary:'Qisqa mazmun (ro‘yxatda ko‘rinadi)',body:'To‘liq matn',image:'Asosiy rasm',category:'Mavzu',categoryHint:'Masalan: Qurilish, Investitsiya',date:'Yangilik sanasi'},
  events:{one:'Tadbir',title:'Tadbir nomi',summary:'Qisqa mazmun',body:'To‘liq matn',image:'Tadbir rasmi',category:'Turi',categoryHint:'Masalan: Taqdimot, Uchrashuv',date:'Tadbir sanasi',location:'O‘tkaziladigan joy'},
  projects:{one:'Loyiha',title:'Loyiha nomi',summary:'Qisqa tavsif',body:'To‘liq tavsif',image:'Loyiha rasmi',category:'Yo‘nalish',categoryHint:'Masalan: Turar-joy, Taʼlim',date:'Boshlangan sana',progress:true,area:true,map:true},
  infrastructure:{one:'Infratuzilma obyekti',title:'Obyekt nomi',summary:'Qisqa tavsif',body:'To‘liq tavsif',image:'Rasm',category:'Turi',categoryHint:'Masalan: Elektr, Suv, Yo‘l',progress:true,map:true},
  zones:{one:'Zona',title:'Zona nomi',summary:'Qisqa tavsif',body:'To‘liq tavsif',image:'Rasm',category:'Turi',area:true,map:true},
  documents:{one:'Hujjat',title:'Hujjat nomi',summary:'Qisqa izoh',body:'Batafsil matn (ixtiyoriy)',image:'Muqova rasmi (ixtiyoriy)',category:'Turi',categoryHint:'Masalan: Taqdimot, Reglament',file:'Asosiy hujjat fayli (PDF)'},
  reports:{one:'Hisobot',title:'Hisobot nomi',summary:'Qisqa izoh',body:'Batafsil matn (ixtiyoriy)',category:'Turi',date:'Hisobot sanasi',file:'Hisobot fayli (PDF)'},
  tenders:{one:'Tender',title:'Tender nomi',summary:'Shartlar (qisqacha)',body:'Batafsil shartlar',category:'Turi',date:'Takliflar muddati',file:'Tender hujjati (PDF)'},
  vacancies:{one:'Vakansiya',title:'Lavozim nomi',summary:'Talablar (qisqacha)',body:'Batafsil',category:'Bo‘lim',date:'Ariza muddati'},
  partners:{one:'Hamkor',title:'Hamkor nomi',summary:'Qisqa maʼlumot',body:'Batafsil (ixtiyoriy)',image:'Logotip yoki rasm',category:'Turi',categoryHint:'Masalan: Investor, Loyihachi'},
  photos:{one:'Foto',title:'Rasm sarlavhasi',summary:'Izoh',image:'Rasm',category:'Albom',categoryHint:'Masalan: Vizualizatsiya',noAttach:true},
  videos:{one:'Video',title:'Video nomi',summary:'Qisqa izoh',image:'Muqova rasmi',category:'Turi'},
  cameras:{one:'Jonli kamera',title:'Kamera nomi',summary:'Qisqa izoh',image:'Muqova rasmi',category:'Turi',noAttach:true},
  comparisons:{one:'«Hozir va kelajak»',title:'Sarlavha',summary:'Qisqa izoh',image:'Muqova rasmi',category:'Turi',noAttach:true},
  pages:{one:'Axborot sahifasi',title:'Sahifa nomi',summary:'Qisqa izoh',body:'Sahifa matni',image:'Rasm',category:'Bo‘lim'},
  leadership:{one:'Rahbar',title:'F.I.Sh.',summary:'Qabul vaqti va aloqa',body:'Qisqa tarjimai hol (ixtiyoriy)',image:'Surat',category:'Lavozim',noAttach:true},
  faqs:{one:'Savol-javob',title:'Savol',summary:'Javob',answer:true,noAttach:true},
  lots:{one:'Eski lot materiali',title:'Nomi',summary:'Qisqa tavsif',body:'To‘liq matn',image:'Rasm',category:'Turi',area:true,map:true},
};
const STAGES:Record<string,string>={planned:'Rejalashtirilgan',building:'Qurilmoqda',done:'Yakunlangan'};
const SKIP_KINDS=['lots'];

export const kindOne=(k:string)=>R[k]?.one||k;
export default function ContentForm({form,setForm,canPublish,assets,reload,busy,isNew,onSubmit,onCancel}:{form:any;setForm:(v:any)=>void;canPublish:boolean;assets:any[];reload:()=>void;busy:boolean;isNew:boolean;onSubmit:()=>void;onCancel:()=>void}){
  const {t:tx}=useLocale();
  const r:Recipe=R[form.kind]||R.news;
  const data=form.data||{};
  const setData=(patch:any)=>setForm({...form,data:{...data,...patch}});
  const text=(key:string,label:string,opts:{required?:boolean;hint?:string}={})=><label>{tx(label)}<input value={form[key]??''} required={opts.required} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={opts.hint?tx(opts.hint):undefined}/></label>;
  const area=(key:string,label:string,rows=4)=><label>{tx(label)}<textarea rows={rows} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
  const dInput=(key:string,label:string,type='text')=><label>{tx(label)}<input type={type} min={type==='number'?0:undefined} value={data[key]??''} onChange={e=>setData({[key]:type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value})}/></label>;
  const isVideo=form.kind==='videos'||form.kind==='cameras',isCmp=form.kind==='comparisons',isLot=form.kind==='lots';
  const hasDetails=r.date||r.location||r.progress||r.area||r.file||isVideo||isCmp||isLot;
  const attachments:Attachment[]=Array.isArray(data.attachments)?data.attachments:[];
  let step=0;const head=(t:string,hint?:string)=><div className="cf-head"><span className="cf-no">{++step}</span><div><h3>{tx(t)}</h3>{hint&&<p>{tx(hint)}</p>}</div></div>;
  return <form className="cf" onSubmit={e=>{e.preventDefault();onSubmit()}}>
    {isNew&&<label className="cf-kind">{tx('Nima qo‘shmoqchisiz?')}<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(kinds).filter(([k])=>!SKIP_KINDS.includes(k)).map(([k])=><option key={k} value={k}>{tx((R[k]?.one)||(kinds as any)[k])}</option>)}</select></label>}

    <section className="cf-sec">{head('Asosiy ma‘lumot')}
      {text('title',r.title,{required:true})}
      {r.answer?area('summary',r.summary,5):<>{area('summary',r.summary,3)}{r.body&&area('body',r.body,7)}</>}
      {r.category&&text('category',r.category,{hint:r.categoryHint})}
    </section>

    {r.image&&<section className="cf-sec">{head(r.image)}
      <MediaPicker value={form.image||''} label={tx('Rasm')} assets={assets} onChange={image=>setForm({...form,image})} onUploaded={reload}/>
      {form.image&&<img className="edit-image" src={form.image} alt={tx('Tanlangan rasm')}/>}
    </section>}

    {hasDetails&&<section className="cf-sec">{head('Tafsilotlar')}
      <div className="form-grid">
        {r.date&&dInput('date',r.date,'date')}
        {r.location&&dInput('location',r.location)}
        {r.area&&dInput('area','Maydon (gektar)','number')}
        {r.progress&&<><label>{tx('Holati')}<select value={data.stage||'planned'} onChange={e=>setData({stage:e.target.value})}>{Object.entries(STAGES).map(([k,v])=><option key={k} value={k}>{tx(v)}</option>)}</select></label>{dInput('progress','Bajarilganlik (%)','number')}</>}
      </div>
      {r.file&&<MediaPicker label={tx(r.file)} value={data.url||''} onChange={url=>setData({url})} assets={assets} accept="application/pdf" onUploaded={reload}/>}
      {isVideo&&<><label>{tx('Video turi')}<select value={data.streamType||(form.kind==='cameras'?'hls':'file')} onChange={e=>setData({streamType:e.target.value})}><option value="file">{tx('MP4 / WEBM fayl')}</option><option value="hls">{tx('HLS jonli efir (.m3u8)')}</option><option value="youtube">{tx('YouTube video / jonli efir')}</option></select></label>
        <MediaPicker label={tx(form.kind==='cameras'?'Efir manzili (HTTPS)':'Video fayl yoki HTTPS manzil')} value={data[form.kind==='cameras'?'sourceUrl':'videoUrl']||''} onChange={value=>setData({[form.kind==='cameras'?'sourceUrl':'videoUrl']:value,streamType:data.streamType||(form.kind==='cameras'?'hls':'file')})} assets={assets} accept="video/mp4,video/webm" onUploaded={reload}/>
        {form.kind==='cameras'&&dInput('location','Kamera joylashuvi')}
        {form.kind==='cameras'&&<p className="form-hint">{tx('RTSP kamera manzili to‘g‘ridan-to‘g‘ri brauzerda ochilmaydi. HLS yoki YouTube efir manzilini kiriting. Kamera login/parolini bu yerga yozmang.')}</p>}</>}
      {isCmp&&<><MediaPicker label={tx('Joriy holat surati')} value={data.beforeImage||''} onChange={beforeImage=>setData({beforeImage})} assets={assets} onUploaded={reload}/><MediaPicker label={tx('Kelajak ko‘rinishi')} value={data.afterImage||''} onChange={afterImage=>setData({afterImage})} assets={assets} onUploaded={reload}/><div className="form-grid">{dInput('beforeLabel','Joriy surat izohi')}{dInput('afterLabel','Kelajak rasmi izohi')}</div></>}
      {isLot&&<div className="form-grid">{dInput('investorName','Investor / kompaniya nomi')}{dInput('code','Kod')}{dInput('floors','Qavatlar','number')}</div>}
    </section>}

    {r.map&&<section className="cf-sec">{head('Xaritada ko‘rsatish','Joylashuv — xaritada ko‘rinadigan nuqta. Bog‘langan hudud — chegarasi chizilgan lot; kerak bo‘lsa ikkalasini ham belgilang.')}
      <div className="cf-map-links"><a className="btn outline small" href="/admin/maps" target="_blank" rel="noopener noreferrer"><Map size={14}/>{tx('Xarita sozlamalari')}<ExternalLink size={13}/></a><a className="btn outline small" href="/admin/plots" target="_blank" rel="noopener noreferrer"><Map size={14}/>{tx('Hududlarni chizish yoki import qilish')}<ExternalLink size={13}/></a></div>
      <LocationPicker lat={data.lat} lng={data.lng} onChange={(lat,lng)=>setData({lat,lng})}/>
      <PlotPicker label={tx('Loyiha yoki obyektni xaritadagi hududga bog‘lash')} value={data.plotId||''} onChange={(id,plot)=>setData({plotId:id,...(plot?{area:data.area||plot.areaHa||'',code:data.code||plot.lotNumber||''}:{})})}/>
    </section>}

    {!r.noAttach&&<section className="cf-sec">{head('Qo‘shimcha fayllar','Taqdimot (PPTX), PDF yoki hujjat: material sahifasida «Qo‘shimcha materiallar» bo‘lib chiqadi.')}
      <AttachmentsEditor value={attachments} onChange={v=>setData({attachments:v})}/>
    </section>}

    <section className="cf-sec">{head('Nashr')}
      <div className="cf-status" role="radiogroup" aria-label={tx('Nashr holati')}>
        {([['draft','Qoralama','Faqat boshqaruv xodimlari ko‘radi'],...(canPublish?[['published','Hozir nashr qilish','Saytda darhol chiqadi']]:[]),['review','Tasdiqlashga yuborish','Rahbar ko‘rib chiqadi']] as string[][]).map(([k,t,d])=><label key={k} className={'cf-opt'+(form.status===k?' on':'')}><input type="radio" name="status" checked={form.status===k} onChange={()=>setForm({...form,status:k})}/><b>{tx(t)}</b><small>{tx(d)}</small></label>)}
      </div>
      <details className="cf-more"><summary>{tx('Boshqa tillarga tarjima (ixtiyoriy)')}</summary><ContentTranslations form={form} onChange={setForm}/></details>
      {form.note&&<div className="info-note">{tx('Qaytarish izohi:')} {form.note}</div>}
    </section>

    <div className="modal-actions"><button type="button" className="btn outline" onClick={onCancel}>{tx('Bekor qilish')}</button><button className="btn dark" disabled={busy}>{tx(busy?'Saqlanmoqda...':'Saqlash')}<Check size={16}/></button></div>
  </form>;
}
