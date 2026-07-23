#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 exact match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 regex match, found {count}")
    return updated


# ---------------------------------------------------------------------------
# local-ide.src.html
# ---------------------------------------------------------------------------
path = "local-ide.src.html"
html = read(path)

html = replace_once(
    html,
    'title="When checked, downloaded registered tools get a user-facing Tool Setup UI."',
    'title="When checked, download a StickShift-installable package with identity, companion skill, and setup UI."',
    "rename package toggle title",
)
html = replace_once(
    html,
    '<span class="select-none">Include Tool Setup UI</span>',
    '<span class="select-none">Package for StickShift</span>',
    "rename package toggle label",
)

old_onboarding = '''      <!-- Branch A: Yes, I use StickShift -->
      <div id="ss-content-yes" class="space-y-3.5 text-[11px] text-gray-300">
        <div class="space-y-1">
          <span class="block font-semibold text-white">Step 1: Save the File</span>
          <p class="text-gray-400 text-[10px]">Download this file and rename it exactly to <code class="font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">local-ide.html</code>.</p>
        </div>
        <div class="space-y-2">
          <span class="block font-semibold text-white">Step 2: Install the IDE Coding Skill</span>
          <p class="text-gray-400 text-[10px]">Copy the immutable IDE Coding Skill markdown configuration and save it into your StickShift installation directory as <code class="font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">skills/local-html-ide.md</code>.</p>
          <button id="ss-copy-skill" class="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-purple-500/15 text-[11px] focus:outline-none">
            <svg id="ss-copy-icon" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <svg id="ss-check-icon" class="w-3.5 h-3.5 hidden text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span id="ss-copy-text">Copy IDE Coding Skill</span>
          </button>
        </div>
        <div class="space-y-1">
          <span class="block font-semibold text-white">Step 3: Access via Cockpit</span>
          <p class="text-gray-400 text-[10px]">Your LLM agent can now open and control this workspace tool directly inside your StickShift environment.</p>
        </div>
      </div>'''
new_onboarding = '''      <!-- Branch A: Yes, I use StickShift -->
      <div id="ss-content-yes" class="space-y-3.5 text-[11px] text-gray-300">
        <div class="space-y-1">
          <span class="block font-semibold text-white">Step 1: Install through StickShift</span>
          <p class="text-gray-400 text-[10px]">Open StickShift, choose <strong>Tools</strong>, click <strong>Install HTML Tool</strong>, and select <code class="font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">local-ide.html</code>. StickShift validates and installs the IDE plus <code class="font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">skills/local-html-ide.md</code> as one transaction.</p>
        </div>
        <div class="space-y-2">
          <span class="block font-semibold text-white">Step 2: Manual fallback</span>
          <p class="text-gray-400 text-[10px]">Only use this fallback when the normal installer is unavailable. Copy the immutable IDE Coding Skill and save it as <code class="font-mono text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">skills/local-html-ide.md</code>.</p>
          <button id="ss-copy-skill" class="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg transition-all cursor-pointer shadow-lg shadow-purple-500/15 text-[11px] focus:outline-none">
            <svg id="ss-copy-icon" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <svg id="ss-check-icon" class="w-3.5 h-3.5 hidden text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span id="ss-copy-text">Copy IDE Coding Skill</span>
          </button>
        </div>
        <div class="space-y-1">
          <span class="block font-semibold text-white">Step 3: Open from StickShift</span>
          <p class="text-gray-400 text-[10px]">Open the IDE from the Tools catalog or approve the assistant's <code class="font-mono text-purple-400">HTML_OPEN</code> request. StickShift remains the human-controlled launch gate.</p>
        </div>
      </div>'''
html = replace_once(html, old_onboarding, new_onboarding, "replace IDE onboarding flow")

skill_pattern = r'''  <!-- Immutable Local HTML IDE Coding Skill Markup -->\n  <script type="text/markdown" id="ide-coding-skill" data-skill-slug="local-html-ide">[\s\S]*?\n  </script>\n\n  <script>\n    window\.__LOCAL_HTML_IDE_READY__ = false;'''
skill_replacement = '''  <!-- Immutable Local HTML IDE Coding Skill Markup.
       build_local_ide.py injects skills/local-html-ide.md here. -->
  <script type="text/markdown" id="stickshift-skill" data-skill-slug="local-html-ide">
{{ide_coding_skill}}
  </script>

  <script>
    window.__LOCAL_HTML_IDE_READY__ = false;'''
