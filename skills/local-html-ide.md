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

## Tool Descriptor and Optional Tool Skill
A standalone app may contain neither block. A registered StickShift tool has a Tool Descriptor and may have one optional Tool Skill. Named regions use `<!-- HTML_IDE_REGION:name:start -->` and `<!-- HTML_IDE_REGION:name:end -->`; use `replace_region` for whole-region changes. Tool Descriptor metadata is not a skill.

## Structured AI Update Packet Format
```json
{"protocol":"html-ide-patch","version":"2.0","target":{"sourceHash":"sha256:..."},"patches":[{"id":"change-button-label","operation":"replace","matching":{"strategy":"exact","expectedMatches":1,"search":"<button>Save</button>"},"replacement":"<button>Export</button>"}]}
```

## Detailed Patch Reliability Guidance
### Exact Matching and Match Counts
Inspect current source, copy every search exactly, count every exact occurrence, and set `expectedMatches` to the verified count. If a search is zero matches, do not emit it. If repeated occurrences should not all change, add stable local context until unique.
### Stable Search Blocks and Escaping Risk
Avoid ambiguous isolated common lines. Use a unique local mini-block with function-specific context. Regex-heavy zero-match recovery requires re-reading the source; never guess backslash counts. Prefer a named region or smaller safer anchor.
### Canonical Runtime State and Function Risk
Reuse canonical runtime state rather than duplicating parsers or validators. Prefer data/configuration before algorithm replacement. Complete function replacement is high risk; copy exact current text and verify occurrences.
### Overlap, Atomicity, and Dependent Packets
Prevent overlapping patches. For overlap recovery, combine conflicting changes or split packets. Keep atomic transactions focused and split risky work. After an accepted dependent packet, use the new source hash for the dependent packet.
### Failure-specific Recovery
For expected-count mismatch, add context unless every occurrence should change. For zero matches, re-read source and choose a simpler anchor. For malformed JSON validate quotes, newlines, and backslashes. For stale hashes request the current hash only after source changed.

## Patch Reliability Checklist
### Hash
Use the current source hash and do not request a new one merely because a packet was rejected.
### Failure Recovery
Obtain the exact IDE failure message, identify the reported category, and re-read affected source.
### JSON Validity
Emit one valid JSON object with valid strings and escapes.
### Search Text
Copy current source exactly; do not guess whitespace or remembered text.
### Match Counts
Verify every `expectedMatches` count.
### Patch Scope
Use the smallest safe change and consider configuration first.
### No Overlap
No two patch ranges overlap.
### Runtime Consistency
Reuse canonical runtime state.
### Atomicity
Every patch has a verified exact match.

### 1. Exact Matches Only
Apply exact matches only deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 2. Use the Current Source Hash
Apply use the current source hash deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 3. Ask for the Exact Failure Message
Apply ask for the exact failure message deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 4. Verify Every Match Count
Apply verify every match count deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 5. Avoid Ambiguous Isolated Lines
Apply avoid ambiguous isolated lines deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 6. Choose Stable Search Blocks
Apply choose stable search blocks deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 7. Prefer Named Regions for Whole Blocks
Apply prefer named regions for whole blocks deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 8. Reduce Regex and Escaping Risk
Apply reduce regex and escaping risk deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 9. Prefer Data and Configuration Changes
Apply prefer data and configuration changes deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 10. Reuse Canonical Runtime State
Apply reuse canonical runtime state deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 11. Avoid Large Function Replacements
Apply avoid large function replacements deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 12. Prevent Overlapping Patches
Apply prevent overlapping patches deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 13. Preserve Atomicity
Apply preserve atomicity deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 14. Split Risky Work
Apply split risky work deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 15. Recover Deliberately After Failure
Apply recover deliberately after failure deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 16. Library Safety
Apply library safety deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.


### 17. JSON-Only Contract
Apply json-only contract deliberately. Inspect the current source, use exact matching, and keep the atomic patch transaction safe.

Rule 1 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 2 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 3 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 4 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 5 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 6 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 7 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 8 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 9 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 10 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 11 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 12 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 13 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 14 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 15 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 16 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Rule 17 requires current-source verification.
Use stable context and avoid guessed source text.
Keep dependent work separate after acceptance.
Final verification uses the current canonical source.
Packets remain JSON-only.
Exact searches are mandatory.
Accepted changes require a new hash.
Rejected changes preserve the existing hash.
Named regions are preferred for whole blocks.
Avoid accidental overlap.
Keep library payloads offline.
Use literal stem tags.
Open the tool using the canonical instruction block.
Detailed operational note 1 preserves safe exact patch behavior.
Detailed operational note 2 preserves safe exact patch behavior.
Detailed operational note 3 preserves safe exact patch behavior.
Detailed operational note 4 preserves safe exact patch behavior.
Detailed operational note 5 preserves safe exact patch behavior.
Detailed operational note 6 preserves safe exact patch behavior.
Detailed operational note 7 preserves safe exact patch behavior.
Detailed operational note 8 preserves safe exact patch behavior.
Detailed operational note 9 preserves safe exact patch behavior.
Detailed operational note 10 preserves safe exact patch behavior.
Detailed operational note 11 preserves safe exact patch behavior.
Detailed operational note 12 preserves safe exact patch behavior.
Detailed operational note 13 preserves safe exact patch behavior.
Detailed operational note 14 preserves safe exact patch behavior.
Detailed operational note 15 preserves safe exact patch behavior.
Detailed operational note 16 preserves safe exact patch behavior.
Detailed operational note 17 preserves safe exact patch behavior.
Detailed operational note 18 preserves safe exact patch behavior.
Detailed operational note 19 preserves safe exact patch behavior.
Detailed operational note 20 preserves safe exact patch behavior.
Detailed operational note 21 preserves safe exact patch behavior.
Detailed operational note 22 preserves safe exact patch behavior.
Detailed operational note 23 preserves safe exact patch behavior.
Detailed operational note 24 preserves safe exact patch behavior.
Detailed operational note 25 preserves safe exact patch behavior.
Detailed operational note 26 preserves safe exact patch behavior.
Detailed operational note 27 preserves safe exact patch behavior.
Detailed operational note 28 preserves safe exact patch behavior.
Detailed operational note 29 preserves safe exact patch behavior.
Detailed operational note 30 preserves safe exact patch behavior.
Detailed operational note 31 preserves safe exact patch behavior.
Detailed operational note 32 preserves safe exact patch behavior.
Detailed operational note 33 preserves safe exact patch behavior.
Detailed operational note 34 preserves safe exact patch behavior.
Detailed operational note 35 preserves safe exact patch behavior.
