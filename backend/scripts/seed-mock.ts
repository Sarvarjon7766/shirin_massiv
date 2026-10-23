// Mock (namuna) ma'lumotlar bilan bazani to'ldirish. Ishga tushirish:  npm run seed:mock   (qayta ishga tushirilsa, o'zining yozuvlarini yangilaydi)
//                                                                        npm run seed:mock -- --only-reset   (faqat o'chiradi, qayta qo'shmaydi)
//                                                                        npm run seed:mock -- --reset   (avval faqat shu skript qo'shgan yozuvlarni o'chiradi)
// Mavjud (sizning) ma'lumotlaringizga tegmaydi: mock yozuvlar `mock-` ID yoki `M-001` raqamlari va author="mock-seed" bilan belgilanadi.
import {col,closeDb} from '../src/db';
import {hashPassword} from '../src/auth/password';
import {normalizePlot} from '../src/plots';
import {normalizeLayer} from '../src/map-layers';
import {sanitizeMapConfig,defaultMapConfig} from '../src/shared/map-config';

const AUTHOR='mock-seed';
const reset=process.argv.includes('--reset');
const now=new Date(),iso=(d:Date)=>d.toISOString();
const days=(n:number)=>iso(new Date(now.getTime()+n*864e5));
const day=(n:number)=>days(n).slice(0,10);
const uid=()=>crypto.randomUUID();
const IMG=['/assets/hero.jpg','/assets/mahalla.jpg','/assets/masterplan.webp'];
const pick=<T,>(a:T[],i:number)=>a[i%a.length];
// Shirin massivi (Samarqand viloyati) markazi
const L0=66.9985,B0=39.7145;
const jitter=(i:number,n:number)=>(((i*7+n*13)%5)-2)*0.00009;

// ---------- Kontent ----------
type C={id:string;kind:string;title:string;summary:string;body?:string;image?:string;category:string;status?:string;data?:any};
const content:C[]=[];
const add=(c:C)=>content.push(c);
const geo=(dx:number,dy:number)=>({lat:Number((B0+dy).toFixed(6)),lng:Number((L0+dx).toFixed(6))});

