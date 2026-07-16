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

## Script breakout and export-integrity guardrails

The historical export failure occurs when JavaScript text that is being embedded into an HTML `<script>` element contains a literal case-insensitive `</script` sequence. The browser's HTML parser terminates the script element at that token even if it appears inside a JavaScript string, template literal, regular expression, or comment. The visible symptom is raw JavaScript rendered as body text in a downloaded compiled app.

The canonical escaping rule is implemented at the script-embedding boundary: JavaScript payload text is transformed from `</script` to `<\/script` before it is placed inside an HTML script data block. This preserves JavaScript runtime semantics while preventing premature HTML parser termination. CSS payload text stored in style blocks receives the analogous `</style` guard at build time.

The packed-library path is:

```text
node_modules library file
→ build_local_ide.py escapes script/style data-block hazards
→ hidden library vault in local-ide.html
→ editable app stem tag such as <script id="lib-jszip-stem"></script>
→ compileAppSource(editableSource, options)
→ escapeInlineScriptBreakouts() for authored inline app scripts
→ packLibraries() with escapeScriptTextForHtml() for JavaScript library payloads and PDF.js worker text
→ preview iframe srcdoc and downloaded completed app use the same compiled HTML path
```

Preview and download now share `compileAppSource()`. Preview calls it without StickShift injection, while download calls it with the current StickShift checkbox state; library resolution and script escaping are otherwise shared. Export validation currently checks unresolved stems, duplicate injected-library IDs, and missing PDF.js worker payloads. Browser-based validation is still desirable as a release gate, but this execution environment did not provide Chromium or Playwright.

## Two-skill architecture

The read-only **Local HTML IDE Skill** is sourced from `skills/local-html-ide.md`. It teaches an agent how to operate the IDE, copy patch context, patch the independent `html` and `appSkill` surfaces, and use registry-backed stems. **Copy IDE Skill** copies this canonical Markdown through `textContent`; it is never used as an application compiler input.

The editable **Built App Skill** is sourced initially from `templates/default-built-app-skill.md`. It describes operation of the finished application rather than IDE patching. Its unrendered placeholder source is stored independently in `state.appSkillSource`; **Copy Rendered App Skill** and download resolve `{{TOOL_TITLE}}`, `{{TOOL_FILE}}`, and `{{SKILL_SLUG}}`. Setting a reusable app-skill default is explicit. Reopening a generated application recovers its rendered Built App Skill before compliance stripping and library unpacking.

## Two build surfaces and patch 2.1

The workspace displays independent SHA-256 hashes for HTML and Built App Skill Markdown. Copy Patch Context includes both hashes, both exact source strings, the registry-derived stem manifest, and the v2.1 JSON-only response contract. Every v2.1 patch names `surface: "html"` or `surface: "appSkill"`; `targets` supplies a hash for every referenced surface. Preflight resolves all patches surface-locally, rejects stale hashes, ambiguity, invalid regions, and overlaps before mutation, then one confirmation commits one combined history entry. One undo restores both snapshots. Version 2.0 and legacy SEARCH/REPLACE remain HTML-only compatibility paths.

## Canonical sources and catalog

- IDE operator skill: `skills/local-html-ide.md`
- Default application skill: `templates/default-built-app-skill.md`
- Offline library registry: `config/offline-libraries.json`

The build injects the registry stem section into the IDE Skill and renders the library drawer, patch manifest, vaults, packing, and indicators from the same records. The Built App Skill does not inherit the library catalog. Never paste full minified payloads into editable HTML.

## Non-blocking status

Routine patch apply/undo, skill reset/default save, copy, file-load, and download completion use the shared dark-theme `#app-status` aria-live region or temporary labels. Confirmations remain for patch approval, workspace reset, undo after intervening edits, and integrity-warning download. Actionable failures remain prominent.
