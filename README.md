# Verdant lecture reader

A dependency-free lecture generator. Serve this folder with any static HTTP server, open `index.html`, choose **Create something new → Make web app**, and import a lecture JSON file. The lecture output uses an ivory, ink, and indigo theme with dark mode. The generated URL embeds the complete validated lecture JSON in its `#lecture=` fragment, so it does not require server storage and can be opened on another device. Anyone with the URL can read its content. Very large URLs may exceed limits in browsers or messaging services; imports remain limited to 250 KB.

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

## Populated medical lectures

- `lectures/carbohydrate-biochemistry.json`: sugar structure, absorption, glycolysis, separate pyruvate reactions, separate glycogenesis/glycogenolysis pathways, PPP results, and other monosaccharides.
- `lectures/heart-drugs-pharmacology.json`: HFrEF classes, separate sacubitril/valsartan mechanisms, beta-blockade results, angina, separate digoxin mechanisms, thrombosis, and major safety interactions.

Both use version 4 and require the redesigned reader. Each includes a visible reference block and machine-readable `sources`/`sourceIds` metadata. These metadata fields do not change rendering. Guideline statements name their source year; the files are teaching resources rather than dosing protocols or quantitative simulations.
