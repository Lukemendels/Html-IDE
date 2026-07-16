const assert=require('assert'),fs=require('fs');
const r=JSON.parse(fs.readFileSync('config/offline-libraries.json'));
for(const key of ['id','stemTag','injectedId']) assert.equal(new Set(r.map(x=>x[key])).size,r.length,`unique ${key}`);
for(const x of r){assert(x.required);assert(x.stemTag.includes(x.stemId));assert(fs.existsSync(x.browserBundlePath),x.browserBundlePath);assert(fs.statSync(x.browserBundlePath).size>0);}
const html=fs.readFileSync('local-ide.html','utf8'),pub=fs.readFileSync('public/local-ide.html','utf8'),src=fs.readFileSync('local-ide.src.html','utf8');
assert.equal(html,pub); for(const x of r){assert(html.includes(`id="${x.vaultId}"`));assert(html.includes(x.displayName));assert(src.includes('OFFLINE_LIBRARY_REGISTRY'));}
console.log('library catalog tests passed');
