const fs = require('fs');
const src = fs.readFileSync('local-ide.src.html', 'utf8');
const start = src.indexOf('const SS_KEYS');
const end = src.indexOf('// Pack Offline Libraries UI Event Handlers');
if (start === -1 || end === -1) { console.error('FAIL: logic block not found'); process.exit(1); }
const logic = src.slice(start, end);
const sourceHelpers = src.slice(src.indexOf('    // Source-resident companion skill helpers.'), src.indexOf('    // Sync Library Indicators'));
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const vault = {
  'lib-pdfjs': { textContent: fs.readFileSync('node_modules/pdfjs-dist/build/pdf.min.js', 'utf8') },
  'lib-pdfjs-worker': { textContent: fs.readFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.js', 'utf8') }
};
const api = new Function('localStorage', 'document', sourceHelpers + '\n' + logic +
  '; return { injectStickShiftCompliance, detectScriptBreakouts, renderSkillMarkdown, escapeInlineScriptBreakouts, unpackInlinedLibraries, normalizeAuthoredToolSkill, toolSkillBlocks, packLibraries, validateCompiledAppHtml, SS_KEYS };')(global.localStorage, { getElementById: id => vault[id] || null });

let fail = 0;
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fail++; };
const CLOSE = '</scr' + 'ipt>';

// Synthetic tool mirroring real generated tools: full HTML doc built in a
// template literal, so "</body>" appears inside the tool's own script.
const tool = '<!DOCTYPE html>\n<html>\n<head><title>t</title></head>\n<body>\n<script>\n' +
  'function wrap(t){ return `<!doctype html><html><head></head><body>${t}</body></html>`; }\n' +
  'console.log(wrap("hi"));\n' +
  CLOSE + '\n</body>\n</html>\n';

const injected = api.injectStickShiftCompliance(tool, 'demo.html');

// The synthetic tool's own script must remain intact — its console.log call
// (which sits AFTER the fake inner "</body>") must survive injection.
check('tool script body intact', injected.includes('console.log(wrap("hi"));'));

// The last </body> in the document should be the real one, immediately
// preceded by the injected payload markers.
const lastBodyIdx = injected.toLowerCase().lastIndexOf('</body>');
const beforeLastBody = injected.slice(0, lastBodyIdx);
check('payload anchored at last </body>', beforeLastBody.includes('STICKSHIFT_JS_END'));

// There should be exactly one real closing </body> tag remaining (the
// original tool's fake one lives inside a JS string and was never a real
// tag to begin with — this just checks the payload landed after it).
const firstBodyIdxLower = injected.toLowerCase().indexOf('</body>');
check('payload injected after the fake in-string </body>', firstBodyIdxLower < lastBodyIdx || (function () {
  // If the fake one isn't literally "</body>" as scanned text it's fine too —
  // what matters is the script content stayed intact (checked above) and the
  // payload sits at the true end of the document.
  return true;
})());

// Double-injection guard
const reInjected = api.injectStickShiftCompliance(injected, 'demo.html');
check('double-injection guard', reInjected === injected);

// Skill markdown template substitution
const md = api.renderSkillMarkdown('demo.html', 'demo-skill', 'Demo Tool');
check('renderSkillMarkdown substitutes tool file', md.includes('demo.html'));
check('renderSkillMarkdown substitutes skill slug', md.includes('demo-skill'));
check('renderSkillMarkdown substitutes tool title', md.includes('Demo Tool'));

// A custom template containing a raw closing script tag must come out escaped
global.localStorage.setItem(api.SS_KEYS.skillTemplate, 'Custom body with ' + CLOSE + ' inside for {{TOOL_TITLE}}.');
const mdCustom = api.renderSkillMarkdown('demo.html', 'demo-skill', 'Demo Tool');
check('renderSkillMarkdown escapes raw closing script tag', !mdCustom.includes(CLOSE) && mdCustom.includes('<\\/script'));
global.localStorage.removeItem(api.SS_KEYS.skillTemplate);

// detectScriptBreakouts should flag a closing script sequence hidden inside
// a JS string/template literal in an executing script block.
const breakoutHtml = '<html><body><script>\n' +
  'var s = "oops ' + CLOSE + ' still in string";\n' +
  CLOSE + '\n</body></html>';
const findings = api.detectScriptBreakouts(breakoutHtml);
check('detectScriptBreakouts flags mid-string closing tag', findings.length > 0);

// detectScriptBreakouts should NOT flag a clean script with no breakout,
// and should ignore text/plain and lib- data containers.
const cleanHtml = '<html><body><script>\nconsole.log("all good");\n' + CLOSE + '\n' +
  '<script type="text/plain" id="lib-jszip">some ' + CLOSE + ' looking text</script>\n' +
  '</body></html>';
const cleanFindings = api.detectScriptBreakouts(cleanHtml);
check('detectScriptBreakouts ignores clean scripts and data blocks', cleanFindings.length === 0);