html = sub_once(html, skill_pattern, skill_replacement, "replace duplicated IDE skill with build placeholder")

html = replace_once(
    html,
    '    // IDE setup tabs: the immutable IDE Coding Skill is copied only here.\n',
    '''    function readEmbeddedStickShiftSkill() {
      const block = document.getElementById('stickshift-skill');
      return block ? block.textContent.replace(/<\\\/script/gi, '</script') : '';
    }

    // IDE setup tabs: the immutable IDE Coding Skill is copied only here.
''',
    "add canonical embedded skill reader",
)
html = replace_once(
    html,
    "      copyText(document.getElementById('ide-coding-skill').textContent).then(() => {",
    "      copyText(readEmbeddedStickShiftSkill()).then(() => {",
    "copy canonical embedded skill",
)

extract_pattern = r'''    function extractAuthoredToolSkillBody\(markdown, identity\) \{[\s\S]*?\n    \}\n    function findNonAsciiLocations'''
extract_replacement = '''    function extractAuthoredToolSkillBody(markdown) {
      let body=String(markdown||'').replace(/^---[\\s\\S]*?---\\s*/,'').trim();
      const footer=/\\n*<HTML_OPEN>\\n[\\s\\S]*?<\\/HTML_OPEN>\\n*\\n*(?:Instruction line:\\s*)?["']?Copy the block above and click Open HTML Tool in StickShift\\.["']?\\s*$/i;
      return body.replace(footer,'').trim();
    }
    function findNonAsciiLocations'''
html = sub_once(html, extract_pattern, extract_replacement, "normalize authored tool skill body")

skill_builder_pattern = r'''    function legacySkillMarkdown\(descriptor, identity, authored\) \{[\s\S]*?\n    \}\n    function injectStickShiftCompliance'''
skill_builder_replacement = '''    function buildStickShiftInstallSkill(descriptor, identity, authored) {
      const body = authored ? extractAuthoredToolSkillBody(authored) : `# ${descriptor.title}\n\nUse this local HTML tool when the user wants to open or use ${descriptor.title}.`;
      const normalized = body.trim();
      return `---\nokf_version: "0.1"\ntype: Skill\ntitle: ${JSON.stringify(descriptor.title)}\ndescription: ${JSON.stringify(descriptor.description)}\ntags: [skill, html-tool]\n---\n\n${normalized}\n\n## Open this tool\n\nWhen this skill applies, emit this block exactly, followed by one instruction to open it in StickShift:\n\n<HTML_OPEN>\ntool: ${identity.file}\ninclude:\n- skills/${descriptor.skillSlug}.md\n</HTML_OPEN>\n\nInstruction line: "Copy the block above and click Open HTML Tool in StickShift."`;
    }
    function injectStickShiftCompliance'''
html = sub_once(html, skill_builder_pattern, skill_builder_replacement, "replace install skill builder")
html = replace_once(
    html,
    '      const skill=legacySkillMarkdown(d,identity,authored);',
    '      const skill=buildStickShiftInstallSkill(d,identity,authored);',
    "use canonical install skill builder",
)

