# Shirin shahar portali

Loyiha ikkita mustaqil qismga ajratilgan:

- `frontend/` — Vinext/React interfeys (SSR, 5 til, admin panel). Bazaga to'g'ridan-to'g'ri ulanmaydi; `/api/*` so'rovlarini backendga uzatadi.
- `backend/` — Node.js API server (`src/server.ts`, `src/api.ts`): rollar/ruxsatlar va **MongoDB** baza. Yuklangan fayllar MongoDB GridFS'da (`files` bucket) saqlanadi.

Ikkala qism ham o'z `package.json`iga ega va alohida o'rnatiladi/ishga tushiriladi. `frontend/lib` va `backend/src/shared` ichidagi `data`, `i18n`, `locales`, `site-config`, `map-data`, `permissions` fayllari ikkala tomonda nusxa sifatida bor; ularni o'zgartirsangiz ikkalasida ham yangilang.

## MongoDB kolleksiyalari
`members`, `content`, `appeals`, `tasks`, `audit`, `settings`, `assets` + GridFS (`files.files`, `files.chunks`). Indekslar (`id`, `email`, `user_id` unikal va h.k.) server ishga tushganda avtomatik yaratiladi. Hujjat maydonlari avvalgi SQL ustunlari bilan bir xil (`id`, `user_id`, `data` — JSON matn).