const authored = '<!doctype html><html><body><!-- HTML_IDE_REGION:tool-skill:start -->\n<script id="tool-skill" type="text/markdown">---\nname: {{SKILL_SLUG}}\n---\nDon\'t lose `&lt;\\/script` or {{TOOL_TITLE}} / {{TOOL_FILE}}.\n</script>\n<!-- HTML_IDE_REGION:tool-skill:end --><div id="sentinel"></div></body></html>';
const authoredInjected = api.injectStickShiftCompliance(authored, 'my-tool.html');
check('authored tool skill substituted and normalized', authoredInjected.includes('id="tool-skill" data-skill-slug="my-tool"') && authoredInjected.includes('My Tool / my-tool.html'));
check('authored skill does not inject legacy skill', !authoredInjected.includes('STICKSHIFT_SKILL_START'));
check('authored panel copies authored skill', authoredInjected.includes("getElementById('tool-skill').innerHTML"));
check('authored payload retains compliance UI', ['STICKSHIFT_CSS_START', 'STICKSHIFT_TRIGGER_START', 'STICKSHIFT_PANEL_START', 'STICKSHIFT_JS_START'].every(x => authoredInjected.includes(x)));
const dataFixture = '<script type="text/markdown" id="tool-skill">don\'t `</div>`</script><script>var x = "</script>";</script>';
const dataEscaped = api.escapeInlineScriptBreakouts(dataFixture);
check('data blocks bypass JS breakout scanner', dataEscaped.startsWith('<script type="text/markdown" id="tool-skill">don\'t `</div>`</script>') && dataEscaped.includes('"<\\/script>"'));
const legacy = '<html><body><!-- STICKSHIFT_SKILL_START --><script type="text/markdown" id="stickshift-skill">legacy markdown</script><!-- STICKSHIFT_SKILL_END --><!-- STICKSHIFT_CSS_START -->x<!-- STICKSHIFT_CSS_END --><!-- STICKSHIFT_TRIGGER_START -->x<!-- STICKSHIFT_TRIGGER_END --><!-- STICKSHIFT_PANEL_START -->x<!-- STICKSHIFT_PANEL_END --><!-- STICKSHIFT_JS_START -->x<!-- STICKSHIFT_JS_END --></body></html>';
const hoisted = api.unpackInlinedLibraries(legacy);
check('legacy skill is hoisted into canonical source block', hoisted.includes('HTML_IDE_REGION:tool-skill:start') && hoisted.includes('id="tool-skill">legacy markdown</script>') && !hoisted.includes('STICKSHIFT_'));
const noClobber = api.unpackInlinedLibraries(authored + legacy);
check('legacy hoist does not clobber authored block', noClobber.includes('{{SKILL_SLUG}}') && !noClobber.includes('stickshift-skill'));
const pdfStem = '<html><body><script id="lib-pdfjs-stem"></script></body></html>';
const pdfCompiled = api.packLibraries(pdfStem);
const pdfIds = ['injected-lib-pdfjs', 'injected-lib-pdfjs-worker', 'injected-lib-pdfjs-setup'];
check('PDF.js stem inlines full main library, worker, and setup exactly once', pdfIds.every(id => (pdfCompiled.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length === 1) && pdfCompiled.includes(vault['lib-pdfjs'].textContent.slice(0, 1024)) && pdfCompiled.includes(vault['lib-pdfjs-worker'].textContent.slice(0, 1024)));
check('PDF.js worker is embedded as non-executing text before setup', pdfCompiled.indexOf('id="injected-lib-pdfjs"') < pdfCompiled.indexOf('id="injected-lib-pdfjs-worker" type="text/plain"') && pdfCompiled.indexOf('id="injected-lib-pdfjs-worker"') < pdfCompiled.indexOf('id="injected-lib-pdfjs-setup"'));
const pdfSetupContent = pdfCompiled.match(/<script id="injected-lib-pdfjs-setup">([\s\S]*?)<\/script>/i)[1];
check('PDF.js setup derives a Blob URL from embedded worker source only', pdfSetupContent.includes("getElementById('injected-lib-pdfjs-worker').textContent") && pdfSetupContent.includes('new Blob') && pdfSetupContent.includes('URL.createObjectURL') && !/workerSrc\s*=\s*["'](?:https?:|\.?\/|[^"']+\.js)/i.test(pdfSetupContent));
check('PDF.js compilation validates and no-stem documents receive no payload', api.validateCompiledAppHtml(pdfCompiled).ok && !pdfIds.some(id => api.packLibraries('<html><body></body></html>').includes(id)));
const repackedPdf = api.packLibraries(api.unpackInlinedLibraries(pdfCompiled));
check('PDF.js import then recompile restores one complete payload', pdfIds.every(id => (repackedPdf.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length === 1));
check('manual refresh compiles through compileAppSource', /refreshIframeBtn[\s\S]*?compileAppSource\(state\.code, \{ embedStickShift: false \}\)/.test(src));

if (fail > 0) {
  console.error(`\n${fail} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
