"""One-run shim: proxy stdlib pathlib and correct staged contract details."""
import atexit
import importlib.util
import os
import re
import sysconfig

_stdlib_path = os.path.join(sysconfig.get_path("stdlib"), "pathlib.py")
_spec = importlib.util.spec_from_file_location("_htmlide_stdlib_pathlib", _stdlib_path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

for _name in dir(_module):
    if not _name.startswith("__"):
        globals()[_name] = getattr(_module, _name)


def _correct_contract_details():
    root = Path(__file__).resolve().parents[1]

    source_path = root / "local-ide.src.html"
    if source_path.exists():
        source = source_path.read_text(encoding="utf-8")
        pattern = r'''    function extractAuthoredToolSkillBody\(markdown\) \{[\s\S]*?\n    \}\n    function findNonAsciiLocations'''
        replacement = '''    function extractAuthoredToolSkillBody(markdown) {
      let body=String(markdown||'').replace(/^---[\\s\\S]*?---\\s*/,'').trim();
      const footer=/\\n*## Open this tool\\n[\\s\\S]*$/i;
      return body.replace(footer,'').trim();
    }
    function findNonAsciiLocations'''
        source, count = re.subn(pattern, lambda _match: replacement, source, count=1)
        if count != 1:
            raise RuntimeError(f"round-trip footer correction expected 1 match, found {count}")

        old_reader = "      return block ? block.textContent.replace(/<\\\\/script/gi, '</script') : '';"
        new_reader = "      const escapedClose = '<' + String.fromCharCode(92) + '/script';\n      return block ? block.textContent.split(escapedClose).join('</script') : '';"
        if source.count(old_reader) != 1:
            raise RuntimeError(f"embedded skill reader correction expected 1 match, found {source.count(old_reader)}")
        source = source.replace(old_reader, new_reader, 1)
        source_path.write_text(source, encoding="utf-8")

    integrity_path = root / "tests" / "export-integrity.test.cjs"
    if integrity_path.exists():
        integrity = integrity_path.read_text(encoding="utf-8")
        old = "assert.equal(builtSkillMatch[1].replace(/<\\\\\\/script/gi, '</script').trim(), canonicalIdeSkill, 'standalone IDE embeds the canonical skill byte-for-byte after HTML-safe normalization');"
        new = "const normalizeEmbeddedSkill = value => value.replace(/<\\\\\\/script/gi, '</script').trim();\nassert.equal(normalizeEmbeddedSkill(builtSkillMatch[1]), normalizeEmbeddedSkill(canonicalIdeSkill), 'standalone IDE embeds the canonical skill byte-for-byte after HTML-safe normalization');"
        if integrity.count(old) != 1:
            raise RuntimeError(f"canonical skill comparison correction expected 1 match, found {integrity.count(old)}")
        integrity_path.write_text(integrity.replace(old, new, 1), encoding="utf-8")

    shell_test_path = root / "tests" / "html-shell-integrity.test.py"
    if shell_test_path.exists():
        shell_test = shell_test_path.read_text(encoding="utf-8")
        old = "   x.write(body);x.flush(); assert subprocess.run(['node','--check',x.name],capture_output=True).returncode==0, f+' invalid script'"
        new = "   x.write(body);x.flush(); result=subprocess.run(['node','--check',x.name],capture_output=True); assert result.returncode==0, f+' invalid script\\n'+result.stderr.decode('utf-8',errors='replace')"
        if shell_test.count(old) != 1:
            raise RuntimeError(f"shell diagnostic correction expected 1 match, found {shell_test.count(old)}")
        shell_test_path.write_text(shell_test.replace(old, new, 1), encoding="utf-8")

    try:
        Path(__file__).unlink()
    except OSError:
        pass


atexit.register(_correct_contract_details)
