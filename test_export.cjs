const fs = require('fs');
const src = fs.readFileSync('local-ide.src.html', 'utf8');
const begin = src.indexOf('    // Accept exactly one fenced');
const end = src.indexOf('    // Sync Library Indicators', begin);
const vault = {'lib-pdfjs': {textContent:'pdf-main'}, 'lib-pdfjs-worker': {textContent:'pdf-worker'}, 'lib-jszip': {textContent:'zip'}, 'lib-picocss': {textContent:'pico-css'}, 'lib-sheetjs': {textContent:'sheet-js'}};
function apiFor(v) { return new Function('document', src.slice(begin, end) + '; return {compileAppSource, unpackInlinedLibraries, validateToolIntegration, packLibraries, escapeInlineScriptBreakouts, findNamedRegion, replaceNamedRegion, normalizePdfJsWorkerOwnership, unwrapFencedHtmlDocument, normalizeToolSkillScriptBreakouts};')({getElementById:id=>v[id]||null}); }
const api = apiFor(vault);
let failures=0; function check(name,value){console.log((value?'PASS ':'FAIL ')+name);if(!value)failures++;}
const descriptor = `<!-- HTML_IDE_REGION:tool-descriptor:start -->\n<script id="tool-descriptor" type="application/json">{"schema":"stickshift-tool","version":"1.0","file":"{{TOOL_FILE}}","skillSlug":"{{SKILL_SLUG}}","title":"{{TOOL_TITLE}}","description":"Open a useful local demo tool.","open":{"protocol":"HTML_OPEN","tool":"{{TOOL_FILE}}"},"skill":null}</script>\n<!-- HTML_IDE_REGION:tool-descriptor:end -->`;
const standalone = '<html><body><p>standalone</p></body></html>';
check('standalone compilation remains plain', !api.compileAppSource(standalone,{fileName:'plain.html',embedStickShift:true}).html.includes('STICKSHIFT_TOOL'));
const fenced='```html\n<!DOCTYPE html>\n<html><body>fenced</body></html>\n```';
check('whole fenced HTML document unwraps', api.unwrapFencedHtmlDocument(fenced)==='<!DOCTYPE html>\n<html><body>fenced</body></html>');
check('fenced partial HTML remains unchanged', api.unwrapFencedHtmlDocument('```html\n<div>partial</div>\n```').startsWith('```html'));
check('fenced JSON remains unchanged', api.unwrapFencedHtmlDocument('```json\n{}\n```').startsWith('```json'));
check('fence commentary remains unchanged', api.unwrapFencedHtmlDocument('note\n'+fenced) === 'note\n'+fenced);
check('CRLF fenced document unwraps', api.unwrapFencedHtmlDocument('```htm\r\n<html></html>\r\n```') === '<html></html>');
const rawSkill='<!-- HTML_IDE_REGION:tool-skill:start -->\n<script id="tool-skill" type="text/markdown">Explain why </script> terminates an HTML script element.</script>\n<!-- HTML_IDE_REGION:tool-skill:end -->';
const normalizedSkill=api.normalizeToolSkillScriptBreakouts(rawSkill);
check('marked Tool Skill raw close normalizes', normalizedSkill.html.includes('Explain why <\\/script>') && normalizedSkill.normalized);
check('Tool Skill normalization is idempotent', api.normalizeToolSkillScriptBreakouts(normalizedSkill.html).html===normalizedSkill.html);
let malformedSkill=''; try { api.normalizeToolSkillScriptBreakouts('<!-- HTML_IDE_REGION:tool-skill:start --><script id="tool-skill" type="text/markdown">x<!-- HTML_IDE_REGION:tool-skill:end -->'); } catch (error) { malformedSkill=String(error.message); }
check('malformed Tool Skill region fails', /Malformed tool-skill/.test(malformedSkill));
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
const apiImport = new Function('document', src.slice(begin, end) + '; return {compileAppSource, unpackInlinedLibraries, toolSkillBlocks, parseToolDescriptor, unwrapFencedHtmlDocument, normalizeToolSkillScriptBreakouts};')({getElementById:id=>vault[id]||null});
const importedRegistration = apiImport.unpackInlinedLibraries(registration);
check('registration ABI import restores descriptor-only source', apiImport.parseToolDescriptor(importedRegistration).descriptor.skill === null && apiImport.toolSkillBlocks(importedRegistration).length === 0);
const importedAuthored = apiImport.unpackInlinedLibraries(authoredCompiled);
const importedRegistrationAgain=apiImport.unpackInlinedLibraries(apiImport.compileAppSource(importedRegistration,{fileName:'demo.html',embedStickShift:true}).html);
check('descriptor-only import is stable after canonicalization', importedRegistrationAgain===importedRegistration);
const importedAuthoredAgain=apiImport.unpackInlinedLibraries(apiImport.compileAppSource(importedAuthored,{fileName:'workflow.html',embedStickShift:true}).html);
check('authored Tool Skill import is stable after canonicalization', importedAuthoredAgain===importedAuthored);
const rawSkillSource='<html><body>'+authoredDescriptor+'\n'+rawSkill+'</body></html>';
const rawSkillCompiled=api.compileAppSource(rawSkillSource,{fileName:'skill.html'});
check('raw Tool Skill example compiles without editing source', rawSkillCompiled.html.includes('Explain why <\\/script>') && rawSkillSource.includes('Explain why </script>') && rawSkillCompiled.validation.warnings.length===1);
check('authored ABI import restores one Tool Skill', apiImport.toolSkillBlocks(importedAuthored).length === 1 && apiImport.parseToolDescriptor(importedAuthored).descriptor.skill.elementId === 'tool-skill');

