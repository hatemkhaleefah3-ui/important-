/* Text selection gestures for lecture content. Translation opens in a new tab. */
(() => {
'use strict';
const blockSelector='p,li,td,th,dd,dt,h1,h2,h3,h4,.step-process-result,.step-process-identity,.step-process-subtitle';
const excludedSelector='a,button,input,textarea,select,label,[contenteditable="true"]';
const wordCharacter=/[\p{L}\p{N}\p{M}'’-]/u;
const targetLanguage=()=>{
  let language=(navigator.language||'ar').toLowerCase().split('-')[0];
  if(!/^[a-z]{2,3}$/.test(language)||language==='en')language='ar';
  return language;
};
const languageName=code=>{
  try{return new Intl.DisplayNames([navigator.language||'en'],{type:'language'}).of(code)||code.toUpperCase()}catch{return code.toUpperCase()}
};
const caretAt=(x,y)=>{
  if(document.caretRangeFromPoint)return document.caretRangeFromPoint(x,y);
  if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){const r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true);return r}}
  return null;
};
const pointInside=(range,x,y)=>[...range.getClientRects()].some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);
window.installLectureSelection=(article,root)=>{
  if(!article||article.dataset.translationSelection==='true')return;
  article.dataset.translationSelection='true';
  const hint=document.createElement('div');hint.className='selection-translate-hint';hint.hidden=true;hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');root.append(hint);
  let active=null,hideTimer=0,taps={count:0,time:0,x:0,y:0,block:null};
  const eligible=target=>target instanceof Element&&article.contains(target)&&!target.closest(excludedSelector);
  const show=(range,kind)=>{
    const text=range.toString().trim();if(!text)return;
    active={range:range.cloneRange(),text,selectedAt:Date.now()};
    clearTimeout(hideTimer);hint.textContent=(kind==='paragraph'?'Paragraph':'Word')+' selected - tap it once to translate to '+languageName(targetLanguage());hint.hidden=false;
    hideTimer=setTimeout(()=>{hint.hidden=true},6500);
  };
  const apply=(range,kind)=>{const selection=getSelection();selection.removeAllRanges();selection.addRange(range);show(range,kind)};
  const selectWord=(x,y)=>{
    const range=caretAt(x,y);if(!range||range.startContainer.nodeType!==Node.TEXT_NODE||!article.contains(range.startContainer))return;
    const text=range.startContainer.data;let start=Math.min(range.startOffset,text.length),end=start;
    if(start===text.length&&start>0)start--;
    while(start>0&&wordCharacter.test(text[start-1]))start--;
    end=Math.max(end,start);while(end<text.length&&wordCharacter.test(text[end]))end++;
    if(start===end)return;range.setStart(range.startContainer,start);range.setEnd(range.startContainer,end);apply(range,'word');
  };
  const selectParagraph=target=>{
    const block=target.closest(blockSelector);if(!block||!article.contains(block))return;
    const range=document.createRange();range.selectNodeContents(block);apply(range,'paragraph');
  };
  const translate=()=>{
    if(!active)return;const text=active.text.slice(0,6000),language=targetLanguage();
    const url='https://translate.google.com/?sl=auto&tl='+encodeURIComponent(language)+'&text='+encodeURIComponent(text)+'&op=translate';
    window.open(url,'_blank','noopener,noreferrer');hint.textContent='Opening '+languageName(language)+' translation in a new tab.';clearTimeout(hideTimer);hideTimer=setTimeout(()=>{hint.hidden=true},3500);getSelection().removeAllRanges();active=null;
  };
  article.addEventListener('mousedown',event=>{
    if(!eligible(event.target))return;
    if(event.detail>=2){event.preventDefault();return}
    if(active&&Date.now()-active.selectedAt>500&&pointInside(active.range,event.clientX,event.clientY)){event.preventDefault();event.stopPropagation();translate()}
  },true);
  article.addEventListener('pointerdown',event=>{
    if(!eligible(event.target)||event.pointerType==='mouse')return;
    if(active&&Date.now()-active.selectedAt>500&&pointInside(active.range,event.clientX,event.clientY)){event.preventDefault();event.stopPropagation();translate()}
  },true);
  article.addEventListener('click',event=>{
    if(!eligible(event.target))return;
    if(event.detail===2){event.preventDefault();selectWord(event.clientX,event.clientY)}
    else if(event.detail>=3){event.preventDefault();selectParagraph(event.target)}
  });
  article.addEventListener('pointerup',event=>{
    if(event.pointerType==='mouse'||!eligible(event.target))return;
    const now=Date.now(),block=event.target.closest(blockSelector),near=Math.hypot(event.clientX-taps.x,event.clientY-taps.y)<24;
    if(now-taps.time<430&&near&&block===taps.block)taps.count++;else taps.count=1;
    taps.time=now;taps.x=event.clientX;taps.y=event.clientY;taps.block=block;
    if(taps.count===2)selectWord(event.clientX,event.clientY);
    else if(taps.count>=3){selectParagraph(event.target);taps.count=0}
  },{passive:true});
  document.addEventListener('selectionchange',()=>{
    const selection=getSelection();if(!selection.rangeCount||selection.isCollapsed){if(active&&Date.now()-active.selectedAt>500)active=null;return}
    const range=selection.getRangeAt(0);if(article.contains(range.commonAncestorContainer))show(range,'word');
  });
};
})();
