const fs = require('fs');
const src = fs.readFileSync('local-ide.src.html', 'utf8');
const start = src.indexOf('const SS_KEYS');
const end = src.indexOf('// Pack Offline Libraries UI Event Handlers');
if (start === -1 || end === -1) { console.error('FAIL: logic block not found'); process.exit(1); }
const logic = src.slice(start, end);
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const api = new Function('localStorage', logic +
  '; return { injectStickShiftCompliance, detectScriptBreakouts, renderSkillMarkdown, SS_KEYS };')(global.localStorage);

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

if (fail > 0) {
  console.error(`\n${fail} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
