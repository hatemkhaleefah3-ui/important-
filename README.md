# Verdant lecture reader

A static medical-learning generator using PDF.js and JSZip from jsDelivr. Serve this folder with any static HTTP server, open `index.html`, and use the two-step **Create something new** wizard. Choose the output format, then import the applicable lecture content.

For **Web app**, import the standard lecture JSON and optionally its PDF, PPTX, or DOCX source when image extraction is required. The generated `#lecture=` link opens the Study and Exam reader. The link embeds the complete validated JSON in its URL fragment and requires no application database. Anyone with the link can read its content.

`medical-lecture.template.json` is an authoring starter. `medical-lecture.example.json` demonstrates the complete reader. The example is educational content, not a reviewed clinical guideline.

## JSON version 4

Required fields: `title` and a non-empty `blocks` array. Set `schemaVersion` to `4`. Optional metadata: `id`, `subtitle`, `course`, `author`, `level`, and positive `durationMinutes`. Imports are limited to 250 KB and 200 blocks. Unknown blocks and malformed tables, questions, or processes produce an actionable import error. Text is rendered literally; HTML, scripts, and Markdown are not executed. Version 2 and 3 lecture files using retained block types remain compatible; version 3 `step-process.branches` are deliberately rejected because they encode pathway switching.

| Block | Fields | Behavior |
| --- | --- | --- |
| `section` | `title`, optional `id`, `description` | Creates a chapter and navigation entry |
| `paragraph` | `text`, optional `heading`, `variant: "lead"` | Body or introductory text |
| `objectives` | `items` (text array), optional `title` | Learning objectives |
| `note` | `text`, optional `title`, `variant` | Context panel |
| `callout` | `text`, optional `label` | Highlighted takeaway |
| `step-process` | `pathway`, `steps`, optional `resultSets`, `domain`, `title`, `description` | One reaction/pathway with expandable details and selectable results |
| `tracked-step-process` | Same process fields plus `track` and a `trackLabel` on every step | Same interactive process with a time or location rail |
| `structure-layers` | `structure`, ordered `layers`, optional `description` | Interactive superficial-to-deep anatomy/histology stack with layer isolation and boundary detail |
| `substance-journey` | `substance`, ordered `stages`, optional `route`, `description` | Interactive physiology/pharmacology tracer across body compartments and transformations |
| `image` | `processName`, `alt`, `source`; optional `title`, `caption` | Shows a designed placeholder while authoring and embeds the extracted source image during import |
| `flow` | `steps` (text or `{title, description}`), optional `title` | Keyboard-accessible interactive steps |
| `table` | `columns` (text array), `rows` (equal-width text arrays), optional `title` | Responsive reference table |
| `question` | `prompt`, `answer`, optional `options` and zero-based `correctIndex` | Multiple-choice feedback or revealable answer |
| `checklist` | `items` (text array), optional `title` | Saved review checklist |
| `references` | `items` (text array), optional `title` | Plain-text citations |

Legacy JSON without a version is supported, including `title` and `subtitle` blocks and string-only flow steps. The old `accent` field is ignored in favor of the unified visual design. Metadata `id` fields are for authors; navigation IDs are generated to avoid collisions.

Notes, bookmarks, checklist state, and theme are stored in this browser, keyed to the complete lecture content. Changing the lecture creates a separate saved state. They are not synced across devices. If storage is disabled, the notes panel reports that notes could not be saved. Quiz choices reset when the reader reloads.

Motion respects `prefers-reduced-motion`. Print mode omits reader controls and notes, and includes recall answers. For flow blocks, print shows all stage titles and the currently selected explanation.

Inside lecture content, double-clicking or double-tapping temporarily replaces an English word with its Arabic translation. Three clicks or taps temporarily replace the containing paragraph or text block with Arabic. Any later click, tap, or scroll restores the original English. Translation uses the MyMemory `en|ar` API and sends only the selected lecture text; controls, links, inputs, and notes are excluded. Requests are divided into segments below the API's 500-byte limit, cached for the current page, and restored without rebuilding interactive controls.

## Study and Exam pages

