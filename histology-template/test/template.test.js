import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

test('schema and example are valid JSON with all required feature types', () => {
  const schema = JSON.parse(read('histology-lecture.schema.json'));
  const lecture = JSON.parse(read('public/data/liver-hepatic-lobule.json'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(lecture.schema_version, 1);
  assert.match(lecture.viewer.dzi_url, /^https:\/\/.*\.dzi$/);
  assert.equal(lecture.viewer.coordinate_space, 'image-pixels');
  const nodes = lecture.sections.flatMap(section => section.blocks.flatMap(block => block.nodes));
  assert.ok(nodes.filter(node => node.type === 'waypoint').length >= 8);
  assert.ok(lecture.overlays.some(group => group.shapes.some(shape => shape.type === 'rectangle')));
  assert.ok(lecture.overlays.some(group => group.shapes.some(shape => shape.type === 'polygon')));
});

test('source modules parse and the coordinate bridge uses TiledImage conversions', () => {
  const viewer = read('src/wsi-viewer.js');
  for (const path of ['src/wsi-viewer.js', 'src/lecture-model.js', 'src/main.js']) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(path, root))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.match(viewer, /imageToViewportCoordinates\(x, y\)/);
  assert.match(viewer, /imageToViewportZoom\(zoom_level\)/);
  assert.match(viewer, /imageToViewportRectangle/);
  assert.doesNotMatch(read('src/main.js'), /node\.text[^\n]*innerHTML/);
});

test('Cloudflare assets and R2 CORS configuration are present', () => {
  const cors = JSON.parse(read('r2-cors.json'));
  assert.deepEqual(cors.rules[0].allowed.methods, ['GET', 'HEAD']);
  assert.match(read('public/_headers'), /Content-Security-Policy/);
  const vite = read('vite.config.js');
  assert.match(vite, /base: '\.\/'/);
  assert.match(vite, /tailwindcss\(\)/);
});
