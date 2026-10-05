const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const TYPES = new Set(['text', 'waypoint', 'strong']);

function invariant(condition, message) {
  if (!condition) throw new Error(`Invalid lecture JSON: ${message}`);
}

function finite(value, path) {
  invariant(typeof value === 'number' && Number.isFinite(value), `${path} must be a finite number`);
}

function safeRemoteUrl(value, path) {
  invariant(typeof value === 'string' && value.length > 0, `${path} is required`);
  const parsed = new URL(value, window.location.href);
  invariant(HTTP_PROTOCOLS.has(parsed.protocol), `${path} must use http or https`);
  return parsed.href;
}

export function validateLecture(input) {
  invariant(input && typeof input === 'object' && !Array.isArray(input), 'root must be an object');
  invariant(input.schema_version === 1, 'schema_version must equal 1');
  invariant(input.metadata && typeof input.metadata === 'object', 'metadata is required');
  for (const key of ['id', 'title', 'subject', 'description']) {
    invariant(typeof input.metadata[key] === 'string' && input.metadata[key].trim(), `metadata.${key} is required`);
  }
  invariant(input.viewer && typeof input.viewer === 'object', 'viewer is required');
  input.viewer.dzi_url = safeRemoteUrl(input.viewer.dzi_url, 'viewer.dzi_url');
  invariant(input.viewer.coordinate_space === 'image-pixels', 'viewer.coordinate_space must be image-pixels');
  finite(input.viewer.image_width, 'viewer.image_width');
  finite(input.viewer.image_height, 'viewer.image_height');
  invariant(input.viewer.image_width > 0 && input.viewer.image_height > 0, 'image dimensions must be positive');
  invariant(Array.isArray(input.sections) && input.sections.length > 0, 'sections must be a non-empty array');

  const ids = new Set();
  input.sections.forEach((section, sectionIndex) => {
    invariant(typeof section.id === 'string' && section.id, `sections[${sectionIndex}].id is required`);
    invariant(!ids.has(section.id), `duplicate id ${section.id}`);
    ids.add(section.id);
    invariant(typeof section.title === 'string' && section.title, `sections[${sectionIndex}].title is required`);
    invariant(Array.isArray(section.blocks) && section.blocks.length > 0, `sections[${sectionIndex}].blocks must not be empty`);
    section.blocks.forEach((block, blockIndex) => {
      invariant(block.type === 'paragraph', `sections[${sectionIndex}].blocks[${blockIndex}].type must be paragraph`);
      invariant(Array.isArray(block.nodes) && block.nodes.length > 0, `sections[${sectionIndex}].blocks[${blockIndex}].nodes must not be empty`);
      block.nodes.forEach((node, nodeIndex) => {
        const path = `sections[${sectionIndex}].blocks[${blockIndex}].nodes[${nodeIndex}]`;
        invariant(TYPES.has(node.type), `${path}.type is unsupported`);
        invariant(typeof node.text === 'string' && node.text, `${path}.text is required`);
        if (node.type === 'waypoint') {
          invariant(typeof node.id === 'string' && node.id, `${path}.id is required`);
          invariant(!ids.has(node.id), `duplicate id ${node.id}`);
          ids.add(node.id);
          finite(node.x, `${path}.x`);
          finite(node.y, `${path}.y`);
          finite(node.zoom_level, `${path}.zoom_level`);
          invariant(node.x >= 0 && node.x <= input.viewer.image_width, `${path}.x is outside the slide`);
          invariant(node.y >= 0 && node.y <= input.viewer.image_height, `${path}.y is outside the slide`);
          invariant(node.zoom_level > 0, `${path}.zoom_level must be positive`);
        }
      });
    });
  });

  const overlayIds = new Set();
  (input.overlays || []).forEach((group, groupIndex) => {
    const path = `overlays[${groupIndex}]`;
    invariant(typeof group.id === 'string' && group.id, `${path}.id is required`);
    invariant(!overlayIds.has(group.id), `duplicate overlay id ${group.id}`);
    overlayIds.add(group.id);
    invariant(typeof group.label === 'string' && group.label, `${path}.label is required`);
    invariant(/^#[0-9a-f]{6}$/i.test(group.color), `${path}.color must be a six-digit hex color`);
    invariant(Array.isArray(group.shapes) && group.shapes.length > 0, `${path}.shapes must not be empty`);
    group.shapes.forEach((shape, shapeIndex) => {
      const shapePath = `${path}.shapes[${shapeIndex}]`;
      invariant(['rectangle', 'polygon'].includes(shape.type), `${shapePath}.type is unsupported`);
      invariant(typeof shape.label === 'string' && shape.label, `${shapePath}.label is required`);
      if (shape.type === 'rectangle') {
        ['x', 'y', 'width', 'height'].forEach(key => finite(shape[key], `${shapePath}.${key}`));
        invariant(shape.width > 0 && shape.height > 0, `${shapePath} dimensions must be positive`);
      } else {
        invariant(Array.isArray(shape.points) && shape.points.length >= 3, `${shapePath}.points requires at least three points`);
        shape.points.forEach((point, pointIndex) => {
          finite(point.x, `${shapePath}.points[${pointIndex}].x`);
          finite(point.y, `${shapePath}.points[${pointIndex}].y`);
        });
      }
    });
  });
  return input;
}

export async function loadLecture(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Lecture request failed: ${response.status} ${response.statusText}`);
  return validateLecture(await response.json());
}
