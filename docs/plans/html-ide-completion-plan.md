# Local HTML IDE — Completion Plan

Planning pass only. No application code, tests, manifests, workflows, skills, or generated artifacts were modified. This document is the single intended repository change.

Evidence conventions used throughout:

- **Verified current** — confirmed in the working tree at `main` (`3daec49`).
- **PR #18 only** — present only on `feature/stickshift-install-contract` (head `3ab9dbf`, draft PR #18).
- **Historical** — from git history or `docs/consolidation-report.md`.
- **Proposed** — not yet implemented anywhere.

---

## 1. Executive finding

**Maturity.** The repository is substantially further along than a typical prototype. The core mechanisms all exist and are tested: a source-hash-bound atomic patch engine (`scripts/patch-engine.cjs`, exercised by `tests/patch-engine.test.cjs`), an Acorn-backed script-breakout compiler (`local-ide.src.html`, `escapeInlineScriptBreakouts`, tested by `tests/script-breakout-scanner.test.cjs`), a working offline library vault with stem-tag packing (`packLibraries`), a PDF.js blob-worker path, Tool Descriptor / Tool Skill named-region state, and a 517-line canonical IDE skill (`skills/local-html-ide.md`). What remains is not invention; it is closing determinism gaps, finishing the Tool Skill edit loop, and polish.

**The five most consequential gaps** (in priority order):

