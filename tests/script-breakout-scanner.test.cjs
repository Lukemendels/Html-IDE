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
const escapeInlineScriptBreakouts = new Function(`${extractFunction('isDataScriptOpenTag')}\n${extractFunction('scriptKeywordCanStartRegex')}\n${extractFunction('scriptPunctuationCanStartRegex')}\n${extractFunction('escapeInlineScriptBreakouts')}\nreturn escapeInlineScriptBreakouts;`)();
function isDataScript(openTag) { return /\btype\s*=\s*["'](?:application\/(?:json|ld\+json)|text\/(?:plain|markdown))["']/i.test(openTag); }
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
