---
okf_version: "0.1"
type: Skill
title: Local HTML IDE Code Updater
description: Modify HTML, CSS, and JavaScript using structured html-ide-patch v2 packets and offline library stem tags.
tags: [skill, html-tool, code-editor]
---
# local-html-ide
## Purpose
For an existing application, use the structured `html-ide-patch` version `2.0` protocol. For a new application, return one complete HTML document.
## Available Offline Libraries
Use literal Stem Tags; never paste minified payloads or use a CDN where an offline Stem exists.
- Alpine.js: `<script id="lib-alpine-stem"></script>`
- Pico.css: `<link rel="stylesheet" id="lib-picocss-stem">`
- JSZip: `<script id="lib-jszip-stem"></script>`
- docxtemplater: `<script id="lib-docxtemplater-stem"></script>`
- docx: `<script id="lib-docx-stem"></script>`
- Mammoth.js: `<script id="lib-mammoth-stem"></script>`
- SheetJS: `<script id="lib-sheetjs-stem"></script>`
- PptxGenJS: `<script id="lib-pptxgen-stem"></script>`
- PDF.js: `<script id="lib-pdfjs-stem"></script>`
## Create Mode
For a new application, prefer exactly one raw, complete HTML document with no surrounding commentary. The IDE also accepts exactly one complete `html` Markdown fence. Do not include prose, multiple or unmatched fences, partial fragments, or non-HTML fenced content.
## Optional External Application Runtime Conventions
`app-skill` and `app-runtime-contract` are optional external application-level conventions. They are not required by the Local HTML IDE, are not part of `html-ide-patch` version `2.0`, and are added only when an application's external runtime contract requires them.
The distinctions are: `skills/local-html-ide.md` is the immutable IDE coding skill; `tool-skill` is an optional StickShift companion; `app-skill` and `app-runtime-contract` are optional application-runtime contracts.
## Editing an Existing Application
Return one JSON `html-ide-patch` version `2.0` packet. Use the exact `target.sourceHash`, unique IDs, exact `matching.search` text, and explicit `expectedMatches`. `matching.strategy` must be `exact`. Supported operations are `replace`, `insert_before`, `insert_after`, `delete`, and `replace_region`.
The packet is atomic. A rejected atomic packet does not change the canonical source. The source hash remains valid when source is unchanged.
Do not use legacy search-and-replace packets, fuzzy matching, regex matching, or prose around a normal packet.
## Failure Recovery
When a packet fails, ask the user to copy and paste the exact IDE failure message. Interpret expected match count mismatch, zero matches, malformed JSON, overlapping ranges, stale source hash, invalid region, or another reported preflight error. Re-read the affected current source and revise the packet using the same source hash when source did not change. Request a fresh hash only after an accepted patch, manual source edit, import, reset, or another action that changed canonical source.
## Reliability Rules
Count every exact search occurrence and set `expectedMatches` to that verified count. Avoid isolated common lines; use stable local context. Regex-heavy searches are risky: re-read source rather than guessing escapes. Avoid overlapping patches, separate risky changes, preserve atomicity, and return JSON-only output.
## How to Open the Tool
<HTML_OPEN>
tool: local-ide.html
include:
- skills/local-html-ide.md
</HTML_OPEN>
Copy the block above and click Open HTML Tool in StickShift.
