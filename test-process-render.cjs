const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={setProperty(){}};this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this.attributes[key]=value;}
 get childElementCount(){return this.children.length;}
 querySelector(selector){return find(this,selector.slice(1))[0]||null;}
}
function find(root,cls){return root.children.flatMap(node=>[...(node.className?.split(' ').includes(cls)?[node]:[]),...find(node,cls)]);}
const context={window:{},document:{createElement:tag=>new Node(tag)}};vm.createContext(context);
vm.runInContext(fs.readFileSync('step-process.js','utf8'),context);
context.validateStepProcess=context.window.validateStepProcess;
const blocks=JSON.parse(fs.readFileSync('step-processes.example.json')).blocks;
const original=blocks.find(block=>block.type==='step-process');
assert.equal(find(context.window.renderStepProcess(original,'regular'),'step-process-track-marker').length,0);
const tracked=blocks.find(block=>block.type==='tracked-step-process'&&block.track.kind==='time');
const specimen=JSON.parse(JSON.stringify(tracked));
specimen.resultSets[0].alternatives[0].steps[0].trackLabel='2 hours';
const root=context.window.renderStepProcess(specimen,'tracked');
const markers=()=>find(root,'step-process-track-marker').map(node=>node.textContent);
assert.deepEqual(markers(),['0 min','5 min','1 hour']);
find(root,'step-detail-toggle')[0].onclick();assert.equal(find(root,'step-process-detail')[0].hidden,false);
assert.deepEqual(markers(),['0 min','5 min','1 hour']);
find(root,'step-result-toggle')[0].onclick();
assert.deepEqual(markers(),['0 min','5 min','2 hours']);
assert.equal(find(root,'is-result-changed').length,2);
assert.equal(find(root,'step-process-identity')[0].textContent,'One pathway · '+specimen.pathway);
find(root,'step-result-toggle')[0].onclick();
assert.deepEqual(markers(),['0 min','5 min','1 hour']);
assert.equal(find(root,'is-result-changed').length,0);
console.log('PASS: shared renderer, details, result switching, marker replacement, color states, and fixed pathway identity.');
