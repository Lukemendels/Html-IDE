import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const shots=path.join(root,'test-results','screenshots');fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage();
const successAlerts=[];
page.on('dialog',async d=>{if(d.type()==='alert'&&/(applied|restored|copied|downloaded|saved|reset)/i.test(d.message()))successAlerts.push(d.message());await d.accept();});
await page.goto(pathToFileURL(path.join(root,'local-ide.html')).href);
await page.waitForFunction(()=>window.__LOCAL_HTML_IDE_READY__===true);
assert.equal(await page.locator('#local-html-ide-startup-error').count(),0);
assert(await page.locator('#editor').getAttribute('contenteditable'));
await page.locator('#editor').click();await page.keyboard.type(' ');await page.keyboard.press('Backspace');
await page.waitForFunction(()=>document.querySelector('#previewFrame')?.srcdoc?.length>100);

await page.locator('#ss-open').click();
assert(await page.getByText('Local HTML IDE Skill',{exact:false}).count());assert(await page.getByText('Built App Skill',{exact:true}).count());
await page.screenshot({path:path.join(shots,'two-skill-interface.png'),fullPage:true});
await page.locator('#ss-copy-skill').click();
const ideSkill=await page.evaluate(()=>navigator.clipboard.readText());assert(ideSkill.includes('```json')&&ideSkill.includes('"version": "2.1"')&&ideSkill.includes('appSkill')&&ideSkill.includes('html'));
await page.locator('#ss-tab-skill').click();
const skill=page.locator('#ss-skill-template-input');const skillBefore=await skill.inputValue();const hashBefore=await page.locator('#appSkillHashText').textContent();
await skill.fill(skillBefore+'\nAPP_SKILL_SENTINEL_2026');await page.waitForFunction(h=>document.querySelector('#appSkillHashText').textContent!==h,hashBefore);
await page.screenshot({path:path.join(shots,'two-hash-displays.png'),fullPage:true});

await page.locator('#ss-close').click();await page.locator('#copyPatchContextBtn').click();const patchContext=await page.evaluate(()=>navigator.clipboard.readText());
for(const text of ['## HTML source hash','## Built App Skill source hash','## Current editable HTML','## Current Built App Skill Markdown','version "2.1"','Return only JSON'])assert(patchContext.includes(text),text);
const htmlHash=await page.locator('#sourceHashText').textContent(),appHash=await page.locator('#appSkillContextHashText').textContent();
const packet={protocol:'html-ide-patch',version:'2.1',targets:{html:{sourceHash:htmlHash},appSkill:{sourceHash:appHash}},patches:[{id:'browser-html',surface:'html',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'<h1>Focus Session</h1>'},replacement:'<h1>Browser Patched</h1>'},{id:'browser-skill',surface:'appSkill',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'## Purpose'},replacement:'## Browser Patched Purpose'}]};
await page.locator('#aiPacketInput').fill(JSON.stringify(packet));await page.locator('#applyChangesBtn').click();await page.waitForFunction(()=>document.querySelector('#editor').textContent.includes('Browser Patched'));
await page.screenshot({path:path.join(shots,'combined-patch.png'),fullPage:true});await page.locator('#undoPatchBtn').click();await page.waitForFunction(()=>document.querySelector('#editor').textContent.includes('Focus Session'));
assert.equal(successAlerts.length,0);
const htmlBeforeStale=await page.locator('#editor').textContent();
const stalePacket={protocol:'html-ide-patch',version:'2.1',targets:{html:{sourceHash:await page.locator('#sourceHashText').textContent()},appSkill:{sourceHash:'sha256:'+ '0'.repeat(64)}},patches:[{id:'stale-html',surface:'html',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'<h1>Focus Session</h1>'},replacement:'<h1>Must Not Apply</h1>'},{id:'stale-skill',surface:'appSkill',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'## Purpose'},replacement:'## Must Not Apply'}]};
await page.locator('#aiPacketInput').fill(JSON.stringify(stalePacket));await page.locator('#applyChangesBtn').click();await page.waitForTimeout(250);assert.equal(await page.locator('#editor').textContent(),htmlBeforeStale);

await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();await skill.fill(skillBefore+'\nAPP_SKILL_SENTINEL_2026');await page.locator('#ss-close').click();
const downloadPromise=page.waitForEvent('download');await page.locator('#downloadBtn').click();const download=await downloadPromise;const downloaded=path.join(root,'test-results',download.suggestedFilename());await download.saveAs(downloaded);const built=fs.readFileSync(downloaded,'utf8');assert.equal((built.match(/APP_SKILL_SENTINEL_2026/g)||[]).length,1);assert(!built.includes('# Local HTML IDE Skill'));
await page.locator('#fileUploadInput').setInputFiles(downloaded);await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();await page.waitForFunction(()=>document.querySelector('#ss-skill-template-input').value.includes('APP_SKILL_SENTINEL_2026'));assert((await page.locator('#stickshift-skill').textContent()).includes('# Local HTML IDE Skill'));await page.screenshot({path:path.join(shots,'recovered-built-app-skill.png'),fullPage:true});

const fixture=`<!doctype html><html><body><canvas id="chart"></canvas><ul id="sort"><li>A</li><li>B</li></ul><div id="result"></div><script id="lib-chartjs-stem"></script><script id="lib-dayjs-stem"></script><script id="lib-marked-stem"></script><script id="lib-dompurify-stem"></script><script id="lib-papaparse-stem"></script><script id="lib-sortablejs-stem"></script><script id="lib-fusejs-stem"></script><script>window.fixture={chart:new Chart(document.getElementById('chart'),{type:'bar',data:{labels:['A'],datasets:[{data:[1]}]}}),date:dayjs('2026-01-02').format('YYYY-MM-DD'),markdown:marked.parse('# Hello'),clean:DOMPurify.sanitize('<img src=x onerror=alert(1)>'),csv:Papa.parse('a,b\\n1,2').data,sortable:Sortable.create(document.getElementById('sort')),fuse:new Fuse([{name:'alpha'}],{keys:['name']}).search('alpa')};</script></body></html>`;
await page.locator('#ss-close').click();await page.locator('#editor').evaluate((el,text)=>{el.textContent=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));},fixture);await page.waitForTimeout(1000);const frame=page.frames().find(f=>f!==page.mainFrame());const result=await frame.evaluate(()=>({globals:[typeof Chart,typeof dayjs,typeof marked,typeof DOMPurify,typeof Papa,typeof Sortable,typeof Fuse],date:fixture.date,markdown:fixture.markdown,clean:fixture.clean,csv:fixture.csv,fuse:fixture.fuse.length,canvas:document.querySelector('canvas').width}));assert.deepEqual(result.globals,['function','function','object','function','object','function','function']);assert.equal(result.date,'2026-01-02');assert(result.markdown.includes('<h1>'));assert(!result.clean.includes('onerror'));assert.equal(result.csv[1][1],'2');assert(result.fuse>0);assert(result.canvas>0);
await page.screenshot({path:path.join(shots,'official-library-fixture.png'),fullPage:true});
await browser.close();console.log('file:// browser smoke tests passed');
