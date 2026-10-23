// Hudud (lot) xaritasi modeli. Bu fayl frontend/lib/plot-model.ts bilan bir xil bo'lishi kerak.
export const plotStatuses=['unknown','planned','not-planned','listed','awaiting','pending','ready','sold','reserved'] as const;
export type PlotStatus=typeof plotStatuses[number];

export const plotStatusMeta:Record<PlotStatus,{label:string;color:string}>={
  unknown:{label:'Ma’lumot yo‘q',color:'#7b8f98'},
  planned:{label:'Kelajakda auksionga qo‘yiladi',color:'#f28c28'},
  'not-planned':{label:'Sotuvga qo‘yilmaydi',color:'#d94a43'},
  listed:{label:'Auksion e’lon qilingan',color:'#e0b81c'},
  awaiting:{label:'To‘lov kutilmoqda',color:'#009b9a'},
  pending:{label:'Auksion kutilmoqda',color:'#8b5cc7'},
  ready:{label:'Auksionga tayyor',color:'#3478d4'},
  sold:{label:'Sotilgan',color:'#2e9d5b'},
  reserved:{label:'Band qilingan',color:'#b86a5a'},
};

// Kategoriya kalitlari va ularni hudud vazifasi matnidan aniqlash qoidalari.
export const plotCategories:{key:string;label:string;color:string;pattern:RegExp}[]=[
  {key:'mixed',color:'#8b5cc7',label:'Aralash foydalanish',pattern:/aralash|смешан|mixed/i},
  {key:'residential',color:'#f28c28',label:'Turar-joy',pattern:/turar[- ]?joy|villa|kottej|xonadon|mahalla|жил|residential/i},
  {key:'retail',color:'#e04f5f',label:'Savdo',pattern:/savdo|mall|bozor|do.?kon|торг|retail/i},
  {key:'office',color:'#2f4b9b',label:'Ofis va boshqaruv',pattern:/ofis|ma.?muriy|vazirlik|офис|office/i},
  {key:'social',color:'#2e9d5b',label:'Ta’lim va tibbiyot',pattern:/ijtimoiy|maktab|bog.?cha|universitet|shifoxona|poliklinika|школ|больниц|school|hospital/i},
  {key:'hospitality',color:'#c04a8e',label:'Mehmonxona',pattern:/mehmonxona|restoran|гостин|hotel/i},
  {key:'culture',color:'#d6892b',label:'Madaniyat va dam olish',pattern:/madaniy|muzey|teatr|kutubxona|stadion|sport|ko.?ngilochar|культур|museum|stadium/i},
  {key:'industry',color:'#5b6b73',label:'Sanoat va logistika',pattern:/sanoat|logistika|ishlab chiqar|промышл|industr/i},
  {key:'infrastructure',color:'#1a9bb0',label:'Infratuzilma',pattern:/utilita|avtoturargoh|transport|stansiya|qozonxona|инфраструкт|infrastructure/i},
  {key:'green',color:'#7cb342',label:'Yashil hududlar',pattern:/yashil|park|ko.?chatxona|сквер|зелен|green/i},
  {key:'water',color:'#3b82f6',label:'Suv obyektlari',pattern:/^suv$|suv ob|водн|water/i},
  {key:'agriculture',color:'#8a9a2b',label:'Qishloq xo‘jaligi',pattern:/qishloq xo.?jaligi|сельск|agricult/i},
];

export function classifyPlot(...texts:(string|undefined|null)[]):string[]{
  const text=texts.filter(Boolean).join(' | ');
  return plotCategories.filter(c=>c.pattern.test(text)).map(c=>c.key);
}
