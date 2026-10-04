# Verdant lecture reader

A dependency-free lecture generator. Serve this folder with any static HTTP server, open `index.html`, choose **Create something new → Make web app**, and import a lecture JSON file. The generated URL embeds the lecture content in its fragment. It is a portable link to the same hosted reader, not an access-controlled or private document. Browser history and anyone receiving the link can retain the content. Very large links may exceed messaging service limits; use concise lecture files.

`medical-lecture.template.json` is an authoring starter. `medical-lecture.example.json` demonstrates the complete reader. The example is educational content, not a reviewed clinical guideline.

## JSON version 3

Required fields: `title` and a non-empty `blocks` array. Set `schemaVersion` to `3`. Optional metadata: `id`, `subtitle`, `course`, `author`, `level`, and positive `durationMinutes`. Imports are limited to 250 KB and 200 blocks. Unknown blocks and malformed tables, questions, or processes produce an actionable import error. Text is rendered literally; HTML, scripts, and Markdown are not executed. Version 2 lecture files that use the retained block types remain compatible.

| Block | Fields | Behavior |
| --- | --- | --- |
| `section` | `title`, optional `id`, `description` | Creates a chapter and navigation entry |
| `paragraph` | `text`, optional `heading`, `variant: "lead"` | Body or introductory text |
| `objectives` | `items` (text array), optional `title` | Learning objectives |
| `note` | `text`, optional `title`, `variant` | Context panel |
| `callout` | `text`, optional `label` | Highlighted takeaway |
| `step-process` | `steps`, optional `branches`, `domain`, `title`, `description` | Vertical process with expandable details and replaceable downstream pathways |
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

## Step-by-step processes

Add `step-process` blocks for chemistry, pathology, pharmacology, or general sequences. `step-processes.example.json` demonstrates all three scientific styles. The main template includes editable scaffolds; replace the placeholder content before teaching.

```json
{
  "type": "step-process",
  "domain": "chemistry",
  "title": "Your reaction process",
  "steps": [
    { "id": "a", "title": "Substrate", "context": "Cytosol",
      "formula": "S", "agent": "Enzyme A",
      "description": "Explain this stage." },
    { "id": "b", "title": "Intermediate", "agent": "Enzyme B" },
    { "id": "c", "title": "Product" }
  ],
  "branches": [{
    "id": "alternate", "title": "Alternate product", "fromStep": "b",
    "agent": "Alternate enzyme",
    "steps": [{ "id": "d", "title": "Alternate product" }]
  }]
}
```

| Field | Contract |
| --- | --- |
| `domain` | `chemistry`, `pathology`, `pharmacology`, or `general` |
| `steps` | 2–24 ordered steps with globally unique `id` and a `title` |
| Step metadata | Optional `description`, `formula`, `context`, `badge`; `details` contains up to 12 string label/value pairs |
| `agent` | Optional transition label shown between this step and the next: enzyme, transporter, helper, drug target, or responsible agent |
| `branches` | Up to 12 alternate downstream pathways |
| Branch fields | Unique `id`, `title`, an existing main-step `fromStep`, optional transition `agent`, and 1–24 replacement `steps` |

Steps run from top to bottom. The detail button appears only when a step has `description`, `formula`, or `details`. It expands an inline explanation below that step. A route button appears only on a step named by a branch's `fromStep`. Activating it cycles through the main continuation and all alternatives at that point, replacing every downstream step. Branch step IDs must be unique across the entire block.

Controls are native keyboard-accessible buttons, route changes are announced to assistive technology, and reduced-motion preferences are respected. Print expands every detail panel. Formulas render as Unicode/plain text, not LaTeX. The component is an explanatory sequence, not a quantitative simulation.

## Populated medical lectures

- `lectures/carbohydrate-biochemistry.json`: sugar structure, absorption, glycolysis, pyruvate fates, glycogen, gluconeogenesis, PPP, and other monosaccharides. Four step processes and four recall questions.
- `lectures/heart-drugs-pharmacology.json`: HFrEF classes, beta blockade, angina, antiarrhythmic classes, thrombosis, and major safety interactions. Four step processes and five recall questions.

Both use version 3 and require the redesigned reader. Each includes a visible reference block and machine-readable `sources`/`sourceIds` metadata. These metadata fields do not change rendering. Guideline statements name their source year; the files are teaching resources rather than dosing protocols or quantitative simulations.
