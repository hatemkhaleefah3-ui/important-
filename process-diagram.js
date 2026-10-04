/* Native SVG connections and HTML controls; no remote libraries or executable JSON. */
(() => {
'use strict';
const domains=new Set(['chemistry','pathology','pharmacology']);
const kinds=new Set(['reaction','activation','inhibition','transport','progression','reversible']);
const text=(v)=>typeof v==='string'&&v.trim().length>0;
window.validateDiagram=b=>{
 if(!domains.has(b.domain))throw Error('process-diagram domain must be chemistry, pathology, or pharmacology.');
 if(!text(b.title))throw Error('Process diagram needs a title.');
 if(!Array.isArray(b.nodes)||!b.nodes.length||b.nodes.length>24)throw Error('Process diagrams need 1–24 nodes.');
 if(!Array.isArray(b.edges)||b.edges.length>48)throw Error('Process diagrams need an edges array with at most 48 connections.');
 const ids=new Set(),positions=new Set();
 for(const n of b.nodes){
 if(!n||!text(n.id)||!text(n.title)||ids.has(n.id))throw Error('Diagram nodes need unique IDs and titles.');
 if(!Number.isInteger(n.column)||n.column<0||n.column>5||!Number.isInteger(n.lane)||n.lane<0||n.lane>3)throw Error('Node columns must be 0–5 and lanes 0–3.');
 const pos=n.column+':'+n.lane;if(positions.has(pos))throw Error('Two diagram nodes cannot occupy the same position.');positions.add(pos);ids.add(n.id);
 for(const k of ['description','formula','compartment','badge'])if(n[k]!=null&&typeof n[k]!=='string')throw Error('Node '+k+' must be text.');
 if(n.details!=null&&(!Array.isArray(n.details)||n.details.length>12||n.details.some(d=>!d||!text(d.label)||typeof d.value!=='string')))throw Error('Node details need label/value pairs.');
 }
 const pairs=new Set();
 for(const e of b.edges){if(!e||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to||!kinds.has(e.kind))throw Error('Connections need distinct existing endpoints and a supported kind.');if(e.label!=null&&typeof e.label!=='string')throw Error('Connection labels must be text.');const pair=e.from+'\0'+e.to;if(pairs.has(pair))throw Error('Duplicate directed connection.');pairs.add(pair)}
 if(b.paths!=null){if(!Array.isArray(b.paths)||!b.paths.length||b.paths.length>12)throw Error('Use 1–12 tracking paths.');const pathIds=new Set();for(const p of b.paths){if(!p||!text(p.id)||pathIds.has(p.id)||!text(p.title)||!Array.isArray(p.nodes)||!p.nodes.length||p.nodes.length>48||p.nodes.some(id=>!ids.has(id)))throw Error('Paths need unique IDs, titles, and existing node IDs.');pathIds.add(p.id);for(let i=1;i<p.nodes.length;i++){const from=p.nodes[i-1],to=p.nodes[i];if(!b.edges.some(e=>e.from===from&&e.to===to||e.kind==='reversible'&&e.from===to&&e.to===from))throw Error('Tracking path includes unconnected stages.')}}}
 return b;
};
const el=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!=null)n.textContent=t;return n};
const svgEl=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n};
window.renderProcessDiagram=(b,uid)=>{
 validateDiagram(b);const root=el('div','diagram '+b.domain),heading=el('div','diagram-heading');heading.append(el('div','overline',b.domain+' / Process atlas'),el('h3','',b.title));if(b.description)heading.append(el('p','',b.description));root.append(heading);
 const help=el('p','diagram-help','Select a stage to inspect its mechanism. Choose a route to trace a connected process.');root.append(help);
 const scroll=el('div','diagram-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',b.title+' diagram; scroll horizontally for all stages');
 const columns=Math.max(...b.nodes.map(n=>n.column))+1,lanes=Math.max(...b.nodes.map(n=>n.lane))+1,W=columns*248+48,H=lanes*178+32;
 const canvas=el('div','diagram-canvas');canvas.style.width=W+'px';canvas.style.height=H+'px';canvas.style.setProperty('--print-scale',String(Math.min(1,640/W)));const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,'aria-hidden':'true'});const defs=svgEl('defs',{});
 for(const type of ['arrow','bar']){const m=svgEl('marker',{id:uid+'-'+type,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:8,markerHeight:8,orient:'auto-start-reverse'});m.append(svgEl('path',{d:type==='arrow'?'M1 1 L9 5 L1 9 Z':'M8 0 L8 10',fill:type==='arrow'?'context-stroke':'none',stroke:'context-stroke','stroke-width':type==='arrow'?0:2}));defs.append(m)}svg.append(defs);canvas.append(svg);
 const positions=new Map(b.nodes.map(n=>[n.id,{x:24+n.column*248,y:30+n.lane*178}])),nodeMap=new Map(b.nodes.map(n=>[n.id,n])),edges=[];
 b.edges.forEach(e=>{const a=positions.get(e.from),z=positions.get(e.to);let sx=a.x+200,sy=a.y+59,tx=z.x,ty=z.y+59,d;
 if(z.x>a.x){d=`M ${sx} ${sy} C ${sx+32} ${sy},${tx-32} ${ty},${tx} ${ty}`}
 else if(z.x===a.x){sx=a.x+100;tx=z.x+100;sy=z.y>a.y?a.y+118:a.y;ty=z.y>a.y?z.y:z.y+118;d=`M ${sx} ${sy} L ${tx} ${ty}`}
 else{sx=a.x+100;sy=a.y;tx=z.x+100;ty=z.y;const bend=Math.max(8,Math.min(a.y,z.y)-20);d=`M ${sx} ${sy} C ${sx} ${bend},${tx} ${bend},${tx} ${ty}`}
 const group=svgEl('g',{class:'diagram-edge '+e.kind}),path=svgEl('path',{d,fill:'none','marker-end':`url(#${uid}-${e.kind==='inhibition'?'bar':'arrow'})`});if(e.kind==='reversible')path.setAttribute('marker-start',`url(#${uid}-arrow)`);group.append(path);
 if(e.label){const label=svgEl('text',{x:(sx+tx)/2,y:(sy+ty)/2-10,'text-anchor':'middle'});label.textContent=e.label;group.append(label)}svg.append(group);edges.push({e,group});
 });
 const controls=el('div','diagram-controls'),routeLabel=el('label','overline','Track route'),select=el('select');select.id=uid+'-route';routeLabel.htmlFor=select.id;const paths=b.paths||[],none=el('option','','Explore freely');none.value='';select.append(none);paths.forEach((p,i)=>{const option=el('option','',p.title);option.value=String(i);select.append(option)});const prev=el('button','','← Previous'),next=el('button','','Next →'),status=el('span','diagram-stage');prev.type=next.type='button';status.setAttribute('aria-live','polite');controls.append(routeLabel,select,prev,status,next);
 const detail=el('div','diagram-detail');detail.id=uid+'-detail';detail.setAttribute('aria-live','polite');const buttons=new Map();let route=null,step=0,selected=b.nodes[0].id;
 const update=()=>{const n=nodeMap.get(selected);buttons.forEach((btn,id)=>{btn.setAttribute('aria-pressed',id===selected);btn.classList.toggle('on-route',!!route&&route.nodes.includes(id));btn.classList.toggle('visited',!!route&&route.nodes.slice(0,step).includes(id))});edges.forEach(({e,group})=>{const active=!!route&&route.nodes.some((id,i)=>i>0&&(route.nodes[i-1]===e.from&&id===e.to||e.kind==='reversible'&&route.nodes[i-1]===e.to&&id===e.from));group.classList.toggle('on-route',active)});detail.replaceChildren(el('div','overline',n.compartment||b.domain),el('h4','',n.title));if(n.formula)detail.append(el('div','diagram-formula',n.formula));if(n.description)detail.append(el('p','',n.description));if(n.details?.length){const dl=el('dl');n.details.forEach(d=>dl.append(el('dt','',d.label),el('dd','',d.value)));detail.append(dl)}prev.disabled=!route||step===0;next.disabled=!route||step===route.nodes.length-1;status.textContent=route?'Stage '+(step+1)+' / '+route.nodes.length:'Explore';};
 const move=i=>{step=i;selected=route.nodes[step];update();const btn=buttons.get(selected);const x=positions.get(selected).x;scroll.scrollTo({left:Math.max(0,x-scroll.clientWidth/2+100),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});btn.focus({preventScroll:true})};
 b.nodes.forEach((n,i)=>{const pos=positions.get(n.id),btn=el('button','diagram-node');btn.type='button';btn.style.left=pos.x+'px';btn.style.top=pos.y+'px';btn.setAttribute('aria-controls',detail.id);btn.setAttribute('aria-label',n.title+(n.formula?', '+n.formula:''));btn.append(el('span','diagram-node-top',n.badge||String(i+1).padStart(2,'0')),el('strong','',n.title),el('span','diagram-node-meta',n.formula||n.compartment||'Inspect stage ↗'));btn.onclick=()=>{selected=n.id;if(route){const ix=route.nodes.indexOf(n.id);if(ix<0){route=null;select.value=''}else step=ix}update()};buttons.set(n.id,btn);canvas.append(btn)});
 select.onchange=()=>{route=select.value===''?null:paths[Number(select.value)];step=0;if(route){selected=route.nodes[0];update();move(0)}else update()};prev.onclick=()=>move(step-1);next.onclick=()=>move(step+1);scroll.append(canvas);root.append(scroll,controls);
 const legend=el('div','diagram-legend');[...new Set(b.edges.map(e=>e.kind))].forEach(kind=>legend.append(el('span',kind,kind)));root.append(legend,detail);
 const accessible=el('details','diagram-connections');accessible.append(el('summary','','Read all connections'));const list=el('ul');b.edges.forEach(e=>list.append(el('li','',nodeMap.get(e.from).title+' '+(e.kind==='reversible'?'↔':'→')+' '+nodeMap.get(e.to).title+' · '+e.kind+(e.label?' · '+e.label:''))));accessible.append(list);root.append(accessible);const printDetails=el('div','diagram-print-details');b.nodes.forEach(n=>{const item=el('div');item.append(el('h4','',n.title));if(n.formula)item.append(el('p','',n.formula));if(n.description)item.append(el('p','',n.description));if(n.details)n.details.forEach(d=>item.append(el('p','',d.label+': '+d.value)));printDetails.append(item)});root.append(printDetails);window.addEventListener('beforeprint',()=>{accessible.dataset.wasOpen=String(accessible.open);accessible.open=true});window.addEventListener('afterprint',()=>{accessible.open=accessible.dataset.wasOpen==='true'});update();return root;
};
})();
