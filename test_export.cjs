const fs = require('fs');
const src = fs.readFileSync('local-ide.src.html', 'utf8');
const begin = src.indexOf('    // Source-resident Tool Descriptor');
const end = src.indexOf('    // Sync Library Indicators', begin);
const vault = {'lib-pdfjs': {textContent:'pdf-main'}, 'lib-pdfjs-worker': {textContent:'pdf-worker'}, 'lib-jszip': {textContent:'zip'}};
const api = new Function('document', src.slice(begin, end) + '; return {compileAppSource, unpackInlinedLibraries, validateToolIntegration, packLibraries, escapeInlineScriptBreakouts, findNamedRegion, replaceNamedRegion, normalizePdfJsWorkerOwnership};')({getElementById:id=>vault[id]||null});
let failures=0; function check(name,value){console.log((value?'PASS ':'FAIL ')+name);if(!value)failures++;}
const descriptor = `<!-- HTML_IDE_REGION:tool-descriptor:start -->\n<script id="tool-descriptor" type="application/json">{"schema":"stickshift-tool","version":"1.0","file":"{{TOOL_FILE}}","skillSlug":"{{SKILL_SLUG}}","title":"{{TOOL_TITLE}}","description":"Open a useful local demo tool.","open":{"protocol":"HTML_OPEN","tool":"{{TOOL_FILE}}"},"skill":null}</script>\n<!-- HTML_IDE_REGION:tool-descriptor:end -->`;
const standalone = '<html><body><p>standalone</p></body></html>';
check('standalone compilation remains plain', !api.compileAppSource(standalone,{fileName:'plain.html',embedStickShift:true}).html.includes('STICKSHIFT_TOOL'));
check('descriptor-only source validates', api.validateToolIntegration('<html><body>'+descriptor+'</body></html>',false).ok);
const registration=api.compileAppSource('<html><body>'+descriptor+'</body></html>',{fileName:'demo.html',embedStickShift:true}).html;
check('descriptor-only emits const legacy identity', registration.includes('const STICKSHIFT_TOOL = { file: "demo.html", skillSlug: "demo", title: "Demo" }'));
check('descriptor-only emits registration skill', registration.includes('id="stickshift-skill"')&&registration.includes('data-skill-kind="registration"')&&registration.includes('tool: demo.html'));
check('legacy panel copies generated skill with file fallback', registration.includes("getElementById('stickshift-skill').textContent")&&registration.includes("execCommand('copy')")&&registration.includes('Are you using StickShift?'));
const authoredDescriptor=descriptor.replace('"skill":null','"skill":{"elementId":"tool-skill","slug":"{{SKILL_SLUG}}"}');
const authored=authoredDescriptor+'<!-- HTML_IDE_REGION:tool-skill:start --><script id="tool-skill" type="text/markdown">---\nname: old\n---\nWorkflow instructions.</script><!-- HTML_IDE_REGION:tool-skill:end -->';
const authoredCompiled=api.compileAppSource('<html><body>'+authored+'</body></html>',{fileName:'workflow.html',embedStickShift:true}).html;
check('authored Tool Skill compiles to legacy id only', authoredCompiled.includes('id="stickshift-skill"')&&!authoredCompiled.includes('id="tool-skill"')&&authoredCompiled.includes('data-skill-kind="authored"'));
check('authored skill frontmatter normalized', authoredCompiled.includes('slug: workflow')&&authoredCompiled.includes('title: Workflow'));
const quoted='<html><body><script type="text/markdown">Example <script id="lib-jszip-stem"></script></script><script id="lib-jszip-stem"></script></body></html>';
const packed=api.packLibraries(quoted); check('data blocks mask quoted stems', (packed.match(/injected-lib-jszip/g)||[]).length===1);
const scoped='<html><body><p>{{TOOL_FILE}} {{TOOL_TITLE}} {{SKILL_SLUG}}</p>'+descriptor+'</body></html>';
check('placeholder resolution is scoped', api.compileAppSource(scoped,{fileName:'scoped.html'}).html.includes('<p>{{TOOL_FILE}} {{TOOL_TITLE}} {{SKILL_SLUG}}</p>'));
const fakeBody='<html><body><script>const t=`</body>`;</script></body></html>';
check('region insertion anchors after script template', api.replaceNamedRegion(fakeBody,'tool-descriptor',descriptor).indexOf('tool-descriptor')>fakeBody.indexOf('</script>'));
check('inline script breakout escaping is active', api.escapeInlineScriptBreakouts('<script>const x="</script>";</script>').includes('<\\/script>'));
// Compatibility ABI round-trip keeps registration tools descriptor-only and restores authored workflow source.
const apiImport = new Function('document', src.slice(begin, end) + '; return {compileAppSource, unpackInlinedLibraries, toolSkillBlocks, parseToolDescriptor};')({getElementById:id=>vault[id]||null});
const importedRegistration = apiImport.unpackInlinedLibraries(registration);
check('registration ABI import restores descriptor-only source', apiImport.parseToolDescriptor(importedRegistration).descriptor.skill === null && apiImport.toolSkillBlocks(importedRegistration).length === 0);
const importedAuthored = apiImport.unpackInlinedLibraries(authoredCompiled);
check('authored ABI import restores one Tool Skill', apiImport.toolSkillBlocks(importedAuthored).length === 1 && apiImport.parseToolDescriptor(importedAuthored).descriptor.skill.elementId === 'tool-skill');

const dataStemOnly = '<html><body><script type="text/markdown">Example <script id="lib-pdfjs-stem"></script></script></body></html>';
check('markdown-only PDF.js example does not request a PDF.js triplet', !api.compileAppSource(dataStemOnly,{fileName:'plain.html'}).html.includes('injected-lib-pdfjs'));
let unknownError=''; try { api.compileAppSource('<html><body><script id="lib-sheets-stem"></script></body></html>',{fileName:'bad.html'}); } catch (error) { unknownError=String(error.message); }
check('unknown active library stem reports its exact ID', unknownError.includes('lib-sheets-stem'));

const ownedPdf = '<html><body><script id="lib-pdfjs-stem"></script><script>pdfjsLib.GlobalWorkerOptions.workerSrc = "";</script></body></html>';
check('empty authored PDF worker assignment is removed from compiled copy', !api.compileAppSource(ownedPdf,{fileName:'pdf.html'}).html.includes('workerSrc = ""'));
let ownershipError=''; try { api.compileAppSource('<html><body><script id="lib-pdfjs-stem"></script><script>pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.js";</script></body></html>',{fileName:'pdf.html'}); } catch (error) { ownershipError=String(error.message); }
check('custom PDF worker assignment fails with ownership error', ownershipError.includes('PDF.js worker configuration is compiler-owned'));
if (failures) process.exit(1);
