---
okf_version: "0.1"
type: Skill
title: Local HTML IDE Operator
description: Build and safely patch standalone HTML applications and their companion Built App Skills.
tags: [skill, html-tool, code-editor]
---

# Local HTML IDE Skill

The Local HTML IDE is a file://-compatible workspace for creating, previewing, patching, and downloading standalone HTML applications. This read-only IDE Skill teaches an LLM how to operate the workspace. It is never substituted for the separate Built App Skill embedded in a downloaded application.

## Two editable build surfaces

- `html`: the HTML/CSS/JavaScript document.
- `appSkill`: the Built App Skill Markdown describing how to operate the finished application.

**Copy Patch Context** provides the exact SHA-256 hash and current source for both surfaces, plus the registry-derived offline-library stems. Hashes cover the exact editable strings. Return only JSON.

## html-ide-patch 2.1

Prefer one atomic v2.1 transaction. Every patch requires a unique id, `surface`, exact matching, and `expectedMatches`. Every referenced surface requires a matching hash in `targets`. A stale hash, ambiguous or missing match, invalid region, overlap, or schema error rejects the entire transaction before either surface changes.

Supported operations: `replace`, `insert_before`, `insert_after`, `delete`, and `replace_region`. Named regions use `<!-- HTML_IDE_REGION:name:start -->` and `<!-- HTML_IDE_REGION:name:end -->` markers and are validated independently within their surface.

```json
{
  "protocol": "html-ide-patch",
  "version": "2.1",
  "targets": {
    "html": {
      "sourceHash": "sha256:..."
    },
    "appSkill": {
      "sourceHash": "sha256:..."
    }
  },
  "patches": [
    {
      "id": "update-heading",
      "surface": "html",
      "operation": "replace",
      "matching": {
        "strategy": "exact",
        "expectedMatches": 1,
        "search": "<h1>Old heading</h1>"
      },
      "replacement": "<h1>New heading</h1>"
    },
    {
      "id": "update-app-skill-purpose",
      "surface": "appSkill",
      "operation": "replace",
      "matching": {
        "strategy": "exact",
        "expectedMatches": 1,
        "search": "## Purpose\nOld purpose"
      },
      "replacement": "## Purpose\nNew purpose"
    }
  ]
}
```

Version 2.0 remains accepted as HTML-only compatibility through `target.sourceHash`; patches implicitly target `html`. Legacy SEARCH:/REPLACE: is also HTML-only, unhashed, and lower safety.

## Create and edit modes

For a new application, return a complete HTML document for the `html` surface and separately author an application-focused `appSkill`. In edit mode, use exact excerpts from Copy Patch Context and preserve unrelated content. One confirmation commits all prospective surface outputs and one undo restores the combined transaction.

The Built App Skill should explain the finished app's purpose, inputs, outputs, workflows, constraints, files, runtime contracts, and opening instructions. Do not put IDE patch instructions in it.

## Offline libraries

<!-- OFFLINE_LIBRARY_STEMS_START -->
{{OFFLINE_LIBRARY_STEMS}}
<!-- OFFLINE_LIBRARY_STEMS_END -->

Insert stem tags only; never paste full minified payloads or use a CDN when a catalog stem exists. The compiler expands only stems present in `html`.

Literal examples such as `${runtimeValue}`, quotes, Unicode ✓, HTML, JSON, and fenced code remain raw Markdown. Copy IDE Skill copies this canonical text exactly.
