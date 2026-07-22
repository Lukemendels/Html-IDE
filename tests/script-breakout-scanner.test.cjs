const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('local-ide.src.html', 'utf8');
function extractFunction(name) {
  const start = src.indexOf(`function ${name}(`);
  assert(start >= 0, `missing ${name}`);
  const brace = src.indexOf('{', start); let depth = 0;
  for (let i = brace; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; if (!depth) return src.slice(start, i + 1); }
  throw new Error(`unterminated ${name}`);
}
const acorn = require('acorn');
const scanner = new Function('acorn', `${extractFunction('classifyScriptOpenTag')}\n${extractFunction('escapeInlineScriptBreakouts')}\nreturn { classifyScriptOpenTag, escapeInlineScriptBreakouts };`)(acorn);
const { classifyScriptOpenTag, escapeInlineScriptBreakouts } = scanner;
function isDataScript(openTag) { return !['classic-javascript', 'module'].includes(classifyScriptOpenTag(openTag)); }
function extractStructuralScripts(html) {
  const scripts = [], re = /<script\b[^>]*>/gi; let match;
  while ((match = re.exec(html))) { const end = html.toLowerCase().indexOf('</script>', re.lastIndex); if (end < 0) throw new Error(`unclosed structural script after ${match.index}`); scripts.push({ open: match[0], body: html.slice(re.lastIndex, end) }); re.lastIndex = end + 9; }
  return scripts;
}
function executableScripts(html) { return extractStructuralScripts(html).filter(s => !isDataScript(s.open)); }
function compile(body) { new vm.Script(body); }
function listenerDocument() { const calls=[]; return { calls, document: { getElementById(id) { return { addEventListener(type) { calls.push([id,type]); } }; } } }; }

const minimal = `<!doctype html><button id="parseBtn"></button><div id="dropzone"></div><script>
const categoryPattern = /Category\\s*:\\s*([A-Za-z0-9() /,&.'-]+?)\\s*$/gi;
function parseSelectedFiles() {}
document.getElementById("parseBtn").addEventListener("click", parseSelectedFiles);
document.getElementById("dropzone").addEventListener("drop", function () {});
</script>`;
const compiled = escapeInlineScriptBreakouts(minimal);
const scripts = executableScripts(compiled);
assert.equal(scripts.length, 1, 'the application must retain one structural executable script');
assert(scripts[0].body.includes('addEventListener("drop"'), 'code after apostrophe-containing regex remains in script');
compile(scripts[0].body);
const stub = listenerDocument(); new Function('document', scripts[0].body)(stub.document);
assert.deepEqual(stub.calls, [['parseBtn','click'], ['dropzone','drop']]);
console.log('script breakout scanner tests passed');

const regexes = [
  "/['\"]/", "/[`'\"]/", "/[A-Za-z0-9 .,&()\\/'-]+/",
  '/https?:\\/\\/example\\.com/i', "/[\\/'\"]+/", '/\\[(?:foo|bar)\\]/', '/foo/gi', '/bar/msu'
];
const regexSource = `<script>${regexes.map((pattern, index) => `const r${index} = ${pattern};`).join('\n')}\nconst afterRegex = true;</script>`;
const regexCompiled = escapeInlineScriptBreakouts(regexSource);
assert.equal(regexCompiled, regexSource, 'ordinary regex literal scripts are byte-stable');
const regexBody = executableScripts(regexCompiled)[0].body;
for (const pattern of regexes) assert(regexBody.includes(pattern), `regex ${pattern} survives unchanged`);
compile(regexBody);

const divisionSource = '<script>const a = total / count; const b = total / count / scale; value /= divisor; const c = total / /x/.test(value);</script>';
assert.equal(escapeInlineScriptBreakouts(divisionSource), divisionSource, 'division expressions are not treated as regex literals');
compile(executableScripts(divisionSource)[0].body);

const breakoutSource = `<script>const a = "</script>"; const b = '</script>'; const c = \`</script>\`; // </script>
/* </script> */</script>`;
const breakoutCompiled = escapeInlineScriptBreakouts(breakoutSource);
assert.equal((breakoutCompiled.match(/<\\\/script>/g) || []).length, 5, 'strings, templates, and comments escape authored closing-script tokens');
assert.equal((breakoutCompiled.match(/<\/script>/gi) || []).length, 1, 'only the structural closing tag remains raw');
assert.equal(escapeInlineScriptBreakouts(breakoutCompiled), breakoutCompiled, 'breakout normalization is idempotent');
compile(executableScripts(breakoutCompiled)[0].body);

