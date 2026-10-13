/* Specialized teaching flows: structural depth and substance movement. */
(() => {
'use strict';
const text=value=>typeof value==='string'&&value.trim().length>0;
const optionalText=(value,label)=>{if(value!=null&&typeof value!=='string')throw Error(label+' must be text.');};
const pairList=(value,label)=>{if(value!=null&&(!Array.isArray(value)||value.length>12||value.some(item=>!item||!text(item.label)||typeof item.value!=='string')))throw Error(label+' needs up to 12 label/value pairs.');};
const textList=(value,label)=>{if(value!=null&&(!Array.isArray(value)||value.length>12||value.some(item=>!text(item))))throw Error(label+' needs up to 12 text items.');};
const el=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!=null)node.textContent=value;return node;};
const action=(label,cls,handler)=>{const node=el('button',cls,label);node.type='button';node.onclick=handler;return node;};

window.validateStructureLayers=block=>{
  if(!text(block.title)||!text(block.structure))throw Error('structure-layers needs a title and structure.');
  optionalText(block.description,'structure-layers description');
  if(block.direction!=null&&block.direction!=='superficial-to-deep')throw Error('structure-layers direction must be superficial-to-deep.');
  if(!Array.isArray(block.layers)||block.layers.length<2||block.layers.length>16)throw Error('structure-layers needs 2–16 ordered layers.');
  const ids=new Set(),tones=new Set(['surface','epithelial','connective','muscle','vascular','neural','cavity','other']);
  block.layers.forEach((layer,index)=>{
    if(!layer||!text(layer.id)||ids.has(layer.id)||!text(layer.title))throw Error('Layer '+(index+1)+' needs a unique id and title.');
    ids.add(layer.id);
    for(const key of ['depthLabel','tissue','description','clinicalNote','boundaryAfter'])optionalText(layer[key],'Layer '+(index+1)+' '+key);
    if(layer.tone!=null&&!tones.has(layer.tone))throw Error('Layer '+(index+1)+' tone is invalid.');
    if(layer.relativeThickness!=null&&(!Number.isFinite(layer.relativeThickness)||layer.relativeThickness<0.25||layer.relativeThickness>8))throw Error('Layer '+(index+1)+' relativeThickness must be 0.25–8.');
    textList(layer.landmarks,'Layer '+(index+1)+' landmarks');
  });
  return block;
};

window.validateSubstanceJourney=block=>{
  if(!text(block.title)||!text(block.substance))throw Error('substance-journey needs a title and substance.');
  for(const key of ['route','description'])optionalText(block[key],'substance-journey '+key);
  if(!Array.isArray(block.stages)||block.stages.length<2||block.stages.length>20)throw Error('substance-journey needs 2–20 ordered stages.');
  const ids=new Set(),phases=new Set(['entry','absorption','distribution','metabolism','action','storage','elimination','regulation','other']);
  block.stages.forEach((stage,index)=>{
    if(!stage||!text(stage.id)||ids.has(stage.id)||!text(stage.title)||!text(stage.location))throw Error('Journey stage '+(index+1)+' needs a unique id, title, and location.');
    ids.add(stage.id);
    for(const key of ['description','form','duration','transition'])optionalText(stage[key],'Journey stage '+(index+1)+' '+key);
    if(stage.phase!=null&&!phases.has(stage.phase))throw Error('Journey stage '+(index+1)+' phase is invalid.');
    if(stage.fraction!=null&&(!Number.isFinite(stage.fraction)||stage.fraction<0||stage.fraction>100))throw Error('Journey stage '+(index+1)+' fraction must be 0–100.');
    pairList(stage.details,'Journey stage '+(index+1)+' details');
  });
  return block;
};

