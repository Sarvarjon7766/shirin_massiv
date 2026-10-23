// «shirin_malumotlar» papkasidagi haqiqiy ma'lumotlarni (maʼlumotnoma, taqdimot, SNOS jadvali, rasmlar) saytga kiritadi.
// Ishga tushirish:  npm run import:shirin          (qayta ishga tushirilsa, o'zining yozuvlarini yangilaydi)
//                   npm run import:shirin -- --reset   (avval faqat shu skript kiritgan yozuvlarni o'chiradi)
// Manba hujjatlar: Маълумотнома Ширин 24.09.2026.docx, Вил_хок_Ширин_СНОС…docx, Презентация_Ширин…pptx, malumot.txt.
// Mock yozuvlarga (`mock-`) tegmaydi. Rasmlar: shirin_malumotlar/_prepared (kichraytirilgan nusxalar).
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {col,filesBucket,closeDb} from '../src/db';
import {sanitizeConfig} from '../src/shared/site-config';

const AUTHOR='shirin-import';
const DIR=process.env.SHIRIN_DATA_DIR||path.resolve(process.cwd(),'../shirin_malumotlar/_prepared');
const reset=process.argv.includes('--reset');
const stamp=new Date().toISOString();
const uid=()=>crypto.randomUUID();

// ---------- Rasmlar (GridFS + assets) ----------
const IMAGES:Record<string,string>={
  plan:'bosh-reja-chizma.jpg',boundary:'yer-ajratilgan-hududlar-xaritasi.jpg',location:'joylashuv-xaritasi.jpg',
  overview:'shirin-umumiy-korinish.jpg',square:'mamuriy-markaz-markaziy-maydon.jpg',riverTop:'qirgoq-boyi-yuqoridan.jpg',
  promenade:'qirgoq-boyi-promenad.jpg',housing:'turar-joy-mavzesi.jpg',fountain:'mamuriy-markaz-fontanli-maydon.jpg',
  adminRiver:'mamuriy-markaz-qirgoq.jpg',adminBuilding:'mamuriy-markaz-bino.jpg',
};
const NAMES:Record<string,string>={
  plan:'Bosh reja va batafsil rejalashtirish loyihasi (chizma)',boundary:'Yer ajratilgan hududlar xaritasi',location:'Shirin shaharchasining joylashuvi',
  overview:'Shirin massivi: umumiy ko‘rinish (vizualizatsiya)',square:'Maʼmuriy markaz: markaziy maydon',riverTop:'Zarafshon qirg‘og‘i: yuqoridan ko‘rinish',
  promenade:'Zarafshon qirg‘og‘i: piyodalar promenadi',housing:'Turar-joy mavzesi (vizualizatsiya)',fountain:'Maʼmuriy markaz: favvorali maydon',
  adminRiver:'Maʼmuriy markaz va qirg‘oq bo‘yi',adminBuilding:'Viloyat maʼmuriy markazi: bosh bino',
};
const assets=await col('assets');
const url:Record<string,string>={};
async function upload(key:string){
  const file=IMAGES[key],p=path.join(DIR,file),name='shirin:'+file;
  const old=await assets.findOne({name});
  if(old){url[key]='/api/files/'+old.id;return}
  if(!fs.existsSync(p))throw new Error('Rasm topilmadi: '+p);
  const id=uid(),bucket=await filesBucket(),sink=bucket.openUploadStream('media/'+id+'.jpg',{contentType:'image/jpeg'});
  await pipeline(Readable.from(fs.readFileSync(p)),sink);
  await assets.insertOne({id,key:'media/'+id+'.jpg',name,mime:'image/jpeg',size:fs.statSync(p).size,author:AUTHOR,created:stamp});
  url[key]='/api/files/'+id;
}

async function removeAll(){
  await (await col('content')).deleteMany({author:AUTHOR});
  const bucket=await filesBucket();
  for(const a of await assets.find({author:AUTHOR}).toArray()){const f=await bucket.find({filename:a.key}).next();if(f)await bucket.delete(f._id);await assets.deleteOne({id:a.id})}
  console.log('Avvalgi import o‘chirildi');
}
if(reset)await removeAll();
for(const k of Object.keys(IMAGES))await upload(k);

// ---------- Kontent ----------
type C={id:string;kind:string;title:string;summary:string;body:string;image?:string;category:string;data?:any};
const items:C[]=[];
const add=(c:C)=>items.push(c);
const P=(...lines:string[])=>lines.join('\n');

