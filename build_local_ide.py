#!/usr/bin/env python3
import os
import re
import urllib.request

WORKSPACE_DIR = os.environ.get(
    "HTMLIDE_WORKSPACE",
    os.path.dirname(os.path.abspath(__file__)),
)
TEMPLATE_PATH = os.path.join(WORKSPACE_DIR, "local-ide.src.html")
OUTPUT_PATH = os.path.join(WORKSPACE_DIR, "local-ide.html")
OUTPUT_PATH_PUBLIC = os.path.join(WORKSPACE_DIR, "public", "local-ide.html")

TAILWIND_CACHE_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "tailwind-cdn-offline.js")
PRISM_CSS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "prismjs", "themes", "prism-tomorrow.min.css")
PRISM_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "prismjs", "prism.js")
CODEJAR_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "codejar", "dist", "codejar.js")
PATCH_ENGINE_JS_PATH = os.path.join(WORKSPACE_DIR, "scripts", "patch-engine.cjs")
ACORN_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "acorn", "dist", "acorn.js")
IDE_CODING_SKILL_PATH = os.path.join(WORKSPACE_DIR, "skills", "local-html-ide.md")

# Offline library vault paths — resolved from locally installed npm packages
LIB_PATHS = {
    "lib_jszip":         os.path.join(WORKSPACE_DIR, "node_modules", "jszip", "dist", "jszip.min.js"),
    "lib_docxtemplater": os.path.join(WORKSPACE_DIR, "node_modules", "docxtemplater", "build", "docxtemplater.min.js"),
    "lib_docx":          os.path.join(WORKSPACE_DIR, "node_modules", "docx", "dist", "index.iife.js"),
    "lib_mammoth":       os.path.join(WORKSPACE_DIR, "node_modules", "mammoth", "mammoth.browser.min.js"),
    "lib_sheetjs":       os.path.join(WORKSPACE_DIR, "node_modules", "xlsx", "dist", "xlsx.full.min.js"),
    "lib_pptxgen":       os.path.join(WORKSPACE_DIR, "node_modules", "pptxgenjs", "dist", "pptxgen.bundle.js"),
    "lib_pdfjs":         os.path.join(WORKSPACE_DIR, "node_modules", "pdfjs-dist", "build", "pdf.min.js"),
    "lib_pdfjs_worker":  os.path.join(WORKSPACE_DIR, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js"),
    "lib_alpine":        os.path.join(WORKSPACE_DIR, "node_modules", "alpinejs", "dist", "cdn.min.js"),
    "lib_picocss":       os.path.join(WORKSPACE_DIR, "node_modules", "@picocss", "pico", "css", "pico.classless.min.css"),
}

def get_existing_tailwind_js():
    if not os.path.exists(OUTPUT_PATH):
        return None

    print(f"Looking for Tailwind JS in existing standalone build: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        existing_html = f.read()

    match = re.search(
        r"<!-- Tailwind CSS v3 Browser Engine \(Offline Bundled\) -->\s*<script>([\s\S]*?)</script>",
        existing_html,
    )
    if not match:
        return None

    code = match.group(1).strip()
    if not code or "{{tailwind_js}}" in code:
        return None

    return code

def get_tailwind_js():
    if os.path.exists(TAILWIND_CACHE_PATH):
        print(f"Loading Tailwind JS from local cache: {TAILWIND_CACHE_PATH}")
        with open(TAILWIND_CACHE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    
    existing_tailwind_js = get_existing_tailwind_js()
    if existing_tailwind_js:
        print("Loading Tailwind JS from existing standalone build.")
        return existing_tailwind_js

    url = "https://cdn.tailwindcss.com"
    print(f"Fetching Tailwind JS from CDN: {url}")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            code = response.read().decode("utf-8")
        
        os.makedirs(os.path.dirname(TAILWIND_CACHE_PATH), exist_ok=True)
        with open(TAILWIND_CACHE_PATH, "w", encoding="utf-8") as f:
            f.write(code)
        print("Tailwind JS cached successfully.")
        return code
    except Exception as e:
        print(f"Error fetching Tailwind JS: {e}")
        raise

MANDATORY_LIB_TOKENS = {"lib_pdfjs", "lib_pdfjs_worker"}

def load_lib(token, path):
    if not os.path.isfile(path):
        if token in MANDATORY_LIB_TOKENS:
            raise RuntimeError(f"Required PDF.js build input is missing: {path}. Run npm install.")
        print(f"  WARNING: {token} not found at {path} — embedding empty stub")
        return f"/* {token} not bundled — run npm install */\nconsole.warn('{token} not loaded');"
    if os.path.getsize(path) == 0:
        if token in MANDATORY_LIB_TOKENS:
            raise RuntimeError(f"Required PDF.js build input is empty: {path}.")
        print(f"  WARNING: {token} is empty at {path} — embedding empty stub")
        return f"/* {token} not bundled — run npm install */\nconsole.warn('{token} not loaded');"
    print(f"  Loading {token}: {os.path.basename(path)} ({os.path.getsize(path) // 1024}KB)")
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    if token in MANDATORY_LIB_TOKENS and not content.strip():
        raise RuntimeError(f"Required PDF.js build input contains no source: {path}.")
    return content

def escape_script_data_block(content):
    """Keep JavaScript library text inert inside HTML script data blocks."""
    content = re.sub(r"</script", r"<\/script", content, flags=re.IGNORECASE)
    # Some document libraries contain literal namespaced XML such as
    # <style:master-page> inside JavaScript strings. Encode the angle
    # bracket as a JavaScript escape so host HTML scanners do not
    # mistake library data for live markup; runtime strings are unchanged.
    return re.sub(r"<(?=/?style:)", lambda _match: r"\x3C", content, flags=re.IGNORECASE)
def escape_style_data_block(content):
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

def main():
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template file not found at {TEMPLATE_PATH}")
        return

    tailwind_js = get_tailwind_js()

    print(f"Reading Prism CSS: {PRISM_CSS_PATH}")
    with open(PRISM_CSS_PATH, "r", encoding="utf-8") as f:
        prism_css = f.read()

    print(f"Reading Prism JS: {PRISM_JS_PATH}")
    with open(PRISM_JS_PATH, "r", encoding="utf-8") as f:
        prism_js = f.read()

    print(f"Reading CodeJar JS: {CODEJAR_JS_PATH}")
    with open(CODEJAR_JS_PATH, "r", encoding="utf-8") as f:
        codejar_js = f.read()
    codejar_js = codejar_js.replace("export function CodeJar", "function CodeJar")

    print(f"Reading Acorn JS: {ACORN_JS_PATH}")
    with open(ACORN_JS_PATH, "r", encoding="utf-8") as f:
        acorn_js = f.read()

    print(f"Reading patch engine JS: {PATCH_ENGINE_JS_PATH}")
    with open(PATCH_ENGINE_JS_PATH, "r", encoding="utf-8") as f:
        patch_engine_js = f.read()

    print(f"Reading canonical IDE coding skill: {IDE_CODING_SKILL_PATH}")
    ide_coding_skill = load_ide_coding_skill()

    print("Loading offline library vault...")
    libs = {}
    for token, path in LIB_PATHS.items():
        libs[token] = load_lib(token, path)

    print(f"Reading template: {TEMPLATE_PATH}")
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        html_content = f.read()

    print("Inlining core dependencies...")
    html_content = html_content.replace("/* {{tailwind_js}} */", tailwind_js)
    html_content = html_content.replace("/* {{prism_css}} */", prism_css)
    html_content = html_content.replace("/* {{codejar_js}} */", codejar_js)
    html_content = html_content.replace("/* {{prism_js}} */", prism_js)
    html_content = html_content.replace("/* {{acorn_js}} */", acorn_js)
    html_content = html_content.replace("/* {{patch_engine_js}} */", patch_engine_js)
    html_content = html_content.replace("{{ide_coding_skill}}", ide_coding_skill)
    if "{{ide_coding_skill}}" in html_content:
        raise RuntimeError("IDE coding skill placeholder was not fully resolved.")

    print("Inlining offline library vault...")
    for token, content in libs.items():
        if token == "lib_picocss":
            content = escape_style_data_block(content)
        else:
            content = escape_script_data_block(content)
        placeholder = f"/* {{{{{token}}}}} */"
        html_content = html_content.replace(placeholder, content)

    for path in [OUTPUT_PATH, OUTPUT_PATH_PUBLIC]:
        print(f"Writing compiled standalone IDE to: {path}")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_content)

    total_size = os.path.getsize(OUTPUT_PATH)
    print(f"Success! Standalone offline local-ide.html built — {total_size // 1024}KB total.")

if __name__ == "__main__":
    main()
