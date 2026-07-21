const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'local-ide.src.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'local-ide.html'), 'utf8');
const builtPublic = fs.readFileSync(path.join(root, 'public/local-ide.html'), 'utf8');
assert.equal(crypto.createHash('sha256').update(built).digest('hex'), crypto.createHash('sha256').update(builtPublic).digest('hex'), 'root and public local-ide artifacts are byte-identical');
assert(!src.includes('cdn.tailwindcss.com'), 'template does not include default-app Tailwind CDN');
assert(!src.includes('cdnjs.cloudflare.com'), 'template does not include default-app cdnjs');
assert(!/availableLibraryStemManifest[\s\S]*<script id="lib-[^"]+-stem"><\/script>/.test(src), 'manifest must not contain raw closing script literals');
assert(built.includes('window.HtmlIdePatchEngine') || built.includes('root.HtmlIdePatchEngine'), 'patch engine is inlined');

function extractFunction(name) {
  const idx = src.indexOf('function ' + name + '(');
  assert(idx !== -1, `${name} exists in source`);
  const brace = src.indexOf('{', idx);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) return src.slice(idx, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}
const helpers = new Function(`${extractFunction('isDataScriptOpenTag')}\n${extractFunction('escapeScriptTextForHtml')}\n${extractFunction('scriptKeywordCanStartRegex')}\n${extractFunction('scriptPunctuationCanStartRegex')}\n${extractFunction('escapeInlineScriptBreakouts')}\nreturn { escapeScriptTextForHtml, escapeInlineScriptBreakouts };`)();

const adversarialJs = 'const a = "</script>"; const b = "</ScRiPt>"; const c = `<div></script></div>`; const d = JSON.stringify({ html: "</script>" });';
const escapedJs = helpers.escapeScriptTextForHtml(adversarialJs);
assert(!/<\/script/i.test(escapedJs), 'script payload escaping removes literal closing script tokens');
assert((escapedJs.match(/<\\\/script>/g) || []).length >= 2, 'script payload escaping preserves runtime slash with JS escape');
assert.equal(helpers.escapeScriptTextForHtml(escapedJs), escapedJs, 'script payload escaping is idempotent');

const escapedApp = helpers.escapeInlineScriptBreakouts(`<script>${adversarialJs}</script>`);
assert(escapedApp.includes('"<\\/script>"'), 'inline app script string is escaped');
assert(escapedApp.endsWith('</script>'), 'real closing script tag remains intact');

const libPaths = {
  'lib-alpine': 'node_modules/alpinejs/dist/cdn.min.js',
  'lib-jszip': 'node_modules/jszip/dist/jszip.min.js',
  'lib-docxtemplater': 'node_modules/docxtemplater/build/docxtemplater.min.js',
  'lib-docx': 'node_modules/docx/dist/index.iife.js',
  'lib-mammoth': 'node_modules/mammoth/mammoth.browser.min.js',
  'lib-sheetjs': 'node_modules/xlsx/dist/xlsx.full.min.js',
  'lib-pptxgen': 'node_modules/pptxgenjs/dist/pptxgen.bundle.js',
  'lib-pdfjs': 'node_modules/pdfjs-dist/build/pdf.min.js',
  'lib-pdfjs-worker': 'node_modules/pdfjs-dist/build/pdf.worker.min.js',
  'lib-picocss': 'node_modules/@picocss/pico/css/pico.classless.min.css'
};
for (const [id, rel] of Object.entries(libPaths)) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const hasRawClose = /<\/script/i.test(text);
  const escaped = id === 'lib-picocss' ? text.replace(/<\/style/gi, '<\\/style') : helpers.escapeScriptTextForHtml(text);
  assert(!/<\/script/i.test(escaped), `${id} escaped output has no raw closing script token`);
  console.log(`${id}: ${Buffer.byteLength(text)} bytes, raw </script present: ${hasRawClose}`);
}

function fixtureForStem(id) {
  if (id === 'lib-picocss') return '<link rel="stylesheet" id="lib-picocss-stem">';
  return `<script id="${id}-stem"></script>`;
}
for (const id of Object.keys(libPaths).filter(id => id !== 'lib-pdfjs-worker')) {
  const stem = fixtureForStem(id);
  const fixture = `<!doctype html><html><head>${stem}</head><body><h1>${id}</h1><script>window.__fixtureRan = true;</script></body></html>`;
  assert(fixture.includes(id === 'lib-picocss' ? 'lib-picocss-stem' : `${id}-stem`), `${id} fixture contains stem`);
  const escapedFixture = helpers.escapeInlineScriptBreakouts(fixture);
  assert(escapedFixture.includes('window.__fixtureRan = true;'), `${id} fixture script preserved`);
}

console.log('export integrity tests passed');

const buildScript = fs.readFileSync(path.join(root, 'build_local_ide.py'), 'utf8');
assert(buildScript.includes('"lib_pdfjs"') && buildScript.includes('"lib_pdfjs_worker"'), 'build config includes both mandatory PDF.js inputs');
assert(buildScript.includes('MANDATORY_LIB_TOKENS') && buildScript.includes('Required PDF.js build input'), 'build fails clearly for missing or empty PDF.js inputs');
const workerSource = fs.readFileSync(path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.js'), 'utf8');
const workerVaultMatch = built.match(/<script type="text\/plain" id="lib-pdfjs-worker">([\s\S]*?)<\/script>/i);
assert(workerVaultMatch && workerVaultMatch[1].includes(workerSource.slice(0, 1024)), 'standalone IDE vault physically contains PDF.js worker source');
assert(built.includes('window.__htmlIdePdfjsWorkerUrl') && built.includes('URL.revokeObjectURL(window.__htmlIdePdfjsWorkerUrl)'), 'PDF.js setup manages obsolete Blob URLs');
console.log('PDF.js vault integration checks passed');
