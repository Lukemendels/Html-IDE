const assert = require('assert');
const fs = require('fs');

const skillPath = 'skills/local-html-ide.md';

assert(fs.existsSync(skillPath), 'canonical skill exists');
assert(!fs.existsSync('Updated_IDE_Skill.md'), 'obsolete root skill is absent');

const text = fs.readFileSync(skillPath, 'utf8');

const required = [
  'description: Modify, edit, or refactor HTML, CSS, and JavaScript code',
  'html-ide-patch` version `2.0',
  '<script id="lib-sheetjs-stem"></script>',
  'exactly one complete `html` Markdown fence',
  'Optional External Application Runtime Conventions',
  'Tool Descriptor and Optional Tool Skill',
  'HTML_IDE_REGION:tool-descriptor:start',
  'HTML_IDE_REGION:tool-skill:start',
  'Use `replace_region` for whole-region changes.',
  'Structured AI Update Packet Format',
  '"expectedMatches": 1',
  '### 1. Exact Matches Only',
  '### 2. Use the Current Source Hash',
  '### 3. Ask for the Exact Failure Message',
  '### 4. Verify Every Match Count',
  '### 8. Reduce Regex and Escaping Risk',
  '### 10. Reuse Canonical Runtime State',
  '### 12. Prevent Overlapping Patches',
  '### 14. Split Risky Work',
  '### 15. Recover Deliberately After Failure',
  '### 17. JSON-Only Contract',
  'A rejected atomic packet does not change the source.',
  'Reuse the same source hash when the source did not change.',
  '## Patch Reliability Checklist',
  '### JSON Validity', '### Search Text', '### Match Counts', '### Patch Scope',
  '### No Overlap', '### Runtime Consistency', '<HTML_OPEN>',
  '- skills/local-html-ide.md', 'Copy the block above and click Open HTML Tool in StickShift.'
];
for (const value of required) assert(text.includes(value), `missing canonical skill content: ${value}`);
for (const value of ['Apply exact matches only deliberately.','requires current-source verification.','Detailed operational note','preserves safe exact patch behavior.','&lt;script']) assert(!text.includes(value), `fabricated or invalid content is absent: ${value}`);
for (let rule = 1; rule <= 17; rule += 1) assert(text.includes(`### ${rule}.`), `packet-generation rule ${rule} exists`);
assert(!/\bSEARCH:\s*\/\s*REPLACE:/i.test(text), 'legacy SEARCH/REPLACE packet format is not authorized');
console.log('local HTML IDE skill contract passed');