// Sahifalar
add({id:'shirin-about',kind:'pages',title:'Shirin shaharchasi haqida',category:'Loyiha',image:url.overview,
  summary:'Samarqand shimolida, Zarafshon bo‘yida 665,1 gektar maydonda barpo etilayotgan zamonaviy ishbilarmonlik markazi va turar joylar kompleksi.',
  body:P(
  'O‘zbekiston Respublikasi Prezidentining 2023-yil 20-iyuldagi PQ-233-son qaroriga asosan Samarqand shahridagi «Shirin» massivi hududida zamonaviy ishbilarmonlik markazi va turar joylar kompleksi (Shaharcha) qurilishi boshlandi. Samarqand viloyati hokimligi huzurida davlat muassasasi shaklida «Shirin» zamonaviy ishbilarmonlik markazi va turar joylar kompleksini barpo etish direksiyasi tashkil etilgan.',
  'Shaharcha Samarqandning shimoliy qismida, xalqaro yo‘l va aeroport yaqinida joylashgan. Umumiy maydoni — 665,1 gektar. Zarafshon daryosi bo‘ylab 9,7 km qirg‘oq chizig‘i bor.',
  'Bosh reja bo‘yicha Shaharchada 180 ming aholi uchun qulay sharoit va 60 ming yangi ish o‘rni yaratish, arxitektura zichligini 25 foiz darajasida saqlash rejalashtirilgan.',
  '2026-yil 31-martdagi 134-son qarorga asosan Shaharcha «Business city» zamonaviy ishbilarmonlik markazlari ro‘yxatiga kiritilgan.',
  'Hududiy chegaralar: Samarqand shahri, Samarqand va Oqdaryo tumanlari maʼmuriy-hududiy chegaralarini o‘zgartirish loyihasi doirasida Samarqand tumanidan 170 gektar va Oqdaryo tumanidan 243 gektar Samarqand shahri tarkibiga o‘tkazilishi nazarda tutilgan; bu O‘zbekiston Respublikasi Oliy Majlisi Senatining 2025-yil 22-fevraldagi SQ-85-V-son qarori bilan tasdiqlangan.',
  'Bosh reja va qurilish hamda infratuzilma obyektlari loyihalarini ishlab chiqish «O‘zshaharsozlikLITI» DM zimmasiga yuklangan. Zamonaviy talablar va xorijiy tajribadan foydalanish uchun xorijiy loyiha institutlari ishtirokida tanlov o‘tkazilgan: 5 ta xorijiy kompaniya taklif bergan, yaponiyalik «SAKO Architects» taklifi maʼqul topilgan va hozirda bosh reja shu institut bilan hamkorlikda tayyorlanmoqda.',
  'Asosiy maqsad: 180 000 aholi uchun inson uchun qulay, xavfsiz, ekologik barqaror va iqtisodiy faol muhit yaratish. Bu faqat uy-joy qurish emas — uy-joy, taʼlim, tibbiyot, ish o‘rni, transport, ekologiya, xavfsizlik, dam olish va raqamli xizmatlarni yagona shahar muhitiga birlashtirishdir.')});

add({id:'shirin-masterplan',kind:'pages',title:'Bosh reja ko‘rsatkichlari',category:'Bosh reja',image:url.plan,
  summary:'665 gektar maydonning taqsimoti, aholi sig‘imi va muhandislik yechimlari.',
  body:P(
  'Umumiy maydon: 665 gektar. Aholi sig‘imi: 180 ming kishi. Yangi ish o‘rinlari: 60 ming. Arxitektura zichligi: 25 foiz.',
  'Hududdan foydalanish taqsimoti:',
  '• Turar-joy — 160 gektar',
  '• Ijtimoiy soha — 80 gektar',
  '• Ko‘ngilochar va savdo — 90 gektar',
  '• Yashil hudud va bog‘lar — 120 gektar',
  '• Maʼmuriy markaz — 15 gektar',
  '• Infratuzilma (ichki yo‘llar, LRT, ko‘priklar, avtoturargohlar) — 150 gektar',
  '• Plyaj — 23 gektar',
  'Sotilgan yerlar: 29 gektar.',
  'Muhandislik yechimlari: ichki yo‘llar — 112 km, piyodalar va velosiped yo‘laklari, 2 ta yirik ko‘prik. Barcha muhandislik tarmoqlarini yashirin boshqarish imkonini beruvchi maxsus kommunikatsiya tunneli. Qirg‘oq bo‘yida 9 km yashil maydon, dam olish, istirohat bog‘lari va ovqatlanish shaxobchalari; 9 km tramvay va yashil bulvar.')});

add({id:'shirin-phases',kind:'pages',title:'Rivojlanish bosqichlari (2026–2030)',category:'Bosqichlar',image:url.riverTop,
  summary:'Poydevor davri, qurilishning avj pallasi va yakunlash — uch bosqichda.',
  body:P(
  '1. Poydevor davri (2026–2027). Loyihaning dastlabki bosqichi Shaharcha uchun mustahkam poydevor yaratishga qaratilgan: yer tekislash va ichki yo‘llarni tayyorlash; asosiy kommunikatsiya tarmoqlarini ishga tushirish; birinchi navbatda maʼmuriy markazni joylashtirish.',
  '2. Qurilishning avj pallasi (2027–2028). Shaharchaning asosiy qismini shakllantirish va uning funksionalligini taʼminlash: 300 ta ko‘p qavatli turar-joy binosini bosqichma-bosqich qurish; maktab, bog‘cha, oliygoh, tibbiyot muassasalari, xizmat ko‘rsatish va turizm obyektlarini qurish; sun’iy orol va istirohat bog‘larini barpo etish.',
  '3. Yakunlash va ekspluatatsiya (2028–2030). Ichki yo‘llarni foydalanishga topshirish, ijtimoiy soha obyektlarini to‘liq quvvatda ishga tushirish va Shaharchani boshqaruv kompaniyasiga topshirish.')});

