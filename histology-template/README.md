# Histology & Pathology WSI lecture template

Static histology authoring package for Cloudflare Pages. The root website supports legacy single-DZI lectures and semantic multi-slide lectures backed by verified DZI/IIIF sources or images extracted from the original lecture file.

## Contract

- `histology-lecture.schema.json` is the normative JSON Schema (draft 2020-12).
- `public/data/lymph-node-histology.json` is the schema-v2 multi-slide example.
- `public/data/liver-hepatic-lobule.json` is the backward-compatible schema-v1 DZI example.
- `public/data/slide-catalog.json` is the verified external-slide allowlist. It is intentionally empty until a stable, licensed provider is added.
- Waypoint `x` and `y` are source-image pixels.
- Waypoint `zoom_level` is OpenSeadragon image zoom: `1` means native image resolution, `0.5` means half resolution.
- Rectangle and polygon overlay coordinates are also source-image pixels.
- IDs must be unique across sections and waypoints; overlay group IDs must be unique within `overlays`.

In schema v2, every item in `slides` declares a semantic `request` and either a usable `source` or an exact `fallback` location in a PDF, PPTX, or DOCX. The website uses a catalog source only when organ, stain, diagnosis, and species match and the catalog entry is marked `verified`. Otherwise it extracts the declared fallback from the user-selected lecture file. It never chooses a merely similar public image.

The schema-v1 DZI hostname is intentionally a placeholder. The viewer recognizes it and shows a calm setup state instead of making a failed network request.

## Local development

```bash
npm install
npm run dev
```

Select another lecture without rebuilding:

```text
http://localhost:5173/?lecture=https://content.example.org/lectures/case-42.json
```

The lecture JSON and DZI endpoint must permit the Pages origin through CORS. The renderer uses DOM `textContent` for JSON-authored prose and restricts remote URLs to HTTP(S); it does not interpret authored HTML.

## Cloudflare Pages

Configure the GitHub-backed Pages project with:

| Setting | Value |
|---|---|
| Root directory | `histology-template` |
| Build command | `npm install --no-audit --no-fund && npm run build` |
| Build output | `dist` |
| Node.js | 22 LTS or later |

`vite.config.js` uses a relative asset base, so immutable build assets work on preview and production hostnames. `public/_headers` supplies security headers and long-lived caching for fingerprinted assets.

## R2 object layout

Keep the descriptor and its sibling tile directory together:

```text
liver-hepatic-lobule/
├── liver-he.dzi
└── liver-he_files/
    ├── 0/0_0.jpeg
    ├── 1/0_0.jpeg
    └── ...
```

If the descriptor is at:

```text
https://slides.example-med.org/liver-hepatic-lobule/liver-he.dzi
```

OpenSeadragon resolves tiles below:

```text
https://slides.example-med.org/liver-hepatic-lobule/liver-he_files/{level}/{column}_{row}.jpeg
```

Enable public read access through an R2 custom domain. Replace the placeholder origins in `r2-cors.json`, then apply it:

```bash
npx wrangler r2 bucket cors set YOUR_BUCKET --file r2-cors.json
npx wrangler r2 bucket cors list YOUR_BUCKET
```

Use explicit production and preview origins instead of `*` when the set of consumers is controlled. Purge the R2 custom-domain cache after changing CORS on a bucket already serving traffic.

## Integrated website flow

1. Choose **Histology & pathology → Web app**.
2. Import the schema-v2 histology JSON.
3. If the JSON has unresolved fallbacks, import the original lecture PDF, PPTX, or DOCX.
4. `histology-slide-resolver.js` checks the verified catalog, then extracts only the declared fallback locations.
5. `histology-reader.js` initializes OpenSeadragon and provides a slide switcher, navigator, text-to-slide buttons, waypoints, and overlays.
6. The generated long link contains the resolved lecture and requires no database.

## Operational constraints

- R2 must return CORS headers for the Pages origin on both the `.dzi` descriptor and every tile.
- The JSON dimensions must equal the DZI source dimensions; mismatch shifts waypoints and overlays.
- Schema v2 supports multiple slides; a waypoint must name its `slide_id`.
- The client has no PHI controls or authorization boundary. Do not publish identifiable clinical material from a public bucket.
