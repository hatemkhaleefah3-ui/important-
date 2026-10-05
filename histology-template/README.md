# Histology & Pathology WSI lecture template

Static Vite application for Cloudflare Pages. Lecture text and slide navigation are JSON-driven; Deep Zoom Image (DZI) descriptors and tiles are served from a public Cloudflare R2 custom domain.

## Contract

- `histology-lecture.schema.json` is the normative JSON Schema (draft 2020-12).
- `public/data/liver-hepatic-lobule.json` is a complete authoring example.
- Waypoint `x` and `y` are source-image pixels.
- Waypoint `zoom_level` is OpenSeadragon image zoom: `1` means native image resolution, `0.5` means half resolution.
- Rectangle and polygon overlay coordinates are also source-image pixels.
- IDs must be unique across sections and waypoints; overlay group IDs must be unique within `overlays`.

The example DZI hostname is intentionally a placeholder. Replace `viewer.dzi_url`, `image_width`, and `image_height` with the uploaded slide's actual values before deployment.

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

## Interaction flow

1. `loadLecture()` fetches and structurally validates the JSON.
2. `WsiViewer` initializes OpenSeadragon with the DZI URL and navigator.
3. A waypoint click calls `TiledImage.imageToViewportCoordinates(x, y)` and `TiledImage.imageToViewportZoom(zoom_level)`.
4. The viewport pans and zooms to the converted point.
5. Overlay groups are rendered as full-slide SVG layers and toggled without rebuilding the viewer.

## Operational constraints

- R2 must return CORS headers for the Pages origin on both the `.dzi` descriptor and every tile.
- The JSON dimensions must equal the DZI source dimensions; mismatch shifts waypoints and overlays.
- This template assumes one WSI per lecture. Multi-slide cases require a slide ID on every waypoint/overlay and a tile-source switch before navigation.
- The client has no PHI controls or authorization boundary. Do not publish identifiable clinical material from a public bucket.