add({id:'shirin-planned-objects',kind:'pages',title:'Shirin hududida qurilishi rejalashtirilgan obyektlar',category:'Obyektlar',image:url.housing,
  summary:'254 ta ko‘p qavatli uy, 37 500 xonadon, ijtimoiy, madaniy, sport va tijorat obyektlari.',
  body:P(
  '• 254 ta ko‘p qavatli turar-joy binosi (37 500 ta xonadon)',
  '• 5 ta umumtaʼlim maktabi, 10 ta DMTT (maktabgacha taʼlim)',
  '• 2 ta universitet',
  '• 1 ta markaziy ko‘p tarmoqli shifoxona, 2 ta poliklinika, 4 ta diagnostika markazi, 4 ta xususiy klinika, 1 ta tez yordam',
  '• 1 ta kinoteatr, 1 ta madaniyat va turizm markazi, 1 ta markaziy kutubxona, 1 ta muzey, 1 ta san’at saroyi',
  '• 1 ta markaziy istirohat bog‘i, 2 ta kichik istirohat bog‘i, 1 ta plyaj, 1 ta akvapark',
  '• 1 ta markaziy stadion, 2 ta sport kompleksi, 8 ta sport maydonchasi',
  '• 10 ta mehmonxona, 2 ta savdo moll, 3 ta eko bozor, 4 ta avtoservis',
  '• 4 ta biznes markazi, 5 ta bank',
  '• 1 ta avtovokzal, 1 ta masjid')});

add({id:'shirin-relocation',kind:'pages',title:'Ko‘chirish va kompensatsiya (SNOS)',category:'Kompensatsiya',image:url.boundary,
  summary:'Shaharcha hududidagi 2888 ta obyektdan 1773 tasi buzilib ko‘chirilgan; 359,9 mlrd so‘m kompensatsiya to‘langan.',
  body:P(
  'Shaharcha hududidagi obyektlar bo‘yicha dastlabki hisob-kitoblar (2026-yil 16-oktabr holatiga):',
  '• Jami yer maydoni: 665 gektar.',
  '• Jami obyektlar: 2888 ta (400 gektar). Shundan turar obyektlar — 2614 ta (214 ga), noturar obyektlar — 274 ta (186 ga).',
  '• Buzilgan obyektlar: 1773 ta (117 ga), kompensatsiya — 359,9 mlrd so‘m. Shundan turar obyektlar — 1767 ta (115 ga, 340,1 mlrd so‘m), noturar obyektlar — 6 ta (2 ga, 19,8 mlrd so‘m).',
  '• Qoldiq obyektlar: 1115 ta (283 ga). Shundan turar obyektlar — 847 ta (99 ga), noturar obyektlar — 268 ta (184 ga).',
  'Yaqin rejalar: maʼmuriy markaz quriladigan joyda buzilishga tushgan 34 ta uy-joyni yuridik va jismoniy shaxslar bilan kelishgan holda ko‘chirish va kompensatsiya to‘lash.')});

// Loyihalar
const proj=(id:string,title:string,category:string,summary:string,body:string,data:any,image?:string)=>add({id:'shirin-p-'+id,kind:'projects',title,category,summary,body,image,data});
proj('admin-markaz','Viloyat maʼmuriy markazi','Maʼmuriy markaz','Samarqand viloyat hokimligi hamda davlat organlari va tashkilotlari uchun yangi bino va inshootlar majmuasi.',
  P('Maʼmuriy markazning bosh rejasi 28 gektar maydonda tayyorlanmoqda (Yaponiyaning «SAKO Architects» kompaniyasi va «O‘zshaharsozlikLITI» DM hamkorligida). Viloyat hokimligi va davlat organlari uchun yangi bino va inshootlar qurish obyekti — 15 gektar.',
  'Qurilish ostidagi maydon: 9,4 ming kv.m. Foydali maydon: 45,3 ming kv.m. Umumiy maydon: 50,9 ming kv.m (jami 50 998 kv.m).',
  'Qavatlar bo‘yicha maydon: -1-qavat — 8 755,2; 1-qavat — 9 458,9; 2-qavat — 5 177,8; 3-qavat — 5 041,8; 4–7-qavatlar — 5 177,8 dan; 8-qavat — 1 853 kv.m.',
  '2026–2028-yillarga respublika byudjetidan 50,0 mlrd so‘m ajratilgan; manzilli ro‘yxat va xarajatlar smetasi tasdiqlangan, pudratchi tashkilot bilan shartnoma imzolangan. Respublika muvofiqlashtiruvchi komissiyasi 2027-yil aprelgacha qurilishda parallel loyihalashga ruxsat bergan.',
  'Vazirlar Mahkamasining 2026-yil 22-yanvardagi 15-son qaroriga ko‘ra 49 ta, Prezidentning 2026-yil 28-avgustdagi PF-177-son Farmoniga ko‘ra 97 ta davlat tashkiloti Samarqand shahri markazidan ko‘chirilishi belgilangan.'),
  {stage:'planned',progress:0,area:15,date:'2026-09-24'},url.adminBuilding);
proj('qoradaryo-koprik','Qoradaryo ustidagi yo‘l o‘tkazgich ko‘prigi','Transport','Oqdaryo tumanining sobiq R.Hamrayev hududini bog‘lovchi ko‘prik — qurilish yakuniy bosqichda.',
  P('Buyurtmachi: «Samarqand mintaqaviy yo‘llarga buyurtmachi xizmati» DM. Bosh loyihachi: «Ko‘prikqurilishloyiha» UK. Bosh pudratchi: «Ko‘prikqurilish tresti» UK.',
  'Loyiha qiymati (QMI): 260,7 mlrd so‘m. Bajarilgan: 192,4 mlrd so‘m (74%). 2026-yilda bajarilgan: 124,4 mlrd so‘m. Moliyalashtirilgan: 240,6 mlrd so‘m (92%).',
  'Ko‘prik uzunligi — 795 p/metr, kengligi — 29,8 metr, yo‘l toifasi — I, qatnov qismi — 4–6 tasmali.',
  'Tayanch qurilmalar va oraliq qurilmalarni montaj qilish, piyoda va velo yo‘laklari qurilishi to‘liq yakunlangan. Piyodalar yo‘lagida metall panjaralar o‘rnatish — 80%. Tunnel qurilishi — 95%, pilon montaji — 100%, tunnel va ko‘prik oralig‘idagi ko‘tarma ishlari — 95%. Hozirda obyektda 105 ishchi va 30 texnika ishlamoqda.'),
  {stage:'building',progress:74,date:'2026-09-24'},url.promenade);
