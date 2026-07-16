const assert=require('assert'),fs=require('fs'),vm=require('vm');
const registry=JSON.parse(fs.readFileSync('config/offline-libraries.json','utf8'));
for(const key of ['id','stemTag','injectedId','vaultId'])assert.equal(new Set(registry.map(x=>x[key])).size,registry.length,`unique ${key}`);
for(const item of registry){assert(item.required);assert(item.stemTag.includes(item.stemId));assert(fs.existsSync(item.browserBundlePath),item.browserBundlePath);const size=fs.statSync(item.browserBundlePath).size;assert(size>=(item.minimumBytes||1),`${item.displayName} implausible ${size}`);if(item.version){const pkg=JSON.parse(fs.readFileSync(`node_modules/${item.package}/package.json`));assert.equal(pkg.version,item.version);const text=fs.readFileSync(item.browserBundlePath,'utf8');assert(!/compatibility payload|stand-?in|placeholder implementation/i.test(text));}}
if(process.argv.includes('--assets-only')){console.log('official library asset validation passed');}else{
  const html=fs.readFileSync('local-ide.html','utf8'),pub=fs.readFileSync('public/local-ide.html','utf8'),src=fs.readFileSync('local-ide.src.html','utf8');assert.equal(html,pub);assert.equal((src.match(/id="generated-library-catalog"/g)||[]).length,1);assert.equal((src.match(/class="lib-row/g)||[]).length,1,'only generated row template');
  for(const item of registry){assert.equal((html.match(new RegExp(`id="${item.vaultId}"`,'g'))||[]).length,1,item.vaultId);assert(html.includes(item.displayName));}
  console.log('library catalog tests passed');
}
