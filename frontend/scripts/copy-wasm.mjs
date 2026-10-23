// Brauzer kutubxonalarining katta fayllarini public/vendor ga ko'chiradi (shu yerdan yuklanadi):
// - PDF ni rasmga aylantirish uchun pdf.worker.min.mjs
// Paket bo'lmasa — jimgina o'tadi.
import {copyFileSync,mkdirSync,existsSync} from 'node:fs';
const files=[
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs'],
];
for(const [src,dst] of files){
  if(!existsSync(src))continue;
  mkdirSync('public/vendor',{recursive:true});copyFileSync(src,dst);console.log(src.split('/').pop()+' -> public/vendor');
}
