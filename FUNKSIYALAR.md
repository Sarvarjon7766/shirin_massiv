# Shirin portali — to‘liq funksional tavsif

Samarqand viloyati «Shirin» shaharchasi uchun ommaviy axborot portali, investitsiya xaritasi va boshqaruv paneli. Hujjat 2026-yil oktabr holatidagi haqiqiy tizim asosida yozilgan.

## 0. Umumiy tuzilma
- **Ikki mustaqil loyiha:** `frontend/` (sayt va boshqaruv paneli, SSR, React) va `backend/` (API, Node.js + MongoDB, fayllar GridFS’da). Ular faqat HTTP orqali va umumiy maxfiy kalit (`X-Internal-Secret`) bilan bog‘lanadi.
- **Xarita:** MapLibre GL + OpenStreetMap; uchastka (hudud) chegaralari, qatlamlar, rasm qoplamalari.
- **Tillar:** o‘zbek (lotin), o‘zbek (kirill), rus, ingliz, xitoy.
- **Ma’lumotlar bazasi:** MongoDB; kolleksiyalar — `members`, `sessions`, `content`, `plots`, `map_layers`, `map_maps`, `appeals`, `tasks`, `audit`, `assets`, `settings` va fayllar (`files`).

---

## 1. Ommaviy sayt (tashrifchi uchun)

### 1.1 Sahifalar
Bosh sahifa `/`, Shaharcha haqida `/about`, Loyihalar `/projects` (+ har bir loyiha sahifasi va monitoringga havola), investitsiya hududlari, istiqbolli loyihalar va hamkorlar birlashtirilgan Investitsiya `/investment`, Xarita `/map` va `/map/<nom>`, Infratuzilma, Yangiliklar va hujjatlar `/news` (eski `/documents` manzili ham ishlaydi), Tadbirlar, Galereya `/gallery` (foto va videolar; eski `/photos` va `/videos` manzillari ham ishlaydi), Jonli kameralar `/live`, Hozir va kelajak `/compare` (eski sahifa, menyuda ko‘rsatilmaydi), Qurilish jarayoni va loyihalar monitoringi `/construction`, Axborot sahifalari, Rahbariyat, Ochiq hisobotlar, Tenderlar, Bo‘sh ish o‘rinlari, Savol-javob, Qidiruv `/search`, Rasmiy ma’lumot `/official`, Sayt xaritasi `/site-map`, Maxfiylik, Aloqa `/contact`, Kirish `/login`, Murojaatlarim `/my-appeals`. Texnik: `/rss.xml`, `/sitemap.xml`, `/robots.txt`. Eski `/masterplan` xaritaga yo‘naltiradi.

### 1.2 Bosh sahifa
- To‘liq kenglikdagi katta blok: **slayder** (bir nechta rasm, GIF yoki ovozsiz video), nuqtalar, oldingi/keyingi va to‘xtatish tugmalari, almashish vaqti sozlanadi; «harakatni kamaytirish» sozlamasi hurmat qilinadi.
- Tezkor havolalar (Loyihalar, Investitsiya, Xarita, Qurilish jarayoni), shaharcha haqida qisqa blok, investitsiya, yangiliklar, tadbirlar, hamkorlar bloklari, bosh reja rasmi va xaritaga havola.

### 1.3 Kontent bo‘limlari (18 tur)
Loyihalar, Investitsiya hududlari (eski), Infratuzilma, Yangiliklar, Tadbirlar, Hujjatlar, Hamkorlik, Zonalar, Fotogalereya, Videogalereya, Jonli kameralar, Hozir va kelajak, Axborot sahifalari, Rahbariyat, Ochiq hisobotlar, Tenderlar, Bo‘sh ish o‘rinlari, Savol-javob.
- Har bir bo‘limda ro‘yxat sahifasi (kartochkalar, qidiruv/filtr) va material sahifasi (rasm to‘liq o‘z nisbatida, matn, yon panelda holat/maydon/sana/kod, «Xaritada ko‘rish», «Ma’lumot so‘rash» tugmalari). Fotogalereya va videogalereya ommaviy saytda yagona `/gallery` sahifasida ko‘rsatiladi.
- **Qo‘shimcha materiallar:** materialga biriktirilgan taqdimot (PPTX), PDF, Word, Excel yuklab olinadi yoki ochiladi.
- Video: fayl (MP4/WEBM), HLS jonli efir yoki YouTube; kameralar HLS orqali.
- «Hozir va kelajak»: ikki rasmni surgich bilan solishtirish.