validator_pattern = r'''    function validateLegacyCompatibility\(html,fileName\) \{[\s\S]*?\n    \}\n    function findUnresolvedActiveLibraryStems'''
validator_replacement = '''    function validateLegacyCompatibility(html,fileName) {
      const ids=[...html.matchAll(/const\\s+STICKSHIFT_TOOL\\s*=\\s*\\{\\s*file:\\s*"([^"]+)",\\s*skillSlug:\\s*"([^"]+)",\\s*title:\\s*"([^"]+)"\\s*\\}/g)];
      const skills=[...html.matchAll(/<script\\b(?=[^>]*id="stickshift-skill")(?=[^>]*type="text\\/markdown")(?=[^>]*data-skill-slug="([^"]+)")[^>]*>([\\s\\S]*?)<\\/script>/g)];
      const errors=[];
      if(ids.length!==1)errors.push('Expected exactly one const STICKSHIFT_TOOL declaration.');
      if(skills.length!==1)errors.push('Expected exactly one stickshift-skill block.');
      if(ids.length&&skills.length){
        const [,file,slug]=ids[0], skillSlug=skills[0][1], markdown=skills[0][2];
        if(file!==fileName)errors.push('StickShift identity file does not match download filename.');
        if(slug!==skillSlug)errors.push('StickShift identity slug does not match embedded skill.');
        if(!/^okf_version:\\s*["']?0\\.1["']?\\s*$/mi.test(markdown))errors.push('Install skill must declare okf_version 0.1.');
        if(!/^type:\\s*Skill\\s*$/mi.test(markdown))errors.push('Install skill must declare type: Skill.');
        if(!/^title:\\s*.+$/mi.test(markdown)||!/^description:\\s*.+$/mi.test(markdown))errors.push('Install skill requires title and description.');
        if(!/^tags:\\s*\\[[^\\]]*html-tool[^\\]]*\\]\\s*$/mi.test(markdown))errors.push('Install skill tags must include html-tool.');
        if(!markdown.includes('tool: '+file))errors.push('Install skill HTML_OPEN does not match identity filename.');
        if(!markdown.includes('- skills/'+slug+'.md'))errors.push('Install skill HTML_OPEN must include its installed skill path.');
      }
      if(!html.includes("getElementById('stickshift-skill').textContent")||!html.includes("execCommand('copy')"))errors.push('StickShift copy fallback is incomplete.');
      const compat=(html.match(/<!-- STICKSHIFT_COMPATIBILITY_START -->[\\s\\S]*?<!-- STICKSHIFT_COMPATIBILITY_END -->/)||[])[0]||'';
      const nonAscii=findNonAsciiLocations(compat);
      if(nonAscii.length)errors.push('StickShift compatibility block must be ASCII-only: '+nonAscii.map(x=>x.codePoint+' line '+x.line).join(', '));
      return {ok:!errors.length,errors};
    }
    function findUnresolvedActiveLibraryStems'''
html = sub_once(html, validator_pattern, validator_replacement, "strengthen StickShift package validation")

compile_pattern = r'''    function compileAppSource\(editableSource,options=\{\}\) \{[^\n]*\}'''
compile_replacement = '''    function compileAppSource(editableSource,options={}) {
      const source=validateToolIntegration(editableSource,false);
      if(!source.ok)throw new Error('Source integration validation failed:\\n'+source.errors.join('\\n'));
      if(options.embedStickShift&&!source.descriptor)throw new Error('Package for StickShift requires a valid Tool Descriptor. Add one or turn packaging off.');
      const fileName=options.fileName||state.currentFileName;
      const authoredNormalized=normalizeAuthoredToolSkill(editableSource,fileName);
      const normalized=normalizePdfJsWorkerOwnership(authoredNormalized);
      let html=packLibraries(escapeInlineScriptBreakouts(normalized));
      html=substituteIntegrationPlaceholders(html,fileName);
      if(options.embedStickShift)html=injectStickShiftCompliance(html,fileName);
      const legacy=(options.embedStickShift&&html.includes('STICKSHIFT_COMPATIBILITY_START'))?validateLegacyCompatibility(html,fileName):{ok:true,errors:[]};
      if(!legacy.ok)throw new Error('StickShift package validation failed:\\n'+legacy.errors.join('\\n'));
      const v=validateCompiledAppHtml(html,editableSource);
      if(!v.ok)throw new Error('Compiled app validation failed:\\n'+v.errors.join('\\n'));
      return {html,fileName,validation:v};
    }'''
html = sub_once(html, compile_pattern, compile_replacement, "require descriptor for StickShift packaging")

write(path, html)


