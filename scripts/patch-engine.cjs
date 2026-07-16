(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HtmlIdePatchEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PATCH_HISTORY_LIMIT = 20;
  const SUPPORTED_OPERATIONS = ['replace', 'insert_before', 'insert_after', 'delete', 'replace_region'];

  function normalizeNewlines(text) { return String(text || '').replace(/\r\n?/g, '\n'); }
  async function sha256Hex(text) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') return require('crypto').createHash('sha256').update(text, 'utf8').digest('hex');
    throw new Error('SHA-256 is unavailable in this environment.');
  }
  async function sourceHash(source) { return 'sha256:' + await sha256Hex(source); }
  function lineFromIndex(text, idx) { return text.slice(0, idx).split('\n').length; }

  function parseLegacySearchReplace(packetText) {
    const lines = normalizeNewlines(packetText).split('\n');
    let blocks = [], currentBlock = null, stateMode = 'IDLE';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === 'SEARCH:') {
        if (currentBlock && stateMode === 'REPLACE') blocks.push(currentBlock);
        currentBlock = { search: '', replace: '' };
        stateMode = 'SEARCH';
        continue;
      }
      if (trimmed === 'REPLACE:' && stateMode === 'SEARCH' && currentBlock) { stateMode = 'REPLACE'; continue; }
      if (stateMode === 'SEARCH' && currentBlock) currentBlock.search += line + '\n';
      if (stateMode === 'REPLACE' && currentBlock) currentBlock.replace += line + '\n';
    }
    if (currentBlock && stateMode === 'REPLACE') blocks.push(currentBlock);
    blocks = blocks.map((b, i) => ({ id: 'legacy-' + (i + 1), operation: 'replace', matching: { strategy: 'exact', expectedMatches: 1, search: b.search.slice(0, -1) }, replacement: b.replace.slice(0, -1) }));
    if (!blocks.length) throw new Error('No valid structured JSON packet or legacy SEARCH:/REPLACE: blocks were found.');
    return { protocol: 'legacy-search-replace', version: '1.0', target: {}, patches: blocks, legacy: true };
  }

  function parsePatchPacket(packetText) {
    const trimmed = String(packetText || '').trim();
    if (!trimmed.startsWith('{')) return parseLegacySearchReplace(packetText);
    let parsed;
    try { parsed = JSON.parse(trimmed); } catch (e) { throw new Error('Malformed JSON patch packet: ' + e.message); }
    if (parsed.protocol !== 'html-ide-patch') throw new Error('Unsupported patch protocol: ' + (parsed.protocol || '(missing)'));
    if (parsed.version !== '2.0' && parsed.version !== '2.1') throw new Error('Unsupported html-ide-patch version: ' + (parsed.version || '(missing)'));
    if (parsed.version === '2.0' && (!parsed.target || typeof parsed.target.sourceHash !== 'string')) throw new Error('v2.0 patches require target.sourceHash.');
    if (parsed.version === '2.1' && (!parsed.targets || typeof parsed.targets !== 'object')) throw new Error('v2.1 patches require targets.');
    if (!Array.isArray(parsed.patches) || !parsed.patches.length) throw new Error('Structured patches require a non-empty patches array.');
    const ids = new Set(), referenced = new Set();
    parsed.patches.forEach((patch, idx) => {
      const label = 'Patch #' + (idx + 1);
      if (!patch || typeof patch !== 'object') throw new Error(label + ' must be an object.');
      if (!patch.id || typeof patch.id !== 'string') throw new Error(label + ' requires a string id.');
      if (ids.has(patch.id)) throw new Error('Duplicate patch id: ' + patch.id); ids.add(patch.id);
      if (parsed.version === '2.1') {
        if (patch.surface !== 'html' && patch.surface !== 'appSkill') throw new Error('Patch ' + patch.id + ' requires surface html or appSkill.');
      } else patch.surface = 'html';
      referenced.add(patch.surface);
      if (!SUPPORTED_OPERATIONS.includes(patch.operation)) throw new Error('Patch ' + patch.id + ' has unsupported operation: ' + patch.operation);
      if (!patch.matching || typeof patch.matching !== 'object') throw new Error('Patch ' + patch.id + ' requires matching.');
      if ((patch.matching.strategy || 'exact') !== 'exact') throw new Error('Patch ' + patch.id + ' has unsupported matching strategy. Use exact.');
      if (!Number.isInteger(patch.matching.expectedMatches) || patch.matching.expectedMatches < 1) throw new Error('Patch ' + patch.id + ' requires expectedMatches >= 1.');
      if (patch.operation === 'replace_region') { if (!patch.matching.region || typeof patch.matching.region !== 'string') throw new Error('Patch ' + patch.id + ' replace_region requires matching.region.'); }
      else if (typeof patch.matching.search !== 'string' || !patch.matching.search.length) throw new Error('Patch ' + patch.id + ' requires a non-empty matching.search string.');
    });
    if (parsed.version === '2.1') referenced.forEach(surface => { if (!parsed.targets[surface] || typeof parsed.targets[surface].sourceHash !== 'string') throw new Error('v2.1 patches referencing ' + surface + ' require targets.' + surface + '.sourceHash.'); });
    return parsed;
  }

  function findExactMatches(source, search) {
    const matches = [];
    let idx = source.indexOf(search);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + search.length });
      idx = source.indexOf(search, idx + Math.max(1, search.length));
    }
    return matches;
  }

  function findMarkerPositions(source, marker) {
    const positions = [];
    let idx = source.indexOf(marker);
    while (idx !== -1) { positions.push(idx); idx = source.indexOf(marker, idx + marker.length); }
    return positions;
  }

  function resolveRegion(source, patch) {
    const name = patch.matching.region;
    const startMarker = '<!-- HTML_IDE_REGION:' + name + ':start -->';
    const endMarker = '<!-- HTML_IDE_REGION:' + name + ':end -->';
    const starts = findMarkerPositions(source, startMarker);
    const ends = findMarkerPositions(source, endMarker);
    const expected = patch.matching.expectedMatches;
    if (starts.length !== expected || ends.length !== expected) {
      return { ok: false, error: 'Expected ' + expected + ' region(s), found ' + starts.length + ' start marker(s) and ' + ends.length + ' end marker(s).', matches: [] };
    }
    const events = starts.map(pos => ({ type: 'start', pos })).concat(ends.map(pos => ({ type: 'end', pos }))).sort((a, b) => a.pos - b.pos || (a.type === 'end' ? -1 : 1));
    let depth = 0, start = null;
    const matches = [];
    for (const event of events) {
      if (event.type === 'start') {
        if (depth !== 0) return { ok: false, error: 'Nested or duplicate start marker for region ' + name + '.', matches: [] };
        depth = 1; start = event.pos;
      } else {
        if (depth !== 1 || start === null) return { ok: false, error: 'Missing or reversed start marker for region ' + name + '.', matches: [] };
        const contentStart = start + startMarker.length;
        const contentEnd = event.pos;
        if (contentEnd < contentStart) return { ok: false, error: 'Reversed markers for region ' + name + '.', matches: [] };
        matches.push({ start: contentStart, end: contentEnd, markerStart: start, markerEnd: event.pos + endMarker.length });
        depth = 0; start = null;
      }
    }
    if (depth !== 0) return { ok: false, error: 'Unpaired start marker for region ' + name + '.', matches: [] };
    return { ok: true, matches };
  }

  function resolvePatch(source, patch) {
    if (patch.operation === 'replace_region') return resolveRegion(source, patch);
    const matches = findExactMatches(source, patch.matching.search);
    if (matches.length !== patch.matching.expectedMatches) return { ok: false, error: 'Expected ' + patch.matching.expectedMatches + ' match(es), found ' + matches.length, matches };
    return { ok: true, matches };
  }

  function collectRanges(resolvedItems) {
    const ranges = [];
    for (const item of resolvedItems) for (const match of item.resolution.matches) ranges.push({ patchId: item.patch.id, start: match.start, end: match.end, patch: item.patch, match });
    ranges.sort((a, b) => a.start - b.start || b.end - a.end);
    for (let i = 1; i < ranges.length; i++) {
      const prev = ranges[i - 1], cur = ranges[i];
      if (cur.start < prev.end) throw new Error('Overlapping patch ranges rejected: ' + prev.patchId + ' conflicts with ' + cur.patchId + '.');
    }
    return ranges;
  }

  function applyResolved(source, resolvedItems) {
    let output = source;
    const ordered = collectRanges(resolvedItems).sort((a, b) => b.start - a.start);
    for (const item of ordered) {
      const patch = item.patch, match = item.match;
      const replacement = patch.operation === 'delete' ? '' : (patch.replacement || '');
      if (patch.operation === 'insert_before') output = output.slice(0, match.start) + replacement + output.slice(match.start);
      else if (patch.operation === 'insert_after') output = output.slice(0, match.end) + replacement + output.slice(match.end);
      else output = output.slice(0, match.start) + replacement + output.slice(match.end);
    }
    return output;
  }

  async function preflightPatchPacket(packetText, sourceOrSurfaces) {
    const packet = parsePatchPacket(packetText);
    const legacyString = typeof sourceOrSurfaces === 'string';
    const surfaces = legacyString ? { html: sourceOrSurfaces, appSkill: '' } : { html: String(sourceOrSurfaces.html || ''), appSkill: String(sourceOrSurfaces.appSkill || '') };
    const affectedSurfaces = [...new Set(packet.patches.map(p => p.surface || 'html'))];
    const currentHashes = {}, nextHashes = {}, outputs = { ...surfaces }, resolvedBySurface = {};
    for (const surface of affectedSurfaces) currentHashes[surface] = await sourceHash(surfaces[surface]);
    if (!packet.legacy) {
      for (const surface of affectedSurfaces) {
        const expected = packet.version === '2.0' ? packet.target.sourceHash : packet.targets[surface].sourceHash;
        if (expected !== currentHashes[surface]) throw new Error((packet.version === '2.0' ? 'Stale patch rejected' : 'Stale ' + surface + ' patch rejected') + '. Expected ' + expected + ' but current source is ' + currentHashes[surface] + '.');
      }
    }
    for (const surface of affectedSurfaces) {
      const resolvedItems = [];
      for (const patch of packet.patches.filter(p => (p.surface || 'html') === surface)) {
        const resolution = resolvePatch(surfaces[surface], patch);
        if (!resolution.ok) throw new Error('Patch ' + patch.id + (packet.version === '2.1' ? ' on ' + surface : '') + ' failed preflight: ' + resolution.error);
        resolvedItems.push({ patch, resolution });
      }
      collectRanges(resolvedItems); resolvedBySurface[surface] = resolvedItems;
      outputs[surface] = applyResolved(surfaces[surface], resolvedItems); nextHashes[surface] = await sourceHash(outputs[surface]);
    }
    const resolvedItems = affectedSurfaces.flatMap(surface => resolvedBySurface[surface]);
    return { packet, affectedSurfaces, currentHashes, nextHashes, outputs, resolvedBySurface, resolvedItems,
      currentHash: currentHashes.html, nextHash: nextHashes.html, output: outputs.html };
  }

  function summarizePreflight(report, sourceOrSurfaces) {
    const surfaces = typeof sourceOrSurfaces === 'string' ? { html: sourceOrSurfaces } : sourceOrSurfaces;
    const lines = [(report.packet.legacy ? 'Legacy HTML-only packet' : 'Structured html-ide-patch v' + report.packet.version), 'Affected surfaces: ' + report.affectedSurfaces.join(', '), 'Patch count: ' + report.packet.patches.length];
    report.affectedSurfaces.forEach(surface => { lines.push(surface + ': ' + report.currentHashes[surface] + ' -> ' + report.nextHashes[surface]); (report.resolvedBySurface[surface] || []).forEach(item => lines.push('- ' + item.patch.id + ' [' + surface + '/' + item.patch.operation + '] ' + item.resolution.matches.map(m => 'line ' + lineFromIndex(surfaces[surface], m.start)).join('; '))); });
    if (report.packet.legacy) lines.push('Warning: legacy packets are HTML-only, unhashed, and lower safety.'); return lines.join('\n');
  }

  function createHistory(limit) {
    const items = [];
    return {
      push(tx) { items.push(tx); while (items.length > (limit || PATCH_HISTORY_LIMIT)) items.shift(); },
      pop() { return items.pop(); },
      size() { return items.length; },
      entries() { return items.slice(); }
    };
  }

  return { PATCH_HISTORY_LIMIT, normalizeNewlines, sha256Hex, sourceHash, lineFromIndex, parseLegacySearchReplace, parsePatchPacket, findExactMatches, resolvePatch, applyResolved, preflightPatchPacket, summarizePreflight, createHistory };
});
