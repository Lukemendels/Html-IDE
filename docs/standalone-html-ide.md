# Local HTML IDE standalone architecture

`local-ide.src.html` is the authoritative standalone source. `python3 build_local_ide.py` produces both `local-ide.html` and `public/local-ide.html`; do not edit generated copies directly.

## Ownership and editable source

The IDE has three deliberately separate concepts:

- **IDE Coding Skill** is the immutable `#ide-coding-skill` markdown block in the IDE shell. It teaches Create/Edit Mode, source hashes, `html-ide-patch` 2.0, exact matching, named regions, and offline library stems. It is copied from the IDE setup panel only and is never in `state.code`.
- **Tool Descriptor** is optional source-resident JSON in the `tool-descriptor` named region. Its canonical schema is `stickshift-tool` version `1.0`; it has `file`, `title`, `description`, `open: { protocol: "HTML_OPEN", tool }`, and either `skill: null` or `{ elementId: "tool-skill", slug }`. It registers the application; it is metadata, not an LLM skill.
- **Tool Skill** is optional source-resident markdown in the `tool-skill` named region. It supplies LLM-specific operating instructions only when a tool needs structured workflows, packet contracts, interpretation rules, or multi-step agent behavior.

`state.code` is canonical. Application HTML/CSS/JS, a Tool Descriptor, and an optional Tool Skill all participate in the same source hash, patch transaction, undo history, import/export, and named-region editing. The immutable IDE Coding Skill and build-time library vault payloads do not.

A standalone application can have neither block. A registered Pomodoro-style tool can have a Tool Descriptor with `skill: null`. Do not add a Tool Skill to ordinary self-explanatory software merely as boilerplate. An optional **App Runtime Contract** (`app-runtime-contract`) remains distinct from both the IDE Coding Skill and a Tool Skill.

## Compile and Tool Setup UI

Compilation validates integration metadata, escapes/normalizes authored content, packs offline stems, resolves `{{TOOL_FILE}}`, `{{TOOL_TITLE}}`, and `{{SKILL_SLUG}} only in the compiled copy, and validates output. Editable source retains placeholders.

The explicit **Include Tool Setup UI** export option controls only the generated onboarding surface. It requires an existing Tool Descriptor; export never invents one. A no-skill descriptor gets an `HTML_OPEN` block with only `tool:` and no copy button. A skill-enabled descriptor gets `include: - skills/<slug>.md` and copies the actual source-resident `tool-skill` text. Exports are deterministic from editable source, output filename, and explicit options; browser-global templates are not an export input.

## Import and migration

Plain HTML stays plain. Descriptor-only and descriptor-plus-skill source is preserved. Legacy generated `stickshift-skill` blocks with meaningful authored instructions are hoisted into the canonical Tool Skill and receive/recover a Tool Descriptor. Generic registration boilerplate is stripped with the legacy generated shell rather than turned into a Tool Skill.

On startup the IDE detects the obsolete `htmlide-ss-skill-template` browser value and surfaces it for insertion or clipboard recovery, then removes it. It is never consulted during future exports.

## Offline operation

Preview and download share `compileAppSource()`. Offline library stems are expanded only in preview/download output, including the self-contained PDF.js worker Blob setup. The application remains single-file and does not require a server or network connection.

## Integrity safeguards and verification

Library packing masks non-executing `text/plain`, `text/markdown`, and `application/json` script blocks before scanning stems, then restores the bytes after packing. This prevents examples in a Tool Descriptor, Tool Skill, App Runtime Contract, or documentation payload from becoming libraries. Executable script payloads escape literal closing-script sequences at the embedding boundary. PDF.js exports include an embedded non-executing worker and Blob URL setup; no worker network path is used.

Patch packets are source-hash-bound and exact-match atomic transactions. The parser accepts unfenced JSON or one complete fenced JSON payload only. Legacy SEARCH/REPLACE packets are rejected. Named regions are validated before descriptor/skill mutation. Run `npm install`, `python3 build_local_ide.py`, `node tests/patch-engine.test.cjs`, `node test_export.cjs`, `node tests/export-integrity.test.cjs`, and `npm run lint` before release. Browser smoke checks should exercise file:// standalone Pomodoro download, descriptor-only setup, skill-enabled setup, script template insertion, PDF.js worker export, and Tool Skill import/export round trips.


## Regression fixtures

`failing-code/Failing-V2.html` is the final parser/export regression fixture. `node test_export.cjs` compiles it against the generated Pico.css, PDF.js (including worker), and SheetJS vault payloads, verifies each payload is injected once, rejects authored PDF worker ownership, and confirms executable payloads do not leak into document text.

### Executable script breakout scanner

Before library packing, executable script breakout protection lexically scans JavaScript so authored closing-script sequences in strings, templates, and comments are escaped without changing the true structural closing tag. The scanner also treats regex literals (including escaped characters, character classes, and flags) separately from division operators, using preceding meaningful tokens plus parenthesis/brace context to decide whether a slash can begin a regex. Control-statement boundaries and completed statement/declaration blocks can start a regex expression statement, while value parentheses, object literals, and function/class expressions preserve division. Data scripts retain their separate masking path.
