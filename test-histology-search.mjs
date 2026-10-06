import assert from 'node:assert/strict';
import { onRequestGet } from './functions/api/histology-search.js';

const calls = [];
globalThis.fetch = async input => {
  const url = new URL(String(input));
  calls.push(url.pathname);
  if (url.pathname.endsWith('/resource/search')) {
    return new Response(JSON.stringify({
      item: [
        { _id: 'wrong-organ', name: 'Normal liver H&E' },
        { _id: 'lymph-node-wsi', name: 'Human normal lymph node H&E whole slide' }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.pathname.endsWith('/item/lymph-node-wsi/tiles')) {
    return new Response(JSON.stringify({ sizeX: 100000, sizeY: 75000 }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
};

const request = new Request('https://lecture.example/api/histology-search?organ=lymph%20node&stain=H%26E&diagnosis=normal&species=human&structures=cortex%7Cmedulla');
const response = await onRequestGet({ request });
assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.match.id, 'lymph-node-wsi');
assert.equal(payload.match.source.type, 'dzi');
assert.match(payload.match.source.url, /\/item\/lymph-node-wsi\/tiles\/dzi\.dzi$/);
assert.equal(payload.match.image_width, 100000);
assert.equal(payload.match.image_height, 75000);
assert(calls.some(path => path.endsWith('/resource/search')));
assert(calls.some(path => path.endsWith('/item/lymph-node-wsi/tiles')));
console.log('PASS: automatic WSI search ranks organ/stain metadata and verifies a DZI tile pyramid.');