# ---------------------------------------------------------------------------
# build_local_ide.py — make skills/local-html-ide.md the single source of truth
# ---------------------------------------------------------------------------
path = "build_local_ide.py"
build = read(path)
build = replace_once(
    build,
    'ACORN_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "acorn", "dist", "acorn.js")\n',
    'ACORN_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "acorn", "dist", "acorn.js")\nIDE_CODING_SKILL_PATH = os.path.join(WORKSPACE_DIR, "skills", "local-html-ide.md")\n',
    "add canonical IDE skill path",
)
build = replace_once(
    build,
    '''def escape_style_data_block(content):
    """Keep CSS text safe inside HTML <style> data blocks."""
    return re.sub(r"</style", r"<\\/style", content, flags=re.IGNORECASE)

''',
    '''def escape_style_data_block(content):
    """Keep CSS text safe inside HTML <style> data blocks."""
    return re.sub(r"</style", r"<\\/style", content, flags=re.IGNORECASE)


def load_ide_coding_skill():
    if not os.path.isfile(IDE_CODING_SKILL_PATH):
        raise RuntimeError(f"Canonical IDE coding skill is missing: {IDE_CODING_SKILL_PATH}")
    with open(IDE_CODING_SKILL_PATH, "r", encoding="utf-8") as f:
        skill = f.read().strip()
    required = [
        'okf_version: "0.1"',
        'type: Skill',
        'title:',
        'description:',
        'tags:',
        '<HTML_OPEN>',
        'tool: local-ide.html',
        '- skills/local-html-ide.md',
    ]
    missing = [token for token in required if token not in skill]
    if missing:
        raise RuntimeError("Canonical IDE coding skill is incomplete: " + ", ".join(missing))
    return escape_script_data_block(skill)

''',
    "add canonical IDE skill loader",
)
build = replace_once(
    build,
    '''    print(f"Reading patch engine JS: {PATCH_ENGINE_JS_PATH}")
    with open(PATCH_ENGINE_JS_PATH, "r", encoding="utf-8") as f:
        patch_engine_js = f.read()

    print("Loading offline library vault...")
''',
    '''    print(f"Reading patch engine JS: {PATCH_ENGINE_JS_PATH}")
    with open(PATCH_ENGINE_JS_PATH, "r", encoding="utf-8") as f:
        patch_engine_js = f.read()

    print(f"Reading canonical IDE coding skill: {IDE_CODING_SKILL_PATH}")
    ide_coding_skill = load_ide_coding_skill()

    print("Loading offline library vault...")
''',
    "load canonical IDE skill during build",
)
build = replace_once(
    build,
    '''    html_content = html_content.replace("/* {{acorn_js}} */", acorn_js)
    html_content = html_content.replace("/* {{patch_engine_js}} */", patch_engine_js)

    print("Inlining offline library vault...")
''',
    '''    html_content = html_content.replace("/* {{acorn_js}} */", acorn_js)
    html_content = html_content.replace("/* {{patch_engine_js}} */", patch_engine_js)
    html_content = html_content.replace("{{ide_coding_skill}}", ide_coding_skill)
    if "{{ide_coding_skill}}" in html_content:
        raise RuntimeError("IDE coding skill placeholder was not fully resolved.")

    print("Inlining offline library vault...")
''',
    "inject canonical IDE skill into standalone build",
)
write(path, build)


# ---------------------------------------------------------------------------
# test_export.cjs
# ---------------------------------------------------------------------------
path = "test_export.cjs"
test = read(path)
test = replace_once(
    test,
    "check('standalone compilation remains plain', !api.compileAppSource(standalone,{fileName:'plain.html',embedStickShift:true}).html.includes('STICKSHIFT_TOOL'));",
    "let missingDescriptorError=''; try { api.compileAppSource(standalone,{fileName:'plain.html',embedStickShift:true}); } catch(error) { missingDescriptorError=String(error.message); }\ncheck('StickShift packaging requires a Tool Descriptor', missingDescriptorError.includes('Package for StickShift requires a valid Tool Descriptor'));\ncheck('standalone compilation remains plain when packaging is off', !api.compileAppSource(standalone,{fileName:'plain.html',embedStickShift:false}).html.includes('STICKSHIFT_TOOL'));",
    "update standalone packaging expectation",
)
test = replace_once(
    test,
    "check('descriptor-only emits registration skill', registration.includes('id=\"stickshift-skill\"')&&registration.includes('data-skill-kind=\"registration\"')&&registration.includes('tool: demo.html'));",
    "check('descriptor-only emits canonical registration skill', registration.includes('id=\"stickshift-skill\"')&&registration.includes('data-skill-kind=\"registration\"')&&registration.includes('type: Skill')&&registration.includes('tags: [skill, html-tool]')&&registration.includes('tool: demo.html')&&registration.includes('- skills/demo.md'));",
    "assert canonical registration skill",
)
test = replace_once(
    test,
    "check('authored skill frontmatter normalized', authoredCompiled.includes('slug: workflow')&&authoredCompiled.includes('title: Workflow'));",
    "check('authored skill frontmatter normalized', authoredCompiled.includes('type: Skill')&&authoredCompiled.includes('title: \\\"Workflow\\\"')&&authoredCompiled.includes('description: \\\"Open a useful local demo tool.\\\"')&&authoredCompiled.includes('- skills/workflow.md'));",
    "assert canonical authored skill frontmatter",
)
test = replace_once(
    test,
    "const built=fs.readFileSync('local-ide.html','utf8');",
    '''const built=fs.readFileSync('local-ide.html','utf8');
const builtIdeSkill=(built.match(/<script\\b(?=[^>]*id="stickshift-skill")(?=[^>]*data-skill-slug="local-html-ide")[^>]*>([\\s\\S]*?)<\\/script>/i)||[])[1]||'';
check('built Local HTML IDE is a StickShift install package', built.includes('const STICKSHIFT_TOOL = {\\n      file: "local-ide.html"')&&builtIdeSkill.includes('type: Skill')&&builtIdeSkill.includes('tool: local-ide.html')&&builtIdeSkill.includes('- skills/local-html-ide.md'));
check('built Local HTML IDE carries exactly one install skill block', (built.match(/id="stickshift-skill"/g)||[]).length===1&&!built.includes('id="ide-coding-skill"'));''',
    "assert built IDE install package",
)
write(path, test)


