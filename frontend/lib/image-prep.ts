// Reja rasmini (JPG/PNG/WEBP yoki PDF sahifasi) xaritaga yuklashga tayyorlaydi: PDF sahifa rasmga aylantiriladi,
// katta rasm 4096 px gacha kichraytiriladi. Hammasi brauzerda bajariladi.
export type Prepared={blob:Blob;width:number;height:number;pages:number;ext:'jpg'|'png'};
const MAX_SIDE=4096;

const toBlob=(canvas:HTMLCanvasElement,type:string,q:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Rasmni tayyorlab bo‘lmadi')),type,q));

export async function prepareImage(file:File,page=1):Promise<Prepared>{
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))return renderPdf(file,page);
  if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Faqat JPG, PNG, WEBP yoki PDF fayl yuklang.');
  const bmp=await createImageBitmap(file);
  const scale=Math.min(1,MAX_SIDE/Math.max(bmp.width,bmp.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(bmp.width*scale);canvas.height=Math.round(bmp.height*scale);
  const ctx=canvas.getContext('2d')!;ctx.drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close?.();
  const keepPng=file.type==='image/png'&&scale===1&&file.size<4*1024*1024;
  const blob=await toBlob(canvas,keepPng?'image/png':'image/jpeg',0.9);
  return {blob,width:canvas.width,height:canvas.height,pages:1,ext:keepPng?'png':'jpg'};
}

async function renderPdf(file:File,page:number):Promise<Prepared>{
  const pdfjs:any=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs'; // npm install paytida public/vendor ga ko'chiriladi
  const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const pages=doc.numPages as number;
  const p=await doc.getPage(Math.min(Math.max(1,Math.round(page)||1),pages));
  const base=p.getViewport({scale:1});
  const viewport=p.getViewport({scale:Math.min(4,MAX_SIDE/Math.max(base.width,base.height))});
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  await p.render({canvasContext:ctx,viewport}).promise;
  const blob=await toBlob(canvas,'image/jpeg',0.9);
  doc.destroy?.();
  return {blob,width:canvas.width,height:canvas.height,pages,ext:'jpg'};
}
