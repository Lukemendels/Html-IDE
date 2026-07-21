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

Patch packets are source-hash-bound and exact-match atomic transactions. The parser accepts one complete fenced JSON payload as well as unfenced JSON and legacy SEARCH/REPLACE input. Named regions are validated before descriptor/skill mutation. Run `npm install`, `python3 build_local_ide.py`, `node tests/patch-engine.test.cjs`, `node test_export.cjs`, `node tests/export-integrity.test.cjs`, and `npm run lint` before release. Browser smoke checks should exercise file:// standalone Pomodoro download, descriptor-only setup, skill-enabled setup, script template insertion, PDF.js worker export, and legacy import round trips.

## Paste, parser, and round-trip boundaries

Raw HTML remains the preferred Create Mode output. For compatibility, the editor unwraps one complete `html`, `htm`, or unlabelled Markdown fence when its payload starts with `<!doctype html>` or a top-level `<html>` element. Partial snippets, non-HTML fences, and any commentary outside a fence are not unwrapped.

`parsePatchPacket()` is the normal public patch parser entry point. It accepts unfenced or singly fenced JSON and legacy SEARCH/REPLACE packets; the exported `parseLegacySearchReplace()` has the same fence tolerance for direct callers. Malformed packets remain rejected.

During compilation only, a single well-formed marked Tool Skill may safely contain a documentation example with a raw `</script>` token: the compiled copy changes it to `<\/script>` while the editor source remains unchanged. Ambiguous, unmarked, duplicated, or malformed data-script source is not silently repaired. Import removes compiler-owned compatibility and library wrappers with their owned export whitespace only; user application whitespace is otherwise retained, and canonical integration blocks are reconstructed deterministically.
