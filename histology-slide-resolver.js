(() => {
  'use strict';

  const normalized = value => String(value || '').trim().toLowerCase();
  const exact = (request, candidate, key) => {
    const wanted = normalized(request?.[key]);
    return !wanted || wanted === normalized(candidate?.[key]);
  };

  function findCatalogSlide(request, catalog) {
    if (!request || !Array.isArray(catalog?.slides)) return null;
    return catalog.slides.find(candidate =>
      candidate?.verified === true &&
      candidate.source &&
      exact(request, candidate, 'organ') &&
      exact(request, candidate, 'stain') &&
      exact(request, candidate, 'diagnosis') &&
      exact(request, candidate, 'species')
    ) || null;
  }

  async function findAutomaticSlide(request, catalog, onProgress) {
    const provider = catalog?.providers?.find(entry => entry?.enabled === true && entry.type === 'dsa-search');
    if (!provider || !request) return null;
    onProgress('Searching the public whole-slide archive for ' + request.organ + '…');
    const url = new URL(provider.endpoint, location.origin);
    for (const key of ['organ', 'stain', 'diagnosis', 'species']) url.searchParams.set(key, request[key] || '');
    url.searchParams.set('structures', (request.structures || []).join('|'));
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw Error('Online whole-slide search is unavailable (HTTP ' + response.status + ').');
    const payload = await response.json();
    return payload.match || null;
  }

  async function resolveHistologySlides(data, sourceFile, catalog = { slides: [] }, onProgress = () => {}) {
    if (data.schema_version !== 2) return data;
    const result = structuredClone(data);
    const unresolved = [];

    for (const slide of result.slides) {
      if (slide.source) continue;
      const match = findCatalogSlide(slide.request, catalog);
      if (match) {
        slide.source = structuredClone(match.source);
        slide.source.attribution ||= match.attribution;
        slide.source.license ||= match.license;
        slide.catalog_match = match.id;
        slide.resolution = 'verified-catalog';
      } else if (catalog?.policy === 'automatic-best-match') {
        let automatic = null;
        try {
          automatic = await findAutomaticSlide(slide.request, catalog, onProgress);
        } catch (error) {
          if (!sourceFile || !slide.fallback) throw error;
          onProgress('Online search failed; using the selected lecture-file fallback for ' + slide.label + '.');
        }
        if (automatic) {
          slide.source = automatic.source;
          slide.catalog_match = automatic.id;
          slide.image_width = automatic.image_width;
          slide.image_height = automatic.image_height;
          slide.provider_url = automatic.provider_url;
          slide.match_score = automatic.score;
          slide.resolution = 'automatic-best-match';
        } else if (slide.fallback) {
          unresolved.push(slide);
        } else {
          throw Error('No online whole-slide match or lecture-image fallback is available for “' + slide.label + '”.');
        }
      } else if (slide.fallback) {
        unresolved.push(slide);
      } else {
        throw Error('No verified catalog slide or lecture-image fallback is available for “' + slide.label + '”.');
      }
    }

    if (unresolved.length) {
      if (!sourceFile) throw Error('Select the original lecture file to resolve ' + unresolved.length + ' unmatched histology image' + (unresolved.length === 1 ? '' : 's') + '.');
      const temporary = {
        title: result.metadata.title,
        blocks: unresolved.map(slide => ({
          type: 'image',
          processName: slide.label,
          alt: slide.alt || slide.label,
          source: slide.fallback
        }))
      };
      const extracted = await window.resolveLectureImages(temporary, sourceFile, onProgress);
      unresolved.forEach((slide, index) => {
        const image = extracted.blocks[index];
        slide.source = {
          type: 'image',
          url: image.imageData,
          source_label: image.sourceLabel,
          attribution: result.metadata.author || 'Uploaded lecture file'
        };
        slide.resolution = 'lecture-image-fallback';
      });
    }

    return result;
  }

  window.findCatalogSlide = findCatalogSlide;
  window.findAutomaticHistologySlide = findAutomaticSlide;
  window.resolveHistologySlides = resolveHistologySlides;
})();
