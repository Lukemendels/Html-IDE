"""One-run shim: proxy stdlib pathlib and correct the staged export footer."""
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


def _correct_round_trip_footer():
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
        updated, count = re.subn(pattern, lambda _match: replacement, source, count=1)
        if count != 1:
            raise RuntimeError(f"round-trip footer correction expected 1 match, found {count}")
        source_path.write_text(updated, encoding="utf-8")
    try:
        Path(__file__).unlink()
    except OSError:
        pass


atexit.register(_correct_round_trip_footer)