proj('zarafshon-qirgoq','Zarafshon daryosi qirg‘oqlarini mustahkamlash (1-bosqich)','Gidrotexnika','Daryo qirg‘oqlarini tiklash va betonlash: loyiha 69 foiz bajarilgan.',
  P('Buyurtmachi: «Samarqandsuvqurilishinvest» DM. Bosh loyihachi: «SURXON SUV QURILISH» MChJ. Bosh pudratchi: «SOGDA ZARAFSHON SUV QURULISH» MChJ.',
  'Loyiha qiymati (QMI): 12 698,2 mln so‘m. Bajarilgan: 8 823,9 mln so‘m (69%). Moliyalashtirilgan: 6 295,0 mln so‘m (50%). 2026-yilga ajratilgan limit: 15 000,0 mln so‘m.',
  'Hajm: qirg‘oqlarni tiklash va betonlash — chap qirg‘oq 2170 metr, o‘ng qirg‘oq 1780 metr (Qoradaryoning maksimal suv sarfi — 600 m³/sek).',
  'Holat: o‘ng qirg‘oqda 1500 metr qismida beton ishlari tugatilgan; chap qirg‘oqda 250 metr beton ishlari va 70 metr qirg‘oq tiklash ishlari bajarilgan. Hozirda obyektda 40 ishchi va 19 texnika ishlamoqda.'),
  {stage:'building',progress:69,date:'2026-09-24'},url.riverTop);
const winners:[string,string,string,string,string,any][]=[
  ['toshkent-kimyo','Toshkent Kimyo Xalqaro Universiteti kampusi','Taʼlim','Auksion g‘olibi: 9,31 gektarlik lotda universitet kampusi qurilmoqda.',
   P('Buyurtmachi: Toshkent Kimyo Xalqaro Universiteti. Bosh loyihachi: «POWER IDEA DESIGN» MChJ. Bosh pudratchi: «STROY PROJECT GROUP» MChJ.',
   'Lot maydoni: 9,31 gektar (loyiha yer maydoni — 8,5 ga). Loyiha qiymati: 157 mlrd so‘m (universitet hisobidan). Loyiha quvvati: 16 400 kv.m, 9–10 qavatli bino. Yaratiladigan ish o‘rni: 63.',
   'Qurilish 2025-yil 1-aprelda boshlangan; birinchi bosqichni foydalanishga topshirish — 2028-yil 1-sentabr. Qurilish-montaj ishlari 35 foizga bajarilgan; qurilishda 70 ishchi va 8 texnika ishlamoqda.'),
   {stage:'building',progress:35,area:9.31,date:'2025-04-01'}],
  ['kumushkent','«Maxsus ta’mir qurilish kumushkent» turar-joy majmuasi','Turar-joy','Auksion g‘olibi: 1,85 gektarda 90 xonadonli 4 ta ko‘p qavatli uy.',
   P('Buyurtmachi: «Maxsus ta’mir qurilish kumushkent» MChJ. Bosh loyihachi: «MASTERPLAN 2022» MChJ. Bosh pudratchi: «Meʼmor Alisher Kumushkent» MChJ.',
   'Yer maydoni: 1,85 gektar. Loyiha qiymati: 150 mlrd so‘m (o‘z mablag‘lari). Loyiha quvvati: 8 064 kv.m, 90 xonadonli, 12–16 qavatli 4 ta uy. Yaratiladigan ish o‘rni: 25.',
   'Qurilish 2025-yil avgustda boshlangan; foydalanishga topshirish — 2028-yil. Qurilish-montaj ishlari 60 foizga bajarilgan; qurilishda 50 ishchi va 6 texnika ishlamoqda.'),
   {stage:'building',progress:60,area:1.85,date:'2025-08-01'}],
  ['bomi','«BOMI UZBEKISTAN» MChJ XK obyekti','Turar-joy','Auksion g‘olibi: 1,11 gektar maydonda qurilish ishlari boshlangan.',
   P('Bosh loyihachi: «Univer pro stile» MChJ. Bosh pudratchi: «Bomi Uzbekistan» MChJ.',
   'Yer maydoni: 1,11 gektar. Loyiha qiymati: 150 mlrd so‘m (o‘z mablag‘lari). Qurilish 2026-yil 1-iyunda boshlangan; foydalanishga topshirish — 2028-yil 1-yanvar.',
   'Bajarilgan ishlar: yer maydoni tekislangan va o‘ralgan.'),
   {stage:'building',progress:5,area:1.11,date:'2026-06-01'}],
  ['eko-sity','«EKO SITYGROUP» MChJ obyekti','Turar-joy','Auksion g‘olibi: 1,51 gektar maydonda yer tekislash ishlari bajarilgan.',
   P('Bosh loyihachi: «Sam tib loyiha» MChJ. Bosh pudratchi: «EKO SITYGROUP» MChJ.',
   'Yer maydoni: 1,51 gektar. Loyiha qiymati: 160 mlrd so‘m (o‘z mablag‘lari). Foydalanishga topshirish — 2028-yil 1-yanvar.',
   'Bajarilgan ishlar: yer tekislash ishlari amalga oshirilgan.'),
   {stage:'building',progress:5,area:1.51}],
  ['fortex','«FORTEX ENGINEERING GROUPS» MChJ obyekti','Turar-joy','Auksion g‘olibi: 0,9 gektar maydonda yer tekislash ishlari bajarilgan.',
   P('Bosh loyihachi va bosh pudratchi: «FORTEX ENGINEERING GROUPS» MChJ.',
   'Yer maydoni: 0,9 gektar. Loyiha qiymati: 150 mlrd so‘m (o‘z mablag‘lari).',
   'Bajarilgan ishlar: yer tekislash ishlari amalga oshirilgan.'),
   {stage:'building',progress:5,area:0.9}],
  ['sar-house','«Sar House» MChJ turar-joy majmuasi','Turar-joy','Auksion g‘olibi: 4,65 gektarda 6 ta 12–16 qavatli uy; qurilish tasdiqlanishi kutilmoqda.',
   P('Bosh loyihachi: «ARX STROY PROJECT» MChJ. Bosh pudratchi: «SAR HOUSE SSS» MChJ.',
   'Yer maydoni: 4,65 gektar. Loyiha qiymati: 520 mlrd so‘m (o‘z mablag‘lari). Loyiha quvvati: 6 ta ko‘p qavatli (12–16 qavatli) bino.',
   'Holat: qurilish ishlarini boshlash uchun loyihaning tasdiqlanishi kutilmoqda.'),
   {stage:'planned',progress:0,area:4.65}],
];
winners.forEach(([id,title,cat,summary,body,data],i)=>proj(id,title,cat.replace('Taʼlim','Taʼlim'),summary,body,data,[url.fountain,url.housing,url.adminRiver,url.overview,url.square,url.adminBuilding][i%6]));

