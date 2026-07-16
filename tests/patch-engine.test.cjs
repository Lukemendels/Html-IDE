const assert = require('assert');
const engine = require('../scripts/patch-engine.cjs');

async function packet(source, patches, extra = {}) {
  return JSON.stringify({ protocol: 'html-ide-patch', version: '2.0', target: { sourceHash: await engine.sourceHash(source) }, patches, ...extra });
}
function p(id, operation, search, replacement = '') { return { id, operation, matching: { strategy: 'exact', expectedMatches: 1, search }, replacement }; }
async function reject(label, promise, pattern) { await assert.rejects(promise, pattern, label); }

(async () => {
  const source = '<!doctype html>\n<main>\n<h1>Title</h1>\n<button>Save</button>\n<p>End</p>\n</main>';

  let report = await engine.preflightPatchPacket(await packet(source, [p('replace-title', 'replace', '<h1>Title</h1>', '<h1>New</h1>')]), source);
  assert(report.output.includes('<h1>New</h1>'), 'valid exact replacement');

  report = await engine.preflightPatchPacket(await packet(source, [p('before-button', 'insert_before', '<button>Save</button>', '<section>Before</section>')]), source);
  assert(report.output.includes('<section>Before</section><button>Save</button>'), 'insert_before');

  report = await engine.preflightPatchPacket(await packet(source, [p('after-button', 'insert_after', '<button>Save</button>', '<section>After</section>')]), source);
  assert(report.output.includes('<button>Save</button><section>After</section>'), 'insert_after');

  report = await engine.preflightPatchPacket(await packet(source, [p('delete-button', 'delete', '<button>Save</button>')]), source);
  assert(!report.output.includes('<button>Save</button>'), 'delete');

  const regionSource = '<!-- HTML_IDE_REGION:hero:start -->old<!-- HTML_IDE_REGION:hero:end -->';
  report = await engine.preflightPatchPacket(await packet(regionSource, [{ id: 'region', operation: 'replace_region', matching: { strategy: 'exact', expectedMatches: 1, region: 'hero' }, replacement: 'new' }]), regionSource);
  assert.equal(report.output, '<!-- HTML_IDE_REGION:hero:start -->new<!-- HTML_IDE_REGION:hero:end -->', 'replace_region');

  await reject('malformed JSON', engine.preflightPatchPacket('{bad', source), /Malformed JSON/);
  await reject('unsupported protocol', engine.preflightPatchPacket(JSON.stringify({ protocol: 'other', version: '2.0' }), source), /Unsupported patch protocol/);
  await reject('unsupported version', engine.preflightPatchPacket(JSON.stringify({ protocol: 'html-ide-patch', version: '3.0' }), source), /Unsupported html-ide-patch version/);
  await reject('duplicate IDs', engine.preflightPatchPacket(await packet(source, [p('dup', 'replace', '<h1>Title</h1>', 'a'), p('dup', 'replace', '<p>End</p>', 'b')]), source), /Duplicate patch id/);
  await reject('missing fields', engine.preflightPatchPacket(JSON.stringify({ protocol: 'html-ide-patch', version: '2.0', target: { sourceHash: await engine.sourceHash(source) }, patches: [{}] }), source), /requires a string id/);
  await reject('unsupported normalization strategy', engine.preflightPatchPacket(await packet(source, [{ id: 'norm', operation: 'replace', matching: { strategy: 'indentation', expectedMatches: 1, search: '<h1>Title</h1>' }, replacement: 'x' }]), source), /unsupported matching strategy/);
  await reject('stale source hash', engine.preflightPatchPacket(JSON.stringify({ protocol: 'html-ide-patch', version: '2.0', target: { sourceHash: 'sha256:stale' }, patches: [p('x', 'replace', '<h1>Title</h1>', 'x')] }), source), /Stale patch rejected/);

  const correct = await engine.preflightPatchPacket(await packet(source, [p('hash-ok', 'replace', '<p>End</p>', '<p>Done</p>')]), source);
  assert(correct.output.includes('Done'), 'correct source hash');

  await reject('zero matches', engine.preflightPatchPacket(await packet(source, [p('missing', 'replace', 'not-here', 'x')]), source), /Expected 1 match\(es\), found 0/);
  await reject('ambiguous matches', engine.preflightPatchPacket(await packet('<p>x</p><p>x</p>', [p('ambiguous', 'replace', '<p>x</p>', 'y')]), '<p>x</p><p>x</p>'), /Expected 1 match\(es\), found 2/);

  await reject('duplicate region markers', engine.preflightPatchPacket(await packet('<!-- HTML_IDE_REGION:r:start -->a<!-- HTML_IDE_REGION:r:end --><!-- HTML_IDE_REGION:r:start -->b<!-- HTML_IDE_REGION:r:end -->', [{ id: 'r', operation: 'replace_region', matching: { strategy: 'exact', expectedMatches: 1, region: 'r' }, replacement: 'x' }]), '<!-- HTML_IDE_REGION:r:start -->a<!-- HTML_IDE_REGION:r:end --><!-- HTML_IDE_REGION:r:start -->b<!-- HTML_IDE_REGION:r:end -->'), /found 2 start marker/);
  await reject('missing region marker', engine.preflightPatchPacket(await packet('<!-- HTML_IDE_REGION:r:start -->a', [{ id: 'r', operation: 'replace_region', matching: { strategy: 'exact', expectedMatches: 1, region: 'r' }, replacement: 'x' }]), '<!-- HTML_IDE_REGION:r:start -->a'), /found 1 start marker\(s\) and 0 end marker/);
  await reject('reversed region markers', engine.preflightPatchPacket(await packet('<!-- HTML_IDE_REGION:r:end -->a<!-- HTML_IDE_REGION:r:start -->', [{ id: 'r', operation: 'replace_region', matching: { strategy: 'exact', expectedMatches: 1, region: 'r' }, replacement: 'x' }]), '<!-- HTML_IDE_REGION:r:end -->a<!-- HTML_IDE_REGION:r:start -->'), /Missing or reversed start marker/);
  await reject('nested region markers', engine.preflightPatchPacket(await packet('<!-- HTML_IDE_REGION:r:start -->a<!-- HTML_IDE_REGION:r:start -->b<!-- HTML_IDE_REGION:r:end --><!-- HTML_IDE_REGION:r:end -->', [{ id: 'r', operation: 'replace_region', matching: { strategy: 'exact', expectedMatches: 2, region: 'r' }, replacement: 'x' }]), '<!-- HTML_IDE_REGION:r:start -->a<!-- HTML_IDE_REGION:r:start -->b<!-- HTML_IDE_REGION:r:end --><!-- HTML_IDE_REGION:r:end -->'), /Nested or duplicate start marker/);

  await reject('overlap patch ranges', engine.preflightPatchPacket(await packet('abcdef', [p('wide', 'replace', 'abcd', 'x'), p('narrow', 'replace', 'bc', 'y')]), 'abcdef'), /wide conflicts with narrow|narrow conflicts with wide/);
  const before = '<a>A</a><b>B</b>';
  await reject('atomic rollback preflight', engine.preflightPatchPacket(await packet(before, [p('ok', 'replace', '<a>A</a>', 'A'), p('bad', 'replace', 'missing', 'B')]), before), /bad failed preflight/);
  assert.equal(before, '<a>A</a><b>B</b>', 'source remains unchanged after failed preflight');

  const history = engine.createHistory(2);
  history.push({ id: 1 }); history.push({ id: 2 }); history.push({ id: 3 });
  assert.deepEqual(history.entries().map(x => x.id), [2, 3], 'bounded undo');
  const tx = { before: 'old', after: 'new', resultHash: await engine.sourceHash('new') };
  assert.notEqual(await engine.sourceHash('manual edit'), tx.resultHash, 'undo after intervening manual changes is detectable');

  const legacy = await engine.preflightPatchPacket('SEARCH:\n<button>Save</button>\nREPLACE:\n<button>Go</button>', source);
  assert(legacy.packet.legacy, 'legacy SEARCH/REPLACE behavior');
  assert(legacy.output.includes('<button>Go</button>'), 'legacy output');

  console.log('production patch engine tests passed');
})().catch(err => { console.error(err); process.exit(1); });
