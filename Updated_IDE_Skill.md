---
okf_version: "0.1"
type: Skill
title: Local HTML IDE Code Updater
description: Modify, edit, or refactor HTML, CSS, and JS code in the Local HTML IDE workspace using structured html-ide-patch v2 packets and offline library stem tags.
tags: [skill, html-tool, code-editor]
---

# local-html-ide

## Purpose
Use this skill when you want to modify, add, or delete code inside the active HTML editor workspace of the Local HTML IDE.

## Available Offline Libraries
The IDE contains preloaded offline library assets. You can inject them instantly into your HTML code by simply writing their corresponding **Stem Tags** anywhere inside the editor code:
- **Alpine.js**: `&lt;script id="lib-alpine-stem"&gt;&lt;/script&gt;` (Reactive micro-framework)
- **Pico.css**: `&lt;link rel="stylesheet" id="lib-picocss-stem"&gt;` (Classless semantic dark/light styling)
- **JSZip**: `&lt;script id="lib-jszip-stem"&gt;&lt;/script&gt;` (Zip reader/writer)
- **docxtemplater**: `&lt;script id="lib-docxtemplater-stem"&gt;&lt;/script&gt;` (Word document generation templates)
- **docx**: `&lt;script id="lib-docx-stem"&gt;&lt;/script&gt;` (Gen Word documents from scratch)
- **Mammoth.js**: `&lt;script id="lib-mammoth-stem"&gt;&lt;/script&gt;` (Docx plain text extractor)
- **SheetJS (xlsx)**: `&lt;script id="lib-sheetjs-stem"&gt;&lt;/script&gt;` (Excel parse & workbook builder)
- **PptxGenJS**: `&lt;script id="lib-pptxgen-stem"&gt;&lt;/script&gt;` (PowerPoint slide generator)
- **PDF.js**: `&lt;script id="lib-pdfjs-stem"&gt;&lt;/script&gt;` (PDF text extractor)

*IMPORTANT*: Never copy-paste the full minified library code into your editor updates. Simply insert the Stem Tag. The compilation packer will automatically inline the full library code on preview or download.

## Create Mode
For a brand-new app, return exactly one complete HTML document and no Markdown fences or commentary. Use library Stem Tags instead of pasting bundled minified libraries, and do not use CDN URLs when an equivalent offline Stem exists. Apps that need a runtime LLM workflow may embed their own separate runtime skill in `<script id="app-skill" type="text/markdown">` and a machine-readable contract in `<script id="app-runtime-contract" type="application/json">`; this is separate from the IDE coding patch protocol.

## Tool Descriptor and Optional Tool Skill
A standalone app may contain neither integration block. A registered tool contains one **Tool Descriptor** (structured JSON) and may contain one optional **Tool Skill**. The descriptor is metadata, not a skill, and may use `"skill": null`. Add a Tool Skill only for LLM-specific workflows; ordinary timers, calculators, dashboards, forms, and games do not need one. Both blocks are editable source and share the source hash; this IDE Coding Skill is immutable and outside `state.code`.

Use the named regions `tool-descriptor` and `tool-skill`; use `replace_region` for whole-block changes. A descriptor uses `schema: "stickshift-tool"`, `version: "1.0"`, `open.protocol: "HTML_OPEN"`, and either `skill: null` or `{ "elementId": "tool-skill", "slug": "{{SKILL_SLUG}}" }`.

An optional Tool Skill uses this source-resident block, placed just before `</body>`:

```html
<!-- HTML_IDE_REGION:tool-skill:start -->
<script type="text/markdown" id="tool-skill">
---
name: {{SKILL_SLUG}}
description: ...
---
...skill markdown...
<\/script>
<!-- HTML_IDE_REGION:tool-skill:end -->
```

In create mode, add it only when the tool requires LLM-specific operating instructions, structured workflows, packet contracts, interpretation rules, or multi-step agent behavior. Include frontmatter, when to use the tool, its inputs/outputs, clipboard or packet contracts, and the standard open-instructions footer. `{{TOOL_TITLE}}`, `{{TOOL_FILE}}`, and `{{SKILL_SLUG}}` are substituted at export. In edit mode, patch its text normally or use `replace_region` on `tool-skill`; skill and code patches share the same hash and atomicity. Never write a literal closing-script token in it, write `<\/script` instead. This differs from `app-skill`, which is an app runtime LLM workflow; `tool-skill` is the StickShift companion installed as `skills/{{SKILL_SLUG}}.md`. Both may coexist.

