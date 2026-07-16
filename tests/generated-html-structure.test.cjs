const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'local-ide.html'), 'utf8');

function scriptBlocks(source) {
  const blocks = [];
  const openRe = /<script\b[^>]*>/gi;
  let open;
  while ((open = openRe.exec(source))) {
    const contentStart = openRe.lastIndex;
    const closeIdx = source.toLowerCase().indexOf('</script', contentStart);
    assert(closeIdx !== -1, `script opened at ${open.index} has a closing tag`);
    const closeEnd = source.indexOf('>', closeIdx);
    assert(closeEnd !== -1, `script closing tag at ${closeIdx} is complete`);
    blocks.push({ openTag: open[0], start: open.index, contentStart, contentEnd: closeIdx, end: closeEnd + 1, content: source.slice(contentStart, closeIdx) });
    openRe.lastIndex = closeEnd + 1;
  }
  return blocks;
}

function assertPrematureFixtureBreaks(payload, description) {
  const fixture = `<html><body><script>const before = 1;\n${payload}\nwindow.after = true;</script><p>tail</p></body></html>`;
  const block = scriptBlocks(fixture)[0];
  assert(!block.content.includes('window.after = true;'), `${description} fixture demonstrates browser-style premature termination`);
}
function assertSafeFixtureDoesNotBreak(payload, description) {
  const fixture = `<html><body><script>const before = 1;\n${payload}\nwindow.after = true;</script><p>tail</p></body></html>`;
  const block = scriptBlocks(fixture)[0];
  assert(block.content.includes('window.after = true;'), `${description} safe fixture keeps script intact`);
}

assertPrematureFixtureBreaks('// literal </script token in comment', 'comment');
assertPrematureFixtureBreaks('const s = "</script>";', 'quoted string');
assertPrematureFixtureBreaks('const t = `</script>`;', 'template literal');
assertSafeFixtureDoesNotBreak('// closing-script token in comment', 'safe comment');
assertSafeFixtureDoesNotBreak('const prefix = "<" + "/script";', 'split string');
assertSafeFixtureDoesNotBreak('const s = "<\\/script>";', 'escaped string');

const blocks = scriptBlocks(html);
const main = blocks.find(block => block.content.includes('const STICKSHIFT_TOOL') && block.content.includes('CodeJar('));
assert(main, 'main application script block is present');
const requiredMarkers = [
  'const STICKSHIFT_TOOL',
  'CodeJar(elements.editor',
  'jar.onUpdate',
  'elements.fileUploadInput.addEventListener',
  'const patchEngine = window.HtmlIdePatchEngine',
  'elements.downloadBtn.addEventListener',
  'window.__LOCAL_HTML_IDE_READY__ = true'
];
for (const marker of requiredMarkers) assert(main.content.includes(marker), `main script contains ${marker}`);
assert(main.contentEnd > main.content.indexOf('window.__LOCAL_HTML_IDE_READY__ = true') + main.contentStart, 'genuine closing tag occurs after ready marker');

const afterMain = html.slice(main.end, html.indexOf('<!-- OFFLINE LIBRARY VAULT'));
assert(!afterMain.includes('function CodeJar'), 'CodeJar source did not spill into body text');
assert(!afterMain.includes('jar.onUpdate'), 'editor update handler did not spill into body text');
assert(!afterMain.includes('const patchEngine'), 'patch engine initialization did not spill into body text');

console.log('generated HTML structure tests passed');
