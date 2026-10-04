// Generated from client validators; test-sharing.cjs checks parity.
const domains=new Set(['chemistry','pathology','pharmacology','general']);
const text=value=>typeof value==='string'&&value.trim().length>0;
const optionalText=(value,label)=>{if(value!=null&&typeof value!=='string')throw Error(label+' must be text.');};
const validateStep=(step,label,ids)=>{
  if(!step||!text(step.id)||!text(step.title)||ids.has(step.id))throw Error(label+' needs a unique id and title.');
  if(step.pathway!=null)throw Error(label+' cannot define pathway; pathway belongs to the step-process.');
  ids.add(step.id);
  for(const key of ['agent','description','formula','context','badge','trackLabel'])optionalText(step[key],label+' '+key);
  if(step.details!=null&&(!Array.isArray(step.details)||step.details.length>12||step.details.some(item=>!item||!text(item.label)||typeof item.value!=='string')))
    throw Error(label+' details need up to 12 label/value pairs.');
};
const validateStepProcess=block=>{
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
  const tracked=block.type==='tracked-step-process';
  if(tracked){
    if(!block.track||!['time','location'].includes(block.track.kind))throw Error('tracked-step-process needs track.kind set to time or location.');
    optionalText(block.track.title,'track title');
    const everyStep=[...block.steps,...(block.resultSets||[]).flatMap(set=>set.alternatives.flatMap(alternative=>alternative.steps))];
    if(everyStep.some(step=>!text(step.trackLabel)))throw Error('Every tracked step and result step needs trackLabel.');
  }else if(block.track!=null)throw Error('track is only supported by tracked-step-process.');
  return block;
};
const types=new Set(['title','subtitle','paragraph','note','callout','flow','table','question','checklist','objectives','section','references','step-process','tracked-step-process']);
const str=(x,name,required=false)=>{if((required&&(!x||typeof x!=='string'))||(x!=null&&typeof x!=='string'))throw Error(name+' must be text.');};
export const validateLecture=d=>{
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Lecture must be an object.');
 str(d.title,'title',true);if(!Array.isArray(d.blocks)||!d.blocks.length||d.blocks.length>200)throw Error('Use between 1 and 200 blocks.');
 for(const k of ['subtitle','course','id','author','level'])str(d[k],k);
 if(d.schemaVersion!=null&&![2,3,4].includes(d.schemaVersion))throw Error('Unsupported schemaVersion. Use 4, 3, 2, or omit it for legacy files.');
 if(d.durationMinutes!=null&&(!Number.isFinite(d.durationMinutes)||d.durationMinutes<=0))throw Error('durationMinutes must be positive.');
 for(const [i,b] of d.blocks.entries()){
 if(!b||!types.has(b.type))throw Error('Block '+(i+1)+': unknown type.');
 for(const k of ['id','heading','title','label','text','prompt','answer','description','variant'])str(b[k],'Block '+(i+1)+' '+k);
 if(['title','subtitle','paragraph','note','callout'].includes(b.type))str(b.text,'Block '+(i+1)+' text',true);
 if(b.type==='step-process'||b.type==='tracked-step-process')validateStepProcess(b);
 if(b.type==='section')str(b.title,'section title',true);
 if(['checklist','objectives','references'].includes(b.type)&&(!Array.isArray(b.items)||b.items.some(x=>typeof x!=='string')))throw Error(b.type+' items must be text arrays.');
 if(b.type==='flow'&&(!Array.isArray(b.steps)||!b.steps.length||b.steps.some(x=>typeof x!=='string'&&(!x||typeof x.title!=='string'||(x.description!=null&&typeof x.description!=='string')))))throw Error('Flow steps need text or title/description objects.');
 if(b.type==='table'&&(!Array.isArray(b.columns)||!b.columns.length||b.columns.some(x=>typeof x!=='string')||!Array.isArray(b.rows)||b.rows.some(row=>!Array.isArray(row)||row.length!==b.columns.length||row.some(x=>typeof x!=='string'))))throw Error('Table rows must match the text columns.');
 if(b.type==='question'){str(b.prompt,'question prompt',true);str(b.answer,'question answer',true);if(b.options!=null&&(!Array.isArray(b.options)||b.options.length<2||b.options.some(x=>typeof x!=='string')||!Number.isInteger(b.correctIndex)||b.correctIndex<0||b.correctIndex>=b.options.length))throw Error('Question options require a valid correctIndex.');}
 }
 return d;
};
