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
vm.runInContext(fs.readFileSync('special-flows.js','utf8'),context);
context.validateStructureLayers=context.window.validateStructureLayers;
context.validateSubstanceJourney=context.window.validateSubstanceJourney;
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
const layerBlock=blocks.find(block=>block.type==='structure-layers'),layerRoot=context.window.renderStructureLayers(layerBlock,'layers');
assert.equal(find(layerRoot,'layer-slab').length,4);assert.equal(find(layerRoot,'is-active').length,1);find(layerRoot,'layer-slab')[2].onclick();assert.equal(find(layerRoot,'is-active')[0],find(layerRoot,'layer-slab')[2]);assert.equal(find(layerRoot,'layer-progress')[0].textContent,'67% depth');find(layerRoot,'layer-explode')[0].onclick();assert.match(layerRoot.className,/is-exploded/);
const journeyBlock=blocks.find(block=>block.type==='substance-journey'),journeyRoot=context.window.renderSubstanceJourney(journeyBlock,'journey');
assert.equal(find(journeyRoot,'journey-node').length,6);assert.equal(find(journeyRoot,'is-active').length,1);find(journeyRoot,'journey-node')[3].onclick();assert.equal(find(journeyRoot,'is-active')[0],find(journeyRoot,'journey-node')[3]);assert.equal(find(journeyRoot,'journey-counter')[0].textContent,'04 / 06');find(journeyRoot,'primary-journey-nav')[0].onclick();assert.equal(find(journeyRoot,'journey-counter')[0].textContent,'05 / 06');
console.log('PASS: reaction/tracked renderers plus structural layers and substance-journey interactions.');
