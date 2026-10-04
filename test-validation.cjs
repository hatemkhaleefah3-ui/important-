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
  {title:'x',schemaVersion:4,blocks:[{type:'paragraph',text:'x'}]},
  {title:'x',blocks:[{type:'unknown'}]},
  {title:'x',blocks:[{type:'table',columns:['a'],rows:[['a','b']]}]},
  {title:'x',blocks:[{type:'question',prompt:'p',answer:'a',options:['a','b'],correctIndex:9}]},
  {title:'x',blocks:[{type:'flow',steps:[null]}]}
])assert.throws(()=>validate(bad));

const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
console.log('PASS: JSON files, legacy schema, invalid inputs, and inline JavaScript syntax.');

const process=JSON.parse(fs.readFileSync('step-processes.example.json')).blocks.find(block=>block.type==='step-process'&&block.branches?.length);
for(const mutate of [
  block=>block.steps.push({...block.steps[0]}),
  block=>block.steps.length=1,
  block=>block.domain='other',
  block=>block.branches[0].fromStep='missing',
  block=>block.branches[0].steps[0].id=block.steps[0].id,
  block=>block.branches.push({...block.branches[0]}),
  block=>block.steps[0].details=[{label:'',value:'x'}]
]){const copy=JSON.parse(JSON.stringify(process));mutate(copy);assert.throws(()=>context.window.validateStepProcess(copy));}
console.log('PASS: step-process bounds, unique IDs, details, branch references, and domains.');

for(const file of ['lectures/carbohydrate-biochemistry.json','lectures/heart-drugs-pharmacology.json']){
  const document=JSON.parse(fs.readFileSync(file)),sources=new Set(document.sources.map(source=>source.id));
  assert.equal(sources.size,document.sources.length);
  for(const block of document.blocks)for(const id of block.sourceIds||[])assert(sources.has(id));
  assert(fs.statSync(file).size<250000);
  assert.equal(document.blocks.filter(block=>block.type==='step-process').length,4);
  assert.equal(document.blocks.every(block=>block.type!=='process-'+'diagram'),true);
}
console.log('PASS: both lectures, source IDs, step processes, file size, and removal of the retired graph block.');
