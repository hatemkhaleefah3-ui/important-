/* One reaction/pathway per process. Change controls cycle outcomes, never pathways. */
(() => {
'use strict';
const domains=new Set(['chemistry','pathology','pharmacology','general']);
const text=value=>typeof value==='string'&&value.trim().length>0;
const optionalText=(value,label)=>{if(value!=null&&typeof value!=='string')throw Error(label+' must be text.');};
const validateStep=(step,label,ids)=>{
  if(!step||!text(step.id)||!text(step.title)||ids.has(step.id))throw Error(label+' needs a unique id and title.');
  if(step.pathway!=null)throw Error(label+' cannot define pathway; pathway belongs to the step-process.');
  ids.add(step.id);
  for(const key of ['agent','description','formula','context','badge'])optionalText(step[key],label+' '+key);
  if(step.details!=null&&(!Array.isArray(step.details)||step.details.length>12||step.details.some(item=>!item||!text(item.label)||typeof item.value!=='string')))
    throw Error(label+' details need up to 12 label/value pairs.');
};
window.validateStepProcess=block=>{
  if(block.domain!=null&&!domains.has(block.domain))throw Error('step-process domain must be chemistry, pathology, pharmacology, or general.');
  if(!text(block.title)||!text(block.pathway))throw Error('step-process needs a title and one pathway.');
  optionalText(block.description,'step-process description');
  if(block.branches!=null)throw Error('step-process uses resultSets for outcomes; pathway branches are not allowed.');
  if(!Array.isArray(block.steps)||block.steps.length<2||block.steps.length>24)throw Error('step-process needs 2–24 main steps.');
  const ids=new Set();
  block.steps.forEach((step,index)=>validateStep(step,'Main step '+(index+1),ids));
  if(block.resultSets!=null){
    if(!Array.isArray(block.resultSets)||block.resultSets.length>12)throw Error('step-process supports up to 12 result sets.');
    const setIds=new Set(),fromSteps=new Set(),mainIds=new Set(block.steps.map(step=>step.id));
    block.resultSets.forEach((set,index)=>{
      if(!set||!text(set.id)||setIds.has(set.id)||!mainIds.has(set.fromStep)||fromSteps.has(set.fromStep)||!text(set.defaultResult))throw Error('Result set '+(index+1)+' needs a unique id, existing fromStep, and defaultResult.');
      setIds.add(set.id);fromSteps.add(set.fromStep);
      if(!Array.isArray(set.alternatives)||!set.alternatives.length||set.alternatives.length>12)throw Error('Result set '+(index+1)+' needs 1–12 alternatives.');
      const alternativeIds=new Set();
      set.alternatives.forEach((alternative,alternativeIndex)=>{
        if(!alternative||!text(alternative.id)||alternativeIds.has(alternative.id)||!text(alternative.title))throw Error('Result set '+(index+1)+' alternative '+(alternativeIndex+1)+' needs a unique id and title.');
        alternativeIds.add(alternative.id);optionalText(alternative.agent,'Result alternative agent');
        if(!Array.isArray(alternative.steps)||!alternative.steps.length||alternative.steps.length>24)throw Error('Result alternative needs 1–24 steps.');
        alternative.steps.forEach((step,stepIndex)=>validateStep(step,'Result alternative step '+(stepIndex+1),ids));
      });
    });
  }
  return block;
};
const el=(tag,cls,textContent)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(textContent!=null)node.textContent=textContent;return node;};
const makeDetails=(step,id)=>{
  const panel=el('div','step-process-detail');panel.id=id;panel.hidden=true;
  if(step.description)panel.append(el('p','step-process-description',step.description));
  if(step.formula)panel.append(el('div','step-process-formula',step.formula));
  if(step.details?.length){const list=el('dl');step.details.forEach(item=>list.append(el('dt','',item.label),el('dd','',item.value)));panel.append(list);}
  return panel;
};
window.renderStepProcess=(block,uid)=>{
  validateStepProcess(block);
  const root=el('section','step-process '+(block.domain||'general'));
  const heading=el('header','step-process-heading');
  heading.append(el('div','overline',(block.domain||'general')+' / Step-by-step'),el('h3','',block.title),el('div','step-process-identity','One pathway · '+block.pathway));
  if(block.description)heading.append(el('p','',block.description));
  const status=el('div','step-process-status','One pathway');status.setAttribute('aria-live','polite');heading.append(status);root.append(heading);
  const stage=el('div','step-process-stage');root.append(stage);
  const resultSets=block.resultSets||[],groups=new Map(resultSets.map(set=>[set.fromStep,set]));let activeResult=null;
  const visibleSteps=()=>{if(!activeResult)return block.steps;const split=block.steps.findIndex(step=>step.id===activeResult.set.fromStep);return block.steps.slice(0,split+1).concat(activeResult.alternative.steps);};
  const choices=set=>[null,...set.alternatives];
  const selectNextResult=set=>{const options=choices(set),current=activeResult?.set.id===set.id?options.findIndex(item=>item?.id===activeResult.alternative.id):0,next=options[(current+1)%options.length];activeResult=next?{set,alternative:next}:null;render();};
  const render=()=>{
    stage.replaceChildren();const steps=visibleSteps(),split=activeResult?block.steps.findIndex(step=>step.id===activeResult.set.fromStep):-1;
    status.textContent=activeResult?'Result · '+activeResult.alternative.title:(resultSets.length?'Result · '+resultSets[0].defaultResult:'One pathway · '+block.pathway);
    steps.forEach((step,index)=>{
      const resultSet=groups.get(step.id),resultChanged=!!(activeResult&&index>=split);
      const item=el('article','step-process-item'+(resultChanged?' is-result-changed':''));item.style.setProperty('--step-order',index);
      const card=el('div','step-process-card'),copy=el('div','step-process-copy');
      copy.append(el('span','step-process-number','STEP '+String(index+1).padStart(2,'0')));
      if(resultSet){const selected=activeResult?.set.id===resultSet.id?activeResult.alternative.title:resultSet.defaultResult;copy.append(el('span','step-process-result','Result · '+selected));}
      if(step.context||step.badge)copy.append(el('span','step-process-context',step.badge||step.context));
      copy.append(el('h4','',step.title));
      if(step.context&&step.badge)copy.append(el('p','step-process-subtitle',step.context));
      card.append(copy);
      const actions=el('div','step-process-actions');
      const hasDetails=!!(step.description||step.formula||step.details?.length),detailId=uid+'-'+step.id+'-detail';
      if(hasDetails){const toggle=el('button','step-detail-toggle');toggle.type='button';toggle.append(el('span','step-action-icon','＋'),el('span','step-action-label','Details'));toggle.setAttribute('aria-label','Show details for '+step.title);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',detailId);actions.append(toggle);}
      if(resultSet){const options=choices(resultSet),current=activeResult?.set.id===resultSet.id?options.findIndex(item=>item?.id===activeResult.alternative.id):0,next=options[(current+1)%options.length];const route=el('button','step-result-toggle');route.type='button';route.append(el('span','step-action-icon','⇄'),el('span','step-action-label','Result'));route.setAttribute('aria-label','Change result of '+block.pathway+' to '+(next?next.title:resultSet.defaultResult));route.title='Change result';route.onclick=()=>selectNextResult(resultSet);actions.append(route);}
      if(actions.childElementCount)card.append(actions);item.append(card);
      if(hasDetails){const panel=makeDetails(step,detailId),toggle=actions.querySelector('.step-detail-toggle');toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.querySelector('.step-action-icon').textContent=panel.hidden?'＋':'−';toggle.setAttribute('aria-label',(panel.hidden?'Show':'Hide')+' details for '+step.title);};item.append(panel);}
      if(index<steps.length-1){const connector=el('div','step-process-connector'),isResultPoint=activeResult&&step.id===activeResult.set.fromStep,agent=isResultPoint?(activeResult.alternative.agent||step.agent):step.agent;connector.append(el('span','step-process-arrow','↓'));if(agent)connector.append(el('span','step-process-agent',agent));item.append(connector);}
      stage.append(item);
    });
  };
  render();return root;
};
})();