### 1.4 Investitsiya sahifasi
`/investment` bitta sahifada investitsiya hududlari katalogi, istiqbolli loyihalar va hamkorlik imkoniyatlarini birlashtiradi. Xaritadagi hududlarning jadval ko‘rinishi yagona manbadan olinadi: qidiruv, holat bo‘yicha filtr (sonlari bilan), maydon, boshlang‘ich narx, ariza muddati, holati; qator bosilsa xaritada o‘sha hudud ochiladi.

### 1.5 Qidiruv va murojaat
- Butun sayt bo‘yicha qidiruv (`/search`, yuqori navigatsiyadan ochiladi; barcha ommaviy materiallar bo‘yicha).
- **Murojaat yuborish:** ism, telefon, mavzu, matn, rozilik; hududdan «Shu hudud haqida so‘rash» orqali hudud avtomatik biriktiriladi; soatiga 5 tadan ortiq yuborib bo‘lmaydi.
- **Shaxsiy kabinet «Murojaatlarim»:** holati (yangi / ko‘rib chiqilmoqda / yakunlangan) va rasmiy javob.

### 1.6 Tillar, mavzu, qulaylik
- 5 til, har bir sahifada til menyusi; sayt matni, material mazmuni, xato xabarlari, sana/raqam formatlari tilga moslashadi (1 600 dan ortiq matn tarjimasi).
- Yorug‘ / tizim / tungi mavzu.
- **Maxsus imkoniyatlar:** katta shrift, yuqori kontrast, matnni ovozda o‘qish; klaviatura navigatsiyasi, «asosiy mazmunga o‘tish» havolasi.
- **Moslashuvchan dizayn:** telefon, planshet, kompyuter, keng monitor; asosiy navigatsiya, qidiruv, aloqa va murojaat havolalari bitta yuqori qatorda jamlangan (telefonda ochiladigan menyu).
- Yumshoq navigatsiya: sahifalar o‘tishida butun sahifa qayta yuklanmaydi.

### 1.7 SEO va texnik
Sarlavha/tavsif sozlamalari, kanonik domen, indekslash yoqish/o‘chirish, RSS, sitemap, robots.txt, Search Console tasdig‘i.

---

## 2. Interaktiv xarita (ommaviy, `/map`)

### 2.1 Asosiy imkoniyatlar
- To‘liq ekranli OpenStreetMap xaritasi: yaqinlashtirish, joylashuvni aniqlash, masshtab chizg‘ichi, © belgisi (o‘ng pastki burchakda).
- **Hududlar (lotlar)** holat rangida: bosilganda kartochka — raqam, nom, asosiy/qo‘shimcha vazifa va ulushi, maydon (ga va m²), qavatlar, qurilish/umumiy/ochiq maydon, KMN/UMN, kompaniya, toifalar, tavsif; «havolani nusxalash», «shu hudud haqida so‘rash», yangilangan vaqt.
- **Auksion bloki:** lot raqami, nomi, ariza muddatigacha jonli taymer, auksion boshlanishi, boshlang‘ich va yakuniy narx, g‘olib, natija hujjati, auksion sahifasiga havola. Ariza muddati o‘tgan e’lon qilingan hudud avtomatik «Auksion kutilmoqda» holatiga o‘tadi.
- **Holat tugmalari** (sonlari bilan) va **qidiruv/filtr paneli:** raqam, nom, kompaniya, auksion lot raqami; holat va toifa bo‘yicha saralash; filtrga qarab xarita ko‘rinishi moslashadi.
- **Ranglash:** «Holat bo‘yicha» yoki «Toifa bo‘yicha» (turar-joy, noturar-joy, restoran, tashkilotlar…); foydalanuvchi o‘zi almashtira oladi.
- Umumiy statistika kartalari: filtrdagi hududlar soni va umumiy maydoni.
- **Ulashiladigan havolalar:** `?lot=<hudud>` va `?obj=<material>` — ochilganda xarita o‘sha joyga o‘tadi.
- Ma’lumot avtomatik yangilanadi (har 30 soniyada o‘zgarish tekshiriladi, o‘zgarish bo‘lsa yangilanadi).

