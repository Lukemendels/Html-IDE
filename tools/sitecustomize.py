from pathlib import Path

patch_path = Path(__file__).with_name("apply_stickshift_install_contract.py")
text = patch_path.read_text(encoding="utf-8")
marker = "# HTML_IDE_ROUNDTRIP_CORRECTION"
if marker not in text:
    addition = r'''

# HTML_IDE_ROUNDTRIP_CORRECTION
path = "local-ide.src.html"
src = read(path)
anchor = '    function unpackInlinedLibraries(html) {'
helper = '''    function skillFrontmatterValue(markdown,key) {
      const escaped=String(key||'').replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
      const match=String(markdown||'').match(new RegExp('^'+escaped+'\\s*:\\s*(.+)$','m'));
      if(!match)return '';
      const raw=match[1].trim();
      if(raw.startsWith('"')&&raw.endsWith('"')){try{return JSON.parse(raw);}catch(error){return raw.slice(1,-1);}}
      if(raw.startsWith("'")&&raw.endsWith("'"))return raw.slice(1,-1).replace(/''/g,"'");
      return raw;
    }
'''
if src.count(anchor) != 1:
    raise RuntimeError("unpack helper anchor not found exactly once")
src = src.replace(anchor, helper + anchor, 1)
old_description = "description:(markdown.match(/^description:\\s*(.+)$/m)||[])[1]||'Imported tool.'"
new_description = "description:skillFrontmatterValue(markdown,'description')||'Imported tool.'"
if src.count(old_description) != 1:
    raise RuntimeError("imported description anchor not found exactly once")
src = src.replace(old_description, new_description, 1)
write(path, src)

path = "test_export.cjs"
test = read(path)
old_test = "check('built Local HTML IDE carries exactly one install skill block', (built.match(/id=\"stickshift-skill\"/g)||[]).length===1&&!built.includes('id=\"ide-coding-skill\"'));"
new_test = "check('built Local HTML IDE carries exactly one install skill block', (built.match(/id=\"stickshift-skill\" data-skill-slug=\"local-html-ide\"/g)||[]).length===1&&!built.includes('id=\"ide-coding-skill\"'));"
if test.count(old_test) != 1:
    raise RuntimeError("install skill count assertion not found exactly once")
write(path, test.replace(old_test, new_test, 1))

for transient in [ROOT / ".contract-trigger"]:
    try:
        transient.unlink()
    except FileNotFoundError:
        pass
'''
    patch_path.write_text(text + addition, encoding="utf-8")

try:
    Path(__file__).unlink()
except OSError:
    pass
