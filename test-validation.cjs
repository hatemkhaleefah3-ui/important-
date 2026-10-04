const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('step-process.js','utf8'),context);
context.validateStepProcess=context.window.validateStepProcess;
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
  {title:'x',blocks:[{type:'flow',steps:[null]}]}
])assert.throws(()=>validate(bad));

const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
for(const asset of ['lecture.css?v=4.2.1','step-process.js?v=4.2.1','lecture.js?v=4.2.1'])assert(html.includes(asset));
assert(html.includes('lectures/carbohydrate-biochemistry.json?v=4.2.1'));
assert(html.includes('lectures/heart-drugs-pharmacology.json?v=4.2.1'));
assert(!files.some(path=>fs.readFileSync(path,'utf8').includes('"agent": "Next step"')));
console.log('PASS: JSON files, legacy schema, invalid inputs, versioned assets, and inline JavaScript syntax.');

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