Every generated lecture has a Study/Exam page switcher. Study preserves the chapter navigation, processes, tables, notes, translation gestures, and images. Exam is a separate responsive workspace with completion progress, required-answer checks, scoring, pass/fail status, per-question correction, explanations, and reset behavior. The selected page is represented by `?view=exam` before the self-contained lecture fragment, so browser back/forward and refresh preserve the page.

Add a top-level `exam` object with optional `title`, `instructions`, and `passingScore` from 0 to 100. `questions` accepts 1 to 100 validated items. If `exam` is omitted, the reader derives a basic Exam page from existing study `question` blocks that contain options; this keeps older lecture files compatible.

| Exam question type | Required fields | Behavior |
| --- | --- | --- |
| `mcq` | `prompt`, `options`, zero-based `correctIndex` | Standard single-best-answer question |
| `medical-history-mcq` | `history`, `prompt`, `options`, `correctIndex` | Clinical-history panel followed by a single-best-answer question |
| `fill-blank` | `prompt`, `answers` | Text response matched against one or more accepted answers; case-insensitive by default |
| `select-number` | `prompt`, `min`, `max`, `step`, `answer` | Numeric dropdown with at most 201 choices; optional `unit` and `tolerance` |
| `match` | `prompt`, `pairs` containing unique `left` and `right` text | One dropdown for each left-side item |

Every format accepts an optional `id` and `explanation`. IDs must be unique within the exam. Answers and grading logic are embedded in the client-side JSON, so this is a study/self-assessment system rather than a secure proctored examination platform.

```json
{
  "exam": {
    "title": "Cardiovascular pharmacology exam",
    "passingScore": 70,
    "questions": [
      {
        "id": "case-1",
        "type": "medical-history-mcq",
        "history": "A concise clinical presentation.",
        "prompt": "Which mechanism best explains the finding?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 1,
        "explanation": "The decisive clue supports Option B."
      },
      {
        "id": "match-1",
        "type": "match",
        "prompt": "Match each drug to its target.",
        "pairs": [
          {"left": "Drug A", "right": "Target A"},
          {"left": "Drug B", "right": "Target B"}
        ]
      }
    ]
  }
}
```

## Image placeholders and lecture-file import

An `image` block identifies the illustrated process or structure, its accessible alternative text, and the exact source location. Put the block at the desired position in `blocks`; that order is also the image's position in the rendered lecture. The source file is processed in the browser and is not uploaded by this static app. Extracted images are compressed and embedded into the generated long lecture link.

PDF locations use a one-based page number and may include a normalized crop rectangle `[x, y, width, height]`. Values range from `0` to `1`, with the origin at the page's top-left.

```json
{
  "type": "image",
  "processName": "Glycolysis energy-investment phase",
  "title": "Steps 1–5",
  "alt": "Pathway diagram showing glucose converted to two triose phosphates",
  "caption": "Follow ATP use before the payoff phase.",
  "source": { "fileType": "pdf", "page": 6, "crop": [0.08, 0.18, 0.84, 0.64] }
}
```

PPTX locations use a one-based slide and either the one-based image occurrence on that slide or its archive media filename. DOCX locations use the one-based image occurrence in document order or its media filename. Word page numbers are intentionally not used because pagination changes with fonts and layout engines.

```json
{ "type": "image", "processName": "Drug journey", "alt": "Drug journey diagram", "source": { "fileType": "pptx", "slide": 4, "image": 2 } }
```

```json
{ "type": "image", "processName": "Pathogen development", "alt": "Pathogen development micrograph", "source": { "fileType": "docx", "image": 3 } }
```

All image placeholders in one lecture must refer to the same source file type. Supported Office files are modern `.pptx` and `.docx`; legacy `.ppt` and `.doc` must be converted first. Embedded PNG, JPEG, GIF, WebP, and SVG are accepted. EMF and WMF are not rendered. A source file may be at most 50 MB. The importer adaptively scales and encodes each figure as WebP, with JPEG fallback, against a shared approximately 1.15 MB image-data budget. The builder also rejects generated links above approximately 1.8 million characters; use fewer figures or tighter PDF crops if that limit is reached.

## Local preview and checks