const controlFlowRegexSources = [
  "if (ready) /['\"]/.test(value);",
  "while (ready) /['\"]/.test(value);",
  "for (;;) /['\"]/.test(value);",
  "with (context) /['\"]/.test(value);",
  "if (ready) run(); else /['\"]/.test(value);",
  "do /['\"]/.test(value); while (false);",
  "if (ready) {} /['\"]/.test(value);",
  "function initialize() {} /['\"]/.test(value);"
];
for (const source of controlFlowRegexSources) {
  const html = `<script>${source}</script>`;
  const normalized = escapeInlineScriptBreakouts(html);
  assert.equal(normalized, html, `control-flow regex statement remains byte-stable: ${source}`);
  assert.equal((normalized.match(/<\/script>/gi) || []).length, 1, `control-flow regex retains one structural close: ${source}`);
  compile(executableScripts(normalized)[0].body);
}

const valueDivisionSources = [
  'const a = (total + tax) / count;',
  'const b = getTotal() / count;',
  'const c = values[index] / count;',
  'const d = ({ value: total }).value / count;',
  'const e = ({ value: total }) / count;'
];
for (const source of valueDivisionSources) {
  const html = `<script>${source}</script>`;
  assert.equal(escapeInlineScriptBreakouts(html), html, `value expression remains division: ${source}`);
  compile(executableScripts(html)[0].body);
}

const statementBlockRegexSources = [
  "class C {} /['\"]/.test(value);",
  "class C extends Base {} /['\"]/.test(value);",
  "try {} catch (error) {} /['\"]/.test(value);",
  "try {} catch {} /['\"]/.test(value);",
  "try {} finally {} /['\"]/.test(value);",
  "try {} catch (error) {} finally {} /['\"]/.test(value);",
  "{ run(); } /['\"]/.test(value);",
  "label: { run(); } /['\"]/.test(value);",
  "function initialize() {} /['\"]/.test(value);",
  "function* generate() {} /['\"]/.test(value);",
  "async function initialize() {} /['\"]/.test(value);"
];
for (const source of statementBlockRegexSources) {
  const html = `<script>${source}</script>`;
  const normalized = escapeInlineScriptBreakouts(html);
  assert.equal(normalized, html, `statement block retains a following regex statement: ${source}`);
  assert.equal((normalized.match(/<\/script>/gi) || []).length, 1, `statement block retains one structural close: ${source}`);
  compile(executableScripts(normalized)[0].body);
}

const expressionValueDivisionSources = [
  'const a = function () {} / divisor;',
  'const b = function named() {} / divisor;',
  'const c = class {} / divisor;',
  'const d = class Named {} / divisor;',
  'const e = ({ value: total }) / divisor;'
];
for (const source of expressionValueDivisionSources) {
  const html = `<script>${source}</script>`;
  assert.equal(escapeInlineScriptBreakouts(html), html, `expression value retains division: ${source}`);
  assert.equal((html.match(/<\/script>/gi) || []).length, 1, `expression value retains one structural close: ${source}`);
  compile(executableScripts(html)[0].body);
}


const objectPropertyDivisionSources = [
  'const x = { a: {} / divisor };',
  'const x = { a: { b: 1 } / divisor };',
  'const x = { a: function () {} / divisor };',
  'const x = { a: function named() {} / divisor };',
  'const x = { a: class {} / divisor };',
  'const x = { a: class Named {} / divisor };'
];
for (const source of objectPropertyDivisionSources) {
  const html = `<script>${source}</script>`;
  const normalized = escapeInlineScriptBreakouts(html);
  assert.equal(normalized, html, `object property expression retains division: ${source}`);
  assert.equal((normalized.match(/<\/script>/gi) || []).length, 1, `object property division retains one structural close: ${source}`);
  assert(!normalized.includes('<\\/script>'), `object property division adds no escape: ${source}`);
  compile(executableScripts(normalized)[0].body);
}
const objectPropertyRegexSources = [
  "const x = { pattern: /['\"]/.test(value) };",
  'const x = { pattern: /https?:\\/\\/example\\.com/i };',
  "const x = { nested: { pattern: /[A-Za-z0-9 .,&()\\/'-]+/ } };"
];
for (const source of objectPropertyRegexSources) {
  const html = `<script>${source}</script>`;
  const normalized = escapeInlineScriptBreakouts(html);
  assert.equal(normalized, html, `object property regex remains unchanged: ${source}`);
  assert.equal((normalized.match(/<\/script>/gi) || []).length, 1, `object property regex retains one structural close: ${source}`);
  compile(executableScripts(normalized)[0].body);
}


