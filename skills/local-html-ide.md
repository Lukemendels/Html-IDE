---
okf_version: "0.1"
type: Skill
title: Local HTML IDE Code Updater
description: Modify, edit, or refactor HTML, CSS, and JavaScript code in the Local HTML IDE workspace using structured html-ide-patch v2 packets and offline library stem tags.
tags: [skill, html-tool, code-editor]
---

# local-html-ide

## Purpose

Use this skill to create or modify HTML, CSS, and JavaScript inside the active Local HTML IDE workspace.

For an existing application, use the structured `html-ide-patch` version `2.0` protocol. For a new application, return one complete HTML document.

## Available Offline Libraries

The IDE contains preloaded offline library assets. Add a library by placing its literal Stem Tag in the editable HTML source.

- **Alpine.js**: `<script id="lib-alpine-stem"></script>`
- **Pico.css**: `<link rel="stylesheet" id="lib-picocss-stem">`
- **JSZip**: `<script id="lib-jszip-stem"></script>`
- **docxtemplater**: `<script id="lib-docxtemplater-stem"></script>`
- **docx**: `<script id="lib-docx-stem"></script>`
- **Mammoth.js**: `<script id="lib-mammoth-stem"></script>`
- **SheetJS (xlsx)**: `<script id="lib-sheetjs-stem"></script>`
- **PptxGenJS**: `<script id="lib-pptxgen-stem"></script>`
- **PDF.js**: `<script id="lib-pdfjs-stem"></script>`

Never paste the complete minified library payload into an application update. Insert the Stem Tag. The compiler inlines the offline library during preview or download.

Do not use a CDN URL when an equivalent offline Stem exists.

## Create Mode

For a new application, prefer exactly one raw, complete HTML document with no surrounding commentary.

The IDE also accepts exactly one complete `html` Markdown fence.

Do not return:

- prose before or after the document;
- multiple Markdown fences;
- unmatched fences;
- partial HTML fragments;
- a non-HTML fenced block;
- a bundled minified library when an offline Stem exists.

A complete application should include the necessary document structure, styling, interface, event listeners, and runtime behavior.

## Optional External Application Runtime Conventions

Some applications independently use an external LLM runtime. Those applications may use conventions such as:

```html
<script id="app-skill" type="text/markdown">
...
<\/script>
```

or:

```html
<script id="app-runtime-contract" type="application/json">
...
<\/script>
```

These are optional application-level conventions.

They are:

- not required by the Local HTML IDE;
- not part of `html-ide-patch` version `2.0`;
- not required or interpreted for ordinary IDE compilation;
- added only when the application's external runtime contract requires them.

Do not confuse these optional application-runtime blocks with the Local HTML IDE coding skill or a StickShift Tool Skill.

## Tool Descriptor and Optional Tool Skill

A standalone application may contain neither integration block.

A registered StickShift tool contains one Tool Descriptor and may contain one optional Tool Skill.

The Tool Descriptor is structured metadata, not a skill. It may use `"skill": null`.

Add a Tool Skill only when the registered tool requires LLM-specific operating instructions, interpretation rules, structured workflows, packet contracts, or multi-step agent behavior. Ordinary timers, calculators, dashboards, forms, and games generally do not require one.

The editable application source may contain named regions:

```html
<!-- HTML_IDE_REGION:tool-descriptor:start -->
...
<!-- HTML_IDE_REGION:tool-descriptor:end -->
```

and:

```html
<!-- HTML_IDE_REGION:tool-skill:start -->
...
<!-- HTML_IDE_REGION:tool-skill:end -->
```

Use `replace_region` for whole-region changes.

A Tool Descriptor uses:

- `schema: "stickshift-tool"`;
- `version: "1.0"`;
- `open.protocol: "HTML_OPEN"`;
- either `skill: null` or `{ "elementId": "tool-skill", "slug": "{{SKILL_SLUG}}" }`.

An optional Tool Skill uses a source-resident block placed before `</body>`:

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

`{{TOOL_TITLE}}`, `{{TOOL_FILE}}`, and `{{SKILL_SLUG}}` are substituted during export.

The distinctions are:

- `skills/local-html-ide.md` is the immutable IDE coding skill used to operate the editor;
- `tool-skill` is an optional StickShift companion installed with a registered tool;
- `app-skill` and `app-runtime-contract` are optional external application-runtime conventions.

These may coexist when the application architecture requires them.

## Editing an Existing Application