window.renderStructureLayers=(block,uid)=>{
  validateStructureLayers(block);
  const root=el('section','structure-layers-flow'),header=el('header','special-flow-head');
  header.append(el('div','overline','Structural atlas / superficial → deep'),el('h3','',block.title),el('div','special-flow-identity',block.structure));
  if(block.description)header.append(el('p','',block.description));
  const body=el('div','layers-body'),stack=el('div','layers-stack'),stackTop=el('div','layers-pole','SUPERFICIAL'),stackBottom=el('div','layers-pole','DEEP'),panel=el('article','layer-inspector');
  const slabs=[],count=block.layers.length;let selected=0,exploded=false;
  stack.append(stackTop);
  const select=index=>{
    selected=index;
    slabs.forEach((slab,i)=>{slab.className='layer-slab tone-'+(block.layers[i].tone||'other')+(i===index?' is-active':'')+(i<index?' is-traversed':'');slab.setAttribute('aria-pressed',String(i===index));});
    const layer=block.layers[index];panel.replaceChildren();
    const readout=el('div','layer-readout');readout.append(el('span','','LAYER '+String(index+1).padStart(2,'0')+' / '+String(count).padStart(2,'0')),el('strong','',layer.depthLabel||Math.round(index/(count-1)*100)+'% depth'));panel.append(readout,el('h4','',layer.title));
    const chips=el('div','layer-chips');if(layer.tissue)chips.append(el('span','',layer.tissue));if(layer.relativeThickness!=null)chips.append(el('span','',layer.relativeThickness+'× relative thickness'));if(chips.childElementCount)panel.append(chips);
    if(layer.description)panel.append(el('p','layer-description',layer.description));
    if(layer.landmarks?.length){panel.append(el('div','layer-label','Identify'));const list=el('ul','layer-landmarks');layer.landmarks.forEach(item=>list.append(el('li','',item)));panel.append(list);}
    if(layer.clinicalNote){const note=el('aside','layer-clinical');note.append(el('strong','','Clinical lens'),el('span','',layer.clinicalNote));panel.append(note);}
    if(layer.boundaryAfter&&index<count-1){const boundary=el('div','layer-boundary');boundary.append(el('span','','Next boundary'),el('strong','',layer.boundaryAfter));panel.append(boundary);}
    back.disabled=index===0;deeper.disabled=index===count-1;progress.textContent=Math.round(index/(count-1)*100)+'% depth';
  };
  block.layers.forEach((layer,index)=>{const slab=action('', 'layer-slab tone-'+(layer.tone||'other'),()=>select(index));slab.id=uid+'-layer-'+index;slab.style.setProperty('--layer-weight',layer.relativeThickness||1);slab.setAttribute('aria-label','Explore '+layer.title+', layer '+(index+1)+' of '+count);slab.append(el('span','layer-index',String(index+1).padStart(2,'0')),el('span','layer-name',layer.title),el('span','layer-depth',layer.depthLabel||''));slab.onkeydown=event=>{let next=index;if(event.key==='ArrowDown')next=Math.min(count-1,index+1);else if(event.key==='ArrowUp')next=Math.max(0,index-1);else if(event.key==='Home')next=0;else if(event.key==='End')next=count-1;else return;event.preventDefault();select(next);slabs[next].focus();};slabs.push(slab);stack.append(slab);});
  stack.append(stackBottom);
  const controls=el('div','layer-controls'),back=action('← Shallower','layer-nav',()=>select(Math.max(0,selected-1))),deeper=action('Deeper →','layer-nav primary-layer-nav',()=>select(Math.min(count-1,selected+1))),explode=action('Separate layers','layer-explode',()=>{exploded=!exploded;root.className='structure-layers-flow'+(exploded?' is-exploded':'');explode.textContent=exploded?'Compress layers':'Separate layers';explode.setAttribute('aria-pressed',String(exploded));}),progress=el('span','layer-progress');
  explode.setAttribute('aria-pressed','false');controls.append(back,progress,deeper,explode);body.append(stack,panel);root.append(header,body,controls);select(0);return root;
};

