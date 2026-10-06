const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{},URL,structuredClone};vm.createContext(context);
vm.runInContext(fs.readFileSync('step-process.js','utf8'),context);
context.validateStepProcess=context.window.validateStepProcess;
vm.runInContext(fs.readFileSync('special-flows.js','utf8'),context);
context.validateStructureLayers=context.window.validateStructureLayers;
context.validateSubstanceJourney=context.window.validateSubstanceJourney;
vm.runInContext(fs.readFileSync('exam.js','utf8'),context);
context.validateExam=context.window.validateExam;
vm.runInContext(fs.readFileSync('lecture.js','utf8'),context);
const validate=context.window.validateLecture;

const files=['medical-lecture.example.json','medical-lecture.template.json','step-processes.example.json','lectures/carbohydrate-biochemistry.json','lectures/heart-drugs-pharmacology.json'];
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
  {title:'x',blocks:[{type:'structure-layers',title:'Wall',structure:'Organ',layers:[{id:'a',title:'A'}]}]},
  {title:'x',blocks:[{type:'substance-journey',title:'Trip',substance:'X',stages:[{id:'a',title:'A',location:'Blood'}]}]},
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
const specialFlowSource=fs.readFileSync('special-flows.js','utf8');new vm.Script(specialFlowSource);
const appSource=fs.readFileSync('app.js','utf8');new vm.Script(appSource);
for(const asset of ['lecture.css?v=4.6.0','step-process.js?v=4.5.0','special-flows.js?v=1.0.0','exam.js?v=4.5.0','lecture.js?v=4.6.0','selection-translate.js?v=4.5.0','image-extractor.js?v=4.5.0','app.js?v=2.2.0','cdn.jsdelivr.net/npm/jszip@3.10.1'])assert(html.includes(asset));
assert(html.includes('lectures/carbohydrate-biochemistry.json?v=4.5.0'));
assert(html.includes('lectures/heart-drugs-pharmacology.json?v=4.5.0'));
assert(appSource.includes("+'#lecture='+enc(output)"));
assert(appSource.includes('accept=".pdf,.pptx,.docx'));
assert(imageExtractorSource.includes("import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.min.mjs')"));
assert(imageExtractorSource.includes('window.JSZip.loadAsync'));
assert(imageExtractorSource.includes("toDataURL('image/webp'"));
assert(imageExtractorSource.includes('Math.floor(1120000/images.length)'));
assert(!html.includes('LectureLinks'));
assert(!html.includes('sharing.js'));
assert(appSource.includes("option('web'"));
assert(appSource.includes('Step ${step} of 2'));
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

const examDocument=JSON.parse(fs.readFileSync('medical-lecture.template.json'));
const examTypes=new Set(examDocument.exam.questions.map(question=>question.type));
assert.deepEqual(examTypes,new Set(['mcq','medical-history-mcq','fill-blank','select-number','match']));
const perfect={};examDocument.exam.questions.forEach((question,index)=>{const key=question.id||'question-'+(index+1);if(['mcq','medical-history-mcq'].includes(question.type))perfect[key]=question.correctIndex;else if(question.type==='fill-blank')perfect[key]=question.answers[0];else if(question.type==='select-number')perfect[key]=question.answer;else perfect[key]=Object.fromEntries(question.pairs.map(pair=>[pair.left,pair.right]))});
const perfectGrade=context.window.gradeExam(examDocument.exam,perfect);assert.equal(perfectGrade.percent,100);assert.equal(perfectGrade.correct,examDocument.exam.questions.length);
const wrong={...perfect,[examDocument.exam.questions[0].id]:99};assert.equal(context.window.gradeExam(examDocument.exam,wrong).correct,examDocument.exam.questions.length-1);
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

for(const file of ['medical-lecture.template.json','step-processes.example.json']){
  const document=JSON.parse(fs.readFileSync(file)),layers=document.blocks.filter(block=>block.type==='structure-layers'),journeys=document.blocks.filter(block=>block.type==='substance-journey');
  assert.equal(layers.length,1);assert.equal(journeys.length,1);context.window.validateStructureLayers(layers[0]);context.window.validateSubstanceJourney(journeys[0]);
}
const specialDocument=JSON.parse(fs.readFileSync('step-processes.example.json')),layerSpecimen=specialDocument.blocks.find(block=>block.type==='structure-layers'),journeySpecimen=specialDocument.blocks.find(block=>block.type==='substance-journey');
for(const mutate of [block=>block.layers[1].id=block.layers[0].id,block=>block.layers[0].relativeThickness=0,block=>block.direction='deep-to-superficial']){const copy=JSON.parse(JSON.stringify(layerSpecimen));mutate(copy);assert.throws(()=>context.window.validateStructureLayers(copy));}
for(const mutate of [block=>block.stages[1].id=block.stages[0].id,block=>block.stages[0].fraction=101,block=>block.stages[0].phase='unknown']){const copy=JSON.parse(JSON.stringify(journeySpecimen));mutate(copy);assert.throws(()=>context.window.validateSubstanceJourney(copy));}
assert(specialFlowSource.includes('Separate layers'));assert(specialFlowSource.includes('Trace journey'));
console.log('PASS: structural-layer and substance-journey contracts, examples, and boundaries.');

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