['Zamonaviy mahalla|Turar-joy|Yashil hovlilar, qulay piyoda yo‘laklari va kundalik xizmatlar uyg‘unligi.|building|42','Markaziy maydon|Jamoat|Madaniyat, uchrashuv va shahar hayoti uchun ochiq jamoat makoni.|planned|0','Biznes park|Biznes|Tadbirkorlar va yangi g‘oyalar uchun zamonaviy ish muhiti.|building|18','Ta’lim kampusi|Ta’lim|Maktab, litsey va bolalar bog‘chasini birlashtiruvchi qulay ta’lim muhiti.|building|65','Yashil sayr yo‘lagi|Ekologiya|Piyoda sayr, velosiped va oilaviy dam olishga mo‘ljallangan 4 km li yo‘lak.|planned|5','Transport markazi|Transport|Shaharcha hududlarini bog‘lovchi jamoat transporti tugunlari.|planned|0','Tibbiyot markazi|Sog‘liqni saqlash|Birlamchi tibbiy xizmat va diagnostika majmuasi.|done|100','Sport majmuasi|Sport|Yopiq va ochiq maydonlar, suzish havzasi va yoshlar sport maktabi.|building|31'].forEach((r,i)=>{
  const [title,category,summary,stage,progress]=r.split('|');
  add({id:'mock-p'+(i+1),kind:'projects',title,summary,category,image:pick(IMG,i),data:{stage,progress:Number(progress),zone:pick(['Turar-joy mavzesi','Markaziy hudud','Biznes mavzesi'],i),date:day(-120+i*25),...geo(-0.012+i*0.0035,0.004-(i%3)*0.003)}});
});
['Savdo majmuasi hududi|Savdo|SH-101|2.4|5|available','Turar-joy kvartali|Turar-joy|SH-102|4.1|9|reserved','Biznes park hududi|Biznes|SH-103|3.2|7|available','Mehmonxona va xizmatlar|Turizm|SH-104|1.8|6|sold','Logistika va ombor|Sanoat|SH-105|5.6|3|available','Sog‘lomlashtirish markazi|Sog‘liqni saqlash|SH-106|2.9|4|available'].forEach((r,i)=>{
  const [title,category,code,area,floors,availability]=r.split('|');
  add({id:'mock-l'+(i+1),kind:'lots',title,category,summary:`${title} uchun ${area} ga maydon: infratuzilma ulangan, loyihalash shartlari tayyor.`,image:pick(IMG,i+1),data:{code,area:Number(area),floors:Number(floors),stage:'planned',availability,investorPublic:availability==='sold',investorName:availability==='sold'?'Shirin Invest MChJ':'',...geo(-0.006+i*0.0028,-0.002+(i%2)*0.0032)}});
});
['Transport va yo‘llar|Qulay harakatlanish: halqa yo‘l va 3 ta tugun.','Energiya ta’minoti|Barqaror elektr va issiqlik: 2 ta podstansiya, quyosh panellari.','Suv va kanalizatsiya|Ichimlik suvi, tozalash inshootlari va yomg‘ir suvi tizimi.','Raqamli infratuzilma|Optik tarmoq, ommaviy Wi‑Fi va aqlli yoritish.','Yashil hududlar|Skverlar, park va ko‘chat ekilgan yo‘laklar.','Ijtimoiy xizmatlar|Maktab, bog‘cha, poliklinika va jamoat markazlari.'].forEach((r,i)=>{
  const [title,summary]=r.split('|');
  add({id:'mock-i'+i,kind:'infrastructure',title,summary,category:'Infratuzilma',image:pick(IMG,i),data:{stage:pick(['building','planned','done'],i),progress:[40,15,100,25,10,0][i],...geo(-0.01+i*0.004,-0.006+(i%2)*0.012)}});
});
[['Turar-joy mavzesi','Uy-joylar, yashil hovlilar va mahalla xizmatlari.','Turar-joy',120],['Biznes mavzesi','Ofislar, savdo va xizmat majmualari uchun hudud.','Biznes',80],['Park va dam olish','Yashil muhit, sayr va sport uchun ochiq maydonlar.','Ekologiya',60],['Ta’lim va sog‘liqni saqlash','Maktab, litsey, poliklinika va kasalxona majmuasi.','Ijtimoiy',45]].forEach(([title,summary,category,area],i)=>{
  const x=L0-0.011+i*0.0075,y=B0-0.0075;
  add({id:'mock-z'+(i+1),kind:'zones',title:title as string,summary:summary as string,category:category as string,image:pick(IMG,i+2),data:{area,geojson:JSON.stringify({type:'Polygon',coordinates:[[[x,y],[x+0.0065,y],[x+0.0065,y-0.0045],[x,y-0.0045],[x,y]]]})}});
});
const news=['Shirin massivida birinchi bosqich qurilish ishlari boshlandi','Yangi mahalla loyihasi jamoatchilik muhokamasidan o‘tdi','Ta’lim kampusida maktab binosi 65 foizga tayyor','Investorlar uchun ochiq eshiklar kuni o‘tkaziladi','Yashil sayr yo‘lagi uchun 1 200 ta ko‘chat ekildi','Transport markazi konsepsiyasi taqdim etildi','Suv ta’minoti tizimining birinchi navbati ishga tushdi','Aholi murojaatlari uchun yangi onlayn kabinet ochildi'];
news.forEach((title,i)=>add({id:'mock-n'+(i+1),kind:'news',title,summary:title+'. Batafsil ma’lumot quyida.',category:pick(['Qurilish','Jamoatchilik','Ta’lim','Investitsiya','Ekologiya','Transport','Infratuzilma','Xizmatlar'],i),image:pick(IMG,i),data:{date:day(-3-i*6)}}));
[['Investorlar kuni','Taqdimot','Shirin massivi hududlari va imtiyozlar bilan tanishuv.',9],['Jamoatchilik muhokamasi','Uchrashuv','Yangi mahalla loyihasi bo‘yicha aholi bilan ochiq muloqot.',16],['Auksion bo‘yicha seminar','Seminar','Hudud auksionida ishtirok etish tartibi.',23],['Yashil sayr yo‘lagi ochilishi','Bayram','Birinchi navbat sayr yo‘lagining tantanali ochilishi.',40],['Ta’lim yarmarkasi','Yarmarka','Yangi kampus uchun o‘qituvchi va ish o‘rinlari yarmarkasi.',55]].forEach(([title,category,summary,d],i)=>add({id:'mock-e'+(i+1),kind:'events',title:title as string,summary:summary as string,category:category as string,image:pick(IMG,i),data:{date:day(Number(d)),location:'Shirin massivi, jamoat markazi'}}));
['Loyiha konsepsiyasi (taqdimot)|Taqdimot','Investorlar uchun qo‘llanma|Investitsiya','Imtiyozlar va preferensiyalar|Investitsiya','Qurilish me’yorlari (reglament)|Reglament','Auksion qoidalari|Auksion'].forEach((r,i)=>{const [title,category]=r.split('|');add({id:'mock-d'+(i+1),kind:'documents',title,summary:title+' — rasmiy hujjat (namuna).',category,data:{url:''}})});
['Shirin Invest MChJ|Bosh investor','Samarqand Qurilish Trest|Pudratchi','Digital Shirin|Raqamli yechimlar','Yashil Hudud Konsalting|Landshaft','EnergoPlus|Energetika','Ta’lim Fondi|Ijtimoiy hamkor'].forEach((r,i)=>{const [title,category]=r.split('|');add({id:'mock-pt'+(i+1),kind:'partners',title,summary:`${title} — loyiha hamkori (${category.toLowerCase()}).`,category,image:pick(IMG,i)})});
['Shirin massivi bosh rejasi|Umumiy ko‘rinish','Mahalla namunasi|Turar-joy','Sayr yo‘lagi|Ekologiya','Biznes park fasadi|Biznes','Kampus hovlisi|Ta’lim','Markaziy maydon kechqurun|Jamoat'].forEach((r,i)=>{const [title,category]=r.split('|');add({id:'mock-ph'+(i+1),kind:'photos',title,summary:title+' (vizualizatsiya).',category,image:pick(IMG,i),data:{alt:title}})});
[['Shirin massivi haqida qisqa video','Taqdimot'],['Qurilish jarayoni: iyul','Qurilish'],['Mahalla ichida sayr','Vizualizatsiya']].forEach(([title,category],i)=>add({id:'mock-v'+(i+1),kind:'videos',title,summary:title+' (namuna video).',category,image:pick(IMG,i),data:{videoUrl:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}}));
[['Qurilish maydoni — umumiy ko‘rinish','Kamera 1'],['Markaziy maydon','Kamera 2']].forEach(([title,category],i)=>add({id:'mock-c'+(i+1),kind:'cameras',title,summary:'Jonli efir (sinov oqimi).',category,image:pick(IMG,i),data:{streamType:'hls',sourceUrl:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'}}));
[['Markaziy maydon: hozir va kelajak','Jamoat'],['Mahalla ko‘chasi: hozir va kelajak','Turar-joy']].forEach(([title,category],i)=>add({id:'mock-cm'+(i+1),kind:'comparisons',title,summary:'Surgichni siljitib, o‘zgarishni ko‘ring.',category,image:IMG[1],data:{beforeImage:IMG[i%3],afterImage:IMG[(i+1)%3],beforeLabel:'Hozir',afterLabel:'Loyiha'}}));
[['Shirin massivi haqida','Umumiy ma’lumot','Shirin — Samarqand viloyatidagi yangi shaharcha massivi: yashash, ishlash va dam olish uyg‘unlashgan muhit.'],['Aloqa va murojaat','Aloqa','Murojaat va takliflar portal orqali qabul qilinadi; javoblar shaxsiy kabinetda ko‘rinadi.']].forEach(([title,category,summary],i)=>add({id:'mock-pg'+(i+1),kind:'pages',title,summary,body:summary+'\n\nBu sahifa mock ma’lumot sifatida yaratilgan.',category}));
[['Aziz Karimov','Direktor'],['Dilnoza Rahimova','Bosh muhandis'],['Sardor Tursunov','Investitsiya bo‘limi boshlig‘i'],['Madina Yusupova','Aholi bilan ishlash bo‘limi']].forEach(([title,category],i)=>add({id:'mock-ld'+(i+1),kind:'leadership',title,summary:category+' — qabul: dushanba–juma, 10:00–12:00 (mock).',category}));
[['2025-yil I yarim yillik hisobot','Moliyaviy'],['Qurilish jarayoni: III chorak','Qurilish'],['Aholi murojaatlari tahlili','Murojaatlar']].forEach(([title,category],i)=>add({id:'mock-r'+(i+1),kind:'reports',title,summary:title+' — ochiq hisobot (namuna).',category,data:{url:'',date:day(-20-i*40)}}));
[['Yo‘l qoplamasi ishlari tenderi','Qurilish',25],['Yashil hudud obodonlashtirish tenderi','Obodonlashtirish',32],['Raqamli yoritish uskunalari xaridi','Texnika',18],['Maktab mebelini yetkazib berish','Xarid',40]].forEach(([title,category,d],i)=>add({id:'mock-t'+(i+1),kind:'tenders',title:title as string,summary:`${title}. Takliflar muddati: ${day(Number(d))}.`,category:category as string,data:{date:day(Number(d))}}));
[['Qurilish muhandisi','Texnik'],['Loyiha menejeri','Boshqaruv'],['Landshaft dizayneri','Dizayn'],['Aholi bilan ishlash mutaxassisi','Xizmat']].forEach(([title,category],i)=>add({id:'mock-vc'+(i+1),kind:'vacancies',title,summary:`${title} lavozimiga ariza qabul qilinadi (mock).`,category,data:{date:day(20+i*5)}}));
[['Hududni qanday olish mumkin?','Hududlar auksion orqali sotiladi: shartlar xaritadagi hudud kartasida va e-auksion sahifasida.'],['Auksionda qatnashish uchun nima kerak?','Ariza muddatigacha hujjatlarni topshirish va zakalat summasini to‘lash.'],['Murojaatimga javobni qayerdan ko‘raman?','Hisobga kirib, «Murojaatlarim» bo‘limida.'],['Qurilish qachon tugaydi?','Birinchi navbat 2027-yil oxirida topshirilishi rejalashtirilgan.'],['Infratuzilma ulanganmi?','Har bir hudud kartasida infratuzilma holati ko‘rsatiladi.'],['Imtiyozlar bormi?','Investorlar uchun imtiyozlar ro‘yxati «Hujjatlar» bo‘limida.'],['Xaritadagi chegaralar rasmiymi?','Yo‘q, ular sxematik; rasmiy kadastr hujjati bilan solishtiring.'],['Qanday bog‘lanaman?','Murojaat yuborish yoki aloqa sahifasidagi raqamlar.']].forEach(([title,summary],i)=>add({id:'mock-f'+(i+1),kind:'faqs',title,summary,category:'Savol-javob'}));
// Ish jarayonini ko'rsatish uchun: qoralama va tasdiq kutilayotgan materiallar
add({id:'mock-draft1',kind:'news',title:'Yangi bosqich haqida yangilik (qoralama)',summary:'Hali tugallanmagan matn.',category:'Qurilish',status:'draft',data:{date:day(0)}});
add({id:'mock-draft2',kind:'events',title:'Yopiq taqdimot (tasdiq kutilmoqda)',summary:'Menejer yaratdi, tasdiq kutilmoqda.',category:'Taqdimot',status:'review',data:{date:day(30)}});

// ---------- Hududlar ----------
const functions=['Kop qavatli turar-joy','Ofis','Yashil ochiq maydon','Ijtimoiy obyekt(Maktab)','Ijtimoiy obyekt(Bogcha)','Mehmonxona','Savdo markazi','Yakka tartibdagi turar-joy, kottej','Tuman parki','Aralash foydalanish','Sanoat','Sport majmuasi','Utilitalar','Madaniyat markazi'];
const companies=['Shirin Invest MChJ','Samarqand Qurilish Trest','Zarafshon Development','Registon Group','Mirzo Ulug‘bek Invest','Bibixonim Real Estate','Afrosiyob Holding','Sogdiana Build'];
function statusFor(i:number){
  const r=i%20;
  if(r<9)return 'planned';if(r<12)return 'not-planned';if(r===12||r===13)return 'listed';if(r===14)return 'ready';if(r===15||r===16)return 'sold';if(r===17)return 'pending';if(r===18)return 'reserved';return 'unknown';
}
const plots:any[]=[];
const COLS=10,ROWS=9,W=0.0042,H=0.0031,GAP=0.00055;
for(let i=0;i<COLS*ROWS;i++){
  const c=i%COLS,r=Math.floor(i/COLS);
  const x=L0-COLS*(W+GAP)/2+c*(W+GAP)+(c>=5?0.0006:0),y=B0+ROWS*(H+GAP)/2-r*(H+GAP)-(r>=4?0.0005:0);
  const ring=[[x+jitter(i,1),y+jitter(i,2)],[x+W+jitter(i,3),y+jitter(i,4)],[x+W+jitter(i,5),y-H+jitter(i,6)],[x+jitter(i,7),y-H+jitter(i,8)]].map(p=>[Number(p[0].toFixed(6)),Number(p[1].toFixed(6))]);
  const fn=functions[(i*7+r)%functions.length],statusKey=statusFor(i),n=i+1;
  const areaHa=Number((2.2+((i*37)%50)/10).toFixed(2));
  const input:any={lotNumber:'M-'+String(n).padStart(3,'0'),title:`${fn} — M-${String(n).padStart(3,'0')}`,function:fn,functionSecondary:i%4===0?'Savdo-sotiq, oziq-ovqat':'',functionShare:i%4===0?80:0,statusKey,areaHa,floorsMin:i%3?2:0,floorsMax:/turar|ofis|mehmon/i.test(fn)?5+(i%9):/yashil|park/i.test(fn)?0:2+(i%4),buildingAreaM2:Math.round(areaHa*10000*0.35),grossAreaM2:Math.round(areaHa*10000*1.1),openAreaM2:Math.round(areaHa*10000*0.3),kmn:30+(i%5)*5,umn:Number((1.5+(i%6)*0.4).toFixed(1)),description:i%5===0?'Infratuzilma (suv, elektr, yo‘l) ulangan. Mock ma’lumot.':'',geometry:{type:'Polygon',coordinates:[[...ring,ring[0]]]},published:true};
  if(statusKey==='listed'){const deadline=days(2+(i%15));input.auction={lotId:String(7000+n),name:`Auksion №${7000+n}`,applicationDeadline:deadline,startsAt:days(5+(i%15)),startPrice:{amount:String((900+((i*53)%700))*1000000)+'.00',currency:'UZS'}}}
  if(statusKey==='sold'){const start=(800+((i*29)%600))*1000000;input.company=companies[i%companies.length];input.auction={lotId:String(6000+n),name:`Auksion №${6000+n}`,startPrice:{amount:start+'.00',currency:'UZS'},result:{winner:input.company,winningPrice:{amount:Math.round(start*1.18)+'.00',currency:'UZS'}}}}
  if(statusKey==='ready'||statusKey==='pending'||statusKey==='reserved'){input.auction={lotId:String(5000+n),startPrice:{amount:String((700+((i*41)%500))*1000000)+'.00',currency:'UZS'}};if(statusKey==='pending')input.auction.applicationDeadline=days(-3);if(statusKey==='reserved')input.company=companies[(i+3)%companies.length]}
  const r2=normalizePlot(input);if('error' in r2)throw new Error(`Hudud ${input.lotNumber}: ${r2.error}`);
  plots.push(r2.doc);
}

// ---------- Qatlamlar ----------
const rect=(x:number,y:number,w:number,h:number)=>({type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y-h],[x,y-h],[x,y]]]});
const layerInputs:any[]=[
  {title:'Hududlar infratuzilmasi',description:'Shahar va yo‘l infratuzilmasi ta’minlanishi (yillar bo‘yicha).',color:'#e04f5f',opacity:0.28,type:'fill',placement:'panel',defaultOn:true,published:true,labelProperty:'name',groupProperty:'year',features:[
    ['A hudud','26-27',-0.026,0.019],['B hudud','27-28',-0.002,0.019],['C hudud','28-29',0.022,0.019]].map(([name,year,dx,dy])=>({type:'Feature',properties:{name,year},geometry:rect(L0+(dx as number),B0+(dy as number),0.022,0.036)}))},
  {title:'Loyiha hududlari',description:'Birinchi bosqich hududlari va loyihalari.',color:'#3b82f6',opacity:0.2,type:'fill',placement:'panel',defaultOn:false,published:true,labelProperty:'name',features:[{type:'Feature',properties:{name:'1-bosqich'},geometry:rect(L0-0.024,B0+0.016,0.026,0.02)}]},
  {title:'Tumanlar bo‘yicha zonalash',description:'Hududiy bo‘linish (sxema).',color:'#2e9d5b',opacity:0.22,type:'fill',placement:'panel',defaultOn:false,published:true,labelProperty:'name',features:[{type:'Feature',properties:{name:'Shimoliy zona'},geometry:rect(L0-0.03,B0+0.03,0.06,0.02)},{type:'Feature',properties:{name:'Janubiy zona'},geometry:rect(L0-0.03,B0-0.012,0.06,0.02)}]},
  {title:'Metro',description:'Metro-1 (M1) · sxema · bekatlar: 6',color:'#2a6df4',type:'line',pointStyle:'chip',placement:'toolbar',defaultOn:true,published:true,labelProperty:'name',linkLabel:'Butun yo‘nalish',linkUrl:'/infrastructure',features:(()=>{const pts=[[-0.034,0.012],[-0.022,0.006],[-0.01,0.001],[0.004,-0.004],[0.018,-0.011],[0.032,-0.018]].map(([dx,dy])=>[L0+dx,B0+dy]);return [{type:'Feature',properties:{name:'Metro-1'},geometry:{type:'LineString',coordinates:pts}},...pts.map((p,i)=>({type:'Feature',properties:{name:'M1-'+(i+1)},geometry:{type:'Point',coordinates:p}}))]})()},
  {title:'Halqa yo‘l (loyiha)',description:'Taxminiy yo‘nalish (sxema), tasdiqlangan loyiha emas.',color:'#e8891b',type:'line',pointStyle:'chip',placement:'toolbar',defaultOn:false,published:true,labelProperty:'name',features:[{type:'Feature',properties:{name:'Halqa yo‘l'},geometry:{type:'LineString',coordinates:[[L0-0.034,B0-0.02],[L0-0.01,B0-0.024],[L0+0.014,B0-0.022],[L0+0.034,B0-0.012]]}},{type:'Feature',properties:{name:'Shirin kirish'},geometry:{type:'Point',coordinates:[L0+0.034,B0-0.012]}}]},
];

// ---------- Murojaatlar, vazifalar, foydalanuvchilar ----------
const appealsData=[['Yo‘l qoplamasi haqida','Mahalladagi yo‘l qoplami shikastlangan, ta’mirlash so‘raladi.','closed','Murojaatingiz ko‘rib chiqildi: ta’mirlash ishlari reja asosida bajariladi.'],['Suv ta’minoti','Ba’zi kunlari suv bosimi past.','progress',''],['Hudud auksioni','Auksionda qatnashish tartibi haqida ma’lumot kerak.','closed','Tartib «Hujjatlar» bo‘limida va hudud kartasida bor.'],['Yoritish','Ko‘cha chiroqlari kechqurun yonmayapti.','new',''],['Maktab o‘rni','Yangi kampusda o‘quvchi o‘rni bormi?','progress',''],['Taklif','Sayr yo‘lagiga velosiped yo‘lagi qo‘shish taklifi.','new','']];
const tasksData=[['Birinchi bosqich qurilish nazorati','Aziz Karimov',12,'progress',45],['Auksion hujjatlarini tayyorlash','Sardor Tursunov',6,'new',10],['Aholi murojaatlari hisoboti','Madina Yusupova',3,'progress',70],['Yo‘l qoplamasi tenderi','Dilnoza Rahimova',-2,'progress',60],['Veb-portalni yangilash','Digital Shirin',20,'new',0],['Sayr yo‘lagi ochilishi tayyorgarligi','Madina Yusupova',-10,'closed',100]];

// ---------- Ishga tushirish ----------
const db=async(n:string)=>col(n);
async function removeMock(){
  const mm=await db('members');const mock=await mm.find({mock:true}).project({id:1}).toArray();
  await (await db('content')).deleteMany({id:/^mock-/});
  await (await db('plots')).deleteMany({author:AUTHOR});
  await (await db('map_layers')).deleteMany({author:AUTHOR});
  await (await db('appeals')).deleteMany({id:/^mock-/});
  await (await db('tasks')).deleteMany({id:/^mock-/});
  await (await db('audit')).deleteMany({id:/^mock-/});
  if(mock.length){await (await db('sessions')).deleteMany({memberId:{$in:mock.map(m=>m.id)}});await mm.deleteMany({mock:true})}
  console.log('Avvalgi mock yozuvlar o‘chirildi');
}
if(reset)await removeMock();
if(process.argv.includes('--only-reset')){await closeDb();process.exit(0)}

const contentCol=await db('content'),stamp=iso(now);
await contentCol.bulkWrite(content.map(c=>({updateOne:{filter:{id:c.id},update:{$set:{id:c.id,kind:c.kind,title:c.title,summary:c.summary,body:c.body??(c.summary+'\n\nBu material mock (namuna) ma’lumot sifatida yaratilgan.'),image:c.image??'',category:c.category,status:c.status??'published',data:JSON.stringify({sample:true,...(c.data||{})}),author:AUTHOR,updated:stamp,note:''}},upsert:true}})));
console.log('Kontent:',content.length);

const plotCol=await db('plots');
for(const p of plots)await plotCol.updateOne({lotNumber:p.lotNumber,author:AUTHOR},{$set:{...p,updated:stamp},$setOnInsert:{id:uid(),author:AUTHOR,created:stamp}},{upsert:true});
console.log('Hududlar:',plots.length);

// Kontent obyektlarini hududlarga bog'lash (plotId)
const byNo=new Map((await plotCol.find({author:AUTHOR}).project({id:1,lotNumber:1}).toArray()).map(p=>[p.lotNumber,p.id]));
for(const [cid,no] of [['mock-l1','M-014'],['mock-l2','M-033'],['mock-l3','M-052'],['mock-l5','M-071']]){
  const c=await contentCol.findOne({id:cid});if(!c||!byNo.get(no))continue;
  const d=JSON.parse(c.data);delete d.lat;delete d.lng;d.plotId=byNo.get(no);
  await contentCol.updateOne({id:cid},{$set:{data:JSON.stringify(d)}});
}

const layerCol=await db('map_layers');let order=0;
for(const li of layerInputs){
  const r=normalizeLayer(li);if('error' in r)throw new Error(`Qatlam «${li.title}»: ${r.error}`);
  await layerCol.updateOne({title:li.title,author:AUTHOR},{$set:{...r.doc,order:order++,updated:stamp},$setOnInsert:{id:uid(),author:AUTHOR,created:stamp}},{upsert:true});
}
console.log('Qatlamlar:',layerInputs.length);

const settings=await db('settings');
const cfg=sanitizeMapConfig({title:'Shirin massivi hududlari xaritasi',subtitle:'Samarqand viloyati · investitsiya hududlari',cta:{label:'Shiringa investitsiya kiriting',href:'/investment',items:[{label:'Investor yo‘riqnomasi',href:'/documents'},{label:'Murojaat yuborish',href:'/contact'},{label:'Hamkorlar',href:'/partners'}]},investors:{visible:true,title:'Investorlar va hamkorlar',text:'Hamkorlar ro‘yxati',href:'/partners'},objects:{visible:true,title:'Xaritadagi obyektlar'}},defaultMapConfig);
await settings.updateOne({key:'map:config'},{$set:{value:JSON.stringify(cfg)}},{upsert:true});
await settings.updateOne({key:'initialized'},{$set:{value:'true'}},{upsert:true});
await settings.updateOne({key:'map:revision'},{$set:{value:uid().replace(/-/g,'').slice(0,24)}},{upsert:true});

// Foydalanuvchilar (faqat mock): admin — ichki statistika; fuqaro — murojaat yuboruvchi
const members=await db('members'),pw=await hashPassword('Mock-12345');
const ensure=async(login:string,name:string,role:string)=>{
  const ex=await members.findOne({email:login});
  if(ex)return ex.id as string;
  const id=uid();await members.insertOne({id,user_id:null,email:login,name,role,active:1,created:stamp,passwordHash:pw,mock:true});return id;
};
const adminId=await ensure('admin','Mock Admin','admin'),citizenId=await ensure('fuqaro','Mock Fuqaro','visitor');
await settings.updateOne({key:'stats:'+adminId},{$set:{value:JSON.stringify(['content','construction','investments','appeals','tasks'])}},{upsert:true});

const appeals=await db('appeals');
for(const [i,[topic,message,status,response]] of appealsData.entries())await appeals.updateOne({id:'mock-a'+(i+1)},{$set:{id:'mock-a'+(i+1),user_id:citizenId,name:'Mock Fuqaro',phone:'+998 90 123 45 6'+i,topic,message,status,response,created:days(-12+i*2),updated:days(-6+i)}},{upsert:true});
const tasks=await db('tasks');
for(const [i,[title,owner,d,status,progress]] of tasksData.entries())await tasks.updateOne({id:'mock-t'+(i+1)},{$set:{id:'mock-t'+(i+1),title,owner,deadline:day(Number(d)),status,progress,description:title+' bo‘yicha vazifa (mock).',updated:stamp}},{upsert:true});
const audit=await db('audit');
for(const [i,[actor,action,target]] of ([['kontent','Material yaratildi','Shirin massivida birinchi bosqich…'],['kontent','Hudud tahrirlandi','M-014'],['superadmin','Foydalanuvchi huquqlari yangilandi','admin'],['kontent','Xarita qatlami yaratildi','Metro'],['superadmin','Mock ma’lumotlar yuklandi','seed-mock']] as string[][]).entries())await audit.updateOne({id:'mock-au'+(i+1)},{$set:{id:'mock-au'+(i+1),actor,action,target,created:days(-i)}},{upsert:true});
console.log('Murojaatlar:',appealsData.length,' Vazifalar:',tasksData.length);
console.log('Tayyor. Mock foydalanuvchilar: admin / fuqaro — parol: Mock-12345');
await closeDb();