For edits to an existing application, return one structured JSON `html-ide-patch` version `2.0` packet.

The user pastes the packet into the AI Update Drawer.

Include:

- the exact current `target.sourceHash`;
- unique patch IDs;
- explicit `expectedMatches`;
- exact source search text;
- only supported operations.

Supported operations are:

- `replace`;
- `insert_before`;
- `insert_after`;
- `delete`;
- `replace_region`.

Named-region operations use:

```html
<!-- HTML_IDE_REGION:name:start -->
...
<!-- HTML_IDE_REGION:name:end -->
```

The IDE uses exact matching only.

Treat the packet as one atomic transaction. One malformed, ambiguous, zero-match, stale-hash, invalid-region, or overlapping patch rejects the complete packet.

A rejected packet does not change the canonical source.

## Structured AI Update Packet Format

```json
{
  "protocol": "html-ide-patch",
  "version": "2.0",
  "target": {
    "sourceHash": "sha256:..."
  },
  "patches": [
    {
      "id": "change-button-label",
      "operation": "replace",
      "matching": {
        "strategy": "exact",
        "expectedMatches": 1,
        "search": "<button>Save</button>"
      },
      "replacement": "<button>Export</button>"
    }
  ]
}
```

## Rules for Generating Packets

### 1. Exact Matches Only

In version `2.0`, `matching.strategy` must be `exact`.

Do not request:

- fuzzy matching;
- regex matching;
- semantic matching;
- indentation matching;
- whitespace-normalized matching.

### 2. Use the Current Source Hash

Use the exact `target.sourceHash` supplied by the IDE or user.

A rejected atomic packet does not change the source. The current source hash remains valid until a patch is accepted or the canonical source changes through another action.

Request a new source hash after:

- an accepted patch;
- a manual source edit;
- an import;
- a reset;
- another action that changes the canonical source.

Do not request a new hash solely because a packet was rejected.

### 3. Ask for the Exact Failure Message

When a packet fails, ask the user to copy and paste the exact IDE failure message.

Do not guess the failure category from memory.

Use the reported message to identify:

- expected match count mismatch;
- zero matches;
- malformed JSON;
- overlapping ranges;
- stale source hash;
- invalid named region;
- unsupported operation;
- another preflight error.

Then re-read the affected current source and revise the packet.

Reuse the same source hash when the source did not change.

### 4. Verify Every Match Count

Before emitting a packet:

1. Inspect the current source.
2. Copy every `matching.search` string exactly.
3. Count its exact occurrences.
4. Set `expectedMatches` to the verified count.

Rules:

- If the search appears zero times, do not emit the packet.
- If it appears once and one change is intended, use `expectedMatches: 1`.
- If it appears multiple times and every occurrence should change identically, use the actual count.
- If it appears multiple times but only one should change, add stable surrounding context until the search is unique.

### 5. Avoid Ambiguous Isolated Lines

Do not patch common single lines in isolation.

Avoid search strings consisting only of:

- common loop headers;
- reset statements;
- button disabled assignments;
- generic logging lines;
- repeated state assignments;
- common closing braces;
- short declarations that occur in multiple functions.

Use a unique local mini-block with function-specific context.

Useful context includes:

- nearby status text;
- local variable declarations;
- adjacent input or file reset lines;
- surrounding control flow;
- a unique function name;
- a unique configuration key.

### 6. Choose Stable Search Blocks

A good exact search block is:

- copied exactly from current source;
- large enough to be unique;
- small enough to avoid unrelated drift;
- anchored by stable semantic context;
- free of unnecessary escaping risk.

Do not rely on remembered source text or guessed indentation.

### 7. Prefer Named Regions for Whole Blocks

When a complete block already uses `HTML_IDE_REGION` markers, use `replace_region`.

Do not replace a complete named region through a broad exact-text search when `replace_region` is available.

### 8. Reduce Regex and Escaping Risk

Large JSON search strings containing JavaScript regex literals, many backslashes, nested quotes, replacement strings, or template literals are fragile.

Prefer:

- a simple insertion anchor such as a unique function declaration;
- a nearby data or configuration change;
- the smallest exact source segment that achieves the edit;
- a named region;
- a small call-site modification.

If a regex-heavy search returns zero matches, do not guess new backslash counts. Re-read the source and change strategy.

### 9. Prefer Data and Configuration Changes

Before replacing a complex parser, validator, or classifier function, determine whether the result can be achieved through:

- data;
- aliases;
- constants;
- category order;
- lookup tables;
- configuration;
- a small condition;
- a small call-site change.