// Infratuzilma
const infra=(id:string,title:string,summary:string,body:string,data:any,image?:string)=>add({id:'shirin-i-'+id,kind:'infrastructure',title,category:'Muhandislik-kommunikatsiya',summary,body,image,data});
infra('elektr','Elektr taʼminoti','110 kV podstansiyalar va tarmoq: 175 mlrd so‘mlik loyiha; Kuvayt jamg‘armasi bilan loyihalash olib borilmoqda.',
  P('Loyiha qiymati: 175 mlrd so‘m. Moliyalashtirish manbai: tarmoq korxonasi mablag‘lari (hozircha moliyalashtirilmagan).',
  '1-bosqich — 94 mlrd so‘m: 2 dona 110 kV yacheyka o‘rnatish (10 mlrd); 2 dona 63 MVA podstansiya qurish (70 mlrd); 4,1 km 110 kV elektr uzatish tarmog‘i (14 mlrd).',
  '2-bosqich — 81 mlrd so‘m: 2 dona 40 MVA podstansiya (65 mlrd); 5 km 110 kV elektr uzatish tarmog‘i (16 mlrd).',
  'Ichki kommunikatsiya tarmoqlari, jumladan elektr energiyasi loyihasi Kuvayt Arab Iqtisodiy Taraqqiyot Jamg‘armasi bilan hamkorlikda loyihalanmoqda: loyihaning iqtisodiy asoslarini ishlab chiqish uchun 1,0 mln dollar grant jalb qilish va elektr tarmoqlari bo‘yicha 165 mln dollarlik kredit ajratish yuzasidan muzokaralar olib borilmoqda.'),
  {stage:'planned',progress:0},url.overview);
infra('gaz','Gaz taʼminoti','1,7 km gaz tarmog‘i va 1 ta gaz taqsimlash punkti.',
  P('Loyiha qiymati: 1,3 mlrd so‘m. Moliyalashtirilgan: 0,5 mlrd so‘m. Manba: tarmoq korxonasi mablag‘lari.','Hajm: 1,7 km tarmoq tortish va 1 dona GTK o‘rnatish. Bajarilgan: 0,4 km tarmoq tortilgan.'),
  {stage:'building',progress:24});
infra('suv','Ichimlik suv va oqova suv','Samarqand shahrida suv taʼminoti tizimlari va yo‘l tarmoqlarini modernizatsiya qilish loyihasi (Abu Dabi jamg‘armasi): 22 foiz bajarilgan.',
  P('Asos: Prezidentning 2024-yil 29-noyabrdagi PQ-407-son qarori 6-ilovasi. Buyurtmachi: Samarqand viloyati hokimligi. Bosh loyihachi: «ARX-IDEYA PROJECT» MChJ. Bosh pudratchi: «Maxsus suv qurilish» va «Mesmer-east» QK.',
  'Shartnoma qiymati: 16,8 mln dollar. Hajm: ichimlik suv inshooti, 5,09 km ichimlik suv tarmog‘i, 15 ta suv quduqi, 2 ta suv havzasi, nasos stansiyasi, xlorator binosi; 4,4 km oqova suv tarmog‘i; Cho‘pon-ota va Dahbed suv inshootlariga 5 MVt (har biriga 2,5 MVt) quyosh fotoelektrostansiyasi.',
  'Bajarilgan: 3,7 mln dollar (22%); moliyalashtirilgan: 3,2 mln dollar. Qurilish 2026-yil iyulda boshlangan; foydalanishga topshirish — 2027-yil dekabr.'),
  {stage:'building',progress:22,date:'2026-07-01'});
