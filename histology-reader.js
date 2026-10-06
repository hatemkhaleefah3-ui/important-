(() => {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const fail = (ok, message) => { if (!ok) throw Error(message); };
  const finite = (value, path) => fail(typeof value === 'number' && Number.isFinite(value), path + ' must be a finite number');
  const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validateSource(source, path) {
    fail(source && typeof source === 'object', path + ' is required.');
    fail(['dzi', 'iiif', 'image'].includes(source.type), path + '.type is unsupported.');
    const key = source.type === 'iiif' ? 'info_url' : 'url';
    fail(typeof source[key] === 'string' && (source.type === 'image' ? /^(?:https?:|data:image\/)/i : /^https?:/i).test(source[key]), path + '.' + key + ' is invalid.');
  }

  function validateFallback(source, path) {
    fail(source && typeof source === 'object', path + ' is invalid.');
    fail(['pdf', 'pptx', 'docx'].includes(source.fileType), path + '.fileType is unsupported.');
    if (source.crop) {
      fail(Array.isArray(source.crop) && source.crop.length === 4 && source.crop.every(value => typeof value === 'number' && Number.isFinite(value)), path + '.crop is invalid.');
      const [x, y, width, height] = source.crop;
      fail(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1, path + '.crop must stay within the normalized page bounds.');
    }
    if (source.fileType === 'pdf') {
      fail(Number.isInteger(source.page) && source.page > 0, path + '.page must be a positive integer.');
    } else if (source.fileType === 'pptx') {
      fail(Number.isInteger(source.slide) && source.slide > 0, path + '.slide must be a positive integer.');
      fail(typeof source.media === 'string' || (Number.isInteger(source.image) && source.image > 0), path + ' requires media or image.');
    } else {
      fail(typeof source.media === 'string' || (Number.isInteger(source.image) && source.image > 0), path + ' requires media or image.');
    }
  }

  function validateSections(data, slideIds, legacy) {
    fail(Array.isArray(data.sections) && data.sections.length, 'sections must be a non-empty array.');
    const ids = new Set();
    data.sections.forEach((section, si) => {
      fail(section && typeof section.id === 'string' && idPattern.test(section.id), 'sections[' + si + '].id is invalid.');
      fail(!ids.has(section.id), 'Duplicate id: ' + section.id); ids.add(section.id);
      fail(typeof section.title === 'string' && section.title.trim(), 'sections[' + si + '].title is required.');
      fail(Array.isArray(section.blocks) && section.blocks.length, 'sections[' + si + '].blocks must not be empty.');
      section.blocks.forEach((block, bi) => {
        fail(block.type === 'paragraph', 'Only paragraph blocks are supported.');
        fail(Array.isArray(block.nodes) && block.nodes.length, 'Paragraph nodes must not be empty.');
        block.nodes.forEach((item, ni) => {
          const path = 'sections[' + si + '].blocks[' + bi + '].nodes[' + ni + ']';
          fail(['text', 'strong', 'slide', 'waypoint'].includes(item.type), path + '.type is unsupported.');
          fail(typeof item.text === 'string' && item.text.trim(), path + '.text is required.');
          if (item.type === 'slide') fail(slideIds.has(item.slide_id), path + '.slide_id is unknown.');
          if (item.type === 'waypoint') {
            fail(typeof item.id === 'string' && idPattern.test(item.id), path + '.id is invalid.');
            fail(!ids.has(item.id), 'Duplicate id: ' + item.id); ids.add(item.id);
            if (!legacy) fail(slideIds.has(item.slide_id), path + '.slide_id is unknown.');
            for (const key of ['x', 'y', 'zoom_level']) finite(item[key], path + '.' + key);
            fail(item.x >= 0 && item.y >= 0 && item.zoom_level > 0, path + ' coordinates are invalid.');
            if (legacy) fail(item.x <= data.viewer.image_width && item.y <= data.viewer.image_height, path + ' lies outside the slide.');
          }
        });
      });
    });
  }

  function validateHistologyLecture(data) {
    fail(data && typeof data === 'object' && !Array.isArray(data), 'The histology JSON root must be an object.');
    fail([1, 2].includes(data.schema_version), 'schema_version must equal 1 or 2.');
    fail(data.metadata && typeof data.metadata === 'object', 'metadata is required.');
    for (const key of ['id', 'title', 'subject', 'description']) fail(typeof data.metadata[key] === 'string' && data.metadata[key].trim(), 'metadata.' + key + ' is required.');

    if (data.schema_version === 1) {
      fail(data.viewer && typeof data.viewer === 'object', 'viewer is required.');
      fail(typeof data.viewer.dzi_url === 'string' && /^https?:\/\//i.test(data.viewer.dzi_url), 'viewer.dzi_url must be an HTTP(S) URL.');
      fail(data.viewer.coordinate_space === 'image-pixels', 'viewer.coordinate_space must be image-pixels.');
      finite(data.viewer.image_width, 'viewer.image_width'); finite(data.viewer.image_height, 'viewer.image_height');
      fail(data.viewer.image_width > 0 && data.viewer.image_height > 0, 'Slide dimensions must be positive.');
      validateSections(data, new Set(['primary']), true);
    } else {
      fail(Array.isArray(data.slides) && data.slides.length, 'slides must be a non-empty array.');
      const slideIds = new Set();
      data.slides.forEach((slide, index) => {
        const path = 'slides[' + index + ']';
        fail(slide && typeof slide.id === 'string' && idPattern.test(slide.id), path + '.id is invalid.');
        fail(!slideIds.has(slide.id), 'Duplicate slide id: ' + slide.id); slideIds.add(slide.id);
        fail(typeof slide.label === 'string' && slide.label.trim(), path + '.label is required.');
        fail(slide.source || slide.fallback, path + ' requires source or fallback.');
        if (slide.source) validateSource(slide.source, path + '.source');
        if (slide.fallback) validateFallback(slide.fallback, path + '.fallback');
        if (slide.request) {
          for (const key of ['organ', 'stain', 'diagnosis', 'species']) fail(typeof slide.request[key] === 'string' && slide.request[key].trim(), path + '.request.' + key + ' is required.');
        }
      });
      validateSections(data, slideIds, false);
    }
    return data;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function isPlaceholderSlide(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === 'slides.example-med.org' || host.endsWith('.example-med.org') || host.endsWith('.example');
    } catch { return false; }
  }

  function renderHistologyLecture(input) {
    const data = validateHistologyLecture(input);
    document.title = data.metadata.title + ' · ' + data.metadata.subject;
    document.body.className = 'histology-page'; document.body.innerHTML = '';

    const root = element('main', 'histo-root');
    const content = element('section', 'histo-content');
    const viewerPane = element('aside', 'histo-viewer-pane');
    const head = element('header', 'histo-head');
    const copy = element('div', 'histo-head-copy');
    const subject = element('p', 'histo-subject', data.metadata.subject);
    const title = element('h1', '', data.metadata.title);
    const mobileOpen = element('button', 'histo-mobile-open', 'Explore slides'); mobileOpen.type = 'button';
    copy.append(subject, title); head.append(copy, mobileOpen); content.append(head);

    const body = element('div', 'histo-copy');
    const intro = element('div', 'histo-intro');
    intro.append(element('span', '', 'Interactive histology lecture'), element('p', '', data.metadata.description)); body.append(intro);
    if (data.schema_version === 2 && data.slides.some(slide => slide.resolution === 'automatic-best-match')) {
      const notice = element('aside', 'histo-match-notice');
      notice.append(element('strong', '', 'Automated archive matching'), element('span', '', 'These whole-slide specimens were selected algorithmically from their metadata. Verify organ, stain, and diagnosis before relying on them.'));
      body.append(notice);
    }

    const interactiveButtons = [];
    data.sections.forEach((section, index) => {
      const sectionNode = element('section', 'histo-section'); sectionNode.id = section.id;
      sectionNode.append(element('span', 'histo-section-number', 'Section ' + String(index + 1).padStart(2, '0')), element('h2', '', section.title));
      section.blocks.forEach(block => {
        const paragraph = element('p', '');
        block.nodes.forEach(item => {
          if (item.type === 'slide' || item.type === 'waypoint') {
            const button = element('button', 'histo-waypoint', item.text); button.type = 'button';
            button.dataset.slide = item.slide_id || 'primary';
            button.setAttribute('aria-label', 'View ' + item.text + ' in the slide viewer');
            button.addEventListener('click', () => item.type === 'waypoint' ? focusWaypoint(button, item) : activateSlide(button, item.slide_id));
            interactiveButtons.push(button); paragraph.append(button);
          } else paragraph.append(element(item.type === 'strong' ? 'strong' : 'span', '', item.text));
        });
        sectionNode.append(paragraph);
      });
      body.append(sectionNode);
    });
    content.append(body);

    const viewerHead = element('div', 'histo-viewer-head');
    const viewerName = element('div', '');
    const viewerKicker = element('span', '', 'Specimen viewer');
    const viewerLabel = element('strong', '', 'Preparing slide…');
    const status = element('span', 'histo-status', 'Loading…');
    const close = element('button', 'histo-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close slide viewer');
    viewerName.append(viewerKicker, viewerLabel); viewerHead.append(viewerName, status, close);

    const stage = element('div', 'histo-stage');
    const viewer = element('div', 'histo-viewer'); viewer.id = 'histo-osd'; viewer.tabIndex = 0;
    const error = element('div', 'histo-error'); error.hidden = true;
    const controls = element('div', 'histo-controls'); stage.append(viewer, error, controls);
    const slideBar = element('div', 'histo-slide-bar');
    const provenance = element('div', 'histo-provenance');
    const overlayBar = element('div', 'histo-overlays');
    viewerPane.append(viewerHead, stage, slideBar, provenance, overlayBar); root.append(content, viewerPane); document.body.append(root);

    mobileOpen.onclick = () => document.body.classList.add('histo-viewer-open');
    close.onclick = () => document.body.classList.remove('histo-viewer-open');

    const slides = data.schema_version === 1 ? [{
      id: 'primary', label: data.viewer.label || data.metadata.title,
      source: { type: 'dzi', url: data.viewer.dzi_url }, overlays: data.overlays || [],
      image_width: data.viewer.image_width, image_height: data.viewer.image_height
    }] : data.slides;
    const slideMap = new Map(slides.map(slide => [slide.id, slide]));
    let osd = null, tiled = null, currentSlide = null, pendingWaypoint = null, activeContent = null, activeSlideButton = null;
    const overlayElements = new Map();

    function showError(message) {
      error.classList.remove('histo-setup'); error.hidden = false; error.textContent = message; status.textContent = 'Slide unavailable';
    }
    function showSetup(message) {
      error.classList.add('histo-setup'); error.hidden = false;
      error.replaceChildren(element('strong', '', 'Slide source is not connected'), element('span', '', message));
      status.textContent = 'Not connected';
    }
    function suppressNativeError() {
      requestAnimationFrame(() => viewer.querySelectorAll('div').forEach(node => {
        if (!node.children.length && /Unable to open|attempting to load TileSource/i.test(node.textContent || '')) { node.hidden = true; node.setAttribute('aria-hidden', 'true'); }
      }));
    }
    function tileSource(slide) {
      if (slide.source.type === 'image') return { type: 'image', url: slide.source.url };
      if (slide.source.type === 'iiif') return slide.source.info_url;
      return slide.source.url;
    }
    function slideFailure() {
      showError('This slide source could not be loaded. Verify provider availability, CORS permission, and the stored source URL.'); suppressNativeError();
    }
    function activateSlide(contentButton, id, waypoint = null) {
      document.body.classList.add('histo-viewer-open');
      const slide = slideMap.get(id || slides[0].id);
      if (!slide) { showError('The requested slide is not present in this lecture.'); return; }
      if (activeContent) activeContent.removeAttribute('aria-current');
      if (contentButton) { activeContent = contentButton; contentButton.setAttribute('aria-current', 'true'); }
      pendingWaypoint = waypoint;
      if (currentSlide?.id === slide.id && tiled) { if (waypoint) applyWaypoint(waypoint); else osd.viewport.goHome(); return; }
      currentSlide = slide; tiled = null; error.classList.remove('histo-setup'); error.hidden = true; viewerLabel.textContent = slide.label; status.textContent = 'Loading slide…';
      provenance.replaceChildren();
      if (slide.resolution === 'automatic-best-match') {
        provenance.append(element('strong', '', 'Automatic match · verify specimen'), element('span', '', slide.source?.source_label || 'Digital Slide Archive'));
        if (slide.provider_url) {
          const link = element('a', '', 'Source record ↗'); link.href = slide.provider_url; link.target = '_blank'; link.rel = 'noopener noreferrer'; provenance.append(link);
        }
      } else if (slide.source?.source_label) {
        provenance.append(element('strong', '', slide.resolution === 'lecture-image-fallback' ? 'Lecture-file fallback' : 'Slide source'), element('span', '', slide.source.source_label));
      }
      provenance.hidden = !provenance.childElementCount;
      if (activeSlideButton) activeSlideButton.removeAttribute('aria-current');
      activeSlideButton = slideBar.querySelector('[data-slide-id="' + slide.id + '"]'); activeSlideButton?.setAttribute('aria-current', 'true');
      const sourceUrl = slide.source?.url || slide.source?.info_url;
      if (!slide.source) { showSetup('No verified API source or extracted lecture image was resolved for this specimen.'); return; }
      if (isPlaceholderSlide(sourceUrl)) { showSetup('Replace the placeholder with a verified IIIF/DZI source or import the original lecture file to extract its fallback image.'); return; }
      osd.open(tileSource(slide));
    }
    function applyWaypoint(waypoint) {
      if (!tiled) return;
      const point = tiled.imageToViewportCoordinates(waypoint.x, waypoint.y);
      const zoom = tiled.imageToViewportZoom(waypoint.zoom_level);
      osd.viewport.panTo(point, false); osd.viewport.zoomTo(zoom, point, false); osd.viewport.applyConstraints(false);
    }
    function focusWaypoint(button, waypoint) { activateSlide(button, waypoint.slide_id || 'primary', waypoint); }
    function control(label, text, handler) {
      const button = element('button', '', text); button.type = 'button'; button.setAttribute('aria-label', label); button.onclick = handler; controls.append(button);
    }

    slideBar.append(element('span', '', 'Slides'));
    slides.forEach(slide => {
      const button = element('button', '', slide.label); button.type = 'button'; button.dataset.slideId = slide.id;
      button.onclick = () => activateSlide(null, slide.id); slideBar.append(button);
    });
    if (slides.length < 2) slideBar.hidden = true;

    if (!window.OpenSeadragon) { showError('OpenSeadragon could not be loaded. Check the network connection.'); return; }
    const viewerOptions = data.schema_version === 1 ? data.viewer : (data.viewer_options || {});
    osd = OpenSeadragon({
      element: viewer, showNavigator: viewerOptions.show_navigator !== false, navigatorPosition: 'BOTTOM_RIGHT', navigatorAutoFade: false,
      showNavigationControl: false, animationTime: .75, blendTime: .15, constrainDuringPan: true, visibilityRatio: .5,
      minZoomImageRatio: .75, maxZoomPixelRatio: viewerOptions.max_zoom_pixel_ratio || 4,
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true }, crossOriginPolicy: 'Anonymous', ajaxWithCredentials: false
    });
    control('Zoom in', '+', () => { osd.viewport.zoomBy(1.5); osd.viewport.applyConstraints(); });
    control('Zoom out', '−', () => { osd.viewport.zoomBy(1 / 1.5); osd.viewport.applyConstraints(); });
    control('Reset slide view', '⌂', () => osd.viewport.goHome());
    control('Toggle full screen', '⛶', () => document.fullscreenElement ? document.exitFullscreen() : viewerPane.requestFullscreen());
    osd.addHandler('open', () => {
      tiled = osd.world.getItemAt(0); status.textContent = currentSlide?.resolution === 'lecture-image-fallback' ? 'Lecture image' : currentSlide?.resolution === 'automatic-best-match' ? 'Automatic WSI match' : 'Slide ready';
      renderOverlays(currentSlide?.overlays || []);
      if (pendingWaypoint) { const waypoint = pendingWaypoint; pendingWaypoint = null; applyWaypoint(waypoint); }
    });
    osd.addHandler('open-failed', slideFailure);

    function shapeElement(shape, color) {
      const group = document.createElementNS(SVG, 'g');
      const mark = document.createElementNS(SVG, shape.type === 'rectangle' ? 'rect' : 'polygon'); let x, y;
      if (shape.type === 'rectangle') { for (const key of ['x', 'y', 'width', 'height']) mark.setAttribute(key, shape[key]); x = shape.x; y = shape.y; }
      else { mark.setAttribute('points', shape.points.map(point => point.x + ',' + point.y).join(' ')); x = Math.min(...shape.points.map(point => point.x)); y = Math.min(...shape.points.map(point => point.y)); }
      mark.setAttribute('fill', color); mark.setAttribute('fill-opacity', '.12'); mark.setAttribute('stroke', color); mark.setAttribute('stroke-width', '2'); mark.setAttribute('vector-effect', 'non-scaling-stroke');
      const label = document.createElementNS(SVG, 'text'); label.setAttribute('x', x); label.setAttribute('y', Math.max(1000, y - 300)); label.setAttribute('fill', '#fff'); label.setAttribute('font-size', '1000'); label.setAttribute('font-weight', '700'); label.setAttribute('stroke', '#0f172a'); label.setAttribute('stroke-width', '180'); label.setAttribute('paint-order', 'stroke'); label.textContent = shape.label;
      const tip = document.createElementNS(SVG, 'title'); tip.textContent = shape.label; group.append(tip, mark, label); return group;
    }
    function renderOverlays(groups) {
      osd.clearOverlays(); overlayElements.clear(); overlayBar.replaceChildren();
      if (!groups.length) { overlayBar.hidden = true; return; }
      overlayBar.hidden = false; overlayBar.append(element('span', '', 'Diagnostic overlays'));
      const width = currentSlide.image_width, height = currentSlide.image_height;
      if (!width || !height) { overlayBar.hidden = true; return; }
      const bounds = tiled.imageToViewportRectangle(0, 0, width, height);
      groups.forEach(group => {
        const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height); svg.setAttribute('preserveAspectRatio', 'none'); svg.style.pointerEvents = 'none';
        group.shapes.forEach(shape => svg.append(shapeElement(shape, group.color))); osd.addOverlay({ element: svg, location: bounds, checkResize: false }); overlayElements.set(group.id, svg);
        svg.style.display = group.visible_by_default === false ? 'none' : '';
        const label = element('label', ''), input = document.createElement('input'), dot = element('i', ''), text = element('b', '', group.label);
        input.type = 'checkbox'; input.checked = group.visible_by_default !== false; dot.style.background = group.color;
        input.onchange = () => { const target = overlayElements.get(group.id); if (target) target.style.display = input.checked ? '' : 'none'; };
        label.append(input, dot, text); overlayBar.append(label);
      });
    }

    activateSlide(null, slides[0].id);
  }

  window.validateHistologyLecture = validateHistologyLecture;
  window.renderHistologyLecture = renderHistologyLecture;
  window.isPlaceholderHistologySlide = isPlaceholderSlide;
})();
