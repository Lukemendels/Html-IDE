const assert = require('assert');
const fs = require('fs');

const src = fs.readFileSync('local-ide.src.html', 'utf8');
const begin = src.indexOf('    // Source-resident Tool Descriptor');
const end = src.indexOf('    // Sync Library Indicators', begin);
assert(begin >= 0 && end > begin, 'compiler integration slice exists');
const vault = {};
const api = new Function('document', 'acorn', src.slice(begin, end) + '; return {compileAppSource};')({getElementById:id=>vault[id]||null}, require('acorn'));

function packageInfo(html) {
  const identity = html.match(/const\s+STICKSHIFT_TOOL\s*=\s*\{\s*file:\s*"([^"]+)",\s*skillSlug:\s*"([^"]+)",\s*title:\s*"([^"]+)"\s*\}/);
  const skill = html.match(/<script\b(?=[^>]*id="stickshift-skill")(?=[^>]*type="text\/markdown")(?=[^>]*data-skill-slug="([^"]+)")[^>]*>([\s\S]*?)<\/script>/i);
  return { identity, skillSlug: skill && skill[1], markdown: skill && skill[2] };
}

function assertInstallable(html, file, slug) {
  const info = packageInfo(html);
  assert(info.identity, 'identity exists');
  assert(info.markdown, 'install skill exists');
  assert.equal(info.identity[1], file, 'identity filename matches');
  assert.equal(info.identity[2], slug, 'identity slug matches');
  assert.equal(info.skillSlug, slug, 'data skill slug matches');
  assert(/^type:\s*Skill\s*$/mi.test(info.markdown), 'skill declares type: Skill');
  assert(/^title:\s*.+$/mi.test(info.markdown), 'skill has title');
  assert(/^description:\s*.+$/mi.test(info.markdown), 'skill has description');
  assert(/^tags:\s*\[[^\]]*html-tool[^\]]*\]\s*$/mi.test(info.markdown), 'skill tags include html-tool');
  assert(info.markdown.includes('tool: ' + file), 'HTML_OPEN references file');
  assert(info.markdown.includes('- skills/' + slug + '.md'), 'HTML_OPEN includes installed skill path');
}

const descriptor = `<!-- HTML_IDE_REGION:tool-descriptor:start -->
<script id="tool-descriptor" type="application/json">{"schema":"stickshift-tool","version":"1.0","file":"{{TOOL_FILE}}","skillSlug":"{{SKILL_SLUG}}","title":"{{TOOL_TITLE}}","description":"Run a local contract test tool.","open":{"protocol":"HTML_OPEN","tool":"{{TOOL_FILE}}"},"skill":null}</script>
<!-- HTML_IDE_REGION:tool-descriptor:end -->`;
const registration = api.compileAppSource('<html><body>'+descriptor+'</body></html>', {fileName:'contract-tool.html', embedStickShift:true}).html;
assertInstallable(registration, 'contract-tool.html', 'contract-tool');

const authoredDescriptor = descriptor.replace('"skill":null', '"skill":{"elementId":"tool-skill","slug":"{{SKILL_SLUG}}"}');
const authored = authoredDescriptor + `<!-- HTML_IDE_REGION:tool-skill:start -->
<script id="tool-skill" type="text/markdown">---
name: ignored-source-frontmatter
---
# Workflow

Use the tool for a structured local workflow.
<\/script>
<!-- HTML_IDE_REGION:tool-skill:end -->`;
const authoredPackage = api.compileAppSource('<html><body>'+authored+'</body></html>', {fileName:'workflow-tool.html', embedStickShift:true}).html;
assertInstallable(authoredPackage, 'workflow-tool.html', 'workflow-tool');
assert(authoredPackage.includes('# Workflow'), 'authored operating instructions are preserved');

const built = fs.readFileSync('local-ide.html', 'utf8');
assertInstallable(built, 'local-ide.html', 'local-html-ide');

console.log('StickShift install package contract passed');