### 2.2 Qatlamlar va obyektlar
- **Qatlam turlari:** maydon (zona), chiziq (yo‘l, metro), nuqta, rasm (reja/generplan).
- Qatlamlar chap panelda yoki yuqoridagi tugma sifatida yoqiladi/o‘chiriladi; yil kabi maydon bo‘yicha guruh filtri; «joyiga o‘tish»; havola tugmasi; qatlam qidiruvi (ko‘p bo‘lsa).
- **Nuqtalar (metro bekatlari):** doira belgi, nomi sichqoncha ustiga borganda ko‘rinadi (telefonda bosilganda); havolasi bo‘lsa «Batafsil» bilan oyna ochiladi.
- **Kontent obyektlari** (loyiha, infratuzilma, zona, lot) xaritada: joylashuvi, tayyor hududi yoki chegarasi bo‘yicha; raqamli rangli belgilar, toifa menyusi, raqamlangan ro‘yxat, bosilganda ma’lumot oynasi va «Batafsil».
- **Reja rasmi** tugma bo‘lib yoqiladi (shaffofligi administratorda saqlangan).

### 2.3 Bir nechta alohida xarita
`/map/<nom>`: har bir xaritada o‘z nomi, izohi, qaysi hududlar/obyekt turlari/qatlamlar ko‘rinishi va boshlang‘ich joyi; yuqorida xaritalar almashtirgichi; tanlanmagan bo‘lsa — hammasi bitta xaritada.

### 2.4 Boshqa
Yuqori o‘ngda sozlanadigan tugma va ochiladigan menyu (masalan «Shiringa investitsiya kiriting» → hujjatlar, murojaat, hamkorlar), «Yo‘riqnoma» oynasi, «Investorlar va hamkorlar» kartasi, sozlanadigan sarlavha/izoh, menyular tashqariga bosilganda yoki Esc bilan yopiladi.

---

## 3. Boshqaruv paneli (`/admin`)

### 3.1 Rollar va ruxsatlar
- **Superadmin** (hamma narsa; yangisi API orqali yaratilmaydi), **Kontent menejer** (material, xarita, media, sayt sozlamalari, murojaat/vazifa), **Admin** (statistika, ko‘rish), **Tashrifchi** (panelga kira olmaydi).
- Material holatlari: qoralama → tasdiqlashga yuborish → nashr qilingan / qaytarilgan; menejer o‘zi nashr qila oladi.
- Statistika bo‘limlari (kontent, qurilish, investitsiya, murojaat, vazifa) har bir foydalanuvchi uchun alohida ruxsat etiladi.

### 3.2 Yon menyu (alohida sahifalar)
**Asosiy:** Umumiy ko‘rinish, Qo‘llanma, Murojaatlar, Vazifalar, Hisobotlar · **Xarita:** Xaritalar, Hududlar, Holat va toifalar, Qatlamlar va reja rasmi, Metro va yo‘llar, Xarita ko‘rinishi · **Loyiha va obyektlar:** Loyihalar, Infratuzilma, Zonalar · **Yangiliklar va hujjatlar:** Yangiliklar, Tadbirlar, Hujjatlar, Hamkorlar, Savol-javob, Tenderlar, Vakansiyalar, Rahbariyat, Barcha materiallar · **Rasm va video:** Fotogalereya, Videogalereya, Jonli kameralar, Hozir va kelajak, Media kutubxonasi · **Sayt:** Asosiy ma’lumot, Rasmlar va slayder, Menyu, Barcha matnlar, Rasmiy ma’lumot, SEO, Tarjimalar, Axborot sahifalari · **Tizim:** Foydalanuvchilar, Amallar jurnali, Ichki statistika.
Har sahifa tepasida «nima uchun va saytda qayerda ko‘rinadi» izohi; «Qo‘llanma» sahifasi butun panelning xaritasi.

