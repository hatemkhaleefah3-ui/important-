import './styles.css';
import { loadLecture } from './lecture-model.js';
import { WsiViewer } from './wsi-viewer.js';

const app = document.querySelector('#app');
const lectureUrl = new URLSearchParams(location.search).get('lecture') || './data/liver-hepatic-lobule.json';
let wsi;
let activeWaypoint;

const icon = path => `<svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">${path}</svg>`;
const icons = {
  target: icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  minus: icon('<path d="M5 12h14"/>'),
  home: icon('<path d="m3 11 9-8 9 8v9h-6v-6H9v6H3z"/>'),
  expand: icon('<path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/>'),
  close: icon('<path d="m6 6 12 12M18 6 6 18"/>')
};

function button(label, glyph, className = '') {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${className}`;
  element.setAttribute('aria-label', label);
  element.innerHTML = `${glyph}<span class="sr-only">${label}</span>`;
  return element;
}

function renderShell(lecture) {
  document.title = `${lecture.metadata.title} · ${lecture.metadata.subject}`;
  app.innerHTML = '';
  const shell = document.createElement('main');
  shell.className = 'min-h-screen lg:grid lg:h-screen lg:grid-cols-[minmax(360px,44%)_1fr] lg:overflow-hidden';
  shell.innerHTML = `
    <section id="content-pane" class="min-h-screen overflow-y-auto bg-stone-50 lg:min-h-0">
      <header class="sticky top-0 z-20 border-b border-slate-200/80 bg-stone-50/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div><p class="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800"></p><h1 class="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl"></h1></div>
          <button id="open-viewer" type="button" class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-pathology-900 px-3.5 py-2.5 text-sm font-bold text-white shadow-md lg:hidden">${icons.target} Explore slide</button>
        </div>
      </header>
      <div class="mx-auto max-w-3xl px-5 pb-24 pt-9 sm:px-8 sm:pt-12">
        <div class="rounded-3xl border border-emerald-900/10 bg-pathology-100/70 p-6 sm:p-8">
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-pathology-700">Whole-slide interactive lecture</p>
          <p id="lecture-description" class="mt-4 font-serif text-lg leading-8 text-slate-700"></p>
        </div>
        <div id="lecture-sections" class="lecture-copy mt-12 space-y-14"></div>
      </div>
    </section>
    <aside id="viewer-pane" class="osd-shell hidden h-screen min-h-[520px] flex-col bg-slate-950 lg:sticky lg:top-0 lg:flex" aria-label="Whole slide image viewer">
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
        <div><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Live specimen</p><p id="viewer-label" class="mt-0.5 truncate text-sm font-semibold"></p></div>
        <div class="flex items-center gap-2"><span id="viewer-status" class="hidden text-xs text-emerald-200 sm:inline">Loading slide…</span><button id="close-viewer" type="button" class="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden" aria-label="Close viewer">${icons.close}</button></div>
      </div>
      <div class="relative min-h-0 flex-1">
        <div id="wsi-viewer" class="h-full w-full bg-slate-950" tabindex="0" aria-label="Pan and zoom microscope slide"></div>
        <div id="viewer-error" class="pointer-events-none absolute inset-x-5 top-5 hidden rounded-2xl border border-red-300/30 bg-red-950/90 p-4 text-sm text-red-100 shadow-xl"></div>
        <div id="viewer-controls" class="absolute bottom-5 left-5 z-10 flex gap-2"></div>
      </div>
      <div id="overlay-controls" class="border-t border-white/10 bg-slate-950/95 p-4 text-white"></div>
    </aside>`;
  app.append(shell);

  shell.querySelector('header p').textContent = lecture.metadata.subject;
  shell.querySelector('h1').textContent = lecture.metadata.title;
  shell.querySelector('#lecture-description').textContent = lecture.metadata.description;
  shell.querySelector('#viewer-label').textContent = lecture.viewer.label || lecture.metadata.title;

  const sectionRoot = shell.querySelector('#lecture-sections');
  lecture.sections.forEach((section, index) => sectionRoot.append(renderSection(section, index)));
  renderOverlayControls(lecture.overlays || []);
  wireViewerShell();
}

function renderSection(section, index) {
  const wrapper = document.createElement('section');
  wrapper.id = section.id;
  const eyebrow = document.createElement('p');
  eyebrow.className = 'text-xs font-bold uppercase tracking-[0.2em] text-emerald-800';
  eyebrow.textContent = `Section ${String(index + 1).padStart(2, '0')}`;
  const title = document.createElement('h2');
  title.className = 'mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl';
  title.textContent = section.title;
  wrapper.append(eyebrow, title);
  section.blocks.forEach(block => {
    const paragraph = document.createElement('p');
    paragraph.className = 'mt-6';
    block.nodes.forEach(node => paragraph.append(renderNode(node)));
    wrapper.append(paragraph);
  });
  return wrapper;
}

function renderNode(node) {
  if (node.type === 'waypoint') {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'waypoint';
    control.dataset.waypointId = node.id;
    control.setAttribute('aria-label', `View ${node.text} on the slide`);
    control.append(document.createTextNode(node.text));
    const marker = document.createElement('span');
    marker.innerHTML = icons.target;
    control.prepend(marker.firstElementChild);
    control.addEventListener('click', () => activateWaypoint(control, node));
    return control;
  }
  const element = document.createElement(node.type === 'strong' ? 'strong' : 'span');
  element.textContent = node.text;
  return element;
}

function activateWaypoint(control, waypoint) {
  document.body.classList.add('mobile-viewer-open');
  if (activeWaypoint) activeWaypoint.removeAttribute('aria-current');
  activeWaypoint = control;
  control.setAttribute('aria-current', 'true');
  try { wsi.focusWaypoint(waypoint); }
  catch (error) { showViewerError(error); }
}

function renderOverlayControls(groups) {
  const root = document.querySelector('#overlay-controls');
  if (!groups.length) { root.hidden = true; return; }
  const heading = document.createElement('p');
  heading.className = 'mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55';
  heading.textContent = 'Diagnostic overlays';
  const list = document.createElement('div');
  list.className = 'flex flex-wrap gap-2';
  groups.forEach(group => {
    const label = document.createElement('label');
    label.className = 'flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = group.visible_by_default !== false;
    input.className = 'h-4 w-4 accent-emerald-400';
    input.addEventListener('change', () => wsi?.setOverlayVisibility(group.id, input.checked));
    const dot = document.createElement('span');
    dot.className = 'h-2.5 w-2.5 rounded-full';
    dot.style.backgroundColor = group.color;
    label.append(input, dot, document.createTextNode(group.label));
    list.append(label);
  });
  root.append(heading, list);
}

function wireViewerShell() {
  document.querySelector('#open-viewer').addEventListener('click', () => document.body.classList.add('mobile-viewer-open'));
  document.querySelector('#close-viewer').addEventListener('click', () => document.body.classList.remove('mobile-viewer-open'));
  const controls = document.querySelector('#viewer-controls');
  const zoomIn = button('Zoom in', icons.plus);
  const zoomOut = button('Zoom out', icons.minus);
  const home = button('Reset slide view', icons.home);
  const full = button('Toggle full screen', icons.expand);
  zoomIn.addEventListener('click', () => wsi.zoomBy(1.5));
  zoomOut.addEventListener('click', () => wsi.zoomBy(1 / 1.5));
  home.addEventListener('click', () => wsi.home());
  full.addEventListener('click', () => {
    const shell = document.querySelector('#viewer-pane');
    if (document.fullscreenElement) document.exitFullscreen(); else shell.requestFullscreen();
  });
  controls.append(zoomIn, zoomOut, home, full);
}

function showViewerError(error) {
  const panel = document.querySelector('#viewer-error');
  panel.textContent = error.message;
  panel.classList.remove('hidden');
  document.querySelector('#viewer-status').textContent = 'Slide unavailable';
}

function renderFatal(error) {
  app.innerHTML = '';
  const panel = document.createElement('main');
  panel.className = 'grid min-h-screen place-items-center bg-slate-950 p-6 text-white';
  const card = document.createElement('div');
  card.className = 'max-w-xl rounded-3xl border border-red-300/20 bg-red-950/40 p-8';
  const title = document.createElement('h1');
  title.className = 'text-2xl font-black';
  title.textContent = 'Lecture could not be loaded';
  const message = document.createElement('p');
  message.className = 'mt-4 leading-7 text-red-100';
  message.textContent = error.message;
  card.append(title, message);
  panel.append(card);
  app.append(panel);
}

async function bootstrap() {
  try {
    const lecture = await loadLecture(lectureUrl);
    renderShell(lecture);
    wsi = new WsiViewer({
      element: document.querySelector('#wsi-viewer'),
      config: lecture.viewer,
      overlays: lecture.overlays,
      onReady: () => { document.querySelector('#viewer-status').textContent = 'Slide ready'; },
      onError: showViewerError
    });
  } catch (error) { renderFatal(error); }
}

bootstrap();