# ---------------------------------------------------------------------------
# tests/export-integrity.test.cjs
# ---------------------------------------------------------------------------
path = "tests/export-integrity.test.cjs"
integrity = read(path)
integrity = replace_once(
    integrity,
    "assert(!built.includes('{{acorn_js}}') && !builtPublic.includes('{{acorn_js}}'), 'generated IDE artifacts resolve the Acorn placeholder');\n",
    '''assert(!built.includes('{{acorn_js}}') && !builtPublic.includes('{{acorn_js}}'), 'generated IDE artifacts resolve the Acorn placeholder');
assert(!built.includes('{{ide_coding_skill}}') && !builtPublic.includes('{{ide_coding_skill}}'), 'generated IDE artifacts resolve the canonical skill placeholder');
const canonicalIdeSkill = fs.readFileSync(path.join(root, 'skills/local-html-ide.md'), 'utf8').trim();
const builtSkillMatch = built.match(/<script\\b(?=[^>]*id="stickshift-skill")(?=[^>]*type="text\\/markdown")(?=[^>]*data-skill-slug="local-html-ide")[^>]*>([\\s\\S]*?)<\\/script>/i);
assert(builtSkillMatch, 'standalone IDE contains its StickShift install skill');
assert.equal(builtSkillMatch[1].replace(/<\\\\\\/script/gi, '</script').trim(), canonicalIdeSkill, 'standalone IDE embeds the canonical skill byte-for-byte after HTML-safe normalization');
assert.equal((built.match(/id="stickshift-skill"/g)||[]).length, 1, 'standalone IDE contains exactly one StickShift install skill');
assert(!built.includes('id="ide-coding-skill"'), 'obsolete duplicate IDE skill block is absent');
''',
    "verify canonical IDE skill embedding",
)
integrity = replace_once(
    integrity,
    "assert(buildScript.includes('\"lib_pdfjs\"') && buildScript.includes('\"lib_pdfjs_worker\"'), 'build config includes both mandatory PDF.js inputs');",
    "assert(buildScript.includes('\"lib_pdfjs\"') && buildScript.includes('\"lib_pdfjs_worker\"'), 'build config includes both mandatory PDF.js inputs');\nassert(buildScript.includes('IDE_CODING_SKILL_PATH') && buildScript.includes('{{ide_coding_skill}}'), 'build reads and injects the canonical IDE coding skill');",
    "assert build skill injection",
)
write(path, integrity)


