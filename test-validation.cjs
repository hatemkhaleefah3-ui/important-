const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('step-process.js','utf8'),context);
context.validateStepProcess=context.window.validateStepProcess;
vm.runInContext(fs.readFileSync('exam.js','utf8'),context);
context.validateExam=context.window.validateExam;
vm.runInContext(fs.readFileSync('lecture.js','utf8'),context);
const validate=context.window.validateLecture;

const files=['medical-lecture.example.json','medical-lecture.template.json','step-processes.example.json','lectures/carbohydrate-biochemistry.json','lectures/heart-drugs-pharmacology.json','lectures/lymph-node-histology.json'];
for(const path of files)validate(JSON.parse(fs.readFileSync(path)));
validate({title:'Legacy',blocks:[{type:'title',text:'Legacy'},{type:'flow',steps:['One','Two']},{type:'question',prompt:'Why?',answer:'Because.'}]});

for(const bad of [
  null,{},
  {title:'x',blocks:[]},
  {title:'x',schemaVersion:5,blocks:[{type:'paragraph',text:'x'}]},
  {title:'x',blocks:[{type:'unknown'}]},
  {title:'x',blocks:[{type:'table',columns:['a'],rows:[['a','b']]}]},
  {title:'x',blocks:[{type:'question',prompt:'p',answer:'a',options:['a','b'],correctIndex:9}]},
  {title:'x',blocks:[{type:'flow',steps:[null]}]},
  {title:'x',blocks:[{type:'image',processName:'Diagram',alt:'Diagram',source:{fileType:'pdf',page:0}}]},
  {title:'x',blocks:[{type:'image',processName:'Diagram',alt:'Diagram',source:{fileType:'pdf',page:2,crop:[0.8,0,0.3,1]}}]},
  {title:'x',blocks:[{type:'image',processName:'Diagram',alt:'Diagram',source:{fileType:'pptx',slide:2}}]},
  {title:'x',blocks:[{type:'image',processName:'Diagram',alt:'Diagram',source:{fileType:'docx'}}]}
])assert.throws(()=>validate(bad));
validate({title:'Images',blocks:[
  {type:'image',processName:'PDF process',alt:'PDF figure',source:{fileType:'pdf',page:2,crop:[0.1,0.2,0.8,0.6]}},
  {type:'image',processName:'PPTX process',alt:'PPTX figure',source:{fileType:'pptx',slide:3,image:2}},
  {type:'image',processName:'DOCX process',alt:'DOCX figure',source:{fileType:'docx',media:'image4.png'}}
]});

const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const selectionSource=fs.readFileSync('selection-translate.js','utf8');new vm.Script(selectionSource);
const imageExtractorSource=fs.readFileSync('image-extractor.js','utf8');new vm.Script(imageExtractorSource);const examSource=fs.readFileSync('exam.js','utf8');new vm.Script(examSource);
for(const asset of ['lecture.css?v=4.5.0','step-process.js?v=4.5.0','exam.js?v=4.5.0','lecture.js?v=4.5.0','selection-translate.js?v=4.5.0','image-extractor.js?v=4.5.0','cdn.jsdelivr.net/npm/jszip@3.10.1'])assert(html.includes(asset));
assert(html.includes('lectures/carbohydrate-biochemistry.json?v=4.5.0'));
assert(html.includes('lectures/heart-drugs-pharmacology.json?v=4.5.0'));
assert(html.includes('lectures/lymph-node-histology.json?v=4.5.0'));
assert(html.includes("+'#lecture='+enc(output)"));
assert(html.includes('accept=".pdf,.pptx,.docx'));
assert(imageExtractorSource.includes("import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.min.mjs')"));
assert(imageExtractorSource.includes('window.JSZip.loadAsync'));
assert(imageExtractorSource.includes("toDataURL('image/webp'"));
assert(imageExtractorSource.includes('Math.floor(1120000/images.length)'));
assert(!html.includes('LectureLinks'));
assert(!html.includes('sharing.js'));
assert(selectionSource.includes("event.detail===2"));
assert(selectionSource.includes("event.detail>=3"));
assert(selectionSource.includes('api.mymemory.translated.net'));
assert(!selectionSource.includes('translate.google.com'));
assert(selectionSource.includes("langpair=en%7Car"));
assert(selectionSource.includes('insertWordTranslation'));
assert(selectionSource.includes('insertParagraphTranslation'));
assert(fs.readFileSync('lecture.js','utf8').includes('installLectureSelection?.(article,root)'));
assert(!files.some(path=>fs.readFileSync(path,'utf8').includes('"agent": "Next step"')));
console.log('PASS: JSON files, legacy schema, invalid inputs, versioned assets, and inline JavaScript syntax.');

const lymph=JSON.parse(fs.readFileSync('lectures/lymph-node-histology.json'));
const lymphImages=lymph.blocks.filter(block=>block.type==='image');
assert.equal(lymphImages.length,5);
assert.deepEqual(lymphImages.map(block=>block.source.page),[2,7,5,8,11]);
assert.deepEqual(lymphImages.at(-1).source.crop,[0,0.35,1,0.65]);
assert(lymphImages.every(block=>block.processName&&block.alt));
console.log('PASS: image placeholder schema and lymph-node source locations.');