const dataStemOnly = '<html><body><script type="text/markdown">Example <script id="lib-pdfjs-stem"></script></script></body></html>';
check('markdown-only PDF.js example does not request a PDF.js triplet', !api.compileAppSource(dataStemOnly,{fileName:'plain.html'}).html.includes('injected-lib-pdfjs'));
let unknownError=''; try { api.compileAppSource('<html><body><script id="lib-sheets-stem"></script></body></html>',{fileName:'bad.html'}); } catch (error) { unknownError=String(error.message); }
check('unknown active library stem reports its exact ID', unknownError.includes('lib-sheets-stem'));
const fixture=fs.readFileSync('failing-code/Parser-tool.html','utf8');
function count(text, needle) { return text.split(needle).length-1; }
function extractVaultPayload(html,id) { const match=html.match(new RegExp(`<(?:(script|style))\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>([\\s\\S]*?)<\\/\\1>`,'i')); if(!match)throw new Error('Missing generated vault payload: '+id); return match[2]; }
const built=fs.readFileSync('local-ide.html','utf8');
const realVault={}; for(const id of ['lib-picocss','lib-pdfjs','lib-pdfjs-worker','lib-sheetjs'])realVault[id]={textContent:extractVaultPayload(built,id)};
const realApi=apiFor(realVault), fixtureCompiled=realApi.compileAppSource(fixture,{fileName:'Parser-tool.html'}).html;
check('parser fixture uses the real generated Pico/PDF.js/SheetJS vault payloads', realVault['lib-sheetjs'].textContent.length>100000&&realVault['lib-pdfjs'].textContent.length>100000&&realVault['lib-pdfjs-worker'].textContent.length>100000);
check('parser fixture packs Pico.css exactly once', count(fixtureCompiled,'id="injected-lib-picocss"')===1);
check('parser fixture packs PDF.js main, worker, and setup exactly once', count(fixtureCompiled,'id="injected-lib-pdfjs"')===1&&count(fixtureCompiled,'id="injected-lib-pdfjs-worker"')===1&&count(fixtureCompiled,'id="injected-lib-pdfjs-setup"')===1);
check('parser fixture packs SheetJS exactly once and leaves no active stems', count(fixtureCompiled,'id="injected-lib-sheetjs"')===1&&!/id=["']lib-(?:picocss|pdfjs|sheetjs)-stem["']/i.test(fixtureCompiled));
check('parser fixture keeps complete executable parser behavior', fixtureCompiled.includes('pdfjsLib.getDocument')&&fixtureCompiled.includes('XLSX.utils.book_new')&&fixtureCompiled.includes('els.parseBtn.addEventListener("click", parseSelectedFiles)'));
const renderedText=fixtureCompiled.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
check('parser fixture does not leak executable source into document text', !renderedText.includes('pdfjsLib.getDocument')&&!renderedText.includes('XLSX.utils.book_new'));
check('empty authored PDF worker assignment is removed only from compiled output', !fixtureCompiled.includes('workerSrc = ""') && fixture.includes('workerSrc = ""'));
check('parser fixture retains compiler-owned Blob PDF worker setup', fixtureCompiled.includes('new Blob')&&fixtureCompiled.includes('URL.createObjectURL')&&fixtureCompiled.includes('injected-lib-pdfjs-setup'));
const hostilePayload=['const token1 = "$&";','const token2 = "$1";','const token3 = "$2";','const token4 = "$`";',"const token5 = \"$'\";",'const token6 = "$$";'].join('\n');
const hostileVault={...vault,'lib-sheetjs':{textContent:hostilePayload},'lib-picocss':{textContent:'/* $& $1 $2 $` $\' $$ */'}};
const hostileApi=apiFor(hostileVault), hostileCompiled=hostileApi.compileAppSource('<link rel="stylesheet" id="lib-picocss-stem"><script id="lib-sheetjs-stem"></script>',{fileName:'hostile.html'}).html;
check('hostile replacement payload is literal for JS and CSS stems', hostileCompiled.includes(hostilePayload)&&hostileCompiled.includes('/* $& $1 $2 $` $\' $$ */'));
check('hostile replacement payload creates one wrapper and no active SheetJS stem', count(hostileCompiled,'id="injected-lib-sheetjs"')===1&&!/id=["']lib-sheetjs-stem["']/i.test(hostileCompiled));
let workerError=''; try { api.compileAppSource('<script id="lib-pdfjs-stem"></script><script>pdfjsLib.GlobalWorkerOptions.workerSrc = "worker.js";</script>',{fileName:'bad.html'}); } catch(error) { workerError=String(error.message); }
check('non-empty authored PDF worker assignment is rejected', workerError.includes('PDF.js worker configuration is compiler-owned.'));
let vaultError=''; try { api.packLibraries('<script id="lib-docx-stem"></script>'); } catch(error) { vaultError=String(error.message); }
check('missing vault entry gives a packing diagnostic', vaultError.includes('Offline library vault is missing entry'));

if (failures) process.exit(1);
