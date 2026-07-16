import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const results=path.join(root,'test-results');
const shots=path.join(results,'screenshots');
fs.mkdirSync(shots,{recursive:true});
const consoleLog=[],pageErrors=[],requestFailures=[],dialogs=[],steps=[];
let browser,context,page,currentStep='launch',expectedDialog=null,unexpectedDialog=null;
const persist=()=>{
  fs.mkdirSync(results,{recursive:true});
  fs.writeFileSync(path.join(results,'browser-console.log'),consoleLog.join('\n')+'\n');
  fs.writeFileSync(path.join(results,'page-errors.log'),pageErrors.join('\n')+'\n');
  fs.writeFileSync(path.join(results,'request-failures.log'),requestFailures.join('\n')+'\n');
  fs.writeFileSync(path.join(results,'dialogs.log'),dialogs.join('\n')+'\n');
  fs.writeFileSync(path.join(results,'browser-steps.log'),steps.join('\n')+'\n');
};
async function scenario(name,fn){
  currentStep=name;steps.push(`START ${name}`);console.log(`\n[scenario] ${name}`);
  try{await fn();if(unexpectedDialog)throw unexpectedDialog;steps.push(`PASS ${name}`);persist();}
  catch(error){steps.push(`FAIL ${name}: ${error.stack||error}`);persist();if(page){await page.screenshot({path:path.join(shots,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(results,'failure-dom.html'),await page.content().catch(()=>''));}throw new Error(`${name}: ${error.message}`,{cause:error});}
}
async function expectDialog(type,pattern,action){
  assert.equal(expectedDialog,null,'another expected dialog is pending');
  let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej});
  expectedDialog={type,pattern,resolve,reject};
  await action();
  await Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`expected ${type} dialog ${pattern}`)),5000))]);
  expectedDialog=null;
}
async function copiedText(action){
  await page.evaluate(()=>{window.__HTML_IDE_TEST_COPIED__=undefined});
  await action();
  await page.waitForFunction(()=>typeof window.__HTML_IDE_TEST_COPIED__==='string');
  return page.evaluate(()=>window.__HTML_IDE_TEST_COPIED__);
}
async function previewFrame(){const handle=await page.locator('#previewFrame').elementHandle();assert(handle,'preview iframe handle');const frame=await handle.contentFrame();assert(frame,'preview content frame');return frame}
async function setEditorSource(text){
  await page.locator('#editor').evaluate((el,value)=>{el.focus();el.textContent=value;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));},text);
}

