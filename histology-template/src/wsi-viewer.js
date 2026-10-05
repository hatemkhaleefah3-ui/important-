import OpenSeadragon from 'openseadragon';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class WsiViewer {
  constructor({ element, config, overlays = [], onReady, onError }) {
    this.element = element;
    this.config = config;
    this.overlayGroups = new Map();
    this.ready = false;
    this.viewer = OpenSeadragon({
      element,
      tileSources: config.dzi_url,
      showNavigator: config.show_navigator !== false,
      navigatorPosition: 'BOTTOM_RIGHT',
      navigatorAutoFade: false,
      showNavigationControl: false,
      animationTime: 0.75,
      blendTime: 0.15,
      constrainDuringPan: true,
      visibilityRatio: 0.5,
      minZoomImageRatio: 0.75,
      maxZoomPixelRatio: config.max_zoom_pixel_ratio || 4,
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
      crossOriginPolicy: 'Anonymous',
      ajaxWithCredentials: false
    });
    this.viewer.addHandler('open', () => {
      this.tiledImage = this.viewer.world.getItemAt(0);
      this.ready = true;
      this.renderOverlays(overlays);
      onReady?.();
    });
    this.viewer.addHandler('open-failed', event => onError?.(new Error(event.message || 'The DZI slide could not be opened.')));
  }

  focusWaypoint({ x, y, zoom_level }) {
    if (!this.ready || !this.tiledImage) throw new Error('The slide is not ready yet.');
    const point = this.tiledImage.imageToViewportCoordinates(x, y);
    const viewportZoom = this.tiledImage.imageToViewportZoom(zoom_level);
    this.viewer.viewport.panTo(point, false);
    this.viewer.viewport.zoomTo(viewportZoom, point, false);
    this.viewer.viewport.applyConstraints(false);
  }

  zoomBy(factor) {
    this.viewer.viewport.zoomBy(factor);
    this.viewer.viewport.applyConstraints();
  }

  home() { this.viewer.viewport.goHome(); }

  renderOverlays(groups) {
    this.clearOverlays();
    const bounds = this.tiledImage.imageToViewportRectangle(
      0, 0, this.config.image_width, this.config.image_height
    );
    for (const group of groups) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${this.config.image_width} ${this.config.image_height}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-label', group.label);
      svg.style.pointerEvents = 'none';
      svg.style.overflow = 'visible';
      for (const shape of group.shapes) svg.append(this.createShape(shape, group.color));
      this.viewer.addOverlay({ element: svg, location: bounds, checkResize: false });
      this.overlayGroups.set(group.id, svg);
      this.setOverlayVisibility(group.id, group.visible_by_default !== false);
    }
  }

  createShape(shape, color) {
    const group = document.createElementNS(SVG_NS, 'g');
    const node = document.createElementNS(SVG_NS, shape.type === 'rectangle' ? 'rect' : 'polygon');
    let labelX;
    let labelY;
    if (shape.type === 'rectangle') {
      for (const attribute of ['x', 'y', 'width', 'height']) node.setAttribute(attribute, shape[attribute]);
      node.setAttribute('rx', Math.max(25, Math.min(shape.width, shape.height) * 0.04));
      labelX = shape.x;
      labelY = shape.y;
    } else {
      node.setAttribute('points', shape.points.map(point => `${point.x},${point.y}`).join(' '));
      labelX = Math.min(...shape.points.map(point => point.x));
      labelY = Math.min(...shape.points.map(point => point.y));
    }
    node.setAttribute('fill', color);
    node.setAttribute('fill-opacity', '0.12');
    node.setAttribute('stroke', color);
    node.setAttribute('stroke-width', '2');
    node.setAttribute('vector-effect', 'non-scaling-stroke');
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = shape.label;
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', labelX);
    label.setAttribute('y', Math.max(1000, labelY - 300));
    label.setAttribute('fill', '#ffffff');
    label.setAttribute('font-size', '1000');
    label.setAttribute('font-weight', '700');
    label.setAttribute('stroke', '#0f172a');
    label.setAttribute('stroke-width', '180');
    label.setAttribute('paint-order', 'stroke');
    label.textContent = shape.label;
    group.dataset.label = shape.label;
    group.append(title, node, label);
    return group;
  }

  setOverlayVisibility(id, visible) {
    const group = this.overlayGroups.get(id);
    if (group) group.style.display = visible ? '' : 'none';
  }

  clearOverlays() {
    this.viewer.clearOverlays();
    this.overlayGroups.clear();
  }

  destroy() { this.viewer.destroy(); }
}