const examTypes=new Set(lymph.exam.questions.map(question=>question.type));
assert.deepEqual(examTypes,new Set(['mcq','medical-history-mcq','fill-blank','select-number','match']));
const perfect={};lymph.exam.questions.forEach((question,index)=>{const key=question.id||'question-'+(index+1);if(['mcq','medical-history-mcq'].includes(question.type))perfect[key]=question.correctIndex;else if(question.type==='fill-blank')perfect[key]=question.answers[0];else if(question.type==='select-number')perfect[key]=question.answer;else perfect[key]=Object.fromEntries(question.pairs.map(pair=>[pair.left,pair.right]))});
const perfectGrade=context.window.gradeExam(lymph.exam,perfect);assert.equal(perfectGrade.percent,100);assert.equal(perfectGrade.correct,lymph.exam.questions.length);
const wrong={...perfect,[lymph.exam.questions[0].id]:99};assert.equal(context.window.gradeExam(lymph.exam,wrong).correct,lymph.exam.questions.length-1);
for(const exam of [
 {questions:[]},
 {questions:[{type:'unknown',prompt:'x'}]},
 {questions:[{type:'mcq',prompt:'x',options:['a','b'],correctIndex:3}]},
 {questions:[{type:'fill-blank',prompt:'x',answers:[]}]},
 {questions:[{type:'select-number',prompt:'x',min:0,max:1000,step:1,answer:2}]},
 {questions:[{type:'match',prompt:'x',pairs:[{left:'a',right:'x'},{left:'b',right:'x'}]}]}
])assert.throws(()=>context.window.validateExam(exam));
assert.equal(context.window.buildExamModel(JSON.parse(fs.readFileSync('lectures/heart-drugs-pharmacology.json'))).questions.length>0,true);
console.log('PASS: mixed-format exam validation, grading, and legacy MCQ derivation.');

const specimen=JSON.parse(fs.readFileSync('step-processes.example.json')).blocks.find(block=>block.type==='step-process'&&block.resultSets?.length);
for(const mutate of [
  block=>block.steps.push({...block.steps[0]}),
  block=>block.steps.length=1,
  block=>block.domain='other',
  block=>delete block.pathway,
  block=>block.steps[0].pathway='Another pathway',
  block=>block.branches=[],
  block=>block.resultSets[0].fromStep='missing',
  block=>block.resultSets[0].defaultResult='',
  block=>block.resultSets[0].alternatives[0].steps[0].id=block.steps[0].id,
  block=>block.resultSets.push({...block.resultSets[0]}),
  block=>block.steps[0].details=[{label:'',value:'x'}]
]){const copy=JSON.parse(JSON.stringify(specimen));mutate(copy);assert.throws(()=>context.window.validateStepProcess(copy));}
console.log('PASS: one-pathway contract, result sets, unique IDs, details, references, and domains.');

const trackedDocuments=['medical-lecture.template.json','step-processes.example.json'].map(file=>JSON.parse(fs.readFileSync(file)));
for(const document of trackedDocuments){
  const tracked=document.blocks.filter(block=>block.type==='tracked-step-process');assert.equal(tracked.length,2);
  assert.deepEqual(new Set(tracked.map(block=>block.track.kind)),new Set(['time','location']));
  for(const block of tracked){
    assert(block.steps.every(step=>typeof step.trackLabel==='string'));
    for(const set of block.resultSets||[])for(const alternative of set.alternatives)assert(alternative.steps.every(step=>typeof step.trackLabel==='string'));
  }
}
const trackedSpecimen=trackedDocuments[1].blocks.find(block=>block.type==='tracked-step-process'&&block.track.kind==='time');
for(const mutate of [
  block=>delete block.track,
  block=>block.track.kind='distance',
  block=>delete block.steps[0].trackLabel,
  block=>delete block.resultSets[0].alternatives[0].steps[0].trackLabel
]){const copy=JSON.parse(JSON.stringify(trackedSpecimen));mutate(copy);assert.throws(()=>context.window.validateStepProcess(copy));}
const regularWithTrack=JSON.parse(JSON.stringify(specimen));regularWithTrack.track={kind:'time'};assert.throws(()=>context.window.validateStepProcess(regularWithTrack));
console.log('PASS: tracked process time/location axes and required labels.');

for(const file of ['lectures/carbohydrate-biochemistry.json','lectures/heart-drugs-pharmacology.json']){
  const document=JSON.parse(fs.readFileSync(file)),sources=new Set(document.sources.map(source=>source.id)),processes=document.blocks.filter(block=>block.type==='step-process');
  assert.equal(document.schemaVersion,4);
  assert.equal(sources.size,document.sources.length);
  for(const block of document.blocks)for(const id of block.sourceIds||[])assert(sources.has(id));
  assert(fs.statSync(file).size<250000);
  assert(processes.length>=4);
  assert.equal(document.blocks.every(block=>block.type!=='process-'+'diagram'),true);
  for(const block of processes){
    assert.equal(typeof block.pathway,'string');
    assert.equal('branches' in block,false);
    assert(block.steps.every(step=>!('pathway' in step)));
    for(const set of block.resultSets||[]){assert.equal(typeof set.defaultResult,'string');assert(set.alternatives.length>0);}
  }
}
const processSource=fs.readFileSync('step-process.js','utf8');
assert(processSource.includes("'Result · '+selected"));
assert(processSource.includes('is-result-changed'));
assert(processSource.includes('pathway branches are not allowed'));
assert(processSource.includes("block.type==='tracked-step-process'"));
console.log('PASS: lecture sources, singular pathway identity, result color states, file size, and retired graph/branch models.');