infra('yollar','Avtomobil yo‘llari','32,8 km yangi yo‘l: qirg‘oq bo‘yi yo‘llari va massiv ichki yo‘llari — 1 333,5 mlrd so‘m.',
  P('Loyiha qiymati: 1 333,5 mlrd so‘m. Yangi quriladigan avtomobil yo‘llari: 32,8 km. Moliyalashtirish manbai: tarmoq korxonasi mablag‘lari (hozircha moliyalashtirilmagan, ishlar boshlanmagan).',
  '1-bosqich — 160,0 mlrd so‘m: massivning qirg‘oq bo‘yi yo‘llarini qurish, 7,0 km.',
  '2-bosqich — 1 173,5 mlrd so‘m: massiv hududidagi ichki yo‘llar qurilishi, 25,8 km.',
  '2024-yilda Qoradaryo daryosi yoqasidan 5,3 km uzunlikdagi shag‘aldan vaqtinchalik yo‘l qurilgan.'),
  {stage:'planned',progress:0},url.riverTop);
infra('aloqa','Telekommunikatsiya tarmog‘i','3 200 ta yangi port va 204 800 abonent uchun optik tarmoq.',
  P('Loyiha qiymati: 4,107 mlrd so‘m. Yangi o‘rnatiladigan portlar: 3 200 ta. Abonentlar soni: 204 800 ta. Tashqi tarmoq: 21,1 km; ichki tarmoq: 20,0 km; optik qurilma: 6 dona 640 portli. Manba: tarmoq korxonasi mablag‘lari.',
  '1-bosqich: tashqi tarmoq 9,8 km, ichki tarmoq 8,0 km, 1 dona 640 portli optik qurilma.',
  '2-bosqich: tashqi tarmoq 11,3 km, ichki tarmoq 12,0 km, 5 dona 640 portli optik qurilma.'),
  {stage:'planned',progress:0});
infra('tunnel','Kommunikatsiya tunneli','Barcha muhandislik tarmoqlarini yashirin boshqarish imkonini beruvchi maxsus tunnel.',
  'Shaharchada kommunikatsiya tarmoqlari uchun tunnel tizimi loyihalanmoqda. Tunnel elektr, suv, aloqa va boshqa muhandislik tarmoqlarini ko‘cha yuzasini buzmasdan joylashtirish va boshqarish imkonini beradi. Shuningdek asosiy tashqi kommunikatsiya tizimlari — elektr, tabiiy gaz va suv stansiyalari uchun Shaharcha hududidan joy ajratish va geodezik nuqtalarda qurilishni boshlash rejalashtirilgan.',
  {stage:'planned',progress:0});
infra('transport','Transport, LRT va ko‘priklar','112 km ichki yo‘l, piyodalar va velosiped yo‘laklari, yer usti metro yo‘li (LRT) va 2 ta katta ko‘prik.',
  P('Bosh reja bo‘yicha: 112 km ichki yo‘llar; piyodalar va velosiped yo‘laklari; 10 km yer usti metro yo‘li; kengligi 25 metr bo‘lgan 2 ta katta ko‘prik.','Qirg‘oq bo‘yida 9 km tramvay va dunyodagi eng uzun yashil bulvarlardan biri rejalashtirilgan; to‘siqsiz harakat taʼminlanadi.'),
  {stage:'planned',progress:0},url.promenade);
infra('qirgoq','Qirg‘oq bo‘yi va yashil bulvar','Zarafshon bo‘ylab 9 km yashil maydon, dam olish va ovqatlanish shaxobchalari.',
  P('Qirg‘oq bo‘yida 9 km yashil maydon, dam olish va istirohat bog‘lari, ovqatlanish shaxobchalari barpo etiladi. Sohil bo‘yi yer maydonini obodonlashtirish va istirohat bog‘i-plyaj loyihasini ishlab chiqish hamda mahalliy va xorijiy investorlarni jalb qilish rejalashtirilgan.'),
  {stage:'planned',progress:0},url.promenade);