Run `python -m http.server 8000`, then visit `http://localhost:8000`.
Run `node test-validation.cjs` for schema, asset, and JavaScript validation checks.
Run `node test-process-render.cjs` for renderer interaction checks, including tracked marker replacement during result changes.
Run `node test-reader.cjs` with Playwright and Chromium installed. The checks exercise desktop/mobile layout, both JSON formats, step navigation, recall feedback, saved notes, focus/theme controls, malicious strings, validation, and the import/build pipeline.

## Step-by-step processes

Add `step-process` blocks for chemistry, pathology, pharmacology, or general sequences. `step-processes.example.json` demonstrates all three scientific styles. The main template includes editable scaffolds; replace the placeholder content before teaching.

```json
{
  "type": "step-process",
  "domain": "chemistry",
  "title": "One reaction, alternative products",
  "pathway": "Example enzyme-catalyzed reaction",
  "steps": [
    { "id": "a", "title": "Substrate", "context": "Cytosol",
      "formula": "S", "agent": "binding" },
    { "id": "b", "title": "Enzyme–substrate complex", "agent": "catalysis" },
    { "id": "c", "title": "Product A" }
  ],
  "resultSets": [{
    "id": "products",
    "fromStep": "b",
    "defaultResult": "Product A",
    "alternatives": [{
      "id": "product-b",
      "title": "Product B",
      "agent": "alternate product formation",
      "steps": [{ "id": "d", "title": "Product B" }]
    }]
  }]
}
```

| Field | Contract |
| --- | --- |
| `domain` | `chemistry`, `pathology`, `pharmacology`, or `general` |
| `pathway` | Required identity of the one reaction/pathway represented by the entire block |
| `steps` | 2–24 ordered steps with globally unique `id` and a `title` |
| Step metadata | Optional `description`, `formula`, `context`, and `badge`; `details` contains up to 12 string label/value pairs. A step cannot define a pathway |
| `agent` | Optional transition label shown between this step and the next: enzyme, transporter, helper, drug target, or responsible agent |
| `resultSets` | Up to 12 points where the same reaction/pathway can produce different results |
| Result-set fields | Unique `id`, existing `fromStep`, `defaultResult`, and 1–12 `alternatives` |
| Alternative fields | Unique `id`, result `title`, optional transition `agent`, and 1–24 replacement result steps |

Steps run from top to bottom. The block-level `pathway` identity never changes. The detail button appears only when a step has `description`, `formula`, or `details`. A result button appears only at a declared `resultSet.fromStep`; it cycles between possible results of the same reaction/pathway, changes the result label, recolors that decision card and all replacement result cards, and replaces only the downstream result sequence. Using the control to switch to another reaction or pathway is invalid. Alternative step IDs must be unique across the entire block.

Controls are native keyboard-accessible buttons, result changes are announced to assistive technology, and reduced-motion preferences are respected. Print expands every detail panel. Formulas render as Unicode/plain text, not LaTeX. The component is an explanatory sequence, not a quantitative simulation.

## Time and location processes

Use `tracked-step-process` to add a left-side rail while keeping the existing `step-process` available. Both types use the same cards, expandable details, agent labels, result controls, color states, and one-pathway contract.

Set `track` to `{ "kind": "time", "title": "Time" }` or `{ "kind": "location", "title": "Location" }`. The title is optional. Every main step and alternative-result step must contain a nonempty `trackLabel`, for example `"5 min"`, `"1 hour"`, `"Liver"`, or `"Bloodstream"`. Result switching redraws the markers from the selected result steps. Labels remain attached to their cards when details expand.

Time spacing is sequential, not proportional to elapsed time. Locations are ordered labels, not a geographic scale. All labels render as plain text. The template and process examples include both modes with illustrative values to replace with lecture-specific content.

## Structural layers: superficial to deep

Use `structure-layers` for one anatomical or histological structure whose layers have a strict superficial-to-deep order. It is a spatial model, not a biochemical pathway. The reader presents the layers as a proportional tissue stack, lets the learner move shallower or deeper, isolates the active layer, and can separate the complete stack to make boundaries easier to compare.

