# Verdant lecture reader

A dependency-free lecture generator. Serve this folder with any static HTTP server, open `index.html`, choose **Create something new → Make web app**, and import a lecture JSON file. The generated URL embeds the lecture content in its fragment. It is a portable link to the same hosted reader, not an access-controlled or private document. Browser history and anyone receiving the link can retain the content. Very large links may exceed messaging service limits; use concise lecture files.

`medical-lecture.template.json` is an authoring starter. `medical-lecture.example.json` demonstrates the complete reader. The example is educational content, not a reviewed clinical guideline.

## JSON version 2

Required fields: `title` and a non-empty `blocks` array. Set `schemaVersion` to `2`. Optional metadata: `id`, `subtitle`, `course`, `author`, `level`, and positive `durationMinutes`. Imports are limited to 250 KB and 200 blocks. Unknown blocks and malformed tables/questions produce an actionable import error. Text is rendered literally; HTML, scripts, and Markdown are not executed.

| Block | Fields | Behavior |
| --- | --- | --- |
| `section` | `title`, optional `id`, `description` | Creates a chapter and navigation entry |
| `paragraph` | `text`, optional `heading`, `variant: "lead"` | Body or introductory text |
| `objectives` | `items` (text array), optional `title` | Learning objectives |
| `note` | `text`, optional `title`, `variant` | Context panel |
| `callout` | `text`, optional `label` | Highlighted takeaway |
| `flow` | `steps` (text or `{title, description}`), optional `title` | Keyboard-accessible interactive steps |
| `table` | `columns` (text array), `rows` (equal-width text arrays), optional `title` | Responsive reference table |
| `question` | `prompt`, `answer`, optional `options` and zero-based `correctIndex` | Multiple-choice feedback or revealable answer |
| `checklist` | `items` (text array), optional `title` | Saved review checklist |
| `references` | `items` (text array), optional `title` | Plain-text citations |

Legacy JSON without a version is supported, including `title` and `subtitle` blocks and string-only flow steps. The old `accent` field is ignored in favor of the unified visual design. Metadata `id` fields are for authors; navigation IDs are generated to avoid collisions.

Notes, bookmarks, checklist state, and theme are stored in this browser, keyed to the complete lecture content. Changing the lecture creates a separate saved state. They are not synced across devices. If storage is disabled, the notes panel reports that notes could not be saved. Quiz choices reset when the reader reloads.

Motion respects `prefers-reduced-motion`. Print mode omits reader controls and notes, and includes recall answers. For flow blocks, print shows all stage titles and the currently selected explanation.

## Local preview and checks

Run `python -m http.server 8000`, then visit `http://localhost:8000`.
Run `node test-validation.cjs` for the dependency-free validation checks.
Run `node test-reader.cjs` with Playwright and Chromium installed. The checks exercise desktop/mobile layout, both JSON formats, step navigation, recall feedback, saved notes, focus/theme controls, malicious strings, validation, and the import/build pipeline.

## Process diagrams

Add `process-diagram` blocks for chemistry, pathology, or pharmacology. `process-diagrams.example.json` demonstrates all three graph styles. The main template includes editable scaffolds with explanatory prompts; replace them with subject-specific content before teaching. Their sample branches are illustrative topology, not validated reaction kinetics, infection models, or pharmacokinetic simulations.

```json
{
  "type": "process-diagram",
  "domain": "chemistry",
  "title": "Your reaction pathway",
  "nodes": [
    { "id": "a", "title": "Substrate", "column": 0, "lane": 0,
      "formula": "S", "compartment": "Cytosol",
      "description": "Explain this stage.",
      "details": [{ "label": "Cofactor", "value": "Add the applicable cofactor." }] },
    { "id": "b", "title": "Product", "column": 1, "lane": 0,
      "description": "Explain the resulting stage." }
  ],
  "edges": [{ "from": "a", "to": "b", "kind": "reaction", "label": "enzyme" }],
  "paths": [{ "id": "main", "title": "Main route", "nodes": ["a", "b"] }]
}
```

| Field | Contract |
| --- | --- |
| `domain` | `chemistry`, `pathology`, or `pharmacology` |
| `nodes` | 1–24 nodes; unique string `id`, string `title`, integer `column` 0–5 and `lane` 0–3 |
| Node metadata | Optional `description`, `formula`, `compartment`, `badge`; `details` contains up to 12 string label/value pairs |
| `edges` | Up to 48 connections with existing, distinct `from`/`to` node IDs; no duplicate directed pairs |
| Edge `kind` | `reaction`, `activation`, `inhibition`, `transport`, `progression`, or `reversible` |
| Edge `label` | Optional short text, ideally fewer than 18 characters |
| `paths` | Optional 1–12 routes with unique `id`, `title`, and 1–48 existing node IDs; every successive pair must have a matching connection |

Columns run left to right, lanes top to bottom. No two nodes can occupy the same position. Use alternate lanes for branches. Reversible edges can be traversed in either direction; other connections follow their declared direction. Repeated stages and feedback routes are permitted if their connections exist. Arrange complex feedback graphs deliberately; crossing edges are not automatically rerouted. Break large processes into separate diagrams for clarity.

Stage controls are standard keyboard-accessible buttons. Route tracking highlights connected stages and connections; selecting a node outside the current route returns to free exploration. Tracking state resets when the page reloads. The tracker is an explanatory walkthrough, not a timed or quantitative simulation. Formulas render as Unicode/plain text, not LaTeX.

Diagrams scroll within the reader on small screens. A text connection list gives an alternative to the visual graph. Print includes a scaled diagram, connection list, and all stage descriptions. Color differences are supplemented by arrowheads, inhibition bars, dashed transport links, labels, and explicit connection kinds.

## Populated medical lectures

- `lectures/carbohydrate-biochemistry.json`: sugar structure, absorption, glycolysis, pyruvate fates, glycogen, gluconeogenesis, PPP, and other monosaccharides. Four diagrams and four recall questions.
- `lectures/heart-drugs-pharmacology.json`: HFrEF classes, beta blockade, angina, antiarrhythmic classes, thrombosis, and major safety interactions. Four diagrams and five recall questions.

Both use version 2 and require the redesigned reader. Each includes a visible reference block and machine-readable `sources`/`sourceIds` metadata. These metadata fields do not change rendering. Guideline statements name their source year; the files are teaching resources rather than dosing protocols or quantitative simulations.