### 3.3 Materiallar (CMS)
- Har bir tur uchun alohida tayyor forma (faqat kerakli maydonlar): sarlavha, qisqa/to‘liq matn, toifa, rasm, tur bo‘yicha maydonlar (sana, joy, bajarilganlik %, maydon, video manzili, hujjat, oldin/keyin rasmlari…).
- **Xaritadagi joylashuv:** xaritadan nuqta tanlash yoki tayyor hududga bog‘lash; joylashuvsiz material «Xaritada yo‘q» deb belgilanadi.
- **Qo‘shimcha fayllar:** PPTX/PPT, PDF, DOCX/DOC, XLSX/XLS, 12 tagacha, bittasi 100 MB gacha.
- **Tarjima:** har bir material uchun ru/en/zh va kirill; lotindan kirillga o‘girish tugmasi.
- Ro‘yxat: qidiruv, holat filtri, «xaritada bor/yo‘q» belgisi, saytda ochish, tahrirlash, ko‘rib chiqish, o‘chirish.
- Telefonda jadvallar kartochkaga aylanadi.

### 3.4 Xarita boshqaruvi
1. **Xaritalar** — alohida xaritalar yaratish, tartiblash, ommaga ko‘rsatish/yashirish; qaysi hudud, obyekt turi va qatlamlar ko‘rinishi; namunalar (Investitsiya, Bosh reja, Transport).
2. **Hududlar** — xaritada chizish (burchaklarni bosish), nuqtalarni sudrash/qo‘shish/o‘chirish, maydon avtomatik hisoblanadi, «saqlab, keyingisini chizish»; maydonlar: raqam, nom, vazifa(lar), ulush, qavatlar, qurilish/umumiy/ochiq maydon, KMN/UMN, kompaniya, toifalar, tavsif, auksion (lot, nom, havola, muddat, boshlanish, narx, valyuta, natija: g‘olib/narx/hujjat); ommaviy amallar (holat, ko‘rsatish/yashirish, o‘chirish); qidiruv va holat filtri; **GeoJSON import** (oldindan tekshirish, mavjudlarini almashtirish, darhol ko‘rsatish; namuna fayl) va eksport; reja rasmi fon sifatida; namuna hududlar yuklash.
3. **Holat va toifalar** — 9 ta tizim holati (nomi, rangi, ko‘rinishi sozlanadi) + o‘zingiz yaratadigan holatlar (20 gacha); toifalar (40 gacha, rangli, tartiblanadi) va tayyor namunalar; xarita boshlang‘ich ranglash usuli.
4. **Qatlamlar va reja rasmi** — GeoJSON qatlam yuklash (maydonlar, guruhlash, nom maydoni), rang, shaffoflik, joylashuv, havola, tartib; **reja rasmi (JPG/PNG/PDF)** — PDF sahifasini tanlash, xaritada 4 burchak bilan haqiqiy joyga moslash, siljitish, burish, shaffoflik.
5. **Metro va yo‘llar** — xaritada chizish: yo‘nalish, bekatlar, nom berish, sudrash, o‘chirish, oxirgi nuqtani qaytarish; reja rasmi fon sifatida; bekatga havola (hudud, material, sahifa yoki tashqi).
6. **Xarita ko‘rinishi** — sarlavha, izoh, «Orqaga» tugmasi, yuqori tugma va menyu, yo‘riqnoma matni, statistika kartalari, obyekt turlari, boshlang‘ich joy va masshtab.
- **Bog‘lash tanlagichi:** qatlam yoki bekat hududga, loyiha/materialga, sayt sahifasiga yoki tashqi havolaga bog‘lanadi.

### 3.5 Murojaat, vazifa, hisobot, statistika
- **Murojaatlar:** ro‘yxat, qidiruv, holat filtri, javob yozish (yakunlash uchun javob majburiy), hududga o‘tish.
- **Vazifalar:** kanban (yangi / jarayonda / yakunlangan), mas’ul, muddat, foiz, muddati o‘tganlarni ajratish.
- **Hisobotlar** va **ichki statistika** (ruxsat doirasida), CSV eksport.

### 3.6 Media kutubxonasi
Rasm, video, PDF yuklash (rasm/video 25 MB, hujjat 100 MB); ishlatilmaydiganini o‘chirish (ishlatilayotgan fayl o‘chirilmaydi).