// Yangiliklar
const news=(id:string,title:string,date:string,summary:string,image?:string)=>add({id:'shirin-n-'+id,kind:'news',title,category:'Loyiha yangiliklari',summary,body:summary,image,data:{date}});
news('markaz-byudjet','Viloyat maʼmuriy markazi qurilishi uchun 50 mlrd so‘m ajratildi','2026-09-24','Samarqand viloyat hokimligi va davlat organlari uchun yangi bino va inshootlar qurish maqsadida 2026–2028-yillarga respublika byudjetidan 50,0 mlrd so‘m ajratildi. Manzilli ro‘yxat va xarajatlar smetasi tasdiqlangan, pudratchi bilan shartnoma imzolangan.',url.square);
news('koprik-74','Qoradaryo ustidagi ko‘prik qurilishi 74 foizga bajarildi','2026-09-24','260,7 mlrd so‘mlik ko‘prik obyektida 192,4 mlrd so‘mlik ish bajarildi. Tayanch va oraliq qurilmalar montaji, piyoda va velo yo‘laklari qurilishi tugallangan, tunnel qurilishi 95 foizga yetgan.',url.promenade);
news('qirgoq-69','Zarafshon qirg‘oqlarini mustahkamlash: 69 foiz bajarildi','2026-09-24','Qirg‘oqlarni tiklash va betonlash ishlarining 1-bosqichida o‘ng qirg‘oqda 1500 metr qismida beton ishlari tugatildi, chap qirg‘oqda ishlar davom etmoqda.',url.riverTop);
news('lotlar-sotildi','Shirin hududida 15 ta lot 121 mlrd so‘mga sotildi','2026-09-24','Shirin shaharchasi hududidan 121 mlrd so‘mga 20 gektarlik 15 ta lot sotildi va auksion g‘oliblariga belgilangan tartibda yer maydonlari ajratib berildi. Yaqin rejalarda yana 8 gektar bo‘sh yerni auksionga qo‘yish bor.',url.overview);
news('business-city','Shirin «Business city» ro‘yxatiga kiritildi','2026-03-31','Vazirlar Mahkamasining 2026-yil 31-martdagi 134-son qaroriga asosan Shaharcha «Business city» zamonaviy ishbilarmonlik markazlari ro‘yxatiga kiritildi.',url.overview);
news('sako','Bosh reja uchun SAKO Architects taklifi tanlandi','2026-01-06','9 ta xorijiy loyiha institutiga yuborilgan so‘rovga 5 ta kompaniya taklif bergan. Viloyat faollari ishtirokidagi taqdimotda yaponiyalik «SAKO Architects» taklifi maʼqul topildi; bosh reja shu institut bilan hamkorlikda tayyorlanmoqda.',url.plan);
news('koch-davlat','Davlat tashkilotlari Shiringa ko‘chiriladi: 49 va 97 ta idora','2026-08-28','Vazirlar Mahkamasining 2026-yil 22-yanvardagi qaroriga ko‘ra 49 ta, Prezidentning 2026-yil 28-avgustdagi PF-177-son Farmoniga ko‘ra yana 97 ta davlat tashkiloti Samarqand shahri markazidan yangi maʼmuriy markazga ko‘chirilishi belgilandi.',url.adminBuilding);

// Hamkorlar
const partner=(id:string,title:string,cat:string,summary:string,image?:string)=>add({id:'shirin-pt-'+id,kind:'partners',title,category:cat,summary,body:summary,image});
partner('sako','SAKO Architects (Yaponiya)','Loyihachi','Shirin shaharchasi bosh rejasini «O‘zshaharsozlikLITI» DM bilan hamkorlikda ishlab chiqayotgan xorijiy loyiha instituti.');
partner('uzshahar','O‘zshaharsozlikLITI DM','Loyihachi','Bosh reja, qurilish va infratuzilma obyektlari loyihalarini ishlab chiqish bo‘yicha belgilangan loyiha instituti.');
partner('kuvayt','Kuvayt Arab Iqtisodiy Taraqqiyot Jamg‘armasi','Moliya hamkori','Ichki kommunikatsiya tarmoqlari va elektr taʼminoti loyihasini hamkorlikda loyihalash; 1,0 mln dollar grant va 165 mln dollar kredit bo‘yicha muzokaralar.');
partner('abudabi','Abu Dabi taraqqiyot jamg‘armasi','Moliya hamkori','Samarqand shahrida suv taʼminoti tizimlari va yo‘l tarmoqlarini modernizatsiya qilish loyihasini (16,8 mln dollar) moliyalashtiruvchi hamkor.');
['Toshkent Kimyo Xalqaro Universiteti|Taʼlim|9,31 ga lot, kampus qurilishi (157 mlrd so‘m).','Maxsus ta’mir qurilish kumushkent MChJ|Turar-joy|1,85 ga lot, 90 xonadonli 4 ta uy.','BOMI UZBEKISTAN MChJ XK|Turar-joy|1,11 ga lot.','EKO SITYGROUP MChJ|Turar-joy|1,51 ga lot.','FORTEX ENGINEERING GROUPS MChJ|Turar-joy|0,9 ga lot.','Sar House MChJ|Turar-joy|4,65 ga lot, 6 ta 12–16 qavatli uy (520 mlrd so‘m).'].forEach((r,i)=>{const [t,c,s]=r.split('|');partner('inv'+(i+1),t,'Investor — '+c,'Auksion g‘olibi. '+s)});

// Hujjatlar va rasmlar
const doc=(id:string,title:string,summary:string,file:string)=>add({id:'shirin-d-'+id,kind:'documents',title,category:'Bosh reja',summary,body:summary,image:file,data:{url:file}});
doc('plan','Bosh reja va batafsil rejalashtirish loyihasi (chizma)','Shirin shaharchasi bosh rejasi: shartli belgilar, qaydnoma, turar-joy va magistral yo‘llar rivojlanish sxemasi.',url.plan);
doc('xarita','Yer ajratilgan hududlar xaritasi','Samarqand viloyati «Shirin» zamonaviy ishbilarmonlik markazi va turar joy kompleksi uchun yer maydonlari ajratilgan hududlar xaritasi (jami 665 ga).',url.boundary);
const photo=(id:string,title:string,cat:string,image:string)=>add({id:'shirin-ph-'+id,kind:'photos',title,category:cat,summary:title,body:title,image,data:{alt:title}});
for(const k of ['overview','square','riverTop','promenade','housing','fountain','adminRiver','adminBuilding'])photo(k,NAMES[k],k.startsWith('admin')||k==='square'||k==='fountain'?'Maʼmuriy markaz':'Vizualizatsiya',url[k]);
photo('location',NAMES.location,'Joylashuv',url.location);
photo('boundary',NAMES.boundary,'Xarita',url.boundary);
photo('plan',NAMES.plan,'Bosh reja',url.plan);

