---
okf_version: "0.1"
type: Skill
title: {{TOOL_TITLE}}
description: Operate the {{TOOL_TITLE}} standalone application.
tags: [skill, html-tool]
---

# {{TOOL_TITLE}}

## Purpose
Describe what the finished application helps a person or agent accomplish.

## Capabilities
- Describe the application's primary capabilities.

## Inputs and outputs
- Inputs: describe user entries, files, or runtime data.
- Outputs: describe visible results and downloaded files.

## Workflow
1. Open the application.
2. Provide the required inputs.
3. Run the primary action and review the output.

## Constraints and file handling
Document offline constraints, accepted file types, storage behavior, and important limits.

## Agent interaction and runtime contracts
Document application-specific controls or machine-readable runtime contracts. This skill operates the finished application; it does not instruct an agent to patch IDE source.

## Open the completed tool
<HTML_OPEN>
tool: {{TOOL_FILE}}
include:
- skills/{{SKILL_SLUG}}.md
</HTML_OPEN>