## How the Agent Edits Code
For edits to an existing app, generate a structured JSON `html-ide-patch` version `2.0` packet by default. The user will paste it into the AI Update Drawer. Include the exact current source hash supplied by the IDE/user as `target.sourceHash`, unique patch ids, explicit `expectedMatches`, and exact search text. Supported operations are `replace`, `insert_before`, `insert_after`, `delete`, and `replace_region` using `<!-- HTML_IDE_REGION:name:start -->` / `<!-- HTML_IDE_REGION:name:end -->` markers.

The IDE uses exact matching only. Treat every packet as an atomic transaction: one malformed, ambiguous, zero-match, or overlapping patch rejects the whole packet.

Before emitting a packet, inspect the current source text and verify each `matching.search` string exactly as it appears in the source. Do not assume a search block is unique. Count the exact occurrences of every search string and set `expectedMatches` to the verified count. If the same replacement is intended for every occurrence, `expectedMatches` may be greater than 1. If only one occurrence should change, expand the search with stable surrounding context until it has exactly one match.

Prefer small, stable, low-risk edits over large function replacements. For parser, validation, or classification behavior, first consider whether the issue can be fixed by changing data, configuration, category order, aliases, constants, or lookup tables instead of replacing a complex algorithm.

### Structured AI Update Packet Format

```json
{
  "protocol": "html-ide-patch",
  "version": "2.0",
  "target": { "sourceHash": "sha256:..." },
  "patches": [
    {
      "id": "change-button-label",
      "operation": "replace",
      "matching": { "strategy": "exact", "expectedMatches": 1, "search": "<button>Save</button>" },
      "replacement": "<button>Export</button>"
    }
  ]
}
```

### Rules for Generating Packets

1. **Exact Matches Only**: In v2.0, `matching.strategy` must be `exact`; do not request indentation, fuzzy, regex, semantic, or whitespace-normalized matching.

2. **Use the Current Hash**: Always use the exact `target.sourceHash` supplied by the IDE/user for the current source. If the user reports a failed packet or any intervening edit occurred, ask for or use the updated current source hash before generating a revised packet.

3. **Mandatory Match Count Verification**: Before emitting a packet, count exact occurrences of every `matching.search` string in the current source text.
   - If the search text appears 0 times, do not emit the packet.
   - If the search text appears once and only one change is intended, use `expectedMatches: 1`.
   - If the search text appears multiple times and all occurrences should receive the same replacement, set `expectedMatches` to the actual count.
   - If the search text appears multiple times but only one occurrence should change, add stable surrounding context until the search is unique.

4. **No Ambiguous Isolated Lines**: Do not patch common single lines by themselves. Avoid isolated searches such as common loop headers, reset statements, button disabled statements, logging lines, or repeated state assignments. Instead, include a unique local mini-block with function-specific context, such as nearby status text, file/input reset lines, local variable declarations, or surrounding control flow.

5. **Choose Stable Search Blocks**: A good exact search block should be:
   - Copied exactly from the current source.
   - Large enough to be unique.
   - Small enough to avoid unrelated drift.
   - Free of unnecessary regex literals or heavy escaping when possible.
   - Anchored by stable surrounding context, not by incidental whitespace alone.

6. **Prefer Named Regions for Whole Blocks**: When editing a source block already surrounded by `HTML_IDE_REGION` markers, prefer `replace_region` for whole-region changes. Do not use broad exact text replacement for a named region when `replace_region` is available.

7. **Regex-Heavy JavaScript Safety**: Avoid hand-writing large JSON search strings that contain JavaScript regex literals, many backslashes, replacement strings, or nested quotes. These often fail because JSON escaping and JavaScript escaping differ.
   - Prefer simple anchors such as `function someName(...) {` for insertions.
   - Prefer replacing nearby non-regex configuration or data.
   - If regex-heavy code must be edited, copy the smallest exact source segment possible from the current source and ensure the JSON string is valid.
   - Do not guess backslash counts after a zero-match failure.

8. **Avoid Large Function Replacements Unless Necessary**: Replacing an entire function is higher risk, especially if it contains regexes, generated strings, template literals, or prior edits. Before replacing a function, check whether the goal can be achieved with:
   - A data/configuration change.
   - A category or alias order change.
   - A small condition replacement.
   - An inserted helper anchored on a simple function declaration.
   - A small call-site change.

