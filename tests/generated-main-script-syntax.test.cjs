const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

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

function nodeCheck(source, expectedOk, label) {
  const file = path.join(os.tmpdir(), `html-ide-${process.pid}-${label.replace(/[^a-z0-9]+/gi, '-')}.js`);
  fs.writeFileSync(file, source);
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  fs.unlinkSync(file);
  if (expectedOk) assert.equal(result.status, 0, `${label} should pass node --check: ${result.stderr}`);
  else assert.notEqual(result.status, 0, `${label} should fail node --check`);
  return result;
}

nodeCheck('const value = 1;\nconst outer = `embedded code containing `inner ${value}``;\n', false, 'broken-nested-template');
nodeCheck('const value = 1;\nconst outer = `embedded code containing \\`inner \\${value}\\``;\n', true, 'escaped-nested-template');
nodeCheck('const value = 1;\nconst outer = "embedded code containing " + "inner " + value;\n', true, 'concatenation-nested-template-alternative');

const main = scriptBlocks(html).find(block => block.content.includes('const STICKSHIFT_TOOL') && block.content.includes('CodeJar('));
assert(main, 'main IDE application script exists');
for (const marker of [
  'CodeJar(elements.editor',
  'jar.onUpdate',
  'elements.fileUploadInput.addEventListener',
  'const patchEngine = window.HtmlIdePatchEngine',
  'elements.downloadBtn.addEventListener',
  'window.__LOCAL_HTML_IDE_READY__ = true'
]) {
  assert(main.content.includes(marker), `main script contains ${marker}`);
}
nodeCheck(main.content, true, 'generated-main-script');
console.log('generated main script syntax tests passed');