try{
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({acceptDownloads:true});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  page=await context.newPage();
  await page.addInitScript(()=>{
    window.__HTML_IDE_TEST_COPIED__=undefined;
    const writeText=text=>{window.__HTML_IDE_TEST_COPIED__=String(text);return Promise.resolve()};
    try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}})}catch{}
    const original=document.execCommand?.bind(document);
    document.execCommand=command=>{if(String(command).toLowerCase()==='copy'){window.__HTML_IDE_TEST_COPIED__=document.activeElement?.value??document.getSelection()?.toString()??'';return true}return original?original(command):false};
  });
  page.on('console',msg=>{const line=`[${currentStep}] ${msg.type()}: ${msg.text()}`;consoleLog.push(line);console.log(line)});
  page.on('pageerror',error=>{const line=`[${currentStep}] ${error.stack||error}`;pageErrors.push(line);console.error(line)});
  page.on('requestfailed',request=>requestFailures.push(`[${currentStep}] ${request.url()} ${request.failure()?.errorText||''}`));
  page.on('dialog',async dialog=>{
    const record=`[${currentStep}] ${dialog.type()}: ${dialog.message()}`;dialogs.push(record);console.log(record);
    const expected=expectedDialog;
    if(expected&&dialog.type()===expected.type&&expected.pattern.test(dialog.message())){await dialog.accept();expected.resolve(dialog.message());return}
    await dialog.dismiss();unexpectedDialog=new Error(`unexpected ${record}`);if(expected)expected.reject(unexpectedDialog);
  });

  await scenario('startup and editable source',async()=>{
    await page.goto(pathToFileURL(path.join(root,'local-ide.html')).href);
    await page.waitForFunction(()=>window.__LOCAL_HTML_IDE_READY__===true);
    assert.equal(await page.locator('#local-html-ide-startup-error').count(),0);
    assert.equal(await page.locator('#editor').getAttribute('contenteditable'),'true');
    const before=await page.locator('#editor').textContent();await page.locator('#editor').click();await page.keyboard.type('x');assert((await page.locator('#editor').textContent()).endsWith('x'));await page.keyboard.press('Backspace');assert.equal(await page.locator('#editor').textContent(),before);
    const preview=await previewFrame();await preview.locator('body').waitFor();
  });
  let canonicalIdeSkill,skillBefore,htmlBefore,appHashBefore;
  await scenario('two-skill interface',async()=>{
    await page.locator('#ss-open').click();
    assert(await page.getByText('Local HTML IDE Skill',{exact:false}).count());assert(await page.getByText('Built App Skill',{exact:true}).count());
    assert.equal(await page.locator('#ss-skill-template-input').count(),1);await page.screenshot({path:path.join(shots,'two-skill-interface.png'),fullPage:true});
  });
  await scenario('Copy IDE Skill',async()=>{
    canonicalIdeSkill=await copiedText(()=>page.locator('#ss-copy-skill').click());
    assert(canonicalIdeSkill.includes('```json'));assert(canonicalIdeSkill.includes('"version": "2.1"'));assert(canonicalIdeSkill.includes('appSkill'));assert(canonicalIdeSkill.includes('html'));
  });
  await scenario('Built App Skill hash refresh',async()=>{
    await page.locator('#ss-tab-skill').click();const skill=page.locator('#ss-skill-template-input');skillBefore=await skill.inputValue();appHashBefore=await page.locator('#appSkillHashText').textContent();
    await skill.fill(skillBefore+'\nAPP_SKILL_SENTINEL_2026');await page.waitForFunction(hash=>document.querySelector('#appSkillHashText').textContent!==hash,appHashBefore);assert.equal(await page.locator('#ss-skill-state').textContent(),'Modified');await page.screenshot({path:path.join(shots,'two-hash-displays.png'),fullPage:true});
  });
  await scenario('Copy Patch Context',async()=>{
    await page.locator('#ss-close').click();const contextText=await copiedText(()=>page.locator('#copyPatchContextBtn').click());
    for(const text of ['## HTML source hash','## Built App Skill source hash','## Current editable HTML','## Current Built App Skill Markdown','version "2.1"','Return only JSON','APP_SKILL_SENTINEL_2026'])assert(contextText.includes(text),text);
    htmlBefore=await page.locator('#editor').textContent();assert(contextText.includes(htmlBefore));
  });
  await scenario('combined v2.1 apply',async()=>{
    const htmlHash=await page.locator('#sourceHashText').textContent(),appHash=await page.locator('#appSkillContextHashText').textContent();
    const packet={protocol:'html-ide-patch',version:'2.1',targets:{html:{sourceHash:htmlHash},appSkill:{sourceHash:appHash}},patches:[{id:'browser-html',surface:'html',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'<h1>Focus Session</h1>'},replacement:'<h1>Browser Patched</h1>'},{id:'browser-skill',surface:'appSkill',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'## Purpose'},replacement:'## Browser Patched Purpose'}]};
    await page.locator('#aiPacketInput').fill(JSON.stringify(packet));await expectDialog('confirm',/Apply all affected surfaces atomically/,()=>page.locator('#applyChangesBtn').click());await page.waitForFunction(()=>document.querySelector('#editor').textContent.includes('Browser Patched'));await page.screenshot({path:path.join(shots,'combined-patch.png'),fullPage:true});
  });
  await scenario('combined undo',async()=>{
    await page.locator('#undoPatchBtn').click();await page.waitForFunction(()=>document.querySelector('#editor').textContent.includes('Focus Session'));assert.equal(await page.locator('#editor').textContent(),htmlBefore);await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();assert((await page.locator('#ss-skill-template-input').inputValue()).includes('## Purpose'));await page.locator('#ss-close').click();
  });
  await scenario('stale appSkill rejection',async()=>{
    const unchanged=await page.locator('#editor').textContent();const packet={protocol:'html-ide-patch',version:'2.1',targets:{html:{sourceHash:await page.locator('#sourceHashText').textContent()},appSkill:{sourceHash:'sha256:'+ '0'.repeat(64)}},patches:[{id:'stale-html',surface:'html',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'<h1>Focus Session</h1>'},replacement:'<h1>Must Not Apply</h1>'},{id:'stale-skill',surface:'appSkill',operation:'replace',matching:{strategy:'exact',expectedMatches:1,search:'## Purpose'},replacement:'## Must Not Apply'}]};
    await page.locator('#aiPacketInput').fill(JSON.stringify(packet));await expectDialog('alert',/Stale appSkill patch rejected/,()=>page.locator('#applyChangesBtn').click());assert.equal(await page.locator('#editor').textContent(),unchanged);
  });
  let downloaded;
  await scenario('download and Built App Skill embedding',async()=>{
    await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();await page.locator('#ss-skill-template-input').fill(skillBefore+'\nAPP_SKILL_SENTINEL_2026');await page.locator('#ss-close').click();
    const event=page.waitForEvent('download');await page.locator('#downloadBtn').click();const download=await event;downloaded=path.join(results,download.suggestedFilename());await download.saveAs(downloaded);await download.path();const built=fs.readFileSync(downloaded,'utf8');assert.equal((built.match(/APP_SKILL_SENTINEL_2026/g)||[]).length,1);assert(!built.includes('# Local HTML IDE Skill'));
  });
  await scenario('reopen and Built App Skill recovery',async()=>{
    await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();await page.locator('#ss-skill-template-input').fill('Temporary pre-reopen skill');await page.waitForFunction(()=>document.querySelector('#ss-skill-state').textContent==='Modified');const oldHash=await page.locator('#appSkillHashText').textContent();await page.locator('#ss-close').click();await page.locator('#fileUploadInput').setInputFiles(downloaded);await page.waitForFunction(()=>document.querySelector('#currentFileName').textContent.length>0);await page.locator('#ss-open').click();await page.locator('#ss-tab-skill').click();await page.waitForFunction(()=>document.querySelector('#ss-skill-template-input').value.includes('APP_SKILL_SENTINEL_2026'));await page.waitForFunction(hash=>document.querySelector('#appSkillHashText').textContent!==hash,oldHash);assert.equal(await page.locator('#ss-skill-state').textContent(),'Recovered');assert.equal((await page.locator('#stickshift-skill').textContent()).trim(),canonicalIdeSkill.trim());await page.screenshot({path:path.join(shots,'recovered-built-app-skill.png'),fullPage:true});
  });
  await scenario('official library fixture',async()=>{
    const fixture=`<!doctype html><html><body><canvas id="chart"></canvas><ul id="sort"><li>A</li><li>B</li></ul><script id="lib-chartjs-stem"></script><script id="lib-dayjs-stem"></script><script id="lib-marked-stem"></script><script id="lib-dompurify-stem"></script><script id="lib-papaparse-stem"></script><script id="lib-sortablejs-stem"></script><script id="lib-fusejs-stem"></script><script>window.fixture={chart:new Chart(document.getElementById('chart'),{type:'bar',data:{labels:['A'],datasets:[{data:[1]}]}}),date:dayjs('2026-01-02').format('YYYY-MM-DD'),markdown:marked.parse('# Hello'),clean:DOMPurify.sanitize('<img src=x onerror=alert(1)>'),csv:Papa.parse('a,b\\n1,2').data,sortable:Sortable.create(document.getElementById('sort')),fuse:new Fuse([{name:'alpha'}],{keys:['name']}).search('alpa')};</script></body></html>`;
    await page.locator('#ss-close').click();await setEditorSource(fixture);const preview=await previewFrame();await preview.waitForFunction(()=>window.fixture&&window.fixture.chart&&window.fixture.fuse);const value=await preview.evaluate(()=>({globals:[typeof Chart,typeof dayjs,typeof marked,typeof DOMPurify,typeof Papa,typeof Sortable,typeof Fuse],date:fixture.date,markdown:fixture.markdown,clean:fixture.clean,csv:fixture.csv,fuse:fixture.fuse.length,canvas:document.querySelector('canvas').width}));assert.deepEqual(value.globals,['function','function','object','function','object','function','function']);assert.equal(value.date,'2026-01-02');assert(value.markdown.includes('<h1>'));assert(!value.clean.includes('onerror'));assert.equal(value.csv[1][1],'2');assert(value.fuse>0);assert(value.canvas>0);await page.screenshot({path:path.join(shots,'official-library-fixture.png'),fullPage:true});
  });
  assert.equal(unexpectedDialog,null);assert.equal(pageErrors.length,0,`page errors: ${pageErrors.join('\n')}`);await context.tracing.stop({path:path.join(results,'playwright-trace.zip')});persist();console.log('file:// browser smoke tests passed');
}catch(error){if(context)await context.tracing.stop({path:path.join(results,'playwright-trace.zip')}).catch(()=>{});persist();console.error(error);process.exitCode=1}finally{if(browser)await browser.close();}