window.renderSubstanceJourney=(block,uid)=>{
  validateSubstanceJourney(block);
  const root=el('section','substance-journey-flow'),header=el('header','special-flow-head journey-head');
  header.append(el('div','overline','Body transit / interactive tracer'),el('h3','',block.title),el('div','special-flow-identity',block.substance+(block.route?' · '+block.route:'')));
  if(block.description)header.append(el('p','',block.description));
  const route=el('div','journey-route');route.setAttribute('role','tablist');route.setAttribute('aria-label',block.title);
  const panel=el('article','journey-inspector'),buttons=[];let selected=0,timer=null;
  const phaseIcons={entry:'↘',absorption:'⇡',distribution:'↔',metabolism:'⌁',action:'✦',storage:'▣',elimination:'↗',regulation:'±',other:'•'};
  const select=index=>{
    selected=index;buttons.forEach((button,i)=>{button.className='journey-node phase-'+(block.stages[i].phase||'other')+(i===index?' is-active':'')+(i<index?' is-complete':'');button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
    const stage=block.stages[index],phase=stage.phase||'other';panel.replaceChildren();
    const top=el('div','journey-inspector-top');top.append(el('span','journey-phase-icon',phaseIcons[phase]),el('div','journey-inspector-title'));top.children[1].append(el('span','',phase),el('h4','',stage.title));panel.append(top);
    const facts=el('div','journey-facts');facts.append(fact('Location',stage.location));if(stage.form)facts.append(fact('Form',stage.form));if(stage.duration)facts.append(fact('Timing',stage.duration));panel.append(facts);
    if(stage.description)panel.append(el('p','journey-description',stage.description));
    if(stage.fraction!=null){const amount=el('div','journey-amount'),line=el('i');line.style.setProperty('--journey-fraction',stage.fraction+'%');amount.append(el('span','',stage.fraction+'% available'),line);panel.append(amount);}
    if(stage.details?.length){const grid=el('dl','journey-details');stage.details.forEach(item=>grid.append(el('dt','',item.label),el('dd','',item.value)));panel.append(grid);}
    if(stage.transition&&index<block.stages.length-1){const transfer=el('div','journey-transfer');transfer.append(el('span','','NEXT TRANSFER'),el('strong','',stage.transition));panel.append(transfer);}
    previous.disabled=index===0;next.disabled=index===block.stages.length-1;counter.textContent=String(index+1).padStart(2,'0')+' / '+String(block.stages.length).padStart(2,'0');meter.style.setProperty('--journey-progress',Math.round(index/(block.stages.length-1)*100)+'%');
  };
  const fact=(label,value)=>{const node=el('div');node.append(el('span','',label),el('strong','',value));return node;};
  block.stages.forEach((stage,index)=>{const node=action('', 'journey-node phase-'+(stage.phase||'other'),()=>select(index));node.id=uid+'-stage-'+index;node.setAttribute('role','tab');node.setAttribute('aria-controls',uid+'-journey-panel');node.append(el('span','journey-node-index',String(index+1).padStart(2,'0')),el('span','journey-node-icon',phaseIcons[stage.phase||'other']),el('strong','',stage.location),el('small','',stage.title));node.onkeydown=event=>{let nextIndex=index;if(event.key==='ArrowRight'||event.key==='ArrowDown')nextIndex=(index+1)%block.stages.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')nextIndex=(index-1+block.stages.length)%block.stages.length;else if(event.key==='Home')nextIndex=0;else if(event.key==='End')nextIndex=block.stages.length-1;else return;event.preventDefault();select(nextIndex);buttons[nextIndex].focus();};buttons.push(node);route.append(node);if(index<block.stages.length-1)route.append(el('span','journey-route-link',stage.transition||'then'));});
  panel.id=uid+'-journey-panel';panel.setAttribute('role','tabpanel');const meter=el('div','journey-meter'),controls=el('div','journey-controls'),previous=action('← Previous','journey-nav',()=>select(Math.max(0,selected-1))),counter=el('span','journey-counter'),next=action('Next stage →','journey-nav primary-journey-nav',()=>select(Math.min(block.stages.length-1,selected+1))),trace=action('▶ Trace journey','journey-trace',()=>{if(timer){clearInterval(timer);timer=null;trace.textContent='▶ Trace journey';trace.setAttribute('aria-pressed','false');return;}if(selected===block.stages.length-1)select(0);trace.textContent='Ⅱ Pause';trace.setAttribute('aria-pressed','true');timer=setInterval(()=>{if(selected>=block.stages.length-1){clearInterval(timer);timer=null;trace.textContent='↺ Trace again';trace.setAttribute('aria-pressed','false');return;}select(selected+1);},1400);});trace.setAttribute('aria-pressed','false');controls.append(previous,counter,next,trace);root.append(header,meter,route,panel,controls);select(0);return root;
};
})();