1. **The regression suite is red at HEAD on both `main` and PR #18.** `tests/generated-html-structure.test.cjs` and `tests/generated-main-script-syntax.test.cjs` fail against the committed `local-ide.html` on both branches (verified by running them). Root cause: `local-ide.src.html:1153` contains a raw `</script'` literal inside a JS string (`...startsWith('</script')` in the breakout scanner's line-comment fallback). Per the HTML spec this does **not** terminate the script in a real browser (the character after `script` must be whitespace, `/`, or `>`), and `tests/html-shell-integrity.test.py` (spec-accurate parser) passes — but the two Node tests use a naive `indexOf('</script')` scanner and fail. PR #18's claim that "the full HTML IDE regression suite passed" is not reproducible at its head commit. This must be fixed first because every other workstream depends on a trustworthy green baseline.
2. **No CI exists at all.** There is no `.github/` directory on `main` or PR #18 (verified via `git ls-tree`). Every guarantee in the docs ("run these six commands before release") is manual. Drift between `skills/local-html-ide.md`, `local-ide.src.html`, and the two committed 5.4 MB artifacts is only prevented by operator discipline.
3. **The build is nondeterministic.** `build_local_ide.py:56-84` resolves Tailwind from three fallback sources: a gitignored cache (`node_modules/tailwind-cdn-offline.js`), **scraping the previous generated artifact** (`get_existing_tailwind_js`, lines 35–54), and finally the live, unversioned `https://cdn.tailwindcss.com`. A clean checkout at a known commit can silently produce different code. Library payloads come from `node_modules` (lockfile-pinned but npm-supply-chain-exposed), and missing optional libraries are silently replaced with warning stubs (`load_lib`, lines 88–104).
4. **Tool Skill editing is not first-class.** The only Tool Skill authoring UI is a browser `prompt()` dialog (`local-ide.src.html:1508-1515`); there is no Code/Tool Skill edit-target selector, no Tool-Skill-specific Copy Context, and no preview. Code editing has a mature loop; Tool Skill editing does not.
5. **Known-vulnerable pinned libraries.** The vault ships `pdfjs-dist` 3.11.174 (CVE-2024-4367, arbitrary JS execution via crafted PDF, fixed in 4.2.67+) and `xlsx` 0.18.5 (CVE-2023-30533 prototype pollution fixed in 0.19.3, CVE-2024-22363 ReDoS fixed in 0.20.2 — fixes distributed only via SheetJS's own CDN, not npm). Versions verified in `package-lock.json`. The library-manifest process in Workstream 1 must handle both upgrades deliberately.

**PR #18 verdict: adopt as the working baseline, with revisions, do not discard.** Its substance is correct and its regression coverage is real (`tests/stickshift-package-contract.test.cjs`, extended `tests/export-integrity.test.cjs`). See §4 for the required revisions (test reconciliation, one latent regex bug, history squash, browser smoke validation).

**Recommended stable-release boundary** (detail in §8): green suite + CI + deterministic build + pinned/verified library manifest for the *existing* nine libraries + the Code/Tool Skill edit-target selector + failure-reporting surface. New data-science libraries beyond a small Core set, geospatial, and NLP are post-stable additions that ride on the manifest mechanism rather than blocking the release.

---

## 2. Inspection scope and repository state

| Item | Value |
| --- | --- |
| Current branch | `claude/html-ide-completion-plan-cgrvvo` at `3daec4923baeb9ec95ce6595eca3c0ba9375832d` |
| `main` | `3daec49` — same commit (branch was cut from `main` with no divergence) |
| PR #18 head | `3ab9dbf7247f4d66e33fb957408a32df4900d918` (`feature/stickshift-install-contract`, draft, base `3daec49`, mergeable-state clean, 9 files, +1338/−225, 32 commits) |
| Working tree | Clean before this plan; no uncommitted work existed to preserve |
| PR #18 inspection method | Read-only: `git fetch refs/pull/18/head`, `git diff origin/main origin/pr-18`, plus `git archive` into the session scratchpad to run its tests without touching the working tree |

Test execution results in this environment (Node 22.22.2, no `npm install` run, to avoid mutating the checkout):

| Test | main | PR #18 | Notes |
| --- | --- | --- | --- |
| `tests/patch-engine.test.cjs` | PASS | — | dependency-free |
| `tests/local-html-ide-skill.test.cjs` | PASS | — | dependency-free |
| `tests/html-shell-integrity.test.py` | PASS | PASS | spec-accurate HTML parsing |
| `tests/generated-html-structure.test.cjs` | **FAIL** | **FAIL** | `main script contains const patchEngine = window.HtmlIdePatchEngine` — naive scanner splits main script at `local-ide.src.html:1153` |
| `tests/generated-main-script-syntax.test.cjs` | **FAIL** | **FAIL** | same scanner, same split |
| `tests/script-breakout-scanner.test.cjs` | blocked | — | `Cannot find module 'acorn'` (needs `npm install`) |
| `tests/export-integrity.test.cjs`, `test_export.cjs`, `tests/stickshift-package-contract.test.cjs` | blocked | blocked | need `node_modules` |

**Material inspection limitations:**

- `npm install` was not run, so the four `node_modules`-dependent suites could not be executed; their logic was reviewed by reading. The two committed-artifact failures above are *not* environmental — those tests read only `local-ide.html` with `fs`.
- No browser was launched against `local-ide.html`; browser behavior claims are derived from the HTML spec's script-data end-tag rules and the passing Python shell-integrity test, not from a live smoke test.
- Live upstream release checking (current latest versions of candidate libraries) was not performed; this plan deliberately avoids inventing version numbers (§5.4).

---

## 3. Current-state architecture

All items below are **verified current** on `main` unless marked otherwise.

**Canonical editable source.** `local-ide.src.html` (1,579 lines) is the authoritative template; `python3 build_local_ide.py` resolves `/* {{token}} */` placeholders and writes both `local-ide.html` and `public/local-ide.html` (byte-identical, verified with `cmp`). Both generated artifacts are intentionally committed — the root file is the download-ready product (`docs/consolidation-report.md`, "Authoritative artifact determination").

**Runtime state model.** Inside the IDE, `state.code` is the only canonical editable representation (`local-ide.src.html:1043`). The Tool Descriptor (`tool-descriptor` named region, JSON, schema `stickshift-tool` v1.0) and optional Tool Skill (`tool-skill` named region, markdown) live *inside* `state.code` and share the source hash, patch atomicity, undo history, and import/export (`docs/standalone-html-ide.md`, "Ownership and editable source"). UI editors are projections over `state.code`, never separate state (`local-ide.src.html:1499-1515`).

**IDE coding skill.** Two representations exist on `main` and they have already drifted: `skills/local-html-ide.md` (517 lines, canonical, contract-tested by `tests/local-html-ide-skill.test.cjs`) and a shorter, older hardcoded `#ide-coding-skill` block inside `local-ide.src.html:551-604`. **PR #18 only:** the hardcoded block is deleted and replaced with a `{{ide_coding_skill}}` placeholder in a `#stickshift-skill` script element; `build_local_ide.py` gains `IDE_CODING_SKILL_PATH` / `load_ide_coding_skill()` with required-token validation, and `tests/export-integrity.test.cjs` asserts the built artifact embeds the skill byte-for-byte after escape normalization.

**Patch engine.** `scripts/patch-engine.cjs` implements `html-ide-patch` v2.0: JSON-only parsing with fence stripping (line 21), protocol/version/hash/id/operation validation (lines 26–48), exact matching only (line 42), `expectedMatches` enforcement (line 103), spec-checked named regions (lines 70–98), overlap rejection (lines 107–116), stale-hash rejection (line 134), atomic preflight-then-apply (lines 131–145), and a 20-entry history for undo. It is embedded into the IDE via the `{{patch_engine_js}}` placeholder and exercised by 67 lines of tests.

**Compiler.** `compileAppSource()` (`local-ide.src.html:1237`) validates integration metadata, normalizes authored Tool Skills, normalizes PDF.js worker ownership, escapes executable-script breakouts using the vendored Acorn tokenizer (`vendor/acorn`, 8.16.0, wired through `package.json` `"acorn": "file:vendor/acorn"`), packs library stems from the vault, substitutes `{{TOOL_FILE}}`/`{{TOOL_TITLE}}`/`{{SKILL_SLUG}}`, optionally injects the StickShift compatibility block, and validates the compiled output. Data-script masking prevents documentation examples from being packed as libraries.

**Library vault.** Nine libraries are compiled into the IDE as inert `text/plain` script blocks (`local-ide.src.html:1567-1573` plus Alpine/Pico) from `node_modules` paths declared in `build_local_ide.py:22-33`. Stem tags (`<script id="lib-jszip-stem"></script>` etc.) in user source are replaced at preview/download by `packLibraries`; PDF.js additionally emits an embedded worker payload and Blob-URL setup script. Locked versions (verified in `package-lock.json`): jszip 3.10.1, docxtemplater 3.69.0, docx 9.7.1, mammoth 1.12.0, xlsx 0.18.5, pptxgenjs 4.0.1, pdfjs-dist 3.11.174, alpinejs 3.15.12, @picocss/pico 2.1.1. IDE-shell dependencies: prismjs 1.30.0, codejar 4.3.0, vendored acorn 8.16.0, and the unpinned Tailwind CDN script (§5.7).

**Create/edit contexts.** Edit mode has a real loop: the AI Update Drawer (`local-ide.src.html:382-434`) shows the live source hash, `Copy Patch Context` (`copyPatchContext`, lines 1351–1374) copies hash + stem manifest + v2 output contract + full editable source, and `applyPacketUpdates` (lines 1381–1394) preflights and applies atomically with confirm/alert dialogs and undo. Create mode has **no** dedicated context copy — the skill documents create mode, but the IDE has no Create/Edit selector and no "copy create context" affordance.

**Export/onboarding.** `Download Completed Tool` compiles with `embedStickShift` from the `Include Tool Setup UI` checkbox (renamed **Package for StickShift** and made descriptor-mandatory in PR #18 — `compileAppSource` on PR #18 throws `Package for StickShift requires a valid Tool Descriptor`). Import (`fileUploadInput`, lines 1021–1038) runs `unpackInlinedLibraries` to reverse packing and re-hoist descriptor/skill state.

**Legacy scaffolding (verified current, unused by the product):** `index.html` + `src/App.tsx` (633-line React prototype) + `vite.config.ts` + `metadata.json` + `.env.example` (`GEMINI_API_KEY`) + the AI Studio `README.md` are leftovers of the app's AI Studio origin. The standalone product does not use them; `package.json` is still named `react-example`.

---

## 4. PR #18 assessment

**Verified claims** (checked against the diff, not the description):

- Preserves `tool-descriptor` + optional `tool-skill` authoring state — true; the authoring model is untouched, only compilation changes.
- Compiles the canonical StickShift package — true: `buildStickShiftInstallSkill()` replaces `legacySkillMarkdown()`, emitting `okf_version: "0.1"`, `type: Skill`, JSON-quoted title/description, `tags: [skill, html-tool]`, and an `HTML_OPEN` block with `tool:` and `- skills/<slug>.md`; `validateLegacyCompatibility()` enforces every one of those fields at compile time.
- Preserves authored Tool Skill instructions across round trips — true in code (`extractAuthoredToolSkillBody` now strips a structural `## Open this tool` footer instead of a filename-coupled regex) and covered by `tests/stickshift-package-contract.test.cjs` (`authored operating instructions are preserved`).
- Makes `skills/local-html-ide.md` the sole skill source of truth, injected at build — true (§3), including a byte-equality regression test. **Residual drift risk:** the guarantee only holds when the build and tests actually run; with no CI, editing the skill file without rebuilding leaves stale committed artifacts. Workstream 1's CI closes this.
- Package-contract and round-trip regression tests added — true.

**Not reproducible / incomplete:**

- "The full HTML IDE regression suite passed" — **contradicted**: `generated-html-structure` and `generated-main-script-syntax` fail at `3ab9dbf` exactly as on `main` (§2). The failure predates PR #18 (the `startsWith('</script')` literal arrived with the PR #14 line-comment fallback work on `main`), but PR #18 rebuilt and re-committed the artifacts without the suite being green.
- Manual browser smoke testing — explicitly still owed per the PR's own description ("remains draft for review and browser smoke testing").
- Latent bug: `skillFrontmatterValue()` (added in PR #18) builds its regex from the JS string `'^'+escaped+'\s*:\s*(.+)$'` — `\s` inside a *string literal* collapses to `s`, so the pattern is actually `^descriptions*:s*(.+)$`. It works today only by accident (`s*` matches zero characters and `.trim()` cleans the capture) and silently also matches keys like `descriptions:`. Should be `\\s`.
- History: 32 commits, roughly half `chore: capture ... diagnostics` self-patching churn. Content is fine; the history is not worth preserving.

**Recommendation:** PR #18 is the implementation baseline. Before merge: (1) fix the two red tests as part of WP-0 (below) on top of it, (2) fix `skillFrontmatterValue`, (3) run the full suite plus a real browser smoke pass (file:// open, create, patch, descriptor-only export, skill export, import round trip, PDF.js worker export), (4) squash-merge. Its Tool Skill state model (descriptor + region-resident skill inside `state.code`) is exactly what the §6 edit-target workflow needs — no rework required.

---

## 5. Workstream 1 — Offline data-science library system

### 5.1 Verified current supply chain (trace)

- **Origin:** all nine vault payloads and three of four shell dependencies come from `node_modules`, installed from npm per `package.json` caret ranges, pinned in practice by `package-lock.json`. Acorn alone is vendored (`vendor/acorn`, committed dist files). Tailwind alone comes from a live CDN with two silent fallbacks (§5.7).
- **Entry into the IDE:** `build_local_ide.py` inlines each payload into a `text/plain` vault block; `</script` sequences are escaped at the embedding boundary (`escape_script_data_block`; PR #18 additionally hex-escapes `<style:` namespaced XML inside JS strings so host scanners don't misread library data).
- **Stem recognition/replacement:** `packLibraries` (`local-ide.src.html:1181-1187` region) masks data scripts, replaces each active stem exactly once per occurrence with an `injected-lib-*` wrapper, verifies replacement counts, and re-verifies no active stems remain.
- **Workers/secondary assets:** only PDF.js has one — the worker is embedded as `text/plain` plus a Blob-URL setup script; `normalizePdfJsWorkerOwnership` rejects authored worker ownership; `validateCompiledPdfJs` enforces the pairing. No other library currently needs secondary assets.
- **Existing verification:** `test_export.cjs` (compiles `failing-code/Failing-V2.html` against real generated Pico/PDF.js/SheetJS payloads, single-injection checks, leak checks), `tests/export-integrity.test.cjs` (worker byte-comparison against `node_modules`, placeholder resolution, build-script property checks), plus the structure/syntax/shell suites.
- **Nondeterministic remainder:** Tailwind (three mutable paths); silent stub embedding for any missing non-PDF.js library (`load_lib` warning path — a build with a half-installed `node_modules` "succeeds" with broken vault entries); npm as the acquisition channel at install time; no hash pinning of the actual browser artifacts anywhere.

### 5.2 Capability review and portfolio

Ground rules applied: prefer single-file UMD/IIFE browser artifacts with no secondary assets; prefer capabilities the platform already provides (WebCrypto, `Intl`, IndexedDB, Workers) over libraries; reject anything requiring runtime network, dynamic `import()` of separate chunks, or un-inlinable WASM unless the payoff is exceptional. The vault may hold Optional libraries; each generated tool inlines only the stems it uses — so vault size is an IDE-artifact cost, not a per-tool cost.

**Existing nine — keep all, reclassify none out** (they are working, tested mechanisms):

| Library | Class | Notes |
| --- | --- | --- |
| JSZip 3.10.1 | Core | ZIP read/write; dependency of the docx tooling story |
| SheetJS (xlsx) 0.18.5 | Core | spreadsheets + CSV fallback; **upgrade required** (§5.4 security note) |
| PDF.js 3.11.174 | Core | PDF text extraction; **upgrade required**; v4 moved to `.mjs` builds — evaluate the `legacy` build for single-file compatibility at admission time |
| Mammoth.js 1.12.0 | Core | .docx → text/HTML |
| docx 9.7.1 | Optional | Word generation from scratch |
| docxtemplater 3.69.0 | Optional | template-driven Word generation; overlaps docx — keep both only because both are already shipped and tested |
| PptxGenJS 4.0.1 | Optional | PowerPoint generation |
| Alpine.js 3.15.12 | Core | reactive UI in generated tools |
| Pico.css 2.1.1 | Core | classless styling |

**Proposed additions.** Versions are deliberately **not** stated — §5.4's admission process pins them after verifying the current stable release and its browser artifact structure. "Min compatibility test" means the smallest Node-or-browser assertion added to the packing test suite.

**Core additions (small, high-leverage, no packaging complications):**

| Library | Purpose | Proposed stem | Runtime global | License | Min compatibility test |
| --- | --- | --- | --- | --- | --- |
| Papa Parse | Robust CSV/TSV/malformed-delimited parsing, streaming, workers-optional | `lib-papaparse-stem` | `Papa` | MIT | parse a quoted, embedded-newline CSV string; round-trip `unparse` |
| simple-statistics | Descriptive stats, regression, sampling, distributions basics | `lib-simple-statistics-stem` | `ss` | ISC | `ss.mean`, `ss.linearRegression`, `ss.tTest` on fixtures |
| Day.js (+ customParseFormat, utc, timezone plugins in one packed payload) | Date/time parsing and arithmetic | `lib-dayjs-stem` | `dayjs` | MIT | parse a non-ISO format; timezone conversion |
| Chart.js | Conventional + interactive charts, canvas-based, single UMD | `lib-chartjs-stem` | `Chart` | MIT | instantiate a bar chart against a stub canvas in jsdom-free smoke (constructor + config validation) |

**Optional additions (in the vault, packed only when a stem is used):**

| Library | Purpose | Proposed stem | Global | License | Complications |
| --- | --- | --- | --- | --- | --- |
| Arquero | dataframe-style filter/group/join/pivot/window ops | `lib-arquero-stem` | `aq` | BSD-3 | UMD available; verify no Arrow hard-dependency in the chosen bundle |
| jStat | distributions, hypothesis tests, matrices | `lib-jstat-stem` | `jStat` | MIT | overlaps simple-statistics; admit for distribution/test depth |
| ECharts | statistical plots, dashboards, graph/network, geo, timelines in one artifact | `lib-echarts-stem` | `echarts` | Apache-2.0 | ~1 MB minified; SVG renderer gives export-to-SVG |
| Cytoscape.js | graph structures, traversal, centrality, interactive network/DAG rendering | `lib-cytoscape-stem` | `cytoscape` | MIT | DAG layout may want the dagre extension — admit only if a single combined artifact is practical, else ship layouts built in |
| Leaflet | map rendering | `lib-leaflet-stem` (JS) + `lib-leaflet-css-stem` (link) | `L` | BSD-2 | CSS + default marker PNGs are secondary assets; inline images as data URIs at admission or document the divIcon-only pattern; **offline tools have no tile server** — document that maps need inline GeoJSON layers, not tile layers |
| Turf.js | spatial predicates, buffers, joins over GeoJSON | `lib-turf-stem` | `turf` | MIT | large; verify single-bundle build |
| compromise | tokenization, sentence segmentation, normalization, light NER/phrases | `lib-compromise-stem` | `nlp` | MIT | English-centric; that matches the operator profile |
| Fuse.js | fuzzy matching/similarity | `lib-fuse-stem` | `Fuse` | Apache-2.0 | none |
| MiniSearch | lexical search and ranking | `lib-minisearch-stem` | `MiniSearch` | MIT | none |
| Ajv (standalone bundle) | JSON Schema validation | `lib-ajv-stem` | `ajv7`/`Ajv` | MIT | verify the prebuilt browser bundle's global name at admission |
| Dexie.js | IndexedDB local structured storage | `lib-dexie-stem` | `Dexie` | Apache-2.0 | none |
| marked | markdown rendering for report-style tools | `lib-marked-stem` | `marked` | MIT | none |
| D3 | bespoke visualization building block (flows, hierarchies, custom SVG) | `lib-d3-stem` | `d3` | ISC | admit only if ECharts proves insufficient for a real tool |

**Deferred:** sql.js (WASM secondary asset; base64-inlining is possible but heavy — wait for a demonstrated need), Apache Arrow JS / columnar formats (size/complexity vs. no current use case), DuckDB-WASM (workers + WASM + size: architecturally hostile to single-file), proj4js and shapefile parsing (admit with a real geospatial project), wink-nlp (model files are secondary assets), a dedicated fixed-width parser (a 20-line helper beats a dependency), hash-wasm (WebCrypto covers SHA-family natively).

**Rejected:** Danfo.js (drags TensorFlow.js), Plotly.js (3+ MB, overlaps ECharts), Lodash (modern JS covers it), Moment.js (legacy; Day.js chosen), any tile-based map dependency for offline tools, TensorFlow.js/transformers.js-class ML (model weights are remote/secondary assets; out of scope per the brief's "do not reproduce the Python NLP ecosystem").

**Capability gaps intentionally left to the platform:** cryptography (WebCrypto), compression beyond ZIP (JSZip covers the practical case; `fflate` overlaps and is rejected for now), workers (the PDF.js Blob-URL pattern is the house pattern — document it in the skill), reproducible seeds (document a ~10-line mulberry32/xoshiro PRNG snippet in the skill rather than shipping a library), HTML-table/XML ingestion (`DOMParser` is native), JSON Lines (trivial split+parse).

### 5.3 Supply-chain architecture

Four approaches evaluated:

| Criterion | 1. Commit vendored artifacts | 2. Lockfile + copy from node_modules (status quo) | 3. Acquisition script + hash verify | 4. Hybrid (1+3) |
| --- | --- | --- | --- | --- |
| Reproducibility | Perfect at any commit | Good while npm serves the version | Good, needs network once | Perfect at any commit |
| Offline build | Yes | Only after `npm install` | No (first run) | Yes |
| Repo size | +15–30 MB | small | small | +15–30 MB |
| Auditability | `git diff` shows every byte change | indirect (lockfile hash → package, not artifact) | manifest hash | manifest hash **and** git diff |
| Upgrade burden | manual copy | `npm update` (too easy — silent) | re-run script, update hashes | script + commit (deliberate by design) |
| npm supply-chain exposure | at admission only | every `npm install` | at acquisition only | at acquisition only |
| CDN exposure | none | none (except Tailwind today) | depends on source URL | none at build time |
| GitHub Actions compatibility | trivial | needs `npm ci` | needs network + hash gate | trivial |
| Single-file compilation | native | native | native | native |

**Recommendation: approach 4 (hybrid).** Precedent already exists in-repo: `vendor/acorn` is committed and wired through `package.json`. Concretely (all **proposed**):

- `vendor/libs/<id>/<artifact>` — exact browser artifacts, committed. `build_local_ide.py` reads **only** from `vendor/libs` (and `vendor/acorn`), never from `node_modules`, and **fails hard** on any missing or hash-mismatched artifact — delete the warning-stub path in `load_lib` (`build_local_ide.py:88-104`); the `MANDATORY_LIB_TOKENS` special case disappears because everything becomes mandatory.
- `scripts/acquire-libs.mjs` (or `.py`) — the only path that touches the network: downloads a declared artifact from its manifest `sourceUrl` (npm registry tarball or upstream release asset), verifies the manifest SHA-256, and writes it into `vendor/libs`. Used only when admitting or deliberately upgrading a library. Never invoked by the build.
- npm/`package-lock.json` remains for IDE-shell dev tooling only (vite/tsc), not for vault payloads. Repo-size growth is bounded and mostly already paid — the repository already commits two 5.4 MB compiled artifacts containing all payloads.

### 5.4 Library manifest (proposed schema)

One machine-readable file, `vendor/libs/manifest.json`, the single source of truth for the vault. Fields per entry (adjusted from the brief where repository evidence supports it — notably `buildToken`/`stemId` to match the two existing naming layers, and `workerArtifact` to model the PDF.js pair):

```json
{
  "schemaVersion": 1,
  "libraries": [
    {
      "id": "pdfjs",
      "displayName": "PDF.js",
      "version": "<exact, set at admission>",
      "upstream": "https://github.com/mozilla/pdf.js",
      "packageCoordinate": "npm:pdfjs-dist",
      "acquisition": "npm-tarball",
      "sourceUrl": "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-<version>.tgz",
      "artifactPathInPackage": "build/pdf.min.js",
      "repoPath": "vendor/libs/pdfjs/pdf.min.js",
      "sha256": "<of the repo artifact>",
      "license": "Apache-2.0",
      "attribution": null,
      "buildToken": "lib_pdfjs",
      "stemId": "lib-pdfjs-stem",
      "runtimeGlobal": "pdfjsLib",
      "artifactType": "script",
      "dependencies": [],
      "workerArtifact": { "repoPath": "vendor/libs/pdfjs/pdf.worker.min.js", "sha256": "<...>" },
      "secondaryAssets": [],
      "packaging": "script-vault",
      "expectedSizeKB": 1100,
      "compatibilityNotes": "v4+ ships .mjs; use legacy build if upgrading",
      "updateNotes": "CVE-2024-4367 fixed in 4.2.67; upgrade at admission"
    }
  ]
}
```

`artifactType` ∈ `script | stylesheet`; `packaging` ∈ `script-vault | style-vault | script-vault-with-worker`. The build script derives `LIB_PATHS`, stem lists, `availableLibraryStemManifest()` (`local-ide.src.html:1337-1349`), the library accordion UI rows, and the corresponding section of `skills/local-html-ide.md`'s stem table from this manifest at build time — eliminating the current four-way duplication (build script, IDE UI, IDE-internal stem manifest, skill file) that can drift today.

### 5.5 CI workflow (proposed — none exists today)

`.github/workflows/verify.yml`, single job matrix isn't needed; one Ubuntu job:

1. `npm ci` (shell tooling only).
2. **Manifest integrity:** every `repoPath`/`workerArtifact` exists; SHA-256 matches; no file exists under `vendor/libs/` that the manifest doesn't declare; every entry has `license` and `sourceUrl`; versions are exact strings.
3. **Deterministic rebuild:** run `build_local_ide.py`; `git diff --exit-code local-ide.html public/local-ide.html` — the committed artifacts must be byte-identical to a clean rebuild (this simultaneously proves placeholder resolution, skill injection freshness, and root/public parity).
4. **Existing suites:** `patch-engine`, `script-breakout-scanner`, `local-html-ide-skill`, `generated-html-structure`, `generated-main-script-syntax`, `export-integrity`, `stickshift-package-contract` (PR #18), `test_export.cjs`, `html-shell-integrity.test.py`, `npm run lint`.
5. **Compiled-artifact assertions** (mostly already in the suites; add where missing): each vault payload appears exactly once; no active stem remains outside injected wrappers; no `{{lib_*}}`/`{{ide_coding_skill}}`/`{{tailwind_js}}` placeholders remain; no `https://cdn.` / `http(s)://` runtime-fetch references outside documented advisory cases (the StickShift validator already flags `fetch` advisorily); PDF.js worker bytes match the vendored worker.
6. **Upgrade discipline:** because artifacts are hash-pinned and the rebuild must be byte-identical, any library change forces a manifest + vendor + artifact + (usually) test change in one reviewable commit. That *is* the deliberate-upgrade mechanism.

**What SHA-256 verification proves:** the artifact in the repo (and inside the compiled IDE) is bit-identical to the artifact the operator approved when the manifest entry was written. **What it does not prove:** that the artifact is secure, correctly licensed, browser-compatible, appropriate, or that upstream wasn't already compromised before admission. Therefore the **admission process** (a checklist recorded in the PR that adds a manifest entry) must cover: license read, advisory/CVE search (the pdfjs/xlsx findings above show why), a functional packing test, size review, and a note on why this library over alternatives. Upgrades repeat the same checklist. Hash checking then keeps that one-time human judgment immutable.

### 5.6 Minimum compatibility tests

Extend `test_export.cjs` / a new `tests/library-vault.test.cjs`: for every manifest entry, compile a tiny fixture containing only that stem, assert (a) single injection, (b) the runtime global appears in the payload (`typeof` smoke where executable in Node, string presence otherwise), (c) round-trip `unpackInlinedLibraries` restores the stem, (d) for PDF.js, worker + setup blocks are present. This is cheap and mechanical once the manifest exists.

### 5.7 Eliminating nondeterministic build paths

Verified current offenders, with fixes:

1. **Tailwind CDN fetch** (`build_local_ide.py:67-84`): live, unversioned `https://cdn.tailwindcss.com`. → Vendor the exact Tailwind v3 browser-engine artifact as a manifest entry (`vendor/libs/tailwind-play/…`, hash-pinned, acquired once via the acquisition script); delete the fetch.
2. **Silent reuse of code scraped from the previous generated artifact** (`get_existing_tailwind_js`, `build_local_ide.py:35-54`): the build harvesting its own prior output is the single worst determinism hazard — delete it entirely.
3. **Gitignored cache** (`node_modules/tailwind-cdn-offline.js`, line 14): un-auditable local state; delete with the fetch.
4. **Warning-stub embedding** for missing libraries (`load_lib`): converts an incomplete environment into a silently broken artifact; make every declared input mandatory.
5. **Caret ranges in `package.json`**: harmless while `package-lock.json` governs and vault payloads move to `vendor/libs`, but pin the remaining build-relevant shell deps (prismjs, codejar) exactly or vendor them too via the manifest.

End state matches the brief's requirement: a clean checkout builds byte-identically from repository-controlled inputs, or fails loudly telling the operator to run the explicit acquisition step. CI step 3 enforces it forever.

---

## 6. Workstream 2 — Two-skill architecture

### 6.1 Skill A (IDE coding/operator skill) — status

**Verified current:** `skills/local-html-ide.md` already covers create mode, edit mode, `html-ide-patch` v2, source hashes, exact matching, named regions, stem tags, failure recovery (§§3, 15 of the skill), Code-vs-Tool-Skill distinctions (skill lines 81–138), and the `HTML_OPEN` opening block (lines 509–517). `tests/local-html-ide-skill.test.cjs` pins its required content. **PR #18 only:** build-time injection makes it the artifact's embedded skill; the byte-equality test closes drift *when the suite runs* — CI (§5.5 step 3) makes that unconditional. Remaining Skill A work is content, not plumbing: document the Tool Skill edit-target loop (§6.3) and the worker/PRNG house patterns (§5.2) once they exist.

### 6.2 Skill B (packed Tool Skill) — status

**Verified current:** the representation is right — descriptor-gated, region-resident, optional by design ("Do not add a Tool Skill to ordinary self-explanatory software merely as boilerplate", `docs/standalone-html-ide.md`), preserved through export/import, `skill: null` supported. **PR #18 only:** canonical install-package frontmatter and round-trip preservation of authored instructions. **The standalone/StickShift selector must be preserved:** on PR #18 the checkbox cleanly separates "Package for StickShift" (descriptor required) from standalone export. A standalone tool retains its authored `tool-skill` region text and any `app-skill`/`app-runtime-contract` blocks without StickShift registration — compiled output only gains `STICKSHIFT_TOOL`/`stickshift-skill` when packaging is on (`compileAppSource`, PR #18 version). So yes, a standalone tool may carry operating documentation without being a registered StickShift tool; no change needed beyond keeping the selector semantics exactly as PR #18 defines them.

### 6.3 The gap and the proposed edit-target architecture

**Verified current gap:** Tool Skill authoring runs through `prompt()` dialogs (`local-ide.src.html:1508-1515`) — no preview, no diff, no LLM contract, a single-line input box for multi-hundred-line markdown, and `Copy Patch Context` (the only context affordance) always emits the full-code patch contract.

**Proposed: an explicit two-position edit-target selector — `Code | Tool Skill` — plus the existing Create/Edit distinction surfaced for Code.**

- **Code target** (existing behavior, formalized): Copy Context emits either create context (task framing + skill pointers + stem manifest, no source) or the current patch context (`copyPatchContext`), depending on a visible Create/Edit selector. Response contract: full HTML document (create) or `html-ide-patch` v2 packet (edit) — unchanged.
- **Tool Skill target:** Copy Context emits only: current Tool Skill markdown (or "none"), Tool Descriptor JSON, tool title + export filename, StickShift packaging state, supported placeholders (`{{TOOL_TITLE}}`, `{{TOOL_FILE}}`, `{{SKILL_SLUG}}`), a one-paragraph tool-purpose summary (derived from `descriptor.description`), the exact response contract, and the instruction "change only the Tool Skill." It must **not** include the application source — that is what keeps the two passes separated.

**Update mechanism — recommendation: a dedicated, minimal Tool Skill packet, applied through the existing named-region machinery.** Compared alternatives:

- *`html-ide-patch` + `replace_region`*: works today and stays supported (the skill already teaches it), but as the primary loop it forces the LLM to hold the full source hash context and JSON-escape large markdown — exactly the fragility catalogued in skill rules 8 and 11. Rejected as the primary path ("do not force Tool Skill editing through the code patch path merely for symmetry").
- *Separately held Tool Skill state*: **rejected** — it breaks the repository's hardest-won invariant, "one authoritative representation, `state.code` is canonical" (`local-ide.src.html:1043`, `docs/standalone-html-ide.md`), and would reintroduce the UI/source divergence the legacy `htmlide-ss-skill-template` migration (`local-ide.src.html:1538-1547`) exists to clean up.
- *Dedicated packet* (**recommended**): `{ "protocol": "html-ide-toolskill", "version": "1.0", "target": { "sourceHash": "sha256:..." }, "toolSkill": { "markdown": "..." } }` — whole-skill replacement only (bounded, previewable, trivially authored); `"markdown": null` removes the skill and sets `skill: null` on the descriptor, mirroring the existing remove flow (`local-ide.src.html:1513`). Application: verify hash against `state.code` (same stale-context protection as code patches), then reuse `replaceNamedRegion`/`replaceDescriptor`/`commitSource` — atomic because `commitSource` is a single assignment of a fully validated next source. Show a preview (rendered markdown + raw text side by side) before apply; record the transaction in `patchHistory` so Undo Patch covers it.

This satisfies every required property: one authoritative representation (still `state.code`), no UI/source divergence (projection editors remain), deterministic export (unchanged compiler), round-trip reliability (PR #18 tests), easy authoring (no JSON-escaping of the whole document — one markdown string field), visible preview, atomicity, stale-context protection, clear failures (reuse the §7.3 failure surface), and an untouched standalone/StickShift selector. The `prompt()` editors should be replaced by a proper panel in the same change; keep manual editing available alongside the packet path.

---

## 7. Workstream 3 — Product polish and stable-release closeout

### 7.1 Active surface and paste target

**Verified current:** the only mode signals are the drawer's open state and button labels; nothing indicates where Ctrl+V lands, and Create vs Edit does not exist as UI state. **Proposed state model** — a persistent status strip (top of the AI drawer or header): `Target: Code | Tool Skill` + `Mode: Create | Edit` + `Expecting: full HTML document / html-ide-patch v2 packet / tool-skill packet` + current source hash (already displayed, `#sourceHashText`). The paste textarea gets a mode-colored border and an explicit placeholder naming the expected packet type; Copy Context always states in its first line what it produced (the current context already starts with `# Local HTML IDE patch context` — extend the convention). Focus targets get a visible focus ring plus a text label, not color alone.

### 7.2 Visual hierarchy (requirements, not a redesign)

Repository evidence does not justify a full redesign — the shell is coherent. Concrete requirements only: (a) exactly one primary action per surface (Apply Changes; Download); (b) destructive/risky actions (Undo Patch, Tool Skill removal, overwrite-on-import) demand a distinct treatment and confirmation *inside the IDE*, not `confirm()`; (c) the Code/Tool Skill and Create/Edit selectors are segmented controls with a labeled active state; (d) source, preview, context, and export areas keep their existing panel boundaries; (e) validation errors and status render in a persistent results region (§7.3) instead of `alert()`; (f) meet WCAG AA contrast for the small gray-on-dark text (`text-gray-500` on `#111113` is borderline) and never encode state by hue alone.

### 7.3 Patch reliability and failure reporting

**Verified:** the engine distinguishes every failure class the brief lists — no action (empty input, `local-ide.src.html:1383`), malformed JSON (`patch-engine.cjs:28`), protocol/validation failures (lines 29–48), stale hash (line 134), zero/excess matches (line 103), overlap (line 113), invalid region (lines 77–96), and success with counts (`summarizePreflight`). The engine passed its full test suite here; nothing in the repository demonstrates an exact-matching defect. The PR #18 commit log (repeated `fix: treat regex replacements literally`, `fix: preserve build-script escape anchors`, plus diagnostic-capture churn) is evidence that historical failures were **LLM-side packet-generation failures against regex-heavy source** — precisely what skill rules 8, 11, and 14 now address — not engine defects. **Recommendation: no engine changes.** Keep exact matching.

**Proposed (reporting only):** replace `alert()`/`confirm()` in `applyPacketUpdates`/`undoLastPatchTransaction` with a persistent result panel that shows the failure class, the exact engine message, and a one-click **Copy failure for LLM** button (the skill's rule 3 tells the model to demand the exact message — the IDE should make that a single click, bundling the message + current hash + a reminder that a rejected packet does not invalidate the hash). Success reporting distinguishes: code change applied / Tool Skill change applied / applied-with-notes (e.g., descriptor updated as a side effect of skill removal). Malformed Tool Skill packets get the same treatment via §6.3.

### 7.4 Build and artifact integrity; source-control policy

**Verified current:** canonical sources are `local-ide.src.html`, `scripts/patch-engine.cjs`, `skills/local-html-ide.md`, `vendor/acorn`, `build_local_ide.py`, tests, docs, `failing-code/` fixtures. Generated-but-committed: `local-ide.html`, `public/local-ide.html` (byte-identical today). **Policy: keep committing both generated artifacts** — the root file is the shippable product for a copy-paste-first operator, and CI's byte-identical-rebuild gate (§5.5 step 3) turns the usual staleness risk of committed artifacts into a hard guarantee instead. `file://` execution and script-breakout handling are already covered by the shell-integrity and breakout-scanner suites; the WP-0 fix below restores their credibility.

**Legacy scaffolding decision (proposed):** remove `src/App.tsx`, `index.html`, `vite.config.ts`, `metadata.json`, `.env.example`, and rewrite `README.md` for the actual product — or, minimally, quarantine them under `legacy/` with a README note. They are dead weight from the AI Studio origin (§3), confuse every future LLM pass over the repo, and keep a misleading `GEMINI_API_KEY` reference in a product whose promise is "no remote runtime." Keep `npm run lint`'s target set consistent with whatever is removed. Low risk, but do it as its own commit at closeout, not mixed into functional work.

---

## 8. Scope discipline and stable-release cut line

| Item | Classification |
| --- | --- |
| Fix red suite: escape the `</script'` literal at `local-ide.src.html:1153` per the skill's own rule 16 **and** make the test scanner spec-accurate (require whitespace-`/`-`>` after `</script`), rebuild artifacts | **Release blocker** |
| Merge PR #18 (after §4 revisions incl. `skillFrontmatterValue` fix + browser smoke pass) | **Release blocker** |
| CI workflow (§5.5) incl. byte-identical rebuild gate | **Release blocker** |
| Tailwind determinism fix + delete artifact-scraping and stub paths (§5.7) | **Release blocker** |
| Library manifest + vendored artifacts + hash verification for the **existing nine** libraries + Tailwind/Prism/CodeJar | **Release blocker** |
| PDF.js and SheetJS security upgrades through the manifest admission process | **Reliability defect** (blocker-adjacent; ship in the same release if the v4 PDF.js single-file evaluation succeeds, else document the risk and defer one release) |
| Code/Tool Skill edit-target selector + tool-skill packet + preview + replacement of `prompt()` editors (§6.3) | **Release blocker** (it is the product's second core loop) |
| Failure-reporting panel replacing `alert()`/`confirm()` (§7.3) | **Reliability/recovery defect** — in the release |
| Active-surface/paste-target status strip (§7.1) | **High-value polish** — in the release |
| Create/Edit selector + create-context copy for Code mode | **High-value polish** — in the release |
| Core library additions: Papa Parse, simple-statistics, Day.js, Chart.js (§5.2) | **High-value polish** — in the release only because they ride the finished manifest mechanism; drop to post-stable without hesitation if schedule pressure appears |
| Manifest-driven generation of stem lists in UI/skill (§5.4 last ¶) | **Architectural debt** — do with the manifest, cheap once designed |
| Legacy AI Studio scaffolding removal (§7.4) | **Architectural debt** — closeout commit |
| Optional library additions (Arquero, ECharts, Cytoscape, Leaflet/Turf, compromise, Fuse, MiniSearch, Ajv, Dexie, marked, D3) | **Optional feature** — post-stable, one admission PR each |
| Visual-hierarchy contrast pass (§7.2) | **Optional feature** |
| sql.js, Arrow, proj4/shapefiles, wink-nlp, hash-wasm | **Deferred** |
| Fuzzy/regex/semantic patch matching, separately-held Tool Skill state, DuckDB-WASM, Plotly, Danfo, tile maps, general-purpose IDE roadmap items | **Rejected** |

**Stable-release cut line:** everything classified Release blocker + the two reliability items + the three high-value polish rows ship in `v1.0-stable`. Everything below the Core-library row does not block tagging. After the tag, new capability lands only as manifest admissions or bounded feature PRs — no open-ended roadmap.

---

## 9. Work packages (for Antigravity/Codex, with review breakpoints)

Each WP is bounded, independently verifiable, and lands on a green suite. **Breakpoints** (operator review + browser smoke) after WP-0/1, WP-3, and WP-6.

- **WP-0 — Green baseline** *(on top of PR #18's branch)*: escape `local-ide.src.html:1153`; make the `scriptBlocks` scanner in `tests/generated-html-structure.test.cjs` and `tests/generated-main-script-syntax.test.cjs` spec-accurate; fix `skillFrontmatterValue` `\s` escaping; rebuild artifacts; run all suites with `npm install`. Exit: every test in §2's table passes.
- **WP-1 — Merge PR #18**: browser smoke checklist from §4; squash-merge to `main`. Exit: draft closed, `main` green.
- **WP-2 — CI**: `.github/workflows/verify.yml` per §5.5 (steps 1, 3, 4 first; manifest steps activate in WP-3). Exit: CI green on `main`, red on an intentionally stale artifact.
- **WP-3 — Determinism + manifest**: `vendor/libs/` + `manifest.json` for the existing 9 + Tailwind/Prism/CodeJar; acquisition script; `build_local_ide.py` reads only vendored inputs and hard-fails; delete CDN/scrape/stub paths; CI manifest checks on. Exit: clean-checkout rebuild is byte-identical; builds fail loudly without vendored inputs.
- **WP-4 — Security upgrades**: PDF.js (evaluate v4 legacy build single-file compatibility, incl. worker) and SheetJS via the admission process; update `test_export.cjs` expectations. Exit: fixtures compile and round-trip; advisories cleared or explicitly waived in the manifest `updateNotes`.
- **WP-5 — Tool Skill edit loop**: edit-target selector, Tool-Skill Copy Context, `html-ide-toolskill` packet + preview + history integration, panel editors replacing `prompt()`; extend `skills/local-html-ide.md` and its contract test. Exit: full two-pass workflow (code pass, then skill pass) demonstrated on a fixture tool; round-trip tests extended.
- **WP-6 — Failure surface + status strip**: §7.1 + §7.3; remove `alert()`/`confirm()` from the patch/undo/download paths. Exit: every failure class renders in-panel with copyable text.
- **WP-7 — Core library admissions**: Papa Parse, simple-statistics, Day.js, Chart.js — one PR each through the admission checklist, with §5.6 tests and skill-table updates (manifest-generated).
- **WP-8 — Closeout**: legacy scaffolding removal, README rewrite, `docs/standalone-html-ide.md` refresh, tag `v1.0-stable`.

---

## 10. Open questions for the operator

1. PDF.js v4 upgrade: if the legacy build can't be made single-file cleanly, ship v1.0-stable on 3.11.174 with the CVE documented in the manifest (PDF parsing of *untrusted* files is the risk surface) — acceptable?
2. Repo-size tolerance for `vendor/libs/` (~15–30 MB now, growing with Optional admissions): acceptable, or should Optional libraries stay acquisition-script-only (approach 3) while Core stays vendored?
3. Delete vs. quarantine the AI Studio scaffolding (§7.4)?
