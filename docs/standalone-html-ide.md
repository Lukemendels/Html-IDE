# Standalone HTML IDE inspection and hardening notes

## Baseline artifact

At inspection time, repository-root `local-ide.html` and `public/local-ide.html` were identical compiled standalone artifacts: 5,403,598 bytes with SHA-256 `82fbb90d824ce1005320a6ad2aada7f51ca6fa203470d54d2ac760e307ce5ecd`. The source template `local-ide.src.html` was 92,964 bytes with SHA-256 `e3c011b68ce08b96259fddaed328139440b88ce5a9914a9f375ee4a64fc17d2c`.

## Architecture discovered

`local-ide.src.html` is the authoritative standalone template. `build_local_ide.py` inlines Tailwind browser CSS engine, Prism, CodeJar, and the offline library vault from `node_modules`, then writes both `local-ide.html` and `public/local-ide.html`. The React/Vite app in `src/App.tsx` resembles an older or parallel implementation; the Python build path is what regenerates the primary root artifact.

The editable application source lives in the in-memory `state.code` string and is edited through CodeJar. The live preview uses an iframe `srcdoc` fed by `packLibraries(state.code)`, so library stems are expanded for preview without requiring users to paste minified libraries into editable source. Completed apps are downloaded by packing the current source, optionally injecting the StickShift companion panel/skill, and saving a Blob.

## Library stems and bundled inventory

Current placeholder syntax is lightweight HTML elements with ids ending in `-stem`:

| Capability | Present | Library | Version | Offline | Auxiliary assets | Approximate size | Gap | Recommendation |
| ---------- | ------- | ------- | ------- | ------- | ---------------- | ---------------- | --- | -------------- |
| Reactive UI | Core | Alpine.js | 3.15.12 | Yes | None | ~44 KB | None known | Keep as optional stem |
| Basic styling | Core | Pico.css | 2.1.1 | Yes | CSS only | ~81 KB | None known | Keep as optional stem |
| ZIP/package files | Core | JSZip | 3.10.1 | Yes | None | ~96 KB | None known | Keep |
| DOCX templating | Optional packed capability | docxtemplater | 3.69.0 | Yes | Pairs with ZIP content | ~113 KB | Needs templates | Keep distinct from docx |
| DOCX generation | Core | docx | 9.7.1 | Yes | None obvious | ~1.1 MB | Large | Keep optional only |
| DOCX reading | Core | Mammoth | 1.12.0 | Yes | None obvious | ~616 KB | Limited formatting fidelity | Keep |
| Spreadsheet I/O | Core | SheetJS/xlsx | 0.18.5 | Yes | None | ~862 KB | No dedicated CSV parser | Use native/simple CSV until gap appears |
| PPTX generation | Optional packed capability | PptxGenJS | 4.0.1 | Yes | Bundled dependencies | ~2.8 MB | Large | Keep optional only |
| PDF reading | Core | PDF.js | 3.11.174 | Yes | Worker is inlined and assigned via Blob URL | ~1.1 MB plus worker | Rendering/worker edge cases under file:// require manual checks | Keep with worker setup |
| PDF writing | Gap | None | n/a | n/a | n/a | n/a | No pdf-lib/pdfmake packed | Defer until specific need |
| HTML sanitization | Gap | None | n/a | n/a | n/a | n/a | No DOMPurify | Consider optional packed capability |
| JSON schema validation | Use browser/custom | Custom validation | n/a | Yes | None | n/a | Ajv not bundled | Keep custom for patch schema initially |
| Markdown | Gap | None | n/a | n/a | n/a | n/a | No parser | Defer or add Marked with DOMPurify later |
| Charts | Gap | None | n/a | n/a | n/a | n/a | No Chart.js | Optional only |
| Crypto/hashing | Use browser-native API | Web Crypto | Browser | Yes | Secure-context constraints should be tested | 0 | file:// support should be manually verified | Prefer native |
| Date/time, text, encoding, canvas | Use browser-native API | Browser APIs | Browser | Yes | None | 0 | None | Prefer native |

Stems are inserted only when requested in editable source; the packer replaces known stems with inlined library content during preview/download.

## Create mode

Create mode remains a one-shot complete HTML document pasted into the editor. Coding instructions should include the app request, single-file/offline constraints, available stems, metadata expectations, and any optional app runtime LLM contracts. The response should be raw HTML only: no Markdown fences, no commentary, no SEARCH/REPLACE blocks, no CDN references where packed stems exist, and no pasted minified bundled libraries.

## Patch mode

Patch mode now accepts structured JSON `html-ide-patch` version `2.0` by default. Version 2.0 intentionally supports only exact matching (`matching.strategy: "exact"`) plus named region replacement; the previously listed whitespace-normalized strategies are not accepted until they can be implemented safely. It requires unique patch ids, `target.sourceHash`, supported operations (`replace`, `insert_before`, `insert_after`, `delete`, `replace_region`), expected match counts, preflight resolution, stale-hash rejection, ambiguity and overlap rejection, dry-run summary, atomic application, and an in-session bounded undo stack. The AI drawer displays the current source hash and provides **Copy Patch Context**, which copies the exact editable source string, hash, library stems, and v2 output contract. Legacy `SEARCH:`/`REPLACE:` packets are still parsed, but they are explicitly warned as lower-safety compatibility packets.

## Storage and recovery

Current durable behavior is limited. The IDE uses localStorage for StickShift companion skill preferences. The main workspace is in memory unless the user downloads/exports a completed tool. IndexedDB, folder-native projects, backup manifests, and File System Access API workflows remain gaps and are not implemented by this PR. Do not treat browser storage as authoritative; recovery should be through explicit files, ZIP/project bundles, or user-selected folders where Chrome policy and `file://` secure-context behavior permit.

## Runtime LLM skill convention

Completed apps can receive an embedded StickShift companion skill. For app-specific runtime LLM workflows, keep a separate convention from coding patches, for example `<script id="app-skill" type="text/markdown">` and `<script id="app-runtime-contract" type="application/json">`. These runtime contracts must not instruct an LLM to edit application source.

## Tests and manual smoke checks

Run `node tests/patch-engine.test.cjs`, `node test_export.cjs`, `npm run lint`, and `python3 build_local_ide.py`. The patch-engine tests execute the same `scripts/patch-engine.cjs` production engine that is inlined into the standalone artifact. Manual Chrome/Linux checks should open the root `local-ide.html` under `file://`, paste a complete HTML app, verify preview, apply a structured patch, verify ambiguous-patch rejection, undo, download the completed app, reopen it offline, and test browser-storage loss/recovery via downloaded files.
