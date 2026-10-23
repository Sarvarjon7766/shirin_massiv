// Boshqaruv paneli sahifalari: nima uchun kerak va qo'shilgan ma'lumot saytda qayerda ko'rinadi.
// «Qo'llanma» sahifasi va har bir sahifa tepasidagi izoh shu yerdan olinadi.
export type AdminInfo={what:string;where:string;href?:string};
export const ADMIN_INFO:Record<string,AdminInfo>={
  overview:{what:'Portalning bugungi holati: materiallar, murojaatlar, vazifalar. Bu yerdan tez qo‘shish mumkin.',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
  statistics:{what:'Ichki statistika: materiallar, qurilish, investitsiya, murojaat va vazifalar bo‘yicha raqamlar.',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
  appeals:{what:'Fuqarolar yuborgan murojaatlar. Ko‘rib chiqing, holatini o‘zgartiring va javob yozing.',where:'Javob fuqaroning «Murojaatlarim» sahifasida ko‘rinadi',href:'/my-appeals'},
  tasks:{what:'Xodimlar uchun ichki vazifalar: kim, qachongacha, qancha bajarildi.',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
  reports:{what:'Boshqaruv hisobotlari: loyihalar, murojaatlar va vazifalar bo‘yicha qisqa ko‘rsatkichlar.',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
  content:{what:'Barcha bo‘limlardagi materiallar bitta ro‘yxatda: qidirish, holat bo‘yicha saralash, tahrirlash va nashr qilish.',where:'Saytda: har bir material o‘z bo‘limida chiqadi'},
  maps:{what:'Alohida xaritalar yarating (Investitsiya, Bosh reja, Metro…) va har birida nimalar ko‘rinishini tanlang.',where:'Saytda: /map, /map/<nom>',href:'/map'},
  plots:{what:'Hududlar (xaritadagi lotlar): chizing yoki import qiling, holati, toifasi, maydoni va auksionini kiriting.',where:'Saytda: /map va /investment',href:'/investment'},
  statuses:{what:'Hudud holatlari (bo‘sh, kutishda, sotuvda…) va toifalari (turar-joy, noturar-joy…): nomi va rangi.',where:'Saytda: xarita tepasidagi tugmalar va filtrlar',href:'/map'},
  layers:{what:'Zona qatlamlari va reja rasmlari (generplan): xaritada yoqiladi/o‘chiriladi.',where:'Saytda: xaritaning chap paneli',href:'/map'},
  transit:{what:'Metro, yo‘l va bekatlarni xaritada chizing, bekatlarga nom bering.',where:'Saytda: xarita tepasidagi tugmalar',href:'/map'},
  mapview:{what:'Xarita sarlavhasi, tugmalari, yo‘riqnomasi va boshlang‘ich joyi.',where:'Saytda: xarita sahifasining tepa qismi',href:'/map'},
  media:{what:'Yuklangan barcha rasm, video va hujjatlar kutubxonasi. Ishlatilmayotganini o‘chirish mumkin.',where:'Fayllar material va sahifalarda ishlatiladi'},
  settings:{what:'Sayt nomi, shior, telefon, email, manzil va «Shaharcha haqida» matni.',where:'Saytda: sarlavha, footer, «Aloqa» va «Shaharcha haqida»',href:'/about'},
  'site-images':{what:'Logotip, bosh sahifa slayderi (rasm, GIF, video), «haqida» va bosh reja rasmlari.',where:'Saytda: bosh sahifaning katta bloki va rasm bloklari',href:'/'},
  'site-menu':{what:'Yuqoridagi asosiy menyu: bandlarni yashirish, nomini o‘zgartirish.',where:'Saytda: har bir sahifaning tepasidagi menyu',href:'/'},
  'site-texts':{what:'Saytdagi tayyor yozuvlar (tugma, sarlavha, izoh) matnini o‘zgartirish.',where:'Saytda: barcha sahifalarda'},
  'site-official':{what:'Tashkilot nomi, ro‘yxatdan o‘tish maʼlumoti, ish vaqti, maxfiylik matni.',where:'Saytda: «Rasmiy maʼlumot» va footer',href:'/official'},
  'site-seo':{what:'Qidiruv tizimlari uchun sarlavha va tavsif, domen va integratsiyalar.',where:'Saytda ko‘rinmaydi: Google va ijtimoiy tarmoqlarda chiqadi'},
  translations:{what:'Saytdagi matnlarning rus, ingliz va xitoy tarjimalarini qo‘lda yozish.',where:'Saytda: til almashtirilganda'},
  users:{what:'Boshqaruvga kiruvchi xodimlar: login, parol va rol (kontent menejer, admin).',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
  audit:{what:'Kim, qachon, nima qilgani: so‘nggi 100 ta amal.',where:'Saytda ko‘rinmaydi (ichki sahifa)'},
};
export const SITE_TABS:Record<string,string>={settings:'general','site-images':'images','site-menu':'navigation','site-texts':'copy','site-official':'official','site-seo':'seo'};
