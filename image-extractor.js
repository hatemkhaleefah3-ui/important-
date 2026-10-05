/* Resolves schema image placeholders from a user-provided PDF, PPTX, or DOCX. */
(() => {
'use strict';
const mimeByExtension={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'};
const extension=path=>(path.split('.').pop()||'').toLowerCase();
const normalizePath=(base,target)=>{
  const parts=(base+target).split('/'),result=[];
  for(const part of parts){if(!part||part==='.')continue;if(part==='..')result.pop();else result.push(part)}return result.join('/');
};
const xml=text=>new DOMParser().parseFromString(text,'application/xml');
const relationships=document=>new Map([...document.getElementsByTagNameNS('*','Relationship')].map(node=>[node.getAttribute('Id'),node.getAttribute('Target')]));
const imageIds=document=>[...document.getElementsByTagNameNS('*','blip')].map(node=>node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed')||node.getAttribute('r:embed')).filter(Boolean);
const bitmapFrom=async blob=>{
  if('createImageBitmap' in window)try{return await createImageBitmap(blob)}catch{}
  return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('This image format cannot be rendered in the browser.'))};image.src=url});
};
const resizedCanvas=(source,width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);return canvas};
const encodeWithin=async(source,target)=>{
  let canvas=source,best='';const qualities=[.82,.7,.58,.46,.36,.28];
  for(let round=0;round<6;round++){
    for(const quality of qualities){let value=canvas.toDataURL('image/webp',quality);if(!value.startsWith('data:image/webp'))value=canvas.toDataURL('image/jpeg',quality);if(!best||value.length<best.length)best=value;if(value.length<=target)return value}
    if(canvas.width<=420&&canvas.height<=420)break;
    const ratio=Math.max(.62,Math.min(.84,Math.sqrt(target/best.length)*.94)),width=Math.max(1,Math.round(canvas.width*ratio)),height=Math.max(1,Math.round(canvas.height*ratio));canvas=resizedCanvas(canvas,width,height)
  }
  if(best.length>target)throw Error('An extracted image could not be compressed enough for the long lecture link. Use a tighter crop for this image.');return best;
};
const compressBlob=async(blob,target)=>{
  const bitmap=await bitmapFrom(blob),scale=Math.min(1,1200/bitmap.width,1000/bitmap.height),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale)),canvas=resizedCanvas(bitmap,width,height);bitmap.close?.();return encodeWithin(canvas,target);
};
const zipImage=async(zip,path,target)=>{
  const entry=zip.file(path);if(!entry)throw Error('Image file not found in lecture archive: '+path);
  const mime=mimeByExtension[extension(path)];if(!mime)throw Error('Unsupported embedded image format: '+extension(path)+'. Use PNG, JPEG, GIF, WebP, or SVG.');
  return compressBlob(await entry.async('blob').then(blob=>new Blob([blob],{type:mime})),target);
};
const pptxPath=async(zip,source)=>{
  if(source.media)return 'ppt/media/'+source.media.replace(/^.*[\\/]/,'');
  const slide='ppt/slides/slide'+source.slide+'.xml',rels='ppt/slides/_rels/slide'+source.slide+'.xml.rels';
  const slideEntry=zip.file(slide),relsEntry=zip.file(rels);if(!slideEntry||!relsEntry)throw Error('Slide '+source.slide+' was not found in the PPTX.');
  const [slideXml,relsXml]=await Promise.all([slideEntry.async('text'),relsEntry.async('text')]),ids=imageIds(xml(slideXml)),id=ids[source.image-1];
  if(!id)throw Error('Image '+source.image+' was not found on slide '+source.slide+'.');const target=relationships(xml(relsXml)).get(id);if(!target)throw Error('The PPTX image relationship is missing.');return normalizePath('ppt/slides/',target);
};
const docxPath=async(zip,source)=>{
  if(source.media)return 'word/media/'+source.media.replace(/^.*[\\/]/,'');
  const documentEntry=zip.file('word/document.xml'),relsEntry=zip.file('word/_rels/document.xml.rels');if(!documentEntry||!relsEntry)throw Error('The DOCX document relationships are missing.');
  const [documentXml,relsXml]=await Promise.all([documentEntry.async('text'),relsEntry.async('text')]),ids=imageIds(xml(documentXml)),id=ids[source.image-1];
  if(!id)throw Error('Image '+source.image+' was not found in DOCX document order.');const target=relationships(xml(relsXml)).get(id);if(!target)throw Error('The DOCX image relationship is missing.');return normalizePath('word/',target);
};
const pdfImage=async(file,source,target)=>{
  const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs';
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;if(source.page>pdf.numPages)throw Error('PDF page '+source.page+' does not exist; the file has '+pdf.numPages+' pages.');
  const page=await pdf.getPage(source.page),crop=source.crop||[0,0,1,1],base=page.getViewport({scale:1});let scale=Math.min(2.5,1200/(base.width*crop[2]),Math.sqrt(16000000/(base.width*base.height)));scale=Math.max(1,scale);
  const viewport=page.getViewport({scale}),render=document.createElement('canvas');render.width=Math.ceil(viewport.width);render.height=Math.ceil(viewport.height);await page.render({canvasContext:render.getContext('2d',{alpha:false}),viewport}).promise;
  const sx=Math.round(render.width*crop[0]),sy=Math.round(render.height*crop[1]),sw=Math.max(1,Math.round(render.width*crop[2])),sh=Math.max(1,Math.round(render.height*crop[3])),resize=Math.min(1,1200/sw,1000/sh),output=document.createElement('canvas');output.width=Math.max(1,Math.round(sw*resize));output.height=Math.max(1,Math.round(sh*resize));const context=output.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,output.width,output.height);context.drawImage(render,sx,sy,sw,sh,0,0,output.width,output.height);page.cleanup();pdf.cleanup?.();return encodeWithin(output,target);
};
const sourceLabel=source=>source.fileType==='pdf'?'PDF page '+source.page+(source.crop?' crop '+source.crop.join(', '):''):source.fileType==='pptx'?'PPTX slide '+source.slide+', '+(source.media||'image '+source.image):'DOCX '+(source.media||'image '+source.image+' in document order');
window.resolveLectureImages=async(data,file,onProgress=()=>{})=>{
  const blocks=data.blocks.filter(block=>block.type==='image');if(!blocks.length)return data;if(!file)throw Error('Select the source PDF, PPTX, or DOCX required by the image placeholders.');
  const expected=new Set(blocks.map(block=>block.source.fileType));if(expected.size!==1)throw Error('All image placeholders in one lecture must use the same source file type.');const kind=[...expected][0],actual=extension(file.name);if(actual!==kind)throw Error('This JSON expects a .'+kind+' source file, but '+file.name+' was selected.');if(file.size>50*1024*1024)throw Error('Use a source lecture file smaller than 50 MB.');
  const result=structuredClone(data);let zip=null;if(kind!=='pdf'){if(!window.JSZip)throw Error('Office image extractor did not load.');zip=await window.JSZip.loadAsync(await file.arrayBuffer())}
  const images=result.blocks.filter(block=>block.type==='image'),target=Math.min(280000,Math.floor(1120000/images.length));for(let index=0;index<images.length;index++){const block=images[index];onProgress('Extracting and optimizing image '+(index+1)+' of '+images.length+': '+block.processName);block.imageData=kind==='pdf'?await pdfImage(file,block.source,target):await zipImage(zip,kind==='pptx'?await pptxPath(zip,block.source):await docxPath(zip,block.source),target);block.sourceLabel=sourceLabel(block.source)}
  const bytes=images.reduce((sum,block)=>sum+block.imageData.length,0);if(bytes>1150000)throw Error('The optimized images are still too large for a reliable long lecture link. Use fewer placeholders or tighter crops.');return result;
};
})();