# ---------------------------------------------------------------------------
# Dedicated distribution-contract test
# ---------------------------------------------------------------------------
contract_test = r'''const assert = require('assert');
const fs = require('fs');

const src = fs.readFileSync('local-ide.src.html', 'utf8');
const begin = src.indexOf('    // Source-resident Tool Descriptor');
const end = src.indexOf('    // Sync Library Indicators', begin);
assert(begin >= 0 && end > begin, 'compiler integration slice exists');
const vault = {};
const api = new Function('document', 'acorn', src.slice(begin, end) + '; return {compileAppSource};')({getElementById:id=>vault[id]||null}, require('acorn'));

function packageInfo(html) {
  const identity = html.match(/const\s+STICKSHIFT_TOOL\s*=\s*\{\s*file:\s*"([^"]+)",\s*skillSlug:\s*"([^"]+)",\s*title:\s*"([^"]+)"\s*\}/);
  const skill = html.match(/<script\b(?=[^>]*id="stickshift-skill")(?=[^>]*type="text\/markdown")(?=[^>]*data-skill-slug="([^"]+)")[^>]*>([\s\S]*?)<\/script>/i);
  return { identity, skillSlug: skill && skill[1], markdown: skill && skill[2] };
}

function assertInstallable(html, file, slug) {
  const info = packageInfo(html);
  assert(info.identity, 'identity exists');
  assert(info.markdown, 'install skill exists');
  assert.equal(info.identity[1], file, 'identity filename matches');
  assert.equal(info.identity[2], slug, 'identity slug matches');
  assert.equal(info.skillSlug, slug, 'data skill slug matches');
  assert(/^type:\s*Skill\s*$/mi.test(info.markdown), 'skill declares type: Skill');
  assert(/^title:\s*.+$/mi.test(info.markdown), 'skill has title');
  assert(/^description:\s*.+$/mi.test(info.markdown), 'skill has description');
  assert(/^tags:\s*\[[^\]]*html-tool[^\]]*\]\s*$/mi.test(info.markdown), 'skill tags include html-tool');
  assert(info.markdown.includes('tool: ' + file), 'HTML_OPEN references file');
  assert(info.markdown.includes('- skills/' + slug + '.md'), 'HTML_OPEN includes installed skill path');
}

const descriptor = `<!-- HTML_IDE_REGION:tool-descriptor:start -->
<script id="tool-descriptor" type="application/json">{"schema":"stickshift-tool","version":"1.0","file":"{{TOOL_FILE}}","skillSlug":"{{SKILL_SLUG}}","title":"{{TOOL_TITLE}}","description":"Run a local contract test tool.","open":{"protocol":"HTML_OPEN","tool":"{{TOOL_FILE}}"},"skill":null}</script>
<!-- HTML_IDE_REGION:tool-descriptor:end -->`;
const registration = api.compileAppSource('<html><body>'+descriptor+'</body></html>', {fileName:'contract-tool.html', embedStickShift:true}).html;
assertInstallable(registration, 'contract-tool.html', 'contract-tool');

const authoredDescriptor = descriptor.replace('"skill":null', '"skill":{"elementId":"tool-skill","slug":"{{SKILL_SLUG}}"}');
const authored = authoredDescriptor + `<!-- HTML_IDE_REGION:tool-skill:start -->
<script id="tool-skill" type="text/markdown">---
name: ignored-source-frontmatter
---
# Workflow

Use the tool for a structured local workflow.
<\/script>
<!-- HTML_IDE_REGION:tool-skill:end -->`;
const authoredPackage = api.compileAppSource('<html><body>'+authored+'</body></html>', {fileName:'workflow-tool.html', embedStickShift:true}).html;
assertInstallable(authoredPackage, 'workflow-tool.html', 'workflow-tool');
assert(authoredPackage.includes('# Workflow'), 'authored operating instructions are preserved');

const built = fs.readFileSync('local-ide.html', 'utf8');
assertInstallable(built, 'local-ide.html', 'local-html-ide');

console.log('StickShift install package contract passed');
'''
write("tests/stickshift-package-contract.test.cjs", contract_test)


# ---------------------------------------------------------------------------
# Documentation boundary
# ---------------------------------------------------------------------------
path = "docs/standalone-html-ide.md"
doc = read(path)
marker = "## StickShift authoring and installation contracts"
if marker not in doc:
    doc = doc.rstrip() + '''\n\n## StickShift authoring and installation contracts\n\nThe IDE deliberately uses two representations:\n\n- **Authoring representation:** a source-resident `tool-descriptor` plus an optional `tool-skill`. These blocks are editable, source-hash-bound, and participate in atomic IDE patches.\n- **Installation representation:** the downloaded file contains `STICKSHIFT_TOOL`, one canonical `stickshift-skill`, and the non-blocking setup panel expected by StickShift. The compiler derives this package from the authoring blocks.\n\nSelect **Package for StickShift** only for a registered tool with a valid Tool Descriptor. Packaging is blocked when the descriptor is absent or malformed. Descriptor-only tools receive a generated registration skill; tools with an authored Tool Skill preserve its operating instructions under canonical StickShift frontmatter. Every install skill declares `type: Skill`, includes the `html-tool` tag, and emits an `HTML_OPEN` request containing both the downloaded filename and `skills/<slug>.md`.\n\nThe Local HTML IDE itself follows the same distribution contract. `skills/local-html-ide.md` is the sole source of truth; `build_local_ide.py` embeds it into `local-ide.html` as the installable `stickshift-skill`. The preferred setup path is StickShift **Tools -> Install HTML Tool**. Copying the IDE Coding Skill remains a manual fallback only.\n'''
write(path, doc)

print("Applied HTML IDE StickShift installation-contract patch.")