## Kirish (login / parol)
- Kirish **login + parol** bilan (login email bo'lishi shart emas: 3–64 belgi, harf, raqam va `. _ - @`; kichik-katta harf farqlanmaydi). Hisoblar `members` kolleksiyasida (login `email` maydonida saqlanadi): xodimlar (`superadmin`, `admin`, `manager`) va ro'yxatdan o'tgan tashrifchilar (`visitor`). Parol scrypt bilan xeshlanadi, ochiq saqlanmaydi.
- `POST /api/auth/login`, `/register` (tashrifchilar), `/logout`, `/password`. Sessiya — 7 kunlik HttpOnly cookie (`shirin_session`, SameSite=Lax; HTTPS da Secure); bazada faqat token xeshi saqlanadi.
- Himoya: bir loginga 15 daqiqada 5 ta xato urinishdan keyin bloklanadi; ro'yxatdan o'tish soatiga 30 ta bilan cheklangan; bloklangan hisob kira olmaydi.
- Frontend `/api/*` so'rovlarini cookie bilan backendga uzatadi (`BACKEND_URL`, `BACKEND_SECRET`); backend `X-Internal-Secret` (= `API_SHARED_SECRET`) bo'lmagan so'rovni rad etadi. Ruxsatlar har so'rovda bazadan tekshiriladi.
- Sahifalar: `/admin` (xodimlar kirishi), `/login` (tashrifchilar: kirish va ro'yxatdan o'tish).

## Lokal ishga tushirish
1. MongoDB ishlab turishi kerak (lokal `mongod` yoki Atlas). Backend: `cd backend && npm install`, `.env.example` dan `.env` yarating (`MONGODB_URI`, `API_SHARED_SECRET`, `OWNER_*`), `npm run dev` (http://127.0.0.1:8787).
2. Frontend: `cd frontend && npm install`, `.dev.vars.example` dan `.dev.vars` yarating (BACKEND_SECRET = backenddagi `API_SHARED_SECRET`), `npm run dev`.

## Deploy
- Backend: istalgan Node.js 22+ serverda (`npm install`, `.env` da `MONGODB_URI`, `API_SHARED_SECRET`, `HOST=0.0.0.0`, `PORT`), `npm start`. Backendga faqat frontend orqali kirilsin (xavfsizlik devori / yopiq tarmoq).
- Frontend: hostingda `BACKEND_URL` (backend manzili) va `BACKEND_SECRET` (maxfiy) o'zgaruvchilarini bering.

## Tekshirish
- Backend: `npm run typecheck`, `npm run check` (haqiqiy MongoDB'da — mongodb-memory-server — API xavfsizlik tekshiruvlari; birinchi marta mongod yuklab oladi).
- Frontend: `npx tsc --noEmit`, `node scripts/localization-check.mjs`.

Quyida — funksional tavsif (yo'llar yangi tuzilmaga moslab o'qilsin: eski `lib/`, `app/portal.tsx` → `frontend/lib/`, `frontend/features/portal.tsx`; eski `app/api/.../route.ts` → `backend/src/api.ts`; `db/` → `backend/src/db/`).

Ko‘p sahifali shahar portali va serverda tekshiriladigan rollar asosidagi boshqaruv markazi.

## Bo‘limlar

`/` bosh sahifa, `/about`, `/projects`, `/investment`, `/map`, `/infrastructure`, `/construction`, `/news`, `/events`, `/documents`, `/partners`, `/contact`, `/my-appeals`.
Loyiha va kontent tafsilotlari `/<bo‘lim>/<id>` manzillarida ochiladi.

`/admin` umumiy panel, `/admin/leader`, `/admin/content`, `/admin/projects`, `/admin/lots`, `/admin/infrastructure`, `/admin/zones`, `/admin/media`, `/admin/appeals`, `/admin/tasks`, `/admin/reports`, `/admin/users`, `/admin/audit`, `/admin/settings`.

## Ishni boshlash

1. Backend `.env` fayliga `OWNER_LOGIN`, `OWNER_PASSWORD` (kamida 8 belgi) va `OWNER_NAME` yozing. Superadmin bo'lmasa, server ishga tushganda shu hisob yaratiladi. Keyin `/admin` da shu email va parol bilan kiring.
2. Bosh sahifadagi «Namuna kontent yuklash» tugmasi namunalarni bir marta bazaga yozadi. Muqobil ravishda materiallarni mustaqil yaratish mumkin.
3. Foydalanuvchilar bo'limida ism, email, rol va **boshlang'ich parol** kiriting; parolni xodimga o'zingiz yetkazasiz (email xabari yuborilmaydi). Parol o'zgartirilsa yoki hisob bloklansa, uning sessiyalari tugatiladi.
4. Menejer kontent yaratadi va tasdiqlashga yuboradi. Leader yoki superadmin uni nashr qiladi yoki izoh bilan qaytaradi.

## Rollar

- Superadmin: barcha kontent, foydalanuvchi rollari/faolligi, sozlamalar, o‘chirish, tasdiqlash, vazifalar, murojaatlar, hisobotlar.
- Leader: kontentni ko‘rish va tasdiqlash/qaytarish; vazifalar, murojaatlar, hisobot va amallar jurnali. Kontent matni yoki foydalanuvchi huquqlarini tahrirlamaydi.
- Kontent menejeri: barcha kontent bo‘limlarida yaratish/tahrirlash, qoralama va tasdiqlash navbati. Nashr, foydalanuvchilar va murojaatchilar ma’lumotlariga ruxsat yo‘q.
- Tashrifchi: nashr qilingan kontent, o‘z murojaatlari va javoblari.

## Texnik asos

Vinext / React / TypeScript (frontend), Node.js + MongoDB (backend). Platforma autentifikatsiyasi, server RBAC, origin tekshiruvi, foydalanuvchi ID bo‘yicha murojaatlar maxfiyligi. Kontent matni React orqali escape qilinadi. Media manzillarida HTTPS va loyihadagi `/assets/` yo‘llarigagina ruxsat beriladi.

`backend/src/db.ts` MongoDB ulanishi va indekslarni, `backend/src/api.ts` server amallarini, `*/permissions.ts` ruxsatlarni, `frontend/features/portal.tsx` interfeysni belgilaydi. Ilk Express/Mongoose manbalari mahalliy `original/` papkasida saqlangan; `.env` va boshqa original fayllar Git va nashr tarkibiga kiritilmagan.

## Tekshirish

- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run check` (backend) — vaqtinchalik MongoDB (mongodb-memory-server) da API tekshiruvlari; haqiqiy API kodi ishlatiladi.
- Build Sites build helper orqali bajariladi.

## Hozirgi chegaralar

- O‘zbek lotin interfeysi; boshqa tillar hali qo‘shilmagan.
- Boshlang‘ich material va shahar tasvirlari namuna, tasdiqlangan Shirin renderlari emas.
- Xarita ikkita rejimda ishlaydi: illyustrativ bosh reja va OpenStreetMap geografik xaritasi. Obyektga latitude/longitude yoki yopiq GeoJSON Polygon biriktirish mumkin. Koordinatasi yo‘q obyektlar geografik rejimda joylashtirilmaydi. Qidiruv, kategoriya/holat filtrlari, zoom/pan, nomlarni yoqish va obyekt kartochkasi mavjud. Rasmiy kadastr yoki jonli auksion integratsiyasi yo‘q.
- Media HTTPS URL orqali biriktiriladi; bevosita fayl yuklash hali ulanmagan.
- Murojaat javobi portalda ko‘rinadi; SMS/email integratsiyasi yo‘q.
- Hisobotlar bazadagi material, vazifa va murojaatlardan hisoblanadi; tashriflar analitikasi yo‘q.
- Ishlab chiqarish serveriga Express/Mongo ko‘chirish alohida moslashtirishni talab qiladi.

## CMS, media and investor map update

Admin → Sayt boshqaruvi controls branding, images, navigation, page copy, contact/official information, SEO metadata, canonical domain, Google verification. Content includes photos, videos, cameras, before/after comparisons, custom pages, leadership, reports, tenders, vacancies and FAQs. Managers prepare draft/review content, leaders approve, and superadmins manage settings, users and deletion.

Media uploads persist to MongoDB GridFS (25 MB per image/video/PDF). Draft-only files require staff access; publication or a site-settings reference makes a file public. Byte range responses support video seeking. Referenced files cannot be deleted. Investor contact/contract fields are stripped from public responses; the investor display name is public only when explicitly enabled.

Public routes include /live (HLS/YouTube), /compare (keyboard-accessible slider), /photos, /videos, /official, /search and /site-map. All maps (/map and /masterplan «Bosh reja») open one OpenStreetMap-based map (MapLibre); Google Maps and the illustrative plan image were removed. Boundaries require real WGS84 GeoJSON Polygon data or coordinates. Sample plan positions are not cadastral boundaries.

SEO includes server-rendered published content, metadata, robots.txt, sitemap.xml and RSS. Indexing is enabled by default for public launch; administrators can disable it. Google does not guarantee instant indexing. Domain configuration is not domain purchase or DNS provisioning. A selected, registered domain and supported hosting DNS setup remain external prerequisites.

Production inputs still required: selected paid domain; organization identity and approved official documents; actual camera HLS/YouTube URLs; current photographs and future renderings; verified plot boundaries and authorized investor display data. Do not put camera passwords or server API secrets in content fields.

Official compliance is not certified. The former Uzbekistan decree 355 is repealed (https://lex.uz/uz/docs/-2315190). Requirements depend on the legal entity; decree 81 applies to business entities with state participation (https://lex.uz/uz/acts/-5298939). An organization-specific legal review and complete factual disclosures are still necessary.

Validation: 57 actual API-handler checks against SQLite and a mock object store cover existing role/appeal rules plus uploads, published-file visibility, HEAD/range responses, investor privacy and settings sanitization. TypeScript and production build are checked. Browser visual QA was unavailable in this environment. Real Google Maps, cameras and custom-domain connections cannot be verified before their production inputs are provided.

## Five languages and dark appearance

The public portal and staff interfaces support Uzbek Latin (`uz`), Uzbek Cyrillic (`uz-Cyrl`), Russian (`ru`), English (`en`) and simplified Chinese (`zh`). The header offers language and Light/Dark/System controls. Locale persists in a cookie and shareable `?lang=` URLs; appearance persists locally and follows OS changes in System mode. Published content is server-rendered in the selected locale. Metadata and sitemap alternate links cover all five languages.

Admin → Tillar va tarjimalar manages interface translations, localized site information, menu labels, default language and default appearance. The bundled dictionary contains 783 source entries (including technical tokens); Cyrillic uses transliteration with per-string editorial overrides. Content editors have separate locale tabs for title, summary, full body, category and applicable captions. Missing editorial translations fall back to the source language; entering arbitrary new Uzbek content does not automatically produce Russian/English/Chinese translations. Review translated content before official publication.

Content managers can now update content-facing site settings and translations. API keys, canonical domain, Search Console and indexing permissions remain superadmin-only. Roles and review/publication gates remain server-enforced. Translation fields are allowlisted and size-limited; locale payloads cannot add private investor fields or modify permissions.

Validation for this update: 66 API authorization/persistence checks, 85 server renders across all five locales (15 public routes and two editor surfaces), dictionary coverage checks, TypeScript and production build. Visual browser QA remains unavailable in this environment.

## Role model — 2026-10-20

This section supersedes earlier role/review restrictions:

- Content manager (`manager`): full daily site operation, content creation/editing/publication/unpublication/deletion, referenced-file-safe media deletion, map/camera/investor management, translations, site/SEO/integration settings, appeals and tasks. Cannot manage members or access the private statistics endpoint.
- Admin (`admin`): read-only aggregated statistics. Superadmin selects each admin's permitted sections: content, construction, investments, appeals, tasks. New admins default to content/construction/investments; an empty selection grants no sections. No raw content, draft files, appeal identities/messages, investor identities/contracts, member list or audit data is returned in the admin dashboard. All mutations remain forbidden.
- Superadmin: retains full oversight and is the only role allowed to create/update/block staff, assign roles and choose admin statistic scopes. The default superadmin page is Users. An account cannot remove its own superadmin role or deactivate itself.
- Legacy persisted `leader` accounts resolve to read-only `admin` without deleting/recreating users. New assignments use `admin`. Permissions are resolved from the current database on every request; client-supplied role claims are not trusted.

Statistics are calculated from stored records (including demonstration content) and are not visitor analytics. They are never included in /api/public, SSR public data or files. Per-member scope configuration is stored in separate settings keys and never serialized as public site settings.

Validation: 76 API checks cover role isolation, changing/revoking statistic scopes, account blocking, legacy role behavior, privacy, independent manager publishing/deletion, upload protection, CSRF and translated content. Five-language SSR checks and production build also pass. Browser visual QA was unavailable.

## Uchastkalar (lot) xaritasi
- **Texnologiya:** frontend MapLibre GL 4.7.1 + OpenStreetMap asosi (`frontend/features/lots-map.tsx`); ma'lumot MongoDB `plots` kolleksiyasida (`backend/src/plots.ts`).
- **Ommaviy API:** `GET /api/map/lots.geojson` (faqat nashr qilinganlar, `ETag` = revision) va `GET /api/map/metadata` (revision, holatlar soni, umumiy maydon, bbox, yo'nalishlar). Frontend har 30 soniyada revisionni tekshiradi, o'zgarsa qayta yuklaydi.
- **Ma'lumot to'ldirish (admin → «Uchastkalar xaritasi», kontent menejer ham ishlata oladi):** admin bo'limi xaritaning o'zida ishlaydi — matn yozish shart emas.
  1. *Chizish:* «Yangi uchastka» → xaritada burchaklarni ketma-ket bosish → «Chizishni tugatish» (maydon avtomatik hisoblanadi).
  2. *Tahrirlash:* uchastkani xaritadan yoki ro'yxatdan tanlash → «Chegarani tahrirlash» → nuqtalarni sudrash; chiziq ustini bosib yangi nuqta qo'shish; nuqtaga ikki marta bosib o'chirish; «Qayta chizish».
  3. *Import:* «Import / eksport» → namuna fayl → o'z GeoJSON faylini tanlash → xaritada oldindan ko'rish va server tekshiruvi (hech narsa yozilmaydi) → «Import qilish». `lotNumber` bir xil bo'lsa yangilanadi; KML/DWG eksportidagi maydon nomlari ham taniladi (`Lot raqami`, `Funksiya 1`, `Yer maydoni (ga)`, `auctionStatus`).
  4. *Ommaviy amallar:* ro'yxatda bir nechta uchastkani belgilab, holatni o'zgartirish yoki ko'rsatish/yashirish. Saqlanmagan o'zgarish haqida ogohlantirish bor; qoralamalar xaritada xira va chiziqli ko'rinadi.
  5. *Eksport:* barcha uchastkalarni GeoJSON qilib yuklab olish.
- **Holatlar:** noma'lum, kelajakda auksionga qo'yiladi, sotuvga qo'yilmaydi, auksion e'lon qilingan, auksion kutilmoqda, auksionga tayyor, to'lov kutilmoqda, sotilgan, band qilingan. Ariza muddati o'tgan «e'lon qilingan» uchastka avtomatik «kutilmoqda» ko'rinadi.
- **Auksion bloki:** lot raqami, ariza muddati (teskari hisob), boshlanish, boshlang'ich narx, g'olib, yakuniy narx, natija hujjati, auksion sahifasiga havola (HTTPS).
- **Ruxsat:** yozish faqat `superadmin` va `manager`; qoralama (nashr qilinmagan) uchastkalar ommaga chiqmaydi.

## Xarita sahifasi (to'liq ekran) va uni sozlash
`/map` (va `/masterplan`, `/investment`) — to'liq ekranli xarita: tepada sarlavha, til/mavzu, «Ko'rinish» va «Yo'riqnoma»; ostida «Qidiruv va filtrlar» tugmasi, **holat tugmalari (sonlari bilan)** va qatlam yoqish tugmalari; chapda **qatlam kartalari**; o'ngda tanlangan uchastka parametrlari, statistika va investorlar kartasi. Telefonda panellar siljitiladigan yoki ochiladigan bo'lib joylashadi.

**Kontent menejer admin → «Xarita» bo'limida sozlaydi** (uch tab):
- **Uchastkalar** — chizish, tahrirlash, GeoJSON import, ommaviy amallar (yuqorida tavsiflangan).
- **Qatlamlar** — zonalar, yo'llar, metro, infratuzilma va h.k.: GeoJSON yuklanadi (Polygon / LineString / Point). Har qatlam uchun: nom, izoh, rang, shaffoflik, qayerda ko'rinishi (chap karta yoki yuqoridagi yoqish tugmasi), boshida yoqilganligi, nashr, tartib (yuqoriga/pastga), nom maydoni (xaritada yozuv) va **guruhlash maydoni** (masalan `year` → kartada «26-27», «27-28» filtr tugmalari). Obyektga bosilsa, xossalari oynada ko'rinadi.
- **Ko'rinish va matnlar** — xarita nomi va izohi, «Orqaga» tugmasi, yuqori o'ngdagi tugma (masalan «Investitsiya kiriting»), yordam matni, holat tugmalarini yashirish/nomini va rangini o'zgartirish, qidiruv va statistika kartalari, investorlar kartasi, boshlang'ich ko'rinish (markaz va masshtab).

API: `GET /api/map/config`, `/api/map/layers`, `/api/map/layers/:id` (ommaviy, ETag bilan); `GET/POST /api/mapconfig`, `GET/POST/PATCH/DELETE /api/maplayers[/:id]`, `POST /api/maplayers/reorder` (faqat `superadmin` va `manager`). Qatlam cheklovlari: 5000 obyekt, 6 MB, 300 000 nuqta. Har o'zgarish xarita `revision` ini yangilaydi, ochiq xarita 30 soniyada o'zi yangilanadi.

### Tillar (uz, ўз, ru, en, zh)
Matnlar lug'at orqali tarjima qilinadi: kalit — o'zbek (lotin) matn, qiymat — `en/ru/zh` (`frontend/lib/locales/*.json`); kirill o'zbekchasi lotindan avtomatik o'giriladi. Yangi matn qo'shganingizda `npm run i18n:scan` (frontend) lug'atda yo'q matnlarni ro'yxat qiladi. Sahifa chizilganda tarjimasi topilmagan matn brauzerda `window.__i18nMiss` ga yig'iladi (tekshirish uchun). Tarjima ma'lumotlari: `frontend/scripts/i18n-data/` (`build_*.py` — JSON ni qayta yig'adi). Kontent (yangilik, loyiha…) tarjimasi shu lug'atda yoki materialning «Boshqa tillarga tarjima» bo'limida.

### Boshqaruv paneli tuzilmasi
Yon menyu guruhlarga bo'lingan: **Asosiy** (umumiy ko'rinish, Qo'llanma, murojaatlar, vazifalar, hisobotlar) · **Xarita** (Xaritalar, Hududlar, Holat va toifalar, Qatlamlar, Metro va yo'llar, Xarita ko'rinishi) · **Loyiha va obyektlar** · **Yangiliklar va hujjatlar** · **Rasm va video** · **Sayt** (Asosiy ma'lumot, Rasmlar va slayder, Menyu, Barcha matnlar, Rasmiy ma'lumot, SEO, Tarjimalar, Axborot sahifalari) · **Tizim**. Har bir sahifa tepasida «nima uchun va saytda qayerda ko'rinadi» izohi bor; `Qo'llanma` sahifasi hammasini bir joyda ko'rsatadi. Matnlar: `frontend/features/admin-info.ts`.

### Bosh sahifa slayderi va moslashuvchanlik
- Admin → Sayt boshqaruvi → Rasmlar → «Bosh sahifa slayderi»: bir nechta rasm, GIF yoki qisqa video (MP4/WEBM, ovozsiz o'ynaydi) yuklanadi, tartibi va almashish vaqti sozlanadi (`heroSlides`, `heroInterval`). Slayd bo'sh bo'lsa «Bosh sahifa katta rasmi» ishlatiladi. Katta blok sahifa kengligida to'liq turadi; «harakatni kamaytirish» sozlamasida avtomatik almashmaydi.
- Sayt telefon (≥360 px), planshet va kompyuterda tekshirilgan; xarita pastki kartalari telefonda ixcham, jadvallar gorizontal siljiydi.

### Qo'shimcha fayllar (taqdimot, PDF, hujjat)
Har bir material (yangilik, loyiha, tadbir, hujjat…) formasida «Qo'shimcha fayllar» bo'limi bor: PPTX, PPT, PDF, DOCX, DOC, XLSX, XLS (bitta fayl — 100 MB gacha, rasm/video — 25 MB). Fayllar `data.attachments` da saqlanadi va material sahifasida «Qo'shimcha materiallar» (yuklab olish / PDF ochish) bo'lib chiqadi. Yuklash: `POST /api/upload` (kengaytma va fayl boshi tekshiriladi). **Muhim:** frontend `next.config.ts` dagi `serverActions.bodySizeLimit` (110 MB) o'zgargach `npm run dev` ni qayta ishga tushiring — aks holda 1 MB dan katta fayl 413 xatosi bilan rad etiladi.

### Haqiqiy ma'lumotlarni kiritish (`shirin_malumotlar`)
`cd backend && npm run import:shirin` — «shirin_malumotlar» papkasidagi maʼlumotnoma, taqdimot, SNOS jadvali va rasmlardan sahifalar, loyihalar, infratuzilma, yangiliklar, hamkorlar, hujjatlar, rasmlar va savol-javoblarni kiritadi (`shirin-` ID, muallif `shirin-import`), sayt matnlari va bosh sahifa rasmlarini yangilaydi. Qayta ishga tushirsa, yozuvlarni yangilaydi; `-- --reset` faqat o'zi kiritganini o'chiradi. Kichraytirilgan rasmlar `shirin_malumotlar/_prepared` da. Mock yozuvlarni olib tashlash: `npm run seed:mock -- --reset`.

### Admin → Xarita bo'limi (yon menyuda alohida sahifalar)
**Xaritalar** · **Hududlar** (xaritadagi lotlar) · **Holat va toifalar** · **Qatlamlar va reja rasmi** · **Metro va yo'llar** · **Xarita ko'rinishi**.
- *Hudud* = avvalgi «uchastka». Kontentdagi eski «Hududlar» turi «Zonalar» deb nomlandi.
- *Holat va toifalar:* menejer tizim holatlarining nomi/rangini o'zgartiradi, o'z holatlarini qo'shadi (`customStatuses`, kalit `c-xxxxxx`), toifalar ro'yxatini (`categories`: turar-joy, noturar-joy, restoran…) yaratadi va xarita boshlang'ich ranglanishini (`colorBy`: holat yoki toifa) tanlaydi. Foydalanuvchi xaritada ham ikkalasini almashtira oladi. O'chirilgan maxsus holatdagi hududlar «Ma'lumot yo'q»ga o'tadi.

### Alohida xaritalar va qatlamni chizish
- **Xaritalar** (admin → Xarita va uchastkalar → «Xaritalar»): bir nechta alohida xarita (`/map`, `/map/<nom>`). Har birida: nom, izoh, uchastkalar ko'rinishi, obyekt turlari va qatlamlar to'plami tanlanadi. Birinchi xarita — `/map`ning o'zi. Xaritalar yaratilmagan bo'lsa, hamma narsa bitta xaritada ko'rinadi. API: `maps*` (admin), `GET /api/map/maps` (ommaviy), MongoDB `map_maps`.
- **Bog'lash:** qatlam kartasidagi havola va har bir bekat/nuqta tayyor ro'yxatdan (uchastka, loyiha/material, sayt sahifasi) yoki tashqi havolaga bog'lanadi. Xaritada nuqtani bossangiz, «Batafsil» havolasi chiqadi.
- **Chizish:** Qatlamlar → «Chizishni boshlash»: metro/yo'l yo'nalishi va bekatlar GeoJSON faylsiz xaritada chiziladi (sudrab surish, o'ng tugma bilan nuqtani o'chirish).

### Kontent obyektlari xaritada
Loyihalar, infratuzilma, hududlar va investitsiya obyektlari (admin → Kontent) OpenStreetMap xaritasida ham ko'rinadi: obyektda **nuqta** (latitude/longitude), **tayyor uchastka** (`plotId`) yoki **GeoJSON chegara** bo'lsa. Kontent formasida joylashuv xaritani bosib belgilanadi (marker sudralib to'g'rilanadi), uchastka esa ro'yxatdan tanlanadi. Chap tomonda «Xaritadagi obyektlar» kartasi turlar bo'yicha yoqish/o'chirish imkonini beradi; obyektga bosilsa nom, qisqa matn va «Batafsil» havolasi chiqadi; qidiruv obyektlarni ham topadi. Admin → Xarita → «Ko'rinish va matnlar» da turlarning nomi, rangi va ko'rinishi sozlanadi. Joylashuvi belgilanmagan obyektlar xaritada chiqmaydi.

## Generplan (PDF / JPG) ni xaritaga qo'yib, ustidan lotlarni chizish
Joylashuv: Samarqand viloyati, Shirin massivi (≈ 39.7123°N, 67.0015°E) — xarita shu yerda ochiladi (admin → Xarita → «Ko'rinish va matnlar» da o'zgartiriladi).
1. **Reja rasmini joylashtirish** (admin → Xarita → «Reja rasmi (PDF/JPG)»): generplan faylini (`.jpg`, `.png`, `.webp` yoki `.pdf` — PDF ning kerakli sahifasi rasmga aylantiriladi) tanlang. Rasm xaritada paydo bo'ladi: 1–4 raqamli burchaklarni sudrab (yo'l, daryo, bino kabi aniq belgilarga qarab) haqiqiy joyiga moslang; ✥ belgisi rasmni siljitadi; tugmalar kattalashtiradi/kichraytiradi/buradi; slayder shaffoflikni o'zgartiradi. Saqlanganda rasm serverga yuklanadi (yuklash cheklovi 25 MB — rasm avtomatik 4096 px gacha kichraytiriladi). «Ommaga ko'rsatish» belgilansa, ochiq xaritada qatlam kartasi (shaffoflik slayderi bilan) chiqadi.
2. **Lotlarni chizish** (admin → Xarita → «Uchastkalar»): joylashtirilgan reja rasmi chizish xaritasida fon bo'lib ko'rinadi (pastki chapda yoqish/o'chirish va shaffoflik). «Yangi uchastka» → konturni rasm ustidan bosib chizing → «Chizishni tugatish» → raqam/nom/holat → **«Saqlash va keyingisini chizish»**: uchastka saqlanadi, keyingi raqam o'zi qo'yiladi (L-007 → L-008) va darhol chizish davom etadi.
3. Rasm fayli xarita qatlamiga bog'langan bo'lsa, o'chirib bo'lmaydi; qatlam nashr qilinmaguncha rasm faqat adminlarga ko'rinadi.
Eslatma: PDF ni o'qish uchun `pdf.worker.min.mjs` (`npm install` paytida `public/vendor` ga ko'chiriladi); kutubxona `pdfjs-dist` (Apache-2.0).

### Xaritaning qo'shimcha imkoniyatlari (qatlamlar uchun)
- **Aralash geometriya:** bitta qatlamda chiziq, maydon va nuqta birga bo'lishi mumkin. Nuqtalar chiziq/maydon qatlamida «stansiya» belgisi (oq doira, rangli hoshiya) bo'lib chiqadi.
- **Nomli belgi-chiplar:** qatlamda «Nuqtalar ko'rinishi → Nomli belgi-chip» tanlansa (150 tagacha nuqta), nuqtalar nomi yozilgan chip bo'lib chiqadi (masalan metro bekatlari: M1-1 … M1-9).
- **Ma'lumot kartasi va havola:** qatlamga izoh (description) va havola (matn + manzil) berilsa, qatlam yoqilganda chap tomonda karta chiqadi («Butun yo'nalish ↗»); «Joyiga o'tish» tugmasi xaritani shu qatlamga yaqinlashtiradi.
- **Yuqori tugma menyusi:** admin → Xarita → «Ko'rinish va matnlar» → «Yuqoridagi tugma» ga menyu bandlari qo'shilsa (masalan Telegram-bot, veb-yordamchi, investor yo'riqnomasi), tugma ochiladigan menyu bo'ladi.
- Yoqilgan toolbar tugmasi qatlam rangida ramka bilan ajraladi.