Required fields are `title`, `structure`, and 2–16 unique `layers`. Every layer needs `id` and `title`. Optional layer fields are `depthLabel`, `tissue`, `description`, `landmarks`, `clinicalNote`, `boundaryAfter`, `relativeThickness` from `0.25` to `8`, and a controlled visual `tone`: `surface`, `epithelial`, `connective`, `muscle`, `vascular`, `neural`, `cavity`, or `other`. Relative thickness controls visual emphasis only unless the source data explicitly establishes scale.

```json
{
  "type": "structure-layers",
  "title": "Wall from surface to depth",
  "structure": "Named organ or anatomical region",
  "direction": "superficial-to-deep",
  "layers": [
    {"id": "surface", "title": "Surface layer", "tone": "epithelial", "relativeThickness": 0.7},
    {"id": "support", "title": "Supporting layer", "tone": "connective", "relativeThickness": 1.2},
    {"id": "deep", "title": "Deep layer", "tone": "muscle", "relativeThickness": 2}
  ]
}
```

## Substance journey through the body

Use `substance-journey` for one physiological substance or drug moving through compartments. It has a separate route-map design, selectable stage nodes, previous/next controls, a user-started tracer animation, a location/form/timing inspector, optional transfer labels, and an optional availability meter. It does not reuse the reaction step-card renderer.

Required fields are `title`, `substance`, and 2–20 unique `stages`. Every stage needs `id`, `title`, and `location`. Optional fields are `description`, `form`, `duration`, `transition`, `details`, `fraction` from `0` to `100`, and `phase`: `entry`, `absorption`, `distribution`, `metabolism`, `action`, `storage`, `elimination`, `regulation`, or `other`. `fraction` is descriptive input, not a value calculated by the website; omit it when quantitative evidence is unavailable.

```json
{
  "type": "substance-journey",
  "title": "Journey of compound X",
  "substance": "Compound X",
  "route": "Entry → circulation → target → elimination",
  "stages": [
    {"id": "entry", "title": "Entry", "location": "Gut", "phase": "entry", "transition": "Absorption"},
    {"id": "blood", "title": "Distribution", "location": "Plasma", "phase": "distribution", "transition": "Tissue delivery"},
    {"id": "target", "title": "Target response", "location": "Target tissue", "phase": "action"}
  ]
}
```

## Populated medical lectures

- `lectures/carbohydrate-biochemistry.json`: sugar structure, absorption, glycolysis, separate pyruvate reactions, separate glycogenesis/glycogenolysis pathways, PPP results, and other monosaccharides.
- `lectures/heart-drugs-pharmacology.json`: HFrEF classes, separate sacubitril/valsartan mechanisms, beta-blockade results, angina, separate digoxin mechanisms, thrombosis, and major safety interactions.

- `lectures/immunology-lecture-1-innate-immunity.json`: immunity, immune competence, barrier defense, phagocytosis, inflammation, fever, and acute-phase responses.
- `lectures/immunology-lecture-2-cells-and-organs.json`: hematopoietic lineages, immune-cell functions, primary and secondary lymphoid organs, and mucosal lymphoid tissue.
- `lectures/immunology-lecture-3-antigens.json`: epitopes, haptens, antigen classes, immunogenicity, adjuvants, and superantigens.

All populated lecture JSON files use schema version 4 and require the redesigned reader.

### Designed lists

Use a `list` block for hierarchical content. Supported visual styles are `bullets`, `numbered`, `steps`, and `key-points`; style controls the color treatment, while hierarchy controls the marker. A flat list uses Roman numerals (`I.`, `II.`, `III.`). A list containing sublists uses decimal parent markers (`1.`, `2.`, `3.`). A one-item sublist uses `•`; a multi-item sublist uses capital letters (`A.`, `B.`, `C.`). A deeper multi-item level returns to Roman numerals. Each item may be plain text or an object with `text`, an optional `label`, and nested `children`. Lists support up to four levels.

### Designed tables

Every `table` block adapts automatically to its column count. Two-column tables use a paired fact layout, three-column tables use a comparison matrix, and tables with four or more columns use a compact data-board layout. On small screens every row becomes a labelled card. Optional `purpose` values are `quick-comparison`, `simplify-complexity`, `rapid-review`, and `structured-variables`; `description` adds a short instructional line above the table.
