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
