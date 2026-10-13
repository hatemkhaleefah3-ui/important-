/* Validated mixed-format exam model and renderer. */
(() => {
'use strict';
const types=new Set(['mcq','medical-history-mcq','fill-blank','select-number','match']);
const text=(value,name,required=false)=>{if((required&&(!value||typeof value!=='string'))||(value!=null&&typeof value!=='string'))throw Error(name+' must be text.')};
const finite=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error(name+' must be a finite number.')};
window.validateExam=exam=>{
 if(!exam||typeof exam!=='object'||Array.isArray(exam))throw Error('exam must be an object.');
 text(exam.title,'exam title');text(exam.instructions,'exam instructions');
 if(exam.passingScore!=null&&(typeof exam.passingScore!=='number'||exam.passingScore<0||exam.passingScore>100))throw Error('exam passingScore must be between 0 and 100.');
 if(!Array.isArray(exam.questions)||!exam.questions.length||exam.questions.length>100)throw Error('exam needs between 1 and 100 questions.');
 const ids=new Set();
 exam.questions.forEach((question,index)=>{
  const label='Exam question '+(index+1);if(!question||!types.has(question.type))throw Error(label+': unknown type.');text(question.id,label+' id');text(question.prompt,label+' prompt',true);text(question.explanation,label+' explanation');
  if(question.id){if(ids.has(question.id))throw Error(label+': duplicate id.');ids.add(question.id)}
  if(question.type==='mcq'||question.type==='medical-history-mcq'){
   if(question.type==='medical-history-mcq')text(question.history,label+' history',true);
   if(!Array.isArray(question.options)||question.options.length<2||question.options.length>8||question.options.some(option=>typeof option!=='string'||!option.trim()))throw Error(label+': MCQ options need 2 to 8 text choices.');
   if(!Number.isInteger(question.correctIndex)||question.correctIndex<0||question.correctIndex>=question.options.length)throw Error(label+': correctIndex is invalid.');
  }
  if(question.type==='fill-blank'){
   if(!Array.isArray(question.answers)||!question.answers.length||question.answers.length>12||question.answers.some(answer=>typeof answer!=='string'||!answer.trim()))throw Error(label+': fill-blank answers need 1 to 12 accepted text values.');
   if(question.caseSensitive!=null&&typeof question.caseSensitive!=='boolean')throw Error(label+': caseSensitive must be true or false.');
  }
  if(question.type==='select-number'){
   for(const key of ['min','max','step','answer'])finite(question[key],label+' '+key);if(question.min>question.max||question.step<=0||question.answer<question.min||question.answer>question.max)throw Error(label+': invalid number range or answer.');
   if((question.max-question.min)/question.step>200)throw Error(label+': select-number supports at most 201 choices.');
   if(question.tolerance!=null){finite(question.tolerance,label+' tolerance');if(question.tolerance<0)throw Error(label+': tolerance cannot be negative.')}text(question.unit,label+' unit');
  }
  if(question.type==='match'){
   if(!Array.isArray(question.pairs)||question.pairs.length<2||question.pairs.length>12)throw Error(label+': match needs 2 to 12 pairs.');
   const left=new Set(),right=new Set();for(const pair of question.pairs){if(!pair||typeof pair.left!=='string'||!pair.left.trim()||typeof pair.right!=='string'||!pair.right.trim())throw Error(label+': each match pair needs left and right text.');if(left.has(pair.left)||right.has(pair.right))throw Error(label+': match values must be unique.');left.add(pair.left);right.add(pair.right)}
  }
 });return exam;
};
const normalize=(value,caseSensitive=false)=>{const result=String(value??'').trim().replace(/\s+/g,' ');return caseSensitive?result:result.toLocaleLowerCase()};
window.buildExamModel=lecture=>{
 if(lecture.exam){validateExam(lecture.exam);return lecture.exam}
 const questions=lecture.blocks.filter(block=>block.type==='question'&&Array.isArray(block.options)).map((block,index)=>({id:'study-question-'+(index+1),type:'mcq',prompt:block.prompt,options:block.options,correctIndex:block.correctIndex,explanation:block.answer}));
 return {title:'Knowledge check',instructions:'Answer every question, then submit the exam to see your score and explanations.',passingScore:70,questions};
};
const keyOf=(question,index)=>question.id||'question-'+(index+1);
const correctAnswer=question=>{
 if(question.type==='mcq'||question.type==='medical-history-mcq')return question.options[question.correctIndex];
 if(question.type==='fill-blank')return question.answers.join(' / ');
 if(question.type==='select-number')return question.answer+(question.unit?' '+question.unit:'');
 return question.pairs.map(pair=>pair.left+' → '+pair.right).join('; ');
};
window.gradeExam=(exam,responses)=>{
 validateExam(exam);const results=exam.questions.map((question,index)=>{const key=keyOf(question,index),response=responses[key];let correct=false;
  if(question.type==='mcq'||question.type==='medical-history-mcq')correct=Number(response)===question.correctIndex;
  else if(question.type==='fill-blank')correct=question.answers.some(answer=>normalize(response,question.caseSensitive)===normalize(answer,question.caseSensitive));
  else if(question.type==='select-number')correct=response!==''&&response!=null&&Math.abs(Number(response)-question.answer)<=(question.tolerance||1e-9);
  else correct=!!response&&question.pairs.every(pair=>response[pair.left]===pair.right);
  return {key,correct,correctAnswer:correctAnswer(question)};
 });const correct=results.filter(result=>result.correct).length,total=results.length,percent=total?Math.round(correct/total*100):0;return {correct,total,percent,results};
};
const el=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!=null)node.textContent=value;return node};
const button=(value,cls,handler)=>{const node=el('button',cls,value);node.type='button';node.onclick=handler;return node};
window.renderExamPage=lecture=>{
 const exam=buildExamModel(lecture),page=el('main','exam-page');page.id='exam-content';page.tabIndex=-1;const responses={},cards=[],feedback=[];
 const hero=el('header','exam-hero');hero.append(el('div','overline',(lecture.course||'LECTURE')+' / EXAM'),el('h1','',exam.title||lecture.title+' exam'),el('p','',exam.instructions||'Answer every question, then submit to receive a score and explanations.'));
 const stats=el('div','exam-stats'),answeredValue=el('strong','','0 / '+exam.questions.length),passValue=el('strong','',(exam.passingScore??70)+'%');const answeredStat=el('div');answeredStat.append(el('span','','Answered'),answeredValue);const passStat=el('div');passStat.append(el('span','','Pass mark'),passValue);stats.append(answeredStat,passStat);hero.append(stats);page.append(hero);
 const empty=exam.questions.length===0;if(empty){const panel=el('section','exam-empty');panel.append(el('h2','','No exam questions yet'),el('p','','Add an exam.questions array to the lecture JSON, or add multiple-choice question blocks to generate a basic exam.'));page.append(panel);return page}
 const form=el('form','exam-form');form.noValidate=true;const isAnswered=(question,index)=>{const response=responses[keyOf(question,index)];if(question.type==='match')return !!response&&question.pairs.every(pair=>response[pair.left]);return response!==undefined&&response!==null&&response!==''};
 const updateProgress=()=>{const answered=exam.questions.filter(isAnswered).length;answeredValue.textContent=answered+' / '+exam.questions.length;progressFill.style.width=(answered/exam.questions.length*100)+'%';progressText.textContent=answered+' of '+exam.questions.length+' answered'};
 exam.questions.forEach((question,index)=>{const key=keyOf(question,index),card=el('section','exam-question'),heading=el('div','exam-question-head');heading.append(el('span','exam-number','QUESTION '+String(index+1).padStart(2,'0')),el('span','exam-kind',question.type.replaceAll('-',' ')));card.append(heading);if(question.history){const history=el('div','exam-history');history.append(el('span','overline','Medical history'),el('p','',question.history));card.append(history)}card.append(el('h2','',question.prompt));
  if(question.type==='mcq'||question.type==='medical-history-mcq'){const options=el('div','exam-options');question.options.forEach((option,optionIndex)=>{const label=el('label','exam-option'),input=el('input');input.type='radio';input.name='exam-'+index;input.value=optionIndex;input.onchange=()=>{responses[key]=optionIndex;updateProgress()};label.append(input,el('span','exam-option-letter',String.fromCharCode(65+optionIndex)),el('span','',option));options.append(label)});card.append(options)}
  if(question.type==='fill-blank'){const label=el('label','exam-field-label','Your answer'),input=el('input','exam-text');input.type='text';input.autocomplete='off';input.placeholder='Type the missing term';input.oninput=()=>{responses[key]=input.value;updateProgress()};label.append(input);card.append(label)}
  if(question.type==='select-number'){const label=el('label','exam-field-label','Select a number'),select=el('select','exam-select'),blank=el('option','','Choose…');blank.value='';select.append(blank);const decimals=Math.min(8,(String(question.step).split('.')[1]||'').length);for(let value=question.min,count=0;value<=question.max+question.step/1000&&count<=200;value=question.min+(++count)*question.step){const fixed=Number(value.toFixed(decimals)),option=el('option','',fixed+(question.unit?' '+question.unit:''));option.value=fixed;select.append(option)}select.onchange=()=>{responses[key]=select.value;updateProgress()};label.append(select);card.append(label)}
  if(question.type==='match'){const grid=el('div','exam-match');const choices=question.pairs.map(pair=>pair.right);question.pairs.forEach((pair,row)=>{const label=el('label','exam-match-row'),left=el('span','',pair.left),select=el('select','exam-select'),blank=el('option','','Choose match…');blank.value='';select.append(blank);const rotated=choices.slice(row%choices.length).concat(choices.slice(0,row%choices.length));rotated.forEach(value=>{const option=el('option','',value);option.value=value;select.append(option)});select.onchange=()=>{responses[key]??={};responses[key][pair.left]=select.value;updateProgress()};label.append(left,select);grid.append(label)});card.append(grid)}
  const note=el('div','exam-feedback');note.hidden=true;card.append(note);cards.push(card);feedback.push(note);form.append(card)});
 const progress=el('div','exam-progress'),progressText=el('span','','0 of '+exam.questions.length+' answered'),track=el('div','exam-progress-track'),progressFill=el('i');track.append(progressFill);progress.append(progressText,track);
 const result=el('section','exam-result');result.hidden=true;result.setAttribute('aria-live','polite');const actions=el('div','exam-actions'),submit=button('Submit exam','exam-submit',()=>{}),reset=button('Reset exam','exam-reset',()=>{form.reset();for(const key of Object.keys(responses))delete responses[key];cards.forEach(card=>card.classList.remove('is-correct','is-wrong'));feedback.forEach(node=>{node.hidden=true;node.replaceChildren()});form.querySelectorAll('input,select').forEach(control=>control.disabled=false);result.hidden=true;submit.hidden=false;reset.hidden=true;updateProgress();window.scrollTo({top:page.offsetTop,behavior:'smooth'})});reset.hidden=true;
 submit.onclick=()=>{const missing=exam.questions.findIndex((question,index)=>!isAnswered(question,index));if(missing>=0){result.hidden=false;result.className='exam-result needs-answers';result.replaceChildren(el('strong','','Complete every question before submitting.'),el('span','',exam.questions.length-exam.questions.filter(isAnswered).length+' unanswered'));cards[missing].scrollIntoView({behavior:'smooth',block:'center'});cards[missing].querySelector('input,select')?.focus();return}const grade=gradeExam(exam,responses),passed=grade.percent>=(exam.passingScore??70);result.hidden=false;result.className='exam-result '+(passed?'passed':'not-passed');result.replaceChildren(el('span','exam-score',grade.percent+'%'),el('div','',passed?'Pass · '+grade.correct+' of '+grade.total+' correct':'Review · '+grade.correct+' of '+grade.total+' correct'));grade.results.forEach((item,index)=>{cards[index].classList.add(item.correct?'is-correct':'is-wrong');const question=exam.questions[index],note=feedback[index];note.hidden=false;note.replaceChildren(el('strong','',item.correct?'Correct':'Correct answer: '+item.correctAnswer));if(question.explanation)note.append(el('p','',question.explanation))});form.querySelectorAll('input,select').forEach(control=>control.disabled=true);submit.hidden=true;reset.hidden=false;result.scrollIntoView({behavior:'smooth',block:'center'})};
 actions.append(submit,reset);page.append(progress,form,result,actions);updateProgress();return page;
};
})();
