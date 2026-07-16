const assert=require('assert'),fs=require('fs');const s=fs.readFileSync('local-ide.src.html','utf8');
assert(s.includes('id="app-status"')&&s.includes('aria-live="polite"')&&s.includes('function showStatus('));
for(const msg of ["alert('Applied ","alert('Undid ","alert('Downloaded ","alert('Copied "]) assert(!s.includes(msg),msg);
assert(s.includes("confirm('Are you sure you want to reset"));assert(s.includes("confirm('Patch preflight passed"));assert(s.includes('Download anyway?'));
console.log('nonblocking status tests passed');