const lineCommentCases = [
  { source: '<script>const x = 1; // trailing comment</script>', escaped: 0 },
  { source: '<script>// comment</script>', escaped: 0 },
  { source: '<script type="module">// comment</script>', escaped: 0 },
  { source: '<script>// authored </script>\nconst x = 1;\n</script>', escaped: 1 },
  { source: '<script>// authored </script></script>', escaped: 1 }
];
for (const test of lineCommentCases) {
  const normalized = escapeInlineScriptBreakouts(test.source);
  assert.equal((normalized.match(/<\\\/script>/g) || []).length, test.escaped, `line comment escaping count: ${test.source}`);
  assert.equal((normalized.match(/<\/script>/gi) || []).length, 1, `line comment retains one structural close: ${test.source}`);
  const script = executableScripts(normalized); assert.equal(script.length, 1, `line comment script extracts: ${test.source}`);
  compile(script[0].body);
  assert.equal(escapeInlineScriptBreakouts(normalized), normalized, `line comment normalization is idempotent: ${test.source}`);
}
const dataScriptSources = [
  '<script type="text/html"><div>{{ value }}</div></script>',
  '<script type="text/x-template"><div>{{ value }}</div></script>',
  '<script type="importmap">\n{"imports":{"example":"/example.js"}}\n</script>',
  '<script type="speculationrules">\n{"prefetch":[]}\n</script>'
];
for (const source of dataScriptSources) assert.equal(escapeInlineScriptBreakouts(source), source, `non-JavaScript data script is unchanged: ${source}`);


const classifierCases = [
  ['<script data-type="text/html">', 'classic-javascript'], ['<script x-type="text/html">', 'classic-javascript'], ['<script notype="text/html">', 'classic-javascript'], ['<script data-info="type=\'text/html\'">', 'classic-javascript'], ['<script data-info=" type=text/html ">', 'classic-javascript'], ['<script TYPE="module">', 'module'], ['<script type=text/x-template>', 'data'], ['<script type="text/javascript">', 'classic-javascript'], ['<script type="TEXT/JAVASCRIPT">', 'classic-javascript'], ['<script type="application/x-ecmascript">', 'classic-javascript'], ['<script type="text/javascript1.5">', 'classic-javascript'], ['<script type="text/livescript">', 'classic-javascript'], ['<script type="text/javascript; charset=utf-8">', 'data'], ['<script type="application/json; charset=utf-8">', 'data']
];
for (const [tag, expected] of classifierCases) assert.equal(classifyScriptOpenTag(tag), expected, `script type classification: ${tag}`);
const dataTypeJs = '<script data-type="text/html">const example = "</script>";</script>';
const dataTypeNormalized = escapeInlineScriptBreakouts(dataTypeJs);
assert(dataTypeNormalized.includes('"<\\/script>"') && dataTypeNormalized.endsWith('</script>')); compile(executableScripts(dataTypeNormalized)[0].body);
const multiScriptCases = [
  '<script>// first script</script><script>const second = 1;</script>',
  '<script type="module">// first module</script><script type="module">export const second = 1;</script>',
  '<script>\n// authored example: </script>\nconst first = 1;\n</script><script>const second = 2;</script>',
  '<script>// authored </script></script><script>const second = 2;</script>',
  '<script>// first script</script><script type="text/html"><div>template</div></script><script>const third = 3;</script>'
];
for (const source of multiScriptCases) { const normalized=escapeInlineScriptBreakouts(source); const scripts=extractStructuralScripts(normalized); assert.equal(escapeInlineScriptBreakouts(normalized), normalized); assert(scripts.length>=2); for(const script of scripts) if(!isDataScript(script.open)){if(classifyScriptOpenTag(script.open)==='module') acorn.parse(script.body,{ecmaVersion:'latest',sourceType:'module'});else compile(script.body);} assert(!scripts[0].body.includes('const second')&&!scripts[0].body.includes('const third')); }

const authoredOpenScriptCases = [
  'const example = "<script>";', "const example = '<script>';", 'const example = `<script></script>`;', 'const pattern = /<script>/;', '// Documentation example: <script>\nconst value = 1;', '/* Example markup: <script> */\nconst value = 1;'
];
for (const source of authoredOpenScriptCases) { const html=`<script>${source}</script>`; const normalized=escapeInlineScriptBreakouts(html); assert(normalized.includes('<script>'), `authored opening script text remains present: ${source}`); if(source.includes('</script>')) assert(normalized.includes('<\\/script>')); else assert.equal(normalized,html,`authored opening script text remains stable: ${source}`); assert.equal(executableScripts(normalized).length,1); compile(executableScripts(normalized)[0].body); assert.equal(escapeInlineScriptBreakouts(normalized),normalized); }