Prefer the lower-risk change when it preserves the intended architecture.

### 10. Reuse Canonical Runtime State

Do not duplicate parser or validation logic solely for diagnostics.

When a canonical parse result, token list, match list, or validation result already exists, reuse it.

Diagnostics should derive from canonical runtime state rather than a second implementation that can diverge.

### 11. Avoid Large Function Replacements

Replacing an entire function is high risk when it contains:

- regex literals;
- generated strings;
- template literals;
- many escaped characters;
- prior edits;
- nested control flow.

Use a smaller safe edit when possible.

When a complete function replacement is necessary, copy the exact current function text and verify its occurrence count before emitting the packet.

### 12. Prevent Overlapping Patches

Do not include patches whose target ranges overlap or conflict.

Do not insert before or after a function while also replacing that same function in the same packet.

Resolve overlap by:

- combining the changes into one deliberate replacement; or
- splitting the work into separate packets.

### 13. Preserve Atomicity

One bad patch rejects the whole packet.

Keep optional logging, diagnostics, formatting, and refactors separate from the core functional fix when their matching risk differs.

Do not bundle unrelated fragile changes.

### 14. Split Risky Work

Use separate packets when:

- a change touches regex-heavy parser code;
- a change is optional diagnostics or logging;
- a change uses broad or uncertain context;
- a later change depends on an earlier accepted change;
- combining the changes creates overlapping ranges.

After the first packet is accepted, use the new source hash for the dependent packet.

### 15. Recover Deliberately After Failure

For `Expected 1, found N`:

- use `expectedMatches: N` only when every occurrence should change;
- otherwise add context to isolate the intended occurrence.

For `Expected 1, found 0`:

- do not guess escaping;
- re-read the current source;
- use a simpler exact anchor;
- reduce the search block;
- use a named region;
- select a lower-risk data or configuration edit.

For malformed JSON:

- validate the JSON object;
- reduce backslash-heavy content;
- verify quotes and newlines;
- avoid large regex-heavy strings.

For overlapping ranges:

- combine the conflicting changes into one replacement; or
- split them into separate packets.

For a stale hash:

- request the current source hash;
- re-read the current source before rebuilding the packet.

### 16. Library Safety

Insert Stem Tags for offline libraries.

Never paste complete bundled library payloads.

### 17. JSON-Only Contract

For a normal existing-application edit, return one complete JSON packet and no prose.

One `json` Markdown fence is acceptable when required by the surrounding chat interface.

Do not include:

- `SEARCH:` / `REPLACE:` blocks;
- explanations before or after the packet;
- multiple alternative packets;
- legacy patch formats.

## Patch Reliability Checklist

Before emitting a packet, verify all of the following.

### Hash

- The packet uses the current source hash.
- The source has not changed since the hash was supplied.
- A new hash was not requested merely because a packet was rejected.

### Failure Recovery

- When revising a rejected packet, the exact IDE failure message was obtained.
- The failure category was identified from that message.
- The current affected source was re-read.

### JSON Validity

- The output is one valid JSON object.
- All strings are valid JSON strings.
- Quotes, newlines, backslashes, and closing-script sequences are correctly escaped.

### Search Text

- Every search value is copied exactly from current source.
- No search relies on guessed whitespace.
- No search relies on remembered prior source.
- Regex-heavy text was avoided when a safer anchor exists.

### Match Counts

- Every search string was counted.
- Every `expectedMatches` value equals the actual count.
- A repeated search is intended to modify every matched occurrence.
- Otherwise, enough context was added to make it unique.

### Patch Scope

- The edit is the smallest safe change.
- Data or configuration changes were considered before algorithm replacement.
- Optional diagnostics are separated from core behavior when appropriate.

### No Overlap

- No two patch ranges overlap.
- No insertion targets a block that another patch replaces.
- Dependent changes are split across accepted packets when necessary.

### Runtime Consistency

- Existing canonical parser or validation output is reused.
- No duplicate diagnostic parser was introduced.

### Atomicity

- Every patch has a verified exact match.
- One risky patch cannot unnecessarily reject unrelated safe work.

## How to Open the Tool

A local HTML tool cannot be opened from a normal chat hyperlink.

Give the operator this block verbatim:

<HTML_OPEN>
tool: local-ide.html
include:
- skills/local-html-ide.md
</HTML_OPEN>

Then give exactly this instruction line:

Copy the block above and click Open HTML Tool in StickShift.
