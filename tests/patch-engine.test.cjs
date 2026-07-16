const assert = require('assert');
function parse(packet){ const trimmed=packet.trim(); if(!trimmed.startsWith('{')) throw new Error('legacy'); const p=JSON.parse(trimmed); if(p.protocol!=='html-ide-patch') throw new Error('protocol'); if(p.version!=='2.0') throw new Error('version'); const ids=new Set(); for(const x of p.patches){ if(ids.has(x.id)) throw new Error('duplicate'); ids.add(x.id); if(!x.matching.search && x.operation!=='replace_region') throw new Error('search'); if(!Number.isInteger(x.matching.expectedMatches)||x.matching.expectedMatches<1) throw new Error('count'); } return p; }
function findAll(s,n){ let out=[],i=s.indexOf(n); while(i!==-1){out.push([i,i+n.length]); i=s.indexOf(n,i+Math.max(1,n.length));} return out; }
function apply(source,p){ const items=[]; for(const patch of p.patches){ const m=findAll(source,patch.matching.search); if(m.length!==patch.matching.expectedMatches) throw new Error(`Expected ${patch.matching.expectedMatches} found ${m.length}`); items.push({patch,m}); } let out=source; const all=[]; items.forEach(i=>i.m.forEach(m=>all.push({patch:i.patch,m}))); all.sort((a,b)=>b.m[0]-a.m[0]); for(const {patch,m} of all){ const r=patch.operation==='delete'?'':(patch.replacement||''); if(patch.operation==='insert_before') out=out.slice(0,m[0])+r+out.slice(m[0]); else if(patch.operation==='insert_after') out=out.slice(0,m[1])+r+out.slice(m[1]); else out=out.slice(0,m[0])+r+out.slice(m[1]); } return out; }
const src='<!doctype html>\n<button>Save</button>\n<script>const s=`SEARCH: ${1}`; const r=/REPLACE:/;</script>';
let packet=parse(JSON.stringify({protocol:'html-ide-patch',version:'2.0',target:{sourceHash:'sha256:test'},patches:[{id:'button',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'<button>Save</button>'},replacement:'<button>Export</button>'}]}));
assert(apply(src,packet).includes('Export'));
assert.throws(()=>parse('{bad json'));
assert.throws(()=>parse(JSON.stringify({...packet,version:'3.0'})),/version/);
assert.throws(()=>parse(JSON.stringify({...packet,patches:[...packet.patches,{...packet.patches[0]}]})),/duplicate/);
assert.throws(()=>parse(JSON.stringify({...packet,patches:[{...packet.patches[0],matching:{strategy:'exact',expectedMatches:0,search:'x'}}]})),/count/);
assert.throws(()=>apply('<p>x</p><p>x</p>',{patches:[{id:'amb',operation:'replace',matching:{expectedMatches:1,search:'<p>x</p>'},replacement:'y'}]}),/found 2/);
const before='<a>A</a> <b>B</b>'; assert.throws(()=>apply(before,{patches:[{id:'ok',operation:'replace',matching:{expectedMatches:1,search:'<a>A</a>'},replacement:'A'},{id:'bad',operation:'replace',matching:{expectedMatches:1,search:'missing'},replacement:'B'}]})); assert.equal(before,'<a>A</a> <b>B</b>');
console.log('patch engine tests passed');