9. **Parser Logic Consistency**: Do not duplicate parser regex logic in helper functions when a canonical parser output already exists. Prefer passing or reusing existing verified values, such as a known-good match list, token list, parse result, or validation result. Diagnostics should derive from canonical parser state rather than reimplementing separate regex scans that can diverge.

10. **No Overlapping Patch Ranges**: Do not include patches whose ranges overlap or touch the same target function in conflicting ways. In particular, do not insert before/after a function and replace that same function in the same packet. Either:
   - Combine the helper insertion and function change into one larger replacement of the target block, or
   - Split the work into separate packets.

11. **Atomicity Discipline**: Because one bad patch rejects the whole packet, keep risky edits separate from safe edits. Do not bundle optional diagnostics, logging, formatting, or refactors with core functional fixes when the optional changes require fragile matching.

12. **Split Risky Work Into Separate Packets**: Use separate packets when:
   - One change touches regex-heavy parser code.
   - One change is optional diagnostics or logging.
   - One change has broad or uncertain match context.
   - One change depends on another applying first.
   - Combining patches would create overlapping ranges.

13. **Recovering After Preflight Failure**:
   - If the IDE reports “Expected 1, found N,” either set `expectedMatches` to N only if every occurrence should change, or add context to isolate the intended occurrence.
   - If the IDE reports “Expected 1, found 0,” do not retry by guessing escaping. Re-read the current source, select a simpler exact anchor, use a smaller search block, use a named region, or choose a lower-risk data/configuration patch.
   - If the IDE reports malformed JSON, reduce backslash-heavy content, validate JSON syntax, and avoid large regex-heavy strings.
   - If the IDE reports overlapping ranges, combine the conflicting edits into one replacement or split them into separate packets.

14. **Library Safety**: Insert Stem Tags for libraries; never paste full bundled library payloads.

15. **JSON-only Contract**: For normal code-edit responses, return one complete JSON packet and no prose. The packet may be enclosed in one `json` Markdown fence if needed by the surrounding chat, but do not include `SEARCH:`/`REPLACE:` blocks, explanations, or additional packets.

### Patch Reliability Checklist

Before emitting any `html-ide-patch` packet, verify:

1. **Hash**
   - The packet uses the current IDE-provided `target.sourceHash`.

2. **JSON Validity**
   - The output is one valid JSON object.
   - All strings are valid JSON strings.
   - Backslashes, quotes, newlines, and `</script>` sequences are escaped correctly where needed.

3. **Exact Search Text**
   - Every `matching.search` value is copied exactly from the current source.
   - No search string relies on guessed whitespace, guessed regex escaping, or remembered prior source.

4. **Match Counts**
   - Every search string has been counted in the current source.
   - `expectedMatches` equals the actual count.
   - If the actual count is greater than 1, the replacement is intended for all matches. Otherwise, add more context.

5. **Uniqueness**
   - Avoid isolated common lines.
   - Use stable local mini-blocks with function-specific context.
   - For reset/UI state patches, include nearby status text or surrounding reset lines.
   - For parser patches, prefer unique data/config blocks or simple declaration anchors.

6. **Regex and Escaping Risk**
   - Avoid large regex-heavy search strings.
   - Avoid hand-writing complex escaped regex literals inside JSON.
   - If a regex-heavy patch previously failed with zero matches, switch strategy instead of guessing escape counts.

7. **Patch Size**
   - Prefer the smallest patch that safely achieves the goal.
   - Prefer data/configuration edits before algorithm rewrites.
   - Keep optional diagnostics separate from core fixes.

8. **No Overlap**
   - No patch inserts around a block that another patch replaces.
   - No two patches target overlapping or conflicting source ranges.

9. **Runtime Consistency**
   - Do not duplicate canonical parser regex logic.
   - Reuse existing computed parser outputs where available.

10. **Atomicity**
   - Every patch in the packet has a verified exact match.
   - Risky or dependent edits are split into separate packets.

## How to open the tool
A local HTML tool cannot be opened from a chat hyperlink. Give the operator this block verbatim, then one instruction line, and nothing else:

<HTML_OPEN>
tool: local-ide.html
include:
- skills/local-html-ide.md
</HTML_OPEN>

Instruction line: "Copy the block above and click Open HTML Tool in StickShift."
