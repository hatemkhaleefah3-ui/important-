/* Vertical step-by-step processes. Imported strings are rendered as text only. */
(() => {
'use strict';
const domains=new Set(['chemistry','pathology','pharmacology','general']);
const text=value=>typeof value==='string'&&value.trim().length>0;
const optionalText=(value,label)=>{if(value!=null&&typeof value!=='string')throw Error(label+' must be text.');};
const validateStep=(step,label,ids)=>{
  if(!step||!text(step.id)||!text(step.title)||ids.has(step.id))throw Error(label+' needs a unique id and title.');
  ids.add(step.id);
  for(const key of ['agent','description','formula','context','badge'])optionalText(step[key],label+' '+key);
  if(step.details!=null&&(!Array.isArray(step.details)||step.details.length>12||step.details.some(item=>!item||!text(item.label)||typeof item.value!=='string')))
    throw Error(label+' details need up to 12 label/value pairs.');
};
window.validateStepProcess=block=>{
  if(block.domain!=null&&!domains.has(block.domain))throw Error('step-process domain must be chemistry, pathology, pharmacology, or general.');
  if(!text(block.title))throw Error('step-process needs a title.');
  optionalText(block.description,'step-process description');
  if(!Array.isArray(block.steps)||block.steps.length<2||block.steps.length>24)throw Error('step-process needs 2–24 main steps.');
  const ids=new Set();
  block.steps.forEach((step,index)=>validateStep(step,'Main step '+(index+1),ids));
  if(block.branches!=null){
    if(!Array.isArray(block.branches)||block.branches.length>12)throw Error('step-process supports up to 12 alternate pathways.');
    const branchIds=new Set(),mainIds=new Set(block.steps.map(step=>step.id));
    block.branches.forEach((branch,index)=>{
      if(!branch||!text(branch.id)||branchIds.has(branch.id)||!text(branch.title)||!mainIds.has(branch.fromStep))throw Error('Branch '+(index+1)+' needs a unique id, title, and existing fromStep.');
      branchIds.add(branch.id);optionalText(branch.agent,'Branch '+(index+1)+' agent');
      if(!Array.isArray(branch.steps)||!branch.steps.length||branch.steps.length>24)throw Error('Branch '+(index+1)+' needs 1–24 steps.');
      branch.steps.forEach((step,stepIndex)=>validateStep(step,'Branch '+(index+1)+' step '+(stepIndex+1),ids));
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
  heading.append(el('div','overline',(block.domain||'general')+' / Step-by-step'),el('h3','',block.title));
  if(block.description)heading.append(el('p','',block.description));
  const status=el('div','step-process-status','Main pathway');status.setAttribute('aria-live','polite');heading.append(status);root.append(heading);
  const stage=el('div','step-process-stage');root.append(stage);
  const branches=block.branches||[];let activeBranch=null;
  const groups=new Map();branches.forEach(branch=>{const group=groups.get(branch.fromStep)||[];group.push(branch);groups.set(branch.fromStep,group)});
  const visibleSteps=()=>{if(!activeBranch)return block.steps;const split=block.steps.findIndex(step=>step.id===activeBranch.fromStep);return block.steps.slice(0,split+1).concat(activeBranch.steps)};
  const routeChoices=fromStep=>[null,...(groups.get(fromStep)||[])];
  const selectNextRoute=fromStep=>{
    const choices=routeChoices(fromStep),current=activeBranch?.fromStep===fromStep?choices.findIndex(item=>item?.id===activeBranch.id):0;
    activeBranch=choices[(current+1)%choices.length];render();
  };
  const render=()=>{
    stage.replaceChildren();const steps=visibleSteps();
    status.textContent=activeBranch?'Alternate pathway · '+activeBranch.title:'Main pathway';
    steps.forEach((step,index)=>{
      const item=el('article','step-process-item');item.style.setProperty('--step-order',index);
      const card=el('div','step-process-card'),copy=el('div','step-process-copy');
      copy.append(el('span','step-process-number','STEP '+String(index+1).padStart(2,'0')));
      if(step.context||step.badge)copy.append(el('span','step-process-context',step.badge||step.context));
      copy.append(el('h4','',step.title));
      if(step.context&&step.badge)copy.append(el('p','step-process-subtitle',step.context));
      card.append(copy);
      const actions=el('div','step-process-actions');
      const hasDetails=!!(step.description||step.formula||step.details?.length),detailId=uid+'-'+step.id+'-detail';
      if(hasDetails){const toggle=el('button','step-detail-toggle','⌄');toggle.type='button';toggle.setAttribute('aria-label','Show details for '+step.title);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',detailId);actions.append(toggle);}
      if(groups.has(step.id)){const choices=routeChoices(step.id),current=activeBranch?.fromStep===step.id?choices.findIndex(item=>item?.id===activeBranch.id):0,next=choices[(current+1)%choices.length];const route=el('button','step-route-toggle','⇄');route.type='button';route.setAttribute('aria-label','Change pathway after '+step.title+' to '+(next?next.title:'main pathway'));route.title='Change downstream pathway';route.onclick=()=>selectNextRoute(step.id);actions.append(route);}
      if(actions.childElementCount)card.append(actions);item.append(card);
      if(hasDetails){const panel=makeDetails(step,detailId),toggle=actions.querySelector('.step-detail-toggle');toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.textContent=panel.hidden?'⌄':'⌃';toggle.setAttribute('aria-label',(panel.hidden?'Show':'Hide')+' details for '+step.title)};item.append(panel);}
      if(index<steps.length-1){const connector=el('div','step-process-connector');const isBranchPoint=activeBranch&&step.id===activeBranch.fromStep;const agent=isBranchPoint?(activeBranch.agent||step.agent):step.agent;connector.append(el('span','step-process-arrow','↓'));if(agent)connector.append(el('span','step-process-agent',agent));item.append(connector);}
      stage.append(item);
    });
  };
  render();return root;
};
})();