### 3.7 Sayt sozlamalari (6 alohida sahifa)
Asosiy ma’lumot (nom, shior, telefon, email, manzil, haqida matni) · Rasmlar va slayder (logotip, katta slayder, haqida/bosh reja rasmlari) · Menyu (bandlarni yashirish/nomlash/tillar) · Barcha matnlar (tayyor yozuvlarni o‘zgartirish) · Rasmiy ma’lumot (tashkilot, ish vaqti, maxfiylik matni) · SEO va integratsiyalar. **Tarjimalar** — sayt matnlarining ru/en/zh tarjimalarini qo‘lda yozish.

### 3.8 Foydalanuvchilar va jurnal
Foydalanuvchi qo‘shish/bloklash/rol/parol/statistika ruxsati; so‘nggi 100 ta amalning jurnali (kim, nima, qachon).

### 3.9 Qulayliklar
Tungi/yorug‘ mavzu va til, telefonda kartochka ko‘rinishidagi jadvallar, saqlanmagan o‘zgarish ogohlantirishi, «saqlandi — qayerga» xabari.

---

## 4. Kirish va xavfsizlik
- **Login + parol** (email shart emas); parol scrypt bilan xeshlanadi; HttpOnly cookie sessiya (7 kun), sessiya tokeni bazada faqat xesh sifatida; parol o‘zgarsa/hisob bloklansa barcha sessiyalar tugatiladi.
- 5 ta noto‘g‘ri urinishdan keyin 15 daqiqa blok; ro‘yxatdan o‘tishga cheklov.
- CSRF himoyasi (manba tekshiruvi), so‘rov hajmi cheklovlari, fayl boshi (magic-bytes) va kengaytma tekshiruvi, havolalarni tozalash, GeoJSON/qatlam/xarita ma’lumotlarini server tekshiruvi.
- Frontend va backend o‘rtasida maxfiy kalit; ruxsatlar faqat serverda tekshiriladi.
- 297 ta avtomatik xavfsizlik va mantiq tekshiruvi (rollar, maxfiylik, yuklash, CSRF, xaritalar, holatlar, tarjimalar).

---

## 5. API (backend)
Ommaviy: `public`, `map/lots.geojson` (ETag), `map/metadata`, `map/config`, `map/layers`, `map/layers/:id`, `map/maps`, `map/objects`, `files/:id` (Range, PDF inline / hujjat yuklab olish), `appeals`, `my-appeals`, `auth/*`, `me`.
Boshqaruv: `dashboard`, `content`, `upload`, `assets`, `members`, `tasks`, `statistics`, `settings`, `plots` (CRUD, import, bulk, geojson, sample), `maplayers`, `maps`, `mapconfig`, `seed`.

## 6. Ma’lumot va kontent
- **Haqiqiy ma’lumotlar kiritilgan:** 57 ta material (maʼlumotnoma, taqdimot, SNOS jadvali asosida: bosh reja, bosqichlar, loyihalar, infratuzilma, yangiliklar, hamkorlar, savol-javob), 11 ta rasm, sayt matnlari — rus/ingliz/xitoy tarjimalari bilan. Buyruq: `npm run import:shirin`.
- Namunaviy (mock) ma’lumot generatori: `npm run seed:mock` (`--reset` bilan tozalanadi).

## 7. Tillar va tekshirish vositalari
Lug‘at (`lib/locales`), tarjimasizlarni topuvchi `npm run i18n:scan`, 85 sahifa × 5 til render tekshiruvi, xavfsizlik tekshiruvi `npm run check`.

---

## 8. Hozircha mavjud emas (halollik uchun)
Avtomatik mashina tarjimasi (qo‘lda yoki lug‘at orqali), e-auksion platformasi bilan avtomatik sinxronlash, SMS/email xabarnomalar, DWG/DXF import (olib tashlangan), investorlar katalogi/profillari, onlayn to‘lov, mobil ilova, Telegram-bot, ommaviy ish uchun pullik xarita provayderi (hozir OSM ommaviy serveri), doimiy hosting (hozir mahalliy kompyuter + vaqtinchalik ngrok).
