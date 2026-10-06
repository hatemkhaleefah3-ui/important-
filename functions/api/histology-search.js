const DSA_API = 'https://api.digitalslidearchive.org/api/v1';

const clean = value => String(value || '').trim().slice(0, 120);
const normalized = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function terms(value) {
  return normalized(value).split(' ').filter(term => term.length > 1);
}

function searchable(item) {
  return normalized([
    item.name,
    item.description,
    JSON.stringify(item.meta || {}),
    item.folderName,
    item.collectionName
  ].join(' '));
}

function score(item, request) {
  const text = searchable(item);
  const organ = normalized(request.organ);
  const diagnosis = normalized(request.diagnosis);
  const species = normalized(request.species);
  const stain = normalized(request.stain);
  let value = 0;

  if (organ && text.includes(organ)) value += 40;
  else if (terms(organ).every(term => text.includes(term))) value += 24;
  else return -1;

  if (diagnosis && text.includes(diagnosis)) value += 14;
  if (species && text.includes(species)) value += 8;
  if (stain && (text.includes(stain) || (stain === 'h e' && /(?:hematoxylin|\bhe\b)/.test(text)))) value += 12;
  for (const structure of request.structures || []) {
    if (text.includes(normalized(structure))) value += 2;
  }
  return value;
}

async function searchItems(query) {
  const url = new URL(DSA_API + '/resource/search');
  url.searchParams.set('q', query);
  url.searchParams.set('mode', 'text');
  url.searchParams.set('types', JSON.stringify(['item']));
  url.searchParams.set('limit', '40');
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Digital Slide Archive search returned HTTP ' + response.status + '.');
  const payload = await response.json();
  return Array.isArray(payload.item) ? payload.item : [];
}

async function isTileable(item) {
  const response = await fetch(DSA_API + '/item/' + encodeURIComponent(item._id) + '/tiles', {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) return null;
  const metadata = await response.json();
  return Number(metadata.sizeX) > 0 && Number(metadata.sizeY) > 0 ? metadata : null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const slideRequest = {
    organ: clean(url.searchParams.get('organ')),
    stain: clean(url.searchParams.get('stain')),
    diagnosis: clean(url.searchParams.get('diagnosis')),
    species: clean(url.searchParams.get('species')),
    structures: clean(url.searchParams.get('structures')).split('|').filter(Boolean).slice(0, 12)
  };
  if (!slideRequest.organ) return json({ error: 'organ is required' }, 400);

  try {
    const queries = [
      [slideRequest.organ, slideRequest.diagnosis, slideRequest.stain].filter(Boolean).join(' '),
      [slideRequest.organ, slideRequest.stain].filter(Boolean).join(' '),
      slideRequest.organ
    ];
    const seen = new Map();
    for (const query of [...new Set(queries)]) {
      for (const item of await searchItems(query)) seen.set(item._id, item);
      if (seen.size >= 20) break;
    }

    const ranked = [...seen.values()]
      .map(item => ({ item, score: score(item, slideRequest) }))
      .filter(candidate => candidate.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    for (const candidate of ranked) {
      const metadata = await isTileable(candidate.item);
      if (!metadata) continue;
      const id = candidate.item._id;
      return json({
        match: {
          id,
          name: candidate.item.name || slideRequest.organ + ' whole-slide image',
          score: candidate.score,
          source: {
            type: 'dzi',
            url: DSA_API + '/item/' + encodeURIComponent(id) + '/tiles/dzi.dzi',
            source_label: 'Digital Slide Archive · ' + (candidate.item.name || id),
            attribution: 'Automatically selected from the public Digital Slide Archive API'
          },
          image_width: Number(metadata.sizeX),
          image_height: Number(metadata.sizeY),
          provider_url: 'https://api.digitalslidearchive.org/#item/' + encodeURIComponent(id)
        }
      });
    }
    return json({ match: null, reason: 'No tileable archive item matched the requested organ.' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Archive search failed.' }, 502);
  }
}
