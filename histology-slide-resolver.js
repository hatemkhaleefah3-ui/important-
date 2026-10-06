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
  window.resolveHistologySlides = resolveHistologySlides;
})();
