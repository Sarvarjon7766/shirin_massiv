// Xarita sozlamalari (kontent menejer boshqaradi). Bu fayl frontend/lib/map-config.ts bilan bir xil bo'lishi kerak.
import {plotStatuses,plotCategories} from './plot-model';

export type StatusSetting={visible:boolean;label:string;color:string};
export const objectKinds=['projects','infrastructure','zones','lots'] as const;
export type CustomStatus={key:string;label:string;color:string;visible:boolean};
export type CategorySetting={key:string;label:string;color:string};
export type ObjectsConfig={visible:boolean;title:string;kinds:Record<string,StatusSetting>};
export type MapConfig={
  title:string;subtitle:string;backLabel:string;backHref:string;
  cta:{label:string;href:string;items:{label:string;href:string}[]};
  help:{title:string;text:string};
  statuses:Record<string,StatusSetting>;
  customStatuses:CustomStatus[];
  categories:CategorySetting[];
  colorBy:'status'|'category';
  showSearch:boolean;showStats:boolean;
  stats:{areaLabel:string;countLabel:string};
  investors:{visible:boolean;title:string;text:string;href:string};
  objects:ObjectsConfig;
  view:{lng:number;lat:number;zoom:number};
};

export const defaultMapConfig:MapConfig={
  title:'Hududlar xaritasi',subtitle:'',backLabel:'Bosh sahifa',backHref:'/',
  cta:{label:'',href:'',items:[]},
  help:{title:'Yo‘riqnoma',text:'Hududni bosing — parametrlari o‘ng tomonda ochiladi.\nChap yuqoridagi «Qidiruv va filtrlar» orqali raqam, nom yoki kompaniya bo‘yicha izlang.\nRang tepadagi holat tugmalarida tushuntirilgan; ularni bosib saralash mumkin.'},
  statuses:{},
  customStatuses:[],
  categories:plotCategories.map(c=>({key:c.key,label:c.label,color:c.color})),
  colorBy:'status',
  showSearch:true,showStats:true,
  stats:{areaLabel:'ga hududlar maydoni',countLabel:'ta hudud'},
  investors:{visible:false,title:'Investorlar va hamkorlar',text:'',href:'/partners'},
  objects:{visible:true,title:'Xaritadagi obyektlar',kinds:{}},
  view:{lng:67.0015,lat:39.7123,zoom:14},
};

const str=(x:any,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
const link=(x:any)=>{const v=str(x,300);return v&&((v.startsWith('/')&&!v.startsWith('//')&&!v.startsWith('/\\'))||/^https:\/\/[^\s]+$/.test(v))?v:''};
const hex=(x:any)=>typeof x==='string'&&/^#[0-9a-fA-F]{6}$/.test(x)?x.toLowerCase():'';
const num=(x:any,lo:number,hi:number,d:number)=>{const v=Number(x);return Number.isFinite(v)&&v>=lo&&v<=hi?v:d};

// Tugma menyusi: [{label, href}] (ko'pi bilan 8 ta); noto'g'ri havolali yoki nomsiz bandlar tashlab yuboriladi
const ctaItems=(x:any)=>Array.isArray(x)?x.slice(0,8).map(v=>({label:str(v?.label,60),href:link(v?.href)})).filter(v=>v.label&&v.href):[];

// Foydalanuvchi yuborgan sozlamani tekshirib, to'liq (default bilan to'ldirilgan) ko'rinishga keltiradi
export function sanitizeMapConfig(input:any,base:MapConfig=defaultMapConfig):MapConfig{
  const i=input&&typeof input==='object'?input:{},d=base;
  const statuses:Record<string,StatusSetting>={};
  for(const k of plotStatuses){
    const s=i.statuses?.[k],prev=d.statuses[k];
    if(s&&typeof s==='object')statuses[k]={visible:s.visible!==false,label:str(s.label,60),color:hex(s.color)};
    else if(prev)statuses[k]=prev;
  }
  const customStatuses:CustomStatus[]=[],seen=new Set<string>();
  const rawCustom=Array.isArray(i.customStatuses)?i.customStatuses:d.customStatuses;
  for(const s of rawCustom.slice(0,40)){
    const key=str(s?.key,16),label=str(s?.label,60);
    if(!/^c-[a-z0-9]{3,12}$/.test(key)||!label||seen.has(key)||customStatuses.length>=20)continue;
    seen.add(key);customStatuses.push({key,label,color:hex(s.color)||'#7b8f98',visible:s.visible!==false});
  }
  const categories:CategorySetting[]=[],seenCat=new Set<string>();
  const rawCats=Array.isArray(i.categories)?i.categories:d.categories;
  for(const c of rawCats.slice(0,80)){
    const key=str(c?.key,30),label=str(c?.label,60);
    if(!/^[a-z0-9-]{2,30}$/.test(key)||!label||seenCat.has(key)||categories.length>=40)continue;
    seenCat.add(key);categories.push({key,label,color:hex(c.color)||'#7b8f98'});
  }
  const kinds:Record<string,StatusSetting>={};
  for(const k of objectKinds){
    const s=i.objects?.kinds?.[k],prev=d.objects.kinds[k];
    if(s&&typeof s==='object')kinds[k]={visible:s.visible!==false,label:str(s.label,60),color:hex(s.color)};
    else if(prev)kinds[k]=prev;
  }
  return {
    title:str(i.title??d.title,100)||defaultMapConfig.title,
    subtitle:str(i.subtitle??d.subtitle,200),
    backLabel:str(i.backLabel??d.backLabel,40)||defaultMapConfig.backLabel,
    backHref:link(i.backHref??d.backHref)||'/',
    cta:{label:str(i.cta?.label??d.cta.label,60),href:link(i.cta?.href??d.cta.href),items:ctaItems(i.cta?.items??d.cta.items)},
    help:{title:str(i.help?.title??d.help.title,60)||defaultMapConfig.help.title,text:str(i.help?.text??d.help.text,1500)},
    statuses,customStatuses,categories,
    colorBy:(i.colorBy??d.colorBy)==='category'?'category':'status',
    showSearch:(i.showSearch??d.showSearch)!==false,
    showStats:(i.showStats??d.showStats)!==false,
    stats:{areaLabel:str(i.stats?.areaLabel??d.stats.areaLabel,60),countLabel:str(i.stats?.countLabel??d.stats.countLabel,60)},
    investors:{visible:(i.investors?.visible??d.investors.visible)===true,title:str(i.investors?.title??d.investors.title,80),text:str(i.investors?.text??d.investors.text,160),href:link(i.investors?.href??d.investors.href)||'/partners'},
    objects:{visible:(i.objects?.visible??d.objects.visible)!==false,title:str(i.objects?.title??d.objects.title,80)||defaultMapConfig.objects.title,kinds},
    view:{lng:num(i.view?.lng??d.view.lng,-180,180,d.view.lng),lat:num(i.view?.lat??d.view.lat,-85,85,d.view.lat),zoom:num(i.view?.zoom??d.view.zoom,1,19,d.view.zoom)},
  };
}
