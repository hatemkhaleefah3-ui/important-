/* Temporary inline English-to-Arabic translation for lecture text. */
(() => {
'use strict';
const blockSelector='p,li,td,th,dd,dt,h1,h2,h3,h4,.step-process-result,.step-process-identity,.step-process-subtitle';
const excludedSelector='a,button,input,textarea,select,label,[contenteditable="true"]';
const wordCharacter=/[\p{L}\p{N}\p{M}'’-]/u;
const encoder=new TextEncoder(),cache=new Map();
const caretAt=(x,y)=>{
  if(document.caretRangeFromPoint)return document.caretRangeFromPoint(x,y);
  if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){const r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true);return r}}
  return null;
};
const chunksOf=(text,maxBytes=450)=>{
  const pieces=text.match(/\S+\s*/g)||[text],chunks=[];let current='';
  for(const piece of pieces){
    if(encoder.encode(current+piece).length<=maxBytes){current+=piece;continue}
    if(current)chunks.push(current.trim());current='';
    if(encoder.encode(piece).length<=maxBytes){current=piece;continue}
    let part='';for(const character of piece){if(encoder.encode(part+character).length>maxBytes){chunks.push(part);part=''}part+=character}current=part;
  }
  if(current.trim())chunks.push(current.trim());return chunks;
};
const decodeEntities=value=>{const node=document.createElement('textarea');node.innerHTML=value;return node.value};
const translate=async text=>{
  if(cache.has(text))return cache.get(text);
  const translated=[];
  for(const chunk of chunksOf(text)){
    const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(chunk)+'&langpair=en%7Car';
    const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw Error('Translation request failed.');
    const data=await response.json(),value=data?.responseData?.translatedText;
    if(typeof value!=='string'||!value.trim())throw Error('Translation response was empty.');translated.push(decodeEntities(value.trim()));
  }
  const result=translated.join(' ');cache.set(text,result);return result;
};
window.installLectureSelection=(article,root)=>{
  if(!article||article.dataset.translationSelection==='true')return;
  article.dataset.translationSelection='true';
  const hint=document.createElement('div');hint.className='selection-translate-hint';hint.hidden=true;hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');root.append(hint);
  let active=null,pendingTimer=0,requestId=0,taps={count:0,time:0,x:0,y:0,block:null};
  const eligible=target=>target instanceof Element&&article.contains(target)&&!target.closest(excludedSelector);
  const message=(text,timeout=0)=>{hint.textContent=text;hint.hidden=false;if(timeout)setTimeout(()=>{if(hint.textContent===text)hint.hidden=true},timeout)};
  const clearSelection=()=>{const selection=getSelection();if(selection)selection.removeAllRanges()};
  const cancelPending=()=>{clearTimeout(pendingTimer);pendingTimer=0;requestId++};
  const restore=()=>{
    cancelPending();if(active){active.restore();active=null}clearSelection();hint.hidden=true;
  };
  const selectRange=range=>{const selection=getSelection();selection.removeAllRanges();selection.addRange(range)};
  const wordRange=(x,y)=>{
    const range=caretAt(x,y);if(!range||range.startContainer.nodeType!==Node.TEXT_NODE||!article.contains(range.startContainer))return null;
    const text=range.startContainer.data;let start=Math.min(range.startOffset,text.length),end=start;if(start===text.length&&start>0)start--;
    while(start>0&&wordCharacter.test(text[start-1]))start--;end=Math.max(end,start);while(end<text.length&&wordCharacter.test(text[end]))end++;
    if(start===end)return null;range.setStart(range.startContainer,start);range.setEnd(range.startContainer,end);return range;
  };
  const insertWordTranslation=(range,arabic)=>{
    const original=range.extractContents(),span=document.createElement('span');span.className='inline-translation inline-translation-word';span.lang='ar';span.dir='rtl';span.textContent=arabic;range.insertNode(span);
    active={restore:()=>{if(span.isConnected)span.replaceWith(original)}};clearSelection();message('Arabic translation - click anywhere or scroll to restore English.');
  };
  const insertParagraphTranslation=(block,arabic)=>{
    const original=document.createDocumentFragment();while(block.firstChild)original.append(block.firstChild);
    const span=document.createElement('span');span.className='inline-translation inline-translation-paragraph';span.lang='ar';span.dir='rtl';span.textContent=arabic;block.append(span);
    active={restore:()=>{if(block.isConnected)block.replaceChildren(original)}};clearSelection();message('Arabic paragraph - click anywhere or scroll to restore English.');
  };
  const requestWord=(x,y)=>{
    cancelPending();const range=wordRange(x,y);if(!range)return;selectRange(range);const text=range.toString().trim(),token=++requestId;
    message('Translating word to Arabic...');
    pendingTimer=setTimeout(async()=>{pendingTimer=0;try{const arabic=await translate(text);if(token!==requestId||!range.startContainer.isConnected)return;insertWordTranslation(range,arabic)}catch{if(token===requestId){clearSelection();message('Translation is unavailable. Try again.',3500)}}},330);
  };
  const requestParagraph=async target=>{
    cancelPending();const block=target.closest(blockSelector);if(!block||!article.contains(block))return;const text=block.textContent.trim();if(!text)return;
    const range=document.createRange();range.selectNodeContents(block);selectRange(range);const token=++requestId;message('Translating paragraph to Arabic...');
    try{const arabic=await translate(text);if(token!==requestId||!block.isConnected)return;insertParagraphTranslation(block,arabic)}catch{if(token===requestId){clearSelection();message('Translation is unavailable. Try again.',3500)}}
  };
  document.addEventListener('pointerdown',event=>{if(active){restore();return}if(pendingTimer)cancelPending()},true);
  window.addEventListener('scroll',()=>{if(active||pendingTimer)restore()},{passive:true,capture:true});
  article.addEventListener('mousedown',event=>{if(eligible(event.target)&&event.detail>=2)event.preventDefault()},true);
  article.addEventListener('click',event=>{
    if(!eligible(event.target))return;
    if(event.detail===2){event.preventDefault();requestWord(event.clientX,event.clientY)}
    else if(event.detail>=3){event.preventDefault();requestParagraph(event.target)}
  });
  article.addEventListener('pointerup',event=>{
    if(event.pointerType==='mouse'||!eligible(event.target))return;
    const now=Date.now(),block=event.target.closest(blockSelector),near=Math.hypot(event.clientX-taps.x,event.clientY-taps.y)<24;
    if(now-taps.time<430&&near&&block===taps.block)taps.count++;else taps.count=1;
    taps.time=now;taps.x=event.clientX;taps.y=event.clientY;taps.block=block;
    if(taps.count===2)requestWord(event.clientX,event.clientY);
    else if(taps.count>=3){requestParagraph(event.target);taps.count=0}
  },{passive:true});
};
})();