// Savol-javob
const faq=(id:string,q:string,a:string)=>add({id:'shirin-f-'+id,kind:'faqs',title:q,category:'Savol-javob',summary:a,body:a});
faq('qayerda','Shirin shaharchasi qayerda joylashgan?','Samarqand shahrining shimoliy qismida, Zarafshon daryosi bo‘yida, xalqaro yo‘l va aeroport yaqinida. Umumiy maydoni 665,1 gektar, qirg‘oq chizig‘i 9,7 km.');
faq('aholi','Shaharchada qancha aholi yashaydi?','Bosh reja bo‘yicha 180 ming aholi uchun mo‘ljallangan; 60 ming yangi ish o‘rni yaratiladi, 37 500 xonadon quriladi.');
faq('lot','Yer maydonlari qanday beriladi?','Yer maydonlari auksion orqali sotiladi. Hozirgacha 20 gektarlik 15 ta lot 121 mlrd so‘mga sotilgan; yaqin rejalarda yana 8 gektar bo‘sh yer auksionga qo‘yiladi. Lotlar va ularning holati xaritada ko‘rsatilgan.');
faq('muddat','Qurilish qachon yakunlanadi?','Loyiha 2026–2030-yillarni qamrab oladi: poydevor davri (2026–2027), qurilishning avj pallasi (2027–2028) va yakunlash hamda ekspluatatsiya (2028–2030).');
faq('markaz','Maʼmuriy markaz qachon quriladi?','Viloyat maʼmuriy markazi birinchi navbatda joylashtiriladi. 2026–2028-yillarga 50,0 mlrd so‘m ajratilgan, pudratchi bilan shartnoma imzolangan, 2027-yil aprelgacha parallel loyihalash ruxsat etilgan.');

await (await col('content')).bulkWrite(items.map(c=>({updateOne:{filter:{id:c.id},update:{$set:{id:c.id,kind:c.kind,title:c.title,summary:c.summary,body:c.body,image:c.image||'',category:c.category,status:'published',data:JSON.stringify(c.data||{}),author:AUTHOR,updated:stamp,note:''}},upsert:true}})));
console.log('Kontent:',items.length);

// ---------- Sayt sozlamalari (faqat bo'sh yoki standart qiymatlar almashtiriladi) ----------
const settings=await col('settings');
const siteRow=await settings.findOne({key:'site'});
const prev=siteRow?JSON.parse(siteRow.value):{};
const wanted:any={
  title:'Shirin',
  tagline:'Samarqandning yangi markazi',
  about:'«Shirin» — Samarqand shimolida, Zarafshon bo‘yida 665 gektar maydonda barpo etilayotgan zamonaviy ishbilarmonlik markazi va turar joylar kompleksi. 180 ming aholi uchun qulay, xavfsiz va ekologik barqaror muhit: uy-joy, taʼlim, tibbiyot, ish o‘rni, transport, dam olish va raqamli xizmatlar yagona shahar muhitida.',
  organizationName:'«Shirin» zamonaviy ishbilarmonlik markazi va turar joylar kompleksini barpo etish direksiyasi (Samarqand viloyati hokimligi huzuridagi davlat muassasasi)',
  organizationType:'Davlat muassasasi',
  registration:'O‘zbekiston Respublikasi Prezidentining 2023-yil 20-iyuldagi PQ-233-son qarori',
  address:'Samarqand shahri, «Shirin» massivi',
  heroImage:url.overview,aboutImage:url.square,planImage:url.plan,
  seoTitle:'Shirin shaharchasi — Samarqandning yangi markazi',
  seoDescription:'Shirin shaharchasi: bosh reja, qurilish jarayoni, investitsiya uchun yer lotlari va interaktiv xarita.',
};
const isDefault=(k:string)=>{const v=prev[k];return v===undefined||v===''||/^\/assets\//.test(String(v))||k==='title'&&v==='Shirin'||k==='tagline'&&/yangi markazi: zamonaviy/.test(String(v))||k==='seoTitle'&&/portali/.test(String(v))||k==='seoDescription'&&/shaharchasi loyihalari/.test(String(v))};
const patch:any={};for(const [k,v] of Object.entries(wanted))if(isDefault(k)||k.endsWith('Image'))patch[k]=v;
const merged=sanitizeConfig(patch,prev);
await settings.updateOne({key:'site'},{$set:{key:'site',value:JSON.stringify(merged)}},{upsert:true});
console.log('Sayt sozlamalari yangilandi:',Object.keys(patch).join(', '));

// Xarita sarlavhasi: «uchastka» -> «hudud» (faqat avvalgi standart/mock matn bo'lsa)
const mc=await settings.findOne({key:'map:config'});
if(mc){const c=JSON.parse(mc.value);let ch=false;
  if(/uchastka/i.test(c.title||'')){c.title='Shirin shaharchasi xaritasi';ch=true}
  if(/uchastka/i.test(c.subtitle||'')){c.subtitle='Samarqand viloyati · hududlar va investitsiya';ch=true}
  if(ch){await settings.updateOne({key:'map:config'},{$set:{value:JSON.stringify(c)}});await settings.updateOne({key:'map:revision'},{$set:{value:uid().replace(/-/g,'').slice(0,24)}},{upsert:true});console.log('Xarita sarlavhasi yangilandi')}
}
await closeDb();
