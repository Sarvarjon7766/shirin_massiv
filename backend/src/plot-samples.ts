// Namuna hududlar: xarita bo'sh bo'lmasligi uchun (admin «Namuna hududlar yuklash» tugmasi).
// Joylashuv taxminiy (Samarqand viloyati, Shirin massivi atrofi), chegaralar sxematik — kadastr emas.
const CENTER:[number,number]=[66.9985,39.7145];
const PLAN:[string,string,number,number][]=[
  ['Kop qavatli turar-joy','planned',9,0],['Ofis','ready',12,0],['Yashil ochiq maydon','not-planned',0,0],['Ijtimoiy obyekt(Maktab)','planned',3,0],['Savdo markazi','listed',5,0],
  ['Mehmonxona','planned',8,0],['Kop qavatli turar-joy','sold',9,0],['Sanoat','unknown',4,0],['Ijtimoiy obyekt(Bogcha)','planned',2,0],['Ofis','planned',10,0],
  ['Yakka tartibdagi turar-joy, kottej','planned',3,0],['Tuman parki','not-planned',0,0],['Savdo markazi','planned',4,0],['Kop qavatli turar-joy','ready',12,0],['Madaniyat markazi','planned',3,0],
  ['Ofis','pending',7,0],['Utilitalar','not-planned',1,0],['Kop qavatli turar-joy','planned',9,0],['Mehmonxona','reserved',6,0],['Sport majmuasi','planned',2,0],
];
export function samplePlots(){
  const cols=5,w=0.0058,h=0.0042,gap=0.0007;
  return PLAN.map(([fn,statusKey,floorsMax],i)=>{
    const c=i%cols,r=Math.floor(i/cols);
    const x=CENTER[0]+c*(w+gap),y=CENTER[1]-r*(h+gap);
    const j=(n:number)=>((i*7+n*13)%5-2)*0.00012; // kichik siljish — chegara to'g'ri to'rtburchak bo'lmasin
    const ring=[[x+j(1),y+j(2)],[x+w+j(3),y+j(4)],[x+w+j(5),y-h+j(6)],[x+j(7),y-h+j(8)]].map(p=>[Number(p[0].toFixed(6)),Number(p[1].toFixed(6))]);
    const areaM2=Math.round(w*84900*h*110540);
    return {
      lotNumber:'N-'+String(i+1).padStart(2,'0'),title:'Namuna: '+fn,function:fn,statusKey,floorsMax,
      areaM2,areaHa:Number((areaM2/10000).toFixed(2)),
      description:'Namuna hudud — tizim imkoniyatlarini ko‘rsatish uchun. Haqiqiy ma’lumot bilan almashtiring.',
      geometry:{type:'Polygon',coordinates:[[...ring,ring[0]]]},published:true,
    };
  });
}
